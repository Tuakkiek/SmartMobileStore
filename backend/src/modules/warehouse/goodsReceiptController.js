// ============================================
// FILE: backend/src/modules/warehouse/goodsReceiptController.js
// Controllers cho chức năng nhận hàng vào kho
// ============================================

import GoodsReceipt from "./GoodsReceipt.js";
import PurchaseOrder from "./PurchaseOrder.js";
import Inventory from "./Inventory.js";
import WarehouseLocation from "./WarehouseLocation.js";
import StockMovement from "./StockMovement.js";
import UniversalProduct from "../product/UniversalProduct.js";
import mongoose from "mongoose";

/**
 * Bắt đầu nhận hàng từ PO
 * POST /api/warehouse/goods-receipt/start
 */
export const startGoodsReceipt = async (req, res) => {
  try {
    const { poId, poNumber } = req.body;

    let po;
    if (poId) {
      po = await PurchaseOrder.findById(poId);
    } else if (poNumber) {
      po = await PurchaseOrder.findOne({ poNumber });
    }

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    if (po.status !== "CONFIRMED") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng chưa được duyệt",
      });
    }

    // Trả về thông tin để nhân viên kho kiểm tra
    res.json({
      success: true,
      purchaseOrder: {
        _id: po._id,
        poNumber: po.poNumber,
        supplier: po.supplier,
        items: po.items.map((item) => ({
          sku: item.sku,
          productId: item.productId,
          productName: item.productName,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          remainingQuantity: item.orderedQuantity - item.receivedQuantity,
        })),
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

    // Validate
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    const poItem = po.items.find((item) => item.sku === sku);
    if (!poItem) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy SKU trong đơn hàng",
      });
    }

    const location = await WarehouseLocation.findOne({ locationCode }).session(session);
    if (!location) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí kho",
      });
    }

    // Kiểm tra sức chứa
    if (!location.canAccommodate(receivedQuantity)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vị trí kho không đủ chỗ",
      });
    }

    // Cập nhật hoặc tạo mới inventory
    let inventory = await Inventory.findOne({
      sku,
      locationId: location._id,
    }).session(session);

    if (inventory) {
      inventory.quantity += receivedQuantity;
      inventory.lastReceived = new Date();
      inventory.status = qualityStatus;
      if (notes) inventory.notes = notes;
      await inventory.save({ session });
    } else {
      inventory = new Inventory({
        sku,
        productId: poItem.productId,
        productName: poItem.productName,
        locationId: location._id,
        locationCode: location.locationCode,
        quantity: receivedQuantity,
        lastReceived: new Date(),
        status: qualityStatus,
        notes,
      });
      await inventory.save({ session });
    }

    // Cập nhật location
    await location.addStock(receivedQuantity);

    // Ghi log stock movement
    const movement = new StockMovement({
      type: "INBOUND",
      sku,
      productId: poItem.productId,
      productName: poItem.productName,
      toLocationId: location._id,
      toLocationCode: location.locationCode,
      quantity: receivedQuantity,
      referenceType: "PO",
      referenceId: po.poNumber,
      performedBy: req.user._id,
      performedByName: req.user.name,
      qualityStatus,
      notes,
    });
    await movement.save({ session });

    // Cập nhật PO item
    poItem.receivedQuantity += receivedQuantity;
    if (damagedQuantity > 0) {
      poItem.damagedQuantity += damagedQuantity;
    }
    await po.save({ session });

    // Cập nhật tổng tồn kho trong UniversalProduct
    const product = await UniversalProduct.findById(poItem.productId).session(session);
    if (product) {
      const variant = product.variants.find((v) => v.sku === sku);
      if (variant) {
        variant.totalStock = (variant.totalStock || 0) + receivedQuantity;
        await product.save({ session });
      }
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

    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    // Generate GRN Number
    const count = await GoodsReceipt.countDocuments();
    const year = new Date().getFullYear();
    const grnNumber = `GRN-${year}-${String(count + 1).padStart(3, "0")}`;

    // Lấy thông tin các items đã nhận
    const receivedItems = [];
    let totalQuantity = 0;
    let totalDamaged = 0;

    for (const poItem of po.items) {
      if (poItem.receivedQuantity > 0) {
        // Tìm vị trí lưu kho
        const inventory = await Inventory.findOne({ sku: poItem.sku }).session(session);

        receivedItems.push({
          sku: poItem.sku,
          productId: poItem.productId,
          productName: poItem.productName,
          orderedQuantity: poItem.orderedQuantity,
          receivedQuantity: poItem.receivedQuantity,
          damagedQuantity: poItem.damagedQuantity,
          locationId: inventory?.locationId,
          locationCode: inventory?.locationCode,
          qualityStatus: inventory?.status || "GOOD",
          unitPrice: poItem.unitPrice,
          totalPrice: poItem.receivedQuantity * poItem.unitPrice,
        });

        totalQuantity += poItem.receivedQuantity;
        totalDamaged += poItem.damagedQuantity;
      }
    }

    // Tạo GRN
    const grn = new GoodsReceipt({
      grnNumber,
      purchaseOrderId: po._id,
      poNumber: po.poNumber,
      supplier: po.supplier,
      items: receivedItems,
      totalQuantity,
      totalDamaged,
      receivedBy: req.user._id,
      receivedByName: req.user.name,
      receivedDate: new Date(),
      deliverySignature,
      notes,
    });

    await grn.save({ session });

    // Cập nhật trạng thái PO
    const allReceived = po.items.every((item) => item.receivedQuantity >= item.orderedQuantity);
    const someReceived = po.items.some((item) => item.receivedQuantity > 0);

    if (allReceived) {
      po.status = "COMPLETED";
    } else if (someReceived) {
      po.status = "PARTIAL";
    }

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

    const filter = {};
    if (search) {
      filter.$or = [
        { grnNumber: { $regex: search, $options: "i" } },
        { poNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [goodsReceipts, total] = await Promise.all([
      GoodsReceipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      GoodsReceipt.countDocuments(filter),
    ]);

    res.json({
      success: true,
      goodsReceipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
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
