import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    orderNumber: {
      type: String,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stage: {
      type: String,
      trim: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["CUSTOMER", "WAREHOUSE", "SYSTEM"],
      required: true,
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    recipientRole: {
      type: String,
      trim: true,
      index: true,
    },
    channels: [
      {
        type: String,
        enum: ["IN_APP", "EMAIL", "SMS"],
        default: "IN_APP",
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "SENT", "FAILED"],
      default: "SENT",
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    readBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientType: 1, recipientRole: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

export default
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
