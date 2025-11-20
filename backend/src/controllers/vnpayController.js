import crypto from "crypto";
import querystring from "querystring";
import moment from "moment";
import { vnpayConfig } from "../config/vnpay.js";
import Order from "../models/Order.js";
import { vnpay } from "../server.js";
import { IpnSuccess, IpnFailChecksum, IpnOrderNotFound, IpnInvalidAmount, IpnUnknownError, InpOrderAlreadyConfirmed } from "vnpay";

// Hàm sort object theo alphabet
// function sortObject(obj) {
//   const sorted = {};
//   const keys = Object.keys(obj).sort();
//   keys.forEach((key) => {
//     sorted[key] = obj[key];
//   });
//   return sorted;
// }

// ============================================
// TẠO PAYMENT URL - WITH DEBUG LOGS
// ============================================
// export const createPaymentUrl = async (req, res) => {
//   console.log("\n=== CREATE VNPAY PAYMENT URL ===");
//   console.log("Request body:", JSON.stringify(req.body, null, 2));
//   console.log("User:", req.user?._id);

//   try {
//     const { orderId, amount, orderDescription, bankCode, language } = req.body;

//     // ✅ KIỂM TRA DỮ LIỆU ĐẦU VÀO
//     if (!orderId) {
//       console.error("❌ Missing orderId");
//       return res.status(400).json({
//         success: false,
//         message: "Thiếu thông tin đơn hàng",
//       });
//     }

//     if (!amount || amount <= 0) {
//       console.error("❌ Invalid amount:", amount);
//       return res.status(400).json({
//         success: false,
//         message: "Số tiền không hợp lệ",
//       });
//     }

//     // ✅ KIỂM TRA CẤU HÌNH VNPAY
//     console.log("\n--- VNPay Config Check ---");
//     console.log(
//       "vnp_TmnCode:",
//       vnpayConfig.vnp_TmnCode ? "✓ Set" : "✗ Missing"
//     );
//     console.log(
//       "vnp_HashSecret:",
//       vnpayConfig.vnp_HashSecret ? "✓ Set" : "✗ Missing"
//     );
//     console.log("vnp_Url:", vnpayConfig.vnp_Url);
//     console.log("vnp_ReturnUrl:", vnpayConfig.vnp_ReturnUrl);

//     if (!vnpayConfig.vnp_TmnCode || !vnpayConfig.vnp_HashSecret) {
//       console.error("❌ VNPay config is incomplete!");
//       return res.status(500).json({
//         success: false,
//         message: "Cấu hình VNPay chưa đầy đủ. Vui lòng kiểm tra .env",
//       });
//     }

//     // Verify order exists và thuộc về user
//     console.log("\n--- Order Verification ---");
//     const order = await Order.findById(orderId);

//     if (!order) {
//       console.error("❌ Order not found:", orderId);
//       return res.status(404).json({
//         success: false,
//         message: "Đơn hàng không tồn tại",
//       });
//     }

//     console.log("Order found:", {
//       orderNumber: order.orderNumber,
//       totalAmount: order.totalAmount,
//       customerId: order.customerId.toString(),
//       status: order.status,
//     });

//     if (order.customerId.toString() !== req.user._id.toString()) {
//       console.error("❌ Unauthorized access to order");
//       return res.status(403).json({
//         success: false,
//         message: "Không có quyền truy cập đơn hàng này",
//       });
//     }

//     // ✅ KIỂM TRA AMOUNT KHỚP VỚI ORDER
//     if (amount !== order.totalAmount) {
//       console.warn("⚠️ Amount mismatch!");
//       console.warn("Request amount:", amount);
//       console.warn("Order totalAmount:", order.totalAmount);
//     }

//     // Lấy IP address
//     let ipAddr =
//       req.headers["x-forwarded-for"] ||
//       req.connection.remoteAddress ||
//       req.socket.remoteAddress ||
//       "127.0.0.1";

//     // VNPay chỉ chấp nhận 1 IP, nếu có nhiều IP thì lấy IP đầu tiên
//     if (ipAddr.includes(",")) {
//       ipAddr = ipAddr.split(",")[0].trim();
//     }

//     // Loại bỏ IPv6 prefix nếu có
//     ipAddr = ipAddr.replace("::ffff:", "");

