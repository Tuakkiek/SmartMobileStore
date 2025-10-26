// backend/src/models/SalesAnalytics.js
import mongoose from "mongoose";

const salesAnalyticsSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  category: { type: String, required: true, enum: ['iphone', 'ipad', 'mac', 'airpods', 'applewatch', 'accessory'] },
  sales: {
    total: { type: Number, default: 0 },
    monthly: { type: Map, of: Number, default: () => new Map() },
    weekly: { type: Map, of: Number, default: () => new Map() },
    daily: { type: Map, of: Number, default: () => new Map() },
  },
  revenue: {
    total: { type: Number, default: 0 },
    monthly: { type: Map, of: Number, default: () => new Map() },
    weekly: { type: Map, of: Number, default: () => new Map() },
    daily: { type: Map, of: Number, default: () => new Map() },
  },
  lastUpdated: { type: Date },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

salesAnalyticsSchema.index({ category: 1, productId: 1 });
salesAnalyticsSchema.index({ category: 1, variantId: 1 });

export default mongoose.model("SalesAnalytics", salesAnalyticsSchema);