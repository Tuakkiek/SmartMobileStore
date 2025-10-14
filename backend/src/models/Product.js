// models/Product.js - Extended version
import mongoose from 'mongoose';

// Base specifications - common fields
const specificationsSchema = new mongoose.Schema({
  // Common fields for all products
  color: String,
  weight: String,
  dimensions: String,
  
  // iPhone/iPad/Mac specific
  storage: String,
  ram: String,
  screen: String,
  chip: String,
  camera: String,
  battery: String,
  
  // Mac specific
  gpu: String,
  ports: String,
  keyboard: String,
  
  // Apple Watch specific
  caseSize: String,
  caseMaterial: String,
  bandType: String,
  waterResistance: String,
  
  // AirPods specific
  chargingCase: String,
  batteryLife: String,
  noiseCancellation: String,
  
  // Accessories specific
  compatibility: String,
  material: String,
  type: String,
  
  // Additional flexible field for any other specs
  additional: mongoose.Schema.Types.Mixed
}, { _id: false, strict: false }); // strict: false allows flexible fields

// Variant option: a specific color/config with its own price points
const variantOptionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., "Natural Titanium", "Starlight"
  color: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  sku: { type: String, trim: true }, // Stock Keeping Unit
}, { _id: false });

// Variant: a configuration level (storage, size, etc.) with multiple options
const variantSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true }, // e.g., "Storage", "Case Size", "Model"
  name: { type: String, required: true, trim: true }, // e.g., "256GB", "41mm", "M3"
  options: { type: [variantOptionSchema], default: [] },
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['iPhone', 'iPad', 'Mac', 'Apple Watch', 'AirPods', 'Accessories'],
      required: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      // Examples: "Pro", "Air", "Mini", "Studio", "Case", "Charger", etc.
    },
    model: {
      type: String,
      required: true,
      trim: true,
      // Examples: "iPhone 17 Pro Max", "MacBook Air M3", "AirPods Pro 2"
    },
    specifications: specificationsSchema,

    // Variants for different configurations
    variants: { type: [variantSchema], default: [] },

    // Base price (minimum price if variants exist)
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
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
    },
    images: [String],
    description: {
      type: String,
      trim: true,
    },
    features: [String], // Key features list
    inTheBox: [String], // What's included in the box
    
    // SEO and organization
    tags: [String], // e.g., ["gaming", "student", "professional"]
    brand: {
      type: String,
      default: 'Apple',
      trim: true,
    },
    
    // Reviews
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
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Release date for pre-orders
    releaseDate: Date,
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
  if (this.quantity === 0 && this.status !== 'PRE_ORDER') {
    this.status = 'OUT_OF_STOCK';
  } else if (this.status === 'OUT_OF_STOCK' && this.quantity > 0) {
    this.status = 'AVAILABLE';
  }

  // If variants are provided, ensure base price/originalPrice reflect the minimum
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

    // Recompute discount
    if (this.originalPrice > 0 && this.price >= 0) {
      const discount = Math.round((1 - this.price / this.originalPrice) * 100);
      this.discount = Math.max(0, Math.min(100, discount));
    }
  }

  next();
});

// Indexes for better query performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ name: 'text', model: 'text', description: 'text' });

export default mongoose.model("Product", productSchema);