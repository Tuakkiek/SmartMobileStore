// models/Product.js
import mongoose from 'mongoose';

const specificationsSchema = new mongoose.Schema({
  color: String,
  storage: String,
  ram: String,
  screen: String,
  chip: String,
  camera: String,
  battery: String,
}, { _id: false });
 
// Variant option: a specific color with its own price points
const variantOptionSchema = new mongoose.Schema({
  color: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

// Variant: a storage with multiple color options
const variantSchema = new mongoose.Schema({
  storage: { type: String, required: true, trim: true },
  options: { type: [variantOptionSchema], default: [] },
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    specifications: specificationsSchema,

    // Optional variants (storage -> color -> price)
    variants: { type: [variantSchema], default: [] },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED"],
      default: "AVAILABLE",
    },
    images: [String],
    description: {
      type: String,
      trim: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate final price
productSchema.methods.calculatePrice = function () {
  return this.originalPrice - (this.originalPrice * this.discount / 100);
};

// Update product rating
productSchema.methods.updateRating = async function () {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ productId: this._id });
  
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / reviews.length;
    this.totalReviews = reviews.length;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  
  await this.save();
};

// Auto-update status based on quantity
productSchema.pre('save', function (next) {
  if (this.quantity === 0) {
    this.status = 'OUT_OF_STOCK';
  } else if (this.status === 'OUT_OF_STOCK' && this.quantity > 0) {
    this.status = 'AVAILABLE';
  }

  // If variants are provided, ensure base price/originalPrice reflect the minimum across variants.
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    let minPrice = Infinity;
    let minOriginal = Infinity;

    this.variants.forEach(v => {
      (v.options || []).forEach(opt => {
        if (typeof opt.price === 'number') minPrice = Math.min(minPrice, opt.price);
        if (typeof opt.originalPrice === 'number') minOriginal = Math.min(minOriginal, opt.originalPrice);
      });
    });

    if (isFinite(minPrice)) {
      this.price = minPrice;
    }
    if (isFinite(minOriginal)) {
      this.originalPrice = minOriginal;
    }

    // Recompute discount if both are valid
    if (this.originalPrice > 0 && this.price >= 0) {
      const discount = Math.round((1 - this.price / this.originalPrice) * 100);
      // keep within 0-100
      this.discount = Math.max(0, Math.min(100, discount));
    }
  }

  next();
});

export default mongoose.model("Product", productSchema);
