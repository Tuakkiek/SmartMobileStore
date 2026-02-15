import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const LOG = "[SYNC][LEGACY]";
const FILES = [
  "users.json",
  "brands.json",
  "producttypes.json",
  "universalproducts.json",
  "orders.json",
];

const USER_ROLES = [
  "USER",
  "CUSTOMER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "SHIPPER",
  "POS_STAFF",
  "CASHIER",
  "ADMIN",
];
const USER_STATUSES = ["ACTIVE", "LOCKED"];
const ACTIVE_INACTIVE = ["ACTIVE", "INACTIVE"];
const PRODUCT_CONDITIONS = ["NEW", "LIKE_NEW", "USED"];
const PRODUCT_STATUSES = ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"];
const INSTALLMENT_BADGES = ["NONE", "Tra gop 0%", "Tra gop 0%, tra truoc 0d"];
const SPEC_TYPES = ["text", "number", "select", "textarea"];
const ORDER_STATUSES = [
  "PENDING",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PAYMENT_VERIFIED",
  "PAYMENT_FAILED",
  "CONFIRMED",
  "PROCESSING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PREPARING_SHIPMENT",
  "SHIPPING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PICKED_UP",
  "COMPLETED",
  "DELIVERY_FAILED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
];
const PAYMENT_STATUSES = ["PENDING", "UNPAID", "PAID", "FAILED", "REFUNDED"];
const PAYMENT_METHODS = [
  "COD",
  "BANK_TRANSFER",
  "MOMO",
  "VNPAY",
  "CREDIT_CARD",
  "CASH",
  "INSTALLMENT",
];
const ORDER_STAGE_MAP = {
  PENDING: "PENDING",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_CONFIRMED: "PENDING",
  PAYMENT_VERIFIED: "PENDING",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PICKING",
  PREPARING: "PICKING",
  READY_FOR_PICKUP: "PICKUP_COMPLETED",
  PREPARING_SHIPMENT: "PICKUP_COMPLETED",
  SHIPPING: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  PICKED_UP: "DELIVERED",
  COMPLETED: "DELIVERED",
  DELIVERY_FAILED: "CANCELLED",
  CANCELLED: "CANCELLED",
  RETURN_REQUESTED: "RETURNED",
  RETURNED: "RETURNED",
};

const FIRST = ["Alex", "Jamie", "Taylor", "Morgan", "Jordan", "Casey", "Riley"];
const LAST = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo", "Dang"];
const PROVINCES = ["Ho Chi Minh", "Ha Noi", "Da Nang", "Can Tho", "Hai Phong"];
const DISTRICTS = ["District 1", "District 3", "District 7", "Binh Thanh", "Ninh Kieu"];
const WARDS = ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"];
const PRODUCT_NAMES = [
  "iPhone 17",
  "iPhone 17 Pro",
  "iPad Air",
  "MacBook Pro",
  "Apple Watch",
  "AirPods Pro",
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list, fallback = null) =>
  Array.isArray(list) && list.length ? list[randInt(0, list.length - 1)] : fallback;
const hex = (len) =>
  Array.from({ length: len }, () => pick("0123456789abcdef".split(""), "0")).join("");
const objectId = () => hex(24);
const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const blank = (v) => typeof v !== "string" || !v.trim();
const phone = () => `0${randInt(100000000, 999999999)}`;
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;
const province = () => pick(PROVINCES, "Ho Chi Minh");
const district = () => pick(DISTRICTS, "District 1");
const ward = () => pick(WARDS, "Ward 1");
const nowMinusIso = (days = 365) =>
  new Date(Date.now() - randInt(0, days * 24 * 60 * 60 * 1000)).toISOString();
const asNum = (v, fallback = 0, min = null) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (typeof min === "number" && n < min) return fallback;
  return n;
};
const slugify = (v, fallback = "item") => {
  const s = String(v || `${fallback}-${randInt(100, 999)}`)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || `${fallback}-${randInt(100, 999)}`;
};
const pickRef = (pool) => (Array.isArray(pool) && pool.length ? pick(pool) : objectId());

const parseArgs = () => {
  const args = process.argv.slice(2);
  const val = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };
  return {
    input: val("--input"),
    output: val("--output"),
    inPlace: args.includes("--in-place"),
    dryRun: args.includes("--dry-run"),
  };
};

