// ============================================
// FILE: backend/src/modules/warehouse/warehouseController.js
// Controllers cho quản lý kho
// ============================================

import WarehouseLocation from "./WarehouseLocation.js";
import Inventory from "./Inventory.js";
import StockMovement from "./StockMovement.js";
import PurchaseOrder from "./PurchaseOrder.js";
import GoodsReceipt from "./GoodsReceipt.js";
import CycleCount from "./CycleCount.js";
import UniversalProduct from "../product/UniversalProduct.js";
import QRCode from "qrcode";

// ============================================
// PHẦN 1: QUẢN LÝ CẤU TRÚC KHO
// ============================================

/**
 * Tạo cấu trúc kho tự động
 * POST /api/warehouse/locations/generate
 */
export const generateWarehouseStructure = async (req, res) => {
  try {
    const { warehouse, zones } = req.body;

    const locations = [];

    for (const zone of zones) {
      const { code, name, area, aisles, shelvesPerAisle, binsPerShelf, capacity, categories } = zone;

      for (let aisleNum = 1; aisleNum <= aisles; aisleNum++) {
        for (let shelfNum = 1; shelfNum <= shelvesPerAisle; shelfNum++) {
          for (let binNum = 1; binNum <= binsPerShelf; binNum++) {
            const locationCode = `${warehouse}-${code}-${String(aisleNum).padStart(2, "0")}-${String(shelfNum).padStart(2, "0")}-${String(binNum).padStart(2, "0")}`;

            const qrData = JSON.stringify({
              locationCode,
              warehouse,
              zone: code,
              zoneName: name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity,
            });

            const qrCode = await QRCode.toDataURL(qrData);

            const location = new WarehouseLocation({
              locationCode,
              warehouse,
              zone: code,
              zoneName: name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity,
              productCategories: categories || [],
              qrCode,
            });

            locations.push(location);
          }
        }
      }
    }

    await WarehouseLocation.insertMany(locations);

    res.status(201).json({
      success: true,
      message: `Đã tạo ${locations.length} vị trí kho`,
      count: locations.length,
    });
  } catch (error) {
    console.error("Error generating warehouse structure:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo cấu trúc kho",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách tất cả vị trí kho
 * GET /api/warehouse/locations
 */
export const getAllLocations = async (req, res) => {
  try {
    const { zone, aisle, status, search } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (aisle) filter.aisle = aisle;
    if (status) filter.status = status;
    if (search) {
      filter.locationCode = { $regex: search, $options: "i" };
    }

    const locations = await WarehouseLocation.find(filter).sort({ locationCode: 1 });

    res.json({
      success: true,
      locations,
      count: locations.length,
    });
  } catch (error) {
    console.error("Error getting locations:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách vị trí",
      error: error.message,
    });
  }
};

/**
 * Lấy chi tiết 1 vị trí kho
 * GET /api/warehouse/locations/:locationCode
 */
export const getLocationDetail = async (req, res) => {
  try {
    const { locationCode } = req.params;

    const location = await WarehouseLocation.findOne({ locationCode });
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí kho",
      });
    }

    // Lấy danh sách sản phẩm đang lưu tại vị trí này
    const inventory = await Inventory.find({ locationId: location._id }).populate("productId", "name images");

    res.json({
      success: true,
      location,
      inventory,
    });
  } catch (error) {
    console.error("Error getting location detail:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết vị trí",
      error: error.message,
    });
  }
};

// ============================================
// PHẦN 2: QUẢN LÝ TỒN KHO
// ============================================

/**
 * Tìm kiếm sản phẩm trong kho
 * GET /api/warehouse/inventory/search
 */
export const searchInventory = async (req, res) => {
  try {
    const { sku, productName } = req.query;

    const filter = {};
    if (sku) filter.sku = sku;
    if (productName) filter.productName = { $regex: productName, $options: "i" };

    const inventory = await Inventory.find(filter)
      .populate("locationId", "locationCode zoneName")
      .populate("productId", "name images");

    // Tổng hợp theo SKU
    const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      inventory,
      totalStock,
      locations: inventory.map((item) => ({
        locationCode: item.locationCode,
        quantity: item.quantity,
        status: item.status,
      })),
    });
  } catch (error) {
    console.error("Error searching inventory:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm tồn kho",
      error: error.message,
    });
  }
};

/**
 * Đề xuất vị trí lưu kho cho sản phẩm
 * POST /api/warehouse/locations/suggest
 */
