import Store from "../modules/store/Store.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";
import { trackOmnichannelEvent } from "../modules/monitoring/omnichannelMonitoringService.js";
import { omniLog } from "../utils/logger.js";

const getItemIdentity = (item = {}) => ({
  productId: item.productId,
  variantSku: item.variantSku,
  quantity: Number(item.quantity) || 0,
  name: item.name || item.productName,
});

const hasAllItemsInStore = async (storeId, orderItems, session = null) => {
  for (const rawItem of orderItems) {
    const item = getItemIdentity(rawItem);

    if (!item.productId || !item.variantSku || item.quantity <= 0) {
      return false;
    }

    const inventory = await StoreInventory.findOne({
      productId: item.productId,
      variantSku: item.variantSku,
      storeId,
    }).session(session);

    if (!inventory || Number(inventory.available) < item.quantity) {
      return false;
    }
  }

  return true;
};

export const findBestStore = async (orderItems, customerAddress = {}) => {
  try {
    const activeStores = await Store.find({
      status: "ACTIVE",
      "services.homeDelivery": true,
    }).lean();

    if (activeStores.length === 0) {
      omniLog.warn("findBestStore: no active stores found");
      return {
        success: false,
        message: "Khong co cua hang kha dung",
      };
    }

    const storesWithStock = [];

    for (const store of activeStores) {
      const hasStock = await hasAllItemsInStore(store._id, orderItems);
      if (hasStock) {
        storesWithStock.push(store);
      }
    }

    if (storesWithStock.length === 0) {
      omniLog.warn("findBestStore: no stores with stock", {
        province: customerAddress?.province,
        district: customerAddress?.district,
      });

      return {
        success: false,
        message: "San pham tam het hang, vui long lien he hotline",
        suggestPreOrder: true,
      };
    }

    const scoredStores = storesWithStock.map((store) => {
      let score = 0;

      if (customerAddress?.province && store.address?.province === customerAddress.province) {
        score += 50;
      }

      if (customerAddress?.district && store.address?.district === customerAddress.district) {
        score += 30;
      }

      const maxOrdersPerDay = Number(store.capacity?.maxOrdersPerDay) || 1;
      const currentOrders = Number(store.capacity?.currentOrders) || 0;
      const usage = currentOrders / maxOrdersPerDay;

      if (usage < 0.5) {
        score += 20;
      } else if (usage < 0.8) {
        score += 10;
      }

      return {
        store,
        score,
      };
    });

    scoredStores.sort((a, b) => b.score - a.score);

    const bestStore = scoredStores[0].store;

    omniLog.debug("findBestStore: selected", {
      storeId: bestStore?._id,
      storeCode: bestStore?.code,
      score: scoredStores[0]?.score,
    });

    return {
      success: true,
      store: bestStore,
      alternativeStores: scoredStores.slice(1, 3).map((entry) => entry.store),
    };
  } catch (error) {
    omniLog.error("findBestStore failed", { error: error.message });
    throw error;
  }
};

export const findNearestStoreWithStock = async (
  orderItems,
  customerProvince,
  customerDistrict
) => {
  try {
    const stores = await Store.find({
      status: "ACTIVE",
      "services.clickAndCollect": true,
      ...(customerProvince ? { "address.province": customerProvince } : {}),
    }).lean();

    const availableStores = [];

    for (const store of stores) {
      const hasStock = await hasAllItemsInStore(store._id, orderItems);
      if (!hasStock) {
        continue;
      }

      const priority =
        customerDistrict && store.address?.district === customerDistrict ? 2 : 1;

      availableStores.push({ store, priority });
    }

    availableStores.sort((a, b) => b.priority - a.priority);

    return availableStores.map((entry) => entry.store);
  } catch (error) {
    omniLog.error("findNearestStoreWithStock failed", {
      province: customerProvince,
      district: customerDistrict,
      error: error.message,
    });
    throw error;
  }
};

