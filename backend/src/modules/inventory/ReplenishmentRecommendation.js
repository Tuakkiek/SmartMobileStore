import mongoose from "mongoose";

const replenishmentRecommendationSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReplenishmentSnapshot",
      required: true,
      index: true,
    },
    snapshotDateKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["SCHEDULED", "STARTUP_CATCHUP", "MANUAL", "ON_DEMAND"],
      default: "ON_DEMAND",
      index: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["INTER_STORE_TRANSFER", "WAREHOUSE_REPLENISHMENT"],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["CRITICAL", "HIGH"],
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UniversalProduct",
      index: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    variantSku: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    variantName: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    fromStore: {
      storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
      },
      storeCode: String,
      storeName: String,
    },
    toStore: {
      storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: true,
      },
      storeCode: String,
      storeName: String,
    },
    currentAvailable: {
      type: Number,
      default: 0,
    },
    minStock: {
      type: Number,
      default: 0,
    },
    neededQuantity: {
      type: Number,
      default: 0,
    },
    suggestedQuantity: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["OPEN", "TRANSFER_REQUESTED", "RESOLVED", "EXPIRED"],
      default: "OPEN",
      index: true,
    },
    linkedTransferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockTransfer",
    },
    resolvedAt: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

replenishmentRecommendationSchema.index(
  { snapshotId: 1, dedupeKey: 1 },
  { unique: true }
);
replenishmentRecommendationSchema.index({ snapshotDateKey: 1, priority: 1 });
replenishmentRecommendationSchema.index({ "toStore.storeId": 1, priority: 1 });

export default
  mongoose.models.ReplenishmentRecommendation ||
  mongoose.model(
    "ReplenishmentRecommendation",
    replenishmentRecommendationSchema
  );
