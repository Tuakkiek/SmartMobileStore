import Store from "./Store.js";
import StoreInventory from "../inventory/StoreInventory.js";
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

export default {
  getAllStores,
  getNearbyStores,
  getStoreById,
  checkStoreStock,
};
