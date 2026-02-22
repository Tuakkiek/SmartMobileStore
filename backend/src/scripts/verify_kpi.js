import mongoose from "mongoose";
import dotenv from "dotenv";
import { getPOSStaffStats } from "../modules/analytics/employeeAnalyticsService.js";
import Order from "../modules/order/Order.js";
import Store from "../modules/store/Store.js";
import User from "../modules/auth/User.js";

dotenv.config();

const dbUri = process.env.MONGODB_URI || process.env.MONGODB_CONNECTIONSTRING;

const cleanData = async () => {
  await Order.deleteMany({ orderNumber: /^KPI_ORD_/ });
  await Store.deleteMany({ name: /^TEST_STORE_KPI_/ });
  await User.deleteMany({ email: /^test_kpi_/ });
};

const createStore = async (name, code) => {
  return Store.create({
    code,
    name,
    type: "STORE",
    address: {
      province: "Test Province",
      district: "Test District",
      street: "Test Street",
    },
    phone: "0900000000",
    email: `${code.toLowerCase()}@test.com`,
    status: "ACTIVE",
  });
};

const createTestData = async () => {
  const suffix = Date.now();
  const storeA = await createStore("TEST_STORE_KPI_A", `KPIA${suffix}`);
  const storeB = await createStore("TEST_STORE_KPI_B", `KPIB${suffix}`);

  const staffA = await User.create({
    fullName: "Staff A",
    email: `test_kpi_staff_a_${suffix}@test.com`,
    password: "Password123!",
    role: "POS_STAFF",
    storeLocation: String(storeA._id),
    phoneNumber: "0900000001",
  });

  const staffB = await User.create({
    fullName: "Staff B",
    email: `test_kpi_staff_b_${suffix}@test.com`,
    password: "Password123!",
    role: "POS_STAFF",
    storeLocation: String(storeB._id),
    phoneNumber: "0900000002",
  });

  await Order.create({
    orderNumber: `KPI_ORD_A_${suffix}`,
    totalAmount: 100000,
    status: "DELIVERED",
    paymentStatus: "PAID",
    orderSource: "IN_STORE",
    assignedStore: { storeId: storeA._id, storeName: storeA.name },
    posInfo: { staffId: staffA._id, staffName: staffA.fullName },
    items: [
      {
        name: "KPI Item A",
        productName: "KPI Item A",
        price: 100000,
        quantity: 1,
      },
    ],
  });

  await Order.create({
    orderNumber: `KPI_ORD_B_${suffix}`,
    totalAmount: 200000,
    status: "DELIVERED",
    paymentStatus: "PAID",
    orderSource: "IN_STORE",
    assignedStore: { storeId: storeB._id, storeName: storeB.name },
    posInfo: { staffId: staffB._id, staffName: staffB.fullName },
    items: [
      {
        name: "KPI Item B",
        productName: "KPI Item B",
        price: 200000,
        quantity: 1,
      },
    ],
  });

  return { storeA, storeB, staffA, staffB };
};

const verify = async () => {
  try {
    if (!dbUri) {
      throw new Error("Missing MONGODB_URI or MONGODB_CONNECTIONSTRING");
    }

    await mongoose.connect(dbUri);
    console.log("Connected to DB");

    await cleanData();
    const { storeA, storeB, staffA, staffB } = await createTestData();
    console.log(`Created test data. Store A: ${storeA._id}, Store B: ${storeB._id}`);

    console.log("\n--- TEST 1: Get POS Stats for Store A ---");
    const statsA = await getPOSStaffStats({ branchId: String(storeA._id) });
    console.log("Stats A:", statsA);
    if (statsA.length === 1 && String(statsA[0].staffId) === String(staffA._id)) {
      console.log("PASS: Only Staff A found for Store A");
    } else {
      console.error("FAIL: Expected only Staff A");
    }

    console.log("\n--- TEST 2: Get POS Stats for Store B ---");
    const statsB = await getPOSStaffStats({ branchId: String(storeB._id) });
    console.log("Stats B:", statsB);
    if (statsB.length === 1 && String(statsB[0].staffId) === String(staffB._id)) {
      console.log("PASS: Only Staff B found for Store B");
    } else {
      console.error("FAIL: Expected only Staff B");
    }

    console.log("\n--- TEST 3: Get Global Stats (No Branch ID) ---");
    const statsGlobal = await getPOSStaffStats({});
    const testStats = statsGlobal.filter(
      (entry) =>
        String(entry.staffId) === String(staffA._id) ||
        String(entry.staffId) === String(staffB._id)
    );
    console.log("Global Test Stats:", testStats);
    if (testStats.length === 2) {
      console.log("PASS: Both staff found for global scope");
    } else {
      console.error("FAIL: Expected both staff");
    }

    await cleanData();
    console.log("\nCleaned up data.");
    process.exit(0);
  } catch (error) {
    console.error("Verification Error:", error);
    process.exit(1);
  }
};

verify();
