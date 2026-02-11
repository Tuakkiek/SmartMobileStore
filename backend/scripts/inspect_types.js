
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

const DB_TARGET = "istore_dev";

async function inspectProductTypes() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  console.log(`\n🔍 Inspecting 'productType' values in ${DB_TARGET}...`);

  const collections = ["iphones", "ipads", "macs", "airpods", "applewatches", "accessories"];

  for (const col of collections) {
    try {
      const doc = await conn.collection(col).findOne({}, { projection: { productType: 1, category: 1 } });
      if (doc) {
        console.log(`✅ ${col}: productType="${doc.productType}", category="${doc.category}"`);
      } else {
        console.log(`ℹ️ ${col}: Empty`);
      }
    } catch (e) {
      console.log(`❌ ${col}: Error ${e.message}`);
    }
  }
  
  // Also check ProductTypes collection names
  console.log("\n📦 ProductType Names:");
  const types = await conn.collection("producttypes").find({}, { projection: { name: 1 } }).toArray();
  types.forEach(t => console.log(`   - "${t.name}" (ID: ${t._id})`));

  await conn.close();
}

inspectProductTypes();
