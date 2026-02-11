// ============================================
// FILE: backend/src/seeders/seedBrandsAndTypes.js  
// Seeding script - ENGLISH NAMES
// ============================================

import mongoose from "mongoose";
import Brand from "../modules/brand/Brand.js";
import ProductType from "../modules/productType/ProductType.js";
import dotenv from "dotenv";

dotenv.config();

// ============================================
// DEFAULT BRANDS
// ============================================
const defaultBrands = [
  // Smartphone & Electronics
  {
    name: "Apple",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    description: "American multinational technology company",
    website: "https://www.apple.com",
    status: "ACTIVE",
  },
  {
    name: "Samsung",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
    description: "South Korean multinational electronics corporation",
    website: "https://www.samsung.com",
    status: "ACTIVE",
  },
  {
    name: "Xiaomi",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg",
    description: "Chinese electronics company",
    website: "https://www.mi.com",
    status: "ACTIVE",
  },
  {
    name: "OPPO",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/89/Oppo_logo_2019.svg",
    description: "Chinese consumer electronics manufacturer",
    website: "https://www.oppo.com",
    status: "ACTIVE",
  },
  {
    name: "Huawei",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/Huawei_Standard_logo.svg",
    description: "Chinese telecommunications equipment company",
    website: "https://www.huawei.com",
    status: "ACTIVE",
  },
  {
    name: "Realme",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Realme_logo.svg",
    description: "Chinese smartphone manufacturer",
    website: "https://www.realme.com",
    status: "ACTIVE",
  },
  {
    name: "Vivo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Vivo_logo_2019.svg",
    description: "Chinese technology company",
    website: "https://www.vivo.com",
    status: "ACTIVE",
  },
  {
    name: "Nokia",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg",
    description: "Finnish multinational telecommunications company",
    website: "https://www.nokia.com",
    status: "ACTIVE",
  },
  // Laptop & Computer
  {
    name: "Dell",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg",
    description: "American computer technology company",
    website: "https://www.dell.com",
    status: "ACTIVE",
  },
  {
    name: "HP",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg",
    description: "American information technology company",
    website: "https://www.hp.com",
    status: "ACTIVE",
  },
  {
    name: "Lenovo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Lenovo_logo_2015.svg",
    description: "Chinese multinational technology company",
    website: "https://www.lenovo.com",
    status: "ACTIVE",
  },
  {
    name: "Asus",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
    description: "Taiwanese multinational computer hardware company",
    website: "https://www.asus.com",
    status: "ACTIVE",
  },
  {
    name: "Acer",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_2011.svg",
    description: "Taiwanese multinational hardware company",
    website: "https://www.acer.com",
    status: "ACTIVE",
  },
  {
    name: "MSI",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/59/MSI_Logo.svg",
    description: "Taiwanese multinational information technology corporation",
    website: "https://www.msi.com",
    status: "ACTIVE",
  },
  {
    name: "Microsoft",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    description: "American multinational technology corporation",
    website: "https://www.microsoft.com",
    status: "ACTIVE",
  },
  // TV & Home Electronics
  {
    name: "LG",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg",
    description: "South Korean multinational electronics company",
    website: "https://www.lg.com",
    status: "ACTIVE",
  },
  {
    name: "Sony",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
    description: "Japanese multinational conglomerate corporation",
    website: "https://www.sony.com",
    status: "ACTIVE",
  },
  {
    name: "TCL",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/TCL_Logo.svg",
    description: "Chinese electronics company",
    website: "https://www.tcl.com",
    status: "ACTIVE",
  },
  {
    name: "Panasonic",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Panasonic_logo_%28Blue%29.svg",
    description: "Japanese multinational electronics corporation",
    website: "https://www.panasonic.com",
    status: "ACTIVE",
  },
  // Audio
  {
    name: "Bose",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Bose_logo.svg",
    description: "American audio equipment corporation",
    website: "https://www.bose.com",
    status: "ACTIVE",
  },
  {
    name: "JBL",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/43/JBL_logo.svg",
    description: "American audio equipment manufacturer",
    website: "https://www.jbl.com",
    status: "ACTIVE",
  },
  {
    name: "Beats",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Beats_Electronics_logo.svg",
    description: "American consumer audio products manufacturer",
    website: "https://www.beatsbydre.com",
    status: "ACTIVE",
  },
  {
    name: "Sennheiser",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/be/Sennheiser_logo.svg",
    description: "German audio equipment manufacturer",
    website: "https://www.sennheiser.com",
    status: "ACTIVE",
  },
  // Gaming
  {
    name: "Razer",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Razer_snake_logo.svg",
    description: "Singapore-American gaming hardware manufacturer",
    website: "https://www.razer.com",
    status: "ACTIVE",
  },
  {
    name: "Logitech",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Logitech_logo.svg",
    description: "Swiss-American computer peripherals manufacturer",
    website: "https://www.logitech.com",
    status: "ACTIVE",
  },
];

