import assert from "node:assert/strict";

import {
  canTransitionOrderStatus,
  getStatusTransitionView,
  normalizeRequestedOrderStatus,
} from "../modules/order/orderStateMachine.js";

const log = (...args) => console.log("[PHASE6][STATE_MACHINE]", ...args);

const makeOrder = ({ inStore = false, statusStage = "PENDING" } = {}) => ({
  orderSource: inStore ? "IN_STORE" : "ONLINE",
  fulfillmentType: inStore ? "IN_STORE" : "HOME_DELIVERY",
  statusStage,
});

const testCases = [
  {
    name: "Manager can override to DELIVERED from PENDING (online)",
    input: {
      order: makeOrder({ inStore: false, statusStage: "PENDING" }),
      currentStatus: "PENDING",
      targetStatus: "DELIVERED",
      role: "ADMIN",
    },
    expectedAllowed: true,
  },
  {
    name: "Order manager can only route to SHIPPING when transition is valid",
    input: {
      order: makeOrder({ inStore: false, statusStage: "PICKUP_COMPLETED" }),
      currentStatus: "PREPARING_SHIPMENT",
      targetStatus: "SHIPPING",
      role: "ORDER_MANAGER",
    },
    expectedAllowed: true,
  },
  {
    name: "Warehouse can move CONFIRMED -> PROCESSING",
    input: {
      order: makeOrder({ inStore: false, statusStage: "CONFIRMED" }),
      currentStatus: "CONFIRMED",
      targetStatus: "PROCESSING",
      role: "WAREHOUSE_MANAGER",
    },
    expectedAllowed: true,
  },
  {
    name: "Warehouse cannot move SHIPPING -> DELIVERED",
    input: {
      order: makeOrder({ inStore: false, statusStage: "IN_TRANSIT" }),
      currentStatus: "SHIPPING",
      targetStatus: "DELIVERED",
      role: "WAREHOUSE_MANAGER",
    },
    expectedAllowed: false,
  },
  {
    name: "Shipper can move SHIPPING -> DELIVERED",
    input: {
      order: makeOrder({ inStore: false, statusStage: "IN_TRANSIT" }),
      currentStatus: "SHIPPING",
      targetStatus: "DELIVERED",
      role: "SHIPPER",
    },
    expectedAllowed: true,
  },
  {
    name: "Shipper cannot cancel an order",
    input: {
      order: makeOrder({ inStore: false, statusStage: "IN_TRANSIT" }),
      currentStatus: "SHIPPING",
      targetStatus: "CANCELLED",
      role: "SHIPPER",
    },
    expectedAllowed: false,
  },
  {
    name: "Warehouse cannot skip PENDING -> SHIPPING directly",
    input: {
      order: makeOrder({ inStore: false, statusStage: "PENDING" }),
      currentStatus: "PENDING",
      targetStatus: "SHIPPING",
      role: "WAREHOUSE_MANAGER",
    },
    expectedAllowed: false,
  },
  {
    name: "In-store flow allows PREPARING_SHIPMENT -> PENDING_PAYMENT",
    input: {
      order: makeOrder({ inStore: true, statusStage: "PICKUP_COMPLETED" }),
      currentStatus: "PREPARING_SHIPMENT",
      targetStatus: "PENDING_PAYMENT",
      role: "WAREHOUSE_MANAGER",
    },
    expectedAllowed: true,
  },
  {
    name: "Customer role is not allowed to change order status",
    input: {
      order: makeOrder({ inStore: false, statusStage: "PENDING" }),
      currentStatus: "PENDING",
      targetStatus: "CONFIRMED",
      role: "CUSTOMER",
    },
    expectedAllowed: false,
  },
];

const run = async () => {
  let passed = 0;

  assert.equal(normalizeRequestedOrderStatus("picking"), "PROCESSING");
  assert.equal(normalizeRequestedOrderStatus("pickup_completed"), "PREPARING_SHIPMENT");
  assert.equal(normalizeRequestedOrderStatus("new"), "PENDING");

  const transitionView = getStatusTransitionView({
    order: makeOrder({ inStore: false, statusStage: "PICKING" }),
    currentStatus: "PROCESSING",
    targetStatus: "SHIPPING",
  });
  assert.equal(transitionView.currentStage, "PICKING");
  assert.equal(transitionView.targetStage, "IN_TRANSIT");
  assert.equal(transitionView.inStore, false);
  passed += 1;

  for (const item of testCases) {
    const result = canTransitionOrderStatus(item.input);
    assert.equal(
      Boolean(result.allowed),
      item.expectedAllowed,
      `${item.name} | expected=${item.expectedAllowed} actual=${result.allowed} reason=${result.reason || "none"}`
    );
    passed += 1;
    log("PASS", item.name);
  }

  log(`Completed. passed=${passed}`);
};

run().catch((error) => {
  console.error("[PHASE6][STATE_MACHINE] FAILED", error.message);
  process.exit(1);
});
