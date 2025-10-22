// backend/src/models/Variant.js
import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK"],
      default: "AVAILABLE",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick lookups
variantSchema.index({ productId: 1, color: 1 });

// Auto-update status and validate price/stock
variantSchema.pre("save", function (next) {
  if (this.price <= 0) {
    return next(new Error("Price must be greater than 0"));
  }
  if (this.stock === 0) {
    this.status = "OUT_OF_STOCK";
  } else if (this.status === "OUT_OF_STOCK" && this.stock > 0) {
    this.status = "AVAILABLE";
  }
  next();
});

export default mongoose.model("Variant", variantSchema);