// ============================================
// PRODUCT TYPES - ENGLISH NAMES (13 types)
// ============================================
const defaultProductTypes = [
  {
    name: "Smartphone",
    slug: "smartphone",
    description: "Mobile phones with advanced features",
    icon: "📱",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Screen Size", type: "text", required: true, options: [], placeholder: "e.g., 6.7 inch" },
      { key: "screenTech", label: "Display Technology", type: "select", required: false, options: ["OLED", "AMOLED", "Super AMOLED", "IPS LCD", "Dynamic AMOLED"], placeholder: "" },
      { key: "resolution", label: "Resolution", type: "text", required: false, options: [], placeholder: "e.g., 2778 x 1284 pixels" },
      { key: "processor", label: "Processor", type: "text", required: true, options: [], placeholder: "e.g., Apple A17 Pro" },
      { key: "ram", label: "RAM", type: "select", required: false, options: ["4GB", "6GB", "8GB", "12GB", "16GB"], placeholder: "" },
      { key: "battery", label: "Battery Capacity", type: "text", required: false, options: [], placeholder: "e.g., 4422 mAh" },
      { key: "camera", label: "Camera", type: "textarea", required: false, options: [], placeholder: "e.g., Main: 48MP, Ultra-wide: 12MP..." },
      { key: "os", label: "Operating System", type: "text", required: false, options: [], placeholder: "e.g., iOS 17, Android 14" },
      { key: "sim", label: "SIM", type: "select", required: false, options: ["Single SIM", "Dual SIM", "eSIM", "Dual SIM + eSIM"], placeholder: "" },
    ],
  },
  {
    name: "Tablet",
    slug: "tablet",
    description: "Portable touchscreen computers",
    icon: "�",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Screen Size", type: "text", required: true, options: [], placeholder: "e.g., 11 inch" },
      { key: "screenTech", label: "Display Technology", type: "select", required: false, options: ["IPS LCD", "OLED", "Mini LED", "Liquid Retina"], placeholder: "" },
      { key: "resolution", label: "Resolution", type: "text", required: false, options: [], placeholder: "e.g., 2388 x 1668 pixels" },
      { key: "processor", label: "Processor", type: "text", required: true, options: [], placeholder: "e.g., Apple M2, Snapdragon 8 Gen 2" },
      { key: "ram", label: "RAM", type: "select", required: false, options: ["4GB", "6GB", "8GB", "16GB"], placeholder: "" },
      { key: "battery", label: "Battery Capacity", type: "text", required: false, options: [], placeholder: "e.g., 7538 mAh" },
      { key: "os", label: "Operating System", type: "text", required: false, options: [], placeholder: "e.g., iPadOS 17, Android 14" },
      { key: "stylus", label: "Stylus Support", type: "text", required: false, options: [], placeholder: "e.g., Apple Pencil 2nd Gen" },
    ],
  },
  {
    name: "Laptop",
    slug: "laptop",
    description: "Portable personal computers",
    icon: "💻",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Screen Size", type: "select", required: true, options: ["13 inch", "14 inch", "15.6 inch", "16 inch", "17 inch"], placeholder: "" },
      { key: "resolution", label: "Resolution", type: "text", required: false, options: [], placeholder: "e.g., 2560 x 1600 pixels" },
      { key: "processor", label: "CPU", type: "text", required: true, options: [], placeholder: "e.g., Intel Core i7-13700H, Apple M3" },
      { key: "ram", label: "RAM", type: "select", required: true, options: ["8GB", "16GB", "32GB", "64GB"], placeholder: "" },
      { key: "storage", label: "Storage", type: "select", required: true, options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"], placeholder: "" },
      { key: "gpu", label: "Graphics Card", type: "text", required: false, options: [], placeholder: "e.g., NVIDIA RTX 4060" },
      { key: "os", label: "Operating System", type: "select", required: false, options: ["Windows 11", "macOS", "Linux", "ChromeOS"], placeholder: "" },
      { key: "weight", label: "Weight", type: "text", required: false, options: [], placeholder: "e.g., 1.6 kg" },
    ],
  },
  {
    name: "Smartwatch",
    slug: "smartwatch",
    description: "Wearable smart devices",
    icon: "⌚",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Display Size", type: "text", required: false, options: [], placeholder: "e.g., 1.9 inch" },
      { key: "caseSize", label: "Case Size", type: "text", required: true, options: [], placeholder: "e.g., 44mm, 41mm" },
      { key: "material", label: "Material", type: "select", required: false, options: ["Aluminum", "Stainless Steel", "Titanium", "Plastic"], placeholder: "" },
      { key: "battery", label: "Battery Life", type: "text", required: false, options: [], placeholder: "e.g., 36 hours, 2 days" },
      { key: "waterproof", label: "Water Resistance", type: "text", required: false, options: [], placeholder: "e.g., 50m, IP68" },
      { key: "sensors", label: "Sensors", type: "textarea", required: false, options: [], placeholder: "e.g., Heart rate, SpO2, GPS, ECG..." },
      { key: "compatibility", label: "Compatibility", type: "text", required: false, options: [], placeholder: "e.g., iOS, Android" },
    ],
  },
  {
    name: "Headphone",
    slug: "headphone",
    description: "Audio listening devices",
    icon: "🎧",
    status: "ACTIVE",
    specFields: [
      { key: "type", label: "Type", type: "select", required: true, options: ["In-ear", "On-ear", "Over-ear", "True Wireless"], placeholder: "" },
      { key: "connectivity", label: "Connectivity", type: "select", required: true, options: ["Bluetooth", "Wired 3.5mm", "USB-C", "Lightning"], placeholder: "" },
      { key: "anc", label: "Active Noise Cancelling", type: "select", required: false, options: ["Yes", "No"], placeholder: "" },
      { key: "battery", label: "Battery Life", type: "text", required: false, options: [], placeholder: "e.g., 6 hours (30h with case)" },
      { key: "waterproof", label: "Water Resistance", type: "text", required: false, options: [], placeholder: "e.g., IPX4, IPX7" },
      { key: "driver", label: "Driver Size", type: "text", required: false, options: [], placeholder: "e.g., 11mm dynamic" },
    ],
  },
  {
    name: "TV",
    slug: "tv",
    description: "Television displays",
    icon: "📺",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Screen Size", type: "select", required: true, options: ["32 inch", "43 inch", "50 inch", "55 inch", "65 inch", "75 inch", "85 inch"], placeholder: "" },
      { key: "resolution", label: "Resolution", type: "select", required: true, options: ["HD (720p)", "Full HD (1080p)", "4K UHD", "8K"], placeholder: "" },
      { key: "panelType", label: "Panel Type", type: "select", required: false, options: ["LED", "QLED", "OLED", "Mini LED", "Neo QLED"], placeholder: "" },
      { key: "refreshRate", label: "Refresh Rate", type: "select", required: false, options: ["60Hz", "120Hz", "144Hz"], placeholder: "" },
      { key: "hdr", label: "HDR Support", type: "select", required: false, options: ["Yes", "No"], placeholder: "" },
      { key: "smartOS", label: "Smart OS", type: "select", required: false, options: ["Android TV", "webOS", "Tizen", "Google TV", "Roku TV"], placeholder: "" },
      { key: "audio", label: "Audio", type: "text", required: false, options: [], placeholder: "e.g., Dolby Atmos, 40W" },
    ],
  },
  {
    name: "Monitor",
    slug: "monitor",
    description: "Computer display screens",
    icon: "🖥️",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Screen Size", type: "select", required: true, options: ["21.5 inch", "24 inch", "27 inch", "32 inch", "34 inch ultrawide", "49 inch ultrawide"], placeholder: "" },
      { key: "resolution", label: "Resolution", type: "select", required: true, options: ["Full HD (1920x1080)", "2K QHD (2560x1440)", "4K UHD (3840x2160)", "5K"], placeholder: "" },
      { key: "panelType", label: "Panel Type", type: "select", required: false, options: ["IPS", "VA", "TN", "OLED"], placeholder: "" },
      { key: "refreshRate", label: "Refresh Rate", type: "select", required: true, options: ["60Hz", "75Hz", "144Hz", "165Hz", "240Hz", "360Hz"], placeholder: "" },
      { key: "responseTime", label: "Response Time", type: "text", required: false, options: [], placeholder: "e.g., 1ms, 5ms" },
      { key: "hdr", label: "HDR", type: "select", required: false, options: ["Yes", "No"], placeholder: "" },
      { key: "ports", label: "Ports", type: "text", required: false, options: [], placeholder: "e.g., HDMI 2.1, DisplayPort 1.4, USB-C" },
    ],
  },
  {
    name: "Keyboard",
    slug: "keyboard",
    description: "Computer input devices",
    icon: "⌨️",
    status: "ACTIVE",
    specFields: [
      { key: "type", label: "Type", type: "select", required: true, options: ["Mechanical", "Membrane", "Scissor Switch", "Optical"], placeholder: "" },
      { key: "layout", label: "Layout", type: "select", required: true, options: ["Full-size (100%)", "TKL (80%)", "75%", "65%", "60%"], placeholder: "" },
      { key: "connectivity", label: "Connectivity", type: "select", required: true, options: ["Wired", "Wireless 2.4GHz", "Bluetooth", "Tri-mode"], placeholder: "" },
      { key: "switchType", label: "Switch Type", type: "text", required: false, options: [], placeholder: "e.g., Cherry MX Red, Gateron Brown" },
      { key: "backlight", label: "Backlight", type: "select", required: false, options: ["None", "White", "RGB", "Per-key RGB"], placeholder: "" },
      { key: "battery", label: "Battery Life", type: "text", required: false, options: [], placeholder: "e.g., 200 hours" },
    ],
  },
  {
    name: "Mouse",
    slug: "mouse",
    description: "Computer pointing devices",
    icon: "🖱️",
    status: "ACTIVE",
    specFields: [
      { key: "type", label: "Type", type: "select", required: true, options: ["Gaming", "Office", "Ergonomic", "Trackball", "Vertical"], placeholder: "" },
      { key: "connectivity", label: "Connectivity", type: "select", required: true, options: ["Wired", "Wireless 2.4GHz", "Bluetooth", "Tri-mode"], placeholder: "" },
      { key: "dpi", label: "Max DPI", type: "text", required: false, options: [], placeholder: "e.g., 16000 DPI, 25600 DPI" },
      { key: "buttons", label: "Number of Buttons", type: "text", required: false, options: [], placeholder: "e.g., 6 buttons, 8 buttons" },
      { key: "sensor", label: "Sensor Type", type: "select", required: false, options: ["Optical", "Laser"], placeholder: "" },
      { key: "battery", label: "Battery Life", type: "text", required: false, options: [], placeholder: "e.g., 250 hours, Rechargeable" },
    ],
  },
  {
    name: "Speaker",
    slug: "speaker",
    description: "Audio output devices",
    icon: "�",
    status: "ACTIVE",
    specFields: [
      { key: "type", label: "Type", type: "select", required: true, options: ["Bluetooth", "Smart Speaker", "Soundbar", "Bookshelf", "Portable"], placeholder: "" },
      { key: "power", label: "Power Output", type: "text", required: false, options: [], placeholder: "e.g., 40W, 100W RMS" },
      { key: "connectivity", label: "Connectivity", type: "text", required: false, options: [], placeholder: "e.g., Bluetooth 5.3, WiFi, AUX" },
      { key: "battery", label: "Battery Life", type: "text", required: false, options: [], placeholder: "e.g., 12 hours, 24 hours" },
      { key: "waterproof", label: "Water Resistance", type: "text", required: false, options: [], placeholder: "e.g., IPX7, IP67" },
      { key: "channels", label: "Audio Channels", type: "text", required: false, options: [], placeholder: "e.g., 2.0, 2.1, 5.1" },
    ],
  },
  {
    name: "Camera",
    slug: "camera",
    description: "Photography devices",
    icon: "📷",
    status: "ACTIVE",
    specFields: [
      { key: "type", label: "Type", type: "select", required: true, options: ["DSLR", "Mirrorless", "Point & Shoot", "Action Camera", "Instant Camera"], placeholder: "" },
      { key: "sensor", label: "Sensor Size", type: "select", required: false, options: ["Full Frame", "APS-C", "Micro Four Thirds", "1 inch"], placeholder: "" },
      { key: "megapixels", label: "Megapixels", type: "text", required: true, options: [], placeholder: "e.g., 24MP, 45MP" },
      { key: "video", label: "Video Resolution", type: "select", required: false, options: ["Full HD", "4K 30fps", "4K 60fps", "6K", "8K"], placeholder: "" },
      { key: "iso", label: "ISO Range", type: "text", required: false, options: [], placeholder: "e.g., 100-51200" },
      { key: "lens", label: "Lens Mount/Kit", type: "text", required: false, options: [], placeholder: "e.g., Canon RF, Nikon Z, Kit 18-55mm" },
    ],
  },
  {
    name: "Gaming Console",
    slug: "gaming-console",
    description: "Video game systems",
    icon: "🎮",
    status: "ACTIVE",
    specFields: [
      { key: "brand", label: "Console Brand", type: "select", required: true, options: ["PlayStation", "Xbox", "Nintendo", "Steam Deck"], placeholder: "" },
      { key: "generation", label: "Model/Generation", type: "text", required: true, options: [], placeholder: "e.g., PlayStation 5, Xbox Series X, Switch OLED" },
      { key: "storage", label: "Storage", type: "select", required: true, options: ["500GB", "825GB", "1TB", "2TB"], placeholder: "" },
      { key: "resolution", label: "Max Resolution", type: "select", required: false, options: ["1080p", "1440p", "4K", "8K"], placeholder: "" },
      { key: "fps", label: "Max FPS", type: "text", required: false, options: [], placeholder: "e.g., 120fps, 60fps" },
      { key: "vr", label: "VR Support", type: "select", required: false, options: ["Yes", "No"], placeholder: "" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Various electronic accessories",
    icon: "🔌",
    status: "ACTIVE",
    specFields: [
      { key: "category", label: "Category", type: "select", required: true, options: ["Charger", "Cable", "Case", "Screen Protector", "Power Bank", "Adapter", "Stand", "Other"], placeholder: "" },
      { key: "compatibility", label: "Compatibility", type: "text", required: false, options: [], placeholder: "e.g., iPhone 15 series, USB-C devices" },
      { key: "material", label: "Material", type: "text", required: false, options: [], placeholder: "e.g., Silicone, Leather, TPU" },
      { key: "capacity", label: "Capacity/Power", type: "text", required: false, options: [], placeholder: "e.g., 10000mAh, 65W, 100W" },
      { key: "color", label: "Available Colors", type: "text", required: false, options: [], placeholder: "e.g., Black, White, Clear" },
      { key: "features", label: "Features", type: "textarea", required: false, options: [], placeholder: "e.g., Fast charging, MagSafe compatible..." },
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================
const seedData = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("❌ MONGODB_CONNECTIONSTRING is not defined in .env");
    }
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Brand.deleteMany({});
    await ProductType.deleteMany({});
    console.log("🗑️  Cleared existing brands and product types");

    // Insert brands
    const createdBrands = [];
    for (const brandData of defaultBrands) {
      const brand = new Brand({
        ...brandData,
        createdBy: new mongoose.Types.ObjectId(),
      });
      await brand.save();
      createdBrands.push(brand);
    }
    console.log(`✅ Created ${createdBrands.length} brands`);

    // Insert product types
    const createdTypes = [];
    for (const typeData of defaultProductTypes) {
      const type = new ProductType({
        ...typeData,
        createdBy: new mongoose.Types.ObjectId(),
      });
      await type.save();
      createdTypes.push(type);
    }
    console.log(`✅ Created ${createdTypes.length} product types`);

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Brands: ${createdBrands.length}`);
    console.log(`   - Product Types: ${createdTypes.length}`);
    console.log("\n📝 Brands:");
    createdBrands.forEach((brand) => {
      console.log(`   - ${brand.name} (${brand.slug})`);
    });
    console.log("\n📝 Product Types:");
    createdTypes.forEach((type) => {
      console.log(
        `   ${type.icon} ${type.name} (${type.slug}) - ${type.specFields.length} spec fields`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

// Run seeding
seedData();
