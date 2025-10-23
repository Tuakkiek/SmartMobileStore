// ✅ FILE: src/lib/generateSKU.js
export function generateSKU(category, model, color, storage, connectivity) {
  const prefix = {
    iPhone: "IPH",
    iPad: "IPD",
    Mac: "MAC",
    AirPods: "AIR",
    "Apple Watch": "AWT",
    "Phụ kiện": "ACC",
  }[category] || "GEN";

  const normalize = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, "");

  return `${prefix}-${model}-${normalize(color)}-${storage}-${normalize(
    connectivity
  )}`;
}
