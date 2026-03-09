import Device from "./Device.js";
import DeviceLifecycleHistory from "./DeviceLifecycleHistory.js";
import { SERVICE_STATES } from "./afterSalesConfig.js";
import {
  buildError,
  createLifecycleEvent,
  getActorName,
  registerSerializedUnits,
} from "./deviceService.js";

const parsePagination = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

export const listDevices = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    const variantSku = String(req.query.variantSku || "").trim();
    const inventoryState = String(req.query.inventoryState || "").trim().toUpperCase();
    const serviceState = String(req.query.serviceState || "").trim().toUpperCase();
    const identifier = String(req.query.identifier || "").trim();

    if (variantSku) filter.variantSku = variantSku;
    if (inventoryState) filter.inventoryState = inventoryState;
    if (serviceState) filter.serviceState = serviceState;
    if (identifier) {
      filter.$or = [
        { imei: { $regex: identifier, $options: "i" } },
        { serialNumber: { $regex: identifier, $options: "i" } },
      ];
    }

    const [devices, total] = await Promise.all([
      Device.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Device.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        devices,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to load devices",
    });
  }
};

export const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id).lean();
    if (!device) {
      throw buildError("Device not found", 404, "DEVICE_NOT_FOUND");
    }

    res.json({
      success: true,
      data: { device },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to load device detail",
    });
  }
};

export const getDeviceHistory = async (req, res) => {
  try {
    const history = await DeviceLifecycleHistory.find({ deviceId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to load device history",
    });
  }
};

export const registerDevice = async (req, res) => {
  try {
    const payload = {
      storeId: req.body.storeId || req.authz?.activeBranchId,
      warehouseLocationId: req.body.warehouseLocationId,
      warehouseLocationCode: req.body.warehouseLocationCode,
      productId: req.body.productId,
      variantId: req.body.variantId,
      variantSku: req.body.variantSku,
      productName: req.body.productName,
      variantName: req.body.variantName,
      serializedUnits: Array.isArray(req.body.serializedUnits)
        ? req.body.serializedUnits
        : [{ imei: req.body.imei, serialNumber: req.body.serialNumber }],
      notes: req.body.notes,
      actor: req.user,
    };

    const devices = await registerSerializedUnits(payload);
    res.status(201).json({
      success: true,
      data: {
        devices,
      },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to register device",
    });
  }
};

export const importDevices = async (req, res) => {
  try {
    const {
      storeId,
      warehouseLocationId,
      warehouseLocationCode,
      productId,
      variantId,
      variantSku,
      productName,
      variantName,
      serializedUnits = [],
      notes,
    } = req.body;

    if (!Array.isArray(serializedUnits) || serializedUnits.length === 0) {
      throw buildError("serializedUnits is required", 400, "DEVICE_IMPORT_REQUIRED");
    }

    const devices = await registerSerializedUnits({
      storeId: storeId || req.authz?.activeBranchId,
      warehouseLocationId,
      warehouseLocationCode,
      productId,
      variantId,
      variantSku,
      productName,
      variantName,
      serializedUnits,
      notes,
      actor: req.user,
    });

    res.status(201).json({
      success: true,
      data: {
        devices,
        imported: devices.length,
      },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to import devices",
    });
  }
};

export const getAvailableDevices = async (req, res) => {
  try {
    const filter = {
      inventoryState: "IN_STOCK",
    };

    if (req.query.variantSku) filter.variantSku = String(req.query.variantSku).trim();
    if (req.query.storeId) filter.storeId = req.query.storeId;
    if (req.query.locationId) filter.warehouseLocationId = req.query.locationId;

    const devices = await Device.find(filter)
      .sort({ receivedAt: 1, createdAt: 1 })
      .limit(Math.min(100, Math.max(1, Number(req.query.limit) || 50)))
      .lean();

    res.json({
      success: true,
      data: { devices },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to load available devices",
    });
  }
};

export const updateDeviceServiceState = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      throw buildError("Device not found", 404, "DEVICE_NOT_FOUND");
    }

    const nextServiceState = String(req.body.serviceState || "").trim().toUpperCase();
    if (!Object.values(SERVICE_STATES).includes(nextServiceState)) {
      throw buildError("Invalid service state", 400, "DEVICE_SERVICE_STATE_INVALID");
    }

    const previousServiceState = device.serviceState;
    device.serviceState = nextServiceState;
    if (req.body.notes !== undefined) {
      device.notes = String(req.body.notes || "").trim();
    }
    await device.save();

    await createLifecycleEvent({
      deviceId: device._id,
      storeId: device.storeId,
      eventType: "SERVICE_STATE_UPDATED",
      fromInventoryState: device.inventoryState,
      toInventoryState: device.inventoryState,
      fromServiceState: previousServiceState,
      toServiceState: nextServiceState,
      actorId: req.user?._id || null,
      actorName: getActorName(req.user),
      note: String(req.body.notes || "").trim(),
      referenceType: "DEVICE",
      referenceId: String(device._id),
    });

    res.json({
      success: true,
      data: { device },
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to update device service state",
    });
  }
};

export default {
  getAvailableDevices,
  getDeviceById,
  getDeviceHistory,
  importDevices,
  listDevices,
  registerDevice,
  updateDeviceServiceState,
};
