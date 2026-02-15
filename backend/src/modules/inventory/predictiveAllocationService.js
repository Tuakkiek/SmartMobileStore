import mongoose from "mongoose";
import Order from "../order/Order.js";
import Store from "../store/Store.js";
import StoreInventory from "./StoreInventory.js";
import { UniversalVariant } from "../product/UniversalProduct.js";

const FINAL_ORDER_STATUSES = ["DELIVERED", "PICKED_UP", "COMPLETED"];
const DEFAULT_DAYS_AHEAD = 7;
const DEFAULT_HISTORICAL_DAYS = 90;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

const RISK_RANK = Object.freeze({
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
});

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const toObjectIdOrNull = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (!mongoose.Types.ObjectId.isValid(normalized)) return null;
  return new mongoose.Types.ObjectId(normalized);
};

const buildKey = (storeId, variantSku) =>
  `${String(storeId || "").trim()}|${String(variantSku || "").trim().toUpperCase()}`;

const getConfidence = (activeSalesDays) => {
  if (activeSalesDays >= 30) return "HIGH";
  if (activeSalesDays >= 14) return "MEDIUM";
  return "LOW";
};

const getRiskLevel = ({ available, minStock, coverageDays, daysAhead }) => {
  if (available <= 0) return "CRITICAL";
  if (Number.isFinite(coverageDays) && coverageDays <= 1) return "CRITICAL";
  if (available < minStock) return "HIGH";
  if (Number.isFinite(coverageDays) && coverageDays < daysAhead) return "HIGH";
  if (Number.isFinite(coverageDays) && coverageDays < daysAhead * 2) return "MEDIUM";
  return "LOW";
};

const normalizeVariantSku = (value) => String(value || "").trim().toUpperCase();

const getActiveStores = async (storeId) => {
  if (storeId) {
    const selectedStore = await Store.findOne({
      _id: storeId,
      status: "ACTIVE",
      type: { $ne: "WAREHOUSE" },
    })
      .select("_id code name")
      .lean();

    if (!selectedStore) {
      return [];
    }

    return [selectedStore];
  }

  return Store.find({
    status: "ACTIVE",
    type: { $ne: "WAREHOUSE" },
  })
    .select("_id code name")
    .lean();
};

const loadSalesStats = async ({ storeIds, skuSet, sinceDate }) => {
  if (!Array.isArray(storeIds) || storeIds.length === 0 || skuSet.size === 0) {
    return new Map();
  }

  const salesRows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: sinceDate },
        status: { $in: FINAL_ORDER_STATUSES },
        "assignedStore.storeId": { $in: storeIds },
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.variantSku": { $in: Array.from(skuSet) },
      },
    },
    {
      $group: {
        _id: {
          storeId: "$assignedStore.storeId",
          variantSku: "$items.variantSku",
        },
        totalSoldQuantity: { $sum: "$items.quantity" },
        salesDays: {
          $addToSet: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
        },
        lastSoldAt: { $max: "$createdAt" },
      },
    },
    {
      $project: {
        _id: 1,
        totalSoldQuantity: 1,
        activeSalesDays: { $size: "$salesDays" },
        lastSoldAt: 1,
      },
    },
  ]);

  const statsByKey = new Map();
  for (const row of salesRows) {
    const key = buildKey(row?._id?.storeId, row?._id?.variantSku);
    statsByKey.set(key, {
      totalSoldQuantity: Number(row.totalSoldQuantity) || 0,
      activeSalesDays: Number(row.activeSalesDays) || 0,
      lastSoldAt: row.lastSoldAt || null,
    });
  }
  return statsByKey;
};

