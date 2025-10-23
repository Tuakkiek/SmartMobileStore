// ============================================
// ✅ generateSKU.js
// Tự động sinh mã SKU chuẩn cho mọi loại sản phẩm Apple
// ============================================

const CATEGORY_CODES = {
  iPhone: "IPH",
  iPad: "IPD",
  Mac: "MAC",
  AirPods: "AIR",
  "Apple Watch": "AWT",
  "Phụ kiện": "ACC",
};

/**
 * Tự động sinh SKU chuẩn hóa
 * @param {string} category - Danh mục (iPhone, iPad, v.v.)
 * @param {string} model - Mã model (VD: A2894)
 * @param {string} color - Màu sắc
 * @param {string} storage - Bộ nhớ (VD: 128GB)
 * @param {string} connectivity - Kết nối (VD: WiFi, 5G, Cellular, ...)
 * @returns {string} SKU chuẩn (VD: IPD-A2894-SLV-256GB-WIFI)
 */
export function generateSKU(category, model, color, storage, connectivity) {
  if (!category || !model) return "";

  const catCode = CATEGORY_CODES[category] || category.substring(0, 3).toUpperCase();

  const normalize = (val) =>
    val
      ? val.toUpperCase().replace(/\s+/g, "").replace(/[^\w]/g, "")
      : "";

  const parts = [
    catCode,
    normalize(model),
    normalize(color),
    normalize(storage),
    normalize(connectivity),
  ].filter(Boolean);

  return parts.join("-");
}
