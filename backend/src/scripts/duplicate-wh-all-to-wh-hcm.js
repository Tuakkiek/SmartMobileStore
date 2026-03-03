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

    const sourceCode = "WH-ALL";
    const targetCode = "WH-HCM";
    const targetName = "Kho HCM";
    const storeId = new mongoose.Types.ObjectId("698fd685e148239e25f3bfda"); // Hồ Chí Minh STORE

    // 1. Copy Configuration
    const sourceConfig = await WarehouseConfiguration.findOne({ warehouseCode: sourceCode }, null, { skipBranchIsolation: true }).lean();
    if (!sourceConfig) {
      console.log("WH-ALL not found");
      process.exit(1);
    }
    
    console.log(`Found WH-ALL, duplicating to ${targetCode}...`);
    
    // Check if WH-HCM already exists
    const existingConfig = await WarehouseConfiguration.findOne({ warehouseCode: targetCode }, null, { skipBranchIsolation: true }).lean();
    if (existingConfig) {
      console.log(`${targetCode} already exists. Deleting it first.`);
      await WarehouseConfiguration.deleteOne({ warehouseCode: targetCode }, { skipBranchIsolation: true });
      await WarehouseLocation.deleteMany({ warehouse: targetCode }, { skipBranchIsolation: true });
    }

    const newZones = sourceConfig.zones.map(z => ({
      ...z,
      _id: new mongoose.Types.ObjectId()
    }));

    const newConfig = new WarehouseConfiguration({
      ...sourceConfig,
      _id: new mongoose.Types.ObjectId(),
      storeId: storeId,
      warehouseCode: targetCode,
      name: targetName,
      zones: newZones,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newConfig.save({ validateBeforeSave: false }); 
    console.log(`Created WarehouseConfiguration for ${targetCode}`);

    // 2. Copy Locations
    const sourceLocations = await WarehouseLocation.find({ warehouse: sourceCode }, null, { skipBranchIsolation: true }).lean();
    console.log(`Found ${sourceLocations.length} locations in WH-ALL.`);

    const newLocations = [];
    
    for (const loc of sourceLocations) {
      const newLocCode = loc.locationCode.replace(sourceCode, targetCode);
      const newLoc = {
        ...loc,
        _id: new mongoose.Types.ObjectId(),
        warehouse: targetCode,
        locationCode: newLocCode,
        storeId: storeId, // Link to HCM branch
        currentLoad: 0, // Empty warehouse
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Remove any unwanted fields from lean object before insert
      delete newLoc.__v;
      newLocations.push(newLoc);
    }

    // Insert in chunks to avoid memory issues or bulk write limitations
    const chunkSize = 500;
    for (let i = 0; i < newLocations.length; i += chunkSize) {
      const chunk = newLocations.slice(i, i + chunkSize);
      await WarehouseLocation.insertMany(chunk, { ordered: false, skipBranchIsolation: true });
      console.log(`Inserted chunk of ${chunk.length} locations...`);
    }
    
    console.log(`Successfully completed creating WH-HCM with ${newLocations.length} locations.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
