# NEXT PHASE IMPLEMENTATION PLAN – OMNICHANNEL RETAIL CHAIN

## 1. Objectives of the Next Phase

The next phase focuses on **enabling omnichannel capabilities** on the existing system in a **safe, non-disruptive manner**, without breaking current order flows.

Specific goals:

* Enable both `HOME_DELIVERY` and `CLICK_AND_COLLECT` flows on the frontend checkout.
* Support store-based routing for online orders.
* Control store-level inventory (reserve / release / deduct) with full debug logging.
* Deploy behind feature flags to allow fast rollback.

---

## 2. Current Status (Completed)

Core backend modules and frontend utilities have already been integrated:

### Backend

* Omnichannel models and routes:

  * `backend/src/modules/store/Store.js`
  * `backend/src/modules/store/storeController.js`
  * `backend/src/modules/store/storeRoutes.js`
  * `backend/src/modules/inventory/StoreInventory.js`
  * `backend/src/modules/inventory/StockTransfer.js`
  * `backend/src/modules/inventory/inventoryController.js`
  * `backend/src/modules/inventory/inventoryRoutes.js`
* Routing service:

  * `backend/src/services/routingService.js`
* Order superset (backward-compatible):

  * `backend/src/modules/order/Order.js`
  * `backend/src/modules/order/orderController.js`
  * `backend/src/modules/order/orderRoutes.js`
* Logging utility:

  * `backend/src/utils/logger.js`
* Migration script:

  * `backend/scripts/migrate-to-retail-chain.js`

### Frontend

* Existing utilities and components:

  * `frontend/src/lib/orderUtils.js`
  * `frontend/src/components/StoreSelector.jsx`
  * `frontend/src/components/InstallmentCalculator.jsx`
  * `frontend/src/lib/api.js` (with `storeAPI`, `inventoryAPI` added)

---

## 3. Scope of the Next Phase

### In Scope

* Connect frontend checkout with omnichannel APIs.
* Run migration on dev/staging environments.
* End-to-end testing for two main flows: Home Delivery and Click & Collect.
* Enable debug logging and error monitoring dashboards.

### Out of Scope

* Real installment partner integrations (actual HD Saison / FE APIs).
* Real distance calculation using Google Maps API.
* Advanced omnichannel analytics or admin dashboards.

---

## 4. Detailed Execution Plan

## Step 0 – Preparation and Data Protection

1. Backup the database before migration.
2. Finalize environment variables:

   * `MONGODB_CONNECTIONSTRING`
   * `OMNICHANNEL_DEBUG=true` (staging)
   * `NODE_ENV=staging` / `production`
3. Finalize feature flags:

   * Propose `FEATURE_OMNICHANNEL_CHECKOUT=false` (default).

**Done when:**

* Database backup is completed successfully.
* Environment configuration is ready for backend and frontend.

---

## Step 1 – Run Migration and Validate Store Data

1. Run migration:

```bash
cd backend
node scripts/migrate-to-retail-chain.js
```

2. Post-migration validation:

   * At least 3 active stores exist.
   * `StoreInventory` records exist for major product variants.
   * No duplicate index or schema errors.
3. Sample API checks:

   * `GET /api/stores`
   * `GET /api/stores/nearby?province=...&district=...`
   * `GET /api/inventory/check/:productId/:variantSku?province=...`

**Done when:**

* Store and inventory APIs return valid data.
* Backend starts without errors.

---

## Step 2 – Connect Frontend Checkout to Omnichannel

Primary file: `frontend/src/pages/customer/CheckoutPage.jsx`

Tasks:

1. Add fulfillment selection UI:

   * `HOME_DELIVERY`
   * `CLICK_AND_COLLECT`
2. For `CLICK_AND_COLLECT`:

   * Render `StoreSelector`.
   * Require `preferredStoreId` before order submission.
3. Extend order creation payload:

   * `fulfillmentType`
   * `preferredStoreId` (for click & collect)
4. Adjust shipping fee logic:

   * `CLICK_AND_COLLECT` → shipping fee = 0
   * `HOME_DELIVERY` → existing logic or store-zone logic
