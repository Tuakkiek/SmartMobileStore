// backend/src/lib/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ PRODUCT APIs
export const productAPI = {
  // Get all products
  getAll: (params) => api.get('/products', { params }),
  
  // Get product by ID + variants
  getById: (id) => api.get(`/products/${id}`),
  
  // Get variants by product
  getVariants: (productId) => api.get(`/products/${productId}/variants`),
  
  // Get specific variant
  getVariant: (variantId) => api.get(`/products/variants/${variantId}`),
  
  // Filter by attributes
  getVariantByAttributes: (productId, color, storage) => 
    api.get(`/products/${productId}/variants`, { 
      params: { color, storage } 
    }),
  
  // Categories
  getCategories: () => api.get('/products/categories'),
  getByCategory: (category, params) => api.get(`/products/category/${category}`, { params }),
  
  // Featured
  getFeatured: (params) => api.get('/products/featured', { params }),
  getNewArrivals: (params) => api.get('/products/new-arrivals', { params }),
  getRelated: (id) => api.get(`/products/${id}/related`),
};

// ✅ CART APIs - UPDATED WITH VARIANT SUPPORT
export const cartAPI = {
  getCart: () => api.get('/cart'),
  
  addToCart: (data) => api.post('/cart', data), // { variantId, quantity }
  
  updateItem: (data) => api.put('/cart', data), // { variantId, quantity }
  
  removeItem: (itemId) => api.delete(`/cart/${itemId}`),
  
  clearCart: () => api.delete('/cart'),
};

// ✅ AUTH APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

// ✅ USER APIs
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

// ✅ ORDER APIs
export const orderAPI = {
  createOrder: (data) => api.post('/orders', data),
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
};

// ✅ REVIEW APIs
export const reviewAPI = {
  createReview: (productId, data) => api.post(`/reviews/${productId}`, data),
  getReviews: (productId, params) => api.get(`/reviews/${productId}`, { params }),
};

// ✅ PROMOTION APIs
export const promotionAPI = {
  getPromotions: () => api.get('/promotions'),
  applyPromo: (code) => api.post('/promotions/apply', { code }),
};

export default api;