const mkState = () => ({ scanned: 0, changed: 0, fixes: {} });
const fix = (state, key) => {
  state.fixes[key] = (state.fixes[key] || 0) + 1;
};
const stageOf = (status) => ORDER_STAGE_MAP[status] || "PENDING";

const syncUsers = async (rows, refs, state) => {
  for (const row of rows) {
    state.scanned += 1;
    let changed = false;
    if (!USER_ROLES.includes(row.role)) {
      row.role = pick(USER_ROLES, "USER");
      fix(state, "role");
      changed = true;
    }
    if (blank(row.fullName)) {
      row.fullName = fullName();
      fix(state, "fullName");
      changed = true;
    }
    if (!/^0\d{9}$/.test(String(row.phoneNumber || ""))) {
      row.phoneNumber = phone();
      fix(state, "phoneNumber");
      changed = true;
    }
    if (blank(row.province)) {
      row.province = province();
      fix(state, "province");
      changed = true;
    }
    if (blank(row.password) || String(row.password).length < 20) {
      row.password = await bcrypt.hash(`Aa!${hex(8)}${randInt(10, 99)}`, 10);
      fix(state, "password");
      changed = true;
    }
    if (!USER_STATUSES.includes(row.status)) {
      row.status = "ACTIVE";
      fix(state, "status");
      changed = true;
    }
    if (!Array.isArray(row.addresses)) {
      row.addresses = [];
      fix(state, "addresses");
      changed = true;
    }
    if (!row.addresses.length) {
      row.addresses.push({
        fullName: row.fullName,
        phoneNumber: row.phoneNumber,
        province: row.province,
        ward: ward(),
        detailAddress: `${randInt(1, 200)} Street ${randInt(1, 30)}`,
        isDefault: true,
      });
      fix(state, "addresses[0]");
      changed = true;
    }
    if (!isObjectId(row._id)) {
      row._id = objectId();
      fix(state, "_id");
      changed = true;
    }
    if (!row.createdAt) {
      row.createdAt = nowMinusIso(365);
      fix(state, "createdAt");
      changed = true;
    }
    if (!row.updatedAt) {
      row.updatedAt = row.createdAt;
      fix(state, "updatedAt");
      changed = true;
    }
    if (changed) state.changed += 1;
  }
  refs.userIds = rows.map((r) => r._id).filter(isObjectId);
};

const syncBrands = (rows, refs, state) => {
  for (const row of rows) {
    state.scanned += 1;
    let changed = false;
    if (blank(row.name)) {
      row.name = `Brand ${randInt(100, 999)}`;
      fix(state, "name");
      changed = true;
    }
    if (blank(row.slug)) {
      row.slug = slugify(row.name, "brand");
      fix(state, "slug");
      changed = true;
    }
    if (typeof row.logo !== "string") {
      row.logo = "";
      fix(state, "logo");
      changed = true;
    }
    if (typeof row.description !== "string") {
      row.description = "";
      fix(state, "description");
      changed = true;
    }
    if (typeof row.website !== "string") {
      row.website = "";
      fix(state, "website");
      changed = true;
    }
    if (!ACTIVE_INACTIVE.includes(row.status)) {
      row.status = "ACTIVE";
      fix(state, "status");
      changed = true;
    }
    if (!isObjectId(row.createdBy)) {
      row.createdBy = pickRef(refs.userIds);
      fix(state, "createdBy");
      changed = true;
    }
    if (!isObjectId(row._id)) {
      row._id = objectId();
      fix(state, "_id");
      changed = true;
    }
    if (!row.createdAt) {
      row.createdAt = nowMinusIso(365);
      fix(state, "createdAt");
      changed = true;
    }
    if (!row.updatedAt) {
      row.updatedAt = row.createdAt;
      fix(state, "updatedAt");
      changed = true;
    }
    if (changed) state.changed += 1;
  }
  refs.brandIds = rows.map((r) => r._id).filter(isObjectId);
};

