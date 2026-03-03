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

const MAX_CHUNK_SIZE = 500;

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    console.log("Connected to MongoDB for Cloning!");

    const sourceCode = "WH-ALL";
    const targets = [
      { code: "WH-HCM", name: "Kho HCM", storeIdTag: "Hồ Chí Minh" },
      { code: "WH-CT", name: "Kho CT", storeIdTag: "Cần Thơ" },
      { code: "WH-HN", name: "Kho HN", storeIdTag: "Hà Nội" }
    ];

    // 1. Fetch Source WH-ALL Data
    const sourceConfig = await WarehouseConfiguration.findOne({ warehouseCode: sourceCode }, null, { skipBranchIsolation: true }).lean();
    if (!sourceConfig) {
      console.error("Source Warehouse WH-ALL not found!");
      process.exit(1);
    }
    
    console.log("Loading WH-ALL source locations...");
    const sourceLocations = await WarehouseLocation.find({ warehouse: sourceCode }, null, { skipBranchIsolation: true }).lean();
    console.log(`- Loaded ${sourceLocations.length} locations`);
    
    // We know from debugging that the logical 'StoreInventory' for WH-ALL is tied to this specific storeId
    const sourceStoreId = new mongoose.Types.ObjectId("698fd685e148239e25f3bfde");
    console.log(`Resolved WH-ALL store context ID: ${sourceStoreId}`);

    console.log("Loading WH-ALL store inventories...");
    const sourceStoreInventories = await StoreInventory.find({ storeId: sourceStoreId }, null, { skipBranchIsolation: true }).lean();
    console.log(`- Loaded ${sourceStoreInventories.length} store inventory records`);

    console.log("Loading WH-ALL location inventories...");
    const sourceInventories = await Inventory.find({ locationCode: /^WH-ALL/ }, null, { skipBranchIsolation: true }).lean();
    console.log(`- Loaded ${sourceInventories.length} physical inventory items`);

    // 2. Clone For Each Target
    const stores = await Store.find({}).lean();

    for (const target of targets) {
      console.log(`\n================================`);
      console.log(`Processing Target: ${target.code} (${target.name})`);
      console.log(`================================`);
      
      const targetStore = stores.find(s => s.name === target.storeIdTag);
      if (!targetStore) {
        console.log(`Store reference ${target.storeIdTag} not found. Skipping...`);
        continue;
      }
      
      const targetStoreId = targetStore._id;

      // 2.1 CLEAN UP EXISTING DESTINATION DATA
      console.log(`[${target.code}] Cleaning up old configurations, locations, and inventories...`);
      await WarehouseConfiguration.deleteOne({ warehouseCode: target.code }, { skipBranchIsolation: true });
      await WarehouseLocation.deleteMany({ warehouse: target.code }, { skipBranchIsolation: true });
      await Inventory.deleteMany({ storeId: targetStoreId }, { skipBranchIsolation: true });
      await StoreInventory.deleteMany({ storeId: targetStoreId }, { skipBranchIsolation: true });

      // 2.2 CREATE WAREHOUSE CONFIGURATION
      console.log(`[${target.code}] Cloning Configuration...`);
      const newZones = sourceConfig.zones.map(z => ({
        ...z,
        _id: new mongoose.Types.ObjectId()
      }));

      const newConfig = new WarehouseConfiguration({
        ...sourceConfig,
        _id: new mongoose.Types.ObjectId(),
        storeId: targetStoreId,
        warehouseCode: target.code,
        name: target.name,
        zones: newZones,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      delete newConfig.__v;

      await newConfig.save({ validateBeforeSave: false });

      // 2.3 CREATE WAREHOUSE LOCATIONS (Maintain mapping to clone inventory later)
      console.log(`[${target.code}] Cloning Locations...`);
      const oldLocationIdToNew = new Map();
      const newLocationDocs = [];

      for (const loc of sourceLocations) {
        const newLocCode = loc.locationCode.replace(sourceCode, target.code);
        const newId = new mongoose.Types.ObjectId();
        
        oldLocationIdToNew.set(loc._id.toString(), {
            newId,
            newLocCode
        });

        const newLoc = {
          ...loc,
          _id: newId,
          warehouse: target.code,
          locationCode: newLocCode,
          storeId: targetStoreId, 
          createdAt: new Date(),
          updatedAt: new Date()
        };
        delete newLoc.__v;
        newLocationDocs.push(newLoc);
      }

      for (let i = 0; i < newLocationDocs.length; i += MAX_CHUNK_SIZE) {
        const chunk = newLocationDocs.slice(i, i + MAX_CHUNK_SIZE);
        await WarehouseLocation.insertMany(chunk, { ordered: false, skipBranchIsolation: true });
      }

      // 2.4 CREATE STORE INVENTORIES
      console.log(`[${target.code}] Cloning StoreInventory...`);
      const newStoreInventories = [];
      for (const stInv of sourceStoreInventories) {
          const doc = {
              ...stInv,
              _id: new mongoose.Types.ObjectId(),
              storeId: targetStoreId,
              createdAt: new Date(),
              updatedAt: new Date()
          };
          delete doc.__v;
          newStoreInventories.push(doc);
      }

      for (let i = 0; i < newStoreInventories.length; i += MAX_CHUNK_SIZE) {
        const chunk = newStoreInventories.slice(i, i + MAX_CHUNK_SIZE);
        await StoreInventory.insertMany(chunk, { ordered: false, skipBranchIsolation: true });
      }

      // 2.5 CREATE INVENTORIES (Physical distribution across bins)
      console.log(`[${target.code}] Cloning Inventories (bin logic)...`);
      const newInventories = [];
      for (const physInv of sourceInventories) {
          const mapping = oldLocationIdToNew.get(physInv.locationId.toString());
          if (!mapping) {
              console.warn(`Warning: Location ${physInv.locationId} had inventory but couldn't find mapping for ${target.code}.`);
              continue;
          }

          const doc = {
              ...physInv,
              _id: new mongoose.Types.ObjectId(),
              storeId: targetStoreId,
              locationId: mapping.newId,
              locationCode: mapping.newLocCode,
              createdAt: new Date(),
              updatedAt: new Date()
          };
          delete doc.__v;
          newInventories.push(doc);
      }

      for (let i = 0; i < newInventories.length; i += MAX_CHUNK_SIZE) {
        const chunk = newInventories.slice(i, i + MAX_CHUNK_SIZE);
        await Inventory.insertMany(chunk, { ordered: false, skipBranchIsolation: true });
      }
      
      console.log(`[${target.code}] Done! Inserted ${newLocationDocs.length} locations, ${newStoreInventories.length} store stocks, ${newInventories.length} physical records.`);
    }

    console.log("\n================================");
    console.log("All Clones Completed Successfully!");
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
