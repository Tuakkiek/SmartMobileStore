// ============================================
// FILE: frontend/src/lib/api.js
// FIXED: Complete reviewAPI with likeReview method
// ============================================

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const BRANCH_SCOPED_ROLES = new Set([
  "ADMIN",
  "BRANCH_ADMIN",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "POS_STAFF",
  "CASHIER",
]);

const normalizeBranchId = (value) => {
  if (!value) return "";
  return String(value).trim();
};

const toAllowedBranchIds = (authz) => {
  const raw = Array.isArray(authz?.allowedBranchIds) ? authz.allowedBranchIds : [];
  return [...new Set(raw.map(normalizeBranchId).filter(Boolean))];
};

const isGlobalAdminState = (state) => {
  const role = String(state?.user?.role || "").toUpperCase();
  return Boolean(state?.authz?.isGlobalAdmin || role === "GLOBAL_ADMIN");
};

const isBranchScopedStaffState = (state) => {
  if (isGlobalAdminState(state)) return false;

  if (state?.authz?.requiresBranchAssignment === true) {
    return true;
  }

  const role = String(state?.user?.role || "").toUpperCase();
  return BRANCH_SCOPED_ROLES.has(role);
};

const deriveFixedBranchIdFromState = (state) => {
  const allowedBranchIds = toAllowedBranchIds(state?.authz);
  const authzActiveBranchId = normalizeBranchId(state?.authz?.activeBranchId);

  if (authzActiveBranchId) {
    if (allowedBranchIds.length === 0 || allowedBranchIds.includes(authzActiveBranchId)) {
      return authzActiveBranchId;
    }
  }

  if (allowedBranchIds.length > 0) {
    return allowedBranchIds[0];
  }

  return normalizeBranchId(state?.user?.storeLocation);
};

// ============================================
// AXIOS INSTANCE
// ============================================

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ✅ Export axios instance for direct API calls
export { api };

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

        const allowedBranchIds = toAllowedBranchIds(state?.authz);
        const fixedBranchId = deriveFixedBranchIdFromState(state);
        const mutableBranchId = normalizeBranchId(state?.activeBranchId);
        const contextMode = String(
          state?.contextMode || state?.authz?.contextMode || "STANDARD",
        )
          .trim()
          .toUpperCase();
        const simulatedBranchId = normalizeBranchId(
          state?.simulatedBranchId || state?.authz?.simulatedBranchId,
        );

        let activeBranchId = "";
        if (isBranchScopedStaffState(state)) {
          activeBranchId = fixedBranchId;
        } else if (
          isGlobalAdminState(state) &&
          contextMode === "SIMULATED" &&
          simulatedBranchId
        ) {
          activeBranchId = simulatedBranchId;
        } else if (mutableBranchId) {
          activeBranchId = mutableBranchId;
        } else {
          activeBranchId = fixedBranchId;
        }

        if (
          activeBranchId &&
          allowedBranchIds.length > 0 &&
          !allowedBranchIds.includes(activeBranchId) &&
          !isGlobalAdminState(state)
        ) {
          activeBranchId = fixedBranchId;
        }

        if (activeBranchId) {
          config.headers["X-Active-Branch-Id"] = activeBranchId;
        }

        if (
          isGlobalAdminState(state) &&
          contextMode === "SIMULATED" &&
          simulatedBranchId
        ) {
          config.headers["X-Simulate-Branch-Id"] = simulatedBranchId;
        } else if (config.headers["X-Simulate-Branch-Id"]) {
          delete config.headers["X-Simulate-Branch-Id"];
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
  getEffectivePermissions: () => api.get("/auth/context/permissions"),
  setActiveBranchContext: (data) => api.put("/auth/context/active-branch", data),
  setSimulatedBranchContext: (data) => api.put("/auth/context/simulate-branch", data),
  clearSimulatedBranchContext: () => api.delete("/auth/context/simulate-branch"),
  changePassword: (data) => api.put("/auth/change-password", data),
  updateAvatar: (avatar) => api.put("/auth/avatar", { avatar }),
  checkCustomer: (phoneNumber) =>
    api.get(`/auth/check-customer?phoneNumber=${phoneNumber}`),
  quickRegister: (data) =>
    api.post('/auth/quick-register', data),
};

