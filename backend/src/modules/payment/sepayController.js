import Order from "../order/Order.js";

const DEFAULT_SEPAY_QR_BASE_URL = "https://qr.sepay.vn/img";
const DEFAULT_SEPAY_TTL_MINUTES = 15;
const ORDER_CODE_PRIMARY_REGEX = /DH\d{9}/i;
const ORDER_CODE_FALLBACK_REGEX = /DH\d+/i;

const toNumber = (value, fallback = NaN) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getSepayTtlMinutes = () => {
  const fromEnv = Number(process.env.SEPAY_PAYMENT_TTL_MINUTES);
  if (!Number.isFinite(fromEnv) || fromEnv <= 0) {
    return DEFAULT_SEPAY_TTL_MINUTES;
  }
  return Math.floor(fromEnv);
};

const buildSepayOrderCode = (orderNumber, fallbackSeed = "") => {
  const raw = String(orderNumber || "").trim();
  const lastSegment = raw.split("-").pop() || raw;
  const digits = (lastSegment.match(/\d+/g) || []).join("");
  const sourceDigits = digits || String(fallbackSeed || "").replace(/\D/g, "");
  const finalDigits =
    sourceDigits.slice(-9).padStart(9, "0") ||
    String(Date.now() % 1_000_000_000).padStart(9, "0");
  return `DH${finalDigits}`;
};

const buildSepayQrUrl = ({ amount, orderCode }) => {
  const baseUrl = process.env.SEPAY_QR_BASE_URL || DEFAULT_SEPAY_QR_BASE_URL;
  const params = new URLSearchParams({
    acc: String(process.env.SEPAY_BANK_ACCOUNT || "").trim(),
    bank: String(process.env.SEPAY_BANK_ID || "").trim(),
    amount: String(Math.floor(Number(amount) || 0)),
    des: String(orderCode || "").trim(),
    name: String(process.env.SEPAY_ACCOUNT_NAME || "").trim(),
  });

  return `${baseUrl}?${params.toString()}`;
};

const normalizeSepayOrderCode = (value) => {
  const text = String(value || "").trim().toUpperCase();
  if (!text) {
    return "";
  }
  if (ORDER_CODE_PRIMARY_REGEX.test(text)) {
    return text.match(ORDER_CODE_PRIMARY_REGEX)?.[0]?.toUpperCase() || "";
  }
  if (ORDER_CODE_FALLBACK_REGEX.test(text)) {
    return text.match(ORDER_CODE_FALLBACK_REGEX)?.[0]?.toUpperCase() || "";
  }
  return "";
};

const extractSepayOrderCodeFromContent = (content) => {
  const text = String(content || "").trim();
  if (!text) {
    return "";
  }
  const primary = text.match(ORDER_CODE_PRIMARY_REGEX);
  if (primary?.[0]) {
    return primary[0].toUpperCase();
  }
  const fallback = text.match(ORDER_CODE_FALLBACK_REGEX);
  if (fallback?.[0]) {
    return fallback[0].toUpperCase();
  }
  return "";
};

const verifyWebhookAuthorization = (headerValue, expectedToken) => {
  const token = String(expectedToken || "").trim();
  if (!token) {
    return false;
  }

  const raw = String(headerValue || "").trim();
  if (!raw) {
    return false;
  }

  if (raw === token) {
    return true;
  }

  const [scheme, value] = raw.split(/\s+/, 2);
  if (!scheme || !value) {
    return false;
  }

  if (!/^(apikey|bearer)$/i.test(scheme)) {
    return false;
  }

  return value === token;
};

const appendStatusHistoryIfChanged = (order, status, updatedBy, note) => {
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  const latest = order.statusHistory[order.statusHistory.length - 1];
  if (latest?.status === status && latest?.note === note) {
    return;
  }

  order.statusHistory.push({
    status,
    updatedBy,
    updatedAt: new Date(),
    note,
  });
};

const removeOrderedItemsFromCart = async (order) => {
  const ownerId = order.customerId || order.userId;
  if (!ownerId) {
    return;
  }

  const Cart = (await import("../cart/Cart.js")).default;
  const cart = await Cart.findOne({ customerId: ownerId });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return;
  }

  const variantIds = new Set(
    (Array.isArray(order.items) ? order.items : [])
      .map((item) => String(item?.variantId || "").trim())
      .filter(Boolean)
  );

  if (!variantIds.size) {
    return;
  }

  cart.items = cart.items.filter((item) => {
    const variantId = String(item?.variantId || "").trim();
    return !variantId || !variantIds.has(variantId);
  });

  await cart.save();
};

const resolveTransferType = (payload = {}) => {
  return String(
    payload.transferType ??
      payload.type ??
      payload.transactionType ??
      payload.transfer_type ??
      ""
  )
    .trim()
    .toLowerCase();
};

const resolveTransferContent = (payload = {}) => {
  return String(
    payload.content ??
      payload.description ??
      payload.transferContent ??
      payload.transactionContent ??
      payload.note ??
      ""
  ).trim();
};

