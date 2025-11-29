// frontend/src/hooks/useTopSellers.js
import { create } from 'zustand';


export const useTopSellers = create((set, get) => ({
  topSellers: [], // ← 4 sản phẩm hiện tại

  /**
   * Tính top 4 bán chạy từ bất kỳ mảng sản phẩm nào
   * @param {Array} products - Mảng sản phẩm có field: salesCount, createdAt, _id, name, images, variants...
   */
  calculateTopSellers: (products = []) => {
    if (!Array.isArray(products) || products.length === 0) {
      set({ topSellers: [] });
      return;
    }

    // Ưu tiên: có salesCount > 0 → sắp xếp theo bán chạy
    const withSales = products.filter(p => (p.salesCount || 0) > 0);
    
    let result = [];
    if (withSales.length > 0) {
      result = [...withSales]
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 4);
    } else {
      // Không có ai bán → lấy 4 sản phẩm mới nhất làm "nổi bật"
      result = [...products]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 4);
    }

    set({ topSellers: result });
  },

  // Nếu muốn reset
  clear: () => set({ topSellers: [] }),
}));