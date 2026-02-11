// ============================================
// FILE: backend/src/seeders/seedSampleProduct.js
// Add iPhone 17 Pro Max sample product
// ============================================

import mongoose from "mongoose";
import UniversalProduct from "../modules/product/UniversalProduct.js";
import { UniversalVariant } from "../modules/product/UniversalProduct.js";
import Brand from "../modules/brand/Brand.js";
import ProductType from "../modules/productType/ProductType.js";
import dotenv from "dotenv";

dotenv.config();

const seedSampleProduct = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("❌ MONGODB_CONNECTIONSTRING is not defined");
    }
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    // Find Apple brand
    const appleBrand = await Brand.findOne({ slug: "apple" });
    if (!appleBrand) {
      throw new Error("❌ Apple brand not found. Run seedBrandsAndTypes.js first");
    }
    console.log(`✅ Found brand: ${appleBrand.name}`);

    // Find Smartphone product type
    const smartphoneType = await ProductType.findOne({ slug: "smartphone" });
    if (!smartphoneType) {
      throw new Error("❌ Smartphone type not found. Run seedBrandsAndTypes.js first");
    }
    console.log(`✅ Found product type: ${smartphoneType.name}\n`);

    // Create base product
    const iphone17ProMax = new UniversalProduct({
      name: "iPhone 17 Pro Max",
      model: "iPhone17ProMax",
      baseSlug: "iphone-17-pro-max",
      brand: appleBrand._id,
      productType: smartphoneType._id,
      
      description: "The most advanced iPhone ever. Featuring titanium design, A18 Pro chip, and revolutionary camera system.",
      
      featuredImages: [
        "IMAGE_URL_1", // User will replace
        "IMAGE_URL_2",
        "IMAGE_URL_3",
      ],
      
      specifications: {
        screenSize: "6.9 inch",
        screenTech: "Super Retina XDR OLED",
        resolution: "2868 x 1320 pixels",
        processor: "Apple A18 Pro",
        ram: "8GB",
        battery: "4685 mAh",
        camera: "Main: 48MP, Ultra-wide: 48MP, Telephoto: 12MP (5x zoom)",
        os: "iOS 18",
        sim: "Dual SIM (nano-SIM and eSIM)",
      },
      
      condition: "NEW",
      status: "AVAILABLE",
      installmentBadge: "Trả góp 0%",
      
      averageRating: 4.9,
      totalReviews: 200,
      salesCount: 0,
      
      createdBy: new mongoose.Types.ObjectId(),
    });

    await iphone17ProMax.save();
    console.log(`📱 Created base product: ${iphone17ProMax.name}\n`);
    
    // Storage and color options
    const storages = [
      { name: "256GB", price: 34990000, stock: 30 },
      { name: "512GB", price: 40990000, stock: 25 },
      { name: "1TB", price: 46990000, stock: 20 },
      { name: "2TB", price: 52990000, stock: 15 },
    ];
    
    const colors = [
      { name: "Natural Titanium", code: "natural", img: "IMG_NATURAL" },
      { name: "Desert Titanium", code: "desert", img: "IMG_DESERT" },
      { name: "Blue Titanium", code: "blue", img: "IMG_BLUE" },
    ];
    
    const variants = [];
    
    // Create variants for each storage x color combination
    for (const storage of storages) {
      for (const color of colors) {
        const variant = new UniversalVariant({
          productId: iphone17ProMax._id,
          color: color.name,
          variantName: `${storage.name} - ${color.name}`,
          originalPrice: storage.price,
          price: storage.price,
          stock: Math.floor(storage.stock / 3),
          images: [color.img],
          sku: `iphone17promax-${storage.name.toLowerCase()}-${color.code}`,
          slug: `iphone-17-pro-max-${storage.name.toLowerCase()}-${color.code}`,
        });
        
        await variant.save();
        variants.push(variant);
      }
    }
    
    // Update product with variant IDs
    iphone17ProMax.variants = variants.map(v => v._id);
    await iphone17ProMax.save();
    
    console.log(`✅ Created ${variants.length} variants\n`);
    console.log("📦 Variants:");
    variants.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.variantName}: ${v.price.toLocaleString()} VND (Stock: ${v.stock})`);
    });
    
    console.log("\n⚠️  IMPORTANT: Update image URLs:");
    console.log("   - Product images: IMAGE_URL_1, IMAGE_URL_2, IMAGE_URL_3");
    console.log("   - Variant images: IMG_NATURAL, IMG_DESERT, IMG_BLUE");
    
    console.log("\n🎉 iPhone 17 Pro Max added successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

seedSampleProduct();
