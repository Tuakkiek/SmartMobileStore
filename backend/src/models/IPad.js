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

iPadVariantSchema.pre("validate", function (next) {
  if (this.price > this.originalPrice) {
    next(new Error("Giá bán không thể lớn hơn giá gốc"));
  } else {
    next();
  }
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
    installmentBadge: {
      type: String,
      enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

// --- Tạo chỉ mục để tìm kiếm nhanh ---
iPadSchema.index({ name: "text", model: "text", description: "text" });
iPadSchema.index({ status: 1 });

// --- Xuất model ---
export const IPadVariant = mongoose.model("IPadVariant", iPadVariantSchema);
export default mongoose.model("IPad", iPadSchema);
