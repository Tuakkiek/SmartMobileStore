// ============================================
// FILE: frontend/src/lib/productConstants.js
// ✅ FINAL MERGED VERSION (2025)
// ============================================

// =========================
// INSTALLMENT BADGE OPTIONS
// =========================
export const INSTALLMENT_BADGE_OPTIONS = [
  { value: "NONE", label: "Không hiển thị" },
  { value: "Trả góp 0%", label: "Trả góp 0%" },
  { value: "Trả góp 0%, trả trước 0đ", label: "Trả góp 0%, trả trước 0đ" },
];

// =========================
// CATEGORY DEFINITIONS
// =========================
export const CATEGORIES = [
  { value: "iPhone", label: "iPhone" },
  { value: "iPad", label: "iPad" },
  { value: "Mac", label: "Mac" },
  { value: "AirPods", label: "AirPods" },
  { value: "AppleWatch", label: "Apple Watch" },
  { value: "Accessories", label: "Phụ kiện" },
];

// =========================
// COMMON OPTIONS
// =========================
export const CONDITION_OPTIONS = [
  { value: "NEW", label: "New (Mới 100%)" },
  { value: "LIKE_NEW", label: "Like New (99%)" },
  { value: "USED", label: "Used (Đã qua sử dụng)" },
];

export const STORAGE_OPTIONS = [
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
  "2TB",
];
export const RAM_OPTIONS = ["8GB", "16GB", "24GB", "32GB", "64GB"];
export const IPAD_CONNECTIVITY = ["WiFi", "5G"];
export const MAC_CPU_GPU = [
  "M3 (8CPU-10GPU)",
  "M3 Pro (11CPU-14GPU)",
  "M3 Max (16CPU-40GPU)",
];

// =========================
// COLORS BY CATEGORY
// =========================
export const COLORS_BY_CATEGORY = {
  iPhone: [
    "Space Black",
    "Black",
    "White",
    "Silver",
    "Gold",
    "Rose Gold",
    "PRODUCT(RED)",
  ],
  iPad: ["Space Gray", "Silver", "Gold", "Blue"],
  Mac: ["Space Gray", "Silver", "Midnight"],
  AirPods: ["White"],
  AppleWatch: [
    "Midnight",
    "Starlight",
    "Silver",
    "Gold",
    "Rose Gold",
    "PRODUCT(RED)",
    "Blue",
  ],
  Accessories: ["Black", "White", "Clear", "Pink", "Blue"],
};

// =========================
// SPECIFICATION FIELDS
// =========================
export const SPECS_FIELDS = {
  iPhone: [
    "chip",
    "ram",
    "storage",
    "frontCamera",
    "rearCamera",
    "screenSize",
    "screenTech",
    "battery",
    "os",
  ],
  iPad: [
    "chip",
    "ram",
    "storage",
    "frontCamera",
    "rearCamera",
    "screenSize",
    "screenTech",
    "battery",
    "os",
  ],
  Mac: [
    "chip",
    "gpu",
    "ram",
    "storage",
    "screenSize",
    "screenResolution",
    "battery",
    "os",
  ],
  AirPods: ["chip", "brand", "batteryLife", "waterResistance", "bluetooth"],
  AppleWatch: [
    "batteryLife",
    "compatibility",
    "brand",
    "screenTech",
    "calling",
    "healthFeatures",
  ],
  Accessories: [], // Dynamic {key, value}
};

// =========================
// VARIANT FIELD STRUCTURES
// =========================
export const VARIANT_FIELDS = {
  iPhone: ["storage"],
  iPad: ["storage", "connectivity"],
  Mac: ["cpuGpu", "ram", "storage"],
  AirPods: ["variantName"],
  AppleWatch: ["variantName", "bandSize"],
  Accessories: ["variantName"],
};

// =========================
// EMPTY TEMPLATE GENERATORS
// =========================

// ✅ Empty specifications for each category
export const getEmptySpecs = (category) => {
  const templates = {
    iPhone: {
      chip: "",
      ram: "",
      storage: "",
      frontCamera: "",
      rearCamera: "",
      screenSize: "",
      screenTech: "",
      battery: "",
      os: "",
      colors: [""],
    },
    iPad: {
      chip: "",
      ram: "",
      storage: "",
      frontCamera: "",
      rearCamera: "",
      screenSize: "",
      screenTech: "",
      battery: "",
      os: "",
      colors: [""],
    },
    Mac: {
      chip: "",
      gpu: "",
      ram: "",
      storage: "",
      screenSize: "",
      screenResolution: "",
      battery: "",
      os: "",
      colors: [""],
    },
    AirPods: {
      chip: "",
      brand: "",
      batteryLife: "",
      waterResistance: "",
      bluetooth: "",
      colors: [""],
    },
    AppleWatch: {
      batteryLife: "",
      compatibility: "",
      brand: "",
      screenTech: "",
      calling: "",
      healthFeatures: "",
      colors: [""],
    },
    Accessories: [], // dynamic specs {key, value}
  };
  return templates[category] || templates.iPhone;
};

// ✅ Empty variant options for each category
export const getEmptyVariantOptions = (category) => {
  const base = {
    originalPrice: "",
    price: "",
    stock: "",
    sku: "",
  };

  const templates = {
    iPhone: [{ ...base, storage: "" }],
    iPad: [{ ...base, storage: "", connectivity: "WiFi" }], // ✅ Default WiFi
    Mac: [{ ...base, cpuGpu: "", ram: "", storage: "" }],
    AirPods: [{ ...base, variantName: "" }],
    AppleWatch: [{ ...base, variantName: "", bandSize: "" }],
    Accessories: [{ ...base, variantName: "" }],
  };

  return templates[category] || [base];
};

// ✅ Empty variant wrapper
export const emptyVariant = (category) => ({
  color: "",
  images: [""],
  options: getEmptyVariantOptions(category),
});

// ✅ Empty form structure (used in ProductForm / AddProduct)
export const getEmptyFormData = (category = "iPhone") => ({
  name: "",
  model: "",
  category,
  condition: "NEW",
  description: "",
  status: "AVAILABLE",
  specifications: getEmptySpecs(category),
  variants: [emptyVariant(category)],
  originalPrice: "",
  price: "",
  discount: 0,
  quantity: 0,
  images: [""],
  badges: [],
  seoTitle: "",
  seoDescription: "",
});
