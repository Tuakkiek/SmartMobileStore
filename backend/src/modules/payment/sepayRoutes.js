import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { ORDER_AUDIT_ACTIONS } from "../order/orderAuditActions.js";
import { orderAuditMiddleware } from "../order/orderAuditMiddleware.js";
import { resolveOrderIdFromSepayPayload } from "../order/orderAuditAdapter.js";
import { createSepayQr, handleSepayWebhook } from "./sepayController.js";

const router = express.Router();
const webhookRouter = express.Router();

const auditCreateSepayQr = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.CREATE_SEPAY_QR,
  source: "SEPAY_API",
});

const auditSepayWebhook = orderAuditMiddleware({
  actionType: ORDER_AUDIT_ACTIONS.PROCESS_SEPAY_WEBHOOK,
  source: "SEPAY_WEBHOOK",
  resolveOrderId: async (req) => resolveOrderIdFromSepayPayload(req.body || {}),
});

router.post("/create-qr", protect, auditCreateSepayQr, createSepayQr);
router.post("/webhook", auditSepayWebhook, handleSepayWebhook);
webhookRouter.post("/webhook", auditSepayWebhook, handleSepayWebhook);

export { webhookRouter as sepayWebhookRouter };
export default router;
