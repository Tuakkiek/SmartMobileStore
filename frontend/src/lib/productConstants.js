// src/lib/productConstants.js

const CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "Apple Watch",
  "Phụ kiện",
];

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New (Mới 100%)" },
  { value: "LIKE_NEW", label: "Like New (99%)" },
];

const getEmptyFormData = (category = "iPhone") => ({
  name: "",
  model: "",
  category,
  condition: "NEW",
  price: "",
  originalPrice: "",
  discount: 0,
  quantity: "",
  status: "AVAILABLE",
  description: "",
  specifications: getEmptySpecs(category),
  variants: [],
  images: [""],
  badges: [],
});

const getEmptySpecs = (category) => {
  const baseSpecs = {
    screenSize: "",
    cpu: "",
    operatingSystem: "",
    storage: "",
    ram: "",
    mainCamera: "",
    frontCamera: "",
    battery: "",
    colors: [""],
  };

  if (category === "Mac") {
    return {
      ...baseSpecs,
      chip: "",
      gpuType: "",
      screenTechnology: "",
      screenResolution: "",
      cpuType: "",
      ports: "",
    };
  }

  return baseSpecs;
};

const emptyVariant = () => ({
  color: "",
  imageUrl: "",
  options: [{
    cpuGpu: "",
    ram: "",
    storage: "",
    price: "",
    originalPrice: "",
    quantity: "",
  }],
});

export { CATEGORIES, CONDITION_OPTIONS, getEmptyFormData, getEmptySpecs, emptyVariant };