// ============================================
// CART API
// ============================================
export const cartAPI = {
  getCartCount: (config = {}) => api.get("/cart/count", config),
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
  getByStage: (statusStage, params = {}) =>
    api.get("/orders/all", { params: { ...params, statusStage } }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  assignCarrier: (id, data) => api.patch(`/orders/${id}/assign-carrier`, data),
  cancel: (id, data = {}) => api.post(`/orders/${id}/cancel`, data),
  assignStore: (id, data) => api.patch(`/orders/${id}/assign-store`, data),
};

export const notificationAPI = {
  getMyNotifications: (params) => api.get('/notifications/my-notifications', { params }),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
};

// ============================================
// POS API - ĐÃ ĐỒNG BỘ 100% VỚI posController.js
// ============================================
export const posAPI = {
  // Tạo đơn hàng tại quầy (POS Staff dùng)
  createOrder: (data) => api.post("/pos/create-order", data),

  // Lấy danh sách đơn chờ thanh toán (Thu ngân xem)
  getPendingOrders: (params = {}) => api.get("/pos/pending-orders", { params }),

  // Thu ngân xử lý thanh toán cho đơn POS
  processPayment: (orderId, data) =>
    api.post(`/pos/orders/${orderId}/payment`, data),

  // Thu ngân hủy đơn đang chờ thanh toán (có hoàn lại kho + giảm salesCount)
  cancelOrder: (orderId, data = {}) =>
    api.post(`/pos/orders/${orderId}/cancel`, data),

  // Thu ngân xuất hóa đơn VAT cho đơn đã thanh toán
  issueVAT: (orderId, data) => api.post(`/pos/orders/${orderId}/vat`, data),

  // Xem lịch sử đơn hàng POS (POS Staff chỉ thấy của mình, Cashier/Admin thấy tất cả)
  getHistory: (params = {}) => api.get("/pos/history/", { params }),

  // (Tùy chọn) Lấy chi tiết 1 đơn POS
  getOrderById: (orderId) => api.get(`/pos/orders/${orderId}`),

  // Thu ngân hoàn tất đơn hàng (nhập IMEI & in)
  finalizeOrder: (orderId, data) => api.put(`/pos/orders/${orderId}/finalize`, data),
};

// ============================================
// REVIEW API - ✅ UPDATED WITH NEW ENDPOINTS
// ============================================

export const reviewAPI = {
  // ✅ NEW: Check if user can review
  canReview: (productId) => api.get(`/reviews/can-review/${productId}`),
  getUploadSignature: (resourceType = "image") =>
    api.post("/reviews/upload/signature", { resourceType }),

  // Get reviews (with optional filters)
  getByProduct: (productId, params = {}) =>
    api.get(`/reviews/product/${productId}`, { params }),

  // Create review (with images & orderId)
  create: (data) => api.post("/reviews", data),

  // Update review
  update: (id, data) => api.put(`/reviews/${id}`, data),

  // Delete review
  delete: (id) => api.delete(`/reviews/${id}`),

  // Like/unlike review
  likeReview: (id) => api.post(`/reviews/${id}/like`),

  // Admin functions
  replyToReview: (id, content) => api.post(`/reviews/${id}/reply`, { content }),
  updateAdminReply: (id, content) =>
    api.put(`/reviews/${id}/reply`, { content }),
  toggleVisibility: (id) => api.patch(`/reviews/${id}/toggle-visibility`),
};
// ============================================
// PROMOTION API – PHIÊN BẢN HOÀN CHỈNH, CHUẨN ADMIN
// ============================================
export const promotionAPI = {
  // CŨ – vẫn giữ lại cho các trang customer/public dùng
  getAll: (params = {}) => api.get("/promotions", { params }), // ← có thể bỏ dần

  // MỚI – DÀNH RIÊNG CHO ADMIN: phân trang, tìm kiếm, lọc status, sort...
  getAllPromotions: (params = {}) => api.get("/promotions/admin", { params }), // ← THÊM DÒNG NÀY (QUAN TRỌNG NHẤT)

  // Các hàm khác (giữ nguyên)
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),

  // Public / Customer
  getActive: () => api.get("/promotions/active"),
  apply: (data) => api.post("/promotions/apply", data),
};

