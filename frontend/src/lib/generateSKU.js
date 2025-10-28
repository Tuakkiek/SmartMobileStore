// src/lib/generateSKU.js

/**
 * Tạo mã SKU ngẫu nhiên với 8 chữ số, có thể thêm prefix.
 * @param {string} prefix Tiền tố danh mục (vd: "IP" cho iPhone)
 * @returns {string} SKU (vd: "IP00911088")
 */
export function generateSKU(prefix = "") {
  // Tạo số ngẫu nhiên từ 1,000,000 đến 9,999,999
  const randomNumber = Math.floor(Math.random() * 9000000 + 1000000);
  
  // Trả về prefix + số ngẫu nhiên đảm bảo có 8 chữ số (paddingLeft)
  return `${prefix}${randomNumber.toString().padStart(8, "0")}`;
}