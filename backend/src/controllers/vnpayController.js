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
      req.connection.remoteAddress ||
      "127.0.0.1";

    if (ipAddr.includes(",")) {
      ipAddr = ipAddr.split(",")[0].trim();
    }
    ipAddr = ipAddr.replace("::ffff:", "");

    console.log("Client IP:", ipAddr);

    const createDate = moment().format("YYYYMMDDHHmmss");
    const orderId_vnp = `${order._id}${moment().format("YYYYMMDDHHmmss")}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expireDate = moment(tomorrow).format("YYYYMMDDHHmmss");

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
      vnp_Amount: amount * 100, // Nhân 100 thủ công (VNPAY yêu cầu)
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
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

    const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const paymentUrl =
      vnpUrl + "?" + qs.stringify(vnp_Params, { encode: false });

    console.log("\n--- Payment URL ---");
    console.log(paymentUrl);

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
    const orderId = vnp_Params["vnp_TxnRef"];
    const rspCode = vnp_Params["vnp_ResponseCode"];
    const amount = parseInt(vnp_Params["vnp_Amount"]) / 100;

    const order = await Order.findOne({
      $or: [
        { "paymentInfo.vnpayTxnRef": orderId },
        { _id: orderId.split("_")[0] },
      ],
    });

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
      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      order.paymentInfo = {
        ...order.paymentInfo,
        vnpayFailed: true,
        vnpayFailReason: rspCode,
      };
      await order.save();
      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" }); // Vẫn success để dừng retry VNPAY
    }
  } else {
    console.error("❌ Chữ ký không hợp lệ");
    return res
      .status(200)
      .json({ RspCode: "97", Message: "Invalid signature" });
  }
};

// ============================================
// RETURN URL - Manual theo mẫu VNPAY
// ============================================
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

  console.log("\n--- Hash Verification ---");
  console.log("Expected:", signed);
  console.log("Received:", secureHash);
  console.log("Match:", secureHash === signed ? "✅ YES" : "❌ NO");

  if (secureHash === signed) {
    const orderId = vnp_Params["vnp_TxnRef"];
    const rspCode = vnp_Params["vnp_ResponseCode"];

    const order = await Order.findOne({ "paymentInfo.vnpayTxnRef": orderId });

    res.json({
      success: rspCode === "00",
      code: rspCode,
      message:
        rspCode === "00" ? "Thanh toán thành công" : "Thanh toán thất bại",
      orderId: order?._id,
      orderNumber: order?.orderNumber,
    });
  } else {
    res.json({
      success: false,
      message: "Chữ ký không hợp lệ",
    });
  }
};
