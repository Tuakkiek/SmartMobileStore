// ============================================
// FILE: backend/src/modules/warehouse/stockInController.js
// Direct stock-in for Global Admin (no PO required)
// ============================================

import mongoose from "mongoose";
import Inventory from "./Inventory.js";
import WarehouseLocation from "./WarehouseLocation.js";
import StockMovement from "./StockMovement.js";
import UniversalProduct, { UniversalVariant } from "../product/UniversalProduct.js";
import StoreInventory from "../inventory/StoreInventory.js";
import Store from "../store/Store.js";

const DEFAULT_STORE_MIN_STOCK = 5;

const getActorName = (user) =>
  user?.fullName?.trim() || user?.name?.trim() || user?.email?.trim() || "Unknown";

const toPositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

// ============================================
// SYNC TO STORE INVENTORY (reused pattern)
// ============================================
const syncStoreInventory = async ({ productId, variantSku, receivedQuantity, session }) => {
  console.log(`📦 [STOCK-IN] syncStoreInventory: productId=${productId}, sku=${variantSku}, qty=${receivedQuantity}`);
  if (!productId || !variantSku || receivedQuantity <= 0) return [];

  const stores = await Store.find({
    status: "ACTIVE",
    type: { $ne: "WAREHOUSE" },
  })
    .select("_id capacity.maxOrdersPerDay")
    .session(session);

  if (stores.length === 0) return [];

  const storeIds = stores.map((s) => s._id);
  const currentInventories = await StoreInventory.find({
    productId,
    variantSku,
    storeId: { $in: storeIds },
  })
    .select("storeId quantity minStock")
    .session(session)
    .setOptions({ skipBranchIsolation: true });

  const inventoryByStore = new Map(
    currentInventories.map((item) => [String(item.storeId), item])
  );

  let remaining = receivedQuantity;
  const rawAllocations = [];

  // Priority 1: fill below-minStock stores
  for (const store of stores) {
    if (remaining <= 0) break;
    const inventory = inventoryByStore.get(String(store._id));
    const currentQty = Number(inventory?.quantity) || 0;
    const minStock = Number(inventory?.minStock ?? DEFAULT_STORE_MIN_STOCK);
    const minTarget = Number.isFinite(minStock) && minStock > 0 ? Math.floor(minStock) : DEFAULT_STORE_MIN_STOCK;
    const deficit = Math.max(0, minTarget - currentQty);
    if (deficit <= 0) continue;
    const allocate = Math.min(deficit, remaining);
    rawAllocations.push({ storeId: store._id, quantity: allocate });
    remaining -= allocate;
  }

  // Priority 2: distribute remaining by capacity weight
  if (remaining > 0) {
    const weightedStores = stores.map((s) => ({
      storeId: s._id,
      weight: Math.max(1, Number(s.capacity?.maxOrdersPerDay) || 100),
    }));
    const totalWeight = weightedStores.reduce((sum, item) => sum + item.weight, 0) || 1;
    const remainingBefore = remaining;
    let allocated = 0;

    for (let i = 0; i < weightedStores.length; i++) {
      if (remaining <= 0) break;
      const isLast = i === weightedStores.length - 1;
      let allocate = isLast
        ? remainingBefore - allocated
        : Math.floor((remainingBefore * weightedStores[i].weight) / totalWeight);
      allocate = Math.min(allocate, remaining);
      if (allocate <= 0) continue;
      rawAllocations.push({ storeId: weightedStores[i].storeId, quantity: allocate });
      allocated += allocate;
      remaining -= allocate;
    }

    if (remaining > 0 && weightedStores.length > 0) {
      rawAllocations.push({ storeId: weightedStores[0].storeId, quantity: remaining });
      remaining = 0;
    }
  }

  // Merge allocations for same store
  const merged = new Map();
  for (const a of rawAllocations) {
    const key = String(a.storeId);
    const current = merged.get(key);
    if (current) {
      current.quantity += a.quantity;
    } else {
      merged.set(key, { storeId: a.storeId, quantity: a.quantity });
    }
  }

  const distribution = [];
  for (const allocation of merged.values()) {
    if (allocation.quantity <= 0) continue;

    let storeInv = await StoreInventory.findOne({
      productId,
      variantSku,
      storeId: allocation.storeId,
    })
      .session(session)
      .setOptions({ skipBranchIsolation: true });

    if (!storeInv) {
      storeInv = new StoreInventory({
        productId,
        variantSku,
        storeId: allocation.storeId,
        quantity: 0,
        reserved: 0,
      });
    }

    storeInv.quantity = (Number(storeInv.quantity) || 0) + allocation.quantity;
    storeInv.lastRestockDate = new Date();
    storeInv.lastRestockQuantity = allocation.quantity;
    await storeInv.save({ session });

    distribution.push({
      storeId: allocation.storeId,
      quantity: allocation.quantity,
      available: storeInv.available,
      status: storeInv.status,
    });
  }

  return distribution;
};

