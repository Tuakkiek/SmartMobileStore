
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

// Variant Collections to migrate
const VARIANT_COLLECTIONS = [
  "universalvariants",
  "iphonevariants", 
  "ipadvariants", 
  "macvariants", 
  "airpodsvariants", 
  "applewatchvariants", 
  "accessoryvariants" // Model name "AccessoryVariant" -> mongoose default plural "accessoryvariants"?
  // Wait, Accessory.js: mongoose.model("AccessoryVariant", accessoryVariantSchema); -> "accessoryvariants" (default plural)
  // Let's verify if "accessories_variants" was used? No, usually default.
];

async function migrate_variants() {
  console.log(`🚀 Starting Variant Migration: ${DB_SOURCE} -> ${DB_DEST}`);
  
  const connSource = await mongoose.createConnection(`${baseUri}/${DB_SOURCE}${queryParams}`).asPromise();
  const connDest = await mongoose.createConnection(`${baseUri}/${DB_DEST}${queryParams}`).asPromise();

  for (const colName of VARIANT_COLLECTIONS) {
    console.log(`\n📂 Processing: ${colName}`);
    
    try {
      const sourceDocs = await connSource.collection(colName).find({}).toArray();
      if (sourceDocs.length === 0) {
        console.log(`   ℹ️ Source empty. Skipping.`);
        continue;
      }

      const destCol = connDest.collection(colName);
      let inserted = 0;
      let skipped = 0;

      for (const doc of sourceDocs) {
        const exists = await destCol.findOne({ _id: doc._id });
        if (exists) {
            skipped++;
        } else {
            try {
                await destCol.insertOne(doc);
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
  console.log("\n🎉 Variant Migration Complete!");
}

migrate_variants();
