import mongoose from "mongoose";
import QRCode from "qrcode";
import WarehouseConfiguration from "./WarehouseConfiguration.js";
import WarehouseLocation from "./WarehouseLocation.js";
import Inventory from "./Inventory.js";
import {
  ensureWarehouseWriteBranchId,
  resolveWarehouseStore,
} from "./warehouseContext.js";

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const sortAlphaNumeric = (left, right) => {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const sendError = (res, error, fallbackMessage) => {
  return res.status(error?.statusCode || 500).json({
    success: false,
    code: error?.code,
    message: error?.message || fallbackMessage,
  });
};

const normalizeWarehouseCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const applyGlobalReadBypass = (query, req) => {
  const isGlobalAdmin = Boolean(req?.authz?.isGlobalAdmin);
  const contextMode = String(req?.authz?.contextMode || "STANDARD").toUpperCase();
  if (isGlobalAdmin && contextMode !== "SIMULATED") {
    return query.setOptions({ skipBranchIsolation: true });
  }
  return query;
};

const buildZoneEstimate = (zones = []) => {
  return zones.reduce((total, zone) => {
    const aisles = toPositiveInt(zone?.aisles, 0);
    const shelvesPerAisle = toPositiveInt(zone?.shelvesPerAisle, 0);
    const binsPerShelf = toPositiveInt(zone?.binsPerShelf, 0);
    return total + aisles * shelvesPerAisle * binsPerShelf;
  }, 0);
};

export const getAllWarehouses = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) {
      filter.status = String(status).trim().toUpperCase();
    }

    if (search) {
      filter.$or = [
        { warehouseCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      WarehouseConfiguration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      WarehouseConfiguration.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      warehouses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return sendError(res, error, "Failed to get warehouse configurations");
  }
};

export const getWarehouseById = async (req, res) => {
  try {
    const warehouse = await applyGlobalReadBypass(
      WarehouseConfiguration.findById(req.params.id),
      req
    );
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

    return res.json({
      success: true,
      warehouse,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get warehouse configuration");
  }
};

export const createWarehouse = async (req, res) => {
  try {
    const storeId = ensureWarehouseWriteBranchId(req);
    await resolveWarehouseStore(req, { branchId: storeId });

    const {
      warehouseCode,
      name,
      address,
      totalArea,
      zones,
      status,
    } = req.body || {};

    const normalizedWarehouseCode = normalizeWarehouseCode(warehouseCode);
    if (!/^WH-[A-Z0-9]{2,12}$/.test(normalizedWarehouseCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouseCode format. Expected WH-XXX",
      });
    }

    if (!String(name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name is required",
      });
    }

    if (!Array.isArray(zones) || zones.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Warehouse must have at least one zone",
      });
    }

    const existingWarehouse = await WarehouseConfiguration.findOne({
      storeId,
      warehouseCode: normalizedWarehouseCode,
    });

    if (existingWarehouse) {
      return res.status(409).json({
        success: false,
        message: `Warehouse code ${normalizedWarehouseCode} already exists in this branch`,
      });
    }

    const estimatedLocations = buildZoneEstimate(zones);

    const warehouse = new WarehouseConfiguration({
      storeId,
      warehouseCode: normalizedWarehouseCode,
      name: String(name || "").trim(),
      address: String(address || "").trim(),
      totalArea: Number(totalArea) || 0,
      zones,
      status: status || "PLANNING",
      locationsGenerated: false,
      totalLocations: 0,
      createdBy: req.user._id,
      createdByName: req.user.fullName || req.user.name || req.user.email || "Unknown",
    });

    await warehouse.save();

    return res.status(201).json({
      success: true,
      message: `Created warehouse ${normalizedWarehouseCode}`,
      warehouse,
      estimatedLocations,
    });
  } catch (error) {
    return sendError(res, error, "Failed to create warehouse configuration");
  }
};

