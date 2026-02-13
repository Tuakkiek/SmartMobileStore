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
  const map = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PENDING_PAYMENT: "bg-orange-100 text-orange-800",
    PAYMENT_CONFIRMED: "bg-emerald-100 text-emerald-800",
    PAYMENT_VERIFIED: "bg-emerald-100 text-emerald-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-indigo-100 text-indigo-800",
    PREPARING: "bg-purple-100 text-purple-800",
    READY_FOR_PICKUP: "bg-cyan-100 text-cyan-800",
    PREPARING_SHIPMENT: "bg-violet-100 text-violet-800",
    SHIPPING: "bg-indigo-100 text-indigo-800",
    OUT_FOR_DELIVERY: "bg-blue-100 text-blue-800",
    DELIVERED: "bg-green-100 text-green-800",
    PICKED_UP: "bg-green-100 text-green-800",
    COMPLETED: "bg-teal-100 text-teal-800",
    DELIVERY_FAILED: "bg-red-100 text-red-800",
    RETURN_REQUESTED: "bg-yellow-100 text-yellow-800",
    RETURNED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    PAID: "bg-green-100 text-green-800",
    UNPAID: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

export const getStatusText = (status) => {
  const map = {
    PENDING: "Cho xac nhan",
    PENDING_PAYMENT: "Cho thanh toan",
    PAYMENT_CONFIRMED: "Da thanh toan",
    PAYMENT_VERIFIED: "Da xac thuc thanh toan",
    CONFIRMED: "Da xac nhan",
    PROCESSING: "Dang xu ly",
    PREPARING: "Dang chuan bi",
    READY_FOR_PICKUP: "San sang lay hang",
    PREPARING_SHIPMENT: "Dang dong goi",
    SHIPPING: "Dang giao hang",
    OUT_FOR_DELIVERY: "Dang giao den khach",
    DELIVERED: "Da giao hang",
    PICKED_UP: "Da nhan tai cua hang",
    COMPLETED: "Hoan tat",
    DELIVERY_FAILED: "Giao hang that bai",
    RETURN_REQUESTED: "Yeu cau tra hang",
    RETURNED: "Da tra hang",
    CANCELLED: "Da huy",
    PAID: "Da thanh toan",
    UNPAID: "Chua thanh toan",
    COD: "Thanh toan khi nhan hang",
    BANK_TRANSFER: "Chuyen khoan",
    VNPAY: "Thanh toan VNPay",
    CASH: "Tien mat",
    CARD: "The",
    HOME_DELIVERY: "Giao tan nha",
    CLICK_AND_COLLECT: "Nhan tai cua hang",
    IN_STORE: "Mua tai cua hang",
  };
  return map[status] || status;
};

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

export const getNameInitials = (fullName) => {
  if (!fullName) return "U";

  const words = fullName.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  const lastTwo = words.slice(-2);
  return lastTwo.map((word) => word.charAt(0).toUpperCase()).join("");
};
