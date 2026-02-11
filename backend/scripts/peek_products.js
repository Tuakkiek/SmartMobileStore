
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

async function peek() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_SOURCE}${queryParams}`).asPromise();
  console.log(`\n🔍 Peeking into ${DB_SOURCE}.products...`);
  
  try {
    const doc = await conn.collection("products").findOne({});
    console.log(JSON.stringify(doc, null, 2));
  } catch (e) {
    console.log("Error:", e);
  }
  
  await conn.close();
}

peek();
