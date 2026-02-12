// ============================================
// FILE: backend/src/modules/warehouse/warehouseConfigController.js
// Controller quản lý cấu hình kho
// ============================================

import WarehouseConfiguration from "./WarehouseConfiguration.js";
import WarehouseLocation from "./WarehouseLocation.js";
import QRCode from "qrcode";
import mongoose from "mongoose";

// ============================================
// GET ALL WAREHOUSE CONFIGURATIONS
// ============================================
export const getAllWarehouses = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { warehouseCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [warehouses, total] = await Promise.all([
      WarehouseConfiguration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WarehouseConfiguration.countDocuments(filter),
    ]);

    res.json({
      success: true,
      warehouses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting warehouses:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách kho",
      error: error.message,
    });
  }
};

// ============================================
// GET WAREHOUSE BY ID
// ============================================
export const getWarehouseById = async (req, res) => {
  try {
    const warehouse = await WarehouseConfiguration.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho",
      });
    }

    res.json({
      success: true,
      warehouse,
    });
  } catch (error) {
    console.error("Error getting warehouse:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin kho",
      error: error.message,
    });
  }
};

// ============================================
// CREATE WAREHOUSE CONFIGURATION
// ============================================
export const createWarehouse = async (req, res) => {
  try {
    const {
      warehouseCode,
      name,
      address,
      totalArea,
      zones,
      status,
    } = req.body;

    // Validate warehouse code format
    if (!/^WH-[A-Z]{2,10}$/.test(warehouseCode)) {
      return res.status(400).json({
        success: false,
        message:
          "Mã kho không hợp lệ. Định dạng: WH-XXX (VD: WH-HCM, WH-HN)",
      });
    }

    // Check if warehouse code already exists
    const existingWarehouse = await WarehouseConfiguration.findOne({
      warehouseCode,
    });

    if (existingWarehouse) {
      return res.status(400).json({
        success: false,
        message: `Mã kho ${warehouseCode} đã tồn tại`,
      });
    }

    // Validate zones
    if (!zones || zones.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kho phải có ít nhất 1 khu",
      });
    }

    // Calculate estimated locations
    let estimatedLocations = 0;
    for (const zone of zones) {
      estimatedLocations +=
        zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf;
    }

    const warehouse = new WarehouseConfiguration({
      warehouseCode: warehouseCode.toUpperCase(),
      name,
      address,
      totalArea,
      zones,
      status: status || "PLANNING",
      totalLocations: 0,
      locationsGenerated: false,
      createdBy: req.user._id,
      createdByName: req.user.fullName,
    });

    await warehouse.save();

    res.status(201).json({
      success: true,
      message: `Đã tạo kho ${warehouseCode} với ${estimatedLocations} vị trí dự kiến`,
      warehouse,
      estimatedLocations,
    });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tạo kho",
    });
  }
};

// ============================================
// UPDATE WAREHOUSE CONFIGURATION
// ============================================
export const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseConfiguration.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho",
      });
    }

    // Nếu đã generate locations, không cho sửa cấu trúc
    if (warehouse.locationsGenerated) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể sửa cấu trúc kho đã tạo vị trí. Vui lòng tạo kho mới hoặc xóa vị trí cũ trước.",
      });
    }

    const { name, address, totalArea, zones, status } = req.body;

    // Update fields
    if (name) warehouse.name = name;
    if (address) warehouse.address = address;
    if (totalArea) warehouse.totalArea = totalArea;
    if (zones) warehouse.zones = zones;
    if (status) warehouse.status = status;

    warehouse.updatedBy = req.user._id;
    warehouse.updatedByName = req.user.fullName;

    await warehouse.save();

    res.json({
      success: true,
      message: "Đã cập nhật cấu hình kho",
      warehouse,
    });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật kho",
    });
  }
};

// ============================================
// DELETE WAREHOUSE CONFIGURATION
// ============================================
export const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseConfiguration.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho",
      });
    }

    // Nếu đã generate locations, cảnh báo
    if (warehouse.locationsGenerated) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa kho đã tạo vị trí. Vui lòng xóa tất cả vị trí trước.",
      });
    }

    await warehouse.deleteOne();

    res.json({
      success: true,
      message: "Đã xóa cấu hình kho",
    });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa kho",
      error: error.message,
    });
  }
};

