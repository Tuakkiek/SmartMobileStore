import mongoose from "mongoose";

const replenishmentSnapshotSchema = new mongoose.Schema(
  {
    snapshotDateKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["SCHEDULED", "STARTUP_CATCHUP", "MANUAL", "ON_DEMAND"],
      default: "ON_DEMAND",
      index: true,
    },
    summary: {
      totalRecommendations: {
        type: Number,
        default: 0,
      },
      criticalCount: {
        type: Number,
        default: 0,
      },
      highCount: {
        type: Number,
        default: 0,
      },
      interStoreCount: {
        type: Number,
        default: 0,
      },
      warehouseCount: {
        type: Number,
        default: 0,
      },
    },
    options: {
      limit: Number,
      surplusThreshold: Number,
      criticalOnly: Boolean,
    },
    notifications: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
      count: {
        type: Number,
        default: 0,
      },
      eventType: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

replenishmentSnapshotSchema.index({ generatedAt: -1 });

export default
  mongoose.models.ReplenishmentSnapshot ||
  mongoose.model("ReplenishmentSnapshot", replenishmentSnapshotSchema);
