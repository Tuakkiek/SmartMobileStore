import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { runWithBranchContext } from "../authz/branchContext.js";
import Device from "../modules/device/Device.js";
import {
  addMonthsToDate,
  ensureIdentifierPolicySatisfied,
  IDENTIFIER_POLICIES,
  TRACKING_MODES,
} from "../modules/device/afterSalesConfig.js";
import {
  activateWarrantyForOrder,
  assignDevicesToOrderItem,
  getPublicWarrantyLookup,
  registerSerializedUnits,
} from "../modules/device/deviceService.js";
import UniversalProduct, {
  UniversalVariant,
} from "../modules/product/UniversalProduct.js";
import ProductType from "../modules/productType/ProductType.js";
import WarrantyRecord from "../modules/warranty/WarrantyRecord.js";

let mongoServer;

const clearAllCollections = async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

const seedSerializedCatalog = async ({
  productTypeName = "Smartphone",
  trackingMode = TRACKING_MODES.SERIALIZED,
  identifierPolicy = IDENTIFIER_POLICIES.IMEI_AND_SERIAL,
  warrantyMonths = 12,
} = {}) => {
  const createdBy = new mongoose.Types.ObjectId();
  const productType = await ProductType.create({
    name: productTypeName,
    createdBy,
    afterSalesDefaults: {
      trackingMode,
      identifierPolicy,
      warrantyMonths,
    },
  });

  const product = await UniversalProduct.create({
    name: `${productTypeName} Test Device`,
    model: `${productTypeName.toUpperCase()}-MODEL-1`,
    baseSlug: `${productTypeName.toLowerCase()}-test-device`,
    slug: `${productTypeName.toLowerCase()}-test-device`,
    brand: new mongoose.Types.ObjectId(),
    productType: productType._id,
    createdBy,
    afterSalesConfig: {},
    lifecycleStage: "ACTIVE",
    status: "AVAILABLE",
  });

  const variant = await UniversalVariant.create({
    color: "Black",
    variantName: "256GB",
    originalPrice: 30000000,
    price: 28000000,
    stock: 5,
    images: [],
    sku: `SKU-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`,
    slug: `${product.baseSlug}-256gb`,
    productId: product._id,
  });

  product.variants = [variant._id];
  await product.save();

  return { productType, product, variant };
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "device-warranty-service-test",
  });
});

beforeEach(async () => {
  await clearAllCollections();
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("identifier policy and warranty date helpers behave as expected", () => {
  assert.equal(
    ensureIdentifierPolicySatisfied(
      { identifierPolicy: IDENTIFIER_POLICIES.IMEI_AND_SERIAL },
      { imei: "356789012345678", serialNumber: "" }
    ),
    "Both IMEI and serial number are required for this product"
  );

  assert.equal(
    ensureIdentifierPolicySatisfied(
      { identifierPolicy: IDENTIFIER_POLICIES.IMEI_OR_SERIAL },
      { imei: "", serialNumber: "SN-001" }
    ),
    ""
  );

  const nextDate = addMonthsToDate(new Date("2026-01-15T00:00:00Z"), 12);
  assert.equal(nextDate?.toISOString(), "2027-01-15T00:00:00.000Z");
});

test("registerSerializedUnits creates normalized devices and rejects duplicates", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const { product, variant } = await seedSerializedCatalog();

  await runWithBranchContext(
    {
      activeBranchId: String(storeId),
      scopeMode: "branch",
      isGlobalAdmin: false,
    },
    async () => {
      const devices = await registerSerializedUnits({
        storeId,
        productId: product._id,
        variantId: variant._id,
        variantSku: variant.sku,
        productName: product.name,
        variantName: variant.variantName,
        serializedUnits: [
          {
            imei: "3567 8901 2345 678",
            serialNumber: "sn-ip15-0001",
          },
        ],
      });

      assert.equal(devices.length, 1);
      assert.equal(devices[0].imeiNormalized, "356789012345678");
      assert.equal(devices[0].serialNumberNormalized, "SN-IP15-0001");

      await assert.rejects(
        registerSerializedUnits({
          storeId,
          productId: product._id,
          variantId: variant._id,
          variantSku: variant.sku,
          productName: product.name,
          variantName: variant.variantName,
          serializedUnits: [
            {
              imei: "356789012345678",
              serialNumber: "SN-IP15-0002",
            },
          ],
        }),
        (error) => {
          assert.equal(error.code, "DEVICE_IMEI_DUPLICATE");
          return true;
        }
      );
    }
  );
});

test("assignDevicesToOrderItem reserves the requested serialized units", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const { product, variant } = await seedSerializedCatalog();

  await runWithBranchContext(
    {
      activeBranchId: String(storeId),
      scopeMode: "branch",
      isGlobalAdmin: false,
    },
    async () => {
      const devices = await registerSerializedUnits({
        storeId,
        productId: product._id,
        variantId: variant._id,
        variantSku: variant.sku,
        productName: product.name,
        variantName: variant.variantName,
        serializedUnits: [
          { imei: "356789012345678", serialNumber: "SN-ASSIGN-0001" },
          { imei: "356789012345679", serialNumber: "SN-ASSIGN-0002" },
        ],
      });

      const order = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: "POS-ASSIGN-001",
      };
      const orderItem = {
        _id: new mongoose.Types.ObjectId(),
        productId: product._id,
        variantSku: variant.sku,
        quantity: 2,
        productName: product.name,
      };

      const assignments = await assignDevicesToOrderItem({
        storeId,
        order,
        orderItem,
        requestedDeviceIds: devices.map((device) => device._id),
        requestedQuantity: 2,
        actor: { _id: new mongoose.Types.ObjectId(), fullName: "Warehouse Staff" },
      });

      assert.equal(assignments.length, 2);
      assert.equal(orderItem.imei, "356789012345678");

      const persistedDevices = await Device.find({
        _id: { $in: devices.map((device) => device._id) },
      }).lean();

      assert.equal(persistedDevices.length, 2);
      assert.ok(
        persistedDevices.every((device) => device.inventoryState === "RESERVED")
      );
      assert.ok(
        persistedDevices.every(
          (device) => String(device.reservedFor?.orderId) === String(order._id)
        )
      );
    }
  );
});

