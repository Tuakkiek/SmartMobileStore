// FILE: src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor - Lấy token từ localStorage
api.interceptors.request.use(
  (config) => {
    // Đọc từ localStorage (zustand persist lưu ở đây)
    const authStorage = localStorage.getItem('auth-storage');
    
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("✅ Token attached:", token.substring(0, 20) + "...");
        } else {
          console.warn("⚠️ No token found in auth-storage");
        }
      } catch (error) {
        console.error("❌ Error parsing auth-storage:", error);
      }
    } else {
      console.warn("⚠️ auth-storage not found in localStorage");
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("🔒 401 Unauthorized - Token invalid or expired");
      
      // Chỉ clear storage nếu không phải endpoint login
      if (!error.config.url.includes("/auth/login")) {
        localStorage.removeItem("auth-storage");
        // Redirect to login nếu cần
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;


// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// Product API
export const productAPI = {
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateQuantity: (id, quantity) => api.patch(`/products/${id}/quantity`, { quantity }),
  
  // Category endpoints
  getCategories: () => api.get("/products/categories"),
  getByCategory: (category, params) => api.get(`/products/category/${category}`, { params }),
  getFeatured: (params) => api.get("/products/featured", { params }),
  getNewArrivals: (params) => api.get("/products/new-arrivals", { params }),
  getRelated: (id) => api.get(`/products/${id}/related`),
  getStats: () => api.get("/products/stats/overview"),
  
  // Import/Export endpoints
  bulkImportJSON: (data) => api.post("/products/bulk-import/json", data),
  bulkImportCSV: (data) => api.post("/products/bulk-import/csv", data),
  exportCSV: (params) => api.get("/products/export/csv", { params }),
  bulkUpdate: (data) => api.post("/products/bulk-update", data),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart/add", data),
  updateItem: (data) => api.put("/cart/update", data),
  removeItem: (productId) => api.delete(`/cart/remove/${productId}`),
  clearCart: () => api.delete("/cart/clear"),
};

// Order API
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params) => api.get("/orders/my-orders", { params }),
  getAllOrders: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};
// Review API
export const reviewAPI = {
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// Promotion API
export const promotionAPI = {
  getAll: () => api.get("/promotions"),
  getActive: () => api.get("/promotions/active"),
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
};

// User API
export const userAPI = {
  updateProfile: (data) => api.put("/users/profile", data),
  addAddress: (data) => api.post("/users/addresses", data),
  updateAddress: (addressId, data) => api.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
  
  // Employee management
  getAllEmployees: () => api.get("/users/employees"),
  createEmployee: (data) => api.post("/users/employees", data),
  toggleEmployeeStatus: (id) => api.patch(`/users/employees/${id}/toggle-status`),
  deleteEmployee: (id) => api.delete(`/users/employees/${id}`),
};