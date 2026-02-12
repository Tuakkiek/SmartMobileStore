// ============================================
// FILE: backend/src/modules/warehouse/WarehouseConfiguration.js
// Model lưu cấu hình kho của người dùng
// ============================================

import mongoose from "mongoose";

const warehouseConfigurationSchema = new mongoose.Schema(
  {
    // Mã kho: WH-HCM, WH-HN, WH-DN
    warehouseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Tên kho
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Địa chỉ
    address: {
      type: String,
      trim: true,
    },

    // Diện tích (m²)
    totalArea: {
      type: Number,
      min: 0,
    },

    // Các khu trong kho
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
          type: Number, // Diện tích (m²)
          min: 0,
        },
        // Cấu hình dãy-kệ-ô
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
        // Sức chứa mỗi ô (số lượng sản phẩm)
        capacityPerBin: {
          type: Number,
          required: true,
          min: 1,
          default: 100,
        },
        // Loại sản phẩm được lưu
        productCategories: [
          {
            type: String,
            trim: true,
          },
        ],
        // Trạng thái
        status: {
          type: String,
          enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
          default: "ACTIVE",
        },
        // Ghi chú
        notes: {
          type: String,
          trim: true,
        },
      },
    ],

    // Trạng thái kho
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PLANNING"],
      default: "PLANNING",
    },

    // Đã tạo vị trí chưa
    locationsGenerated: {
      type: Boolean,
      default: false,
    },

    // Tổng số vị trí
    totalLocations: {
      type: Number,
      default: 0,
    },

    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByName: {
      type: String,
      required: true,
    },

    // Người cập nhật cuối
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

// Indexes
warehouseConfigurationSchema.index({ warehouseCode: 1 });
warehouseConfigurationSchema.index({ status: 1 });
warehouseConfigurationSchema.index({ createdBy: 1 });

// Virtual: Tính tổng số vị trí dự kiến
warehouseConfigurationSchema.virtual("estimatedLocations").get(function () {
  let total = 0;
  for (const zone of this.zones) {
    total += zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf;
  }
  return total;
});

// Method: Calculate total capacity
warehouseConfigurationSchema.methods.calculateTotalCapacity = function () {
  let total = 0;
  for (const zone of this.zones) {
    const zoneCapacity =
      zone.aisles *
      zone.shelvesPerAisle *
      zone.binsPerShelf *
      zone.capacityPerBin;
    total += zoneCapacity;
  }
  return total;
};

// Method: Validate zone codes are unique
warehouseConfigurationSchema.pre("save", function (next) {
  const zoneCodes = this.zones.map((z) => z.code);
  const uniqueCodes = new Set(zoneCodes);
  
  if (zoneCodes.length !== uniqueCodes.size) {
    return next(new Error("Mã khu phải là duy nhất trong cùng một kho"));
  }
  
  next();
});

warehouseConfigurationSchema.set("toJSON", { virtuals: true });
warehouseConfigurationSchema.set("toObject", { virtuals: true });

export default mongoose.model(
  "WarehouseConfiguration",
  warehouseConfigurationSchema
);
