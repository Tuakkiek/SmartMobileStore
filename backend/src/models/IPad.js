// backend/src/models/IPad.js
import mongoose from "mongoose";

// --- Biến thể iPad ---
const iPadVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    connectivity: { type: String, enum: ["WIFI", "5G"], required: true }, // riêng của iPad
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],
    sku: { type: String, required: true, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IPad",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Validation: price <= originalPrice
iPadVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// --- Sản phẩm iPad ---
const iPadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    specifications: {
      chip: { type: String, required: true, trim: true },
      ram: { type: String, required: true, trim: true },
      storage: { type: String, required: true, trim: true },
      frontCamera: { type: String, required: true, trim: true },
      rearCamera: { type: String, required: true, trim: true },
      screenSize: { type: String, required: true, trim: true },
      screenTech: { type: String, required: true, trim: true },
      battery: { type: String, required: true, trim: true },
      os: { type: String, required: true, trim: true },
      colors: [{ type: String, trim: true }],
      additional: mongoose.Schema.Types.Mixed,
    },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "IPadVariant" }],

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

    // ✅ THÊM: Lượt bán
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    installmentBadge: {
      type: String,
      enum: ["NONE", "INSTALLMENT_0", "INSTALLMENT_0_PREPAY_0"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

// ✅ THÊM: Method để cập nhật salesCount
iPadSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// --- Tạo chỉ mục để tìm kiếm nhanh ---
iPadSchema.index({ name: "text", model: "text", description: "text" });
iPadSchema.index({ status: 1 });
iPadSchema.index({ salesCount: -1 }); // Sắp xếp theo lượt bán giảm dần
iPadSchema.index({ category: 1, salesCount: -1 }); // Query theo category + sales

// --- Xuất model ---
export const IPadVariant = mongoose.model("IPadVariant", iPadVariantSchema);
export default mongoose.model("IPad", iPadSchema);
