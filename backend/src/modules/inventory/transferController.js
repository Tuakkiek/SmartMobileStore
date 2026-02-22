import mongoose from "mongoose";
import StockTransfer from "./StockTransfer.js";
import Store from "../store/Store.js";
import StoreInventory from "./StoreInventory.js";
import StockMovement from "../warehouse/StockMovement.js";
import Inventory from "../warehouse/Inventory.js"; // Added for physical inventory sync
import WarehouseLocation from "../warehouse/WarehouseLocation.js"; // Added for physical inventory sync

const TRANSFER_EDITABLE_STATUSES = new Set(["PENDING", "APPROVED"]);

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

const normalizeSku = (value) => String(value || "").trim();

const ensureStore = async (storeId, session) => {
  const store = await Store.findById(storeId)
    .select("_id code name status type")
    .session(session);
  if (!store) {
    throw new Error(`Khong tim thay cua hang: ${storeId}`);
  }
  if (store.status !== "ACTIVE") {
    throw new Error(`Cua hang ${store.code} khong o trang thai ACTIVE`);
  }
  return store;
};

const getTransferForRead = async (transferId) => {
  return StockTransfer.findById(transferId)
    .populate("requestedBy", "fullName email role")
    .populate("approvedBy", "fullName email role")
    .populate("rejectedBy", "fullName email role")
    .populate("shippedBy", "fullName email role")
    .populate("receivedBy", "fullName email role");
};

const validateTransferItemsForRequest = async ({
  fromStoreId,
  rawItems,
  session,
}) => {
  const normalizedItems = [];

  for (const rawItem of rawItems) {
    const variantSku = normalizeSku(rawItem.variantSku || rawItem.sku);
    const requestedQuantity = toPositiveInteger(
      rawItem.requestedQuantity || rawItem.quantity
    );

    if (!variantSku || !requestedQuantity) {
      throw new Error("Thong tin item transfer khong hop le");
    }

    const inventoryFilter = {
      storeId: fromStoreId,
      variantSku,
    };

    if (rawItem.productId) {
      inventoryFilter.productId = rawItem.productId;
    }

    const sourceInventory = await StoreInventory.findOne(inventoryFilter)
      .populate("productId", "name")
      .session(session);

    if (!sourceInventory) {
      throw new Error(`Khong tim thay ton kho nguon cho SKU ${variantSku}`);
    }

    const available = Number(sourceInventory.available) || 0;
    if (available < requestedQuantity) {
      throw new Error(
        `Khong du ton kha dung cho SKU ${variantSku}. Available: ${available}`
      );
    }

    normalizedItems.push({
      productId: sourceInventory.productId?._id || sourceInventory.productId,
      variantSku,
      name:
        rawItem.name ||
        rawItem.productName ||
        sourceInventory.productId?.name ||
        variantSku,
      image: rawItem.image || "",
      requestedQuantity,
      approvedQuantity: 0,
      receivedQuantity: 0,
      condition: rawItem.condition || "NEW",
    });
  }

  if (normalizedItems.length === 0) {
    throw new Error("Danh sach item transfer trong");
  }

  return normalizedItems;
};

export const requestTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fromStoreId, toStoreId, items, reason, notes } = req.body;

    if (!fromStoreId || !toStoreId) {
      throw new Error("Thieu thong tin cua hang nguon/dich");
    }
    if (String(fromStoreId) === String(toStoreId)) {
      throw new Error("Cua hang nguon va dich khong duoc trung nhau");
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Danh sach item transfer khong hop le");
    }
    if (!reason) {
      throw new Error("Ly do transfer la bat buoc");
    }

    // ── KILL-SWITCH: Branch ownership validation ──
    const allowedBranches = req.authz?.allowedBranchIds || [];
    const isGlobalAdmin = req.authz?.isGlobalAdmin || false;
    if (!isGlobalAdmin && !allowedBranches.includes(String(fromStoreId))) {
      throw new Error("AUTHZ_BRANCH_FORBIDDEN: You do not manage the source store");
    }

    // Do not run transaction-scoped queries in parallel on the same session.
    // MongoDB transactions can fail with "active transaction number" mismatches.
    const fromStore = await ensureStore(fromStoreId, session);
    const toStore = await ensureStore(toStoreId, session);

    const normalizedItems = await validateTransferItemsForRequest({
      fromStoreId,
      rawItems: items,
      session,
    });

    const transfer = await StockTransfer.create(
      [
        {
          fromStore: {
            storeId: fromStore._id,
            storeName: fromStore.name,
            storeCode: fromStore.code,
          },
          toStore: {
            storeId: toStore._id,
            storeName: toStore.name,
            storeCode: toStore.code,
          },
          items: normalizedItems,
          reason,
          notes: String(notes || "").trim(),
          status: "PENDING",
          requestedBy: req.user._id,
          requestedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      transfer: transfer[0],
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the tao yeu cau transfer",
    });
  } finally {
    session.endSession();
  }
};