const syncProductTypes = (rows, refs, state) => {
  for (const row of rows) {
    state.scanned += 1;
    let changed = false;
    if (blank(row.name)) {
      row.name = `Product Type ${randInt(100, 999)}`;
      fix(state, "name");
      changed = true;
    }
    if (blank(row.slug)) {
      row.slug = slugify(row.name, "product-type");
      fix(state, "slug");
      changed = true;
    }
    if (typeof row.description !== "string") {
      row.description = "";
      fix(state, "description");
      changed = true;
    }
    if (typeof row.icon !== "string") {
      row.icon = "";
      fix(state, "icon");
      changed = true;
    }
    if (!Array.isArray(row.specFields)) {
      row.specFields = [];
      fix(state, "specFields");
      changed = true;
    }
    row.specFields = row.specFields.map((f, i) => {
      const field = f && typeof f === "object" ? { ...f } : {};
      let local = false;
      if (blank(field.key)) {
        field.key = `field_${i + 1}_${randInt(10, 99)}`;
        local = true;
      }
      if (blank(field.label)) {
        field.label = `Field ${i + 1}`;
        local = true;
      }
      if (!SPEC_TYPES.includes(field.type)) {
        field.type = pick(SPEC_TYPES, "text");
        local = true;
      }
      if (typeof field.required !== "boolean") {
        field.required = Math.random() > 0.5;
        local = true;
      }
      if (!Array.isArray(field.options)) {
        field.options = [];
        local = true;
      }
      if (field.type === "select" && field.options.length === 0) {
        field.options = ["Option A", "Option B", "Option C"];
        local = true;
      }
      if (typeof field.placeholder !== "string") {
        field.placeholder = "";
        local = true;
      }
      if (local) {
        fix(state, "specFields[*]");
        changed = true;
      }
      return field;
    });
    if (!ACTIVE_INACTIVE.includes(row.status)) {
      row.status = "ACTIVE";
      fix(state, "status");
      changed = true;
    }
    if (!isObjectId(row.createdBy)) {
      row.createdBy = pickRef(refs.userIds);
      fix(state, "createdBy");
      changed = true;
    }
    if (!isObjectId(row._id)) {
      row._id = objectId();
      fix(state, "_id");
      changed = true;
    }
    if (!row.createdAt) {
      row.createdAt = nowMinusIso(365);
      fix(state, "createdAt");
      changed = true;
    }
    if (!row.updatedAt) {
      row.updatedAt = row.createdAt;
      fix(state, "updatedAt");
      changed = true;
    }
    if (changed) state.changed += 1;
  }
  refs.productTypeIds = rows.map((r) => r._id).filter(isObjectId);
};

const syncUniversalProducts = (rows, refs, state) => {
  for (const row of rows) {
    state.scanned += 1;
    let changed = false;
    if (blank(row.name)) {
      row.name = pick(PRODUCT_NAMES, "Unknown Product");
      fix(state, "name");
      changed = true;
    }
    if (blank(row.model)) {
      row.model = `${slugify(row.name, "model")}-${randInt(10, 99)}`;
      fix(state, "model");
      changed = true;
    }
    if (blank(row.baseSlug)) {
      row.baseSlug = slugify(row.name, "product");
      fix(state, "baseSlug");
      changed = true;
    }
    if (blank(row.slug)) {
      row.slug = row.baseSlug;
      fix(state, "slug");
      changed = true;
    }
    if (typeof row.description !== "string") {
      row.description = "";
      fix(state, "description");
      changed = true;
    }
    if (!Array.isArray(row.featuredImages)) {
      row.featuredImages = [];
      fix(state, "featuredImages");
      changed = true;
    }
    if (!row.featuredImages.length) {
      row.featuredImages = [`https://example.com/products/${slugify(row.name)}-${randInt(1, 999)}.png`];
      fix(state, "featuredImages[0]");
      changed = true;
    }
    if (typeof row.videoUrl !== "string") {
      row.videoUrl = "";
      fix(state, "videoUrl");
      changed = true;
    }
    if (!isObjectId(row.brand)) {
      row.brand = pickRef(refs.brandIds);
      fix(state, "brand");
      changed = true;
    }
    if (!isObjectId(row.productType)) {
      row.productType = pickRef(refs.productTypeIds);
      fix(state, "productType");
      changed = true;
    }
    if (!row.specifications || typeof row.specifications !== "object") {
      row.specifications = { color: pick(["Black", "White", "Blue"]), warranty: `${randInt(6, 24)} months` };
      fix(state, "specifications");
      changed = true;
    }
    if (!Array.isArray(row.variants)) {
      row.variants = [];
      fix(state, "variants");
      changed = true;
    }
    if (!PRODUCT_CONDITIONS.includes(row.condition)) {
      row.condition = pick(PRODUCT_CONDITIONS, "NEW");
      fix(state, "condition");
      changed = true;
    }
    if (!PRODUCT_STATUSES.includes(row.status)) {
      row.status = pick(PRODUCT_STATUSES, "AVAILABLE");
      fix(state, "status");
      changed = true;
    }
    if (!INSTALLMENT_BADGES.includes(row.installmentBadge)) {
      row.installmentBadge = pick(INSTALLMENT_BADGES, "NONE");
      fix(state, "installmentBadge");
      changed = true;
    }
    if (!isObjectId(row.createdBy)) {
      row.createdBy = pickRef(refs.userIds);
      fix(state, "createdBy");
      changed = true;
    }
    row.averageRating = asNum(row.averageRating, randInt(35, 50) / 10, 0);
    row.totalReviews = asNum(row.totalReviews, randInt(0, 300), 0);
    row.salesCount = asNum(row.salesCount, randInt(0, 1000), 0);
    if (!isObjectId(row._id)) {
      row._id = objectId();
      fix(state, "_id");
      changed = true;
    }
    if (!row.createdAt) {
      row.createdAt = nowMinusIso(365);
      fix(state, "createdAt");
      changed = true;
    }
    if (!row.updatedAt) {
      row.updatedAt = row.createdAt;
      fix(state, "updatedAt");
      changed = true;
    }
    if (changed) state.changed += 1;
  }
  refs.productIds = rows.map((r) => r._id).filter(isObjectId);
  refs.variantIds = rows.flatMap((r) => (Array.isArray(r.variants) ? r.variants : [])).filter(isObjectId);
};

