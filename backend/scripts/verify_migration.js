
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

// Schemas
const UniversalProductSchema = new mongoose.Schema({}, { strict: false });
const UniversalVariantSchema = new mongoose.Schema({}, { strict: false });

async function verify_migration() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  const UniversalProduct = conn.model("UniversalProduct", UniversalProductSchema, "universalproducts");
  const UniversalVariant = conn.model("UniversalVariant", UniversalVariantSchema, "universalvariants");

  console.log(`\n🔍 Verifying Migration in ${DB_TARGET}...`);

  // Count
  const pCount = await UniversalProduct.countDocuments({});
  const vCount = await UniversalVariant.countDocuments({});
  console.log(`📊 Total Universal Products: ${pCount}`);
  console.log(`📊 Total Universal Variants: ${vCount}`);

  // Sample iPhone Variant
  console.log("\n🍏 Sample iPhone Variant (Check attributes):");
  const iphoneVar = await UniversalVariant.findOne({ "attributes.storage": { $exists: true } });
  if (iphoneVar) {
      console.log(`   - SKU: ${iphoneVar.sku}`);
      console.log(`   - Name: ${iphoneVar.variantName}`);
      console.log(`   - Attributes:`, iphoneVar.attributes);
  } else {
      console.log("   ❌ No variant found with 'attributes.storage'!");
  }

  // Sample Mac Variant
  console.log("\n💻 Sample Mac Variant (Check attributes):");
  const macVar = await UniversalVariant.findOne({ "attributes.cpuGpu": { $exists: true } });
  if (macVar) {
      console.log(`   - SKU: ${macVar.sku}`);
      console.log(`   - Name: ${macVar.variantName}`);
      console.log(`   - Attributes:`, macVar.attributes);
  } else {
      console.log("   ❌ No variant found with 'attributes.cpuGpu'!");
  }

  await conn.close();
}

verify_migration();