export const reserveInventory = async (storeId, orderItems, options = {}) => {
  const { session = null } = options;
  const itemCount = Array.isArray(orderItems) ? orderItems.length : 0;

  try {
    for (const rawItem of orderItems) {
      const item = getItemIdentity(rawItem);

      if (!item.productId || !item.variantSku || item.quantity <= 0) {
        throw new Error("Thong tin san pham reserve khong hop le");
      }

      const inventory = await StoreInventory.findOne({
        productId: item.productId,
        variantSku: item.variantSku,
        storeId,
      }).session(session);

      if (!inventory || Number(inventory.available) < item.quantity) {
        throw new Error(`Khong du hang: ${item.name || item.variantSku}`);
      }

      inventory.reserved += item.quantity;
      await inventory.save({ session });

      omniLog.debug("reserveInventory: item reserved", {
        storeId,
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        availableAfter: inventory.available,
      });
    }

    await trackOmnichannelEvent({
      eventType: "RESERVE_INVENTORY_SUCCESS",
      operation: "reserve_inventory",
      level: "DEBUG",
      success: true,
      storeId,
      itemCount,
    });

    return true;
  } catch (error) {
    await trackOmnichannelEvent({
      eventType: "RESERVE_INVENTORY_FAILED",
      operation: "reserve_inventory",
      level: "ERROR",
      success: false,
      storeId,
      itemCount,
      errorMessage: error.message,
    });

    omniLog.error("reserveInventory failed", {
      storeId,
      error: error.message,
    });
    throw error;
  }
};

export const releaseInventory = async (storeId, orderItems, options = {}) => {
  const { session = null } = options;
  const itemCount = Array.isArray(orderItems) ? orderItems.length : 0;

  try {
    for (const rawItem of orderItems) {
      const item = getItemIdentity(rawItem);
      if (!item.productId || !item.variantSku || item.quantity <= 0) {
        continue;
      }

      const inventory = await StoreInventory.findOne({
        productId: item.productId,
        variantSku: item.variantSku,
        storeId,
      }).session(session);

      if (!inventory) {
        continue;
      }

      inventory.reserved = Math.max(0, Number(inventory.reserved) - item.quantity);
      await inventory.save({ session });

      omniLog.debug("releaseInventory: item released", {
        storeId,
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        availableAfter: inventory.available,
      });
    }

    await trackOmnichannelEvent({
      eventType: "RELEASE_INVENTORY_SUCCESS",
      operation: "release_inventory",
      level: "DEBUG",
      success: true,
      storeId,
      itemCount,
    });

    return true;
  } catch (error) {
    await trackOmnichannelEvent({
      eventType: "RELEASE_INVENTORY_FAILED",
      operation: "release_inventory",
      level: "ERROR",
      success: false,
      storeId,
      itemCount,
      errorMessage: error.message,
    });

    omniLog.error("releaseInventory failed", {
      storeId,
      error: error.message,
    });
    throw error;
  }
};

export const deductInventory = async (storeId, orderItems, options = {}) => {
  const { session = null } = options;
  const itemCount = Array.isArray(orderItems) ? orderItems.length : 0;

  try {
    for (const rawItem of orderItems) {
      const item = getItemIdentity(rawItem);
      if (!item.productId || !item.variantSku || item.quantity <= 0) {
        continue;
      }

      const inventory = await StoreInventory.findOne({
        productId: item.productId,
        variantSku: item.variantSku,
        storeId,
      }).session(session);

      if (!inventory) {
        continue;
      }

      inventory.quantity = Math.max(0, Number(inventory.quantity) - item.quantity);
      inventory.reserved = Math.max(0, Number(inventory.reserved) - item.quantity);
      await inventory.save({ session });

      omniLog.debug("deductInventory: item deducted", {
        storeId,
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
        quantityAfter: inventory.quantity,
        reservedAfter: inventory.reserved,
      });
    }

    await trackOmnichannelEvent({
      eventType: "DEDUCT_INVENTORY_SUCCESS",
      operation: "deduct_inventory",
      level: "DEBUG",
      success: true,
      storeId,
      itemCount,
    });

    return true;
  } catch (error) {
    await trackOmnichannelEvent({
      eventType: "DEDUCT_INVENTORY_FAILED",
      operation: "deduct_inventory",
      level: "ERROR",
      success: false,
      storeId,
      itemCount,
      errorMessage: error.message,
    });

    omniLog.error("deductInventory failed", {
      storeId,
      error: error.message,
    });
    throw error;
  }
};

export default {
  findBestStore,
  findNearestStoreWithStock,
  reserveInventory,
  releaseInventory,
  deductInventory,
};
