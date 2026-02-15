// ============================================
// FILE: backend/src/modules/warehouse/goodsReceiptController.js
// Controllers cho chức năng nhận hàng vào kho
// ============================================

import mongoose from "mongoose";
import GoodsReceipt from "./GoodsReceipt.js";
import PurchaseOrder from "./PurchaseOrder.js";
import Inventory from "./Inventory.js";
import WarehouseLocation from "./WarehouseLocation.js";
import StockMovement from "./StockMovement.js";
import { UniversalVariant } from "../product/UniversalProduct.js";
import StoreInventory from "../inventory/StoreInventory.js";
import Store from "../store/Store.js";

const RECEIVABLE_PO_STATUSES = new Set(["CONFIRMED", "PARTIAL"]);
const DEFAULT_STORE_MIN_STOCK = 5;

const getActorName = (user) =>
  user?.fullName?.trim() || user?.name?.trim() || user?.email?.trim() || "Unknown";

const toPositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const toNonNegativeInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};

const normalizeQualityStatus = (value) => {
  const allowed = new Set(["GOOD", "DAMAGED", "EXPIRED"]);
  return allowed.has(value) ? value : "GOOD";
};

const calculateSellableQuantity = ({
  receivedQuantity,
  damagedQuantity,
  qualityStatus,
}) => {
  if (qualityStatus !== "GOOD") {
    return 0;
  }
  return Math.max(0, receivedQuantity - damagedQuantity);
};

const buildStoreAllocationPlan = async ({
  productId,
  variantSku,
  receivedQuantity,
  session,
}) => {
  if (!productId || !variantSku || receivedQuantity <= 0) {
    return [];
  }

  const stores = await Store.find({
    status: "ACTIVE",
    type: { $ne: "WAREHOUSE" },
  })
    .select("_id capacity.maxOrdersPerDay")
    .session(session);

  if (stores.length === 0) {
    return [];
  }

  const storeIds = stores.map((store) => store._id);
  const currentInventories = await StoreInventory.find({
    productId,
    variantSku,
    storeId: { $in: storeIds },
  })
    .select("storeId quantity minStock")
    .session(session);

  const inventoryByStore = new Map(
    currentInventories.map((item) => [String(item.storeId), item])
  );

  let remaining = receivedQuantity;
  const rawAllocations = [];

  // Priority 1: bù thiếu tối thiểu cho các store đang dưới ngưỡng minStock
  for (const store of stores) {
    if (remaining <= 0) break;

    const inventory = inventoryByStore.get(String(store._id));
    const currentQuantity = Number(inventory?.quantity) || 0;
    const minStock = Number(inventory?.minStock ?? DEFAULT_STORE_MIN_STOCK);
    const minTarget = Number.isFinite(minStock) && minStock > 0 ? Math.floor(minStock) : DEFAULT_STORE_MIN_STOCK;
    const deficit = Math.max(0, minTarget - currentQuantity);

    if (deficit <= 0) continue;

    const allocate = Math.min(deficit, remaining);
    rawAllocations.push({ storeId: store._id, quantity: allocate });
    remaining -= allocate;
  }

  // Priority 2: chia phần còn lại theo năng lực xử lý đơn hàng của từng store
  if (remaining > 0) {
    const weightedStores = stores.map((store) => ({
      storeId: store._id,
      weight: Math.max(1, Number(store.capacity?.maxOrdersPerDay) || 100),
    }));

    const totalWeight =
      weightedStores.reduce((sum, item) => sum + item.weight, 0) || 1;
    const remainingBeforeWeighted = remaining;
    let allocatedInWeightedPass = 0;

    for (let index = 0; index < weightedStores.length; index += 1) {
      if (remaining <= 0) break;

      const isLast = index === weightedStores.length - 1;
      let allocate = isLast
        ? remainingBeforeWeighted - allocatedInWeightedPass
        : Math.floor(
            (remainingBeforeWeighted * weightedStores[index].weight) / totalWeight
          );

      allocate = Math.min(allocate, remaining);
      if (allocate <= 0) continue;

      rawAllocations.push({
        storeId: weightedStores[index].storeId,
        quantity: allocate,
      });

      allocatedInWeightedPass += allocate;
      remaining -= allocate;
    }

    if (remaining > 0 && weightedStores.length > 0) {
      rawAllocations.push({
        storeId: weightedStores[0].storeId,
        quantity: remaining,
      });
      remaining = 0;
    }
  }

  const mergedAllocations = new Map();
  for (const allocation of rawAllocations) {
    const key = String(allocation.storeId);
    const current = mergedAllocations.get(key);
    if (current) {
      current.quantity += allocation.quantity;
    } else {
      mergedAllocations.set(key, {
        storeId: allocation.storeId,
        quantity: allocation.quantity,
      });
    }
  }

  return Array.from(mergedAllocations.values()).filter(
    (allocation) => allocation.quantity > 0
  );
};

