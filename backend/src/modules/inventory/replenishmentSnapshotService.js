import mongoose from "mongoose";
import ReplenishmentSnapshot from "./ReplenishmentSnapshot.js";
import ReplenishmentRecommendation from "./ReplenishmentRecommendation.js";

const toDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeSource = (source) => {
  const normalized = String(source || "ON_DEMAND")
    .trim()
    .toUpperCase();
  const allowed = new Set(["SCHEDULED", "STARTUP_CATCHUP", "MANUAL", "ON_DEMAND"]);
  return allowed.has(normalized) ? normalized : "ON_DEMAND";
};

const buildRecommendationDedupeKey = (recommendation = {}) => {
  const type = String(recommendation.type || "").trim().toUpperCase();
  const sku = String(recommendation.variantSku || "").trim().toUpperCase();
  const fromStoreId = recommendation.fromStore?.storeId
    ? String(recommendation.fromStore.storeId)
    : "WAREHOUSE";
  const toStoreId = recommendation.toStore?.storeId
    ? String(recommendation.toStore.storeId)
    : "";
  return `${type}|${sku}|${fromStoreId}|${toStoreId}`;
};

const normalizeSummary = (summary = {}, recommendationsCount = 0) => ({
  totalRecommendations:
    Number(summary.totalRecommendations) || recommendationsCount || 0,
  criticalCount: Number(summary.criticalCount) || 0,
  highCount: Number(summary.highCount) || 0,
  interStoreCount: Number(summary.interStoreCount) || 0,
  warehouseCount: Number(summary.warehouseCount) || 0,
});

const normalizeStoreRef = (store = null, { required = false } = {}) => {
  if (!store || !store.storeId) {
    if (required) return null;
    return {
      storeId: undefined,
      storeCode: "",
      storeName: "",
    };
  }

  return {
    storeId: store.storeId,
    storeCode: String(store.storeCode || "").trim(),
    storeName: String(store.storeName || "").trim(),
  };
};

const mapRecommendationToDocument = ({
  recommendation,
  snapshotId,
  snapshotDateKey,
  source,
  metadata,
}) => {
  const toStore = normalizeStoreRef(recommendation?.toStore, { required: true });
  if (!toStore) {
    return null;
  }

  return {
    snapshotId,
    snapshotDateKey,
    source,
    dedupeKey: buildRecommendationDedupeKey(recommendation),
    type: String(recommendation?.type || "").trim().toUpperCase(),
    priority: String(recommendation?.priority || "HIGH").trim().toUpperCase(),
    productId: recommendation?.productId || undefined,
    productName: String(recommendation?.productName || "").trim(),
    variantSku: String(recommendation?.variantSku || "").trim(),
    variantName: String(recommendation?.variantName || "").trim(),
    color: String(recommendation?.color || "").trim(),
    fromStore: normalizeStoreRef(recommendation?.fromStore),
    toStore,
    currentAvailable: Math.max(0, Number(recommendation?.currentAvailable) || 0),
    minStock: Math.max(0, Number(recommendation?.minStock) || 0),
    neededQuantity: Math.max(0, Number(recommendation?.neededQuantity) || 0),
    suggestedQuantity: Math.max(0, Number(recommendation?.suggestedQuantity) || 0),
    reason: String(recommendation?.reason || "").trim(),
    status: "OPEN",
    metadata: {
      ...metadata,
    },
  };
};

export const saveReplenishmentSnapshot = async ({
  recommendations = [],
  summary = {},
  generatedAt = new Date(),
  source = "ON_DEMAND",
  options = {},
  metadata = {},
} = {}) => {
  const snapshotDateKey = toDateKey(generatedAt);
  const normalizedSource = normalizeSource(source);
  const normalizedSummary = normalizeSummary(summary, recommendations.length);

  const snapshot = await ReplenishmentSnapshot.findOneAndUpdate(
    { snapshotDateKey },
    {
      snapshotDateKey,
      generatedAt,
      source: normalizedSource,
      summary: normalizedSummary,
      options: {
        limit: toPositiveInteger(options.limit, 100),
        surplusThreshold: clamp(Number(options.surplusThreshold) || 20, 0, 100000),
        criticalOnly: !!options.criticalOnly,
      },
      metadata: {
        ...metadata,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  await ReplenishmentRecommendation.deleteMany({ snapshotId: snapshot._id });

  const docs = recommendations
    .map((recommendation) =>
      mapRecommendationToDocument({
        recommendation,
        snapshotId: snapshot._id,
        snapshotDateKey,
        source: normalizedSource,
        metadata,
      })
    )
    .filter((doc) => doc && doc.variantSku && doc.dedupeKey);

  if (docs.length > 0) {
    await ReplenishmentRecommendation.insertMany(docs, { ordered: false });
  }

  return {
    snapshot,
    recommendationsCount: docs.length,
  };
};

export const getLatestReplenishmentSnapshot = async ({
  limit = 100,
  criticalOnly = false,
  storeId,
} = {}) => {
  const latestSnapshot = await ReplenishmentSnapshot.findOne()
    .sort({ generatedAt: -1 })
    .lean();

  if (!latestSnapshot) {
    return null;
  }

  const filter = {
    snapshotId: latestSnapshot._id,
  };

  if (criticalOnly) {
    filter.priority = "CRITICAL";
  }

  if (storeId) {
    const normalizedStoreId = String(storeId).trim();
    if (mongoose.Types.ObjectId.isValid(normalizedStoreId)) {
      filter["toStore.storeId"] = new mongoose.Types.ObjectId(normalizedStoreId);
    } else {
      return {
        snapshot: latestSnapshot,
        recommendations: [],
      };
    }
  }

  const maxRows = Math.max(1, Math.min(300, toPositiveInteger(limit, 100)));
  const recommendations = await ReplenishmentRecommendation.find(filter)
    .sort({ priority: 1, neededQuantity: -1, suggestedQuantity: -1 })
    .limit(maxRows)
    .lean();

  return {
    snapshot: latestSnapshot,
    recommendations,
  };
};

export const markSnapshotNotifications = async ({
  snapshotDateKey,
  sent = false,
  count = 0,
  eventType = "",
} = {}) => {
  if (!snapshotDateKey) return null;

  return ReplenishmentSnapshot.findOneAndUpdate(
    { snapshotDateKey: String(snapshotDateKey).trim() },
    {
      $set: {
        "notifications.sent": !!sent,
        "notifications.sentAt": new Date(),
        "notifications.count": Math.max(0, Number(count) || 0),
        "notifications.eventType": String(eventType || "").trim(),
      },
    },
    { new: true }
  );
};

export default {
  saveReplenishmentSnapshot,
  getLatestReplenishmentSnapshot,
  markSnapshotNotifications,
};
