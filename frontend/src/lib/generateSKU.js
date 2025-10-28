// frontend/src/lib/generateSKU.js

/**
 * @returns {string} SKU 8 chữ số
 */
export function generateSKU() {
  // Tạo số ngẫu nhiên từ 00000000 đến 99999999
  const randomNumber = Math.floor(Math.random() * 100000000);
  
  // Đảm bảo có 8 chữ số (padding left với số 0)
  return randomNumber.toString().padStart(8, "0");
}

/**
 * Generate SKU với prefix tùy chỉnh (nếu cần)
 * @param {string} prefix - Tiền tố (optional)
 * @returns {string}
 */
export function generateSKUWithPrefix(prefix = "") {
  const sku = generateSKU();
  return prefix ? `${prefix}${sku}` : sku;
}