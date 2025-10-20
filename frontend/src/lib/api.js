// FILE: src/lib/api.js
// ✅ FULL VARIANTS SUPPORT + CORRECT CART ENDPOINTS
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor - GIỮ NGUYÊN
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

// Response interceptor - GIỮ NGUYÊN
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes("/auth/login")) {
      localStorage.removeItem("auth-storage");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ✅ AUTH API - GIỮ NGUYÊN
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// ✅ PRODUCT API - FULL VARIANTS SUPPORT
export const productAPI = {
  // Basic
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateQuantity: (id, quantity) => api.patch(`/products/${id}/quantity`, { quantity }),

  // ✅ NEW: VARIANTS ENDPOINTS
  getVariants: (productId) => api.get(`/products/${productId}/variants`),
  getVariant: (variantId) => api.get(`/products/variants/${variantId}`),
  getVariantByAttributes: (productId, color, storage) => 
    api.get(`/products/${productId}/variants`, { params: { color, storage } }),

  // Categories
  getCategories: () => api.get("/products/categories"),
  getByCategory: (category, params) => api.get(`/products/category/${category}`, { params }),
  getFeatured: (params) => api.get("/products/featured", { params }),
  getNewArrivals: (params) => api.get("/products/new-arrivals", { params }),
  getRelated: (id) => api.get(`/products/${id}/related`),
  getStats: () => api.get("/products/stats/overview"),

  // Bulk
  bulkImportJSON: (data) => api.post("/products/bulk-import/json", data),
  bulkImportCSV: (data) => api.post("/products/bulk-import/csv", data),
  exportCSV: (params) => api.get("/products/export/csv", { params }),
  bulkUpdate: (data) => api.post("/products/bulk-update", data),
};

// ✅ CART API - VARIANTS SUPPORT
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart", data), // ✅ { variantId, quantity }
  updateItem: (data) => api.put("/cart", data), // ✅ { variantId, quantity }
  removeItem: (variantId) => api.delete(`/cart/${variantId}`), // ✅ variantId
  clearCart: () => api.delete("/cart"),
};

// ✅ ORDER API - GIỮ NGUYÊN
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params) => api.get("/orders/my-orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};

// ✅ REVIEW API - GIỮ NGUYÊN
export const reviewAPI = {
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ✅ PROMOTION API - GIỮ NGUYÊN
export const promotionAPI = {
  getAll: () => api.get("/promotions"),
  getActive: () => api.get("/promotions/active"),
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
};

// ✅ USER API - GIỮ NGUYÊN
export const userAPI = {
  updateProfile: (data) => api.put("/users/profile", data),
  addAddress: (data) => api.post("/users/addresses", data),
  updateAddress: (addressId, data) => api.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
  getAllEmployees: () => api.get("/users/employees"),
  createEmployee: (data) => api.post("/users/employees", data),
  toggleEmployeeStatus: (id) => api.patch(`/users/employees/${id}/toggle-status`),
  deleteEmployee: (id) => api.delete(`/users/employees/${id}`),
};