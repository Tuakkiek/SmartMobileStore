// ============================================
// FILE: backend/src/modules/warehouse/stockOperationsController.js
// Controllers cho xuất kho, chuyển kho, kiểm kê
// ============================================

import Inventory from "./Inventory.js";
import WarehouseLocation from "./WarehouseLocation.js";
import StockMovement from "./StockMovement.js";
import CycleCount from "./CycleCount.js";
import Order from "../order/Order.js";
import mongoose from "mongoose";

// ============================================
// PHẦN 1: XUẤT KHO (PICK)
// ============================================

/**
 * Lấy danh sách pick cho đơn hàng
 * GET /api/warehouse/pick-list/:orderId
 */
export const getPickList = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const pickList = [];

    for (const item of order.items) {
      const sku = item.sku || item.variantSku;
      if (!sku) continue;

      // Tìm các vị trí có hàng
      const inventoryItems = await Inventory.find({
        sku,
        quantity: { $gt: 0 },
        status: "GOOD",
      })
        .populate("locationId", "locationCode zoneName aisle shelf bin")
        .sort({ quantity: -1 });

      let remainingQty = item.quantity;
      const locations = [];

      for (const inv of inventoryItems) {
        if (remainingQty <= 0) break;

        const pickQty = Math.min(inv.quantity, remainingQty);
        locations.push({
          locationCode: inv.locationCode,
          zoneName: inv.locationId?.zoneName || "",
          aisle: inv.locationId?.aisle || "",
          shelf: inv.locationId?.shelf || "",
          bin: inv.locationId?.bin || "",
          availableQty: inv.quantity,
          pickQty,
        });

        remainingQty -= pickQty;
      }

      pickList.push({
        sku,
        productName: item.name || item.productName,
        requiredQty: item.quantity,
        locations,
        fulfilled: remainingQty <= 0,
      });
    }

    res.json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderSource: order.orderSource,
      fulfillmentType: order.fulfillmentType,
      orderStatus: order.status,
      pickList,
    });
  } catch (error) {
    console.error("Error getting pick list:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách pick",
      error: error.message,
    });
  }
};

/**
 * Xác nhận lấy hàng
 * POST /api/warehouse/pick
 */
