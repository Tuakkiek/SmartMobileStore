// backend/src/lib/generateSKU.js
import SkuCounter from "../models/SkuCounter.js";

/**
 * Sinh SKU toàn cục 8 chữ số: 00000001, 00000002, ...
 */
export const getNextSku = async () => {
  const counter = await SkuCounter.findByIdAndUpdate(
    "global",
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return String(counter.seq).padStart(8, "0");
};

/**
 * Sinh slug từ chuỗi (giữ nguyên)
 */
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
