// ============================================
// FILE: backend/src/services/orderCleanupService.js
// Auto-cancel expired VNPay orders after 15 minutes
// ============================================

import Order from "./Order.js";
import mongoose from "mongoose";
import IPhone, { IPhoneVariant } from "../product/IPhone.js";
import IPad, { IPadVariant } from "../product/IPad.js";
import Mac, { MacVariant } from "../product/Mac.js";
import AirPods, { AirPodsVariant } from "../product/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../product/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../product/Accessory.js";

// ✅ THÊM: Helper function
const getModelsByType = (productType) => {
  const models = {
    iPhone: { Product: IPhone, Variant: IPhoneVariant },
    iPad: { Product: IPad, Variant: IPadVariant },
    Mac: { Product: Mac, Variant: MacVariant },
    AirPods: { Product: AirPods, Variant: AirPodsVariant },
    AppleWatch: { Product: AppleWatch, Variant: AppleWatchVariant },
    Accessory: { Product: Accessory, Variant: AccessoryVariant },
  };
  return models[productType] || null;
};

export const cancelExpiredVNPayOrders = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    console.log(
      `🔄 Found ${expiredOrders.length} expired VNPay orders to cancel`
    );

    for (const order of expiredOrders) {
      // Hoàn lại kho
      for (const item of order.items) {
        const models = getModelsByType(item.productType);
        if (models) {
          const variant = await models.Variant.findById(item.variantId).session(
            session
          );
          if (variant) {
            variant.stock += item.quantity;
            variant.salesCount = Math.max(
              0,
              (variant.salesCount || 0) - item.quantity
            );
            await variant.save({ session });
          }

          const product = await models.Product.findById(item.productId).session(
            session
          );
          if (product) {
            product.salesCount = Math.max(
              0,
              (product.salesCount || 0) - item.quantity
            );
            await product.save({ session });
          }
        }
      }

      // Hoàn lại reward points nếu có
      if (order.pointsUsed > 0) {
        const user = await mongoose
          .model("User")
          .findById(order.customerId)
          .session(session);
        if (user) {
          user.rewardPoints += order.pointsUsed;
          await user.save({ session });
        }
      }

      // Cập nhật trạng thái đơn hàng
      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      order.cancelReason = "Hết thời gian thanh toán VNPay (15 phút)";
      order.statusHistory.push({
        status: "CANCELLED",
        updatedBy: order.customerId,
        updatedAt: new Date(),
        note: "Tự động hủy do hết thời gian thanh toán",
      });
      await order.save({ session });

      console.log(`✅ Auto-cancelled order: ${order.orderNumber}`);
    }

    await session.commitTransaction();
    console.log(
      `✅ Successfully cancelled ${expiredOrders.length} expired orders`
    );
    return { success: true, cancelled: expiredOrders.length };
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Auto-cancel error:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
};