export const analyzeDemandPredictions = async ({
  daysAhead = DEFAULT_DAYS_AHEAD,
  historicalDays = DEFAULT_HISTORICAL_DAYS,
  limit = DEFAULT_LIMIT,
  storeId,
  variantSku,
  lowStockOnly = false,
} = {}) => {
  const normalizedDaysAhead = clampInteger(daysAhead, DEFAULT_DAYS_AHEAD, 1, 60);
  const normalizedHistoricalDays = clampInteger(
    historicalDays,
    DEFAULT_HISTORICAL_DAYS,
    7,
    365
  );
  const normalizedLimit = clampInteger(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const normalizedSku = normalizeVariantSku(variantSku);
  const selectedStoreId = toObjectIdOrNull(storeId);
  const sinceDate = new Date(
    Date.now() - normalizedHistoricalDays * 24 * 60 * 60 * 1000
  );

  const stores = await getActiveStores(selectedStoreId);
  if (stores.length === 0) {
    return {
      predictions: [],
      summary: {
        totalPredictions: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalSuggestedQuantity: 0,
        generatedAt: new Date(),
      },
      config: {
        daysAhead: normalizedDaysAhead,
        historicalDays: normalizedHistoricalDays,
        limit: normalizedLimit,
        lowStockOnly: !!lowStockOnly,
      },
    };
  }

  const storeIds = stores.map((store) => store._id);
  const storeById = new Map(stores.map((store) => [String(store._id), store]));

  const inventoryFilter = {
    storeId: { $in: storeIds },
  };
  if (normalizedSku) {
    inventoryFilter.variantSku = normalizedSku;
  }
  if (lowStockOnly) {
    inventoryFilter.$expr = { $lt: ["$available", "$minStock"] };
  }

  const inventoryRows = await StoreInventory.find(inventoryFilter)
    .select("storeId productId variantSku available minStock quantity reserved")
    .populate("productId", "name model")
    .sort({ available: 1, minStock: -1 })
    .limit(Math.min(normalizedLimit * 3, MAX_LIMIT))
    .lean();

  if (inventoryRows.length === 0) {
    return {
      predictions: [],
      summary: {
        totalPredictions: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalSuggestedQuantity: 0,
        generatedAt: new Date(),
      },
      config: {
        daysAhead: normalizedDaysAhead,
        historicalDays: normalizedHistoricalDays,
        limit: normalizedLimit,
        lowStockOnly: !!lowStockOnly,
      },
    };
  }

  const skuSet = new Set(inventoryRows.map((row) => normalizeVariantSku(row.variantSku)));
  const [salesStatsByKey, variants] = await Promise.all([
    loadSalesStats({ storeIds, skuSet, sinceDate }),
    UniversalVariant.find({ sku: { $in: Array.from(skuSet) } })
      .select("sku variantName color")
      .lean(),
  ]);
  const variantBySku = new Map(
    variants.map((variant) => [normalizeVariantSku(variant.sku), variant])
  );

  const predictions = inventoryRows.map((row) => {
    const normalizedRowSku = normalizeVariantSku(row.variantSku);
    const key = buildKey(row.storeId, normalizedRowSku);
    const salesStats = salesStatsByKey.get(key) || {
      totalSoldQuantity: 0,
      activeSalesDays: 0,
      lastSoldAt: null,
    };

    const available = Math.max(0, Number(row.available) || 0);
    const minStock = Math.max(0, Number(row.minStock) || 0);
    const avgDailyDemand = salesStats.totalSoldQuantity / normalizedHistoricalDays;
    const predictedDemand = Math.ceil(avgDailyDemand * normalizedDaysAhead * 1.2);
    const suggestedReplenishment = Math.max(0, predictedDemand - available);
    const coverageDays =
      avgDailyDemand > 0 ? Number((available / avgDailyDemand).toFixed(2)) : null;
    const riskLevel = getRiskLevel({
      available,
      minStock,
      coverageDays: coverageDays ?? Number.POSITIVE_INFINITY,
      daysAhead: normalizedDaysAhead,
    });

    const store = storeById.get(String(row.storeId));
    const variant = variantBySku.get(normalizedRowSku);

    return {
      storeId: row.storeId,
      storeCode: store?.code || "",
      storeName: store?.name || "",
      productId: row.productId?._id || row.productId,
      productName: row.productId?.name || "",
      variantSku: normalizedRowSku,
      variantName: variant?.variantName || "",
      color: variant?.color || "",
      available,
      minStock,
      totalSoldHistorical: salesStats.totalSoldQuantity,
      activeSalesDays: salesStats.activeSalesDays,
      avgDailyDemand: Number(avgDailyDemand.toFixed(4)),
      predictedDemand,
      suggestedReplenishment,
      coverageDays,
      confidence: getConfidence(salesStats.activeSalesDays),
      riskLevel,
      lastSoldAt: salesStats.lastSoldAt,
      daysAhead: normalizedDaysAhead,
      historicalDays: normalizedHistoricalDays,
    };
  });

  predictions.sort((a, b) => {
    const riskDiff =
      (RISK_RANK[a.riskLevel] ?? 99) - (RISK_RANK[b.riskLevel] ?? 99);
    if (riskDiff !== 0) return riskDiff;
    if (b.suggestedReplenishment !== a.suggestedReplenishment) {
      return b.suggestedReplenishment - a.suggestedReplenishment;
    }
    return b.avgDailyDemand - a.avgDailyDemand;
  });

  const trimmed = predictions.slice(0, normalizedLimit);
  const summary = trimmed.reduce(
    (acc, row) => {
      acc.totalPredictions += 1;
      if (row.riskLevel === "CRITICAL") acc.criticalCount += 1;
      if (row.riskLevel === "HIGH") acc.highCount += 1;
      if (row.riskLevel === "MEDIUM") acc.mediumCount += 1;
      if (row.riskLevel === "LOW") acc.lowCount += 1;
      acc.totalSuggestedQuantity += row.suggestedReplenishment;
      return acc;
    },
    {
      totalPredictions: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      totalSuggestedQuantity: 0,
      generatedAt: new Date(),
    }
  );

  return {
    predictions: trimmed,
    summary,
    config: {
      daysAhead: normalizedDaysAhead,
      historicalDays: normalizedHistoricalDays,
      limit: normalizedLimit,
      lowStockOnly: !!lowStockOnly,
    },
  };
};

export const predictDemandForSku = async ({
  variantSku,
  storeId,
  daysAhead = DEFAULT_DAYS_AHEAD,
  historicalDays = DEFAULT_HISTORICAL_DAYS,
} = {}) => {
  const normalizedSku = normalizeVariantSku(variantSku);
  if (!normalizedSku) {
    throw new Error("variantSku is required");
  }

  return analyzeDemandPredictions({
    variantSku: normalizedSku,
    storeId,
    daysAhead,
    historicalDays,
    limit: MAX_LIMIT,
    lowStockOnly: false,
  });
};

export default {
  analyzeDemandPredictions,
  predictDemandForSku,
};