export const updateWarehouse = async (req, res) => {
  try {
    ensureWarehouseWriteBranchId(req);

    const warehouse = await WarehouseConfiguration.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

    const { name, address, totalArea, zones, status } = req.body || {};

    if (warehouse.locationsGenerated && zones) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot modify zone structure after locations have been generated",
      });
    }

    if (name !== undefined) warehouse.name = String(name || "").trim();
    if (address !== undefined) warehouse.address = String(address || "").trim();
    if (totalArea !== undefined) warehouse.totalArea = Number(totalArea) || 0;
    if (zones !== undefined) warehouse.zones = zones;
    if (status !== undefined) warehouse.status = String(status).trim().toUpperCase();

    warehouse.updatedBy = req.user._id;
    warehouse.updatedByName = req.user.fullName || req.user.name || req.user.email || "Unknown";

    await warehouse.save();

    return res.json({
      success: true,
      message: "Warehouse configuration updated",
      warehouse,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update warehouse configuration");
  }
};

export const deleteWarehouse = async (req, res) => {
  try {
    ensureWarehouseWriteBranchId(req);

    const warehouse = await WarehouseConfiguration.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

    if (warehouse.locationsGenerated) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a warehouse that already generated locations",
      });
    }

    await warehouse.deleteOne();

    return res.json({
      success: true,
      message: "Warehouse configuration deleted",
    });
  } catch (error) {
    return sendError(res, error, "Failed to delete warehouse configuration");
  }
};

export const generateLocationsFromConfig = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeStoreId = ensureWarehouseWriteBranchId(req);
    await resolveWarehouseStore(req, { branchId: activeStoreId, session });

    const warehouse = await WarehouseConfiguration.findById(req.params.id).session(session);
    if (!warehouse) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

    if (warehouse.locationsGenerated) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Locations already generated for this warehouse",
      });
    }

    const locations = [];
    let totalGenerated = 0;

    for (const zone of warehouse.zones) {
      for (let aisleNum = 1; aisleNum <= zone.aisles; aisleNum += 1) {
        for (let shelfNum = 1; shelfNum <= zone.shelvesPerAisle; shelfNum += 1) {
          for (let binNum = 1; binNum <= zone.binsPerShelf; binNum += 1) {
            const locationCode = `${warehouse.warehouseCode}-${zone.code}-${String(aisleNum).padStart(
              2,
              "0"
            )}-${String(shelfNum).padStart(2, "0")}-${String(binNum).padStart(2, "0")}`;

            const qrData = JSON.stringify({
              storeId: activeStoreId,
              locationCode,
              warehouse: warehouse.warehouseCode,
              zone: zone.code,
              zoneName: zone.name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity: zone.capacityPerBin,
            });

            // eslint-disable-next-line no-await-in-loop
            const qrCode = await QRCode.toDataURL(qrData);

            locations.push({
              storeId: activeStoreId,
              locationCode,
              warehouse: warehouse.warehouseCode,
              zone: zone.code,
              zoneName: zone.name,
              aisle: String(aisleNum).padStart(2, "0"),
              shelf: String(shelfNum).padStart(2, "0"),
              bin: String(binNum).padStart(2, "0"),
              capacity: zone.capacityPerBin,
              productCategories: Array.isArray(zone.productCategories)
                ? zone.productCategories
                : [],
              qrCode,
              status: zone.status || "ACTIVE",
            });

            totalGenerated += 1;
          }
        }
      }
    }

    await WarehouseLocation.insertMany(locations, { session });

    warehouse.locationsGenerated = true;
    warehouse.totalLocations = totalGenerated;
    warehouse.status = "ACTIVE";
    warehouse.updatedBy = req.user._id;
    warehouse.updatedByName = req.user.fullName || req.user.name || req.user.email || "Unknown";
    await warehouse.save({ session });

    await session.commitTransaction();

    return res.json({
      success: true,
      message: `Generated ${totalGenerated} warehouse locations`,
      warehouse,
      totalLocations: totalGenerated,
    });
  } catch (error) {
    await session.abortTransaction();
    return sendError(res, error, "Failed to generate warehouse locations");
  } finally {
    session.endSession();
  }
};

export const getWarehouseStats = async (req, res) => {
  try {
    const warehouse = await applyGlobalReadBypass(
      WarehouseConfiguration.findById(req.params.id),
      req
    );
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

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

    if (warehouse.locationsGenerated) {
      const locations = await applyGlobalReadBypass(
        WarehouseLocation.find({
          storeId: warehouse.storeId,
          warehouse: warehouse.warehouseCode,
        }),
        req
      );

      const locationsInUse = locations.filter(
        (location) => Number(location.currentLoad) > 0
      ).length;
      const emptyLocations = locations.length - locationsInUse;
      const averageFillRate =
        locations.length > 0
          ? locations.reduce((sum, location) => {
              const capacity = Number(location.capacity) || 0;
              const currentLoad = Number(location.currentLoad) || 0;
              return sum + (capacity > 0 ? (currentLoad / capacity) * 100 : 0);
            }, 0) / locations.length
          : 0;

      stats.locationsInUse = locationsInUse;
      stats.emptyLocations = emptyLocations;
      stats.averageFillRate = averageFillRate;
    }

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get warehouse statistics");
  }
};

