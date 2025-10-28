import axios from "axios";

// ============================================
// AXIOS INSTANCE CONFIGURATION
// ============================================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ============================================
// INTERCEPTORS
// ============================================
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("✅ Token attached:", token.substring(0, 20) + "...");
        }
      } catch (error) {
        console.error("❌ Error parsing auth-storage:", error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("auth-storage");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// CATEGORY-SPECIFIC APIs
// Hàm .get đã được khôi phục để gọi route detail riêng
// ============================================

// iPhone API
export const iPhoneAPI = {
  getAll: (params) => api.get("/iphones", { params }),
  getById: (id) => api.get(`/iphones/${id}`),
  create: (data) => api.post("/iphones", data),
  update: (id, data) => api.put(`/iphones/${id}`, data),
  delete: (id) => api.delete(`/iphones/${id}`),
  getVariants: (productId) => api.get(`/iphones/${productId}/variants`),
  // ✅ RE-ADDED: Lấy chi tiết sản phẩm theo slug (frontend gọi /iphones/slug?sku=xxx)
  get: (slug, params) => api.get(`/iphones/${slug}`, { params }),
};

// iPad API
export const iPadAPI = {
  getAll: (params) => api.get("/ipads", { params }),
  getById: (id) => api.get(`/ipads/${id}`),
  create: (data) => api.post("/ipads", data),
  update: (id, data) => api.put(`/ipads/${id}`, data),
  delete: (id) => api.delete(`/ipads/${id}`),
  getVariants: (productId) => api.get(`/ipads/${productId}/variants`),
  // ✅ RE-ADDED
  get: (slug, params) => api.get(`/ipads/${slug}`, { params }),
};

// Mac API
export const macAPI = {
  getAll: (params) => api.get("/macs", { params }),
  getById: (id) => api.get(`/macs/${id}`),
  create: (data) => api.post("/macs", data),
  update: (id, data) => api.put(`/macs/${id}`, data),
  delete: (id) => api.delete(`/macs/${id}`),
  getVariants: (productId) => api.get(`/macs/${productId}/variants`),
  // ✅ RE-ADDED
  get: (slug, params) => api.get(`/macs/${slug}`, { params }),
};

// AirPods API
export const airPodsAPI = {
  getAll: (params) => api.get("/airpods", { params }),
  getById: (id) => api.get(`/airpods/${id}`),
  create: (data) => api.post("/airpods", data),
  update: (id, data) => api.put(`/airpods/${id}`, data),
  delete: (id) => api.delete(`/airpods/${id}`),
  getVariants: (productId) => api.get(`/airpods/${productId}/variants`),
  // ✅ RE-ADDED
  get: (slug, params) => api.get(`/airpods/${slug}`, { params }),
};

// AppleWatch API
export const appleWatchAPI = {
  getAll: (params) => api.get("/applewatches", { params }),
  getById: (id) => api.get(`/applewatches/${id}`),
  create: (data) => api.post("/applewatches", data),
  update: (id, data) => api.put(`/applewatches/${id}`, data),
  delete: (id) => api.delete(`/applewatches/${id}`),
  getVariants: (productId) => api.get(`/applewatches/${productId}/variants`),
  // ✅ RE-ADDED
  get: (slug, params) => api.get(`/applewatches/${slug}`, { params }),
};

// Accessory API
export const accessoryAPI = {
  getAll: (params) => api.get("/accessories", { params }),
  getById: (id) => api.get(`/accessories/${id}`),
  create: (data) => api.post("/accessories", data),
  update: (id, data) => api.put(`/accessories/${id}`, data),
  delete: (id) => api.delete(`/accessories/${id}`),
  getVariants: (productId) => api.get(`/accessories/${productId}/variants`),
  // ✅ RE-ADDED
  get: (slug, params) => api.get(`/accessories/${slug}`, { params }),
};

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// ============================================
// CART API
// ============================================
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart", data),
  updateItem: (data) => api.put("/cart", data),
  removeItem: (variantId) => api.delete(`/cart/${variantId}`),
  clearCart: () => api.delete("/cart"),
};

// ============================================
// ORDER API
// ============================================
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params) => api.get("/orders/my-orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};

// ============================================
// REVIEW API
// ============================================
export const reviewAPI = {
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ============================================
// PROMOTION API
// ============================================
export const promotionAPI = {
  getAll: () => api.get("/promotions"),
  getActive: () => api.get("/promotions/active"),
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
};

// ============================================
// USER API
// ============================================
export const userAPI = {
  updateProfile: (data) => api.put("/users/profile", data),
  addAddress: (data) => api.post("/users/addresses", data),
  updateAddress: (addressId, data) =>
    api.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
  getAllEmployees: () => api.get("/users/employees"),
  createEmployee: (data) => api.post("/users/employees", data),
  toggleEmployeeStatus: (id) =>
    api.patch(`/users/employees/${id}/toggle-status`),
  deleteEmployee: (id) => api.delete(`/users/employees/${id}`),
};

// ============================================
// PRODUCT API - CHO MAINLAYOUT SEARCH & FEATURED
// ============================================
export const productAPI = {
  search: (query, params = {}) =>
    api.get("/products/search", {
      params: { q: query, ...params },
    }),
  getAll: (params = {}) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getVariants: (productId) => api.get(`/products/${productId}/variants`),
  getFeatured: (params = {}) => api.get("/products/featured", { params }),
  getNewArrivals: (params = {}) =>
    api.get("/products/new-arrivals", { params }),

  // ❌ REMOVED: Hàm get tổng hợp đã được loại bỏ
};

// ============================================
// ANALYTICS API
// ============================================
export const analyticsAPI = {
  getTopSellers: (category, limit = 10) =>
    api.get(`/analytics/top-sellers/${category}`, { params: { limit } }),

  getTopSellersAll: (limit = 10) =>
    api.get("/analytics/top-sellers", { params: { limit } }),

  getProductSales: (productId, variantId = null) =>
    api.get(`/analytics/product/${productId}`, { params: { variantId } }),

  getSalesByTime: (category, startDate, endDate) =>
    api.get("/analytics/sales-by-time", {
      params: { category, startDate, endDate },
    }),

  getDashboard: (category = null) =>
    api.get("/analytics/dashboard", { params: { category } }),
};

// ============================================
// HELPER FUNCTIONS FOR DASHBOARD
// ============================================
export const getTopSelling = async (category) => {
  try {
    const response = await analyticsAPI.getTopSellers(category, 10);
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching top selling:", error);
    return [];
  }
};

export const getAllProductsForCategory = async (cat) => {
  try {
    // Lưu ý: Tên API phải khớp với tiền tố route backend (vd: /iphones, /ipads)
    const response = await api.get(`/${cat}`);
    const data = response.data?.data;
    return data?.products || data || [];
  } catch (error) {
    console.error(`Error fetching products for ${cat}:`, error);
    return [];
  }
};

export const getTopNewProducts = async () => {
  const categories = [
    "iphones",
    "ipads",
    "macs",
    "airpods",
    "applewatches",
    "accessories",
  ];

  try {
    const allProducts = (
      await Promise.all(categories.map(getAllProductsForCategory))
    ).flat();

    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return allProducts.slice(0, 10).map((p) => p._id?.toString());
  } catch (error) {
    console.error("Error fetching top new products:", error);
    return [];
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  productAPI,
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
  authAPI,
  cartAPI,
  orderAPI,
  reviewAPI,
  promotionAPI,
  userAPI,
  analyticsAPI,
  getTopSelling,
  getAllProductsForCategory,
  getTopNewProducts,
};
