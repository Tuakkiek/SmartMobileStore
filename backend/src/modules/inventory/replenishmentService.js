import Store from "../store/Store.js";
import StoreInventory from "./StoreInventory.js";
import { UniversalVariant } from "../product/UniversalProduct.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;
const DEFAULT_SURPLUS_THRESHOLD = 20;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const toStoreKey = (storeId) => String(storeId || "");

const normalizePriority = (available) =>
  Number(available) <= 0 ? "CRITICAL" : "HIGH";

const buildReason = ({ storeName, available, minStock }) =>
  `Low stock at ${storeName || "store"} (${available}/${minStock})`;

export const analyzeReplenishmentNeeds = async ({
  limit = DEFAULT_LIMIT,
  surplusThreshold = DEFAULT_SURPLUS_THRESHOLD,
  criticalOnly = false,
  storeId,
} = {}) => {
  const limitNum = Math.max(
    1,
    Math.min(MAX_LIMIT, toPositiveInteger(limit, DEFAULT_LIMIT))
  );
  const threshold = Math.max(0, Number(surplusThreshold) || DEFAULT_SURPLUS_THRESHOLD);

  const stores = await Store.find({
    status: "ACTIVE",
    type: { $ne: "WAREHOUSE" },
  })
    .select("_id code name type")
    .lean();

  if (stores.length === 0) {
    return {
      recommendations: [],
      summary: {
        totalRecommendations: 0,
        criticalCount: 0,
        highCount: 0,
        interStoreCount: 0,
        warehouseCount: 0,
        generatedAt: new Date(),
      },
    };
  }

  const storeIds = stores.map((store) => store._id);
  const storeMap = new Map(stores.map((store) => [toStoreKey(store._id), store]));
  const targetStoreId = storeId ? toStoreKey(storeId) : null;
  const targetStore = targetStoreId ? storeMap.get(targetStoreId) : null;

  if (targetStoreId && !storeMap.has(targetStoreId)) {
    return {
      recommendations: [],
      summary: {
        totalRecommendations: 0,
        criticalCount: 0,
        highCount: 0,
        interStoreCount: 0,
        warehouseCount: 0,
        generatedAt: new Date(),
      },
    };
  }

  const lowStockFilter = {
    storeId: targetStore ? targetStore._id : { $in: storeIds },
    $expr: { $lt: ["$available", "$minStock"] },
  };
  if (criticalOnly) {
    lowStockFilter.available = { $lte: 0 };
  }

  const lowStockRows = await StoreInventory.find(lowStockFilter)
    .select(
      "storeId productId variantSku quantity reserved available minStock status updatedAt"
    )
    .populate("productId", "name model")
    .sort({ available: 1, updatedAt: -1 })
    .limit(limitNum)
    .lean();

  if (lowStockRows.length === 0) {
    return {
      recommendations: [],
      summary: {
        totalRecommendations: 0,
        criticalCount: 0,
        highCount: 0,
        interStoreCount: 0,
        warehouseCount: 0,
        generatedAt: new Date(),
      },
    };
  }

  const skuSet = Array.from(
    new Set(lowStockRows.map((row) => String(row.variantSku || "").trim()).filter(Boolean))
  );

  const [variantRows, sourceRows] = await Promise.all([
    UniversalVariant.find({ sku: { $in: skuSet } })
      .select("sku variantName color")
      .lean(),
    StoreInventory.find({
      storeId: { $in: storeIds },
      variantSku: { $in: skuSet },
      available: { $gt: 0 },
    })
      .select("storeId productId variantSku available minStock")
      .lean(),
  ]);

  const variantBySku = new Map(
    variantRows.map((row) => [String(row.sku || "").trim(), row])
  );
  const sourceRowsBySku = new Map();
  for (const row of sourceRows) {
    const sku = String(row.variantSku || "").trim();
    if (!sku) continue;
    const existing = sourceRowsBySku.get(sku);
    if (existing) {
      existing.push(row);
    } else {
      sourceRowsBySku.set(sku, [row]);
    }
  }

  const recommendations = [];

  for (const row of lowStockRows) {
    const sku = String(row.variantSku || "").trim();
    if (!sku) continue;

    const targetStore = storeMap.get(toStoreKey(row.storeId));
    if (!targetStore) continue;

    const available = Math.max(0, Number(row.available) || 0);
    const minStock = Math.max(0, Number(row.minStock) || 0);
    const neededQuantity = Math.max(1, minStock - available);
    const priority = normalizePriority(available);
    const variant = variantBySku.get(sku);

    const candidates = (sourceRowsBySku.get(sku) || [])
      .filter((source) => toStoreKey(source.storeId) !== toStoreKey(row.storeId))
      .map((source) => {
        const sourceAvailable = Math.max(0, Number(source.available) || 0);
        const sourceMinStock = Math.max(0, Number(source.minStock) || 0);
        const protectedBuffer = Math.max(sourceMinStock, threshold);
        const transferableQuantity = Math.max(0, sourceAvailable - protectedBuffer);

        return {
          ...source,
          sourceAvailable,
          transferableQuantity,
        };
      })
      .filter((source) => source.transferableQuantity > 0)
      .sort(
        (a, b) =>
          b.transferableQuantity - a.transferableQuantity ||
          b.sourceAvailable - a.sourceAvailable
      );

    if (candidates.length > 0) {
      const bestSource = candidates[0];
      const fromStore = storeMap.get(toStoreKey(bestSource.storeId));
      const suggestedQuantity = Math.min(
        neededQuantity,
        bestSource.transferableQuantity
      );

      recommendations.push({
        type: "INTER_STORE_TRANSFER",
        priority,
        productId: row.productId?._id || row.productId,
        productName: row.productId?.name || "",
        variantSku: sku,
        variantName: variant?.variantName || "",
        color: variant?.color || "",
        toStore: {
          storeId: targetStore._id,
          storeCode: targetStore.code,
          storeName: targetStore.name,
        },
        fromStore: fromStore
          ? {
              storeId: fromStore._id,
              storeCode: fromStore.code,
              storeName: fromStore.name,
            }
          : null,
        currentAvailable: available,
        minStock,
        neededQuantity,
        suggestedQuantity,
        reason: buildReason({
          storeName: targetStore.name,
          available,
          minStock,
        }),
      });

      continue;
    }

    recommendations.push({
      type: "WAREHOUSE_REPLENISHMENT",
      priority,
      productId: row.productId?._id || row.productId,
      productName: row.productId?.name || "",
      variantSku: sku,
      variantName: variant?.variantName || "",
      color: variant?.color || "",
      toStore: {
        storeId: targetStore._id,
        storeCode: targetStore.code,
        storeName: targetStore.name,
      },
      fromStore: null,
      currentAvailable: available,
      minStock,
      neededQuantity,
      suggestedQuantity: neededQuantity,
      reason: "No store has transferable surplus for this SKU",
    });
  }

  recommendations.sort((a, b) => {
    const priorityRank = { CRITICAL: 0, HIGH: 1 };
    const aPriority = priorityRank[a.priority] ?? 9;
    const bPriority = priorityRank[b.priority] ?? 9;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (b.neededQuantity || 0) - (a.neededQuantity || 0);
  });

  const summary = recommendations.reduce(
    (acc, recommendation) => {
      acc.totalRecommendations += 1;
      if (recommendation.priority === "CRITICAL") acc.criticalCount += 1;
      if (recommendation.priority === "HIGH") acc.highCount += 1;
      if (recommendation.type === "INTER_STORE_TRANSFER") acc.interStoreCount += 1;
      if (recommendation.type === "WAREHOUSE_REPLENISHMENT") acc.warehouseCount += 1;
      return acc;
    },
    {
      totalRecommendations: 0,
      criticalCount: 0,
      highCount: 0,
      interStoreCount: 0,
      warehouseCount: 0,
      generatedAt: new Date(),
    }
  );

  return {
    recommendations: recommendations.slice(0, limitNum),
    summary,
  };
};

export default {
  analyzeReplenishmentNeeds,
};
