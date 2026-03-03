import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import WarehouseLocation from "../modules/warehouse/WarehouseLocation.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const targetCode = "WH-HCM";
    const locationsCount = await WarehouseLocation.countDocuments({ warehouse: targetCode }, { skipBranchIsolation: true });
    console.log(`Expected 3600 locations, found ${locationsCount}. Investigating anomalies...`);

    const allLocs = await WarehouseLocation.find({ warehouse: targetCode }, null, { skipBranchIsolation: true }).lean();
    let overlappingOldLocations = 0;
    
    // WH-ALL derived logic uses location format WH-HCM-[A-F]-XX-XX-XX
    // Old format might be different or have load > 0
    for(const l of allLocs) {
       if(l.currentLoad > 0) {
          console.log("Location with load:", l.locationCode, "Load:", l.currentLoad, "ID:", l._id);
          overlappingOldLocations++;
       }
    }
    
    console.log("Found overlapping old locations with load:", overlappingOldLocations);

    process.exit(0);
  } catch (err) {
    console.error("Verification failed", err);
    process.exit(1);
  }
};

run();
