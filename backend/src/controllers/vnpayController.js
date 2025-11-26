import crypto from "crypto";
import qs from "qs"; // Thay querystring bằng qs (tốt hơn cho stringify)
import moment from "moment";
import Order from "../models/Order.js";

// Hàm sortObject chuẩn VNPAY (encode key/value, replace %20 bằng + cho space)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(
      obj[decodeURIComponent(str[key])]
    ).replace(/%20/g, "+");
  }
  return sorted;
}

// ============================================
// TẠO PAYMENT URL - Manual theo mẫu VNPAY chính thức
// ============================================
export const createPaymentUrl = async (req, res) => {
  console.log("\n=== ENVIRONMENT CHECK ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("VNP_TMN_CODE:", process.env.VNP_TMN_CODE);
  console.log("VNP_HASH_SECRET (full):", process.env.VNP_HASH_SECRET); // ← XÓA SAU KHI TEST
  console.log("VNP_URL:", process.env.VNP_URL);

  console.log("\n=== CREATE VNPAY PAYMENT URL ===");
  console.log("\n=== CREATE VNPAY PAYMENT URL ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { orderId, amount, orderDescription, bankCode, language } = req.body;

    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đơn hàng hoặc số tiền không hợp lệ",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập đơn hàng này",
      });
    }

    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.connection.remoteAddress ||
      "127.0.0.1";

    if (ipAddr.includes(",")) {
      ipAddr = ipAddr.split(",")[0].trim();
    }
    ipAddr = ipAddr.replace("::ffff:", "");

    console.log("Client IP:", ipAddr);

    console.log("\n=== VNPAY CONFIG CHECK ===");
    console.log(
      "VNP_TMN_CODE:",
      process.env.VNP_TMN_CODE?.substring(0, 4) + "***"
    );
    console.log(
      "VNP_HASH_SECRET:",
      process.env.VNP_HASH_SECRET ? "EXISTS" : "MISSING"
    );
    console.log("VNP_URL:", process.env.VNP_URL);
    console.log("VNP_RETURN_URL:", process.env.VNP_RETURN_URL);

    console.log("=== SECRET KEY CHECK ===");
    console.log("Secret length:", process.env.VNP_HASH_SECRET?.length);
    console.log(
      "Secret first 10 chars:",
      process.env.VNP_HASH_SECRET?.substring(0, 10)
    );
    console.log(
      "Secret last 10 chars:",
      process.env.VNP_HASH_SECRET?.substring(
        process.env.VNP_HASH_SECRET.length - 10
      )
    );

    const createDate = moment().format("YYYYMMDDHHmmss");
    const orderId_vnp = `${order._id}${moment().format("YYYYMMDDHHmmss")}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expireDate = moment(tomorrow).format("YYYYMMDDHHmmss");
    const returnUrl =
      process.env.VNP_RETURN_URL ||
      "http://localhost:5173/payment/vnpay/return";
    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: process.env.VNP_TMN_CODE,
      vnp_Locale: language || "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId_vnp,
      vnp_OrderInfo:
        orderDescription || `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl, // ← ĐỔI THÀNH NÀY
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (bankCode && bankCode !== "") {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    console.log("\n--- VNP Params (before sort) ---");
    console.log(JSON.stringify(vnp_Params, null, 2));

    vnp_Params = sortObject(vnp_Params);

    console.log("\n=== BEFORE SIGNING ===");
    console.log("vnp_ReturnUrl (in params):", vnp_Params["vnp_ReturnUrl"]);

    console.log("\n--- VNP Params (after sort & encode) ---");
    console.log(JSON.stringify(vnp_Params, null, 2));

    const signData = qs.stringify(vnp_Params, { encode: false });
    console.log("\n--- Sign Data ---");
    console.log(signData);

    const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    console.log("\n--- Secure Hash ---");
    console.log(signed);

    vnp_Params["vnp_SecureHash"] = signed;

    const vnpUrl =
      process.env.VNP_URL ||
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const paymentUrl =
      vnpUrl + "?" + qs.stringify(vnp_Params, { encode: false });

    console.log("\n--- Testing Payment URL ---");
    console.log("Full URL Length:", paymentUrl.length);
    console.log(
      "Contains vnp_SecureHash:",
      paymentUrl.includes("vnp_SecureHash=")
    );
    console.log("First 200 chars:", paymentUrl.substring(0, 200));

    order.paymentInfo = {
      ...order.paymentInfo,
      vnpayTxnRef: orderId_vnp,
      vnpayCreatedAt: new Date(),
    };
    await order.save();

    console.log("✅ Payment URL created successfully");

    res.json({
      success: true,
      data: { paymentUrl },
    });
  } catch (error) {
    console.error("❌ CREATE PAYMENT URL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tạo link thanh toán",
    });
  }
};