const syncOrders = (rows, refs, state) => {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    state.scanned += 1;
    let changed = false;
    if (!isObjectId(row.customerId) && isObjectId(row.userId)) {
      row.customerId = row.userId;
      fix(state, "customerId");
      changed = true;
    }
    if (!isObjectId(row.userId) && isObjectId(row.customerId)) {
      row.userId = row.customerId;
      fix(state, "userId");
      changed = true;
    }
    if (!isObjectId(row.userId) && !isObjectId(row.customerId)) {
      const id = pickRef(refs.userIds);
      row.userId = id;
      row.customerId = id;
      fix(state, "userId");
      fix(state, "customerId");
      changed = true;
    }
    if (!ORDER_STATUSES.includes(row.status)) {
      row.status = pick(ORDER_STATUSES, "PENDING");
      fix(state, "status");
      changed = true;
    }
    if (!row.createdAt) {
      row.createdAt = nowMinusIso(120);
      fix(state, "createdAt");
      changed = true;
    }
    if (!row.updatedAt) {
      row.updatedAt = row.createdAt;
      fix(state, "updatedAt");
      changed = true;
    }
    if (blank(row.orderNumber)) {
      const d = new Date(row.createdAt);
      row.orderNumber = `ORD${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(i + 1).padStart(4, "0")}`;
      fix(state, "orderNumber");
      changed = true;
    }
    if (!["ONLINE", "IN_STORE"].includes(row.orderSource)) {
      row.orderSource = pick(["ONLINE", "IN_STORE"], "ONLINE");
      fix(state, "orderSource");
      changed = true;
    }
    if (!["HOME_DELIVERY", "CLICK_AND_COLLECT", "IN_STORE"].includes(row.fulfillmentType)) {
      row.fulfillmentType = row.orderSource === "IN_STORE" ? "IN_STORE" : pick(["HOME_DELIVERY", "CLICK_AND_COLLECT"], "HOME_DELIVERY");
      fix(state, "fulfillmentType");
      changed = true;
    }
    if (!Array.isArray(row.items) || !row.items.length) {
      row.items = [{ quantity: 1, price: randInt(100, 3000), productName: pick(PRODUCT_NAMES), variantSku: String(randInt(1, 99999999)).padStart(8, "0") }];
      fix(state, "items");
      changed = true;
    }
    row.items = row.items.map((item) => {
      const it = item && typeof item === "object" ? { ...item } : {};
      if (!isObjectId(it.productId)) {
        it.productId = pickRef(refs.productIds);
        fix(state, "items[*].productId");
        changed = true;
      }
      if (!isObjectId(it.variantId)) {
        it.variantId = pickRef(refs.variantIds);
        fix(state, "items[*].variantId");
        changed = true;
      }
      if (blank(it.variantSku)) {
        it.variantSku = String(randInt(1, 99999999)).padStart(8, "0");
        fix(state, "items[*].variantSku");
        changed = true;
      }
      if (blank(it.productName) && blank(it.name)) {
        const n = pick(PRODUCT_NAMES, "Unknown Product");
        it.productName = n;
        it.name = n;
        fix(state, "items[*].name");
        changed = true;
      } else if (blank(it.productName)) {
        it.productName = it.name;
        fix(state, "items[*].productName");
        changed = true;
      } else if (blank(it.name)) {
        it.name = it.productName;
        fix(state, "items[*].name");
        changed = true;
      }
      if (!Array.isArray(it.images) || !it.images.length) {
        it.images = [`https://example.com/images/${slugify(it.productName || it.name)}-${randInt(1, 999)}.png`];
        fix(state, "items[*].images");
        changed = true;
      }
      it.price = asNum(it.price, randInt(100, 5000), 0);
      it.quantity = asNum(it.quantity, randInt(1, 3), 1);
      it.originalPrice = asNum(it.originalPrice, it.price, 0);
      it.subtotal = it.price * it.quantity;
      it.total = it.subtotal;
      return it;
    });
    if (!row.shippingAddress || typeof row.shippingAddress !== "object") {
      row.shippingAddress = {};
      fix(state, "shippingAddress");
      changed = true;
    }
    if (blank(row.shippingAddress.fullName)) {
      row.shippingAddress.fullName = fullName();
      fix(state, "shippingAddress.fullName");
      changed = true;
    }
    if (!/^0\d{9}$/.test(String(row.shippingAddress.phoneNumber || ""))) {
      row.shippingAddress.phoneNumber = phone();
      fix(state, "shippingAddress.phoneNumber");
      changed = true;
    }
    if (blank(row.shippingAddress.province)) {
      row.shippingAddress.province = province();
      fix(state, "shippingAddress.province");
      changed = true;
    }
    if (blank(row.shippingAddress.district)) {
      row.shippingAddress.district = district();
      fix(state, "shippingAddress.district");
      changed = true;
    }
    if (blank(row.shippingAddress.ward)) {
      row.shippingAddress.ward = ward();
      fix(state, "shippingAddress.ward");
      changed = true;
    }
    if (blank(row.shippingAddress.detailAddress)) {
      row.shippingAddress.detailAddress = `${randInt(1, 200)} Street ${randInt(1, 30)}`;
      fix(state, "shippingAddress.detailAddress");
      changed = true;
    }
    if (!PAYMENT_METHODS.includes(row.paymentMethod)) {
      row.paymentMethod = pick(PAYMENT_METHODS, "COD");
      fix(state, "paymentMethod");
      changed = true;
    }
    if (!PAYMENT_STATUSES.includes(row.paymentStatus)) {
      row.paymentStatus = pick(PAYMENT_STATUSES, "PENDING");
      fix(state, "paymentStatus");
      changed = true;
    }
    row.subtotal = row.items.reduce((s, it) => s + it.price * it.quantity, 0);
    row.shippingFee = asNum(row.shippingFee, randInt(0, 60000), 0);
    row.discount = asNum(row.discount, randInt(0, 10000), 0);
    row.promotionDiscount = asNum(row.promotionDiscount, 0, 0);
    row.pointsUsed = asNum(row.pointsUsed, 0, 0);
    const total = Math.max(0, row.subtotal + row.shippingFee - row.discount - row.promotionDiscount);
    row.total = total;
    row.totalAmount = total;
    if (!row.paymentInfo || typeof row.paymentInfo !== "object") {
      row.paymentInfo = {};
      fix(state, "paymentInfo");
      changed = true;
    }
    if (!Array.isArray(row.statusHistory) || !row.statusHistory.length) {
      row.statusHistory = [{ status: row.status, updatedBy: row.customerId || row.userId, updatedAt: row.createdAt, note: "Backfilled status history" }];
      fix(state, "statusHistory");
      changed = true;
    }
    if (blank(row.statusStage)) {
      row.statusStage = stageOf(row.status);
      fix(state, "statusStage");
      changed = true;
    }
    if (!Array.isArray(row.statusStageHistory) || !row.statusStageHistory.length) {
      row.statusStageHistory = [{ stage: row.statusStage, updatedBy: row.customerId || row.userId, updatedAt: row.updatedAt, note: "Backfilled stage history" }];
      fix(state, "statusStageHistory");
      changed = true;
    }
    if (typeof row.appliedPromotion === "undefined") {
      row.appliedPromotion = Math.random() > 0.7 ? { code: `PROMO${randInt(10, 99)}`, discountAmount: randInt(10, 200) } : null;
      fix(state, "appliedPromotion");
      changed = true;
    }
    if (changed) state.changed += 1;
  }
};