//     console.log("Client IP:", ipAddr);

//     // Tạo các tham số
//     const createDate = moment().format("YYYYMMDDHHmmss");
//     const orderId_vnp = `${order._id}_${moment().format("YYYYMMDDHHmmss")}`;

//     console.log("\n--- VNPay Transaction Info ---");
//     console.log("createDate:", createDate);
//     console.log("vnp_TxnRef (orderId_vnp):", orderId_vnp);
//     console.log("vnp_Amount (before *100):", amount);
//     console.log("vnp_Amount (after *100):", amount * 100);

//     // ✅ TẠO VNP_PARAMS
//     let vnp_Params = {
//       vnp_Version: "2.1.0",
//       vnp_Command: "pay",
//       vnp_TmnCode: vnpayConfig.vnp_TmnCode,
//       vnp_Locale: language || "vn",
//       vnp_CurrCode: "VND",
//       vnp_TxnRef: orderId_vnp,
//       vnp_OrderInfo:
//         orderDescription || `Thanh toan don hang ${order.orderNumber}`,
//       vnp_OrderType: "other",
//       vnp_Amount: amount * 100, // ✅ VNPay yêu cầu nhân 100
//       vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
//       vnp_IpAddr: ipAddr,
//       vnp_CreateDate: createDate,
//     };

//     // Thêm bankCode nếu có
//     if (bankCode) {
//       vnp_Params["vnp_BankCode"] = bankCode;
//       console.log("bankCode:", bankCode);
//     }

//     console.log("\n--- VNP Params (before sort) ---");
//     console.log(JSON.stringify(vnp_Params, null, 2));

//     // ✅ SẮP XẾP PARAMS
//     vnp_Params = sortObject(vnp_Params);

//     console.log("\n--- VNP Params (after sort) ---");
//     console.log(JSON.stringify(vnp_Params, null, 2));

//     // ✅ TẠO SECURE HASH
//     const signData = querystring.stringify(vnp_Params, { encode: false });
//     console.log("\n--- Sign Data (for hash) ---");
//     console.log(signData);

//     const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
//     const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

//     console.log("\n--- Secure Hash ---");
//     console.log("Generated SecureHash:", signed);

//     vnp_Params["vnp_SecureHash"] = signed;

//     // ✅ TẠO PAYMENT URL
//     const queryParams = Object.keys(vnp_Params)
//       .map((key) => `${key}=${encodeURIComponent(vnp_Params[key])}`)
//       .join("&");

//     // ✅ TẠO PAYMENT URL (SỬ DỤNG querystring.stringify)
//     const paymentUrl =
//       vnpayConfig.vnp_Url +
//       "?" +
//       Object.keys(vnp_Params)
//         .map((key) => {
//           const value = vnp_Params[key];
//           return `${key}=${encodeURIComponent(value)}`;
//         })
//         .join("&");

//     console.log("\n--- Payment URL ---");
//     console.log("Full URL length:", paymentUrl.length);
//     console.log("Full URL:", paymentUrl); // In toàn bộ URL để check

//     console.log("\n--- Payment URL ---");
//     console.log("Full URL length:", paymentUrl.length);
//     console.log("URL preview:", paymentUrl.substring(0, 150) + "...");

//     // ✅ LƯU VNPAY TXNREF VÀO ORDER
//     order.paymentInfo = {
//       ...order.paymentInfo,
//       vnpayTxnRef: orderId_vnp,
//       vnpayCreatedAt: new Date(),
//     };
//     await order.save();

//     console.log("\n--- Saved to Order ---");
//     console.log("Order ID:", order._id);
//     console.log("vnpayTxnRef:", orderId_vnp);
//     console.log("paymentInfo:", JSON.stringify(order.paymentInfo, null, 2));

//     console.log("\n✅ Payment URL created successfully\n");

//     res.json({
//       success: true,
//       data: { paymentUrl },
//     });
//   } catch (error) {
//     console.error("\n❌ CREATE PAYMENT URL ERROR:");
//     console.error("Message:", error.message);
//     console.error("Stack:", error.stack);