export const getWarehouseLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = String(req.query?.zone || "").trim().toUpperCase();
    const aisle = String(req.query?.aisle || "").trim();
    const page = toPositiveInt(req.query?.page, 1);
    const limit = Math.min(toPositiveInt(req.query?.limit, 5), 50);

    const warehouse = await applyGlobalReadBypass(
      WarehouseConfiguration.findById(id).select(
        "_id storeId warehouseCode name zones"
      ),
      req
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

    const locationFilter = {
      storeId: warehouse.storeId,
      warehouse: warehouse.warehouseCode,
    };

    const projection =
      "locationCode zone zoneName aisle shelf bin capacity currentLoad status productCategories";
    const sortOrder = { aisle: 1, shelf: 1, bin: 1 };

    if (zone && !aisle) {
      const allAisles = await applyGlobalReadBypass(
        WarehouseLocation.find({
          ...locationFilter,
          zone,
        }).distinct("aisle"),
        req
      );
      const sortedAisles = allAisles.sort(sortAlphaNumeric);
      const totalAisles = sortedAisles.length;
      const totalPages = totalAisles > 0 ? Math.ceil(totalAisles / limit) : 1;
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * limit;
      const aislesInPage = sortedAisles.slice(start, start + limit);

      const locations =
        aislesInPage.length > 0
          ? await applyGlobalReadBypass(
              WarehouseLocation.find({
                ...locationFilter,
                zone,
                aisle: { $in: aislesInPage },
              })
                .select(projection)
                .sort(sortOrder)
                .lean(),
              req
            )
          : [];

      return res.json({
        success: true,
        warehouse,
        locations,
        pagination: {
          page: safePage,
          limit,
          total: totalAisles,
          pages: totalPages,
          hasNextPage: safePage < totalPages,
          hasPrevPage: safePage > 1,
        },
        meta: {
          zone,
          aisle: null,
          aisles: aislesInPage,
          totalAisles,
        },
      });
    }

    if (zone) {
      locationFilter.zone = zone;
    }
    if (aisle) {
      locationFilter.aisle = aisle;
    }

    const locations = await applyGlobalReadBypass(
      WarehouseLocation.find(locationFilter)
        .select(projection)
        .sort(sortOrder)
        .lean(),
      req
    );

    return res.json({
      success: true,
      warehouse,
      locations,
      pagination: {
        page: 1,
        limit: locations.length,
        total: locations.length,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
      meta: {
        zone: zone || null,
        aisle: aisle || null,
        aisles: Array.from(new Set(locations.map((location) => location.aisle))).sort(
          sortAlphaNumeric
        ),
      },
    });
  } catch (error) {
    return sendError(res, error, "Failed to get warehouse layout");
  }
};

export const searchLocationByProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const query = String(req.query?.query || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const warehouse = await applyGlobalReadBypass(
      WarehouseConfiguration.findById(id).select("_id storeId warehouseCode"),
      req
    );
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse configuration not found",
      });
    }

    const inventoryItems = await applyGlobalReadBypass(
      Inventory.find({
        storeId: warehouse.storeId,
        $or: [
          { sku: { $regex: query, $options: "i" } },
          { productName: { $regex: query, $options: "i" } },
        ],
        quantity: { $gt: 0 },
      }).populate({
        path: "locationId",
        match: {
          storeId: warehouse.storeId,
          warehouse: warehouse.warehouseCode,
        },
        select: "locationCode zone zoneName aisle shelf bin",
      }),
      req
    );

    const validItems = inventoryItems.filter((item) => item.locationId);
    const results = validItems.map((item) => ({
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      location: item.locationId,
    }));

    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    return sendError(res, error, "Failed to search product location");
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
  getWarehouseLayout,
  searchLocationByProduct,
};
