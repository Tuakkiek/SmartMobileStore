import mongoose from "mongoose";

const omnichannelEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    operation: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    level: {
      type: String,
      enum: ["DEBUG", "INFO", "WARN", "ERROR"],
      default: "INFO",
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    fulfillmentType: {
      type: String,
      trim: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      index: true,
    },
    variantSku: {
      type: String,
      trim: true,
    },
    itemCount: {
      type: Number,
      min: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    httpStatus: {
      type: Number,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

omnichannelEventSchema.index({ createdAt: -1 });
omnichannelEventSchema.index({ operation: 1, success: 1, createdAt: -1 });
omnichannelEventSchema.index({ eventType: 1, createdAt: -1 });

export default
  mongoose.models.OmnichannelEvent ||
  mongoose.model("OmnichannelEvent", omnichannelEventSchema);