// ============================================
// USER API
// ============================================
export const userAPI = {
  // ✅ NEW: Get all shippers (for Order Manager to assign)
  getAllShippers: () => api.get("/users/shippers"),

  updateProfile: (data) => api.put("/users/profile", data),
  addAddress: (data) => api.post("/users/addresses", data),
  updateAddress: (addressId, data) =>
    api.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
  getAllEmployees: (params = {}) => api.get("/users/employees", { params }),
  getPermissionCatalog: () => api.get("/users/permissions/catalog"),
  getPermissionTemplates: () => api.get("/users/permissions/templates"),
  previewPermissionAssignments: (data) => api.post("/users/permissions/preview", data),
  createUser: (data) => api.post("/users", data),
  updateUserPermissions: (id, data) => api.put(`/users/${id}/permissions`, data),
  getUserEffectivePermissions: (id, params = {}) =>
    api.get(`/users/${id}/effective-permissions`, { params }),
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

export const sepayAPI = {
  createQr: (data) => api.post("/payment/sepay/create-qr", data),
  webhookTest: (data, authorization = "") =>
    api.post("/payment/sepay/webhook", data, {
      headers: authorization ? { Authorization: authorization } : {},
    }),
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
    )
      .flat()
      .map((product) => ({
        ...product,
        createAt: product?.createAt || product?.createdAt,
      }));

    const getCreateAtTimestamp = (product) => {
      const rawValue = product?.createAt;
      const timestamp = rawValue ? new Date(rawValue).getTime() : 0;
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    allProducts.sort((a, b) => getCreateAtTimestamp(b) - getCreateAtTimestamp(a));
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
// HOMEPAGE LAYOUT API
// ============================================
export const homePageAPI = {
  getLayout: () => api.get("/homepage/layout"),
  updateLayout: (sections) => api.put("/homepage/layout", { sections }),
  toggleSection: (sectionId, enabled) =>
    api.patch(`/homepage/sections/${sectionId}/toggle`, { enabled }),
  reorderSections: (sectionIds) =>
    api.put("/homepage/sections/reorder", { sectionIds }),
  updateSectionConfig: (sectionId, config, title) =>
    api.patch(`/homepage/sections/${sectionId}/config`, { config, title }),
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/homepage/upload-banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteBanner: (imagePath) =>
    api.delete("/homepage/banner", { data: { imagePath } }),
  resetToDefault: () => api.post("/homepage/reset-default"),
};

export const searchAPI = {
  search: (params) => api.get("/search", { params }),
  autocomplete: (params) => api.get("/search/autocomplete", { params }),
};

export const shortVideoAPI = {
  getPublished: (params) => api.get("/short-videos/published", { params }),
  getTrending: (limit = 20) =>
    api.get("/short-videos/trending", { params: { limit } }),
  getById: (id) => api.get(`/short-videos/${id}`),
  incrementView: (id) => api.post(`/short-videos/${id}/view`),
  toggleLike: (id) => api.post(`/short-videos/${id}/like`),
  incrementShare: (id) => api.post(`/short-videos/${id}/share`),

  // Admin
  getAll: (params) => api.get("/short-videos", { params }),
  create: (data) => {
    console.log("🚀 Calling API create with data:", data);
    // Log FormData content
    if (data instanceof FormData) {
      console.log("📦 FormData entries:");
      for (let [key, value] of data.entries()) {
        if (value instanceof File) {
          console.log(`- ${key}:`, value.name, value.size, value.type);
        } else {
          console.log(`- ${key}:`, value);
        }
      }
    }
    return api.post("/short-videos", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  update: (id, data) => api.put(`/short-videos/${id}`, data),
  delete: (id) => api.delete(`/short-videos/${id}`),
  reorder: (videoIds) => api.put("/short-videos/reorder", { videoIds }),
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
  notificationAPI,
  posAPI,
  reviewAPI,
  promotionAPI,
  userAPI,
  analyticsAPI,
  vnpayAPI,
  sepayAPI,
  getTopSelling,
  getAllProductsForCategory,
  getTopNewProducts,
  handleApiError,
};

// ============================================
// BRAND API
// ============================================
export const brandAPI = {
  getAll: (params) => api.get("/brands", { params }),
  getOne: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post("/brands", data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
};

// ============================================
// PRODUCT TYPE API
// ============================================
export const productTypeAPI = {
  getPublic: (params) => api.get("/product-types/public", { params }),
  getAll: (params) => api.get("/product-types", { params }),
  getOne: (id) => api.get(`/product-types/${id}`),
  create: (data) => api.post("/product-types", data),
  update: (id, data) => api.put(`/product-types/${id}`, data),
  delete: (id) => api.delete(`/product-types/${id}`),
};

// ============================================
// UNIVERSAL PRODUCT API
// ============================================
export const universalProductAPI = {
  getAll: (params) => api.get('/universal-products', { params }),
  getById: (id) => api.get(`/universal-products/${id}`),
  getBySlug: (slug) => api.get(`/universal-products/${slug}`),
  create: (data) => api.post('/universal-products', data),
  update: (id, data) => api.put(`/universal-products/${id}`, data),
  delete: (id) => api.delete(`/universal-products/${id}`),
};

// ============================================
// OMNICHANNEL STORE API
// ============================================
export const storeAPI = {
  getAll: (params = {}) => api.get("/stores", { params }),
  getById: (storeId) => api.get(`/stores/${storeId}`),
  getNearby: (params = {}) => api.get("/stores/nearby", { params }),
  checkStock: (storeId, items = []) =>
    api.post(`/stores/${storeId}/check-stock`, { items }),
  create: (data) => api.post("/stores", data),
  update: (id, data) => api.put(`/stores/${id}`, data),
  delete: (id) => api.delete(`/stores/${id}`),
};

// ============================================
// OMNICHANNEL INVENTORY API
// ============================================
export const inventoryAPI = {
  checkAvailability: (productId, variantSku, province) =>
    api.get(`/inventory/check/${productId}/${variantSku}`, {
      params: { province },
    }),
  getByStore: (storeId, params = {}) =>
    api.get(`/inventory/store/${storeId}`, { params }),
  getConsolidated: (params = {}) =>
    api.get("/inventory/dashboard/consolidated", { params }),
  getStoreComparison: (params = {}) =>
    api.get("/inventory/dashboard/store-comparison", { params }),
  getAlerts: (params = {}) => api.get("/inventory/dashboard/alerts", { params }),
  getReplenishment: (params = {}) =>
    api.get("/inventory/dashboard/replenishment", { params }),
  runReplenishmentSnapshot: () =>
    api.post("/inventory/dashboard/replenishment/run-snapshot"),
  getPredictions: (params = {}) =>
    api.get("/inventory/dashboard/predictions", { params }),
  getPredictionBySku: (variantSku, params = {}) =>
    api.get(`/inventory/dashboard/predictions/${variantSku}`, { params }),
  getMovements: (params = {}) =>
    api.get("/inventory/dashboard/movements", { params }),
};

export const stockTransferAPI = {
  getAll: (params = {}) => api.get("/inventory/transfers", { params }),
  getById: (id) => api.get(`/inventory/transfers/${id}`),
  request: (data) => api.post("/inventory/transfers/request", data),
  approve: (id, data = {}) => api.put(`/inventory/transfers/${id}/approve`, data),
  reject: (id, data = {}) => api.put(`/inventory/transfers/${id}/reject`, data),
  ship: (id, data = {}) => api.put(`/inventory/transfers/${id}/ship`, data),
  receive: (id, data = {}) => api.put(`/inventory/transfers/${id}/receive`, data),
  complete: (id, data = {}) => api.put(`/inventory/transfers/${id}/complete`, data),
  cancel: (id, data = {}) => api.put(`/inventory/transfers/${id}/cancel`, data),
};

// ============================================
// OMNICHANNEL MONITORING API
// ============================================
export const monitoringAPI = {
  getRolloutDecision: () => api.get("/monitoring/omnichannel/rollout"),
  getOmnichannelSummary: (params = {}) =>
    api.get("/monitoring/omnichannel/summary", { params }),
  getOmnichannelEvents: (params = {}) =>
    api.get("/monitoring/omnichannel/events", { params }),
};