const resolveTransferAmount = (payload = {}) => {
  const candidates = [
    payload.transferAmount,
    payload.amount,
    payload.transfer_value,
    payload.money,
    payload.totalAmount,
  ];

  for (const value of candidates) {
    const parsed = toNumber(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return NaN;
};

const resolveTransactionId = (payload = {}) => {
  return String(
    payload.transactionId ??
      payload.referenceId ??
      payload.id ??
      payload.gatewayTransactionId ??
      payload.transId ??
      ""
  ).trim();
};

export const createSepayQr = async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing orderId",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const ownerId = order.customerId || order.userId;
    if (!ownerId || String(ownerId) !== String(req.user?._id || "")) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      return res.status(400).json({
        success: false,
        message: "Order payment method is not BANK_TRANSFER",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid",
      });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return res.status(400).json({
        success: false,
        message: "Order is not waiting for payment",
      });
    }

    const ttlMinutes = getSepayTtlMinutes();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const existingOrderCode = normalizeSepayOrderCode(order?.paymentInfo?.sepayOrderCode);
    const orderCode = existingOrderCode || buildSepayOrderCode(order.orderNumber, order._id);
    const qrUrl = buildSepayQrUrl({
      amount: order.totalAmount,
      orderCode,
    });

    order.paymentInfo = {
      ...(order.paymentInfo || {}),
      sepayOrderCode: orderCode,
      sepayQrUrl: qrUrl,
      sepayCreatedAt: now,
      sepayExpiresAt: expiresAt,
      sepayAccount: String(process.env.SEPAY_BANK_ACCOUNT || "").trim(),
      sepayBankId: String(process.env.SEPAY_BANK_ID || "").trim(),
      sepayAccountName: String(process.env.SEPAY_ACCOUNT_NAME || "").trim(),
      sepayExpectedAmount: Number(order.totalAmount) || 0,
    };

    await order.save();

    return res.status(200).json({
      success: true,
      data: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        orderCode,
        amount: Number(order.totalAmount) || 0,
        qrUrl,
        instruction: `Vui long chuyen khoan voi noi dung: ${orderCode}`,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[SEPAY] create QR failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const handleSepayWebhook = async (req, res) => {
  try {
    const expectedToken = process.env.SEPAY_API_TOKEN;
    const authHeader = req.headers.authorization;

    if (!verifyWebhookAuthorization(authHeader, expectedToken)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const payload = req.body || {};
    const transferType = resolveTransferType(payload);
    if (transferType && transferType !== "in") {
      return res.status(200).json({
        success: true,
        message: "Ignored non-in transfer",
      });
    }

    const content = resolveTransferContent(payload);
    const extractedOrderCode = extractSepayOrderCodeFromContent(content);
    if (!extractedOrderCode) {
      return res.status(200).json({
        success: true,
        message: "Order code not found",
      });
    }

    const order = await Order.findOne({
      "paymentInfo.sepayOrderCode": extractedOrderCode,
    });

    if (!order) {
      return res.status(200).json({
        success: true,
        message: "Order not found for order code",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        duplicated: true,
        message: "Order already paid",
      });
    }

    const amount = resolveTransferAmount(payload);
    if (!Number.isFinite(amount) || amount <= 0) {
      order.paymentInfo = {
        ...(order.paymentInfo || {}),
        sepayLastWebhookAt: new Date(),
        sepayLastWebhookRaw: payload,
        sepayLastWebhookStatus: "INVALID_AMOUNT",
      };
      await order.save();
      return res.status(200).json({
        success: true,
        message: "Invalid transfer amount",
      });
    }

    const requiredAmount = Number(order.totalAmount) || 0;
    if (amount < requiredAmount) {
      order.paymentInfo = {
        ...(order.paymentInfo || {}),
        sepayLastWebhookAt: new Date(),
        sepayLastWebhookRaw: payload,
        sepayLastWebhookStatus: "INSUFFICIENT_AMOUNT",
        sepayLastInsufficientPayment: {
          amount,
          requiredAmount,
          content,
          receivedAt: new Date(),
        },
      };
      await order.save();
      return res.status(200).json({
        success: true,
        message: "Insufficient amount",
      });
    }

    const transactionId = resolveTransactionId(payload);
    const now = new Date();

    order.paymentStatus = "PAID";
    order.status = "PENDING";
    order.paidAt = order.paidAt || now;
    order.paymentInfo = {
      ...(order.paymentInfo || {}),
      sepayOrderCode: extractedOrderCode,
      sepayVerified: true,
      sepayVerifiedAt: now,
      sepayAmount: amount,
      sepayTransferType: transferType || "in",
      sepayTransferContent: content,
      sepayTransactionId: transactionId || undefined,
      sepayLastWebhookAt: now,
      sepayLastWebhookStatus: "PAID",
      sepayLastWebhookRaw: payload,
    };

    appendStatusHistoryIfChanged(
      order,
      "PENDING",
      order.customerId || order.userId,
      `SePay payment confirmed${transactionId ? ` - Txn: ${transactionId}` : ""}`
    );

    await order.save();

    try {
      await order.issueOnlineInvoice();
    } catch (invoiceError) {
      console.error("[SEPAY] issueOnlineInvoice failed:", invoiceError.message);
    }

    try {
      await removeOrderedItemsFromCart(order);
    } catch (cartError) {
      console.error("[SEPAY] remove cart items failed:", cartError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    console.error("[SEPAY] webhook failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export default {
  createSepayQr,
  handleSepayWebhook,
};
