import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import Inventory from "../modules/warehouse/Inventory.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    
    const sampleInv = await Inventory.findOne({ locationCode: /^WH-ALL/ }, null, { skipBranchIsolation: true }).lean();
    console.log("Sample Inv:", sampleInv);

    const storeIds = await StoreInventory.distinct("storeId", {}, { skipBranchIsolation: true });
    console.log("StoreInventory unique storeIds:", storeIds);

    const matchHN = await StoreInventory.countDocuments({ storeId: new mongoose.Types.ObjectId("698fd684e148239e25f3bfca") });
    console.log("HN StoreInventory Count:", matchHN);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
