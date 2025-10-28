// utils/slugify.js

/**
 * Tạo slug thân thiện URL từ tên, model và storage.
 * @param {string} name Tên sản phẩm (vd: "iPhone")
 * @param {string} model Model sản phẩm (vd: "16 Pro")
 * @param {string | null} storage Dung lượng hoặc tên variant phụ (vd: "256GB" hoặc null)
 * @returns {string} Slug (vd: "iphone-16-pro-256gb")
 */
export function slugifyProduct(name, model, storage) {
  // Kết hợp name, model, storage (nếu có)
  const fullString = `${name}-${model}${storage ? '-' + storage : ''}`;
  
  return fullString
    .toLowerCase()
    .normalize("NFD") // Chuẩn hóa Unicode
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .replace(/[^a-z0-9]+/g, '-') // Thay ký tự không phải chữ/số bằng "-"
    .replace(/-+$/, '') // Xóa dấu "-" thừa ở cuối
    .replace(/^-+/, ''); // Xóa dấu "-" thừa ở đầu
}