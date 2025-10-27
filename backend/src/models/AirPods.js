// backend/src/models/AirPods.js
import mongoose from "mongoose";

const airPodsVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    variantName: { type: String, required: true, trim: true }, // e.g., "AirPods 4 Chống ồn"
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AirPods",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Validation: price <= originalPrice
airPodsVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

const airPodsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    specifications: {
      chip: { type: String, required: true, trim: true },
      brand: { type: String, required: true, trim: true },
      batteryLife: { type: String, required: true, trim: true },
      waterResistance: { type: String, required: true, trim: true },
      bluetooth: { type: String, required: true, trim: true },
      additional: mongoose.Schema.Types.Mixed,
    },

    // ✅ THÊM: Lượt bán
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "AirPodsVariant" }],
    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },
    brand: { type: String, default: "Apple", trim: true },
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },

    // ✅ THÊM: Installment Badge
    installmentBadge: {
      type: String,
      enum: ["NONE", "INSTALLMENT_0", "INSTALLMENT_0_PREPAY_0"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

// ✅ THÊM: Method để cập nhật salesCount
airPodsSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

airPodsSchema.index({ name: "text", model: "text", description: "text" });
airPodsSchema.index({ status: 1 });
airPodsSchema.index({ salesCount: -1 }); // Sắp xếp theo lượt bán giảm dần
airPodsSchema.index({ category: 1, salesCount: -1 }); // Query theo category + sales

export const AirPodsVariant = mongoose.model(
  "AirPodsVariant",
  airPodsVariantSchema
);
export default mongoose.model("AirPods", airPodsSchema);
