import mongoose from "mongoose";
import dotenv from "dotenv";
import Store from "../src/modules/store/Store.js";
import StoreInventory from "../src/modules/inventory/StoreInventory.js";
import UniversalProduct, { UniversalVariant } from "../src/modules/product/UniversalProduct.js";

dotenv.config();

const connectDB = async () => {
  const uri = process.env.MONGODB_CONNECTIONSTRING;
  if (!uri) {
    throw new Error("Missing MONGODB_CONNECTIONSTRING");
  }

  await mongoose.connect(uri);
  console.log("[MIGRATE] MongoDB connected");
};

const sampleStores = [
  {
    code: "HN001",
    name: "SmartMobileStore Cau Giay",
    type: "STORE",
    address: {
      province: "Ha Noi",
      district: "Cau Giay",
      ward: "Dich Vong",
      street: "123 Xuan Thuy",
      coordinates: { lat: 21.0285, lng: 105.7821 },
    },
    phone: "0241234567",
    email: "caugiay@smartmobilestore.vn",
    services: {
      clickAndCollect: true,
      homeDelivery: true,
      installation: true,
      warranty: true,
      tradeIn: true,
      installment: true,
    },
    status: "ACTIVE",
  },
  {
    code: "HCM001",
    name: "SmartMobileStore Quan 1",
    type: "STORE",
    address: {
      province: "Ho Chi Minh",
      district: "Quan 1",
      ward: "Ben Nghe",
      street: "456 Nguyen Hue",
      coordinates: { lat: 10.7769, lng: 106.7009 },
    },
    phone: "0281234567",
    email: "quan1@smartmobilestore.vn",
    services: {
      clickAndCollect: true,
      homeDelivery: true,
      installation: true,
      warranty: true,
      tradeIn: true,
      installment: true,
    },
    status: "ACTIVE",
  },
  {
    code: "DN001",
    name: "SmartMobileStore Hai Chau",
    type: "STORE",
    address: {
      province: "Da Nang",
      district: "Hai Chau",
      ward: "Hai Chau 1",
      street: "789 Hung Vuong",
      coordinates: { lat: 16.0544, lng: 108.2022 },
    },
    phone: "02361234567",
    email: "haichau@smartmobilestore.vn",
    services: {
      clickAndCollect: true,
      homeDelivery: true,
      installation: true,
      warranty: true,
      tradeIn: true,
      installment: true,
    },
    status: "ACTIVE",
  },
];

const createSampleStores = async () => {
  console.log("[MIGRATE] Creating sample stores...");

  const createdStoreIds = [];

  for (const storeData of sampleStores) {
    const existingStore = await Store.findOne({ code: storeData.code });

    if (existingStore) {
      console.log(`[MIGRATE] Skip existing store: ${existingStore.code}`);
      createdStoreIds.push(existingStore._id);
      continue;
    }

    const store = await Store.create(storeData);
    console.log(`[MIGRATE] Created store: ${store.code}`);
    createdStoreIds.push(store._id);
  }

  return createdStoreIds;
};

const createStoreInventory = async () => {
  console.log("[MIGRATE] Creating inventory per store...");

  const stores = await Store.find({ status: "ACTIVE" }).select("_id code").lean();
  if (stores.length === 0) {
    console.log("[MIGRATE] No active stores found, skip inventory generation.");
    return;
  }

  const products = await UniversalProduct.find().select("_id").lean();
  if (products.length === 0) {
    console.log("[MIGRATE] No products found, skip inventory generation.");
    return;
  }

  const productIds = products.map((product) => product._id);
  const variants = await UniversalVariant.find({ productId: { $in: productIds } })
    .select("productId sku stock")
    .lean();

  if (variants.length === 0) {
    console.log("[MIGRATE] No variants found, skip inventory generation.");
    return;
  }

  let createdCount = 0;

  for (const store of stores) {
    for (const variant of variants) {
      const existing = await StoreInventory.findOne({
        productId: variant.productId,
        variantSku: variant.sku,
        storeId: store._id,
      }).lean();

      if (existing) {
        continue;
      }

      const baseStock = Math.max(5, Math.floor((Number(variant.stock) || 0) / Math.max(stores.length, 1)));

      await StoreInventory.create({
        productId: variant.productId,
        variantSku: variant.sku,
        storeId: store._id,
        quantity: baseStock,
        reserved: 0,
        minStock: 3,
        maxStock: 100,
      });

      createdCount += 1;
    }
  }

  console.log(`[MIGRATE] Created ${createdCount} store inventory records`);
};

const run = async () => {
  try {
    console.log("[MIGRATE] Start migration to omnichannel retail chain");
    await connectDB();
    await createSampleStores();
    await createStoreInventory();
    console.log("[MIGRATE] Migration completed successfully");
  } catch (error) {
    console.error("[MIGRATE] Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