export const getTransfers = async (req, res) => {
  try {
    const {
      status,
      fromStoreId,
      toStoreId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (status) filter.status = String(status).trim().toUpperCase();
    if (fromStoreId) filter["fromStore.storeId"] = fromStoreId;
    if (toStoreId) filter["toStore.storeId"] = toStoreId;
    if (search) {
      filter.$or = [
        { transferNumber: { $regex: search, $options: "i" } },
        { "items.variantSku": { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [transfers, total] = await Promise.all([
      StockTransfer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("requestedBy", "fullName role")
        .populate("approvedBy", "fullName role")
        .populate("receivedBy", "fullName role")
        .lean(),
      StockTransfer.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      transfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Khong the lay danh sach transfer",
    });
  }
};

export const getTransferById = async (req, res) => {
  try {
    const transfer = await getTransferForRead(req.params.id);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay transfer",
      });
    }

    return res.json({
      success: true,
      transfer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Khong the lay chi tiet transfer",
    });
  }
};

export const approveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      throw new Error("Khong tim thay transfer");
    }
    if (transfer.status !== "PENDING") {
      throw new Error("Chi transfer PENDING moi duoc phe duyet");
    }

    // ── KILL-SWITCH: Branch ownership validation ──
    const allowedBranches = req.authz?.allowedBranchIds || [];
    const isGlobalAdmin = req.authz?.isGlobalAdmin || false;
    if (!isGlobalAdmin && !allowedBranches.includes(String(transfer.fromStore.storeId))) {
      throw new Error("AUTHZ_BRANCH_FORBIDDEN: You do not manage the source store");
    }

    const approvedItems = Array.isArray(req.body.approvedItems)
      ? req.body.approvedItems
      : [];
    const approvedBySku = new Map();
    for (const item of approvedItems) {
      const sku = normalizeSku(item.variantSku || item.sku);
      if (!sku) continue;
      const qty = toNonNegativeInteger(item.quantity);
      approvedBySku.set(sku, qty === null ? 0 : qty);
    }

    let approvedTotal = 0;

    for (const item of transfer.items) {
      const requestedQty = Number(item.requestedQuantity) || 0;
      const chosenQty = approvedBySku.has(item.variantSku)
        ? approvedBySku.get(item.variantSku)
        : requestedQty;
      const approvedQty = Math.min(requestedQty, Math.max(0, chosenQty || 0));

      item.approvedQuantity = approvedQty;

      if (approvedQty <= 0) {
        continue;
      }

      const sourceInventory = await StoreInventory.findOne({
        storeId: transfer.fromStore.storeId,
        productId: item.productId,
        variantSku: item.variantSku,
      }).session(session);

      if (!sourceInventory) {
        throw new Error(`Khong tim thay ton kho nguon cho SKU ${item.variantSku}`);
      }

      const available = Number(sourceInventory.available) || 0;
      if (available < approvedQty) {
        throw new Error(
          `Khong du ton kho de phe duyet SKU ${item.variantSku}. Available: ${available}`
        );
      }

      sourceInventory.reserved = (Number(sourceInventory.reserved) || 0) + approvedQty;
      await sourceInventory.save({ session });
      approvedTotal += approvedQty;
    }

    if (approvedTotal <= 0) {
      throw new Error("Khong co so luong nao duoc phe duyet");
    }

    transfer.status = "APPROVED";
    transfer.approvedBy = req.user._id;
    transfer.approvedAt = new Date();
    await transfer.save({ session });

    await session.commitTransaction();

    const refreshed = await getTransferForRead(transfer._id);
    return res.json({
      success: true,
      transfer: refreshed,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the phe duyet transfer",
    });
  } finally {
    session.endSession();
  }
};

