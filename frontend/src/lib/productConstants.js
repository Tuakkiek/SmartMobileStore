// ============================================
// FILE: src/lib/productConstants.js
// ✅ REWRITTEN: REMOVED ICONS AND JSX, SIMPLIFIED TO PLAIN OBJECTS
// ============================================

export const CATEGORIES = [
  { value: "iPhone", label: "iPhone" },
  { value: "iPad", label: "iPad" },
  { value: "Mac", label: "Mac" },
  { value: "AirPods", label: "AirPods" },
  { value: "AppleWatch", label: "Apple Watch" },
  { value: "Accessories", label: "Phụ kiện" },
];

export const CONDITION_OPTIONS = [
  { value: "NEW", label: "New (Mới 100%)" },
  { value: "LIKE_NEW", label: "Like New (99%)" },
  { value: "USED", label: "Used (Đã qua sử dụng)" },
];

export const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
export const RAM_OPTIONS = ['8GB', '16GB', '24GB', '32GB', '64GB'];
export const IPAD_CONNECTIVITY = ['WiFi', '5G'];
export const MAC_CPU_GPU = ['M3 (8CPU-10GPU)', 'M3 Pro (11CPU-14GPU)', 'M3 Max (16CPU-40GPU)'];

// Colors by category
export const COLORS_BY_CATEGORY = {
  iPhone: ['Space Black', 'Black', 'White', 'Silver', 'Gold', 'Rose Gold', 'PRODUCT(RED)'],
  iPad: ['Space Gray', 'Silver', 'Gold', 'Blue'],
  Mac: ['Space Gray', 'Silver', 'Midnight'],
  AirPods: ['White'],
  AppleWatch: ['Midnight', 'Starlight', 'Silver', 'Gold', 'Rose Gold', 'PRODUCT(RED)', 'Blue'],
  Accessories: ['Black', 'White', 'Clear', 'Pink', 'Blue'],
};

// Specifications FIELDS (exact match with FORMS)
export const SPECS_FIELDS = {
  iPhone: [
    'chip', 'ram', 'storage', 'frontCamera', 'rearCamera', 
    'screenSize', 'screenTech', 'battery', 'os'
  ],
  iPad: [
    'chip', 'ram', 'storage', 'frontCamera', 'rearCamera', 
    'screenSize', 'screenTech', 'battery', 'os'
  ],
  Mac: [
    'chip', 'gpu', 'ram', 'storage', 'screenSize', 
    'screenResolution', 'battery', 'os'
  ],
  AirPods: [
    'chip', 'brand', 'batteryLife', 'waterResistance', 'bluetooth'
  ],
  AppleWatch: [
    'batteryLife', 'compatibility', 'brand', 'screenTech', 
    'calling', 'healthFeatures'
  ],
  Accessories: [] // Dynamic key-value
};

// VARIANT FIELDS (exact match with FORMS)
export const VARIANT_FIELDS = {
  iPhone: ['storage'],
  iPad: ['storage', 'connectivity'],
  Mac: ['cpuGpu', 'ram', 'storage'],
  AirPods: ['variantName'],
  AppleWatch: ['variantName', 'bandSize'],
  Accessories: ['variantName']
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get empty specs for each category (MATCH FORMS 100%)
export const getEmptySpecs = (category) => {
  const templates = {
    iPhone: {
      chip: "", ram: "", storage: "", frontCamera: "", rearCamera: "",
      screenSize: "", screenTech: "", battery: "", os: "", colors: [""]
    },
    iPad: {
      chip: "", ram: "", storage: "", frontCamera: "", rearCamera: "",
      screenSize: "", screenTech: "", battery: "", os: "", colors: [""]
    },
    Mac: {
      chip: "", gpu: "", ram: "", storage: "", screenSize: "",
      screenResolution: "", battery: "", os: "", colors: [""]
    },
    AirPods: {
      chip: "", brand: "", batteryLife: "", waterResistance: "", 
      bluetooth: "", colors: [""]
    },
    AppleWatch: {
      batteryLife: "", compatibility: "", brand: "", screenTech: "",
      calling: "", healthFeatures: "", colors: [""]
    },
    Accessories: [] // Dynamic array of { key: "", value: "" }
  };
  
  return templates[category] || templates.iPhone;
};

// Get empty form data (MATCH BACKEND MODELS)
export const getEmptyFormData = (category = "iPhone") => ({
  name: "",
  model: "",
  category,
  condition: "NEW",
  originalPrice: "",
  price: "",
  discount: 0,
  quantity: 0,
  status: "AVAILABLE",
  description: "",
  specifications: getEmptySpecs(category),
  variants: [{
    color: "",
    images: [""],
    options: getEmptyVariantOptions(category)
  }],
  images: [""],
  badges: [],
  seoTitle: "",
  seoDescription: ""
});

// Get empty variant options for category
export const getEmptyVariantOptions = (category) => {
  const templates = {
    iPhone: [{ storage: "", originalPrice: "", price: "", stock: "", sku: "" }],
    iPad: [{ storage: "", connectivity: "", originalPrice: "", price: "", stock: "", sku: "" }],
    Mac: [{ cpuGpu: "", ram: "", storage: "", originalPrice: "", price: "", stock: "", sku: "" }],
    AirPods: [{ variantName: "", originalPrice: "", price: "", stock: "", sku: "" }],
    AppleWatch: [{ variantName: "", bandSize: "", originalPrice: "", price: "", stock: "", sku: "" }],
    Accessories: [{ variantName: "", originalPrice: "", price: "", stock: "", sku: "" }]
  };
  
  return templates[category] || [{ storage: "", originalPrice: "", price: "", stock: "", sku: "" }];
};

// Empty variant template
export const emptyVariant = (category) => ({
  color: "",
  images: [""],
  options: getEmptyVariantOptions(category)
});