// ============================================
// IPN URL - Manual theo mẫu VNPAY
// ============================================
export const vnpayIPN = async (req, res) => {
  console.log("\n=== VNPAY IPN RECEIVED ===");
  console.log("Query params:", JSON.stringify(req.query, null, 2));

  let vnp_Params = req.query;
  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  console.log("\n--- Hash Verification ---");
  console.log("Expected:", signed);
  console.log("Received:", secureHash);
  console.log("Match:", secureHash === signed ? "✅ YES" : "❌ NO");

  if (secureHash === signed) {
    const vnpTxnRef = vnp_Params["vnp_TxnRef"];
    const rspCode = vnp_Params["vnp_ResponseCode"];
    const amount = parseInt(vnp_Params["vnp_Amount"]) / 100;
    const transactionNo = vnp_Params["vnp_TransactionNo"];
    const bankCode = vnp_Params["vnp_BankCode"];
    const cardType = vnp_Params["vnp_CardType"];

    console.log("\n=== FINDING ORDER ===");
    console.log("vnp_TxnRef:", vnpTxnRef);
    console.log("Extract ObjectId:", vnpTxnRef.substring(0, 24));

    // ✅ EXTRACT ObjectId từ vnp_TxnRef
    const orderId = vnpTxnRef.substring(0, 24);

    const order = await Order.findOne({
      $or: [{ "paymentInfo.vnpayTxnRef": vnpTxnRef }, { _id: orderId }],
    });

    console.log("Found order:", order?._id);

    if (!order) {
      console.error("❌ Không tìm thấy order");
      return res
        .status(200)
        .json({ RspCode: "01", Message: "Order not found" });
    }

    if (amount !== order.totalAmount) {
      console.error("❌ Amount không khớp");
      return res.status(200).json({ RspCode: "04", Message: "Invalid amount" });
    }

    if (rspCode === "00") {
      // ✅ THÀNH CÔNG
      order.paymentStatus = "PAID";
      order.status = "PAYMENT_VERIFIED"; // ✅ NÂNG CẤP: Status mới

      order.paymentInfo = {
        ...order.paymentInfo,
        vnpayTransactionNo: transactionNo,
        vnpayBankCode: bankCode,
        vnpayCardType: cardType,
        vnpayPaidAt: new Date(),
        vnpayVerified: true, // ✅ THÊM: Xác nhận IPN
        vnpayVerifiedAt: new Date(), // ✅ THÊM: Thời gian xác nhận
        vnpayAmount: amount,
        vnpayResponseCode: rspCode,
      };

      // ✅ THÊM: Lịch sử trạng thái
      order.statusHistory.push({
        status: "PAYMENT_VERIFIED",
        updatedBy: order.customerId,
        updatedAt: new Date(),
        note: `Thanh toán VNPay xác nhận - Transaction: ${transactionNo}`,
      });

      await order.save();

      console.log("✅ Order updated:", order._id);
      console.log(`   - Status: ${order.status}`);
      console.log(`   - Payment: PAID`);
      console.log(`   - VNPay Verified: ${order.paymentInfo.vnpayVerified}`);

      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      // ❌ THẤT BẠI
      order.paymentInfo = {
        ...order.paymentInfo,
        vnpayFailed: true,
        vnpayFailReason: rspCode,
        vnpayResponseCode: rspCode,
      };

      // ✅ THÊM: Ghi nhận thất bại vào lịch sử
      order.statusHistory.push({
        status: "PENDING",
        updatedBy: order.customerId,
        updatedAt: new Date(),
        note: `Thanh toán VNPay thất bại - Code: ${rspCode}`,
      });

      await order.save();

      console.log("❌ Payment failed with code:", rspCode);
      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    }
  } else {
    console.error("❌ Chữ ký không hợp lệ");
    return res
      .status(200)
      .json({ RspCode: "97", Message: "Invalid signature" });
  }
};
// RETURN URL - Manual theo mẫu VNPAY
export const vnpayReturn = async (req, res) => {
  console.log("\n=== VNPAY RETURN URL ===");
  console.log("Query params:", JSON.stringify(req.query, null, 2));

  let vnp_Params = req.query;
  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  console.log("\n--- Return Hash Verification ---");
  console.log("Expected:", signed);
  console.log("Received:", secureHash);
  console.log("Match:", secureHash === signed ? "✅ YES" : "❌ NO");

  if (secureHash === signed) {
    const vnpTxnRef = vnp_Params["vnp_TxnRef"];
    const rspCode = vnp_Params["vnp_ResponseCode"];

    console.log("\n=== FINDING ORDER (RETURN) ===");
    console.log("vnp_TxnRef:", vnpTxnRef);

    const orderId = vnpTxnRef.substring(0, 24);

    const order = await Order.findOne({
      $or: [{ "paymentInfo.vnpayTxnRef": vnpTxnRef }, { _id: orderId }],
    });

    console.log("Found order:", order?._id);
    console.log("Order status:", order?.status);
    console.log("Payment status:", order?.paymentStatus);

    // ✅ NÂNG CẤP: Trả về thông tin chi tiết
    const paymentVerified =
      order?.paymentInfo?.vnpayVerified || order?.paymentStatus === "PAID";

    res.json({
      success: rspCode === "00",
      code: rspCode,
      message:
        rspCode === "00"
          ? "Thanh toán thành công"
          : `Thanh toán thất bại - Code: ${rspCode}`,
      orderId: order?._id,
      orderNumber: order?.orderNumber,
      orderStatus: order?.status,
      paymentStatus: order?.paymentStatus,
      paymentVerified: paymentVerified, // ✅ THÊM: Xác nhận thanh toán
      totalAmount: order?.totalAmount,
      transactionNo: order?.paymentInfo?.vnpayTransactionNo,
    });
  } else {
    res.json({
      success: false,
      message: "Chữ ký không hợp lệ",
    });
  }
};
