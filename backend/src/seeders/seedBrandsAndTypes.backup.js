// ============================================
// FILE: backend/src/seeders/seedBrandsAndTypes.js  
// Seeding script để tạo brands và product types mặc định
// ============================================

import mongoose from "mongoose";
import Brand from "../modules/brand/Brand.js";
import ProductType from "../modules/productType/ProductType.js";
import dotenv from "dotenv";

dotenv.config();

// ============================================
// DEFAULT BRANDS - MỞ RỘNG
// ============================================
const defaultBrands = [
  // Smartphone & Electronics Giants
  {
    name: "Apple",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    description: "Công ty công nghệ đa quốc gia của Mỹ, chuyên thiết kế, phát triển và bán thiết bị điện tử tiêu dùng.",
    website: "https://www.apple.com",
    status: "ACTIVE",
  },
  {
    name: "Samsung",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
   description: "Tập đoàn điện tử đa quốc gia của Hàn Quốc, nhà sản xuất smartphone và TV lớn nhất thế giới.",
    website: "https://www.samsung.com",
    status: "ACTIVE",
  },
  {
    name: "Xiaomi",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg",
    description: "Công ty điện tử Trung Quốc, thiết kế và bán smartphone, IoT, thiết bị thông minh.",
    website: "https://www.mi.com",
    status: "ACTIVE",
  },
  {
    name: "OPPO",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/89/Oppo_logo_2019.svg",
    description: "Thương hiệu điện tử tiêu dùng Trung Quốc, chuyên về smartphone cao cấp.",
    website: "https://www.oppo.com",
    status: "ACTIVE",
  },
  {
    name: "Huawei",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/Huawei_Standard_logo.svg",
    description: "Tập đoàn công nghệ viễn thông Trung Quốc, smartphone và thiết bị mạng.",
    website: "https://www.huawei.com",
    status: "ACTIVE",
  },
  {
    name: "Realme",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Realme_logo.svg",
    description: "Thương hiệu smartphone trẻ trung từ Trung Quốc, giá cả hợp lý.",
    website: "https://www.realme.com",
    status: "ACTIVE",
  },
  {
    name: "Vivo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Vivo_logo_2019.svg",
    description: "Nhà sản xuất smartphone Trung Quốc, nổi bật về camera và thiết kế.",
    website: "https://www.vivo.com",
    status: "ACTIVE",
  },
  {
    name: "Nokia",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg",
    description: "Thương hiệu điện thoại di động lịch sử từ Phần Lan.",
    website: "https://www.nokia.com",
    status: "ACTIVE",
  },

  // Laptop & Computer Brands
  {
    name: "Dell",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg",
    description: "Công ty công nghệ Mỹ, chuyên về máy tính cá nhân và doanh nghiệp.",
    website: "https://www.dell.com",
    status: "ACTIVE",
  },
  {
    name: "HP",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg",
    description: "HP Inc. - công ty máy tính và máy in hàng đầu thế giới.",
    website: "https://www.hp.com",
    status: "ACTIVE",
  },
  {
    name: "Lenovo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Lenovo_logo_2015.svg",
    description: "Tập đoàn công nghệ Trung Quốc, nhà sản xuất PC lớn nhất thế giới.",
    website: "https://www.lenovo.com",
    status: "ACTIVE",
  },
  {
    name: "Asus",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
    description: "Công ty Đài Loan chuyên mainboard, laptop gaming và thiết bị mạng.",
    website: "https://www.asus.com",
    status: "ACTIVE",
  },
  {
    name: "Acer",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_2011.svg",
    description: "Công ty Đài Loan, chuyên laptop và màn hình máy tính.",
    website: "https://www.acer.com",
    status: "ACTIVE",
  },
  {
    name: "MSI",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/59/MSI_Logo.svg",
    description: "Micro-Star International - laptop gaming, mainboard và card đồ họa.",
    website: "https://www.msi.com",
    status: "ACTIVE",
  },
  {
    name: "Microsoft",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    description: "Công ty công nghệ Mỹ, Surface laptop và phần mềm.",
    website: "https://www.microsoft.com",
    status: "ACTIVE",
  },

  // TV & Home Electronics
  {
    name: "LG",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg",
    description: "Công ty điện tử Hàn Quốc, nổi tiếng với TV OLED và gia dụng.",
    website: "https://www.lg.com",
    status: "ACTIVE",
  },
  {
    name: "Sony",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
    description: "Công ty điện tử Nhật Bản, chuyên TV, PlayStation và camera.",
    website: "https://www.sony.com",
    status: "ACTIVE",
  },
  {
    name: "TCL",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/TCL_Logo.svg",
    description: "Nhà sản xuất TV và điện tử tiêu dùng lớn của Trung Quốc.",
    website: "https://www.tcl.com",
    status: "ACTIVE",
  },
  {
    name: "Panasonic",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Panasonic_logo_%28Blue%29.svg",
    description: "Tập đoàn điện tử Nhật Bản, TV và thiết bị gia dụng.",
    website: "https://www.panasonic.com",
    status: "ACTIVE",
  },

  // Audio Brands
  {
    name: "Bose",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Bose_logo.svg",
    description: "Thương hiệu âm thanh cao cấp từ Mỹ.",
    website: "https://www.bose.com",
    status: "ACTIVE",
  },
  {
    name: "JBL",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/43/JBL_logo.svg",
    description: "Thương hiệu loa và tai nghe nổi tiếng thuộc Harman.",
    website: "https://www.jbl.com",
    status: "ACTIVE",
  },
  {
    name: "Beats",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Beats_Electronics_logo.svg",
    description: "Thương hiệu tai nghe cao cấp thuộc Apple.",
    website: "https://www.beatsbydre.com",
    status: "ACTIVE",
  },
  {
    name: "Sennheiser",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/be/Sennheiser_logo.svg",
    description: "Công ty âm thanh Đức, tai nghe chuyên nghiệp.",
    website: "https://www.sennheiser.com",
    status: "ACTIVE",
  },
];

