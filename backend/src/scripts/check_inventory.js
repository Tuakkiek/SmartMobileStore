import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import StoreInventory from "../modules/inventory/StoreInventory.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    
    // Find unique storeIds in StoreInventory
    const uniqueStoreIds = await StoreInventory.distinct("storeId", {}, { skipBranchIsolation: true });
    console.log("StoreInventory unique storeIds:", uniqueStoreIds);

    const sample = await StoreInventory.findOne({}, null, { skipBranchIsolation: true }).lean();
    console.log("Sample StoreInventory:", JSON.stringify(sample, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