const syncStoreInventory = async ({
  productId,
  variantSku,
  receivedQuantity,
  session,
}) => {
  if (!productId || !variantSku || receivedQuantity <= 0) {
    return [];
  }

  const allocationPlan = await buildStoreAllocationPlan({
    productId,
    variantSku,
    receivedQuantity,
    session,
  });

  const distribution = [];

  for (const allocation of allocationPlan) {
    let storeInventory = await StoreInventory.findOne({
      productId,
      variantSku,
      storeId: allocation.storeId,
    }).session(session);

    if (!storeInventory) {
      storeInventory = new StoreInventory({
        productId,
        variantSku,
        storeId: allocation.storeId,
        quantity: 0,
        reserved: 0,
      });
    }

    storeInventory.quantity =
      (Number(storeInventory.quantity) || 0) + allocation.quantity;
    storeInventory.lastRestockDate = new Date();
    storeInventory.lastRestockQuantity = allocation.quantity;

    await storeInventory.save({ session });

    distribution.push({
      storeId: allocation.storeId,
      quantity: allocation.quantity,
      available: storeInventory.available,
      status: storeInventory.status,
    });
  }

  return distribution;
};

const generateGrnNumber = async (session) => {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;
  const countInYear = await GoodsReceipt.countDocuments({
    grnNumber: { $regex: `^${prefix}` },
  }).session(session);

  let sequence = countInYear + 1;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${prefix}${String(sequence).padStart(3, "0")}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await GoodsReceipt.findOne({ grnNumber: candidate })
      .select("_id")
      .session(session);
    if (!existing) {
      return candidate;
    }
    sequence += 1;
  }

  return `${prefix}${Date.now()}`;
};

/**
 * Bắt đầu nhận hàng từ PO
 * POST /api/warehouse/goods-receipt/start
 */
export const startGoodsReceipt = async (req, res) => {
  try {
    const { poId, poNumber } = req.body;

    let po = null;
    if (poId) {
      po = await PurchaseOrder.findById(poId);
    } else if (poNumber) {
      po = await PurchaseOrder.findOne({ poNumber: String(poNumber).trim() });
    }

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    if (!RECEIVABLE_PO_STATUSES.has(po.status)) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng chưa sẵn sàng để nhận hàng",
      });
    }

    res.json({
      success: true,
      purchaseOrder: {
        _id: po._id,
        poNumber: po.poNumber,
        supplier: po.supplier,
        status: po.status,
        items: po.items.map((item) => {
          const remainingQuantity = Math.max(
            0,
            (Number(item.orderedQuantity) || 0) - (Number(item.receivedQuantity) || 0)
          );
          return {
            sku: item.sku,
            productId: item.productId,
            productName: item.productName,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: item.receivedQuantity,
            damagedQuantity: item.damagedQuantity || 0,
            remainingQuantity,
          };
        }),
        expectedDeliveryDate: po.expectedDeliveryDate,
      },
    });
  } catch (error) {
    console.error("Error starting goods receipt:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi bắt đầu nhận hàng",
      error: error.message,
    });
  }
};

/**
 * Nhận hàng từng SKU
 * POST /api/warehouse/goods-receipt/receive-item
 */
