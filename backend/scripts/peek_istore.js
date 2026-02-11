
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

const DB_DEST = "istore_dev";

async function peek() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_DEST}${queryParams}`).asPromise();
  console.log(`\n🔍 Peeking into ${DB_DEST}...`);
  
  try {
    // Try to find a product in UniversalProducts first
    const uniDoc = await conn.collection("universalproducts").findOne({});
    if (uniDoc) {
        console.log("UniversalProduct Sample:");
        console.log(JSON.stringify(uniDoc, null, 2));
    } else {
        console.log("No UniversalProduct found.");
    }

    // Try finding legacy iphone
    const iphone = await conn.collection("iphones").findOne({});
    if (iphone) {
        console.log("iPhone Sample:");
        console.log(JSON.stringify(iphone, null, 2));
    } else {
        console.log("No iPhone found.");
    }

  } catch (e) {
    console.log("Error:", e);
  }
  
  await conn.close();
}

peek();
