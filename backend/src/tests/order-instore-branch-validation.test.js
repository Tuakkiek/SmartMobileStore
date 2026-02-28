import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Order from "../modules/order/Order.js";

test("IN_STORE order requires assignedStore.storeId", async () => {
  const order = new Order({
    orderNumber: "POS-VALIDATE-001",
    orderSource: "IN_STORE",
    fulfillmentType: "IN_STORE",
    items: [
      {
        price: 1000,
        quantity: 1,
      },
    ],
  });

  await assert.rejects(order.validate(), (error) => {
    assert.ok(error?.errors?.["assignedStore.storeId"]);
    return true;
  });
});

test("IN_STORE order passes validation when assignedStore.storeId is present", async () => {
  const order = new Order({
    orderNumber: "POS-VALIDATE-002",
    orderSource: "IN_STORE",
    fulfillmentType: "IN_STORE",
    assignedStore: {
      storeId: new mongoose.Types.ObjectId(),
    },
    items: [
      {
        price: 1000,
        quantity: 1,
      },
    ],
  });

  await assert.doesNotReject(order.validate());
});
