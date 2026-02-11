
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

async function inspect_airpods_type() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  
  const ProductType = conn.collection("producttypes");
  const User = conn.collection("users");

  console.log("🔍 Inspecting AirPods ProductType...");
  
  const doc = await ProductType.findOne({ name: "AirPods" });
  if (doc) {
      console.log("📄 Document found:");
      console.log(JSON.stringify(doc, null, 2));
      
      if (!doc.createdBy) {
          console.log("\n⚠️ 'createdBy' is MISSING!");
          
          // Fix it?
          const admin = await User.findOne({ role: "ADMIN" });
          if (admin) {
              console.log(`🛠️ Fixing: Assigning to Admin (${admin.email})...`);
              await ProductType.updateOne({ _id: doc._id }, { $set: { createdBy: admin._id } });
              console.log("✅ Fixed!");
          } else {
              console.log("❌ No Admin found to assign.");
          }
      } else {
          console.log("✅ 'createdBy' exists:", doc.createdBy);
      }
  } else {
      console.log("❌ ProductType 'AirPods' not found.");
  }

  await conn.close();
}

inspect_airpods_type();
