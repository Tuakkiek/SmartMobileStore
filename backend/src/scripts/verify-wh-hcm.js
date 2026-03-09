import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import WarehouseConfiguration from "../modules/warehouse/WarehouseConfiguration.js";
import WarehouseLocation from "../modules/warehouse/WarehouseLocation.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const targetCode = "WH-HCM";
    
    const config = await WarehouseConfiguration.findOne({ warehouseCode: targetCode }, null, { skipBranchIsolation: true }).lean();
    console.log("WH-HCM config zones count:", config?.zones?.length);
    console.log("WH-HCM config storeId:", config?.storeId);

    const locationsCount = await WarehouseLocation.countDocuments({ warehouse: targetCode }, { skipBranchIsolation: true });
    console.log("WH-HCM locations count:", locationsCount);

    const sampleLoc = await WarehouseLocation.findOne({ warehouse: targetCode }, null, { skipBranchIsolation: true }).lean();
    console.log("WH-HCM sample location:", sampleLoc);
    
    process.exit(0);
  } catch (err) {
    console.error("Verification failed", err);
    process.exit(1);
  }
};

run();