const readJsonArray = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

const latestBackupDir = async (root) => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (!dirs.length) {
    throw new Error(`No backup directories found in ${root}`);
  }
  const withStats = await Promise.all(
    dirs.map(async (d) => {
      const full = path.join(root, d.name);
      const stat = await fs.stat(full);
      return { full, mtime: stat.mtimeMs };
    })
  );
  withStats.sort((a, b) => b.mtime - a.mtime);
  return withStats[0].full;
};

const ensureDir = async (desiredPath) => {
  let finalPath = desiredPath;
  try {
    await fs.access(finalPath);
    finalPath = `${desiredPath}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  } catch {
    // path not found, safe to use
  }
  await fs.mkdir(finalPath, { recursive: true });
  return finalPath;
};

const printSummary = (summary) => {
  console.log(`${LOG} synchronization summary`);
  for (const [file, state] of Object.entries(summary)) {
    console.log(`${LOG} ${file}: scanned=${state.scanned} changed=${state.changed}`);
    for (const [field, count] of Object.entries(state.fixes).sort((a, b) => b[1] - a[1])) {
      console.log(`${LOG}   ${field} => ${count}`);
    }
  }
};

const run = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const backendRoot = path.resolve(__dirname, "../..");
  const backupsRoot = path.join(backendRoot, "backups");
  const args = parseArgs();

  const inputDir = args.input
    ? path.resolve(process.cwd(), args.input)
    : await latestBackupDir(backupsRoot);

  const outputDir = args.inPlace
    ? inputDir
    : await ensureDir(
        args.output ? path.resolve(process.cwd(), args.output) : `${inputDir}-synced`
      );

  const loaded = {};
  for (const file of FILES) {
    const source = path.join(inputDir, file);
    try {
      loaded[file] = await readJsonArray(source);
      console.log(`${LOG} loaded ${file}: ${loaded[file].length} records`);
    } catch (error) {
      loaded[file] = [];
      console.log(`${LOG} skipped ${file}: ${error.message}`);
    }
  }

  const refs = {
    userIds: loaded["users.json"].map((x) => x._id).filter(isObjectId),
    brandIds: loaded["brands.json"].map((x) => x._id).filter(isObjectId),
    productTypeIds: loaded["producttypes.json"].map((x) => x._id).filter(isObjectId),
    productIds: loaded["universalproducts.json"].map((x) => x._id).filter(isObjectId),
    variantIds: loaded["universalproducts.json"]
      .flatMap((x) => (Array.isArray(x.variants) ? x.variants : []))
      .filter(isObjectId),
  };

  const summary = Object.fromEntries(FILES.map((file) => [file, mkState()]));
  await syncUsers(loaded["users.json"], refs, summary["users.json"]);
  syncBrands(loaded["brands.json"], refs, summary["brands.json"]);
  syncProductTypes(loaded["producttypes.json"], refs, summary["producttypes.json"]);
  syncUniversalProducts(
    loaded["universalproducts.json"],
    refs,
    summary["universalproducts.json"]
  );
  syncOrders(loaded["orders.json"], refs, summary["orders.json"]);

  printSummary(summary);
  if (args.dryRun) {
    console.log(`${LOG} dry-run enabled. No files written.`);
    return;
  }

  for (const file of FILES) {
    const outPath = path.join(outputDir, file);
    await fs.writeFile(outPath, JSON.stringify(loaded[file], null, 2), "utf8");
    console.log(`${LOG} wrote ${outPath}`);
  }

  console.log(`${LOG} input=${inputDir}`);
  console.log(`${LOG} output=${outputDir}`);
};

run().catch((error) => {
  console.error(`${LOG} failed: ${error.message}`);
  process.exitCode = 1;
});