export const rejectTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      throw new Error("Khong tim thay transfer");
    }
    if (transfer.status !== "PENDING") {
      throw new Error("Chi transfer PENDING moi duoc tu choi");
    }

    transfer.status = "REJECTED";
    transfer.rejectedBy = req.user._id;
    transfer.rejectedAt = new Date();
    transfer.rejectionReason = String(req.body.reason || req.body.rejectionReason || "")
      .trim();
    await transfer.save({ session });

    await session.commitTransaction();

    const refreshed = await getTransferForRead(transfer._id);
    return res.json({
      success: true,
      transfer: refreshed,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the tu choi transfer",
    });
  } finally {
    session.endSession();
  }
};

export const shipTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      throw new Error("Khong tim thay transfer");
    }
    if (transfer.status !== "APPROVED") {
      throw new Error("Chi transfer APPROVED moi duoc xuat hang");
    }

    // ── KILL-SWITCH: Branch ownership validation ──
    const allowedBranches = req.authz?.allowedBranchIds || [];
    const isGlobalAdmin = req.authz?.isGlobalAdmin || false;
    if (!isGlobalAdmin && !allowedBranches.includes(String(transfer.fromStore.storeId))) {
      throw new Error("AUTHZ_BRANCH_FORBIDDEN: You do not manage the source store");
    }

    const actorName = getActorName(req.user);
    let shippedQuantity = 0;

    for (const item of transfer.items) {
      const approvedQty = Number(item.approvedQuantity) || 0;
      if (approvedQty <= 0) continue;

      const sourceInventory = await StoreInventory.findOne({
        storeId: transfer.fromStore.storeId,
        productId: item.productId,
        variantSku: item.variantSku,
      }).session(session);

      if (!sourceInventory) {
        throw new Error(`Khong tim thay ton kho nguon cho SKU ${item.variantSku}`);
      }

      const quantity = Number(sourceInventory.quantity) || 0;
      const reserved = Number(sourceInventory.reserved) || 0;
      if (quantity < approvedQty || reserved < approvedQty) {
        throw new Error(
          `Ton kho/du tru khong hop le cho SKU ${item.variantSku} (qty=${quantity}, reserved=${reserved})`
        );
      }

      sourceInventory.quantity = quantity - approvedQty;
      sourceInventory.reserved = reserved - approvedQty;
      await sourceInventory.save({ session });

      // =================================================================
      // PHYSICAL INVENTORY SYNC (AUTO-PICK)
      // =================================================================
      // Only if source store is a WAREHOUSE
      if (transfer.fromStore.storeCode.startsWith("WH") || transfer.fromStore.storeId.toString() === "67ab23743c72b2ff5432c256") {
          let remainingQtyToPick = approvedQty;

          const query = {
              sku: item.variantSku,
              locationCode: { $regex: new RegExp("^" + transfer.fromStore.storeCode + "-") },
              quantity: { $gt: 0 }
          };

          const physicalInventories = await Inventory.find(query).sort({ quantity: -1 }).session(session);

          for (const inv of physicalInventories) {
              if (remainingQtyToPick <= 0) break;

              const pickQty = Math.min(inv.quantity, remainingQtyToPick);
              inv.quantity -= pickQty;
              remainingQtyToPick -= pickQty;

              if (inv.quantity === 0) {
                  await Inventory.deleteOne({ _id: inv._id }).session(session);
              } else {
                  await inv.save({ session });
              }

              // Update Location Current Load
              const location = await WarehouseLocation.findById(inv.locationId).session(session);
              if (location) {
                  location.currentLoad = Math.max(0, (location.currentLoad || 0) - pickQty);
                  await location.save({ session });
              }
          }

          if (remainingQtyToPick > 0) {
              // WARNING: Logical Inventory had stock, but Physical Inventory did not!
              // We log this but do NOT fail the transfer to avoid blocking operations.
              console.warn(`[StockTransfer] Metadata mismatch! Transfer ${transfer.transferNumber} Item ${item.variantSku}: Missing ${remainingQtyToPick} in Physical Inventory.`); // eslint-disable-line no-console
          }
      }
      // =================================================================

      await StockMovement.create(
        [
          {
            type: "TRANSFER",
            sku: item.variantSku,
            productId: item.productId,
            productName: item.name || item.variantSku,
            fromLocationCode: transfer.fromStore.storeCode,
            toLocationCode: transfer.toStore.storeCode,
            quantity: approvedQty,
            referenceType: "TRANSFER",
            referenceId: transfer.transferNumber,
            performedBy: req.user._id,
            performedByName: actorName,
            notes: `Ship transfer ${transfer.transferNumber}`,
          },
        ],
        { session }
      );

      shippedQuantity += approvedQty;
    }

    if (shippedQuantity <= 0) {
      throw new Error("Transfer khong co item da duoc phe duyet de xuat");
    }

    transfer.status = "IN_TRANSIT";
    transfer.trackingNumber = String(req.body.trackingNumber || "").trim();
    transfer.carrier = String(req.body.carrier || "").trim();
    transfer.estimatedDelivery = req.body.estimatedDelivery || transfer.estimatedDelivery;
    transfer.shippedBy = req.user._id;
    transfer.shippedAt = new Date();
    await transfer.save({ session });

    await session.commitTransaction();

    const refreshed = await getTransferForRead(transfer._id);
    return res.json({
      success: true,
      transfer: refreshed,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the xuat transfer",
    });
  } finally {
    session.endSession();
  }
};

