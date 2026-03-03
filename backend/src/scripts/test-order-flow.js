import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import { createOrder, assignStore, updateOrderStatus, assignCarrier } from "../modules/order/orderController.js";
import User from "../modules/auth/User.js";
import UniversalProduct from "../modules/product/UniversalProduct.js";
import Store from "../modules/store/Store.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";
import Inventory from "../modules/warehouse/Inventory.js";
import Order from "../modules/order/Order.js";

import { runWithBranchContext } from "../authz/branchContext.js";

function mockRes() {
  const res = {
    statusVal: 200,
    jsonVal: null,
    status(code) {
      this.statusVal = code;
      return this;
    },
    json(data) {
      this.jsonVal = data;
      return this;
    }
  };
  return res;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    
    // 1. Setup Users
    const customer = await User.findOne({ role: "CUSTOMER" }).lean();
    const admin = await User.findOne({ role: "ADMIN" }).lean();
    const shipper = await User.findOne({ role: "SHIPPER" }).lean();

    if (!customer || !admin || !shipper) {
        console.error("Missing required users (CUSTOMER, ADMIN, SHIPPER) in DB.");
        process.exit(1);
    }

    // Wrap execution in a global admin context simulating our router middleware
    await runWithBranchContext({ isGlobalAdmin: true, scopeMode: "global" }, async () => {
        // 2. Setup Product & Store
        const hcmStore = await Store.findOne({ name: "Hồ Chí Minh" }).lean();
        
        // Find a product with inventory in HCM
        const availableInventory = await StoreInventory.findOne({ storeId: hcmStore._id, available: { $gt: 0 } }, null, { skipBranchIsolation: true }).lean();
        if (!availableInventory) {
            console.error("No available inventory found in HCM store.");
            process.exit(1);
        }

        const product = await UniversalProduct.findOne({ _id: availableInventory.productId }).populate("variants").lean();
        const variantId = product.variants.find(v => v.sku === availableInventory.variantSku)?._id;

        console.log(`\n=== INITIAL INVENTORY FOR SKU: ${availableInventory.variantSku} ===`);
        let si = await StoreInventory.findOne({ _id: availableInventory._id }, null, { skipBranchIsolation: true }).lean();
        console.log(`- StoreInventory [Quantity: ${si.quantity}, Reserved: ${si.reserved}, Available: ${si.available}]`);
        
        const physicalInv = await Inventory.find({ storeId: hcmStore._id, sku: availableInventory.variantSku }, null, { skipBranchIsolation: true }).lean();
        const totalPhysical = physicalInv.reduce((sum, inv) => sum + inv.quantity, 0);
        console.log(`- Physical Inventory (Warehouse Bins): ${totalPhysical} units distributed across ${physicalInv.length} bins.`);

        // 3. Khách hàng đặt hàng
        console.log("\n[1] Khách hàng tạo đơn hàng...");
        let reqCreate = {
            user: customer,
            body: {
                items: [{
                    productId: product._id.toString(),
                    variantId: variantId.toString(),
                    quantity: 1,
                    price: 100000
                }],
                shippingAddress: {
                    fullName: "Test Customer",
                    phoneNumber: "0901234567",
                    detailAddress: "123 Test St",
                    province: "Hồ Chí Minh",
                    district: "Quận 1",
                    ward: "Bến Nghé"
                },
                paymentMethod: "COD",
                fulfillmentType: "HOME_DELIVERY"
            }
        };
        let resCreate = mockRes();
        await createOrder(reqCreate, resCreate);
        
        if (resCreate.statusVal !== 200 && resCreate.statusVal !== 201) {
            console.error("Failed to create order:", resCreate.jsonVal);
            process.exit(1);
        }
        const orderId = resCreate.jsonVal.order._id;
        console.log(`=> Đơn hàng tạo thành công. ID: ${orderId}, Status: ${resCreate.jsonVal.order.status}`);

        // Check inventory after creation
        console.log(`\n=== INVENTORY AFTER CREATION ===`);
        si = await StoreInventory.findOne({ _id: availableInventory._id }, null, { skipBranchIsolation: true }).lean();
        console.log(`- StoreInventory [Quantity: ${si.quantity}, Reserved: ${si.reserved}, Available: ${si.available}]`);

        // 4. Admin duyệt đơn và chuyển sang chi nhánh HCM
        console.log("\n[2] Admin Global duyệt đơn và gán chi nhánh HCM...");
        let reqAssign = {
            user: admin,
            params: { id: orderId },
            body: { storeId: hcmStore._id.toString() }
        };
        let resAssign = mockRes();
        await assignStore(reqAssign, resAssign);
        if (!resAssign.jsonVal.success) {
            console.error("Failed to assign store:", resAssign.jsonVal);
        } else {
            console.log(`=> Đã gán chi nhánh HCM thành công.`);
        }

        // Fix Shipper branch issues
        shipper.storeLocation = hcmStore._id; // simulate shipper in HCM
        await User.updateOne({ _id: shipper._id }, { storeLocation: hcmStore._id }, { skipBranchIsolation: true });

        // Check inventory after assignment
        console.log(`\n=== INVENTORY AFTER ASSIGNING STORE ===`);
        si = await StoreInventory.findOne({ _id: availableInventory._id }, null, { skipBranchIsolation: true }).lean();
        console.log(`- StoreInventory [Quantity: ${si.quantity}, Reserved: ${si.reserved}, Available: ${si.available}]`);

        // 5. Admin xác nhận (CONFIRMED)
        console.log("\n[3] Admin chuyển đơn sang CONFIRMED và cấu hình Shipper...");
        
        let reqConfirm = { user: admin, params: { id: orderId }, body: { status: "CONFIRMED" } };
        let resConfirm = mockRes();
        await updateOrderStatus(reqConfirm, resConfirm);
        if (resConfirm.statusVal !== 200) console.error("Confirm error:", resConfirm.jsonVal);

        // Bypass PREPARING_SHIPMENT constraint by using a warehouse manager
        const whManager = await User.findOne({ role: "WAREHOUSE_MANAGER", storeId: hcmStore._id }).lean() || admin;
        let reqPrep = { user: whManager, params: { id: orderId }, body: { status: "PREPARING_SHIPMENT" } };
        let resPrep = mockRes();
        await updateOrderStatus(reqPrep, resPrep);
        if (resPrep.statusVal !== 200) console.error("Prep error:", resPrep.jsonVal);

        let reqCarrier = { user: admin, params: { id: orderId }, body: { shipperId: shipper._id.toString() } };
        let resCarrier = mockRes();
        await assignCarrier(reqCarrier, resCarrier);
        if (resCarrier.statusVal !== 200) {
            console.error("Assign carrier error:", resCarrier.jsonVal);
        } else {
            console.log(`=> Đã gán Shipper: ${shipper.fullName}`);
        }

        let reqShip = { user: admin, params: { id: orderId }, body: { status: "SHIPPING" } };
        let resShip = mockRes();
        await updateOrderStatus(reqShip, resShip);
        if (resShip.statusVal !== 200) console.error("Ship error:", resShip.jsonVal);
        else console.log(`=> Đơn hàng chuyển sang đang giao (SHIPPING).`);

        // 6. Shipper xác nhận giao hàng
        console.log("\n[4] Shipper xác nhận giao hàng (DELIVERED)...");
        let reqDeliver = {
            user: shipper, 
            params: { id: orderId },
            body: { status: "DELIVERED", note: "Delivered successfully" }
        };
        let resDeliver = mockRes();
        await updateOrderStatus(reqDeliver, resDeliver);

        if (resDeliver.statusVal !== 200) {
            console.error("Failed to deliver:", resDeliver.jsonVal);
            console.log("\n[?] Fallback: Dùng Admin để chuyển DELIVERED");
            let reqDeliverAdmin = {
                user: admin, 
                params: { id: orderId },
                body: { status: "DELIVERED" } 
            };
            let resDeliverAdmin = mockRes();
            await updateOrderStatus(reqDeliverAdmin, resDeliverAdmin);
        } else {
            console.log(`=> Trạng thái cuối cùng. Status: ${resDeliver.jsonVal.order.status}`);
        }

        // Check inventory after delivery
        console.log(`\n=== FINAL INVENTORY AFTER DELIVERY ===`);
        si = await StoreInventory.findOne({ _id: availableInventory._id }, null, { skipBranchIsolation: true }).lean();
        console.log(`- StoreInventory [Quantity: ${si.quantity}, Reserved: ${si.reserved}, Available: ${si.available}]`);
        
        const finalPhysicalInv = await Inventory.find({ storeId: hcmStore._id, sku: availableInventory.variantSku }, null, { skipBranchIsolation: true }).lean();
        const finalTotalPhysical = finalPhysicalInv.reduce((sum, inv) => sum + inv.quantity, 0);
        console.log(`- Physical Inventory (Warehouse Bins): ${finalTotalPhysical} units distributed across ${finalPhysicalInv.length} bins.`);

        // Check Permissions Issue
        console.log("\n[?] Kiểm tra quyền Admin có thể chuyển DELIVERED trực tiếp được không?");
        let reqDeliverAdmin = {
            user: admin, 
            params: { id: orderId },
            body: { status: "DELIVERED" } 
        };
        let resDeliverAdmin = mockRes();
        await updateOrderStatus(reqDeliverAdmin, resDeliverAdmin);
        console.log(`Admin update status returns: ${resDeliverAdmin.statusVal} - JSON:`, resDeliverAdmin.jsonVal);
    });

    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
