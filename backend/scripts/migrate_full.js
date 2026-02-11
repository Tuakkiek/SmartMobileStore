
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URI = process.env.MONGODB_CONNECTIONSTRING;
const uriParts = BASE_URI.split("?");
const baseUri = uriParts[0].substring(0, uriParts[0].lastIndexOf("/"));
const queryParams = uriParts[1] ? `?${uriParts[1]}` : "";

const DB_SOURCE = "test";
const DB_DEST = "istore_dev";

// Collections to migrate in order
const COLLECTIONS = [
  // 1. Meta-data (Dependencies)
  "users",
  "brands",
  "producttypes",
  
  // 2. Products
  "universalproducts",
  "products", // Legacy unified
  "iphones",
  "ipads",
  "macs",
  "airpods",
  "applewatches",
  "accessories",
  
  // 3. Orders (Depends on Users & Products)
  "orders"
];

// Helper to provide defaults for missing fields in legacy products
const getDefaultsForCollection = (colName, doc) => {
  // If it's a legacy product collection, add missing spec fields
  if (["iphones", "ipads", "macs", "airpods", "applewatches", "accessories"].includes(colName)) {
    const specs = doc.specifications || {};
    
    // Default structure for stricter schemas
    const defaults = {
        chip: "N/A",
        ram: "N/A",
        storage: "N/A",
        screenSize: "N/A",
        screenTech: "N/A",
        frontCamera: "N/A",
        rearCamera: "N/A",
        battery: "N/A",
        os: "N/A"
    };

    return {
        ...doc,
        specifications: { ...defaults, ...specs }
    };
  }
  return doc;
};

async function migrate_full() {
  console.log(`🚀 Starting Safe Migration: ${DB_SOURCE} -> ${DB_DEST}`);
  
  // Connect to Source (Test)
  const connSource = await mongoose.createConnection(`${baseUri}/${DB_SOURCE}${queryParams}`).asPromise();
  console.log(`✅ Connected to Source: ${DB_SOURCE}`);

  // Connect to Dest (Dev)
  const connDest = await mongoose.createConnection(`${baseUri}/${DB_DEST}${queryParams}`).asPromise();
  console.log(`✅ Connected to Dest: ${DB_DEST}`);

  for (const colName of COLLECTIONS) {
    console.log(`\n📂 Processing: ${colName}`);
    
    try {
      // 1. Get all source docs
      const sourceDocs = await connSource.collection(colName).find({}).toArray();
      if (sourceDocs.length === 0) {
        console.log(`   ℹ️ Source empty. Skipping.`);
        continue;
      }

      const destCol = connDest.collection(colName);
      let inserted = 0;
      let skipped = 0;

      for (const doc of sourceDocs) {
        // 2. Check if exists in Dest
        const exists = await destCol.findOne({ _id: doc._id });
        
        if (exists) {
            // SAFE MERGE: Skip existing
            skipped++;
        } else {
            // SAFE MERGE: Insert new (with defaults)
            const safeDoc = getDefaultsForCollection(colName, doc);
            try {
                await destCol.insertOne(safeDoc);
                inserted++;
            } catch (err) {
                console.error(`   ❌ Failed to insert ${doc._id}:`, err.message);
            }
        }
      }

      console.log(`   ✅ Inserted: ${inserted}, Skipped: ${skipped}`);

    } catch (e) {
      console.error(`   ❌ Error processing collection:`, e);
    }
  }

  await connSource.close();
  await connDest.close();
  console.log("\n🎉 Migration Complete!");
}

migrate_full();
