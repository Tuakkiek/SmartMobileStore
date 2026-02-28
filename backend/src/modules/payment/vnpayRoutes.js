import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { orderAuditMiddleware } from "../order/orderAuditMiddleware.js";
import { ORDER_AUDIT_ACTIONS } from "../order/orderAuditActions.js";
import { resolveOrderIdFromVnpTxnRef } from "../order/orderAuditAdapter.js";
import {
  createPaymentUrl,
  vnpayIPN,
  vnpayReturn,
} from "./vnpayController.js";

const router = express.Router();

const auditCreatePaymentLink = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.CREATE_PAYMENT_LINK,
  source: "VNPAY_API",
});

const auditVnpayIPN = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.PROCESS_VNPAY_IPN,
  source: "VNPAY_IPN",
  resolveOrderId: (req) => resolveOrderIdFromVnpTxnRef(req?.query?.vnp_TxnRef),
});

router.post("/create-payment-url", protect, auditCreatePaymentLink, createPaymentUrl);
router.get("/ipn", auditVnpayIPN, vnpayIPN);
router.get("/return", vnpayReturn);

export default router;
