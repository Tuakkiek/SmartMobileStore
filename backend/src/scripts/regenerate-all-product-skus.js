import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import UniversalProduct, { UniversalVariant } from "../modules/product/UniversalProduct.js";
import SkuCounter from "../modules/product/SkuCounter.js";
import { generateSKU, getNextSku } from "../lib/generateSKU.js";
import "../modules/productType/ProductType.js";
import Order from "../modules/order/Order.js";
import Cart from "../modules/cart/Cart.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";
import StockTransfer from "../modules/inventory/StockTransfer.js";
import WarehouseInventory from "../modules/warehouse/Inventory.js";
import StockMovement from "../modules/warehouse/StockMovement.js";
import PurchaseOrder from "../modules/warehouse/PurchaseOrder.js";
import GoodsReceipt from "../modules/warehouse/GoodsReceipt.js";
import CycleCount from "../modules/warehouse/CycleCount.js";
import ReplenishmentRecommendation from "../modules/inventory/ReplenishmentRecommendation.js";
import OmnichannelEvent from "../modules/monitoring/OmnichannelEvent.js";

dotenv.config();

const LOG_PREFIX = "[SKU-REGEN]";
const SEQ_SKU_REGEX = /^\d{8}$/;
const READABLE_SKU_REGEX = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const DEFAULT_MAPPING_PREVIEW_LIMIT = 200;
const DEFAULT_BULK_CHUNK_SIZE = 400;

