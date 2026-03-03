import WarehouseLocation from "./WarehouseLocation.js";
import Inventory from "./Inventory.js";
import PurchaseOrder from "./PurchaseOrder.js";
import UniversalProduct, { UniversalVariant } from "../product/UniversalProduct.js";
import QRCode from "qrcode";
import { normalizeWarehouseCategory } from "../../lib/productClassification.js";
import {
  ensureWarehouseWriteBranchId,
  resolveWarehouseStore,
} from "./warehouseContext.js";

const getActorName = (user) =>
  user?.fullName?.trim() || user?.name?.trim() || user?.email?.trim() || "Unknown";

const toInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
};

const generatePoNumber = async (storeCode) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PO-${storeCode}-${year}${month}-`;

  const countInPrefix = await PurchaseOrder.countDocuments({
    poNumber: { $regex: `^${prefix}` },
  });

  let sequence = countInPrefix + 1;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `${prefix}${String(sequence).padStart(4, "0")}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await PurchaseOrder.findOne({ poNumber: candidate }).select("_id");
    if (!existing) {
      return candidate;
    }
    sequence += 1;
  }

  return `${prefix}${Date.now()}`;
};

export const generateWarehouseStructure = async (req, res) => {
  try {
    const storeId = ensureWarehouseWriteBranchId(req);
    const store = await resolveWarehouseStore(req, { branchId: storeId });
    const { warehouse, zones } = req.body;

    if (!Array.isArray(zones) || zones.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Zones must be a non-empty array",
      });
    }

    const warehouseCode = String(warehouse || store.code || "").trim().toUpperCase();
    if (!warehouseCode) {
      return res.status(400).json({
        success: false,
        message: "Warehouse code is required",
      });
    }

    const locations = [];

    for (const zone of zones) {
      const code = String(zone?.code || "").trim().toUpperCase();
      const name = String(zone?.name || "").trim();
      const aisles = Math.max(1, toInt(zone?.aisles, 1));
      const shelvesPerAisle = Math.max(1, toInt(zone?.shelvesPerAisle, 1));
      const binsPerShelf = Math.max(1, toInt(zone?.binsPerShelf, 1));
      const capacity = Math.max(1, toInt(zone?.capacity, 100));
      const categories = Array.isArray(zone?.categories) ? zone.categories : [];

      if (!code || !name) {
        return res.status(400).json({
          success: false,
          message: "Each zone must include code and name",
        });
      }

      for (let aisleNum = 1; aisleNum <= aisles; aisleNum += 1) {
        for (let shelfNum = 1; shelfNum <= shelvesPerAisle; shelfNum += 1) {
          for (let binNum = 1; binNum <= binsPerShelf; binNum += 1) {
            const locationCode = `${warehouseCode}-${code}-${String(aisleNum).padStart(2, "0")}-${String(
              shelfNum
            ).padStart(2, "0")}-${String(binNum).padStart(2, "0")}`;

            const qrData = JSON.stringify({
              storeId,
              locationCode,
              warehouse: warehouseCode,
              zone: code,
              zoneName: name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity,
            });

            // eslint-disable-next-line no-await-in-loop
            const qrCode = await QRCode.toDataURL(qrData);

            locations.push({
              storeId,
              locationCode,
              warehouse: warehouseCode,
              zone: code,
              zoneName: name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity,
              productCategories: categories,
              qrCode,
            });
          }
        }
      }
    }

    await WarehouseLocation.insertMany(locations);

    return res.status(201).json({
      success: true,
      message: `Created ${locations.length} warehouse locations`,
      count: locations.length,
    });
  } catch (error) {
    console.error("Error generating warehouse structure:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to generate warehouse structure",
    });
  }
};

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

    return res.json({
      success: true,
      locations,
      count: locations.length,
    });
  } catch (error) {
    console.error("Error getting locations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get warehouse locations",
      error: error.message,
    });
  }
};

export const getLocationDetail = async (req, res) => {
  try {
    const { locationCode } = req.params;

    const location = await WarehouseLocation.findOne({ locationCode });
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Warehouse location not found",
      });
    }

    const inventory = await Inventory.find({ locationId: location._id }).populate(
      "productId",
      "name images"
    );

    return res.json({
      success: true,
      location,
      inventory,
    });
  } catch (error) {
    console.error("Error getting location detail:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get warehouse location detail",
      error: error.message,
    });
  }
};

