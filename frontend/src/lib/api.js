// ============================================
// FILE: frontend/src/lib/api.js
// FIXED: Complete reviewAPI with likeReview method
// ============================================

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ============================================
// AXIOS INSTANCE
// ============================================

const api = axios.create({
  baseURL: BASE_URL,
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
        }
      } catch (error) {
        console.error("Error parsing auth-storage:", error);
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
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// PRODUCT APIs (DRY)
// ============================================

const createProductAPI = (base) => ({
  getAll: (params) => api.get(`/${base}`, { params }),
  getById: (id) => api.get(`/${base}/${id}`),
  create: (data) => api.post(`/${base}`, data),
  update: (id, data) => api.put(`/${base}/${id}`, data),
  delete: (id) => api.delete(`/${base}/${id}`),
  getVariants: (productId) => api.get(`/${base}/${productId}/variants`),
  get: (slug, options = {}) => {
    const { params = {} } = options;
    return api.get(`/${base}/${slug}`, { params });
  },
});

export const iPhoneAPI = createProductAPI("iphones");
export const iPadAPI = createProductAPI("ipads");
export const macAPI = createProductAPI("macs");
export const airPodsAPI = createProductAPI("airpods");
export const appleWatchAPI = createProductAPI("applewatches");
export const accessoryAPI = createProductAPI("accessories");

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
  updateAvatar: (avatar) => api.put("/auth/avatar", { avatar }),
};

// ============================================
// CART API
// ============================================
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart", data),
  updateItem: (data) => api.put("/cart", data),
  removeItem: (itemId) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete("/cart"),
};

// ============================================
// ORDER API
// ============================================
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params = {}) => api.get("/orders/my-orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id, data = {}) => api.post(`/orders/${id}/cancel`, data),
};

// ============================================
// POS API
// ============================================
export const posAPI = {
  getMyOrders: (params = {}) => api.get("/pos/my-orders", { params }),
  getOrderById: (id) => api.get(`/pos/orders/${id}`),
  getPendingOrders: (params = {}) => api.get("/pos/pending-orders", { params }),
  processPayment: (orderId, data) =>
    api.post(`/pos/orders/${orderId}/payment`, data),
  cancelOrder: (orderId, data = {}) =>
    api.post(`/pos/orders/${orderId}/cancel`, data),
  issueVAT: (orderId, data) => api.post(`/pos/orders/${orderId}/vat`, data),
};

// ============================================
// REVIEW API - ✅ COMPLETE WITH LIKE
// ============================================
export const reviewAPI = {
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),

  // ✅ LIKE/UNLIKE REVIEW
  likeReview: (id) => api.post(`/reviews/${id}/like`),

  // Admin functions
  replyToReview: (id, content) => api.post(`/reviews/${id}/reply`, { content }),
  updateAdminReply: (id, content) =>
    api.put(`/reviews/${id}/reply`, { content }),
  toggleVisibility: (id) => api.patch(`/reviews/${id}/toggle-visibility`),
};

// ============================================
// PROMOTION API
// ============================================
export const promotionAPI = {
  getAll: () => api.get("/promotions"),
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
  getActive: () => api.get("/promotions/active"),
  apply: (data) => api.post("/promotions/apply", data),
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
  updateEmployeeAvatar: (id, avatar) =>
    api.put(`/users/employees/${id}/avatar`, { avatar }),
  updateEmployee: (id, data) => api.put(`/users/employees/${id}`, data),
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
// VNPAY API
// ============================================
export const vnpayAPI = {
  createPaymentUrl: (data) =>
    api.post("/payment/vnpay/create-payment-url", data),
  returnHandler: (params) => api.get("/payment/vnpay/return", { params }),
};

// ============================================
// HELPER FUNCTIONS
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
// ERROR HANDLER
// ============================================
export const handleApiError = (error) => {
  if (error.response) {
    return {
      success: false,
      message: error.response.data?.message || "Có lỗi xảy ra",
      status: error.response.status,
    };
  } else if (error.request) {
    return {
      success: false,
      message: "Không thể kết nối đến server",
      status: 0,
    };
  } else {
    return {
      success: false,
      message: error.message || "Có lỗi xảy ra",
      status: -1,
    };
  }
};

// ============================================
// EXPORT DEFAULT
// ============================================
export default {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
  authAPI,
  cartAPI,
  orderAPI,
  posAPI,
  reviewAPI,
  promotionAPI,
  userAPI,
  analyticsAPI,
  vnpayAPI,
  getTopSelling,
  getAllProductsForCategory,
  getTopNewProducts,
  handleApiError,
};
