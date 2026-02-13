import mongoose from "mongoose";
import dotenv from "dotenv";
import UniversalProduct from "../src/modules/product/UniversalProduct.js";
import WarehouseLocation from "../src/modules/warehouse/WarehouseLocation.js";
import Inventory from "../src/modules/warehouse/Inventory.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: path.join(__dirname, "../.env") });

const seedInventory = async () => {
  try {
    const uri = process.env.MONGODB_CONNECTIONSTRING || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_CONNECTIONSTRING is not defined in .env");
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Clear existing Inventory
    await Inventory.deleteMany({});
    console.log("Cleared existing inventory");

    // Reset location loads
    await WarehouseLocation.updateMany({}, { currentLoad: 0 });
    console.log("Reset location loads");

    // Fetch active products and locations
    const allProducts = await UniversalProduct.find({}).populate("variants");
    console.log(`Total products in DB: ${allProducts.length}`);
    const products = await UniversalProduct.find({ isActive: true }).populate("variants");
    
    // If no active products, maybe use all?
    const productsToUse = products.length > 0 ? products : allProducts;

    const locations = await WarehouseLocation.find({ status: "ACTIVE" });

    if (productsToUse.length === 0) {
      console.log("No products found (active or inactive).");
      process.exit(0);
    }

    if (locations.length === 0) {
      console.log("No active locations found. Please run location generation script first.");
      process.exit(1);
    }

    console.log(`Found ${productsToUse.length} products (to use) and ${locations.length} locations`);

    const inventoryItems = [];
    let locationIndex = 0;
    const QUANTITY_PER_ITEM = 50;

    for (const product of productsToUse) {
      // Handle both top-level product (if no variants) and variants
      // But UniversalProduct usually has variants.
      const variants = product.variants && product.variants.length > 0 ? product.variants : [];

      if (variants.length === 0) {
        // Fallback or skip? Let's skip for now as UniversalProduct structure implies variants
        continue;
      }

      for (const variant of variants) {
        // Assign to a location (round robin)
        const location = locations[locationIndex % locations.length];
        
        // Ensure we don't exceed capacity if we loop around too much
        // For simplicity, we just reset load at start and assume round robin distributes enough
        // But let's check capacity
        if (location.currentLoad + QUANTITY_PER_ITEM > location.capacity) {
            // Find another location? Or just skip
            // Try next 10 locations
            let found = false;
            for(let i=1; i<=10; i++) {
                const nextLoc = locations[(locationIndex + i) % locations.length];
                if (nextLoc.currentLoad + QUANTITY_PER_ITEM <= nextLoc.capacity) {
                    locationIndex = (locationIndex + i);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.warn(`Skipping ${variant.sku}: No space in checked locations`);
                continue;
            }
        }
        
        // Use the (possibly updated) location
        const targetLocation = locations[locationIndex % locations.length];

        inventoryItems.push({
          sku: variant.sku,
          productId: product._id,
          productName: `${product.name} - ${variant.color} - ${variant.storage}`,
          locationId: targetLocation._id,
          locationCode: targetLocation.locationCode,
          quantity: QUANTITY_PER_ITEM,
          status: "GOOD",
        });

        // Update local tracking of load
        targetLocation.currentLoad += QUANTITY_PER_ITEM;
        
        // Move to next location for next item
        locationIndex++;
      }
    }

    // Bulk insert inventory
    if (inventoryItems.length > 0) {
        await Inventory.insertMany(inventoryItems);
        console.log(`Successfully seeded ${inventoryItems.length} inventory items.`);
    }

    // Update WarehouseLocation currentLoad in DB
    // We updated local objects, need to persist. 
    // Bulk write is better but loop save is easier for script
    console.log("Updating location loads in DB...");
    const bulkOps = locations.map(loc => ({
        updateOne: {
            filter: { _id: loc._id },
            update: { currentLoad: loc.currentLoad }
        }
    }));
    
    if (bulkOps.length > 0) {
        await WarehouseLocation.bulkWrite(bulkOps);
    }
    console.log("Updated location loads.");

    // Update Product Total Stock
    console.log("Updating product total stocks...");
    for (const product of products) {
        let total = 0;
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(v => {
                // Check if we added inventory for this SKU
                const added = inventoryItems.find(i => i.sku === v.sku);
                if (added) {
                    v.totalStock = added.quantity; // Set to what we seeded
                    total += added.quantity;
                } else {
                    v.totalStock = 0;
                }
            });
            product.totalStock = total;
            await product.save();
        }
    }
    console.log("Updated product stocks.");

    console.log("DONE!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding inventory:", error);
    process.exit(1);
  }
};

seedInventory();
