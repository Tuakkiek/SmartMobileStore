
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

// Schemas (simplified for migration)
const UniversalProductSchema = new mongoose.Schema({}, { strict: false });
const UniversalVariantSchema = new mongoose.Schema({}, { strict: false });
const BrandSchema = new mongoose.Schema({}, { strict: false });
const ProductTypeSchema = new mongoose.Schema({}, { strict: false });

async function migrate_legacy_to_universal() {
  console.log(`🚀 Starting Full Migration to Universal Products (${DB_TARGET})...`);
  
  const conn = await mongoose.createConnection(`${baseUri}/${DB_TARGET}${queryParams}`).asPromise();
  
  const UniversalProduct = conn.model("UniversalProduct", UniversalProductSchema, "universalproducts");
  const UniversalVariant = conn.model("UniversalVariant", UniversalVariantSchema, "universalvariants");
  const Brand = conn.model("Brand", BrandSchema, "brands");
  const ProductType = conn.model("ProductType", ProductTypeSchema, "producttypes");

  // 1. Get Reference IDs
  console.log("🔍 Fetching References...");
  
  // Find or Create "Apple" Brand
  let appleBrand = await Brand.findOne({ name: "Apple" });
  if (!appleBrand) {
      console.log("   ⚠️ Brand 'Apple' not found. Please ensure brands are seeded.");
      // Fallback: Find ANY brand or fail
      appleBrand = await Brand.findOne({});
      if (!appleBrand) throw new Error("No brands found!");
  }
  const BRAND_ID = appleBrand._id;
  console.log(`   ✅ Brand: ${appleBrand.name} (${BRAND_ID})`);

  // Map Product Types
  const typeMap = {}; // "iPhone" -> _id
  const types = await ProductType.find({});
  types.forEach(t => typeMap[t.name] = t._id);
  
  // Also map aliases just in case
  if (typeMap["Apple Watch"]) typeMap["AppleWatch"] = typeMap["Apple Watch"];
  
  console.log("   ✅ Product Types mapped:", Object.keys(typeMap).join(", "));


  // 2. Define Legacy Collections & Mappings
  const collections = [
      { 
          name: "iphones", 
          variantCol: "iphonevariants", 
          typeName: "iPhone",
          productSpecs: ["screen", "camera", "chip", "sim", "battery", "operatingSystem", "design", "faceId"],
          variantAttrs: ["storage"]
      },
      { 
          name: "ipads", 
          variantCol: "ipadvariants", 
          typeName: "iPad",
          productSpecs: ["screen", "camera", "chip", "battery", "operatingSystem", "design"],
          variantAttrs: ["storage", "connectivity"]
      },
      { 
          name: "macs", 
          variantCol: "macvariants", 
          typeName: "Mac",
          productSpecs: ["chip", "gpu", "ram", "storage", "screenSize", "screenResolution", "battery", "os"],
          variantAttrs: ["cpuGpu", "ram", "storage"] 
      },
      { 
          name: "applewatches", 
          variantCol: "applewatchvariants", 
          typeName: "Apple Watch", // Uses space in ProductType
          productSpecs: ["screenSize", "cpu", "os", "storage", "batteryLife", "features", "healthFeatures"],
          variantAttrs: ["variantName"] // It explicitly has variantName usually
      },
      { 
          name: "airpods", 
          variantCol: "airpodsvariants", 
          typeName: "AirPods",
          productSpecs: ["type", "battery", "chip", "waterResistance", "connectivity"],
          variantAttrs: ["variantName"]
      },
      {
          name: "accessories", // "Accessories" in ProductType?
          variantCol: "accessoryvariants",
          typeName: "Accessories", // Check Map
          productSpecs: ["compatibility", "storages", "customSpecs"],
          variantAttrs: ["storage", "compatibility"]
      }
  ];

  // 3. Process Collections
  for (const col of collections) {
      console.log(`\n📂 Processing Collection: ${col.name} -> ${col.typeName}`);
      
      let typeId = typeMap[col.typeName];
      if (!typeId && col.typeName === "Accessories") typeId = typeMap["Accessory"]; // Try singular
      
      if (!typeId) {
          console.warn(`   ⚠️ Skipping: Product Type '${col.typeName}' not found in DB.`);
          continue;
      }

      const legacyProducts = await conn.collection(col.name).find({}).toArray();
      let imported = 0;
      let skipped = 0;

      for (const legProd of legacyProducts) {
          // Check if already exists in Universal
          const exists = await UniversalProduct.findOne({ baseSlug: legProd.baseSlug || legProd.slug });
          if (exists) {
              skipped++;
              continue;
          }

          // Fetch Variants
          const legacyVariants = await conn.collection(col.variantCol).find({ productId: legProd._id }).toArray();
          
          // Map Specs
          const specifications = {};
          if (legProd.specifications) {
              // Copy explicit specs
               Object.keys(legProd.specifications).forEach(k => {
                   specifications[k] = legProd.specifications[k];
               });
          }
          // Flatten legacy top-level spec fields if they exist outside 'specifications' object (some old schemas might)
          col.productSpecs.forEach(field => {
             if (legProd[field]) specifications[field] = legProd[field];
          });


          // Create Universal Variants
          const newVariantIds = [];
          for (const legVar of legacyVariants) {
              
              // Build Attributes
              const attributes = {};
              col.variantAttrs.forEach(field => {
                  if (legVar[field]) attributes[field] = legVar[field];
              });

              // Determine Variant Name
              let variantName = legVar.variantName;
              if (!variantName) {
                  // Construct from attributes
                  const inputs = [];
                  if (attributes.storage) inputs.push(attributes.storage);
                  if (attributes.ram) inputs.push(`${attributes.ram} RAM`);
                  if (attributes.connectivity) inputs.push(attributes.connectivity);
                  if (attributes.cpuGpu) inputs.push(attributes.cpuGpu);
                  
                  variantName = inputs.join(" - ") || legProd.model; 
                  // If iPhone, often storage is enough "256GB"
              }


              const uVariant = new UniversalVariant({
                  productId: null, // Set later
                  color: legVar.color,
                  variantName: variantName,
                  originalPrice: legVar.originalPrice,
                  price: legVar.price,
                  stock: legVar.stock,
                  images: legVar.images || [],
                  sku: legVar.sku,
                  slug: legVar.slug || `${legProd.slug}-${Date.now()}`, // Ensure slug
                  attributes: attributes, // ✅ NEW FIELD
                  salesCount: legVar.salesCount || 0,
                  createdAt: legVar.createdAt,
                  updatedAt: legVar.updatedAt
              });
              
              const savedVar = await uVariant.save();
              newVariantIds.push(savedVar._id);
          }


          // Create Universal Product
          const uProduct = new UniversalProduct({
              name: legProd.name,
              model: legProd.model,
              baseSlug: legProd.baseSlug || legProd.slug,
              slug: legProd.slug,
              description: legProd.description || "",
              featuredImages: legProd.featuredImages || [],
              videoUrl: legProd.videoUrl,
              
              brand: BRAND_ID,
              productType: typeId,
              specifications: specifications,
              
              condition: legProd.condition || "NEW",
              status: legProd.status || "AVAILABLE",
              installmentBadge: legProd.installmentBadge || "NONE",
              
              createdBy: legProd.createdBy, // Assume User ID exists
              averageRating: legProd.averageRating,
              totalReviews: legProd.totalReviews,
              salesCount: legProd.salesCount || 0,
              
              variants: newVariantIds,
              createdAt: legProd.createdAt,
              updatedAt: legProd.updatedAt
          });

          const savedProd = await uProduct.save();

          // Link variants back to product
          await UniversalVariant.updateMany(
              { _id: { $in: newVariantIds } },
              { $set: { productId: savedProd._id } }
          );

          imported++;
      }
      console.log(`   ✅ Imported: ${imported}, Skipped: ${skipped}`);
  }

  await conn.close();
  console.log("\n🎉 Full Legacy Migration Complete!");
}

migrate_legacy_to_universal();