export const receiveItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      poId,
      sku,
      receivedQuantity,
      damagedQuantity = 0,
      locationCode,
      qualityStatus = "GOOD",
      notes,
    } = req.body;

    const actorName = getActorName(req.user);
    const receiveQty = toPositiveInteger(receivedQuantity);
    const damagedQty = toNonNegativeInteger(damagedQuantity);
    const normalizedSku = String(sku || "").trim();
    const normalizedLocationCode = String(locationCode || "").trim();
    const normalizedQualityStatus = normalizeQualityStatus(qualityStatus);

    if (!poId || !normalizedSku || !normalizedLocationCode || !receiveQty) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "Dữ liệu nhận hàng không hợp lệ (poId, sku, receivedQuantity, locationCode)",
      });
    }

    if (damagedQty === null || damagedQty > receiveQty) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Số lượng hư hỏng không hợp lệ",
      });
    }

    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    if (!RECEIVABLE_PO_STATUSES.has(po.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không ở trạng thái có thể nhận",
      });
    }

    const poItem = po.items.find((item) => item.sku === normalizedSku);
    if (!poItem) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy SKU trong đơn hàng",
      });
    }

    const remainingQuantity = Math.max(
      0,
      (Number(poItem.orderedQuantity) || 0) - (Number(poItem.receivedQuantity) || 0)
    );

    if (remainingQuantity <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "SKU này đã nhận đủ theo đơn hàng",
      });
    }

    if (receiveQty > remainingQuantity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Số lượng nhận vượt quá còn lại (${remainingQuantity})`,
      });
    }

    const sellableQuantity = calculateSellableQuantity({
      receivedQuantity: receiveQty,
      damagedQuantity: damagedQty,
      qualityStatus: normalizedQualityStatus,
    });

    const inventoryQuantityDelta =
      normalizedQualityStatus === "GOOD" ? sellableQuantity : receiveQty;

    const location = await WarehouseLocation.findOne({
      locationCode: normalizedLocationCode,
      status: "ACTIVE",
    }).session(session);

    if (!location) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí kho",
      });
    }

    const currentLoad = Number(location.currentLoad) || 0;
    const capacity = Number(location.capacity) || 0;
    if (currentLoad + inventoryQuantityDelta > capacity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vị trí kho không đủ chỗ",
      });
    }

    let inventory = await Inventory.findOne({
      sku: normalizedSku,
      locationId: location._id,
    }).session(session);

    if (inventory) {
      inventory.quantity = (Number(inventory.quantity) || 0) + inventoryQuantityDelta;
      inventory.lastReceived = new Date();
      inventory.status = normalizedQualityStatus;
      if (notes !== undefined) {
        inventory.notes = String(notes || "").trim();
      }
      await inventory.save({ session });
    } else {
      inventory = new Inventory({
        sku: normalizedSku,
        productId: poItem.productId,
        productName: poItem.productName,
        locationId: location._id,
        locationCode: location.locationCode,
        quantity: inventoryQuantityDelta,
        lastReceived: new Date(),
        status: normalizedQualityStatus,
        notes: String(notes || "").trim(),
      });
      await inventory.save({ session });
    }

    location.currentLoad = currentLoad + inventoryQuantityDelta;
    await location.save({ session });

    const movement = new StockMovement({
      type: "INBOUND",
      sku: normalizedSku,
      productId: poItem.productId,
      productName: poItem.productName,
      toLocationId: location._id,
      toLocationCode: location.locationCode,
      quantity: receiveQty,
      referenceType: "PO",
      referenceId: po.poNumber,
      performedBy: req.user._id,
      performedByName: actorName,
      qualityStatus: normalizedQualityStatus,
      notes: String(notes || "").trim(),
    });
    await movement.save({ session });

    poItem.receivedQuantity = (Number(poItem.receivedQuantity) || 0) + receiveQty;
    poItem.damagedQuantity = (Number(poItem.damagedQuantity) || 0) + damagedQty;

    const hasAnyReceived = po.items.some(
      (item) => (Number(item.receivedQuantity) || 0) > 0
    );
    if (po.status === "CONFIRMED" && hasAnyReceived) {
      po.status = "PARTIAL";
    }
    await po.save({ session });

    let variantStockAfter = null;
    let distributedToStores = [];

    if (sellableQuantity > 0) {
      const variant = await UniversalVariant.findOne({
        sku: normalizedSku,
      }).session(session);

      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy biến thể SKU: ${normalizedSku}`,
        });
      }

      variant.stock = (Number(variant.stock) || 0) + sellableQuantity;
      await variant.save({ session });
      variantStockAfter = variant.stock;

      distributedToStores = await syncStoreInventory({
        productId: variant.productId,
        variantSku: normalizedSku,
        receivedQuantity: sellableQuantity,
        session,
      });
    }

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Đã nhận hàng thành công",
      inventory,
      location: {
        locationCode: location.locationCode,
        currentLoad: location.currentLoad,
        capacity: location.capacity,
        fillRate: location.fillRate,
      },
      sync: {
        inventoryQuantityDelta,
        sellableQuantity,
        variantStockAfter,
        distributedToStores,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error receiving item:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi nhận hàng",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Hoàn tất nhận hàng và tạo GRN
 * POST /api/warehouse/goods-receipt/complete
 */
export const completeGoodsReceipt = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { poId, deliverySignature, notes } = req.body;

    if (!poId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Thiếu poId",
      });
    }

    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    if (po.status === "COMPLETED") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Đơn đặt hàng đã hoàn tất trước đó",
      });
    }

    if (!RECEIVABLE_PO_STATUSES.has(po.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không ở trạng thái có thể hoàn tất nhận",
      });
    }

    const receivedPoItems = po.items.filter(
      (item) => (Number(item.receivedQuantity) || 0) > 0
    );

    if (receivedPoItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng chưa có SKU nào được nhận",
      });
    }

    const grnNumber = await generateGrnNumber(session);
    const receivedItems = [];
    let totalQuantity = 0;
    let totalDamaged = 0;

    for (const poItem of receivedPoItems) {
      // Lấy snapshot vị trí gần nhất để ghi trên GRN.
      // Luồng hiện tại nhận mỗi SKU theo một location trong 1 lần xử lý.
      // eslint-disable-next-line no-await-in-loop
      const inventorySnapshot = await Inventory.findOne({
        sku: poItem.sku,
      })
        .sort({ updatedAt: -1 })
        .session(session);

      if (!inventorySnapshot) {
        throw new Error(
          `Không tìm thấy tồn kho cho SKU ${poItem.sku}. Vui lòng nhận hàng trước khi hoàn tất.`
        );
      }

      const receivedQty = Number(poItem.receivedQuantity) || 0;
      const damagedQty = Number(poItem.damagedQuantity) || 0;

      receivedItems.push({
        sku: poItem.sku,
        productId: poItem.productId,
        productName: poItem.productName,
        orderedQuantity: poItem.orderedQuantity,
        receivedQuantity: receivedQty,
        damagedQuantity: damagedQty,
        locationId: inventorySnapshot.locationId,
        locationCode: inventorySnapshot.locationCode,
        qualityStatus: inventorySnapshot.status || "GOOD",
        unitPrice: poItem.unitPrice,
        totalPrice: receivedQty * (Number(poItem.unitPrice) || 0),
      });

      totalQuantity += receivedQty;
      totalDamaged += damagedQty;
    }

    const grn = new GoodsReceipt({
      grnNumber,
      purchaseOrderId: po._id,
      poNumber: po.poNumber,
      supplier: po.supplier,
      items: receivedItems,
      totalQuantity,
      totalDamaged,
      receivedBy: req.user._id,
      receivedByName: getActorName(req.user),
      receivedDate: new Date(),
      deliverySignature,
      notes,
    });

    await grn.save({ session });

    const allReceived = po.items.every(
      (item) => (Number(item.receivedQuantity) || 0) >= (Number(item.orderedQuantity) || 0)
    );

    po.status = allReceived ? "COMPLETED" : "PARTIAL";
    po.actualDeliveryDate = new Date();
    await po.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Đã hoàn tất nhận hàng",
      goodsReceipt: grn,
      purchaseOrder: po,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error completing goods receipt:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hoàn tất nhận hàng",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Lấy danh sách phiếu nhập kho
 * GET /api/warehouse/goods-receipt
 */
export const getGoodsReceipts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const filter = {};
    if (search) {
      filter.$or = [
        { grnNumber: { $regex: search, $options: "i" } },
        { poNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [goodsReceipts, total] = await Promise.all([
      GoodsReceipt.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      GoodsReceipt.countDocuments(filter),
    ]);

    res.json({
      success: true,
      goodsReceipts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error getting goods receipts:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách phiếu nhập kho",
      error: error.message,
    });
  }
};

export default {
  startGoodsReceipt,
  receiveItem,
  completeGoodsReceipt,
  getGoodsReceipts,
};
