import { api } from "@/shared/lib/http/httpClient";

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
