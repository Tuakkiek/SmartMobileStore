import Store from "./Store.js";
import StoreInventory from "../inventory/StoreInventory.js";
import User from "../auth/User.js";
import Order from "../order/Order.js";
import { omniLog } from "../../utils/logger.js";

const parseBool = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes"].includes(String(value).toLowerCase());
};

export const getAllStores = async (req, res) => {
  try {
    const {
      status,
      province,
      district,
      type,
      clickAndCollect,
      homeDelivery,
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (province) {
      filter["address.province"] = province;
    }

    if (district) {
      filter["address.district"] = district;
    }

    if (type) {
      filter.type = type;
    }

    const clickAndCollectFlag = parseBool(clickAndCollect);
    if (clickAndCollectFlag !== undefined) {
      filter["services.clickAndCollect"] = clickAndCollectFlag;
    }

    const homeDeliveryFlag = parseBool(homeDelivery);
    if (homeDeliveryFlag !== undefined) {
      filter["services.homeDelivery"] = homeDeliveryFlag;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .sort({ isHeadquarters: -1, "stats.rating": -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(filter),
    ]);

    res.json({
      success: true,
      stores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    omniLog.error("getAllStores failed", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Khong the lay danh sach cua hang",
      error: error.message,
    });
  }
};

export const getNearbyStores = async (req, res) => {
  try {
    const { province, district, limit = 20 } = req.query;

    const baseFilter = {
      status: "ACTIVE",
      "services.clickAndCollect": true,
    };

    if (province) {
      baseFilter["address.province"] = province;
    }

    const stores = await Store.find(baseFilter).limit(Number(limit)).lean();

    const enriched = stores
      .map((store) => {
        let distanceScore = 100;

        if (province && store.address?.province === province) {
          distanceScore -= 40;
        }

        if (district && store.address?.district === district) {
          distanceScore -= 30;
        }

        return {
          ...store,
          distanceScore,
          distance: distanceScore <= 30 ? 2 : distanceScore <= 60 ? 5 : 10,
        };
      })
      .sort((a, b) => a.distanceScore - b.distanceScore);

    res.json({
      success: true,
      stores: enriched,
    });
  } catch (error) {
    omniLog.error("getNearbyStores failed", {
      province: req.query?.province,
      district: req.query?.district,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Khong the tim cua hang gan ban",
      error: error.message,
    });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay cua hang",
      });
    }

    res.json({
      success: true,
      store,
    });
  } catch (error) {
    omniLog.error("getStoreById failed", {
      storeId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Loi khi lay thong tin cua hang",
      error: error.message,
    });
  }
};

export const checkStoreStock = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sach san pham khong hop le",
      });
    }

    const checks = await Promise.all(
      items.map(async (item) => {
        const requiredQty = Number(item.quantity) || 1;

        const inventory = await StoreInventory.findOne({
          storeId,
          productId: item.productId,
          variantSku: item.variantSku,
        }).lean();

        const available = Number(inventory?.available) || 0;
        return {
          productId: item.productId,
          variantSku: item.variantSku,
          required: requiredQty,
          available,
          isAvailable: available >= requiredQty,
        };
      })
    );

    const allAvailable = checks.every((entry) => entry.isAvailable);

    res.json({
      success: true,
      allAvailable,
      checks,
    });
  } catch (error) {
    omniLog.error("checkStoreStock failed", {
      storeId: req.params.storeId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Khong the kiem tra ton kho cua hang",
      error: error.message,
    });
  }
};

// ==========================================
// 🔹 ADMIN: QUẢN LÝ CỬA HÀNG (CRUD)
// ==========================================

// @desc    Tạo cửa hàng mới
// @route   POST /api/stores
// @access  Private/Admin
export const createStore = async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      address,
      phone,
      email,
      manager,
      operatingHours,
      services,
      shippingZones,
      capacity,
      status,
      isHeadquarters,
    } = req.body;

    // Validate required fields
    if (
      !code ||
      !name ||
      !address?.province ||
      !address?.district ||
      !address?.street
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc (Mã, Tên, Địa chỉ)",
      });
    }

    const storeExists = await Store.findOne({ code });
    if (storeExists) {
      return res.status(400).json({
        success: false,
        message: "Mã cửa hàng đã tồn tại",
      });
    }

    const store = await Store.create({
      code,
      name,
      type,
      address,
      phone,
      email,
      manager,
      operatingHours,
      services,
      shippingZones,
      capacity,
      status,
      isHeadquarters,
    });

    res.status(201).json({
      success: true,
      store,
    });
  } catch (error) {
    omniLog.error("createStore failed", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo cửa hàng",
      error: error.message,
    });
  }
};

