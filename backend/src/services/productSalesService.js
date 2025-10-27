// ============================================
// FILE: backend/src/services/productSalesService.js
// ✅ Service tự động cập nhật salesCount
// ============================================

import IPhone, { IPhoneVariant } from '../models/IPhone.js';
import IPad, { IPadVariant } from '../models/IPad.js';
import Mac, { MacVariant } from '../models/Mac.js';
import AirPods, { AirPodsVariant } from '../models/AirPods.js';
import AppleWatch, { AppleWatchVariant } from '../models/AppleWatch.js';
import Accessory, { AccessoryVariant } from '../models/Accessory.js';

// ============================================
// CATEGORY MODELS MAPPING
// ============================================
const modelMap = {
  iPhone: { main: IPhone, variant: IPhoneVariant },
  iPad: { main: IPad, variant: IPadVariant },
  Mac: { main: Mac, variant: MacVariant },
  AirPods: { main: AirPods, variant: AirPodsVariant },
  AppleWatch: { main: AppleWatch, variant: AppleWatchVariant },
  Accessories: { main: Accessory, variant: AccessoryVariant },
};

// ============================================
// TÌM SẢN PHẨM THEO VARIANT ID
// ============================================
async function findProductByVariantId(variantId) {
  for (const [category, models] of Object.entries(modelMap)) {
    try {
      const variant = await models.variant.findById(variantId).select('productId');
      if (variant) {
        const product = await models.main.findById(variant.productId);
        return { product, category };
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

// ============================================
// TÌM SẢN PHẨM THEO PRODUCT ID + CATEGORY
// ============================================
async function findProductById(productId, category) {
  const models = modelMap[category];
  if (!models) return null;
  
  return await models.main.findById(productId);
}

// ============================================
// CẬP NHẬT SALES COUNT CHO SẢN PHẨM
// ============================================
export async function updateProductSalesCount(productId, variantId, quantity, category = null) {
  try {
    let product;
    let foundCategory = category;

    // Nếu có variantId, tìm product qua variant
    if (variantId) {
      const result = await findProductByVariantId(variantId);
      if (!result) {
        console.warn(`⚠️ Variant ${variantId} not found`);
        return null;
      }
      product = result.product;
      foundCategory = result.category;
    } 
    // Nếu không có variantId, dùng productId + category
    else if (productId && foundCategory) {
      product = await findProductById(productId, foundCategory);
    }

    if (!product) {
      console.warn(`⚠️ Product not found: ${productId}`);
      return null;
    }

    // Cập nhật salesCount
    product.salesCount = (product.salesCount || 0) + quantity;
    await product.save();

    console.log(`✅ Updated salesCount for ${foundCategory} - ${product.name}: +${quantity} = ${product.salesCount}`);
    
    return product;
  } catch (error) {
    console.error('❌ Error updating salesCount:', error);
    throw error;
  }
}

// ============================================
// XỬ LÝ ĐƠN HÀNG - CẬP NHẬT SALESCOUNT
// ============================================
export async function processOrderSales(order) {
  if (!order || !order.items || order.items.length === 0) {
    console.warn('⚠️ No items in order');
    return;
  }

  console.log(`📊 Processing sales count for order: ${order.orderNumber}`);

  const results = [];

  for (const item of order.items) {
    try {
      const productId = item.productId;
      const quantity = item.quantity;

      // Tìm category của product
      let foundCategory = null;
      let foundVariant = null;

      for (const [category, models] of Object.entries(modelMap)) {
        const product = await models.main.findById(productId).populate('variants');
        
        if (product) {
          foundCategory = category;
          
          // Tìm variant phù hợp dựa trên specifications
          if (product.variants && product.variants.length > 0) {
            foundVariant = product.variants[0]; // Default

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

      if (!foundCategory) {
        console.warn(`⚠️ Category not found for product ${productId}`);
        continue;
      }

      // Cập nhật salesCount
      const updatedProduct = await updateProductSalesCount(
        productId,
        foundVariant?._id,
        quantity,
        foundCategory
      );

      if (updatedProduct) {
        results.push({
          productId,
          category: foundCategory,
          name: updatedProduct.name,
          quantity,
          totalSales: updatedProduct.salesCount
        });
        console.log(`  ✅ ${updatedProduct.name}: +${quantity} sales`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to update item:`, error.message);
    }
  }

  console.log(`✅ Sales count update completed for order ${order.orderNumber}`);
  return results;
}

// ============================================
// LẤY TOP SẢN PHẨM BÁN CHẠY THEO CATEGORY
// ============================================
export async function getTopSellingProducts(category, limit = 10) {
  const models = modelMap[category];
  if (!models) {
    throw new Error(`Invalid category: ${category}`);
  }

  return await models.main
    .find({ status: 'AVAILABLE' })
    .sort({ salesCount: -1 })
    .limit(limit)
    .select('name model salesCount averageRating variants')
    .populate('variants', 'price images')
    .lean();
}

// ============================================
// LẤY TOP SẢN PHẨM BÁN CHẠY TẤT CẢ CATEGORY
// ============================================
export async function getAllTopSellingProducts(limit = 10) {
  const allProducts = [];

  for (const [category, models] of Object.entries(modelMap)) {
    const products = await models.main
      .find({ status: 'AVAILABLE' })
      .sort({ salesCount: -1 })
      .limit(limit)
      .select('name model salesCount averageRating variants')
      .populate('variants', 'price images')
      .lean();

    allProducts.push(
      ...products.map(p => ({ ...p, category }))
    );
  }

  // Sắp xếp và lấy top
  return allProducts
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, limit);
}

// ============================================
// RESET SALES COUNT (ADMIN ONLY)
// ============================================
export async function resetSalesCount(category = null) {
  if (category) {
    const models = modelMap[category];
    if (models) {
      await models.main.updateMany({}, { $set: { salesCount: 0 } });
      console.log(`✅ Reset salesCount for ${category}`);
    }
  } else {
    for (const models of Object.values(modelMap)) {
      await models.main.updateMany({}, { $set: { salesCount: 0 } });
    }
    console.log(`✅ Reset salesCount for all categories`);
  }
}

// ============================================
// SYNC SALESCOUNT TỪ SALESANALYTICS (NẾU CẦN)
// ============================================
export async function syncSalesCountFromAnalytics() {
  const SalesAnalytics = (await import('../models/SalesAnalytics.js')).default;
  
  const analytics = await SalesAnalytics.find().lean();
  
  for (const data of analytics) {
    try {
      await updateProductSalesCount(
        data.productId,
        data.variantId,
        data.sales.total,
        data.category
      );
    } catch (error) {
      console.error(`Failed to sync ${data.productId}:`, error.message);
    }
  }
  
  console.log('✅ Sales count synced from analytics');
}

export default {
  updateProductSalesCount,
  processOrderSales,
  getTopSellingProducts,
  getAllTopSellingProducts,
  resetSalesCount,
  syncSalesCountFromAnalytics,
};