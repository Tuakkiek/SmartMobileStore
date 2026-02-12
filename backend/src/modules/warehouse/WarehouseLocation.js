// ============================================
// FILE: backend/src/modules/warehouse/WarehouseLocation.js
// Quản lý vị trí trong kho (Khu/Dãy/Tầng/Ô)
// ============================================

import mongoose from "mongoose";

const warehouseLocationSchema = new mongoose.Schema(
  {
    // Mã vị trí: WH-HCM-A-01-03-05
    locationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Kho (warehouse)
    warehouse: {
      type: String,
      required: true,
      trim: true,
      default: "WH-HCM",
    },

    // Khu (zone)
    zone: {
      type: String,
      required: true,
      trim: true,
    },
    zoneName: {
      type: String,
      required: true,
      trim: true,
    },

    // Dãy (aisle)
    aisle: {
      type: String,
      required: true,
      trim: true,
    },

    // Tầng (shelf)
    shelf: {
      type: String,
      required: true,
      trim: true,
    },

    // Ô (bin)
    bin: {
      type: String,
      required: true,
      trim: true,
    },

    // Sức chứa
    capacity: {
      type: Number,
      required: true,
      default: 100,
      min: 0,
    },

    // Số lượng hiện tại
    currentLoad: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
    },

    // Loại sản phẩm được lưu (để tối ưu tìm kiếm)
    productCategories: [
      {
        type: String,
        trim: true,
      },
    ],

    // QR Code data
    qrCode: {
      type: String,
      trim: true,
    },

    // Ghi chú
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
warehouseLocationSchema.index({ locationCode: 1 });
warehouseLocationSchema.index({ zone: 1, aisle: 1, shelf: 1, bin: 1 });
warehouseLocationSchema.index({ status: 1 });
warehouseLocationSchema.index({ productCategories: 1 });

// Virtual: Tỷ lệ lấp đầy
warehouseLocationSchema.virtual("fillRate").get(function () {
  if (this.capacity === 0) return 0;
  return Math.round((this.currentLoad / this.capacity) * 100);
});

// Methods
warehouseLocationSchema.methods.canAccommodate = function (quantity) {
  return this.currentLoad + quantity <= this.capacity;
};

warehouseLocationSchema.methods.addStock = async function (quantity) {
  if (!this.canAccommodate(quantity)) {
    throw new Error("Vị trí không đủ chỗ");
  }
  this.currentLoad += quantity;
  await this.save();
};

warehouseLocationSchema.methods.removeStock = async function (quantity) {
  if (this.currentLoad < quantity) {
    throw new Error("Số lượng trong kho không đủ");
  }
  this.currentLoad -= quantity;
  await this.save();
};

warehouseLocationSchema.set("toJSON", { virtuals: true });
warehouseLocationSchema.set("toObject", { virtuals: true });

export default mongoose.model("WarehouseLocation", warehouseLocationSchema);
