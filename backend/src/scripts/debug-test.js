
console.log("Hello from debug script");
import User from "../modules/auth/User.js";
console.log("User model imported");
import { restrictTo } from "../middleware/authMiddleware.js";
console.log("restrictTo imported");
import config from "../config/config.js";
console.log("config imported");
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

console.log("Connecting to", config.MONGODB_URI);
try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Connected to DB");
    await mongoose.disconnect();
    console.log("Disconnected");
} catch (e) {
    console.error("Connection failed", e);
}
