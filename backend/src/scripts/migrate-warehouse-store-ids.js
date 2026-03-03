import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Store from "../modules/store/Store.js";
import User from "../modules/auth/User.js";
import WarehouseConfiguration from "../modules/warehouse/WarehouseConfiguration.js";
import WarehouseLocation from "../modules/warehouse/WarehouseLocation.js";
import Inventory from "../modules/warehouse/Inventory.js";
import PurchaseOrder from "../modules/warehouse/PurchaseOrder.js";
import GoodsReceipt from "../modules/warehouse/GoodsReceipt.js";
import CycleCount from "../modules/warehouse/CycleCount.js";
import StockMovement from "../modules/warehouse/StockMovement.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const SKIP_BRANCH = { skipBranchIsolation: true };
const MISSING = { $or: [{ storeId: { $exists: false } }, { storeId: null }] };

const id = (value) => {
  if (!value) return "";
  if (value?._id) return String(value._id).trim();
  return String(value).trim();
};
const key = (value) => String(value || "").trim().toUpperCase();
const whFromLocation = (locationCode) => {
  const p = key(locationCode).split("-");
  return p[0] === "WH" && p[1] ? `${p[0]}-${p[1]}` : "";
};
const storeCodeFromDocNo = (value, prefix) => {
  const p = key(value).split("-");
  return p[0] === prefix && p[1] ? p[1] : "";
};

const arg = (args, name) => {
  const p = `${name}=`;
  const inline = args.find((x) => x.startsWith(p));
  if (inline) return inline.slice(p.length).trim();
  const idx = args.findIndex((x) => x === name);
  return idx >= 0 && args[idx + 1] ? String(args[idx + 1]).trim() : "";
};

const loadMap = (mapFile) => {
  if (!mapFile) return { path: "", data: {} };
  const abs = path.isAbsolute(mapFile) ? mapFile : path.resolve(process.cwd(), mapFile);
  if (!fs.existsSync(abs)) throw new Error(`Map file not found: ${abs}`);
  return { path: abs, data: JSON.parse(fs.readFileSync(abs, "utf-8")) };
};

const mapOf = (data, collection) => data?.collections?.[collection] || data?.[collection] || {};

const resolveFromMap = ({ data, collection, doc, exact = [], prefixes = [], stores }) => {
  const c = mapOf(data, collection);
  const g = data?.global || {};
  const findExact = (obj, value) => {
    const k = key(value);
    if (!obj || !k) return "";
    for (const [x, v] of Object.entries(obj)) if (key(x) === k) return v;
    return "";
  };
  const findPrefix = (obj, value) => {
    const k = key(value);
    if (!obj || !k) return "";
    let hit = "";
    let len = -1;
    for (const [x, v] of Object.entries(obj)) {
      const px = key(x);
      if (px && k.startsWith(px) && px.length > len) {
        hit = v;
        len = px.length;
      }
    }
    return hit;
  };
  const resolveStore = (ref) => {
    const r = String(ref || "").trim();
    if (!r) return "";
    const byId = stores.byId.get(r.toLowerCase());
    if (byId) return byId._id;
    const byCode = stores.byCode.get(key(r));
    return byCode ? byCode._id : "";
  };

  const byIdRef = findExact(c.byId, id(doc._id)) || findExact(g.byId, id(doc._id));
  const byIdStore = resolveStore(byIdRef);
  if (byIdStore) return { storeId: byIdStore, source: "map:byId" };

  const mapKeysFor = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return [];
    const pascal = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
    const keys = [`by${trimmed}`, `by${pascal}`];
    if (trimmed === "warehouse") {
      keys.push("bywarehouseCode", "byWarehouseCode");
    }
    if (trimmed === "warehouseCode") {
      keys.push("bywarehouse", "byWarehouse");
    }
    return [...new Set(keys)];
  };

  for (const name of exact) {
    const value = doc?.[name];
    for (const mapKey of mapKeysFor(name)) {
      const ref = findExact(c[mapKey], value) || findExact(g[mapKey], value);
      const storeId = resolveStore(ref);
      if (storeId) return { storeId, source: `map:${mapKey}` };
    }
  }
  for (const name of prefixes) {
    const value = doc?.[name];
    const keys = mapKeysFor(name).map((mapKey) => `${mapKey}Prefix`);
    for (const mapKey of keys) {
      const ref = findPrefix(c[mapKey], value) || findPrefix(g[mapKey], value);
      const storeId = resolveStore(ref);
      if (storeId) return { storeId, source: `map:${mapKey}` };
    }
  }
  return { storeId: "", source: "" };
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;
  if (apply && args.includes("--dry-run")) throw new Error("Use either --dry-run or --apply");
  const mapFile = arg(args, "--map-file");
  if (apply && !mapFile) throw new Error("--map-file is required when --apply is used");
  return {
    apply,
    dryRun,
    mapFile,
    output: arg(args, "--output"),
    skipStockMovement: args.includes("--skip-stock-movement"),
  };
};

