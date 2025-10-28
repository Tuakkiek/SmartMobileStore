// frontend/src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const getStatusColor = (status) => {
  const colors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    SHIPPING: "bg-indigo-100 text-indigo-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    ACTIVE: "bg-green-100 text-green-800",
    LOCKED: "bg-red-100 text-red-800",
    AVAILABLE: "bg-green-100 text-green-800",
    OUT_OF_STOCK: "bg-orange-100 text-orange-800",
    DISCONTINUED: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export const getStatusText = (status) => {
  const texts = {
    PENDING: "Chờ xử lý",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang xử lý",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã hủy",
    ACTIVE: "Hoạt động",
    LOCKED: "Đã khóa",
    AVAILABLE: "Còn hàng",
    OUT_OF_STOCK: "Hết hàng",
    DISCONTINUED: "Ngừng kinh doanh",
    UNPAID: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    COD: "Thanh toán khi nhận hàng",
    BANK_TRANSFER: "Chuyển khoản",
  };
  return texts[status] || status;
};

// Function to fetch all products across all categories
export const fetchAllProducts = async (params = {}) => {
  try {
    const [iphones, ipads, macs, airpods, applewatches, accessories] =
      await Promise.all([
        iPhoneAPI.getAll(params),
        iPadAPI.getAll(params),
        macAPI.getAll(params),
        airPodsAPI.getAll(params),
        appleWatchAPI.getAll(params),
        accessoryAPI.getAll(params),
      ]);

    const allProducts = [
      ...(iphones?.data?.data?.products || []),
      ...(ipads?.data?.data?.products || []),
      ...(macs?.data?.data?.products || []),
      ...(airpods?.data?.data?.products || []),
      ...(applewatches?.data?.data?.products || []),
      ...(accessories?.data?.data?.products || []),
    ];

    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return allProducts;
  } catch (error) {
    console.error("Error fetching all products:", error);
    throw error;
  }
};
