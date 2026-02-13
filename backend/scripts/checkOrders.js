
import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Order from "../src/modules/order/Order.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const checkOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log("✅ Connected to MongoDB");
        
        const count = await Order.countDocuments({ status: "PENDING" });
        console.log(`Found ${count} PENDING orders.`);

        if (count > 0) {
            const orders = await Order.find({ status: "PENDING" }).limit(5);
            orders.forEach(o => {
                console.log(`- Order: ${o.orderNumber}, ID: ${o._id}, Status: ${o.status}`);
            });
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

checkOrders();
