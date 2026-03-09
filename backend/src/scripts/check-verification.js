import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import WarehouseConfiguration from "../modules/warehouse/WarehouseConfiguration.js";
import WarehouseLocation from "../modules/warehouse/WarehouseLocation.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";
import Inventory from "../modules/warehouse/Inventory.js";
import Store from "../modules/store/Store.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    
    const targets = ["WH-HCM", "WH-CT", "WH-HN"];
    
    const globalId = new mongoose.Types.ObjectId("698fd685e148239e25f3bfde");
    const sourceStoreInventories = await StoreInventory.countDocuments({ storeId: globalId }, { skipBranchIsolation: true });
    const sourceInventories = await Inventory.countDocuments({ locationCode: /^WH-ALL/ }, { skipBranchIsolation: true });

    console.log(`Source WH-ALL Store Inventories: ${sourceStoreInventories}`);
    console.log(`Source WH-ALL Physical Inventories: ${sourceInventories}`);

    for (const code of targets) {
        let storeName = "";
        if (code === "WH-HCM") storeName = "Hồ Chí Minh";
        if (code === "WH-CT") storeName = "Cần Thơ";
        if (code === "WH-HN") storeName = "Hà Nội";
        
        const store = await Store.findOne({ name: storeName }).lean();
        const sc = await WarehouseConfiguration.findOne({ warehouseCode: code }, null, { skipBranchIsolation: true }).lean();
        const sl = await WarehouseLocation.countDocuments({ warehouse: code }, { skipBranchIsolation: true });
        const si = await StoreInventory.countDocuments({ storeId: store._id }, { skipBranchIsolation: true });
        const phys = await Inventory.countDocuments({ storeId: store._id, locationCode: new RegExp(`^${code}`) }, { skipBranchIsolation: true });
        
        console.log(`--- ${code} ---`);
        console.log(`Configurations OK: ${!!sc}`);
        console.log(`Locations (should be 3600): ${sl}`);
        console.log(`StoreInventory (should be ${sourceStoreInventories}): ${si}`);
        console.log(`Physical Inventory (should be ${sourceInventories}): ${phys}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
