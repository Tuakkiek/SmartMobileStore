import mongoose from "mongoose";
import { branchIsolationPlugin } from "../../authz/branchIsolationPlugin.js";

const warehouseConfigurationSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    warehouseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    totalArea: {
      type: Number,
      min: 0,
    },

    zones: [
      {
        code: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        area: {
          type: Number,
          min: 0,
        },
        aisles: {
          type: Number,
          required: true,
          min: 1,
          max: 99,
          default: 1,
        },
        shelvesPerAisle: {
          type: Number,
          required: true,
          min: 1,
          max: 10,
          default: 5,
        },
        binsPerShelf: {
          type: Number,
          required: true,
          min: 1,
          max: 20,
          default: 10,
        },
        capacityPerBin: {
          type: Number,
          required: true,
          min: 1,
          default: 100,
        },
        productCategories: [
          {
            type: String,
            trim: true,
          },
        ],
        status: {
          type: String,
          enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
          default: "ACTIVE",
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PLANNING"],
      default: "PLANNING",
    },

    locationsGenerated: {
      type: Boolean,
      default: false,
    },

    totalLocations: {
      type: Number,
      default: 0,
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

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedByName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

warehouseConfigurationSchema.index({ storeId: 1, warehouseCode: 1 }, { unique: true });
warehouseConfigurationSchema.index({ storeId: 1, status: 1 });
warehouseConfigurationSchema.index({ storeId: 1, createdBy: 1 });

warehouseConfigurationSchema.virtual("estimatedLocations").get(function estimatedLocationsGetter() {
  let total = 0;
  for (const zone of this.zones) {
    total += zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf;
  }
  return total;
});

warehouseConfigurationSchema.methods.calculateTotalCapacity = function calculateTotalCapacity() {
  let total = 0;
  for (const zone of this.zones) {
    const zoneCapacity =
      zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf * zone.capacityPerBin;
    total += zoneCapacity;
  }
  return total;
};

warehouseConfigurationSchema.pre("save", function validateZoneCodes(next) {
  const zoneCodes = this.zones.map((zone) => zone.code);
  const uniqueCodes = new Set(zoneCodes);

  if (zoneCodes.length !== uniqueCodes.size) {
    return next(new Error("Ma khu phai duy nhat trong mot kho"));
  }

  next();
});

warehouseConfigurationSchema.set("toJSON", { virtuals: true });
warehouseConfigurationSchema.set("toObject", { virtuals: true });

warehouseConfigurationSchema.plugin(branchIsolationPlugin, { branchField: "storeId" });

export default
  mongoose.models.WarehouseConfiguration ||
  mongoose.model("WarehouseConfiguration", warehouseConfigurationSchema);
