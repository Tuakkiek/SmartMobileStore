import SalesAnalytics from "./SalesAnalytics.js";
import UniversalProduct, {
  UniversalVariant,
} from "../product/UniversalProduct.js";

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo.toString().padStart(2, "0");
}

const normalizeVietnamese = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const normalizeCategory = (value) => {
  const raw = normalizeVietnamese(value || "");
  return raw.replace(/\s+/g, "-") || "unknown";
};

async function findCategoryByVariantId(variantId) {
  const variant = await UniversalVariant.findById(variantId).select("productId");
  if (!variant) return null;

  const product = await UniversalProduct.findById(variant.productId)
    .populate("productType", "name slug")
    .lean();

  if (!product) return null;

  const category =
    normalizeCategory(product.productType?.slug) ||
    normalizeCategory(product.productType?.name);

  return {
    category,
    productId: product._id,
    variantId: variant._id,
  };
}

const getSalesMapEntries = (salesMapLike) => {
  if (!salesMapLike) return [];
  if (salesMapLike instanceof Map) return Array.from(salesMapLike.entries());
  return Object.entries(salesMapLike);
};

export async function updateSales(variantId, quantity, revenue) {
  const found = await findCategoryByVariantId(variantId);
  if (!found) {
    throw new Error("Variant not found");
  }

  const { category, productId } = found;

  let analytic = await SalesAnalytics.findOne({ productId, variantId, category });
  if (!analytic) {
    analytic = new SalesAnalytics({ productId, variantId, category });
  }

  const now = new Date();
  const day = now.toISOString().split("T")[0];
  const month = now.toISOString().slice(0, 7);
  const year = now.getFullYear();
  const week = `${year}-W${getISOWeek(now)}`;

  const qty = Number(quantity || 0);
  const amount = Number(revenue || 0);

  analytic.sales.total += qty;
  analytic.sales.daily.set(day, (analytic.sales.daily.get(day) || 0) + qty);
  analytic.sales.weekly.set(week, (analytic.sales.weekly.get(week) || 0) + qty);
  analytic.sales.monthly.set(
    month,
    (analytic.sales.monthly.get(month) || 0) + qty
  );

  analytic.revenue.total += amount;
  analytic.revenue.daily.set(
    day,
    (analytic.revenue.daily.get(day) || 0) + amount
  );
  analytic.revenue.weekly.set(
    week,
    (analytic.revenue.weekly.get(week) || 0) + amount
  );
  analytic.revenue.monthly.set(
    month,
    (analytic.revenue.monthly.get(month) || 0) + amount
  );

  analytic.lastUpdated = now;
  await analytic.save();
  return analytic;
}

export async function recordOrderSales(order) {
  if (!order?.items?.length) {
    return;
  }

  for (const item of order.items) {
    try {
      const quantity = Number(item.quantity || 0);
      const revenue = Number(item.price || 0) * quantity;

      let variantId = item.variantId || null;
      if (!variantId && item.variantSku) {
        const variant = await UniversalVariant.findOne({ sku: item.variantSku })
          .select("_id")
          .lean();
        variantId = variant?._id || null;
      }
      if (!variantId && item.productId) {
        const fallback = await UniversalVariant.findOne({ productId: item.productId })
          .select("_id")
          .lean();
        variantId = fallback?._id || null;
      }

      if (!variantId) continue;
      await updateSales(variantId, quantity, revenue);
    } catch (error) {
      console.error("Failed to record item sale:", error.message);
    }
  }
}

export async function getTopProducts(category, limit = 10) {
  const rows = await SalesAnalytics.aggregate([
    { $match: { category: normalizeCategory(category) } },
    { $group: { _id: "$productId", totalSales: { $sum: "$sales.total" } } },
    { $sort: { totalSales: -1 } },
    { $limit: Math.max(1, parseInt(limit, 10) || 10) },
    { $project: { _id: 0, productId: "$_id" } },
  ]);

  return rows.map((row) => row.productId.toString());
}

export async function getTopSellersByCategory(category, limit = 10) {
  return SalesAnalytics.find({ category: normalizeCategory(category) })
    .sort({ "sales.total": -1 })
    .limit(Math.max(1, parseInt(limit, 10) || 10))
    .select("productId variantId category sales.total revenue.total")
    .lean();
}

export async function getTopSellers(limit = 10) {
  return SalesAnalytics.find()
    .sort({ "sales.total": -1 })
    .limit(Math.max(1, parseInt(limit, 10) || 10))
    .select("productId variantId category sales.total revenue.total")
    .lean();
}

export async function getProductSales(productId, variantId = null) {
  const query = { productId };
  if (variantId) query.variantId = variantId;
  return SalesAnalytics.findOne(query).lean();
}

export async function getSalesByTimePeriod(
  category,
  startDate,
  endDate,
  period = "daily"
) {
  const analytics = await SalesAnalytics.find({
    category: normalizeCategory(category),
  }).lean();

  const output = {};

  for (const row of analytics) {
    const entries = getSalesMapEntries(row.sales?.[period]);
    for (const [key, value] of entries) {
      const date = new Date(key);
      if (date >= startDate && date <= endDate) {
        output[key] = (output[key] || 0) + Number(value || 0);
      }
    }
  }

  return output;
}

export async function resetSalesData(productId, variantId = null) {
  const query = { productId };
  if (variantId) query.variantId = variantId;
  return SalesAnalytics.deleteMany(query);
}

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