// @desc    Cập nhật cửa hàng
// @route   PUT /api/stores/:id
// @access  Private/Admin
export const updateStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    const {
      code,
      name,
      type,
      address,
      phone,
      email,
      manager,
      operatingHours,
      services,
      shippingZones,
      capacity,
      status,
      isHeadquarters,
    } = req.body;

    // Validate code uniqueness if changing code
    if (code && code !== store.code) {
      const storeExists = await Store.findOne({ code });
      if (storeExists) {
        return res.status(400).json({
          success: false,
          message: "Mã cửa hàng đã tồn tại",
        });
      }
      store.code = code;
    }

    if (name) store.name = name;
    if (type) store.type = type;
    if (address) store.address = address;
    if (phone) store.phone = phone;
    if (email) store.email = email;
    if (manager) store.manager = manager;
    if (operatingHours) store.operatingHours = operatingHours;
    if (services) store.services = services;
    if (shippingZones) store.shippingZones = shippingZones;
    if (capacity) store.capacity = capacity;
    if (status) store.status = status;
    if (isHeadquarters !== undefined) store.isHeadquarters = isHeadquarters;

    const updatedStore = await store.save();

    res.json({
      success: true,
      store: updatedStore,
    });
  } catch (error) {
    omniLog.error("updateStore failed", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật cửa hàng",
      error: error.message,
    });
  }
};

// @desc    Xóa cửa hàng (Hard delete for now, or just deactivate?)
// @route   DELETE /api/stores/:id
// @access  Private/Admin
export const deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    // Prevent orphaned references and soft-delete only when no child data exists.
    const storeId = store._id;
    const storeIdAsString = String(storeId);
    const employeeScopeFilter = {
      $or: [
        { storeLocation: storeIdAsString },
        { branchAssignments: { $elemMatch: { storeId } } },
      ],
    };

    const [
      legacyEmployeeCount,
      branchAssignmentEmployeeCount,
      employeeCount,
      orderCount,
      inventoryCount,
    ] = await Promise.all([
      User.countDocuments({ storeLocation: storeIdAsString }),
      User.countDocuments({ branchAssignments: { $elemMatch: { storeId } } }),
      User.countDocuments(employeeScopeFilter),
      Order.countDocuments({ "assignedStore.storeId": storeId }),
      // skipBranchIsolation: true — this is a system-level admin operation that must
      // count ALL inventory records for this store regardless of active branch context.
      StoreInventory.countDocuments({ storeId }, { skipBranchIsolation: true }),
    ]);

    if (employeeCount > 0 || orderCount > 0 || inventoryCount > 0) {
      const blockerSummary = [];
      if (employeeCount > 0) blockerSummary.push(`${employeeCount} nhân viên`);
      if (orderCount > 0) blockerSummary.push(`${orderCount} đơn hàng`);
      if (inventoryCount > 0) blockerSummary.push(`${inventoryCount} bản ghi tồn kho`);

      const storeName = store.name || `chi nhánh (ID: ${storeId})`;
      const blockerList = blockerSummary.join(", ");

      return res.status(409).json({
        success: false,
        code: "STORE_DELETE_BLOCKED",
        message:
          `Không thể xóa chi nhánh "${storeName}" vì vẫn còn ${blockerList}. Vui lòng xóa dữ liệu con trước khi xóa chi nhánh.`,
        storeName,
        blockers: {
          usersLegacyStoreLocation: legacyEmployeeCount > 0,
          usersBranchAssignments: branchAssignmentEmployeeCount > 0,
          users: employeeCount > 0,
          orders: orderCount > 0,
          inventory: inventoryCount > 0,
        },
        blockerCounts: {
          usersLegacyStoreLocation: legacyEmployeeCount,
          usersBranchAssignments: branchAssignmentEmployeeCount,
          users: employeeCount,
          orders: orderCount,
          inventory: inventoryCount,
        },
        blockerSummary,
      });
    }

    store.status = "INACTIVE";
    await store.save();

    res.json({
      success: true,
      message: `Đã vô hiệu hóa chi nhánh "${store.name}" thành công`,
    });
  } catch (error) {
    omniLog.error("deleteStore failed", { storeId: req.params.id, error: error.message });
    res.status(500).json({
      success: false,
      message: "Lỗi khi vô hiệu hóa cửa hàng",
      error: error.message,
    });
  }
};

export default {
  getAllStores,
  getNearbyStores,
  getStoreById,
  checkStoreStock,
  createStore,
  updateStore,
  deleteStore,
};
