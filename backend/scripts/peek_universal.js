
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

async function peek() {
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  
  const UProduct = conn.collection("universalproducts");
  const UVariant = conn.collection("universalvariants");

  console.log("--- PEEK START ---");
  
  const prod = await UProduct.findOne({ "specifications.chip": { $exists: true } }); // Try to find a migrated Mac/iPhone
  if (prod) {
      console.log(`Product: ${prod.name}`);
      console.log(`Specs:`, JSON.stringify(prod.specifications, null, 2));
      
      const vars = await UVariant.find({ productId: prod._id }).limit(2).toArray();
      vars.forEach(v => {
          console.log(`Variant: ${v.variantName}`);
          console.log(`Attributes:`, JSON.stringify(v.attributes, null, 2));
      });
  } else {
      console.log("No migrated product found?");
  }
  
  console.log("--- PEEK END ---");
  await conn.close();
}

peek();
