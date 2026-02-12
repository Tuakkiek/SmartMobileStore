
// Script to seed test data for Warehouse System
// Usage: node backend/scripts/seedTestWarehouse.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import User from "../src/modules/auth/User.js";
import UniversalProduct, { UniversalVariant } from "../src/modules/product/UniversalProduct.js";
import Order from "../src/modules/order/Order.js";
import PurchaseOrder from "../src/modules/warehouse/PurchaseOrder.js";
import WarehouseLocation from "../src/modules/warehouse/WarehouseLocation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
};

const seedData = async () => {
    await connectDB();

    try {
        // 1. Get Admin User (as creator)
        const admin = await User.findOne({ role: "ADMIN" });
        if (!admin) throw new Error("No ADMIN user found. Please register an admin first.");

        // 2. Get a Random Product
        const product = await UniversalProduct.findOne();
        if (!product) throw new Error("No products found. Please seed products first.");

        const variant = await UniversalVariant.findOne({ productId: product._id });
        if (!variant) throw new Error("No variants found for product.");

        console.log(`📦 Selected Product: ${product.name} (${variant.sku})`);

        // 3. Create Warehouse Locations (if not exist)
        const locationCode = "WH-HCM-A-01-01";
        let location = await WarehouseLocation.findOne({ locationCode });
        if (!location) {
            location = await WarehouseLocation.create({
                locationCode,
                zone: "Khu A - Điện thoại",
                zoneName: "Khu A - Điện thoại",
                aisle: "01",
                shelf: "01",
                bin: "01",
                capacity: 100,
                currentLoad: 0,
                type: "PICKING",
                status: "ACTIVE"
            });
            console.log("✅ Created Location:", locationCode);
        }

        // 4. Create CONFIRMED Purchase Order (for Receive Goods)
        const poNumber = `PO-${Date.now().toString().slice(-6)}`;
        const po = await PurchaseOrder.create({
            poNumber,
            supplier: { name: "Apple Distribution VN", contact: "John Doe", phone: "0909000111" },
            items: [{
                sku: variant.sku,
                productId: product._id,
                productName: product.name,
                orderedQuantity: 50,
                receivedQuantity: 0,
                unitPrice: variant.price * 0.8,
                totalPrice: variant.price * 0.8 * 50
            }],
            subtotal: variant.price * 0.8 * 50,
            total: variant.price * 0.8 * 50,
            expectedDeliveryDate: new Date(),
            status: "CONFIRMED", // IMPORTANCE: Must be CONFIRMED to receive
            createdBy: admin._id,
            createdByName: admin.fullName
        });
        console.log("✅ Created CONFIRMED PO:", po.poNumber);

        // 5. Create PENDING Order (for Pick Orders)
        // Need a customer
        const customer = await User.findOne({ role: "CUSTOMER" }) || admin;
        
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
        const order = await Order.create({
            customerId: customer._id,
            items: [{
                productId: product._id,
                variantId: variant._id,
                productType: "UniversalProduct",
                productName: product.name,
                variantSku: variant.sku,
                quantity: 2,
                price: variant.price,
                total: variant.price * 2,
                images: variant.images
            }],
            shippingAddress: {
                fullName: "Test Customer",
                phoneNumber: "0909123456",
                province: "Hồ Chí Minh",
                district: "Quận 1",
                ward: "Phường Bến Nghé",
                detailAddress: "123 Lê Lợi"
            },
            paymentMethod: "COD",
            subtotal: variant.price * 2,
            totalAmount: variant.price * 2 + 30000,
            status: "PENDING" // IMPORTANCE: Must be PENDING to pick
        });
        console.log("✅ Created PENDING Order:", order.orderNumber);

        console.log("\n🎉 SEEDING COMPLETED SUCCCESSFULLY!");
        console.log("---------------------------------------");
        console.log("1. Receive Goods PO: " + po.poNumber);
        console.log("2. Pick Order: " + order.orderNumber);
        console.log("---------------------------------------");

    } catch (error) {
        console.error("❌ Seeding error:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

seedData();
