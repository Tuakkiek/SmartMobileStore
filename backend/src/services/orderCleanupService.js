import Order from "../models/Order.js";
import mongoose from "mongoose";

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
        }
      }

      order.status = "CANCELLED";
      order.cancelReason = "Hết thời gian thanh toán VNPay (15 phút)";
      await order.save({ session });

      console.log(`✅ Auto-cancelled order: ${order.orderNumber}`);
    }

    await session.commitTransaction();
    return { success: true, cancelled: expiredOrders.length };
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Auto-cancel error:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
};
