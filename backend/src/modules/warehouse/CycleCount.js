import mongoose from "mongoose";
import { branchIsolationPlugin } from "../../authz/branchIsolationPlugin.js";

const cycleCountSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    countNumber: {
      type: String,
      required: true,
      trim: true,
    },

    scope: {
      warehouse: {
        type: String,
        required: true,
        default: "WH-HCM",
      },
      zone: {
        type: String,
        trim: true,
      },
      aisle: {
        type: String,
        trim: true,
      },
    },

    countDate: {
      type: Date,
      required: true,
    },

    assignedTo: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
      },
    ],

    items: [
      {
        locationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WarehouseLocation",
          required: true,
        },
        locationCode: {
          type: String,
          required: true,
        },
        sku: {
          type: String,
          required: true,
        },
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UniversalProduct",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        systemQuantity: {
          type: Number,
          required: true,
        },
        countedQuantity: {
          type: Number,
          default: null,
        },
        variance: {
          type: Number,
          default: null,
        },
        notes: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["PENDING", "MATCHED", "VARIANCE", "INVESTIGATING"],
          default: "PENDING",
        },
      },
    ],

    summary: {
      totalLocations: {
        type: Number,
        default: 0,
      },
      matchedLocations: {
        type: Number,
        default: 0,
      },
      varianceLocations: {
        type: Number,
        default: 0,
      },
      totalVariance: {
        type: Number,
        default: 0,
      },
    },

    status: {
      type: String,
      enum: ["DRAFT", "IN_PROGRESS", "COMPLETED", "APPROVED", "REJECTED"],
      default: "DRAFT",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByName: {
      type: String,
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedByName: {
      type: String,
    },

    approvedAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

cycleCountSchema.index({ storeId: 1, countNumber: 1 }, { unique: true });
cycleCountSchema.index({ storeId: 1, status: 1 });
cycleCountSchema.index({ storeId: 1, countDate: -1 });
cycleCountSchema.index({ storeId: 1, createdBy: 1 });
cycleCountSchema.index({ storeId: 1, "scope.zone": 1, "scope.aisle": 1 });

cycleCountSchema.plugin(branchIsolationPlugin, { branchField: "storeId" });

export default mongoose.models.CycleCount || mongoose.model("CycleCount", cycleCountSchema);