export const searchInventory = async (req, res) => {
  try {
    const { sku, productName } = req.query;

    const filter = {};
    if (sku) filter.sku = sku;
    if (productName) filter.productName = { $regex: productName, $options: "i" };

    const inventory = await Inventory.find(filter)
      .populate("locationId", "locationCode zoneName")
      .populate("productId", "name images");

    const totalStock = inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return res.json({
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
    return res.status(500).json({
      success: false,
      message: "Failed to search inventory",
      error: error.message,
    });
  }
};

export const suggestLocation = async (req, res) => {
  try {
    const { sku, category, quantity } = req.body;
    const requiredQuantity = Math.max(1, Number(quantity) || 1);
    const normalizedCategory = normalizeWarehouseCategory(category);

    const availableLocations = await WarehouseLocation.find({
      status: "ACTIVE",
      $expr: { $lt: ["$currentLoad", "$capacity"] },
    }).sort({
      currentLoad: -1,
      aisle: 1,
    });

    let suggestions = availableLocations;

    if (normalizedCategory) {
      const categoryMatched = availableLocations.filter((location) => {
        const normalizedLocationCategories = (location.productCategories || [])
          .map((item) => normalizeWarehouseCategory(item))
          .filter(Boolean);

        if (normalizedLocationCategories.length === 0) return true;
        return normalizedLocationCategories.includes(normalizedCategory);
      });

      if (categoryMatched.length > 0) {
        suggestions = categoryMatched;
      }
    }

    suggestions = suggestions.slice(0, 5);

    const locationsWithSameSku = await Inventory.find({ sku }).populate("locationId").limit(3);

    const recommended = [];

    for (const inventory of locationsWithSameSku) {
      if (inventory.locationId && inventory.locationId.canAccommodate(requiredQuantity)) {
        recommended.push({
          ...inventory.locationId.toObject(),
          priority: "HIGH",
          reason: `Already has ${inventory.quantity} units with the same SKU`,
          currentSKU: sku,
        });
      }
    }

    for (const location of suggestions) {
      if (!recommended.find((item) => item.locationCode === location.locationCode)) {
        if (location.canAccommodate(requiredQuantity)) {
          recommended.push({
            ...location.toObject(),
            priority: "MEDIUM",
            reason: `Remaining capacity ${location.capacity - location.currentLoad}/${location.capacity}`,
          });
        }
      }
    }

    return res.json({
      success: true,
      suggestions: recommended.slice(0, 3),
    });
  } catch (error) {
    console.error("Error suggesting location:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to suggest location",
      error: error.message,
    });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const storeId = ensureWarehouseWriteBranchId(req);
    const store = await resolveWarehouseStore(req, { branchId: storeId });

    const { supplier, items, expectedDeliveryDate, paymentTerm, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "PO items are required",
      });
    }

    const poNumber = await generatePoNumber(store.code || "BRANCH");

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const orderedQuantity = Number(item.orderedQuantity);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid ordered quantity for SKU: ${item.sku || "N/A"}`,
        });
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid unit price for SKU: ${item.sku || "N/A"}`,
        });
      }

      // eslint-disable-next-line no-await-in-loop
      const product = await UniversalProduct.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      // eslint-disable-next-line no-await-in-loop
      const variant = await UniversalVariant.findOne({
        sku: item.sku,
        productId: product._id,
      }).select("_id sku productId");
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `SKU ${item.sku} not found in product ${product.name}`,
        });
      }

      const totalPrice = orderedQuantity * unitPrice;
      subtotal += totalPrice;

      processedItems.push({
        sku: item.sku,
        productId: product._id,
        productName: product.name,
        orderedQuantity,
        unitPrice,
        totalPrice,
      });
    }

    const vat = subtotal * 0.1;
    const shippingFee = Number(req.body.shippingFee) || 0;
    const total = subtotal + vat + shippingFee;

    const paymentDueDate = new Date(expectedDeliveryDate);
    if (paymentTerm === "NET7") paymentDueDate.setDate(paymentDueDate.getDate() + 7);
    else if (paymentTerm === "NET30") paymentDueDate.setDate(paymentDueDate.getDate() + 30);
    else if (paymentTerm === "NET60") paymentDueDate.setDate(paymentDueDate.getDate() + 60);

    const po = new PurchaseOrder({
      storeId,
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
      createdByName: getActorName(req.user),
      notes,
      status: "PENDING",
    });

    await po.save();

    return res.status(201).json({
      success: true,
      message: "Purchase order created",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to create purchase order",
    });
  }
};

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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      PurchaseOrder.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      purchaseOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error getting purchase orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get purchase orders",
      error: error.message,
    });
  }
};

export const getPurchaseOrderDetail = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    return res.json({
      success: true,
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Error getting purchase order detail:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get purchase order detail",
      error: error.message,
    });
  }
};

export const approvePurchaseOrder = async (req, res) => {
  try {
    ensureWarehouseWriteBranchId(req);

    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (po.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is not in pending state",
      });
    }

    po.status = "CONFIRMED";
    po.approvedBy = req.user._id;
    po.approvedByName = getActorName(req.user);
    po.approvedAt = new Date();

    await po.save();

    return res.json({
      success: true,
      message: "Purchase order approved",
      purchaseOrder: po,
    });
  } catch (error) {
    console.error("Error approving purchase order:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to approve purchase order",
    });
  }
};

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
