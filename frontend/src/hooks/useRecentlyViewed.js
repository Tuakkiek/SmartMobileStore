// frontend/src/hooks/useRecentlyViewed.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useRecentlyViewed = create(
  persist(
    (set, get) => ({
      recentProducts: [], // Array of { productId, category, timestamp, product }
      
      addRecentProduct: (product) => {
        const { recentProducts } = get();
        
        // Loại bỏ duplicate
        const filtered = recentProducts.filter(
          p => p.productId !== product._id
        );
        
        // Thêm mới vào đầu
        const updated = [
          {
            productId: product._id,
            category: product.category,
            timestamp: Date.now(),
            product: {
              _id: product._id,
              name: product.name,
              model: product.model,
              slug: product.slug,
              category: product.category,
              images: product.images,
              variants: product.variants,
            }
          },
          ...filtered
        ].slice(0, 10); // Giữ tối đa 10 sản phẩm
        
        set({ recentProducts: updated });
      },
      
      getTopRecent: (limit = 4) => {
        const { recentProducts } = get();
        return recentProducts.slice(0, limit).map(r => r.product);
      },
      
      clearRecent: () => set({ recentProducts: [] })
    }),
    {
      name: 'recently-viewed-storage'
    }
  )
);