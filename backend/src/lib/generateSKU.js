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
  // Bản đồ chuyển đổi ký tự có dấu sang không dấu
  const vietnameseMap = {
    à: "a",
    á: "a",
    ả: "a",
    ã: "a",
    ạ: "a",
    ă: "a",
    ằ: "a",
    ắ: "a",
    ẳ: "a",
    ẵ: "a",
    ặ: "a",
    â: "a",
    ầ: "a",
    ấ: "a",
    ẩ: "a",
    ẫ: "a",
    ậ: "a",
    đ: "d",
    è: "e",
    é: "e",
    ẻ: "e",
    ẽ: "e",
    ẹ: "e",
    ê: "e",
    ề: "e",
    ế: "e",
    ể: "e",
    ễ: "e",
    ệ: "e",
    ì: "i",
    í: "i",
    ỉ: "i",
    ĩ: "i",
    ị: "i",
    ò: "o",
    ó: "o",
    ỏ: "o",
    õ: "o",
    ọ: "o",
    ô: "o",
    ồ: "o",
    ố: "o",
    ổ: "o",
    ỗ: "o",
    ộ: "o",
    ơ: "o",
    ờ: "o",
    ớ: "o",
    ở: "o",
    ỡ: "o",
    ợ: "o",
    ù: "u",
    ú: "u",
    ủ: "u",
    ũ: "u",
    ụ: "u",
    ư: "u",
    ừ: "u",
    ứ: "u",
    ử: "u",
    ữ: "u",
    ự: "u",
    ỳ: "y",
    ý: "y",
    ỷ: "y",
    ỹ: "y",
    ỵ: "y",
  };

  return model
    .toLowerCase()
    .split("") // Tách thành mảng ký tự
    .map((char) => vietnameseMap[char] || char) // Chuyển đổi ký tự
    .join("") // Ghép lại
    .replace(/\s+/g, "-") // Thay khoảng trắng = dấu gạch ngang
    .replace(/[^a-z0-9-]/g, "") // Xóa ký tự đặc biệt
    .replace(/-+/g, "-") // Gộp nhiều dấu gạch ngang
    .replace(/^-+|-+$/g, ""); // Xóa dấu gạch ngang đầu/cuối
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
