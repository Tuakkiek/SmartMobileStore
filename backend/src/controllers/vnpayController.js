import crypto from "crypto";
import querystring from "querystring";
import moment from "moment";
import { vnpayConfig } from "../config/vnpay.js";
import Order from "../models/Order.js";

// Hàm sort object theo alphabet
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// Tạo payment URL
export const createPaymentUrl = async (req, res) => {
  try {
    const { orderId, amount, orderDescription, bankCode, language } = req.body;

    // Verify order exists và thuộc về user
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Đơn hàng không tồn tại" });
    }

    if (order.customerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền" });
    }

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    const createDate = moment().format("YYYYMMDDHHmmss");
    const orderId_vnp = moment().format("DDHHmmss"); // Unique order ID for VNPay

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnpayConfig.vnp_TmnCode,
      vnp_Locale: language || "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId_vnp,
      vnp_OrderInfo:
        orderDescription || `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100, // VNPay nhận số tiền * 100
      vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    const paymentUrl =
      vnpayConfig.vnp_Url +
      "?" +
      querystring.stringify(vnp_Params, { encode: false });

    // Lưu txnRef vào order để tracking
    order.paymentInfo = {
      ...order.paymentInfo,
      vnpayTxnRef: orderId_vnp,
      vnpayCreatedAt: new Date(),
    };
    await order.save();

    res.json({ success: true, data: { paymentUrl } });
  } catch (error) {
    console.error("Create VNPay payment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// IPN URL - Nhận kết quả từ VNPay (webhook)
export const vnpayIPN = async (req, res) => {
  try {
    // ✅ THÊM LOG ĐỂ DEBUG
    console.log("=== VNPay IPN Received ===");
    console.log("Query params:", req.query);
    console.log("Headers:", req.headers);

    let vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("Expected signature:", signed);
    console.log("Received signature:", secureHash);
    console.log("Signature match:", secureHash === signed);

    if (secureHash === signed) {
      const orderId = vnp_Params["vnp_TxnRef"];
      const rspCode = vnp_Params["vnp_ResponseCode"];

      console.log("Processing order:", orderId, "Response code:", rspCode);

      const order = await Order.findOne({ "paymentInfo.vnpayTxnRef": orderId });

      if (!order) {
        console.log("Order not found:", orderId);
        return res
          .status(200)
          .json({ RspCode: "01", Message: "Order not found" });
      }

      const amount = vnp_Params["vnp_Amount"] / 100;
      if (amount !== order.totalAmount) {
        console.log("Amount mismatch:", amount, "vs", order.totalAmount);
        return res
          .status(200)
          .json({ RspCode: "04", Message: "Invalid amount" });
      }

      if (rspCode === "00") {
        console.log("Payment SUCCESS - updating order");
        order.paymentStatus = "PAID";
        order.paymentInfo = {
          ...order.paymentInfo,
          vnpayTransactionNo: vnp_Params["vnp_TransactionNo"],
          vnpayBankCode: vnp_Params["vnp_BankCode"],
          vnpayCardType: vnp_Params["vnp_CardType"],
          vnpayPaidAt: new Date(),
        };

        if (order.status === "PENDING") {
          order.status = "CONFIRMED";
          order.statusHistory.push({
            status: "CONFIRMED",
            updatedBy: order.customerId,
            updatedAt: new Date(),
            note: "Thanh toán VNPay thành công",
          });
        }

        await order.save();
        console.log("Order updated successfully");
        return res.status(200).json({ RspCode: "00", Message: "Success" });
      } else {
        console.log("Payment FAILED - code:", rspCode);
        order.paymentInfo = {
          ...order.paymentInfo,
          vnpayFailed: true,
          vnpayFailReason: vnp_Params["vnp_ResponseCode"],
        };
        await order.save();
        return res.status(200).json({ RspCode: "00", Message: "Success" });
      }
    } else {
      console.log("INVALID SIGNATURE");
      return res
        .status(200)
        .json({ RspCode: "97", Message: "Invalid signature" });
    }
  } catch (error) {
    console.error("VNPay IPN error:", error);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};

// Return URL - Xử lý khi user quay lại từ VNPay
export const vnpayReturn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      const orderId = vnp_Params["vnp_TxnRef"];
      const rspCode = vnp_Params["vnp_ResponseCode"];

      // Tìm order
      const order = await Order.findOne({ "paymentInfo.vnpayTxnRef": orderId });

      res.json({
        success: true,
        code: rspCode,
        message:
          rspCode === "00" ? "Thanh toán thành công" : "Thanh toán thất bại",
        orderId: order?._id,
        orderNumber: order?.orderNumber,
      });
    } else {
      res.json({ success: false, message: "Chữ ký không hợp lệ" });
    }
  } catch (error) {
    console.error("VNPay return error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
