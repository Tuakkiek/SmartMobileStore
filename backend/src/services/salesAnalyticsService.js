// backend/src/services/salesAnalyticsService.js
import SalesAnalytics from '../models/SalesAnalytics.js';
import IPhone, { IPhoneVariant } from '../models/IPhone.js';
import IPad, { IPadVariant } from '../models/IPad.js';
import Mac, { MacVariant } from '../models/Mac.js';
import AirPods, { AirPodsVariant } from '../models/AirPods.js';
import AppleWatch, { AppleWatchVariant } from '../models/AppleWatch.js';
import Accessory, { AccessoryVariant } from '../models/Accessory.js';

// ============================================
// CATEGORY MAPPING
// ============================================
const categoryMap = [
  { name: 'iPhone', variantModel: IPhoneVariant, mainModel: IPhone },
  { name: 'iPad', variantModel: IPadVariant, mainModel: IPad },
  { name: 'Mac', variantModel: MacVariant, mainModel: Mac },
  { name: 'AirPods', variantModel: AirPodsVariant, mainModel: AirPods },
  { name: 'AppleWatch', variantModel: AppleWatchVariant, mainModel: AppleWatch },
  { name: 'Accessories', variantModel: AccessoryVariant, mainModel: Accessory },
];

// ============================================
// HELPER: GET ISO WEEK NUMBER
// ============================================
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo.toString().padStart(2, '0');
}

// ============================================
// FIND CATEGORY BY VARIANT ID
// ============================================
async function findCategoryByVariantId(variantId) {
  for (const cat of categoryMap) {
    const variant = await cat.variantModel.findById(variantId).select('productId');
    if (variant) {
      return {
        category: cat.name,
        productId: variant.productId,
        variant
      };
    }
  }
  return null;
}