export const receiveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      throw new Error("Khong tim thay transfer");
    }
    if (transfer.status !== "IN_TRANSIT") {
      throw new Error("Chi transfer IN_TRANSIT moi duoc nhan");
    }

    // ── KILL-SWITCH: Branch ownership validation (destination) ──
    const allowedBranches = req.authz?.allowedBranchIds || [];
    const isGlobalAdmin = req.authz?.isGlobalAdmin || false;
    if (!isGlobalAdmin && !allowedBranches.includes(String(transfer.toStore.storeId))) {
      throw new Error("AUTHZ_BRANCH_FORBIDDEN: You do not manage the destination store");
    }

    const actorName = getActorName(req.user);
    const receivedItems = Array.isArray(req.body.receivedItems)
      ? req.body.receivedItems
      : [];
    const receivedBySku = new Map();
    const reasonBySku = new Map();

    for (const item of receivedItems) {
      const sku = normalizeSku(item.variantSku || item.sku);
      if (!sku) continue;
      const qty = toNonNegativeInteger(item.quantity);
      receivedBySku.set(sku, qty === null ? 0 : qty);
      reasonBySku.set(sku, String(item.reason || "").trim());
    }

    const discrepancies = [];
    let receivedTotal = 0;

    for (const item of transfer.items) {
      const approvedQty = Number(item.approvedQuantity) || 0;
      if (approvedQty <= 0) {
        item.receivedQuantity = 0;
        continue;
      }

      const chosenQty = receivedBySku.has(item.variantSku)
        ? receivedBySku.get(item.variantSku)
        : approvedQty;
      const receivedQty = Math.min(approvedQty, Math.max(0, chosenQty || 0));
      item.receivedQuantity = receivedQty;

      if (receivedQty !== approvedQty) {
        discrepancies.push({
          variantSku: item.variantSku,
          expected: approvedQty,
          received: receivedQty,
          reason: reasonBySku.get(item.variantSku) || "Not specified",
        });
      }

      if (receivedQty <= 0) continue;

      let destinationInventory = await StoreInventory.findOne({
        storeId: transfer.toStore.storeId,
        productId: item.productId,
        variantSku: item.variantSku,
      }).session(session);

      if (!destinationInventory) {
        destinationInventory = new StoreInventory({
          storeId: transfer.toStore.storeId,
          productId: item.productId,
          variantSku: item.variantSku,
          quantity: 0,
          reserved: 0,
        });
      }

      destinationInventory.quantity =
        (Number(destinationInventory.quantity) || 0) + receivedQty;
      destinationInventory.lastRestockDate = new Date();
      destinationInventory.lastRestockQuantity = receivedQty;
      await destinationInventory.save({ session });

      // =================================================================
      // PHYSICAL INVENTORY SYNC (RECEIVE)
      // =================================================================
      // Only if destination store is a WAREHOUSE
      if (transfer.toStore.storeCode.startsWith("WH") || transfer.toStore.storeId.toString() === "67ab23743c72b2ff5432c256") {
          // Verify we have a valid location to put this item.
          // Strategy: Find a location named "RECEIVING" or similar, OR pick the first active location that allows this product.
          // For simplicity/fallback, we find the FIRST available location for this store zone.
          
          let targetLocation = await WarehouseLocation.findOne({
               locationCode: { $regex: `^${transfer.toStore.storeCode}-` },
               status: "ACTIVE"
          }).session(session);

          // Try to find a specific "RECEIVING" or "INBOUND" location if possible (Optional improvement)
          // const specificLoc = await WarehouseLocation.findOne({ locationCode: `${transfer.toStore.storeCode}-RECEIVING` }).session(session);
          // if (specificLoc) targetLocation = specificLoc;

          if (targetLocation) {
              // Check if inventory record exists for this SKU at this location
              let physInv = await Inventory.findOne({
                  sku: item.variantSku,
                  locationId: targetLocation._id,
              }).session(session);

              if (physInv) {
                  physInv.quantity += receivedQty;
                  physInv.lastReceived = new Date();
                  await physInv.save({ session });
              } else {
                  physInv = new Inventory({
                      sku: item.variantSku,
                      productId: item.productId,
                      productName: item.name || item.variantSku,
                      locationId: targetLocation._id,
                      locationCode: targetLocation.locationCode,
                      quantity: receivedQty,
                      status: "GOOD",
                      lastReceived: new Date()
                  });
                  await physInv.save({ session });
              }
              
              // Update Location Load
              targetLocation.currentLoad = (targetLocation.currentLoad || 0) + receivedQty;
              await targetLocation.save({ session });
              
          } else {
               console.warn(`[StockTransfer] Could not find any valid location in ${transfer.toStore.storeCode} to receive item ${item.variantSku}`); // eslint-disable-line no-console
          }
      }
      // =================================================================

      await StockMovement.create(
        [
          {
            type: "TRANSFER",
            sku: item.variantSku,
            productId: item.productId,
            productName: item.name || item.variantSku,
            fromLocationCode: transfer.fromStore.storeCode,
            toLocationCode: transfer.toStore.storeCode,
            quantity: receivedQty,
            referenceType: "TRANSFER",
            referenceId: transfer.transferNumber,
            performedBy: req.user._id,
            performedByName: actorName,
            notes: `Receive transfer ${transfer.transferNumber}`,
          },
        ],
        { session }
      );

      receivedTotal += receivedQty;
    }

    if (receivedTotal <= 0) {
      throw new Error("Khong co item nao duoc nhan");
    }

    transfer.status = discrepancies.length > 0 ? "RECEIVED" : "COMPLETED";
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    transfer.receivingNotes = String(req.body.notes || "").trim();
    transfer.discrepancies = discrepancies;
    await transfer.save({ session });

    await session.commitTransaction();

    const refreshed = await getTransferForRead(transfer._id);
    return res.json({
      success: true,
      transfer: refreshed,
      discrepancies,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the nhan transfer",
    });
  } finally {
    session.endSession();
  }
};