export const suggestLocation = async (req, res) => {
  try {
    const { sku, category, quantity } = req.body;

    // Tìm vị trí phù hợp
    const suggestions = await WarehouseLocation.find({
      productCategories: category,
      status: "ACTIVE",
      $expr: { $lt: ["$currentLoad", "$capacity"] },
    })
      .sort({
        currentLoad: -1, // Ưu tiên ô gần đầy
        aisle: 1, // Ưu tiên dãy gần cửa
      })
      .limit(5);

    // Check xem có vị trí nào đang chứa cùng SKU không
    const locationsWithSameSKU = await Inventory.find({ sku })
      .populate("locationId")
      .limit(3);

    const recommended = [];

    // Ưu tiên vị trí đang có cùng SKU
    for (const inv of locationsWithSameSKU) {
      if (inv.locationId && inv.locationId.canAccommodate(quantity)) {
        recommended.push({
          ...inv.locationId.toObject(),
          priority: "HIGH",
          reason: `Đang có ${inv.quantity} chiếc cùng SKU`,
          currentSKU: sku,
        });
      }
    }

    // Thêm các vị trí khác
    for (const loc of suggestions) {
      if (!recommended.find((r) => r.locationCode === loc.locationCode)) {
        if (loc.canAccommodate(quantity)) {
          recommended.push({
            ...loc.toObject(),
            priority: "MEDIUM",
            reason: `Trống ${loc.capacity - loc.currentLoad}/${loc.capacity}`,
          });
        }
      }
    }

    res.json({
      success: true,
      suggestions: recommended.slice(0, 3),
    });
  } catch (error) {
    console.error("Error suggesting location:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đề xuất vị trí",
      error: error.message,
    });
  }
};

// ============================================
// PHẦN 3: QUẢN LÝ PURCHASE ORDER
// ============================================

/**
 * Tạo Purchase Order mới
 * POST /api/warehouse/purchase-orders
 */
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, items, expectedDeliveryDate, paymentTerm, notes } = req.body;

    // Generate PO Number
    const count = await PurchaseOrder.countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const poNumber = `PO-${year}${month}-${String(count + 1).padStart(3, "0")}`;

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await UniversalProduct.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm ID: ${item.productId}`,
        });
      }

      const variant = product.variants.find((v) => v.sku === item.sku);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy SKU: ${item.sku}`,
        });
      }

      const totalPrice = item.orderedQuantity * item.unitPrice;
      subtotal += totalPrice;

      processedItems.push({
        sku: item.sku,
        productId: item.productId,
        productName: product.name,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        totalPrice,
      });
    }

    const vat = subtotal * 0.1; // 10% VAT
    const shippingFee = req.body.shippingFee || 0;
    const total = subtotal + vat + shippingFee;

    // Calculate payment due date based on payment term
    const paymentDueDate = new Date(expectedDeliveryDate);
    if (paymentTerm === "NET7") paymentDueDate.setDate(paymentDueDate.getDate() + 7);
    else if (paymentTerm === "NET30") paymentDueDate.setDate(paymentDueDate.getDate() + 30);
    else if (paymentTerm === "NET60") paymentDueDate.setDate(paymentDueDate.getDate() + 60);

    const po = new PurchaseOrder({
      poNumber,
      supplier,
      items: processedItems,
      subtotal,
      vat,
      shippingFee,
      total,
      paymentTerm,
      expectedDeliveryDate,
      paymentDueDate,
      createdBy: req.user._id,
      createdByName: req.user.name,
      notes,
      status: "PENDING", // Chờ duyệt
    });

    await po.save();

    res.status(201).json({
      success: true,
      message: "Đã tạo đơn đặt hàng",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo đơn đặt hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách Purchase Orders
 * GET /api/warehouse/purchase-orders
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: "i" } },
        { "supplier.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      PurchaseOrder.countDocuments(filter),
    ]);

    res.json({
      success: true,
      purchaseOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting purchase orders:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn đặt hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy chi tiết Purchase Order
 * GET /api/warehouse/purchase-orders/:id
 */
export const getPurchaseOrderDetail = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    res.json({
      success: true,
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Error getting purchase order detail:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết đơn đặt hàng",
      error: error.message,
    });
  }
};

/**
 * Duyệt Purchase Order (Admin/Manager)
 * PUT /api/warehouse/purchase-orders/:id/approve
 */
export const approvePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt hàng",
      });
    }

    if (po.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không ở trạng thái chờ duyệt",
      });
    }

    po.status = "CONFIRMED";
    po.approvedBy = req.user._id;
    po.approvedByName = req.user.name;
    po.approvedAt = new Date();

    await po.save();

    // TODO: Gửi email cho nhà cung cấp

    res.json({
      success: true,
      message: "Đã duyệt đơn đặt hàng",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Error approving purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi duyệt đơn đặt hàng",
      error: error.message,
    });
  }
};

// Export tất cả functions
export default {
  generateWarehouseStructure,
  getAllLocations,
  getLocationDetail,
  searchInventory,
  suggestLocation,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderDetail,
  approvePurchaseOrder,
};