test("activateWarrantyForOrder creates coverage records and public lookup returns active coverage", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const { product, variant } = await seedSerializedCatalog({
    warrantyMonths: 12,
  });

  let order;
  await runWithBranchContext(
    {
      activeBranchId: String(storeId),
      scopeMode: "branch",
      isGlobalAdmin: false,
    },
    async () => {
      const [device] = await registerSerializedUnits({
        storeId,
        productId: product._id,
        variantId: variant._id,
        variantSku: variant.sku,
        productName: product.name,
        variantName: variant.variantName,
        serializedUnits: [
          { imei: "356789012345680", serialNumber: "SN-WARRANTY-0001" },
        ],
      });

      const orderItem = {
        _id: new mongoose.Types.ObjectId(),
        productId: product._id,
        variantSku: variant.sku,
        quantity: 1,
        productName: product.name,
      };
      order = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: "POS-WARRANTY-001",
        assignedStore: { storeId },
        customerId: new mongoose.Types.ObjectId(),
        shippingAddress: {
          fullName: "Customer Test",
          phoneNumber: "0900000000",
        },
        items: [orderItem],
      };

      await assignDevicesToOrderItem({
        storeId,
        order,
        orderItem,
        requestedDeviceIds: [device._id],
        requestedQuantity: 1,
        actor: { _id: new mongoose.Types.ObjectId(), fullName: "Cashier" },
      });
    }
  );

  const soldAt = new Date("2026-03-01T00:00:00Z");
  const records = await activateWarrantyForOrder({
    order,
    soldAt,
    actor: { _id: new mongoose.Types.ObjectId(), fullName: "Cashier" },
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].status, "ACTIVE");

  const savedWarranty = await WarrantyRecord.findById(records[0]._id)
    .setOptions({ skipBranchIsolation: true })
    .lean();
  assert.ok(savedWarranty);
  assert.equal(savedWarranty.warrantyMonths, 12);
  assert.equal(
    new Date(savedWarranty.expiresAt).toISOString(),
    "2027-03-01T00:00:00.000Z"
  );

  const lookup = await getPublicWarrantyLookup({
    identifier: "356789012345680",
  });

  assert.equal(lookup.productName, product.name);
  assert.equal(lookup.warrantyStatus, "ACTIVE");
  assert.equal(
    new Date(lookup.warrantyExpirationDate).toISOString(),
    "2027-03-01T00:00:00.000Z"
  );
});
