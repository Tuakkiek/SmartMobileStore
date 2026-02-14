export const ORDER_STATUS = {
  PENDING: "PENDING",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  PREPARING: "PREPARING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  PREPARING_SHIPMENT: "PREPARING_SHIPMENT",
  SHIPPING: "SHIPPING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  PICKED_UP: "PICKED_UP",
  COMPLETED: "COMPLETED",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  CANCELLED: "CANCELLED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURNED: "RETURNED",
};

export const FULFILLMENT_TYPE = {
  HOME_DELIVERY: "HOME_DELIVERY",
  CLICK_AND_COLLECT: "CLICK_AND_COLLECT",
  IN_STORE: "IN_STORE",
};

export const getStatusText = (status) => {
  const statusMap = {
    PENDING: "Cho xu ly",
    PENDING_PAYMENT: "Cho thanh toan",
    PAYMENT_CONFIRMED: "Da thanh toan",
    PAYMENT_VERIFIED: "Da thanh toan online",
    CONFIRMED: "Da xac nhan",
    PROCESSING: "Dang xu ly",
    PREPARING: "Dang chuan bi",
    READY_FOR_PICKUP: "San sang lay hang",
    PREPARING_SHIPMENT: "Da hoan tat lay hang",
    SHIPPING: "Dang van chuyen",
    OUT_FOR_DELIVERY: "Dang giao hang",
    DELIVERED: "Da giao hang",
    PICKED_UP: "Da nhan tai cua hang",
    COMPLETED: "Hoan tat",
    DELIVERY_FAILED: "Giao hang that bai",
    CANCELLED: "Da huy",
    RETURN_REQUESTED: "Yeu cau tra hang",
    RETURNED: "Da tra hang",
  };

  return statusMap[status] || status;
};

export const getStatusColor = (status) => {
  const map = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    PENDING_PAYMENT: "bg-orange-100 text-orange-800 border-orange-200",
    PAYMENT_CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PAYMENT_VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    PROCESSING: "bg-indigo-100 text-indigo-800 border-indigo-200",
    PREPARING: "bg-purple-100 text-purple-800 border-purple-200",
    READY_FOR_PICKUP: "bg-cyan-100 text-cyan-800 border-cyan-200",
    PREPARING_SHIPMENT: "bg-violet-100 text-violet-800 border-violet-200",
    SHIPPING: "bg-sky-100 text-sky-800 border-sky-200",
    OUT_FOR_DELIVERY: "bg-blue-100 text-blue-800 border-blue-200",
    DELIVERED: "bg-green-100 text-green-800 border-green-200",
    PICKED_UP: "bg-green-100 text-green-800 border-green-200",
    COMPLETED: "bg-teal-100 text-teal-800 border-teal-200",
    DELIVERY_FAILED: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
    RETURN_REQUESTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
    RETURNED: "bg-orange-100 text-orange-800 border-orange-200",
  };

  return map[status] || "bg-gray-100 text-gray-800 border-gray-200";
};

export const getFulfillmentText = (type) => {
  const typeMap = {
    HOME_DELIVERY: "Giao tan nha",
    CLICK_AND_COLLECT: "Nhan tai cua hang",
    IN_STORE: "Mua tai cua hang",
  };

  return typeMap[type] || type;
};

export const getPaymentMethodText = (method) => {
  const textMap = {
    COD: "COD",
    VNPAY: "VNPay",
    BANK_TRANSFER: "Chuyen khoan",
    MOMO: "MoMo",
    CASH: "Tien mat",
    INSTALLMENT: "Tra gop",
  };

  return textMap[method] || method;
};

export const formatPrice = (amount) => {
  if (!Number.isFinite(Number(amount))) {
    return "0 ?";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(amount));
};

export const formatDateTime = (dateString) => {
  if (!dateString) {
    return "N/A";
  }

  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const calculateOrderTotal = (items = [], shippingFee = 0, discount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
  }, 0);

  return subtotal + (Number(shippingFee) || 0) - (Number(discount) || 0);
};

export default {
  ORDER_STATUS,
  FULFILLMENT_TYPE,
  getStatusText,
  getStatusColor,
  getFulfillmentText,
  getPaymentMethodText,
  formatPrice,
  formatDateTime,
  calculateOrderTotal,
};
