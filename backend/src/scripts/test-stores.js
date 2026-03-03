import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import User from "../modules/auth/User.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const admin = await User.findOne({ role: "GLOBAL_ADMIN" }).lean();
    if (!admin) {
        console.log("No GLOBAL_ADMIN found");
        process.exit(1);
    }
    
    console.log(`Found admin: ${admin.fullName} (${admin.phoneNumber})`);
    
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || "fallback_secret", {
        expiresIn: "1h",
    });

    try {
      const resStores = await axios.get("http://localhost:5000/api/stores", {
        params: { limit: 200, status: "ACTIVE" },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("Stores response length:", resStores.data.stores?.length);
      console.log("Stores data properties:", Object.keys(resStores.data));
    } catch (apiErr) {
       console.error("API error:", apiErr?.response?.data || apiErr.message);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
