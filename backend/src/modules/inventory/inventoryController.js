import StoreInventory from "./StoreInventory.js";
import Store from "../store/Store.js";
import { omniLog } from "../../utils/logger.js";

export const checkAvailability = async (req, res) => {
  try {
    const { productId, variantSku } = req.params;
    const { province } = req.query;

    const storeFilter = { status: "ACTIVE" };
    if (province) {
      storeFilter["address.province"] = province;
    }

    const stores = await Store.find(storeFilter).select("_id name code address services").lean();
    const storeIds = stores.map((store) => store._id);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        available: false,
        stores: [],
      });
    }

    const inventoryRows = await StoreInventory.find({
      productId,
      variantSku,
      storeId: { $in: storeIds },
      available: { $gt: 0 },
    }).lean();

    const storeMap = new Map(stores.map((store) => [String(store._id), store]));

    const results = inventoryRows
      .map((row) => {
        const store = storeMap.get(String(row.storeId));
        if (!store) {
          return null;
        }

        return {
          storeId: store._id,
          storeCode: store.code,
          storeName: store.name,
          address: store.address,
          available: row.available,
          status: row.status,
          supportsClickAndCollect: !!store.services?.clickAndCollect,
          supportsHomeDelivery: !!store.services?.homeDelivery,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.available - a.available);

    res.json({
      success: true,
      available: results.length > 0,
      stores: results,
    });
  } catch (error) {
    omniLog.error("checkAvailability failed", {
      productId: req.params.productId,
      variantSku: req.params.variantSku,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Khong the kiem tra ton kho",
      error: error.message,
    });
  }
};

export const getByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, limit = 200, page = 1 } = req.query;

    const filter = { storeId };
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      StoreInventory.find(filter)
        .populate("productId", "name model")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StoreInventory.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    omniLog.error("getByStore failed", {
      storeId: req.params.storeId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: "Khong the lay ton kho cua cua hang",
      error: error.message,
    });
  }
};

export default {
  checkAvailability,
  getByStore,
};