export const completeTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay transfer",
      });
    }
    if (transfer.status !== "RECEIVED") {
      return res.status(400).json({
        success: false,
        message: "Chi transfer RECEIVED moi duoc complete",
      });
    }

    transfer.status = "COMPLETED";
    transfer.receivingNotes = [transfer.receivingNotes, req.body.notes]
      .filter(Boolean)
      .join(" | ");
    await transfer.save();

    const refreshed = await getTransferForRead(transfer._id);
    return res.json({
      success: true,
      transfer: refreshed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Khong the complete transfer",
    });
  }
};

export const cancelTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      throw new Error("Khong tim thay transfer");
    }
    if (!TRANSFER_EDITABLE_STATUSES.has(transfer.status)) {
      throw new Error("Chi transfer PENDING/APPROVED moi duoc huy");
    }

    if (transfer.status === "APPROVED") {
      for (const item of transfer.items) {
        const approvedQty = Number(item.approvedQuantity) || 0;
        if (approvedQty <= 0) continue;

        const sourceInventory = await StoreInventory.findOne({
          storeId: transfer.fromStore.storeId,
          productId: item.productId,
          variantSku: item.variantSku,
        }).session(session);

        if (!sourceInventory) continue;
        sourceInventory.reserved = Math.max(
          0,
          (Number(sourceInventory.reserved) || 0) - approvedQty
        );
        await sourceInventory.save({ session });
      }
    }

    transfer.status = "CANCELLED";
    transfer.notes = [transfer.notes, String(req.body.reason || "").trim()]
      .filter(Boolean)
      .join(" | ");
    await transfer.save({ session });

    await session.commitTransaction();

    const refreshed = await getTransferForRead(transfer._id);
    return res.json({
      success: true,
      transfer: refreshed,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: error.message || "Khong the huy transfer",
    });
  } finally {
    session.endSession();
  }
};

export default {
  requestTransfer,
  getTransfers,
  getTransferById,
  approveTransfer,
  rejectTransfer,
  shipTransfer,
  receiveTransfer,
  completeTransfer,
  cancelTransfer,
};