export const pickItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, sku, locationCode, quantity } = req.body;

    // Tìm inventory
    const location = await WarehouseLocation.findOne({ locationCode }).session(session);
    if (!location) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Không tìm thấy vị trí" });
    }

    const inventory = await Inventory.findOne({
      sku,
      locationId: location._id,
    }).session(session);

    if (!inventory || inventory.quantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Không đủ hàng tại ${locationCode}. Tồn: ${inventory?.quantity || 0}`,
      });
    }

    // Trừ tồn kho
    inventory.quantity -= quantity;
    await inventory.save({ session });

    // Cập nhật location
    location.currentLoad = Math.max(0, location.currentLoad - quantity);
    await location.save({ session });

    // Ghi log
    const movement = new StockMovement({
      type: "OUTBOUND",
      sku,
      productId: inventory.productId,
      productName: inventory.productName,
      fromLocationId: location._id,
      fromLocationCode: locationCode,
      quantity,
      referenceType: "ORDER",
      referenceId: orderId,
      performedBy: req.user._id,
      performedByName: req.user.name,
    });
    await movement.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Đã lấy ${quantity} ${inventory.productName}`,
      remaining: inventory.quantity,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error picking item:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy hàng", error: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================
// PHẦN 2: CHUYỂN KHO
// ============================================

/**
 * Chuyển hàng giữa các vị trí
 * POST /api/warehouse/transfer
 */
export const transferStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { sku, fromLocationCode, toLocationCode, quantity, reason, notes } = req.body;

    // Validate locations
    const fromLocation = await WarehouseLocation.findOne({ locationCode: fromLocationCode }).session(session);
    const toLocation = await WarehouseLocation.findOne({ locationCode: toLocationCode }).session(session);

    if (!fromLocation || !toLocation) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Không tìm thấy vị trí kho" });
    }

    // Check source inventory
    const fromInventory = await Inventory.findOne({ sku, locationId: fromLocation._id }).session(session);
    if (!fromInventory || fromInventory.quantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Không đủ hàng tại ${fromLocationCode}. Tồn: ${fromInventory?.quantity || 0}`,
      });
    }

    // Check destination capacity
    if (!toLocation.canAccommodate(quantity)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Vị trí đích không đủ chỗ" });
    }

    // Trừ source
    fromInventory.quantity -= quantity;
    await fromInventory.save({ session });
    fromLocation.currentLoad = Math.max(0, fromLocation.currentLoad - quantity);
    await fromLocation.save({ session });

    // Cộng destination
    let toInventory = await Inventory.findOne({ sku, locationId: toLocation._id }).session(session);
    if (toInventory) {
      toInventory.quantity += quantity;
      await toInventory.save({ session });
    } else {
      toInventory = new Inventory({
        sku,
        productId: fromInventory.productId,
        productName: fromInventory.productName,
        locationId: toLocation._id,
        locationCode: toLocationCode,
        quantity,
        status: fromInventory.status,
      });
      await toInventory.save({ session });
    }
    toLocation.currentLoad += quantity;
    await toLocation.save({ session });

    // Ghi log
    const movement = new StockMovement({
      type: "TRANSFER",
      sku,
      productId: fromInventory.productId,
      productName: fromInventory.productName,
      fromLocationId: fromLocation._id,
      fromLocationCode,
      toLocationId: toLocation._id,
      toLocationCode,
      quantity,
      referenceType: "TRANSFER",
      referenceId: `TF-${Date.now()}`,
      performedBy: req.user._id,
      performedByName: req.user.name,
      notes: `${reason || ""} ${notes || ""}`.trim(),
    });
    await movement.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Đã chuyển ${quantity} từ ${fromLocationCode} đến ${toLocationCode}`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error transferring stock:", error);
    res.status(500).json({ success: false, message: "Lỗi khi chuyển kho", error: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================
// PHẦN 3: KIỂM KÊ (CYCLE COUNT)
// ============================================

/**
 * Tạo phiếu kiểm kê
 * POST /api/warehouse/cycle-count
 */
export const createCycleCount = async (req, res) => {
  try {
    const { scope, zones, aisles, notes } = req.body;

    const count = await CycleCount.countDocuments();
    const ccNumber = `CC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    // Lấy danh sách items cần kiểm
    const filter = { status: "ACTIVE" };
    if (zones?.length) filter.zone = { $in: zones };
    if (aisles?.length) filter.aisle = { $in: aisles };

    const locations = await WarehouseLocation.find(filter);
    const items = [];

    for (const loc of locations) {
      const inventoryItems = await Inventory.find({ locationId: loc._id });
      for (const inv of inventoryItems) {
        items.push({
          sku: inv.sku,
          productId: inv.productId,
          productName: inv.productName,
          locationId: loc._id,
          locationCode: loc.locationCode,
          systemQuantity: inv.quantity,
          countedQuantity: null,
          variance: null,
          status: "PENDING",
        });
      }
    }

    const cycleCount = new CycleCount({
      ccNumber,
      scope: scope || "PARTIAL",
      assignedTo: req.user._id,
      assignedToName: req.user.name,
      items,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      notes,
    });

    await cycleCount.save();

    res.status(201).json({
      success: true,
      message: `Đã tạo phiếu kiểm kê ${ccNumber} với ${items.length} mục`,
      cycleCount,
    });
  } catch (error) {
    console.error("Error creating cycle count:", error);
    res.status(500).json({ success: false, message: "Lỗi khi tạo phiếu kiểm kê", error: error.message });
  }
};

/**
 * Lấy danh sách phiếu kiểm kê
 * GET /api/warehouse/cycle-count
 */
export const getCycleCounts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [cycleCounts, total] = await Promise.all([
      CycleCount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      CycleCount.countDocuments(filter),
    ]);

    res.json({
      success: true,
      cycleCounts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error getting cycle counts:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách kiểm kê", error: error.message });
  }
};

/**
 * Cập nhật kết quả kiểm kê cho 1 item
 * PUT /api/warehouse/cycle-count/:id/update-item
 */
export const updateCycleCountItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, locationCode, countedQuantity } = req.body;

    const cycleCount = await CycleCount.findById(id);
    if (!cycleCount) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu kiểm kê" });
    }

    const item = cycleCount.items.find((i) => i.sku === sku && i.locationCode === locationCode);
    if (!item) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mục kiểm kê" });
    }

    item.countedQuantity = countedQuantity;
    item.variance = countedQuantity - item.systemQuantity;
    item.status = item.variance === 0 ? "MATCHED" : "VARIANCE";
    item.countedAt = new Date();
    item.countedBy = req.user._id;

    await cycleCount.save();

    res.json({ success: true, message: "Đã cập nhật", item });
  } catch (error) {
    console.error("Error updating cycle count item:", error);
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật kiểm kê", error: error.message });
  }
};

/**
 * Hoàn thành kiểm kê
 * PUT /api/warehouse/cycle-count/:id/complete
 */
export const completeCycleCount = async (req, res) => {
  try {
    const cycleCount = await CycleCount.findById(req.params.id);
    if (!cycleCount) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu kiểm kê" });
    }

    // Tính summary
    const totalItems = cycleCount.items.length;
    const counted = cycleCount.items.filter((i) => i.countedQuantity !== null).length;
    const matched = cycleCount.items.filter((i) => i.variance === 0).length;
    const variances = cycleCount.items.filter((i) => i.variance !== 0 && i.countedQuantity !== null).length;

    cycleCount.summary = { totalItems, counted, matched, variances };
    cycleCount.status = "COMPLETED";
    cycleCount.completedAt = new Date();

    await cycleCount.save();

    res.json({ success: true, message: "Đã hoàn thành kiểm kê", cycleCount });
  } catch (error) {
    console.error("Error completing cycle count:", error);
    res.status(500).json({ success: false, message: "Lỗi khi hoàn thành kiểm kê", error: error.message });
  }
};

/**
 * Duyệt kiểm kê và điều chỉnh tồn kho
 * PUT /api/warehouse/cycle-count/:id/approve
 */
export const approveCycleCount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cycleCount = await CycleCount.findById(req.params.id).session(session);
    if (!cycleCount) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu kiểm kê" });
    }

    if (cycleCount.status !== "COMPLETED") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Phiếu chưa hoàn thành" });
    }

    // Điều chỉnh tồn kho cho các mục có chênh lệch
    for (const item of cycleCount.items) {
      if (item.variance && item.variance !== 0) {
        const inventory = await Inventory.findOne({
          sku: item.sku,
          locationId: item.locationId,
        }).session(session);

        if (inventory) {
          inventory.quantity = item.countedQuantity;
          await inventory.save({ session });

          // Ghi log adjustment
          const movement = new StockMovement({
            type: "ADJUSTMENT",
            sku: item.sku,
            productId: item.productId,
            productName: item.productName,
            toLocationId: item.locationId,
            toLocationCode: item.locationCode,
            quantity: Math.abs(item.variance),
            referenceType: "CYCLE_COUNT",
            referenceId: cycleCount.ccNumber,
            performedBy: req.user._id,
            performedByName: req.user.name,
            notes: `Điều chỉnh kiểm kê: ${item.variance > 0 ? "+" : ""}${item.variance}`,
          });
          await movement.save({ session });
        }
      }
    }

    cycleCount.status = "APPROVED";
    cycleCount.approvedBy = req.user._id;
    cycleCount.approvedByName = req.user.name;
    cycleCount.approvedAt = new Date();
    await cycleCount.save({ session });

    await session.commitTransaction();

    res.json({ success: true, message: "Đã duyệt và điều chỉnh tồn kho", cycleCount });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error approving cycle count:", error);
    res.status(500).json({ success: false, message: "Lỗi khi duyệt kiểm kê", error: error.message });
  } finally {
    session.endSession();
  }
};

export default {
  getPickList,
  pickItem,
  transferStock,
  createCycleCount,
  getCycleCounts,
  updateCycleCountItem,
  completeCycleCount,
  approveCycleCount,
};