// ============================================
// UPDATE SALES
// ============================================
export async function updateSales(variantId, quantity, revenue) {
  const result = await findCategoryByVariantId(variantId);
  
  if (!result) {
    throw new Error('Variant not found in any category');
  }

  const { category, productId } = result;

  let analytic = await SalesAnalytics.findOne({ productId, variantId, category });
  if (!analytic) {
    analytic = new SalesAnalytics({ productId, variantId, category });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const monthStr = now.toISOString().slice(0, 7);
  const year = now.getFullYear();
  const weekStr = `${year}-W${getISOWeek(now)}`;

  // Update sales
  analytic.sales.total += quantity;
  analytic.sales.daily.set(dateStr, (analytic.sales.daily.get(dateStr) || 0) + quantity);
  analytic.sales.weekly.set(weekStr, (analytic.sales.weekly.get(weekStr) || 0) + quantity);
  analytic.sales.monthly.set(monthStr, (analytic.sales.monthly.get(monthStr) || 0) + quantity);

  // Update revenue
  analytic.revenue.total += revenue;
  analytic.revenue.daily.set(dateStr, (analytic.revenue.daily.get(dateStr) || 0) + revenue);
  analytic.revenue.weekly.set(weekStr, (analytic.revenue.weekly.get(weekStr) || 0) + revenue);
  analytic.revenue.monthly.set(monthStr, (analytic.revenue.monthly.get(monthStr) || 0) + revenue);

  analytic.lastUpdated = now;
  await analytic.save();

  console.log(`✅ Sales updated: ${category} - Product ${productId} - Variant ${variantId}`);
  return analytic;
}

// ============================================
// RECORD ORDER SALES (✅ FIXED FOR ORDER SCHEMA)
// ============================================
export async function recordOrderSales(order) {
  if (!order || !order.items || order.items.length === 0) {
    console.warn('⚠️ No items in order to record sales');
    return;
  }

  console.log(`📊 Recording sales for order: ${order.orderNumber}`);

  for (const item of order.items) {
    try {
      // ✅ Order items contain: productId, productName, specifications, quantity, price
      // We need to find the variant based on productId + specifications
      
      const productId = item.productId;
      const quantity = item.quantity;
      const revenue = item.price * item.quantity;

      // Find which category this product belongs to
      let foundCategory = null;
      let foundVariant = null;

      for (const cat of categoryMap) {
        const product = await cat.mainModel.findById(productId).populate('variants');
        if (product) {
          foundCategory = cat.name;
          
          // Try to find matching variant based on specifications
          // This is a simplified approach - you may need more sophisticated matching
          if (product.variants && product.variants.length > 0) {
            foundVariant = product.variants[0]; // Default to first variant
            
            // Try to match by color/storage if available in specifications
            if (item.specifications) {
              const matchedVariant = product.variants.find(v => {
                if (item.specifications.color && v.color !== item.specifications.color) return false;
                if (item.specifications.storage && v.storage !== item.specifications.storage) return false;
                return true;
              });
              if (matchedVariant) foundVariant = matchedVariant;
            }
          }
          break;
        }
      }

      if (!foundCategory || !foundVariant) {
        console.warn(`⚠️ Could not find category/variant for product ${productId} in order ${order.orderNumber}`);
        continue;
      }

      await updateSales(foundVariant._id, quantity, revenue);
      
      console.log(`  ✅ Recorded: ${quantity}x ${foundCategory} - Revenue: ${revenue.toLocaleString()}đ`);
    } catch (error) {
      console.error(`  ❌ Failed to record item:`, error.message);
    }
  }

  console.log(`✅ Sales recording completed for order ${order.orderNumber}`);
}

// ============================================
// GET TOP PRODUCTS BY CATEGORY
// ============================================
export async function getTopProducts(category, limit = 10) {
  const top = await SalesAnalytics.aggregate([
    { $match: { category } },
    { $group: { _id: '$productId', totalSales: { $sum: '$sales.total' } } },
    { $sort: { totalSales: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: '$_id' } },
  ]);
  
  return top.map(r => r.productId.toString());
}

// ============================================
// GET TOP SELLERS BY CATEGORY (FOR API)
// ============================================
export async function getTopSellersByCategory(category, limit = 10) {
  return await SalesAnalytics.find({ category })
    .sort({ 'sales.total': -1 })
    .limit(limit)
    .select('productId variantId sales.total revenue.total')
    .lean();
}

// ============================================
// GET TOP SELLERS ACROSS ALL CATEGORIES
// ============================================
export async function getTopSellers(limit = 10) {
  return await SalesAnalytics.find()
    .sort({ 'sales.total': -1 })
    .limit(limit)
    .select('productId variantId category sales.total revenue.total')
    .lean();
}

// ============================================
// GET PRODUCT SALES DATA
// ============================================
export async function getProductSales(productId, variantId = null) {
  const query = { productId };
  if (variantId) query.variantId = variantId;

  return await SalesAnalytics.findOne(query).lean();
}

// ============================================
// GET SALES BY TIME PERIOD
// ============================================
export async function getSalesByTimePeriod(category, startDate, endDate, period = 'daily') {
  const analytics = await SalesAnalytics.find({ category }).lean();

  const result = {};

  analytics.forEach(analytic => {
    const salesMap = analytic.sales[period] || new Map();
    salesMap.forEach((value, key) => {
      const date = new Date(key);
      if (date >= startDate && date <= endDate) {
        result[key] = (result[key] || 0) + value;
      }
    });
  });

  return result;
}

// ============================================
// RESET SALES DATA
// ============================================
export async function resetSalesData(productId, variantId = null) {
  const query = { productId };
  if (variantId) query.variantId = variantId;

  return await SalesAnalytics.deleteMany(query);
}

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  updateSales,
  recordOrderSales,
  getTopProducts,
  getTopSellersByCategory,
  getTopSellers,
  getProductSales,
  getSalesByTimePeriod,
  resetSalesData,
};