// ============================================
// DEFAULT PRODUCT TYPES - ĐẦY ĐỦ
// ============================================
const defaultProductTypes = [
  {
    name: "Smartphone",
    description: "Điện thoại thông minh",
    icon: "📱",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Kích thước màn hình", type: "text", required: true, options: [], placeholder: "VD: 6.7 inch" },
      { key: "screenTech", label: "Công nghệ màn hình", type: "select", required: false, options: ["OLED", "AMOLED", "Super AMOLED", "IPS LCD", "Dynamic AMOLED"], placeholder: "" },
      { key: "resolution", label: "Độ phân giải", type: "text", required: false, options: [], placeholder: "VD: 2778 x 1284 pixels" },
      { key: "processor", label: "Chip xử lý", type: "text", required: true, options: [], placeholder: "VD: Apple A17 Pro" },
      { key: "ram", label: "RAM", type: "select", required: false, options: ["4GB", "6GB", "8GB", "12GB", "16GB"], placeholder: "" },
      { key: "battery", label: "Dung lượng pin", type: "text", required: false, options: [], placeholder: "VD: 4422 mAh" },
      { key: "camera", label: "Camera", type: "textarea", required: false, options: [], placeholder: "VD: Camera chính: 48MP, Camera góc siêu rộng: 12MP..." },
      { key: "os", label: "Hệ điều hành", type: "text", required: false, options: [], placeholder: "VD: iOS 17" },
      { key: "sim", label: "SIM", type: "select", required: false, options: ["1 Nano SIM", "2 Nano SIM", "1 eSIM", "1 Nano SIM + 1 eSIM", "Dual SIM"], placeholder: "" },
    ],
  },
  {
    name: "Tablet",
    description: "Máy tính bảng",
    icon: "💻",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Kích thước màn hình", type: "text", required: true, options: [], placeholder: "VD: 11 inch" },
      { key: "screenTech", label: "Công nghệ màn hình", type: "select", required: false, options: ["IPS LCD", "OLED", "Mini LED", "Liquid Retina"], placeholder: "" },
      { key: "resolution", label: "Độ phân giải", type: "text", required: false, options: [], placeholder: "VD: 2388 x 1668 pixels" },
      { key: "processor", label: "Chip xử lý", type: "text", required: true, options: [], placeholder: "VD: Apple M2" },
      { key: "ram", label: "RAM", type: "select", required: false, options: ["4GB", "6GB", "8GB", "16GB"], placeholder: "" },
      { key: "battery", label: "Dung lượng pin", type: "text", required: false, options: [], placeholder: "VD: 7538 mAh" },
      { key: "os", label: "Hệ điều hành", type: "text", required: false, options: [], placeholder: "VD: iPadOS 17" },
      { key: "stylus", label: "Bút cảm ứng", type: "text", required: false, options: [], placeholder: "VD: Apple Pencil thế hệ 2" },
    ],
  },
  {
    name: "Laptop",
    description: "Máy tính xách tay",
    icon: "💻",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Kích thước màn hình", type: "select", required: true, options: ["13 inch", "14 inch", "15.6 inch", "16 inch", "17 inch"], placeholder: "" },
      { key: "resolution", label: "Độ phân giải", type: "text", required: false, options: [], placeholder: "VD: 2560 x 1600 pixels" },
      { key: "processor", label: "CPU", type: "text", required: true, options: [], placeholder: "VD: Intel Core i7-13700H" },
      { key: "ram", label: "RAM", type: "select", required: true, options: ["8GB", "16GB", "32GB", "64GB"], placeholder: "" },
      { key: "storage", label: "Ổ cứng", type: "select", required: true, options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"], placeholder: "" },
      { key: "gpu", label: "Card đồ họa", type: "text", required: false, options: [], placeholder: "VD: NVIDIA GeForce RTX 4060" },
      { key: "os", label: "Hệ điều hành", type: "select", required: false, options: ["Windows 11", "macOS", "Linux", "FreeDOS"], placeholder: "" },
      { key: "weight", label: "Trọng lượng", type: "text", required: false, options: [], placeholder: "VD: 1.6 kg" },
    ],
  },
  {
    name: "Smartwatch",
    description: "Đồng hồ thông minh",
    icon: "⌚",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Kích thước màn hình", type: "text", required: false, options: [], placeholder: "VD: 1.9 inch" },
      { key: "caseSize", label: "Kích thước vỏ", type: "text", required: true, options: [], placeholder: "VD: 44mm" },
      { key: "material", label: "Chất liệu", type: "select", required: false, options: ["Nhôm", "Thép không gỉ", "Titan", "Nhựa"], placeholder: "" },
      { key: "processor", label: "Chip xử lý", type: "text", required: false, options: [], placeholder: "VD: Apple S9" },
      { key: "battery", label: "Thời lượng pin", type: "text", required: false, options: [], placeholder: "VD: 36 giờ" },
      { key: "waterproof", label: "Chống nước", type: "text", required: false, options: [], placeholder: "VD: 50m (5 ATM)" },
      { key: "sensors", label: "Cảm biến", type: "textarea", required: false, options: [], placeholder: "VD: Nhịp tim, SpO2, GPS..." },
      { key: "connectivity", label: "Kết nối", type: "select", required: false, options: ["Bluetooth", "GPS", "Cellular", "WiFi"], placeholder: "" },
    ],
  },
  {
    name: "Headphone",
    description: "Tai nghe",
    icon: "🎧",
    status: "ACTIVE",
    specFields: [
      { key: "type", label: "Loại tai nghe", type: "select", required: true, options: ["In-ear", "On-ear", "Over-ear", "True Wireless"], placeholder: "" },
      { key: "connectivity", label: "Kết nối", type: "select", required: true, options: ["Bluetooth", "Có dây 3.5mm", "USB-C", "Lightning"], placeholder: "" },
      { key: "anc", label: "Chống ồn chủ động (ANC)", type: "select", required: false, options: ["Có", "Không"], placeholder: "" },
      { key: "battery", label: "Thời lượng pin", type: "text", required: false, options: [], placeholder: "VD: 6 giờ (30 giờ với case)" },
      { key: "waterproof", label: "Chống nước/mồ hôi", type: "text", required: false, options: [], placeholder: "VD: IPX4" },
      { key: "driver", label: "Driver", type: "text", required: false, options: [], placeholder: "VD: 11mm" },
      { key: "frequency", label: "Tần số", type: "text", required: false, options: [], placeholder: "VD: 20Hz - 20kHz" },
    ],
  },
  {
    name: "TV",
    description: "Tivi",
    icon: "📺",
    status: "ACTIVE",
    specFields: [
      { key: "screenSize", label: "Kích thước màn hình", type: "select", required: true, options: ["32 inch", "43 inch", "50 inch", "55 inch", "65 inch", "75 inch", "85 inch"], placeholder: "" },
      { key: "resolution", label: "Độ phân giải", type: "select", required: true, options: ["HD (1366 x 768)", "Full HD (1920 x 1080)", "4K UHD (3840 x 2160)", "8K (7680 x 4320)"], placeholder: "" },
      { key: "panelType", label: "Loại panel", type: "select", required: false, options: ["LED", "QLED", "OLED", "Mini LED", "Neo QLED"], placeholder: "" },
      { key: "refreshRate", label: "Tần số quét", type: "select", required: false, options: ["60Hz", "120Hz", "144Hz"], placeholder: "" },
      { key: "hdr", label: "Hỗ trợ HDR", type: "select", required: false, options: ["Có", "Không"], placeholder: "" },
      { key: "smartOS", label: "Hệ điều hành", type: "select", required: false, options: ["Android TV", "webOS", "Tizen", "Google TV", "tvOS"], placeholder: "" },
      { key: "ports", label: "Cổng kết nối", type: "textarea", required: false, options: [], placeholder: "VD: 3 HDMI, 2 USB, 1 LAN..." },
      { key: "audio", label: "Âm thanh", type: "text", required: false, options: [], placeholder: "VD: Dolby Atmos, 40W" },
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================
const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Brand.deleteMany({});
    await ProductType.deleteMany({});
    console.log("🗑️  Cleared existing brands and product types");

    // Insert brands one by one to trigger pre-save hooks
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

    // Insert product types one by one to trigger pre-save hooks
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
        `   - ${type.name} (${type.slug}) - ${type.specFields.length} spec fields`
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

