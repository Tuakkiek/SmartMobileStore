import mongoose from "mongoose";
import { branchIsolationPlugin } from "../../authz/branchIsolationPlugin.js";
import {
  INVENTORY_STATES,
  SERVICE_STATES,
} from "./afterSalesConfig.js";

const deviceLifecycleHistorySchema = new mongoose.Schema(
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
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    fromInventoryState: {
      type: String,
      enum: Object.values(INVENTORY_STATES),
    },
    toInventoryState: {
      type: String,
      enum: Object.values(INVENTORY_STATES),
    },
    fromServiceState: {
      type: String,
      enum: Object.values(SERVICE_STATES),
    },
    toServiceState: {
      type: String,
      enum: Object.values(SERVICE_STATES),
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    orderItemId: mongoose.Schema.Types.ObjectId,
    referenceType: {
      type: String,
      trim: true,
      default: "",
    },
    referenceId: {
      type: String,
      trim: true,
      default: "",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
      trim: true,
      default: "System",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

deviceLifecycleHistorySchema.index({ storeId: 1, createdAt: -1 });
deviceLifecycleHistorySchema.plugin(branchIsolationPlugin, { branchField: "storeId" });

export default
  mongoose.models.DeviceLifecycleHistory ||
  mongoose.model("DeviceLifecycleHistory", deviceLifecycleHistorySchema);
