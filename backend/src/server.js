import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
// import { VNPay } from "vnpay";
import path from "path";
import { connectDB } from "./config/db.js";
import config from "./config/config.js";

// ================================
// 🔹 Import tất cả routes
// ================================
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";

import iPhoneRoutes from "./routes/iPhoneRoutes.js";
import iPadRoutes from "./routes/iPadRoutes.js";
import macRoutes from "./routes/macRoutes.js";
import airPodsRoutes from "./routes/airPodsRoutes.js";
import appleWatchRoutes from "./routes/appleWatchRoutes.js";
import accessoryRoutes from "./routes/accessoryRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import posRoutes from "./routes/posRoutes.js";

import vnpayRoutes from "./routes/vnpayRoutes.js";

dotenv.config();

// ================================
// 🔹 Khởi tạo Express App
// ================================
const app = express();

const __dirname = path.resolve();

// ================================
// 🔹 Middleware
// ================================
app.use(
  cors({
    origin: [
      "https://ninhkieu-istore-ct.onrender.com",
      "https://sandbox.vnpayment.vn",
      "https://vnpayment.vn",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// const vnpay = new VNPay({
//   tmnCode: process.env.VNP_TMN_CODE,
//   secureSecret: process.env.VNP_HASH_SECRET, // ← Must be secureSecret (not secretKey)
//   vnpayHost: process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn", // ← Base host only
//   hashAlgorithm: "SHA512", // Optional but good to keep
//   testMode: true, // Optional: Enables extra logging/validation in sandbox
// });

// Export vnpay instance để sử dụng trong controllers
// export { vnpay };

// Serve static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ================================
// 🔹 Kết nối MongoDB
// ================================
connectDB()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Thêm sau dòng connectDB()
if (!process.env.VNP_TMN_CODE || !process.env.VNP_HASH_SECRET) {
  console.error("❌ MISSING VNPAY CONFIGURATION");
  console.error(
    "VNP_TMN_CODE:",
    process.env.VNP_TMN_CODE ? "EXISTS" : "MISSING"
  );
  console.error(
    "VNP_HASH_SECRET:",
    process.env.VNP_HASH_SECRET ? "EXISTS" : "MISSING"
  );
}

// ================================
// 🔹 Đăng ký tất cả routes
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/promotions", promotionRoutes);

app.use("/api/iphones", iPhoneRoutes);
app.use("/api/ipads", iPadRoutes);
app.use("/api/macs", macRoutes);
app.use("/api/airpods", airPodsRoutes);
app.use("/api/applewatches", appleWatchRoutes);
app.use("/api/accessories", accessoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/pos", posRoutes);

app.use("/api/payment/vnpay", vnpayRoutes);

// ================================
// 🔹 Health Check Endpoint
// ================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ================================
// 🔹 Error Handling Middleware
// ================================
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ================================
// 🔹 Production: Serve static files & SPA
// ================================
if (process.env.NODE_ENV === "production") {
  // Dùng đường dẫn tuyệt đối từ process.cwd()
  const frontendPath = path.join(process.cwd(), "../frontend/dist");

  console.log("📁 Current working directory:", process.cwd());
  console.log("📁 Frontend path:", frontendPath);

  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });
}

// ================================
// 🔹 Xử lý sự cố kết nối MongoDB
// ================================
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// ================================
// 🔹 Khởi động server (di chuyển lên trước)
// ================================
const PORT = config.port || process.env.PORT || 5000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${config.nodeEnv}`);
    console.log(
      `📊 Analytics API available at http://localhost:${PORT}/api/analytics`
    );
    console.log(`🛒 POS API available at http://localhost:${PORT}/api/pos`); // ✅ MỚI
    console.log(
      `⏰ Current time: ${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
      })}`
    );
  });
};

mongoose.connection.once("open", startServer);

export default app;