// ============================================
// DIRECT STOCK-IN (No PO required)
// POST /api/warehouse/stock-in
// ============================================
export const directStockIn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items } = req.body;
    const actorName = getActorName(req.user);

    console.log(`\n🔥 [STOCK-IN] directStockIn called by ${actorName} (${req.user?.role})`);
    console.log(`📋 [STOCK-IN] Items received:`, JSON.stringify(items, null, 2));

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Danh sách sản phẩm nhập kho không hợp lệ",
      });
    }

    const results = [];
    const activatedProducts = new Set();

    for (const item of items) {
      const { sku, quantity, locationCode, notes } = item;

      const normalizedSku = String(sku || "").trim();
      const normalizedLocationCode = String(locationCode || "").trim();
      const qty = toPositiveInteger(quantity);

      if (!normalizedSku || !normalizedLocationCode || !qty) {
        throw new Error(
          `Dữ liệu không hợp lệ cho SKU: ${normalizedSku || "(trống)"} (cần sku, quantity > 0, locationCode)`
        );
      }

      // 1. Validate variant exists
      console.log(`\n🔍 [STOCK-IN] Processing item: sku=${normalizedSku}, qty=${qty}, loc=${normalizedLocationCode}`);
      const variant = await UniversalVariant.findOne({ sku: normalizedSku }).session(session);
      if (!variant) {
        throw new Error(`Không tìm thấy biến thể SKU: ${normalizedSku}`);
      }
      console.log(`✅ [STOCK-IN] Variant found: ${variant.color} ${variant.variantName}, currentStock=${variant.stock}`);

      // 2. Validate location
      const location = await WarehouseLocation.findOne({
        locationCode: normalizedLocationCode,
        status: "ACTIVE",
      }).session(session);

      if (!location) {
        throw new Error(`Không tìm thấy vị trí kho: ${normalizedLocationCode}`);
      }

      // 3. Check capacity
      const currentLoad = Number(location.currentLoad) || 0;
      const capacity = Number(location.capacity) || 0;
      if (capacity > 0 && currentLoad + qty > capacity) {
        throw new Error(
          `Vị trí kho ${normalizedLocationCode} không đủ chỗ (${currentLoad}/${capacity})`
        );
      }

      // 4. Update/create Inventory
      let inventory = await Inventory.findOne({
        sku: normalizedSku,
        locationId: location._id,
      }).session(session);

      const product = await UniversalProduct.findById(variant.productId).session(session);
      if (!product) {
        throw new Error(`Không tìm thấy sản phẩm cho SKU: ${normalizedSku}`);
      }
      console.log(`✅ [STOCK-IN] Product: ${product.name}, lifecycle=${product.lifecycleStage}, status=${product.status}`);

      if (inventory) {
        inventory.quantity = (Number(inventory.quantity) || 0) + qty;
        inventory.lastReceived = new Date();
        if (notes) inventory.notes = String(notes).trim();
        await inventory.save({ session });
      } else {
        inventory = new Inventory({
          sku: normalizedSku,
          productId: product._id,
          productName: product.name,
          locationId: location._id,
          locationCode: location.locationCode,
          quantity: qty,
          lastReceived: new Date(),
          status: "GOOD",
          notes: String(notes || "").trim(),
        });
        await inventory.save({ session });
      }

      // 5. Update location load
      location.currentLoad = currentLoad + qty;
      await location.save({ session });

      // 6. Update variant stock
      variant.stock = (Number(variant.stock) || 0) + qty;
      await variant.save({ session });

      // 7. Create stock movement log
      const movement = new StockMovement({
        type: "INBOUND",
        sku: normalizedSku,
        productId: product._id,
        productName: product.name,
        toLocationId: location._id,
        toLocationCode: location.locationCode,
        quantity: qty,
        referenceType: "MANUAL",
        referenceId: `STOCKIN-${Date.now()}`,
        performedBy: req.user._id,
        performedByName: actorName,
        qualityStatus: "GOOD",
        notes: String(notes || "").trim(),
      });
      await movement.save({ session });

      // 8. Auto-activate SKELETON product
      if (product.lifecycleStage === "SKELETON" && !activatedProducts.has(String(product._id))) {
        product.lifecycleStage = "ACTIVE";
        product.status = "AVAILABLE";
        await product.save({ session });
        activatedProducts.add(String(product._id));
        console.log(`✅ Product activated: ${product.name} (${product._id})`);
      } else if (product.status === "OUT_OF_STOCK" && !activatedProducts.has(String(product._id))) {
        // If product was just out of stock but active, mark as available
        product.status = "AVAILABLE";
        await product.save({ session });
      }

      // 9. Sync to store inventory
      console.log(`📦 [STOCK-IN] Syncing to store inventory...`);
      const distributedToStores = await syncStoreInventory({
        productId: product._id,
        variantSku: normalizedSku,
        receivedQuantity: qty,
        session,
      });
      console.log(`✅ [STOCK-IN] Distributed to ${distributedToStores.length} stores`);

      results.push({
        sku: normalizedSku,
        productName: product.name,
        quantity: qty,
        locationCode: normalizedLocationCode,
        variantStockAfter: variant.stock,
        inventoryQuantity: inventory.quantity,
        distributedToStores,
        productActivated: activatedProducts.has(String(product._id)),
      });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: `Nhập kho thành công ${results.length} mục`,
      data: {
        items: results,
        totalItems: results.length,
        totalQuantity: results.reduce((sum, r) => sum + r.quantity, 0),
        activatedProducts: activatedProducts.size,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ DIRECT STOCK-IN ERROR:", error.message);
    console.error("❌ DIRECT STOCK-IN STACK:", error.stack);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi nhập kho",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET STOCK-IN HISTORY
// GET /api/warehouse/stock-in/history
// ============================================
export const getStockInHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, startDate, endDate } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const filter = {
      type: "INBOUND",
      referenceType: "MANUAL",
    };

    if (search) {
      filter.$or = [
        { sku: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { performedByName: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (pageNum - 1) * limitNum;

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockMovement.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        movements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("❌ GET STOCK-IN HISTORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử nhập kho",
      error: error.message,
    });
  }
};

export default {
  directStockIn,
  getStockInHistory,
};
