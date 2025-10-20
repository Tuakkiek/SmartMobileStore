// models/Variant.js
import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Liên kết với sản phẩm
  color: { type: String, required: true }, // Màu sắc
  storage: { type: String, required: true }, // Dung lượng
  price: { type: Number, required: true, min: 0 }, // Giá cho biến thể này
  stock: { type: Number, default: 0, min: 0 }, // Số lượng tồn kho
  sku: { type: String, unique: true }, // Mã sản phẩm unique
  images: [{ type: String }], // Hình ảnh liên quan đến biến thể
});

// Tối ưu hóa query: Thêm index cho các trường thường truy vấn
variantSchema.index({ productId: 1 });
variantSchema.index({ color: 1 });
variantSchema.index({ storage: 1 });
variantSchema.index({ productId: 1, color: 1, storage: 1 }, { unique: true }); // Đảm bảo biến thể duy nhất cho mỗi kết hợp

export default mongoose.model('Variant', variantSchema);