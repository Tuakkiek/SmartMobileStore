
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URI = process.env.MONGODB_CONNECTIONSTRING;
const uriParts = BASE_URI.split("?");
const baseUri = uriParts[0].substring(0, uriParts[0].lastIndexOf("/"));
const queryParams = uriParts[1] ? `?${uriParts[1]}` : "";

const DB_TARGET = "istore_dev";
const BACKUP_DIR = path.join(__dirname, "../backups", new Date().toISOString().replace(/[:.]/g, "-"));

const COLLECTIONS = [
  "universalproducts", 
  "brands",
  "producttypes",
  "users",
  "orders",
  "iphones", 
  "ipads", 
  "macs", 
  "airpods", 
  "applewatches", 
  "accessories"
];

async function backup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  console.log(`📦 Backing up ${DB_TARGET} to ${BACKUP_DIR}...`);
  
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  
  for (const colName of COLLECTIONS) {
    try {
      const docs = await conn.collection(colName).find({}).toArray();
      if (docs.length > 0) {
        fs.writeFileSync(
          path.join(BACKUP_DIR, `${colName}.json`), 
          JSON.stringify(docs, null, 2)
        );
        console.log(`   ✅ ${colName}: ${docs.length} docs`);
      } else {
        console.log(`   ℹ️ ${colName}: Empty`);
      }
    } catch (e) {
      console.log(`   ❌ ${colName}: Error (or not found)`);
    }
  }
  
  await conn.close();
  console.log("🎉 Backup complete.");
}

backup();
