// backend/src/models/Product.js
import mongoose from "mongoose";

// Base specifications schema - flexible for all product types
const specificationsSchema = new mongoose.Schema(
  {
    // Common fields
    color: String,
    weight: String,
    dimensions: String,

    // iPhone/iPad specific
    chip: String,
    ram: String,
    storage: String,
    frontCamera: String,
    rearCamera: String,
    screenSize: String,
    screenTech: String,
    battery: String,
    os: String,
    colors: [String],

    // Mac specific
    gpu: String,
    screenResolution: String,
    cpuType: String,
    ports: String,

    // Apple Watch specific
    batteryLife: String,
    compatibility: String,
    calling: String,
    healthFeatures: String,

    // AirPods specific
    chipset: String,
    brand: String,
    audioTech: String,
    waterResistance: String,
    bluetooth: String,

    // Accessories - Dynamic
    customSpecs: [
      {
        key: String,
        value: String,
      },
    ],

    // Additional flexible field
    additional: mongoose.Schema.Types.Mixed,
  },
  { _id: false, strict: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["iPhone", "iPad", "Mac", "Apple Watch", "AirPods", "Accessories"],
      required: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    specifications: specificationsSchema,

    // Variants reference
    variants: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Variant" 
      }
    ],

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW"],
      default: "NEW",
      required: true,
      index: true,
    },

    // Base/Display price (minimum price from variants or standalone)
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
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

    // Base quantity (for products without variants)
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
      default: "AVAILABLE",
      index: true,
    },

    images: [
      {
        type: String,
        trim: true,
      }
    ],

    description: {
      type: String,
      trim: true,
    },

    features: [String],
    inTheBox: [String],
    tags: [String],

    brand: {
      type: String,
      default: "Apple",
      trim: true,
    },

    // Reviews
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    // UI badges for marketing
    badges: [
      {
        type: String,
        trim: true,
      }
    ],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    releaseDate: Date,

    // SEO fields
    seoTitle: String,
    seoDescription: String,
  },
  {
    timestamps: true,
  }
);

// ============================================
// METHODS
// ============================================

// Calculate display price (minimum from variants or base price)
productSchema.methods.calculateDisplayPrice = async function () {
  if (this.variants && this.variants.length > 0) {
    const Variant = mongoose.model("Variant");
    const variants = await Variant.find({ 
      _id: { $in: this.variants },
      status: "AVAILABLE" 
    }).select('price');
    
    if (variants.length > 0) {
      const minPrice = Math.min(...variants.map(v => v.price));
      return minPrice;
    }
  }
  return this.price;
};

// Calculate final price with discount
productSchema.methods.calculatePrice = function () {
  return this.originalPrice - (this.originalPrice * this.discount) / 100;
};

// Update product rating from reviews
productSchema.methods.updateRating = async function () {
  const Review = mongoose.model("Review");
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

// ============================================
// MIDDLEWARE
// ============================================

// Auto-update status based on quantity and variants
productSchema.pre("save", async function (next) {
  // For products without variants
  if (!this.variants || this.variants.length === 0) {
    if (this.quantity === 0 && this.status !== "PRE_ORDER") {
      this.status = "OUT_OF_STOCK";
    } else if (this.status === "OUT_OF_STOCK" && this.quantity > 0) {
      this.status = "AVAILABLE";
    }
  } else {
    // For products with variants, check total stock
    const Variant = mongoose.model("Variant");
    const variants = await Variant.find({ 
      _id: { $in: this.variants } 
    }).select('stock');
    
    const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    
    if (totalStock === 0 && this.status !== "PRE_ORDER") {
      this.status = "OUT_OF_STOCK";
    } else if (this.status === "OUT_OF_STOCK" && totalStock > 0) {
      this.status = "AVAILABLE";
    }
  }

  next();
});

// ============================================
// INDEXES
// ============================================

// Compound indexes for common queries
productSchema.index({ category: 1, status: 1, condition: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ averageRating: -1, totalReviews: -1 });

// Text search index
productSchema.index({ 
  name: "text", 
  model: "text", 
  description: "text",
  "specifications.colors": "text"
});

// ============================================
// VIRTUALS
// ============================================

// Virtual for total stock (including variants)
productSchema.virtual('totalStock').get(async function() {
  if (!this.variants || this.variants.length === 0) {
    return this.quantity;
  }
  
  const Variant = mongoose.model("Variant");
  const variants = await Variant.find({ 
    _id: { $in: this.variants } 
  }).select('stock');
  
  return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});

// Virtual for variants count
productSchema.virtual('variantsCount').get(function() {
  return this.variants ? this.variants.length : 0;
});

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// ============================================
// STATICS
// ============================================

// Find products with available stock (including variants)
productSchema.statics.findInStock = function() {
  return this.find({
    $or: [
      { quantity: { $gt: 0 }, variants: { $size: 0 } },
      { variants: { $not: { $size: 0 } } } // Will check variant stock in aggregation
    ],
    status: "AVAILABLE"
  });
};

// Find by category with filters
productSchema.statics.findByCategory = function(category, filters = {}) {
  const query = { category, ...filters };
  return this.find(query).populate('variants');
};

export default mongoose.model("Product", productSchema);