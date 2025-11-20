import crypto from "crypto";
import querystring from "querystring";
import moment from "moment";
import { vnpayConfig } from "../config/vnpay.js";
import Order from "../models/Order.js";
import { vnpay } from "../server.js";
import moment from "moment";

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
      vnp_Amount: amount,
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
// IPN URL - WITH DEBUG LOGS
// ============================================
export const vnpayIPN = async (req, res) => {
  console.log("\n=== VNPAY IPN RECEIVED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Query params:", JSON.stringify(req.query, null, 2));
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];

    console.log("\n--- Received SecureHash ---");
    console.log(secureHash);

    // ✅ XÓA SECURE HASH KHỎI PARAMS
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    // ✅ SẮP XẾP PARAMS
    vnp_Params = sortObject(vnp_Params);

    console.log("\n--- Sorted Params ---");
    console.log(JSON.stringify(vnp_Params, null, 2));

    // ✅ TẠO SIGN DATA
    const signData = Object.keys(vnp_Params)
      .map((key) => `${key}=${vnp_Params[key]}`)
      .join("&");

    console.log("\n--- Sign Data (for hash) ---");
    console.log(signData);

    // ✅ TẠO HASH
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("\n--- Hash Verification ---");
    console.log("Expected hash:", signed);
    console.log("Received hash:", secureHash);
    console.log("Match:", secureHash === signed ? "✅ YES" : "❌ NO");

    if (secureHash === signed) {
      const orderId = vnp_Params["vnp_TxnRef"];
      const rspCode = vnp_Params["vnp_ResponseCode"];
      const amount = vnp_Params["vnp_Amount"] / 100;

      console.log("\n--- Payment Info ---");
      console.log("vnp_TxnRef:", orderId);
      console.log("vnp_ResponseCode:", rspCode);
      console.log("vnp_Amount:", amount);
      console.log("vnp_TransactionNo:", vnp_Params["vnp_TransactionNo"]);
      console.log("vnp_BankCode:", vnp_Params["vnp_BankCode"]);

      // ✅ TÌM ORDER
      const order = await Order.findOne({
        $or: [
          { "paymentInfo.vnpayTxnRef": orderId },
          { _id: orderId.split("_")[0] }, // Tìm bằng orderId nếu có format orderId_timestamp
        ],
      });

      if (!order) {
        console.error("❌ Order not found with vnpayTxnRef:", orderId);
        return res.status(200).json({
          RspCode: "01",
          Message: "Order not found",
        });
      }

      console.log("\n--- Order Found ---");
      console.log("Order ID:", order._id);
      console.log("Order Number:", order.orderNumber);
      console.log("Order Amount:", order.totalAmount);
      console.log("Current Status:", order.status);
      console.log("Payment Status:", order.paymentStatus);

      // ✅ KIỂM TRA AMOUNT
      if (amount !== order.totalAmount) {
        console.error("❌ Amount mismatch!");
        console.error("VNPay amount:", amount);
        console.error("Order amount:", order.totalAmount);
        return res.status(200).json({
          RspCode: "04",
          Message: "Invalid amount",
        });
      }

      // ✅ XỬ LÝ THEO RESPONSE CODE
      if (rspCode === "00") {
        console.log("\n✅ Payment SUCCESS");

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
        console.log("New status:", order.status);
        console.log("Payment status:", order.paymentStatus);

        return res.status(200).json({
          RspCode: "00",
          Message: "Success",
        });
      } else {
        console.log("\n❌ Payment FAILED - Code:", rspCode);

        order.paymentInfo = {
          ...order.paymentInfo,
          vnpayFailed: true,
          vnpayFailReason: rspCode,
        };
        await order.save();

        return res.status(200).json({
          RspCode: "00",
          Message: "Success",
        });
      }
    } else {
      console.error("\n❌ INVALID SIGNATURE");
      return res.status(200).json({
        RspCode: "97",
        Message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("\n❌ VNPAY IPN ERROR:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return res.status(200).json({
      RspCode: "99",
      Message: "Unknown error",
    });
  }
};

// ============================================
// RETURN URL - WITH DEBUG LOGS
// ============================================
export const vnpayReturn = async (req, res) => {
  console.log("\n=== VNPAY RETURN URL ===");
  console.log("Query params:", JSON.stringify(req.query, null, 2));

  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("\n--- Hash Verification ---");
    console.log("Expected:", signed);
    console.log("Received:", secureHash);
    console.log("Match:", secureHash === signed ? "✅ YES" : "❌ NO");

    if (secureHash === signed) {
      const orderId = vnp_Params["vnp_TxnRef"];
      const rspCode = vnp_Params["vnp_ResponseCode"];

      console.log("\n--- Return Info ---");
      console.log("vnp_TxnRef:", orderId);
      console.log("vnp_ResponseCode:", rspCode);

      // Tìm order
      const order = await Order.findOne({ "paymentInfo.vnpayTxnRef": orderId });

      if (order) {
        console.log("Order found:", order._id);
        console.log("Order Number:", order.orderNumber);
      } else {
        console.warn("Order not found");
      }

      res.json({
        success: true,
        code: rspCode,
        message:
          rspCode === "00" ? "Thanh toán thành công" : "Thanh toán thất bại",
        orderId: order?._id,
        orderNumber: order?.orderNumber,
      });
    } else {
      console.error("Invalid signature");
      res.json({
        success: false,
        message: "Chữ ký không hợp lệ",
      });
    }
  } catch (error) {
    console.error("\n❌ VNPAY RETURN ERROR:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
