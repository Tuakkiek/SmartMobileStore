import mongoose from "mongoose";
import { branchIsolationPlugin } from "../../authz/branchIsolationPlugin.js";
import { WARRANTY_STATUSES } from "../device/afterSalesConfig.js";

const warrantyRecordSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderItemId: mongoose.Schema.Types.ObjectId,
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
      required: true,
    },
    productName: {
      type: String,
      trim: true,
      required: true,
    },
    variantSku: {
      type: String,
      trim: true,
      required: true,
    },
    imei: {
      type: String,
      trim: true,
      default: "",
    },
    serialNumber: {
      type: String,
      trim: true,
      default: "",
    },
    soldAt: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    warrantyMonths: {
      type: Number,
      min: 0,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WARRANTY_STATUSES),
      default: WARRANTY_STATUSES.ACTIVE,
      required: true,
    },
    warrantyTerms: {
      type: String,
      trim: true,
      default: "",
    },
    replacedFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarrantyRecord",
    },
    replacedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarrantyRecord",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

warrantyRecordSchema.index({ storeId: 1, customerId: 1, createdAt: -1 });
warrantyRecordSchema.index({ imei: 1 });
warrantyRecordSchema.index({ serialNumber: 1 });
warrantyRecordSchema.index({ status: 1, expiresAt: 1 });
warrantyRecordSchema.plugin(branchIsolationPlugin, { branchField: "storeId" });

export default
  mongoose.models.WarrantyRecord ||
  mongoose.model("WarrantyRecord", warrantyRecordSchema);
