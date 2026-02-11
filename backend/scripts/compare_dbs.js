
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URI = process.env.MONGODB_CONNECTIONSTRING;
// Extract the base connection string without the db name
// e.g., mongodb+srv://user:pass@host/istore_dev?... -> mongodb+srv://user:pass@host/
const uriParts = BASE_URI.split("?");
const baseUri = uriParts[0].substring(0, uriParts[0].lastIndexOf("/"));
const queryParams = uriParts[1] ? `?${uriParts[1]}` : "";

const DB_SOURCE = "test";
const DB_DEST = "istore_dev";

const COUNT_COLLECTIONS = [
  "universalproducts", 
  "products", // Legacy products (if any)
  "iphones", 
  "ipads", 
  "macs", 
  "airpods", 
  "applewatches", 
  "accessories",
  "brands",
  "producttypes",
  "users",
  "orders"
];

async function getCounts(dbName) {
  const conn = await mongoose.createConnection(`${baseUri}/${dbName}${queryParams}`).asPromise();
  console.log(`\n📊 Database: ${dbName}`);
  const result = {};
  
  for (const col of COUNT_COLLECTIONS) {
    try {
      const count = await conn.collection(col).countDocuments();
      result[col] = count;
      console.log(`   - ${col}: ${count}`);
    } catch (e) {
      console.log(`   - ${col}: 0 (or not found)`);
      result[col] = 0;
    }
  }
  await conn.close();
  return result;
}

async function run() {
  console.log("🔄 Starting Database Comparison...");
  try {
    await getCounts(DB_SOURCE);
    await getCounts(DB_DEST);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