const getArgValue = (args, key, fallback = null) => {
  const prefix = `${key}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  if (!hit) return fallback;
  return hit.slice(prefix.length);
};

const toSafeInt = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

const parseOptions = (args) => {
  const explicitDryRun = args.includes("--dry-run");
  const explicitApply = args.includes("--apply");

  if (explicitDryRun && explicitApply) {
    throw new Error("Use either --dry-run or --apply, not both");
  }

  return {
    help: args.includes("--help") || args.includes("-h"),
    dryRun: explicitApply ? false : true,
    syncRelated: !args.includes("--skip-related-sync"),
    failOnMissingProductType: args.includes("--fail-on-missing-product-type"),
    writeReport: !args.includes("--no-report"),
    mappingPreviewLimit: toSafeInt(
      getArgValue(args, "--mapping-preview", DEFAULT_MAPPING_PREVIEW_LIMIT),
      DEFAULT_MAPPING_PREVIEW_LIMIT
    ),
    bulkChunkSize: toSafeInt(
      getArgValue(args, "--bulk-chunk-size", DEFAULT_BULK_CHUNK_SIZE),
      DEFAULT_BULK_CHUNK_SIZE
    ),
    backupDir: getArgValue(args, "--backup-dir", null),
  };
};

const printHelp = () => {
  console.log(`${LOG_PREFIX} Regenerate all variant SKUs`);
  console.log("");
  console.log("Usage:");
  console.log(
    "  node src/scripts/regenerate-all-product-skus.js [--dry-run] [--apply] [--skip-related-sync]"
  );
  console.log("");
  console.log("Flags:");
  console.log("  --dry-run                  Preview mode (default)");
  console.log("  --apply                    Execute updates");
  console.log("  --skip-related-sync        Do not sync SKU references in other collections");
  console.log("  --fail-on-missing-product-type  Abort if a product has missing productType");
  console.log("  --mapping-preview=<N>      Number of old->new mappings printed to console");
  console.log("  --bulk-chunk-size=<N>      Bulk write chunk size for related updates");
  console.log("  --backup-dir=<ABS_OR_REL>  Custom output folder for backup/report files");
  console.log("  --no-report                Skip writing JSON report file");
  console.log("");
  console.log("Examples:");
  console.log("  node src/scripts/regenerate-all-product-skus.js --dry-run");
  console.log("  node src/scripts/regenerate-all-product-skus.js --apply");
  console.log(
    "  node src/scripts/regenerate-all-product-skus.js --apply --skip-related-sync"
  );
};

const toObjectIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return String(value);
};

const normalizeAsciiKey = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .trim();
};

const inferCategory = (product) => {
  const typeCandidates = [
    product?.productType?.slug,
    product?.productType?.name,
    product?.name,
    product?.model,
  ]
    .map((item) => normalizeAsciiKey(item))
    .filter(Boolean);

  for (const item of typeCandidates) {
    if (item.includes("iphone")) return "iphone";
    if (item.includes("ipad")) return "ipad";
    if (item.includes("macbook") || item === "mac" || item.includes(" mac")) return "mac";
    if (item.includes("airpod")) return "airpods";
    if (item.includes("watch")) return "applewatch";
    if (item.includes("accessor") || item.includes("phu-kien") || item.includes("phukien")) {
      return "accessories";
    }
  }

  return "default";
};

const collectTokens = (value, output = []) => {
  if (value === undefined || value === null) return output;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const token = String(value).trim();
    if (token) output.push(token);
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTokens(item, output);
    }
    return output;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      collectTokens(item, output);
    }
  }

  return output;
};

const extractVariantAttributeTokens = (variant) => {
  const attrs = variant?.attributes;
  const isObjectAttrs = attrs && typeof attrs === "object" && !Array.isArray(attrs);
  const preferredKeys = [
    "storage",
    "rom",
    "capacity",
    "capacityGb",
    "ram",
    "memory",
    "bandSize",
    "connectivity",
    "size",
  ];

  const tokens = [];
  const seen = new Set();
  const pushTokens = (value) => {
    const local = collectTokens(value, []);
    for (const token of local) {
      const normalized = token.replace(/\s+/g, " ").trim();
      if (!normalized) continue;
      const key = normalizeAsciiKey(normalized);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      tokens.push(normalized);
    }
  };

  if (isObjectAttrs) {
    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        pushTokens(attrs[key]);
      }
    }

    for (const [key, value] of Object.entries(attrs)) {
      if (preferredKeys.includes(key)) continue;
      pushTokens(value);
    }
  }

  if (!tokens.length) {
    pushTokens(variant?.variantName);
  }

  return tokens.slice(0, 4);
};

const loadProducts = async () => {
  return UniversalProduct.find({})
    .select("_id name model productType variants")
    .populate("productType", "_id name slug")
    .populate({
      path: "variants",
      select: "_id productId color variantName attributes sku",
      options: { sort: { _id: 1 } },
    })
    .sort({ _id: 1 })
    .lean();
};

const buildPlan = (products, options) => {
  const mappings = [];
  const warnings = [];
  const productsWithoutVariants = [];
  const productsWithMissingType = [];
  let variantsWithMissingAttributes = 0;

  for (const product of products) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const productId = toObjectIdString(product?._id);

    if (!product?.productType) {
      productsWithMissingType.push({
        productId,
        name: product?.name || "",
        model: product?.model || "",
      });
    }

    if (!variants.length) {
      productsWithoutVariants.push({
        productId,
        name: product?.name || "",
        model: product?.model || "",
      });
      continue;
    }

    const category = inferCategory(product);
    const modelName = String(product?.model || product?.name || "PRODUCT").trim();

    for (const variant of variants) {
      const variantId = toObjectIdString(variant?._id);
      const oldSku = String(variant?.sku || "").trim();
      const color = String(variant?.color || "").trim();
      const variantName = String(variant?.variantName || "").trim();
      const attributeTokens = extractVariantAttributeTokens(variant);

      if (!attributeTokens.length) {
        variantsWithMissingAttributes += 1;
      }

      const readableSku = generateSKU(category, modelName, color, ...attributeTokens);
      const readableSkuValid = READABLE_SKU_REGEX.test(readableSku);

      if (!readableSkuValid) {
        warnings.push({
          type: "INVALID_READABLE_SKU",
          productId,
          variantId,
          readableSku,
        });
      }

      if (!oldSku) {
        warnings.push({
          type: "MISSING_OLD_SKU",
          productId,
          variantId,
        });
      }

      mappings.push({
        productId,
        productName: String(product?.name || "").trim(),
        model: modelName,
        productTypeId: toObjectIdString(product?.productType?._id),
        productTypeName: String(product?.productType?.name || "").trim(),
        productTypeSlug: String(product?.productType?.slug || "").trim(),
        variantId,
        variantName,
        color,
        oldSku,
        readableSku,
        readableSkuValid,
        attributeTokens,
      });
    }
  }

  if (options.failOnMissingProductType && productsWithMissingType.length > 0) {
    throw new Error(
      `Found ${productsWithMissingType.length} products with missing productType (use without --fail-on-missing-product-type to continue)`
    );
  }

  const oldSkuBuckets = new Map();
  for (const row of mappings) {
    const key = row.oldSku || "__EMPTY__";
    if (!oldSkuBuckets.has(key)) oldSkuBuckets.set(key, []);
    oldSkuBuckets.get(key).push(row);
  }

  const duplicateOldSkus = [];
  for (const [sku, rows] of oldSkuBuckets.entries()) {
    if (sku === "__EMPTY__") continue;
    if (rows.length > 1) {
      duplicateOldSkus.push({
        oldSku: sku,
        count: rows.length,
        variantIds: rows.map((row) => row.variantId),
      });
    }
  }

  return {
    mappings,
    warnings,
    productsWithoutVariants,
    productsWithMissingType,
    duplicateOldSkus,
    variantsWithMissingAttributes,
  };
};

const getCurrentCounterSeq = async () => {
  const counter = await SkuCounter.findById("global").select("_id seq").lean();
  const seq = Number(counter?.seq);
  return Number.isFinite(seq) && seq >= 0 ? Math.floor(seq) : 0;
};

const getMaxExistingSequentialSku = (mappings) => {
  let max = 0;
  for (const row of mappings) {
    if (!SEQ_SKU_REGEX.test(row.oldSku || "")) continue;
    const value = Number(row.oldSku);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max;
};

const assignDryRunSkus = (mappings, baseSeq) => {
  return mappings.map((row, index) => ({
    ...row,
    newSku: String(baseSeq + index + 1).padStart(8, "0"),
  }));
};

const assignLiveSkus = async (mappings) => {
  const rows = [];
  for (const row of mappings) {
    const newSku = await getNextSku();
    rows.push({
      ...row,
      newSku,
    });
  }
  return rows;
};

const validateAssignments = (rows) => {
  const invalidNewFormat = rows.filter((row) => !SEQ_SKU_REGEX.test(row.newSku || ""));
  const duplicateNewBuckets = new Map();

  for (const row of rows) {
    if (!duplicateNewBuckets.has(row.newSku)) {
      duplicateNewBuckets.set(row.newSku, []);
    }
    duplicateNewBuckets.get(row.newSku).push(row);
  }

  const duplicateNewSkus = [];
  for (const [newSku, grouped] of duplicateNewBuckets.entries()) {
    if (grouped.length > 1) {
      duplicateNewSkus.push({
        newSku,
        count: grouped.length,
        variantIds: grouped.map((item) => item.variantId),
      });
    }
  }

  return {
    invalidNewFormat,
    duplicateNewSkus,
  };
};

const chunkArray = (items, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const runBulkWriteInChunks = async (model, operations, chunkSize) => {
  if (!operations.length) {
    return {
      operations: 0,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
    };
  }

  let matchedCount = 0;
  let modifiedCount = 0;
  let upsertedCount = 0;

  for (const chunk of chunkArray(operations, chunkSize)) {
    const result = await model.bulkWrite(chunk, { ordered: false });
    matchedCount += result.matchedCount || 0;
    modifiedCount += result.modifiedCount || 0;
    upsertedCount += result.upsertedCount || 0;
  }

  return {
    operations: operations.length,
    matchedCount,
    modifiedCount,
    upsertedCount,
  };
};

const buildTopLevelOps = (mappings, field) => {
  const operations = [];
  for (const row of mappings) {
    if (!row.oldSku || row.oldSku === row.newSku) continue;
    operations.push({
      updateMany: {
        filter: { [field]: row.oldSku },
        update: { $set: { [field]: row.newSku } },
      },
    });
  }
  return operations;
};

const buildArrayOps = (mappings, queryPath, setPath, filterToken, filterField) => {
  const operations = [];
  for (const row of mappings) {
    if (!row.oldSku || row.oldSku === row.newSku) continue;
    operations.push({
      updateMany: {
        filter: { [queryPath]: row.oldSku },
        update: { $set: { [setPath]: row.newSku } },
        arrayFilters: [{ [`${filterToken}.${filterField}`]: row.oldSku }],
      },
    });
  }
  return operations;
};

const estimateRelatedUpdates = async (mappings) => {
  const skuSet = Array.from(new Set(mappings.map((row) => row.oldSku).filter(Boolean)));
  if (!skuSet.length) {
    return {};
  }

  const [
    orderItemsDocs,
    orderExchangeDocs,
    cartDocs,
    storeInventoryDocs,
    stockTransferItemDocs,
    stockTransferDiscrepancyDocs,
    warehouseInventoryDocs,
    stockMovementDocs,
    purchaseOrderDocs,
    goodsReceiptDocs,
    cycleCountDocs,
    replenishmentDocs,
    omnichannelDocs,
  ] = await Promise.all([
    Order.countDocuments({ "items.variantSku": { $in: skuSet } }),
    Order.countDocuments({ "exchangeHistory.restoredItems.sku": { $in: skuSet } }),
    Cart.countDocuments({ "items.sku": { $in: skuSet } }),
    StoreInventory.collection.countDocuments({ variantSku: { $in: skuSet } }),
    StockTransfer.countDocuments({ "items.variantSku": { $in: skuSet } }),
    StockTransfer.countDocuments({ discrepancies: { $elemMatch: { variantSku: { $in: skuSet } } } }),
    WarehouseInventory.countDocuments({ sku: { $in: skuSet } }),
    StockMovement.countDocuments({ sku: { $in: skuSet } }),
    PurchaseOrder.countDocuments({ "items.sku": { $in: skuSet } }),
    GoodsReceipt.countDocuments({ "items.sku": { $in: skuSet } }),
    CycleCount.countDocuments({ "items.sku": { $in: skuSet } }),
    ReplenishmentRecommendation.countDocuments({ variantSku: { $in: skuSet } }),
    OmnichannelEvent.countDocuments({ variantSku: { $in: skuSet } }),
  ]);

  return {
    orderItemsDocs,
    orderExchangeDocs,
    cartDocs,
    storeInventoryDocs,
    stockTransferItemDocs,
    stockTransferDiscrepancyDocs,
    warehouseInventoryDocs,
    stockMovementDocs,
    purchaseOrderDocs,
    goodsReceiptDocs,
    cycleCountDocs,
    replenishmentDocs,
    omnichannelDocs,
  };
};

const syncRelatedReferences = async (mappings, chunkSize) => {
  const results = {};
  const filteredMappings = mappings.filter((row) => row.oldSku && row.oldSku !== row.newSku);

  const orderItemOps = buildArrayOps(
    filteredMappings,
    "items.variantSku",
    "items.$[item].variantSku",
    "item",
    "variantSku"
  );
  results.orderItems = await runBulkWriteInChunks(Order, orderItemOps, chunkSize);

  const orderExchangeOps = buildArrayOps(
    filteredMappings,
    "exchangeHistory.restoredItems.sku",
    "exchangeHistory.$[].restoredItems.$[entry].sku",
    "entry",
    "sku"
  );
  results.orderExchangeHistory = await runBulkWriteInChunks(Order, orderExchangeOps, chunkSize);

  const cartOps = buildArrayOps(filteredMappings, "items.sku", "items.$[item].sku", "item", "sku");
  results.cartItems = await runBulkWriteInChunks(Cart, cartOps, chunkSize);

  const storeInventoryOps = buildTopLevelOps(filteredMappings, "variantSku");
  results.storeInventory = await runBulkWriteInChunks(
    StoreInventory.collection,
    storeInventoryOps,
    chunkSize
  );

  const stockTransferItemOps = buildArrayOps(
    filteredMappings,
    "items.variantSku",
    "items.$[item].variantSku",
    "item",
    "variantSku"
  );
  results.stockTransferItems = await runBulkWriteInChunks(
    StockTransfer,
    stockTransferItemOps,
    chunkSize
  );

  const stockTransferDiscrepancyOps = buildArrayOps(
    filteredMappings,
    "discrepancies.variantSku",
    "discrepancies.$[item].variantSku",
    "item",
    "variantSku"
  );
  results.stockTransferDiscrepancies = await runBulkWriteInChunks(
    StockTransfer,
    stockTransferDiscrepancyOps,
    chunkSize
  );

  const warehouseInventoryOps = buildTopLevelOps(filteredMappings, "sku");
  results.warehouseInventory = await runBulkWriteInChunks(
    WarehouseInventory,
    warehouseInventoryOps,
    chunkSize
  );

  const stockMovementOps = buildTopLevelOps(filteredMappings, "sku");
  results.stockMovements = await runBulkWriteInChunks(
    StockMovement,
    stockMovementOps,
    chunkSize
  );

  const purchaseOrderOps = buildArrayOps(
    filteredMappings,
    "items.sku",
    "items.$[item].sku",
    "item",
    "sku"
  );
  results.purchaseOrders = await runBulkWriteInChunks(PurchaseOrder, purchaseOrderOps, chunkSize);

  const goodsReceiptOps = buildArrayOps(
    filteredMappings,
    "items.sku",
    "items.$[item].sku",
    "item",
    "sku"
  );
  results.goodsReceipts = await runBulkWriteInChunks(GoodsReceipt, goodsReceiptOps, chunkSize);

  const cycleCountOps = buildArrayOps(
    filteredMappings,
    "items.sku",
    "items.$[item].sku",
    "item",
    "sku"
  );
  results.cycleCounts = await runBulkWriteInChunks(CycleCount, cycleCountOps, chunkSize);

  const replenishmentOps = buildTopLevelOps(filteredMappings, "variantSku");
  results.replenishmentRecommendations = await runBulkWriteInChunks(
    ReplenishmentRecommendation,
    replenishmentOps,
    chunkSize
  );

  const omnichannelOps = buildTopLevelOps(filteredMappings, "variantSku");
  results.omnichannelEvents = await runBulkWriteInChunks(
    OmnichannelEvent,
    omnichannelOps,
    chunkSize
  );

  return results;
};

const printMappingPreview = (rows, limit) => {
  const preview = rows.slice(0, limit);
  for (const item of preview) {
    const label = `${item.oldSku || "<empty>"} -> ${item.newSku} | ${item.readableSku}`;
    console.log(`${LOG_PREFIX} ${label}`);
  }

  if (rows.length > preview.length) {
    console.log(`${LOG_PREFIX} ... (${rows.length - preview.length} more mappings omitted)`);
  }
};

const createTimestampToken = () => {
  return new Date().toISOString().replace(/[:.]/g, "-");
};

const ensureOutputDirectory = async (options) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const backendRoot = path.resolve(__dirname, "../..");
  const defaultRoot = path.join(backendRoot, "backups", "sku-regeneration");
  const root = options.backupDir
    ? path.resolve(process.cwd(), options.backupDir)
    : defaultRoot;
  const outputDir = path.join(root, createTimestampToken());
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
};

const writeJson = async (filePath, payload) => {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
};

const verifyUniqueSequentialSkus = async () => {
  const duplicates = await UniversalVariant.aggregate([
    { $group: { _id: "$sku", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  const invalidFormatCount = await UniversalVariant.countDocuments({
    sku: { $not: SEQ_SKU_REGEX },
  });

  return {
    duplicates,
    invalidFormatCount,
  };
};

const connectDB = async () => {
  const uri = process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_CONNECTIONSTRING or MONGO_URI");
  }

  await mongoose.connect(uri);
  console.log(`${LOG_PREFIX} MongoDB connected`);
};

const printSummary = (summary) => {
  const relatedEstimatedDocs = Object.values(summary.relatedEstimate || {}).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
  const relatedModifiedDocs = Object.values(summary.relatedApply || {}).reduce(
    (sum, row) => sum + (Number(row?.modifiedCount) || 0),
    0
  );

  console.log("");
  console.log(`${LOG_PREFIX} Summary`);
  console.log(`${LOG_PREFIX} mode=${summary.mode}`);
  console.log(`${LOG_PREFIX} productsScanned=${summary.productsScanned}`);
  console.log(`${LOG_PREFIX} variantsPlanned=${summary.variantsPlanned}`);
  console.log(`${LOG_PREFIX} variantsUpdated=${summary.variantsUpdated}`);
  console.log(`${LOG_PREFIX} productsWithoutVariants=${summary.productsWithoutVariants}`);
  console.log(`${LOG_PREFIX} productsWithMissingType=${summary.productsWithMissingType}`);
  console.log(`${LOG_PREFIX} variantsWithMissingAttributes=${summary.variantsWithMissingAttributes}`);
  console.log(`${LOG_PREFIX} duplicateOldSkus=${summary.duplicateOldSkus}`);
  console.log(`${LOG_PREFIX} invalidReadableSkuRows=${summary.invalidReadableSkuRows}`);
  console.log(`${LOG_PREFIX} relatedSyncEnabled=${summary.relatedSyncEnabled}`);
  console.log(`${LOG_PREFIX} relatedDocsEstimated=${relatedEstimatedDocs}`);
  console.log(`${LOG_PREFIX} relatedDocsModified=${relatedModifiedDocs}`);
  console.log(`${LOG_PREFIX} oldCounterSeq=${summary.oldCounterSeq}`);
  console.log(`${LOG_PREFIX} counterFloorApplied=${summary.counterFloorApplied}`);
  console.log(`${LOG_PREFIX} newCounterSeq=${summary.newCounterSeq}`);
  console.log(`${LOG_PREFIX} uniqueValidationPassed=${summary.uniqueValidationPassed}`);
  console.log(`${LOG_PREFIX} invalidSequentialSkuCount=${summary.invalidSequentialSkuCount}`);
  console.log(`${LOG_PREFIX} duplicateSequentialSkuCount=${summary.duplicateSequentialSkuCount}`);
  console.log(`${LOG_PREFIX} reportFile=${summary.reportFile || "N/A"}`);
  console.log(`${LOG_PREFIX} backupFile=${summary.backupFile || "N/A"}`);
  console.log(`${LOG_PREFIX} durationMs=${summary.durationMs}`);
};

const run = async () => {
  const startedAt = Date.now();
  const args = process.argv.slice(2);
  const options = parseOptions(args);

  if (options.help) {
    printHelp();
    return;
  }

  const summary = {
    mode: options.dryRun ? "dry-run" : "apply",
    productsScanned: 0,
    variantsPlanned: 0,
    variantsUpdated: 0,
    productsWithoutVariants: 0,
    productsWithMissingType: 0,
    variantsWithMissingAttributes: 0,
    duplicateOldSkus: 0,
    invalidReadableSkuRows: 0,
    relatedSyncEnabled: options.syncRelated,
    oldCounterSeq: 0,
    counterFloorApplied: 0,
    newCounterSeq: 0,
    uniqueValidationPassed: false,
    invalidSequentialSkuCount: 0,
    duplicateSequentialSkuCount: 0,
    reportFile: "",
    backupFile: "",
    relatedEstimate: {},
    relatedApply: {},
    warnings: [],
    durationMs: 0,
  };

  let outputDir = "";
  let reportPayload = {};

  try {
    await connectDB();

    const products = await loadProducts();
    summary.productsScanned = products.length;

    const plan = buildPlan(products, options);
    summary.productsWithoutVariants = plan.productsWithoutVariants.length;
    summary.productsWithMissingType = plan.productsWithMissingType.length;
    summary.variantsWithMissingAttributes = plan.variantsWithMissingAttributes;
    summary.duplicateOldSkus = plan.duplicateOldSkus.length;
    summary.invalidReadableSkuRows = plan.mappings.filter((row) => !row.readableSkuValid).length;
    summary.variantsPlanned = plan.mappings.length;
    summary.warnings = plan.warnings;

    if (!plan.mappings.length) {
      console.log(`${LOG_PREFIX} No variants found. Nothing to regenerate.`);
      return;
    }

    if (plan.duplicateOldSkus.length > 0 && options.syncRelated) {
      throw new Error(
        `Found ${plan.duplicateOldSkus.length} duplicate old SKUs. Related sync is ambiguous; fix duplicates first or run with --skip-related-sync`
      );
    }

    summary.oldCounterSeq = await getCurrentCounterSeq();
    const maxExistingSequential = getMaxExistingSequentialSku(plan.mappings);
    const counterFloor = Math.max(summary.oldCounterSeq, maxExistingSequential);
    summary.counterFloorApplied = counterFloor;

    if (!options.dryRun && counterFloor > summary.oldCounterSeq) {
      await SkuCounter.findByIdAndUpdate(
        "global",
        { $max: { seq: counterFloor } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const assignedMappings = options.dryRun
      ? assignDryRunSkus(plan.mappings, counterFloor)
      : await assignLiveSkus(plan.mappings);

    const assignmentValidation = validateAssignments(assignedMappings);
    if (assignmentValidation.invalidNewFormat.length > 0) {
      throw new Error(
        `Generated ${assignmentValidation.invalidNewFormat.length} invalid sequential SKU(s)`
      );
    }

    if (assignmentValidation.duplicateNewSkus.length > 0) {
      throw new Error(
        `Generated ${assignmentValidation.duplicateNewSkus.length} duplicate new SKU(s)`
      );
    }

    printMappingPreview(assignedMappings, options.mappingPreviewLimit);

    if (options.syncRelated) {
      summary.relatedEstimate = await estimateRelatedUpdates(assignedMappings);
    }

    const mustWriteBackup = !options.dryRun;
    const shouldWriteReport = options.writeReport || !options.dryRun;

    if (mustWriteBackup || shouldWriteReport) {
      outputDir = await ensureOutputDirectory(options);
    }

    if (mustWriteBackup) {
      const backupBeforePath = path.join(outputDir, "sku-backup-before.json");

      const backupPayload = {
        generatedAt: new Date().toISOString(),
        mode: summary.mode,
        counterSeqBefore: summary.oldCounterSeq,
        counterFloor,
        variants: assignedMappings.map((row) => ({
          productId: row.productId,
          productName: row.productName,
          model: row.model,
          productTypeName: row.productTypeName,
          productTypeSlug: row.productTypeSlug,
          variantId: row.variantId,
          variantName: row.variantName,
          color: row.color,
          oldSku: row.oldSku,
          plannedNewSku: row.newSku,
          readableSku: row.readableSku,
          attributes: row.attributeTokens,
        })),
      };

      await writeJson(backupBeforePath, backupPayload);
      summary.backupFile = backupBeforePath;
    }

    if (shouldWriteReport) {
      const reportPath = path.join(outputDir, "sku-regeneration-report.json");

      reportPayload = {
        generatedAt: new Date().toISOString(),
        options,
        summary: { ...summary },
        duplicateOldSkus: plan.duplicateOldSkus,
        productsWithoutVariants: plan.productsWithoutVariants,
        productsWithMissingType: plan.productsWithMissingType,
        warnings: plan.warnings,
        mappings: assignedMappings,
      };

      await writeJson(reportPath, reportPayload);
      summary.reportFile = reportPath;
    }

    if (!options.dryRun) {
      const variantOps = assignedMappings.map((row) => ({
        updateOne: {
          filter: { _id: row.variantId },
          update: { $set: { sku: row.newSku } },
        },
      }));

      const variantUpdateResult = await runBulkWriteInChunks(
        UniversalVariant,
        variantOps,
        options.bulkChunkSize
      );
      summary.variantsUpdated = variantUpdateResult.modifiedCount;

      if (options.syncRelated) {
        summary.relatedApply = await syncRelatedReferences(
          assignedMappings,
          options.bulkChunkSize
        );
      }
    }

    summary.newCounterSeq = await getCurrentCounterSeq();

    const finalValidation = await verifyUniqueSequentialSkus();
    summary.invalidSequentialSkuCount = finalValidation.invalidFormatCount;
    summary.duplicateSequentialSkuCount = finalValidation.duplicates.length;
    summary.uniqueValidationPassed =
      finalValidation.invalidFormatCount === 0 && finalValidation.duplicates.length === 0;

    if (!options.dryRun && !summary.uniqueValidationPassed) {
      throw new Error(
        "Post-update verification failed: duplicate or invalid SKU format detected"
      );
    }

    summary.durationMs = Date.now() - startedAt;

    if (summary.reportFile) {
      const finalReport = {
        ...reportPayload,
        summary: { ...summary },
      };
      await writeJson(summary.reportFile, finalReport);
    }

    printSummary(summary);
  } catch (error) {
    summary.durationMs = Date.now() - startedAt;
    console.error(`${LOG_PREFIX} Failed: ${error.message}`);
    if (summary.reportFile) {
      try {
        const failureReport = {
          generatedAt: new Date().toISOString(),
          mode: summary.mode,
          error: error.message,
          summary,
        };
        await writeJson(summary.reportFile, failureReport);
      } catch (writeError) {
        console.error(`${LOG_PREFIX} Failed to write failure report: ${writeError.message}`);
      }
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log(`${LOG_PREFIX} MongoDB disconnected`);
  }
};

run();
