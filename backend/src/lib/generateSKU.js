// backend/src/lib/generateSKU.js

let skuCounters = {};

// Hàm sinh SKU tự động
export const getNextSKU = (prefix) => {
  if (!skuCounters[prefix]) {
    skuCounters[prefix] = 1;
  } else {
    skuCounters[prefix]++;
  }
  return `${prefix}-${String(skuCounters[prefix]).padStart(4, "0")}`;
};

// Hàm sinh slug từ model (dùng chung)
export const generateSlug = (model) => {
  return model
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Hàm sinh SKU theo format cũ (nếu cần giữ lại)
export const generateSKU = (category, model, color, ...rest) => {
  const slug = generateSlug(model);
  const colorSlug = color.toUpperCase().replace(/\s+/g, "");
  const restSlug = rest
    .map((item) => {
      if (typeof item === "string")
        return item.toUpperCase().replace(/\s+/g, "");
      if (typeof item === "object") {
        return Object.values(item)
          .map((v) => v.toUpperCase().replace(/\s+/g, ""))
          .join("");
      }
      return "";
    })
    .filter(Boolean)
    .join("-");

  const prefixMap = {
    iPhone: "IPHONE",
    iPad: "IPAD",
    Mac: "MAC",
    AirPods: "AIRPOD",
    AppleWatch: "APPLEWATCH",
    Accessories: "ACCESSORY",
  };

  const prefix = prefixMap[category] || "UNKNOWN";
  return `${prefix}-${slug.toUpperCase()}-${colorSlug}${
    restSlug ? "-" + restSlug : ""
  }`;
};