const reportPath = (custom = "") => {
  if (custom) return path.isAbsolute(custom) ? custom : path.resolve(process.cwd(), custom);
  const dir = path.join(__dirname, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `warehouse-store-id-migration-${ts}.json`);
};

const writeReport = (report, outputPath) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");
};

const summarizePlans = (plans) => {
  const result = {};
  for (const [name, info] of Object.entries(plans)) {
    const sources = {};
    for (const item of info.updates || []) {
      const source = item.source || "fallback";
      sources[source] = (sources[source] || 0) + 1;
    }
    result[name] = {
      docs: info.docs || 0,
      plannedUpdates: info.updates?.length || 0,
      unresolved: info.unresolved || 0,
      skipped: Boolean(info.skipped),
      applied: info.applied || 0,
      sources,
    };
  }
  return result;
};

const run = async () => {
  const opts = parseArgs();
  const map = loadMap(opts.mapFile);
  await connectDB();

  const storesRaw = await Store.find({}).select("_id code").lean();
  const stores = {
    byId: new Map(),
    byCode: new Map(),
  };
  for (const s of storesRaw) {
    stores.byId.set(id(s._id).toLowerCase(), s);
    stores.byCode.set(key(s.code), s);
  }

  const userCache = new Map();
  const userStore = async (userId) => {
    const userIdKey = id(userId);
    if (!userIdKey || !mongoose.Types.ObjectId.isValid(userIdKey)) return "";
    if (userCache.has(userIdKey)) return userCache.get(userIdKey);
    const user = await User.findById(userIdKey)
      .select("storeLocation branchAssignments")
      .lean();
    const active = (user?.branchAssignments || []).find(
      (x) => String(x?.status || "ACTIVE").toUpperCase() === "ACTIVE"
    );
    const ref = id(active?.storeId) || id(user?.storeLocation);
    const resolved =
      (stores.byId.get(ref.toLowerCase())?._id || stores.byCode.get(key(ref))?._id || "");
    userCache.set(userIdKey, resolved);
    return resolved;
  };

  const whByCode = new Map();
  const locationById = new Map();
  const locationByCode = new Map();
  const poById = new Map();
  const poByNo = new Map();
  const countByNo = new Map();

  const preSeed = async () => {
    const [wh, loc, po, cc] = await Promise.all([
      WarehouseConfiguration.find({ storeId: { $exists: true, $ne: null } })
        .setOptions(SKIP_BRANCH)
        .select("storeId warehouseCode")
        .lean(),
      WarehouseLocation.find({ storeId: { $exists: true, $ne: null } })
        .setOptions(SKIP_BRANCH)
        .select("_id storeId locationCode warehouse")
        .lean(),
      PurchaseOrder.find({ storeId: { $exists: true, $ne: null } })
        .setOptions(SKIP_BRANCH)
        .select("_id storeId poNumber")
        .lean(),
      CycleCount.find({ storeId: { $exists: true, $ne: null } })
        .setOptions(SKIP_BRANCH)
        .select("storeId countNumber")
        .lean(),
    ]);
    for (const x of wh) whByCode.set(key(x.warehouseCode), id(x.storeId));
    for (const x of loc) {
      locationById.set(id(x._id), id(x.storeId));
      locationByCode.set(key(x.locationCode), id(x.storeId));
      if (!whByCode.has(key(x.warehouse))) whByCode.set(key(x.warehouse), id(x.storeId));
    }
    for (const x of po) {
      poById.set(id(x._id), id(x.storeId));
      poByNo.set(key(x.poNumber), id(x.storeId));
    }
    for (const x of cc) countByNo.set(key(x.countNumber), id(x.storeId));
  };
  await preSeed();

  const unresolved = [];
  const plans = {};

  const plan = async (name, model, query, select, resolve) => {
    const docs = await model.find(query).setOptions(SKIP_BRANCH).select(select).lean();
    const updates = [];
    for (const doc of docs) {
      const out = await resolve(doc);
      if (!out.storeId) {
        unresolved.push({ collection: name, id: id(doc._id), reason: "STORE_NOT_RESOLVED", doc });
        continue;
      }
      updates.push({ id: id(doc._id), storeId: out.storeId, source: out.source || "fallback" });
    }
    plans[name] = {
      docs: docs.length,
      rawDocs: docs,
      updates,
      unresolved: docs.length - updates.length,
    };
  };

  await plan(
    "WarehouseConfiguration",
    WarehouseConfiguration,
    MISSING,
    "_id warehouseCode createdBy",
    async (doc) => {
      const fromMap = resolveFromMap({
        data: map.data,
        collection: "WarehouseConfiguration",
        doc,
        exact: ["warehouseCode"],
        prefixes: ["warehouseCode"],
        stores,
      });
      if (fromMap.storeId) return fromMap;
      const fromCode = stores.byCode.get(key(doc.warehouseCode))?._id || "";
      if (fromCode) return { storeId: fromCode, source: "fallback:warehouseCode" };
      const fromUser = await userStore(doc.createdBy);
      return fromUser ? { storeId: fromUser, source: "fallback:createdBy" } : { storeId: "" };
    }
  );
  {
    const byId = new Map(
      (plans.WarehouseConfiguration.rawDocs || []).map((doc) => [id(doc._id), doc])
    );
    for (const u of plans.WarehouseConfiguration.updates) {
      const doc = byId.get(u.id);
      if (doc?.warehouseCode) {
        whByCode.set(key(doc.warehouseCode), u.storeId);
      }
    }
  }

  await plan(
    "WarehouseLocation",
    WarehouseLocation,
    MISSING,
    "_id locationCode warehouse",
    async (doc) => {
      const fromMap = resolveFromMap({
        data: map.data,
        collection: "WarehouseLocation",
        doc,
        exact: ["locationCode", "warehouse"],
        prefixes: ["locationCode"],
        stores,
      });
      if (fromMap.storeId) return fromMap;
      const wh = key(doc.warehouse) || whFromLocation(doc.locationCode);
      const byWh = whByCode.get(wh) || stores.byCode.get(wh)?._id || "";
      return byWh ? { storeId: byWh, source: "fallback:warehouse" } : { storeId: "" };
    }
  );
  {
    const byId = new Map((plans.WarehouseLocation.rawDocs || []).map((doc) => [id(doc._id), doc]));
    for (const u of plans.WarehouseLocation.updates) {
      const doc = byId.get(u.id);
      locationById.set(u.id, u.storeId);
      if (doc?.locationCode) {
        locationByCode.set(key(doc.locationCode), u.storeId);
      }
      const wh = key(doc?.warehouse) || whFromLocation(doc?.locationCode);
      if (wh && !whByCode.has(wh)) {
        whByCode.set(wh, u.storeId);
      }
    }
  }

  await plan("Inventory", Inventory, MISSING, "_id sku locationId locationCode", async (doc) => {
    const fromMap = resolveFromMap({
      data: map.data,
      collection: "Inventory",
      doc,
      exact: ["locationCode", "sku"],
      prefixes: ["locationCode"],
      stores,
    });
    if (fromMap.storeId) return fromMap;
    const byLocation =
      locationById.get(id(doc.locationId)) ||
      locationByCode.get(key(doc.locationCode)) ||
      whByCode.get(whFromLocation(doc.locationCode)) ||
      "";
    return byLocation ? { storeId: byLocation, source: "fallback:location" } : { storeId: "" };
  });

  await plan("PurchaseOrder", PurchaseOrder, MISSING, "_id poNumber createdBy", async (doc) => {
    const fromMap = resolveFromMap({
      data: map.data,
      collection: "PurchaseOrder",
      doc,
      exact: ["poNumber"],
      prefixes: ["poNumber"],
      stores,
    });
    if (fromMap.storeId) return fromMap;
    const fromNo = stores.byCode.get(storeCodeFromDocNo(doc.poNumber, "PO"))?._id || "";
    if (fromNo) return { storeId: fromNo, source: "fallback:poNumber" };
    const fromUser = await userStore(doc.createdBy);
    return fromUser ? { storeId: fromUser, source: "fallback:createdBy" } : { storeId: "" };
  });
  {
    const byId = new Map((plans.PurchaseOrder.rawDocs || []).map((doc) => [id(doc._id), doc]));
    for (const u of plans.PurchaseOrder.updates) {
      const doc = byId.get(u.id);
      poById.set(u.id, u.storeId);
      if (doc?.poNumber) {
        poByNo.set(key(doc.poNumber), u.storeId);
      }
    }
  }

  await plan(
    "GoodsReceipt",
    GoodsReceipt,
    MISSING,
    "_id grnNumber poNumber purchaseOrderId receivedBy",
    async (doc) => {
      const fromMap = resolveFromMap({
        data: map.data,
        collection: "GoodsReceipt",
        doc,
        exact: ["grnNumber", "poNumber"],
        prefixes: ["grnNumber", "poNumber"],
        stores,
      });
      if (fromMap.storeId) return fromMap;
      const fromPo = poById.get(id(doc.purchaseOrderId)) || poByNo.get(key(doc.poNumber)) || "";
      if (fromPo) return { storeId: fromPo, source: "fallback:poLink" };
      const fromNo = stores.byCode.get(storeCodeFromDocNo(doc.grnNumber, "GRN"))?._id || "";
      if (fromNo) return { storeId: fromNo, source: "fallback:grnNumber" };
      const fromUser = await userStore(doc.receivedBy);
      return fromUser ? { storeId: fromUser, source: "fallback:receivedBy" } : { storeId: "" };
    }
  );

  await plan("CycleCount", CycleCount, MISSING, "_id countNumber scope createdBy", async (doc) => {
    const fromMap = resolveFromMap({
      data: map.data,
      collection: "CycleCount",
      doc: {
        ...doc,
        warehouseCode: doc?.scope?.warehouse || "",
      },
      exact: ["countNumber", "warehouseCode"],
      prefixes: ["countNumber"],
      stores,
    });
    if (fromMap.storeId) return fromMap;
    const fromScope = whByCode.get(key(doc?.scope?.warehouse)) || "";
    if (fromScope) return { storeId: fromScope, source: "fallback:scopeWarehouse" };
    const fromNo = stores.byCode.get(storeCodeFromDocNo(doc.countNumber, "CC"))?._id || "";
    if (fromNo) return { storeId: fromNo, source: "fallback:countNumber" };
    const fromUser = await userStore(doc.createdBy);
    return fromUser ? { storeId: fromUser, source: "fallback:createdBy" } : { storeId: "" };
  });
  {
    const byId = new Map((plans.CycleCount.rawDocs || []).map((doc) => [id(doc._id), doc]));
    for (const u of plans.CycleCount.updates) {
      const doc = byId.get(u.id);
      if (doc?.countNumber) {
        countByNo.set(key(doc.countNumber), u.storeId);
      }
    }
  }

  if (!opts.skipStockMovement) {
    const docs = await StockMovement.find(MISSING)
      .select("_id referenceType referenceId fromLocationId fromLocationCode toLocationId toLocationCode performedBy")
      .lean();
    const updates = [];
    for (const doc of docs) {
      const fromMap = resolveFromMap({
        data: map.data,
        collection: "StockMovement",
        doc,
        exact: ["referenceId"],
        prefixes: ["referenceId"],
        stores,
      });
      let storeId = fromMap.storeId;
      if (!storeId)
        storeId =
          locationById.get(id(doc.fromLocationId)) ||
          locationById.get(id(doc.toLocationId)) ||
          locationByCode.get(key(doc.fromLocationCode)) ||
          locationByCode.get(key(doc.toLocationCode)) ||
          "";
      if (!storeId && key(doc.referenceType) === "PO") storeId = poByNo.get(key(doc.referenceId)) || "";
      if (!storeId && key(doc.referenceType) === "CYCLE_COUNT")
        storeId = countByNo.get(key(doc.referenceId)) || "";
      if (!storeId) storeId = await userStore(doc.performedBy);
      if (!storeId) {
        unresolved.push({ collection: "StockMovement", id: id(doc._id), reason: "STORE_NOT_RESOLVED", doc });
        continue;
      }
      updates.push({ id: id(doc._id), storeId, source: fromMap.source || "fallback" });
    }
    plans.StockMovement = { docs: docs.length, updates, unresolved: docs.length - updates.length };
  } else {
    plans.StockMovement = { docs: 0, updates: [], unresolved: 0, skipped: true };
  }

  if (opts.apply && unresolved.length > 0) {
    const report = {
      mode: "apply",
      mapFile: map.path,
      plans: summarizePlans(plans),
      unresolvedCount: unresolved.length,
      unresolved,
      applied: 0,
    };
    const out = reportPath(opts.output);
    writeReport(report, out);
    throw new Error(`Apply aborted due to unresolved records. Report: ${out}`);
  }

  const modelByName = {
    WarehouseConfiguration,
    WarehouseLocation,
    Inventory,
    PurchaseOrder,
    GoodsReceipt,
    CycleCount,
    StockMovement,
  };

  let applied = 0;
  if (opts.apply) {
    for (const [name, info] of Object.entries(plans)) {
      if (!info.updates.length) continue;
      const ops = info.updates.map((u) => ({
        updateOne: { filter: { _id: u.id }, update: { $set: { storeId: u.storeId } } },
      }));
      const result = await modelByName[name].bulkWrite(ops, { ordered: false });
      info.applied = result.modifiedCount || 0;
      applied += info.applied;
    }
  }

  const report = {
    mode: opts.apply ? "apply" : "dry-run",
    mapFile: map.path,
    plans: summarizePlans(plans),
    unresolvedCount: unresolved.length,
    unresolved,
    applied,
  };
  const out = reportPath(opts.output);
  writeReport(report, out);
  console.log(`[migrate:warehouse-store-ids] Report: ${out}`);
  console.log(`[migrate:warehouse-store-ids] unresolved=${unresolved.length}, applied=${applied}`);
};

run()
  .catch((error) => {
    console.error(`[migrate:warehouse-store-ids] Failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
