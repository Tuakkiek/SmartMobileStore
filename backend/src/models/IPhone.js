import mongoose from "mongoose";

// ===============================
// VARIANT SCHEMA (Mỗi biến thể màu + dung lượng)
// ===============================
const iPhoneVariantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    storage: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String, trim: true }],

    sku: { type: String, required: true, unique: true },
    slug: {
      type: String,
      required: true,

      sparse: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IPhone",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Kiểm tra logic giá
iPhoneVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// ===============================
// MAIN iPHONE SCHEMA
// ===============================
const iPhoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // iPhone 17 Pro Max
    model: { type: String, required: true, trim: true }, // ví dụ: A3101

    // ✅ Slug gốc, duy nhất cho toàn bộ model (vd: iphone-17-pro-max)
    baseSlug: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },

    // ✅ Slug cũ hoặc tạm (frontend cũ)
    slug: {
      type: String,

      sparse: true,
    },

    description: { type: String, trim: true, default: "" },

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

    // ✅ Danh sách biến thể
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "IPhoneVariant" }],

    // ✅ Phân loại tình trạng
    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
    },

    // ✅ Thông tin thương hiệu và danh mục
    brand: { type: String, default: "Apple", trim: true },
    category: { type: String, required: true, trim: true, default: "iPhone" },

    // ✅ Trạng thái hiển thị sản phẩm
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
    },

    // ✅ Nhãn trả góp hiển thị ở frontend
    installmentBadge: {
      type: String,
      enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
      default: "NONE",
    },

    // ✅ Người tạo (admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ Thống kê
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ===============================
// HOOKS & METHODS
// ===============================

// ✅ Tự đồng bộ slug từ baseSlug nếu thiếu
iPhoneSchema.pre("save", function (next) {
  if (this.baseSlug && !this.slug) {
    this.slug = this.baseSlug;
    console.log(`[iPhone Pre-save] Synced slug from baseSlug: ${this.slug}`);
  }
  next();
});

// ✅ Hàm cập nhật số lượng bán
iPhoneSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  return this.salesCount;
};

// ===============================
// INDEXES
// ===============================

// Search text
iPhoneSchema.index({ name: "text", model: "text", description: "text" });

// Filter/sort
iPhoneSchema.index({ status: 1 });
iPhoneSchema.index({ createdAt: -1 });
iPhoneSchema.index({ salesCount: -1 });
iPhoneSchema.index({ category: 1, salesCount: -1 });



// ===============================
// VARIANT INDEXES
// ===============================
iPhoneVariantSchema.index({ productId: 1 });


// ===============================
// EXPORT MODELS
// ===============================
export const IPhoneVariant = mongoose.model(
  "IPhoneVariant",
  iPhoneVariantSchema
);
export default mongoose.model("IPhone", iPhoneSchema);
