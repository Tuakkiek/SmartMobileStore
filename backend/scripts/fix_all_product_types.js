
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

async function fix_all_types() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  
  const ProductType = conn.collection("producttypes");
  const User = conn.collection("users");

  console.log("🔍 Scanning ALL ProductTypes for missing 'createdBy'...");
  
  const admin = await User.findOne({ role: "ADMIN" });
  if (!admin) {
      console.error("❌ No ADMIN user found! Cannot assign owner.");
      await conn.close();
      return;
  }
  console.log(`👤 Admin found: ${admin.fullName} (${admin.email})`);

  const types = await ProductType.find({ createdBy: { $exists: false } }).toArray();
  
  if (types.length === 0) {
      console.log("✅ All ProductTypes already have 'createdBy'.");
  } else {
      console.log(`⚠️ Found ${types.length} types with missing 'createdBy':`);
      for (const t of types) {
          console.log(`   - ${t.name}`);
      }

      console.log("\n🛠️ Fixing...");
      const result = await ProductType.updateMany(
          { createdBy: { $exists: false } },
          { $set: { createdBy: admin._id } }
      );
      console.log(`✅ Fixed ${result.modifiedCount} documents.`);
  }

  await conn.close();
}

fix_all_types();