// ============================================
// GENERATE LOCATIONS FROM CONFIGURATION
// ============================================
export const generateLocationsFromConfig = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const warehouse = await WarehouseConfiguration.findById(
      req.params.id
    ).session(session);

    if (!warehouse) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho",
      });
    }

    if (warehouse.locationsGenerated) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Kho này đã tạo vị trí. Không thể tạo lại.",
      });
    }

    const locations = [];
    let totalGenerated = 0;

    // Generate locations for each zone
    for (const zone of warehouse.zones) {
      for (let aisleNum = 1; aisleNum <= zone.aisles; aisleNum++) {
        for (let shelfNum = 1; shelfNum <= zone.shelvesPerAisle; shelfNum++) {
          for (let binNum = 1; binNum <= zone.binsPerShelf; binNum++) {
            const locationCode = `${warehouse.warehouseCode}-${
              zone.code
            }-${String(aisleNum).padStart(2, "0")}-${String(shelfNum).padStart(
              2,
              "0"
            )}-${String(binNum).padStart(2, "0")}`;

            const qrData = JSON.stringify({
              locationCode,
              warehouse: warehouse.warehouseCode,
              zone: zone.code,
              zoneName: zone.name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity: zone.capacityPerBin,
            });

            const qrCode = await QRCode.toDataURL(qrData);

            const location = new WarehouseLocation({
              locationCode,
              warehouse: warehouse.warehouseCode,
              zone: zone.code,
              zoneName: zone.name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity: zone.capacityPerBin,
              productCategories: zone.productCategories || [],
              qrCode,
              status: zone.status,
            });

            locations.push(location);
            totalGenerated++;
          }
        }
      }
    }

    // Insert all locations
    await WarehouseLocation.insertMany(locations, { session });

    // Update warehouse config
    warehouse.locationsGenerated = true;
    warehouse.totalLocations = totalGenerated;
    warehouse.status = "ACTIVE";
    await warehouse.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Đã tạo ${totalGenerated} vị trí kho thành công`,
      warehouse,
      totalLocations: totalGenerated,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error generating locations:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo vị trí kho",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET WAREHOUSE STATISTICS
// ============================================
export const getWarehouseStats = async (req, res) => {
  try {
    const warehouse = await WarehouseConfiguration.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho",
      });
    }

    // Calculate stats
    const stats = {
      totalZones: warehouse.zones.length,
      totalEstimatedLocations: warehouse.estimatedLocations,
      totalActualLocations: warehouse.totalLocations,
      totalCapacity: warehouse.calculateTotalCapacity(),
      locationsGenerated: warehouse.locationsGenerated,
      status: warehouse.status,
      zones: warehouse.zones.map((zone) => ({
        code: zone.code,
        name: zone.name,
        area: zone.area,
        estimatedLocations:
          zone.aisles * zone.shelvesPerAisle * zone.binsPerShelf,
        capacity:
          zone.aisles *
          zone.shelvesPerAisle *
          zone.binsPerShelf *
          zone.capacityPerBin,
        aisles: zone.aisles,
        shelvesPerAisle: zone.shelvesPerAisle,
        binsPerShelf: zone.binsPerShelf,
        capacityPerBin: zone.capacityPerBin,
      })),
    };

    // If locations generated, get usage stats
    if (warehouse.locationsGenerated) {
      const locations = await WarehouseLocation.find({
        warehouse: warehouse.warehouseCode,
      });

      stats.locationsInUse = locations.filter((l) => l.currentLoad > 0).length;
      stats.emptyLocations = locations.filter((l) => l.currentLoad === 0).length;
      stats.averageFillRate =
        locations.reduce((sum, l) => sum + (l.currentLoad / l.capacity) * 100, 0) /
        locations.length;
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting warehouse stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê kho",
      error: error.message,
    });
  }
};

export default {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  generateLocationsFromConfig,
  getWarehouseStats,
};