5. Ensure response parsing compatibility:

   * Support both `response.data.order` and `response.data.data.order`.

**Done when:**

* Users can place Click & Collect orders from the UI.
* Existing COD / VNPAY flows remain unaffected.

---

## Step 3 – Update Order Display UI

Priority files:

* `frontend/src/pages/customer/OrderDetailPage.jsx`
* `frontend/src/pages/customer/ProfilePage.jsx`
* Staff-side pages (`order-manager`, `shipper`, `warehouse`)

Tasks:

1. Display additional order information:

   * `fulfillmentType`
   * `assignedStore.storeName`
   * `pickupInfo.pickupCode` (if available)
2. Map new statuses if needed:

   * `READY_FOR_PICKUP`
   * `PICKED_UP`
   * `PREPARING_SHIPMENT`
   * `OUT_FOR_DELIVERY`
3. Ensure no breaking changes to existing status mappings.

**Done when:**

* Click & Collect orders show correct pickup codes.
* Staff pages do not crash when encountering new statuses.

---

## Step 4 – Mandatory Test Scenarios (UAT)

### 4.1 Home Delivery

1. Place an online order with `HOME_DELIVERY`.
2. System auto-selects a store with available stock.
3. Order contains `assignedStore`.
4. Store inventory behavior:

   * Reserve on order creation
   * Deduct on `DELIVERED` status

### 4.2 Click & Collect

1. Place an order with `CLICK_AND_COLLECT` and selected store.
2. Verify `pickupInfo.pickupCode` is generated.
3. Shipping fee equals 0.
4. Delivery status logic remains consistent.

### 4.3 Order Cancellation

1. Cancel order before delivery.
2. Verify store inventory is released.
3. Ensure stock never becomes negative.

### 4.4 VNPay Compatibility

1. Create a VNPAY order.
2. Payment URL is generated successfully.
3. IPN / return updates correct owner (`customerId || userId`).
4. No unintended auto-cancel after 15 minutes.

**Done when:**

* All test cases pass on staging.
* No unexpected 500 errors in logs.

---

## Step 5 – Logging, Monitoring, and Alerts

1. Enable debug logging on staging:

   * `OMNICHANNEL_DEBUG=true`
2. Monitor key logs:

   * `[OMNI][INFO] createOrder: success`
   * `[OMNI][ERROR] createOrder failed`
   * `[OMNI][DEBUG] reserveInventory: item reserved`
   * `[OMNI][ERROR] reserveInventory failed`
3. Create a lightweight monitoring dashboard:

   * Orders by `fulfillmentType`
   * Inventory reserve/release errors
   * Orders without assigned stores

**Done when:**

* Support team can trace an order from creation → inventory → delivery/cancellation.

---

## Step 6 – Safe Rollout Strategy

1. Release backend first (frontend feature flag still off).
2. Deploy frontend with omnichannel UI but flag disabled.
3. Enable feature flag for a small internal user group.
4. Monitor for 24 hours.
5. Gradually roll out to 100% if stable.

---

## 5. Rollback Plan

In case of incidents:

1. Disable `FEATURE_OMNICHANNEL_CHECKOUT` on frontend.
2. Keep backend running with legacy flow (backward-compatible).
3. If required, temporarily disable new APIs:

   * `/api/stores`
   * `/api/inventory`
4. Investigate using `[OMNI]` logs and recover failed orders by order ID.

---

## 6. Acceptance Criteria for the Next Phase

All of the following must be met:

* No regression in existing order flows (COD, VNPAY, POS).
* Successful `HOME_DELIVERY` and `CLICK_AND_COLLECT` orders on staging.
* Store inventory updates correctly (reserve / release / deduct).
* Sufficient debug logging for troubleshooting.
* Fast rollback via feature flags.

---

## 7. Time Estimation

* Step 0–1: 0.5 day
* Step 2: 1.0 day
* Step 3: 0.5 day
* Step 4: 1.0 day
* Step 5–6: 0.5 day

**Total:** ~3.5 working days

---

## 8. Important Notes

* Do not deploy directly to production without full end-to-end Click & Collect testing.
* Always back up the database before running migrations.
* Inventory consistency issues take priority over UI issues.

---

