import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Store from "../modules/store/Store.js";
import WarehouseConfiguration from "../modules/warehouse/WarehouseConfiguration.js";
import WarehouseLocation from "../modules/warehouse/WarehouseLocation.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const stores = await Store.find({}).lean();
    console.log("Available Sub-stores/Branches:");
    stores.forEach(s => console.log(`- ${s.name} ${s.type} (ID: ${s._id})`));
    
    const sourceCode = "WH-ALL";
    const sourceLocations = await WarehouseLocation.find({ warehouse: sourceCode }, null, { skipBranchIsolation: true }).limit(1).lean();
    console.log(`WH-ALL source locations sample:`, sourceLocations);

    const whhcmConfig = await WarehouseConfiguration.findOne({ warehouseCode: "WH-HCM" }, null, { skipBranchIsolation: true }).lean();
    console.log("WH-HCM existing config:", !!whhcmConfig);

    const sampleAllConfig = await WarehouseConfiguration.findOne({ warehouseCode: "WH-ALL" }, null, { skipBranchIsolation: true }).lean();
    console.log("WH-ALL Config zones count:", sampleAllConfig?.zones?.length);
    console.log("WH-ALL Config locations total:", sampleAllConfig?.totalLocations);
    
    if (sampleAllConfig?.zones?.length > 0) {
        console.log("Zone detail sample:", sampleAllConfig.zones[0]);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
