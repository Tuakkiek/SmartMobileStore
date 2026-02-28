import mongoose from "mongoose";
import Order from "./Order.js";
import UniversalProduct, { UniversalVariant } from "../product/UniversalProduct.js";
import { ORDER_AUDIT_ACTIONS } from "./orderAuditActions.js";
import { buildOrderAuditPayload } from "./orderAuditAdapter.js";
import { safeWriteAuditEntry } from "../audit/auditService.js";

const getModelsByType = () => {
  return { Product: UniversalProduct, Variant: UniversalVariant };
};

const buildJobMetadata = () => {
  return {
    jobName: "cancelExpiredVNPayOrders",
    trigger: "interval_5_minutes",
  };
};

export const cancelExpiredVNPayOrders = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let activeOrderContext = null;

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expiredOrders = await Order.find({
      paymentMethod: "VNPAY",
      status: "PENDING_PAYMENT",
      createdAt: { $lte: fifteenMinutesAgo },
    }).session(session);

    if (expiredOrders.length === 0) {
      await session.commitTransaction();
      return { success: true, cancelled: 0 };
    }

    console.log(`Found ${expiredOrders.length} expired VNPay orders to cancel`);

    for (const order of expiredOrders) {
      const beforeOrder = order.toObject ? order.toObject() : { ...order };
      activeOrderContext = {
        orderId: String(order._id),
        beforeOrder,
      };

      const orderOwnerId = order.customerId || order.userId;
      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }

      for (const item of order.items) {
        const models = getModelsByType(item.productType);
        if (!models) {
          continue;
        }

        const variant = await models.Variant.findById(item.variantId).session(session);
        if (variant) {
          variant.stock += item.quantity;
          variant.salesCount = Math.max(0, (variant.salesCount || 0) - item.quantity);
          await variant.save({ session });
        }

        const product = await models.Product.findById(item.productId).session(session);
        if (product) {
          product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
          await product.save({ session });
        }
      }

      if (order.pointsUsed > 0) {
        const user = await mongoose.model("User").findById(orderOwnerId).session(session);
        if (user && typeof user.rewardPoints === "number") {
          user.rewardPoints += order.pointsUsed;
          await user.save({ session });
        }
      }

      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      order.cancelReason = "VNPay payment expired after 15 minutes";
      order.statusHistory.push({
        status: "CANCELLED",
        updatedBy: orderOwnerId,
        updatedAt: new Date(),
        note: "Auto-cancelled because payment window expired",
      });

      await order.save({ session });

      const successPayload = buildOrderAuditPayload({
        actionType: ORDER_AUDIT_ACTIONS.AUTO_CANCEL_EXPIRED_ORDER,
        outcome: "SUCCESS",
        source: "SCHEDULER_JOB",
        orderId: String(order._id),
        beforeOrder,
        afterOrder: order.toObject ? order.toObject() : { ...order },
        statusCode: 200,
        resBody: {
          message: "Order auto-cancelled due to expired VNPay payment window",
        },
        metadata: buildJobMetadata(),
      });

      await safeWriteAuditEntry(successPayload, {
        actionType: ORDER_AUDIT_ACTIONS.AUTO_CANCEL_EXPIRED_ORDER,
        orderId: String(order._id),
      });

      activeOrderContext = null;
      console.log(`Auto-cancelled order: ${order.orderNumber}`);
    }

    await session.commitTransaction();
    console.log(`Successfully cancelled ${expiredOrders.length} expired orders`);
    return { success: true, cancelled: expiredOrders.length };
  } catch (error) {
    await session.abortTransaction();

    if (activeOrderContext?.orderId) {
      const failedPayload = buildOrderAuditPayload({
        actionType: ORDER_AUDIT_ACTIONS.AUTO_CANCEL_EXPIRED_ORDER,
        outcome: "FAILED",
        source: "SCHEDULER_JOB",
        orderId: activeOrderContext.orderId,
        beforeOrder: activeOrderContext.beforeOrder,
        afterOrder: activeOrderContext.beforeOrder,
        statusCode: 500,
        resBody: {
          code: "SCHEDULER_JOB_FAILED",
          message: error.message,
        },
        metadata: buildJobMetadata(),
      });

      await safeWriteAuditEntry(failedPayload, {
        actionType: ORDER_AUDIT_ACTIONS.AUTO_CANCEL_EXPIRED_ORDER,
        orderId: activeOrderContext.orderId,
      });
    }

    console.error("Auto-cancel error:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
};

export default {
  cancelExpiredVNPayOrders,
};