//     res.status(500).json({
//       success: false,
//       message: error.message || "Lỗi khi tạo link thanh toán",
//     });
//   }
// };

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

    const orderId_vnp = `${order._id}_${moment().format("YYYYMMDDHHmmss")}`;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const paymentUrl = await vnpay.buildPaymentUrl({
      vnp_Amount: amount, // ← Raw amount (library auto *100)
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: orderId_vnp,
      vnp_OrderInfo:
        orderDescription || `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: "other",
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_Locale: language || "vn",
      vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
      vnp_ExpireDate: moment(tomorrow).format("YYYYMMDDHHmmss"),
      ...(bankCode && { vnp_BankCode: bankCode }),
    });

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
// IPN URL - Sử dụng kiểm tra của package
// ============================================
export const vnpayIPN = async (req, res) => {
  console.log("\n=== VNPAY IPN RECEIVED ===");
  console.log("Query params:", JSON.stringify(req.query, null, 2));

  try {
    const verify = vnpay.verifyIpnCall(req.query);

    console.log("\n--- Kết quả kiểm tra ---");
    console.log("isVerified:", verify.isVerified);
    console.log("isSuccess:", verify.isSuccess);
    console.log("message:", verify.message);

    if (!verify.isVerified) {
      console.error("❌ Chữ ký không hợp lệ");
      return res.json(IpnFailChecksum);  // Phản hồi cho VNPay
    }

    const orderId = verify.vnp_TxnRef;  // Từ params đã kiểm tra
    const rspCode = verify.vnp_ResponseCode;
    const amount = verify.vnp_Amount;  // Đã điều chỉnh bởi thư viện (chia 100)

    // Tìm và kiểm tra order (giống trước)
    const order = await Order.findOne({
      $or: [
        { "paymentInfo.vnpayTxnRef": orderId },
        { _id: orderId.split("_")[0] },
      ],
    });

    if (!order) {
      console.error("❌ Không tìm thấy order");
      return res.json(IpnOrderNotFound);
    }

    if (amount !== order.totalAmount) {
      console.error("❌ Amount không khớp");
      return res.json(IpnInvalidAmount);
    }

    if (rspCode === "00" && verify.isSuccess) {
      // Cập nhật order thành PAID/CONFIRMED (giống trước)
      order.paymentStatus = "PAID";
      order.paymentInfo = {
        ...order.paymentInfo,
        vnpayTransactionNo: verify.vnp_TransactionNo,
        vnpayBankCode: verify.vnp_BankCode,
        vnpayCardType: verify.vnp_CardType,
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
      return res.json(IpnSuccess);  // Xác nhận cho VNPay
    } else {
      // Xử lý thất bại
      order.paymentInfo = {
        ...order.paymentInfo,
        vnpayFailed: true,
        vnpayFailReason: rspCode,
      };
      await order.save();
      return res.json(IpnSuccess);  // Vẫn "Success" cho VNPay theo spec (ngăn retry), nhưng log thất bại
    }
  } catch (error) {
    console.error("❌ LỖI VNPAY IPN:", error);
    return res.json(IpnUnknownError);
  }
};

// ============================================
// RETURN URL - Sử dụng kiểm tra của package
// ============================================
export const vnpayReturn = async (req, res) => {
  console.log("\n=== VNPAY RETURN URL ===");
  console.log("Query params:", JSON.stringify(req.query, null, 2));

  try {
    const verify = vnpay.verifyReturnUrl(req.query);

    console.log("\n--- Kết quả kiểm tra ---");
    console.log("isVerified:", verify.isVerified);
    console.log("isSuccess:", verify.isSuccess);
    console.log("message:", verify.message);

    if (!verify.isVerified) {
      console.error("❌ Chữ ký không hợp lệ");
      return res.json({
        success: false,
        message: "Chữ ký không hợp lệ",
      });
    }

    const orderId = verify.vnp_TxnRef;
    const rspCode = verify.vnp_ResponseCode;

    // Tùy chọn: Tìm order và cập nhật nếu cần (nhưng IPN xử lý chính)
    const order = await Order.findOne({ "paymentInfo.vnpayTxnRef": orderId });

    res.json({
      success: verify.isSuccess,
      code: rspCode,
      message: verify.isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại",
      orderId: order?._id,
      orderNumber: order?.orderNumber,
    });
  } catch (error) {
    console.error("❌ LỖI VNPAY RETURN:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};