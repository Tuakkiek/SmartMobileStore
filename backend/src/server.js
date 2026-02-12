import "dotenv/config"; // ✅ Load env vars BEFORE other imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { connectDB } from "./config/db.js";
import config from "./config/config.js";
import fs from "fs";

// ================================
// 🔹 Import tất cả routes
// ================================
import authRoutes from "./modules/auth/authRoutes.js";
import userRoutes from "./modules/auth/userRoutes.js";
import cartRoutes from "./modules/cart/cartRoutes.js";
import orderRoutes from "./modules/order/orderRoutes.js";
import reviewRoutes from "./modules/review/reviewRoutes.js";
import promotionRoutes from "./modules/promotion/promotionRoutes.js";

import iPhoneRoutes from "./modules/product/iPhoneRoutes.js";
import iPadRoutes from "./modules/product/iPadRoutes.js";
import macRoutes from "./modules/product/macRoutes.js";
import airPodsRoutes from "./modules/product/airPodsRoutes.js";
import appleWatchRoutes from "./modules/product/appleWatchRoutes.js";
import accessoryRoutes from "./modules/product/accessoryRoutes.js";
import recommendationRoutes from "./modules/search/recommendationRoutes.js";
import analyticsRoutes from "./modules/analytics/analyticsRoutes.js";
import salesRoutes from "./modules/analytics/salesRoutes.js";
import posRoutes from "./modules/order/posRoutes.js";
import homePageRoutes from "./modules/content/homePageRoutes.js";
import vnpayRoutes from "./modules/payment/vnpayRoutes.js";
import { cancelExpiredVNPayOrders } from "./modules/order/orderCleanupService.js";
import searchRoutes from "./modules/search/searchRoutes.js";
import shortVideoRoutes from "./modules/content/shortVideoRoutes.js";
import brandRoutes from "./modules/brand/brandRoutes.js";
import productTypeRoutes from "./modules/productType/productTypeRoutes.js";
import universalProductRoutes from "./modules/product/universalProductRoutes.js";
import warehouseRoutes from "./modules/warehouse/warehouseRoutes.js";



// ================================
// 🔹 Khởi tạo Express App
// ================================
const app = express();

const __dirname = path.resolve();

// ================================
// 🔹 TẠO THỨ MỤC UPLOADS NẾU CHƯA TỒN TẠI
// ================================
const createUploadDirs = () => {
  const uploadDirs = [
    "uploads/banners",
    "uploads/products",
    "uploads/avatars",
    "uploads/reviews",
    "uploads/videos",
    "uploads/thumbnails",
  ];

  uploadDirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Gọi hàm tạo thư mục
createUploadDirs();

// ================================
// 🔹 Middleware
// ================================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "https://ninhkieu-istore-ct.onrender.com",
      "https://sandbox.vnpayment.vn",
      "https://vnpayment.vn",
    ],
    credentials: true,
  })
);

// ✅ TĂNG GIỚI HẠN CHO VIDEO UPLOAD
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

// ================================
// 🔹 Serve Static Files
// ================================

// ✅ QUAN TRỌNG: Serve uploads folder (videos, thumbnails, images, etc.)
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
console.log("📁 Uploads directory:", uploadsPath);

// Serve backend public folder
const backendPublicPath = path.join(process.cwd(), "public");
if (fs.existsSync(backendPublicPath)) {
  app.use(express.static(backendPublicPath));
  console.log("📁 Backend public:", backendPublicPath);
}

// Serve frontend public folder (cho dev)
if (process.env.NODE_ENV !== "production") {
  const frontendPublicPath = path.join(process.cwd(), "../frontend/public");
  if (fs.existsSync(frontendPublicPath)) {
    app.use(express.static(frontendPublicPath));
    console.log("📁 Frontend public:", frontendPublicPath);
  }
}

// ================================
// 🔹 Kết nối MongoDB
// ================================
connectDB()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Kiểm tra VNPay config
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

// ✅ Replaced productRoutes with recommendationRoutes for 'related products' feature
app.use("/api/products", recommendationRoutes);
app.use("/api/iphones", iPhoneRoutes);
app.use("/api/ipads", iPadRoutes);
app.use("/api/macs", macRoutes);
app.use("/api/airpods", airPodsRoutes);
app.use("/api/applewatches", appleWatchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/accessories", accessoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/pos", posRoutes);

app.use("/api/payment/vnpay", vnpayRoutes);

app.use("/api/homepage", homePageRoutes);
app.use("/api/search", searchRoutes);

// ✅ SHORT VIDEOS ROUTE
app.use("/api/short-videos", shortVideoRoutes);

// ✅ MULTI-BRAND MULTI-CATEGORY ROUTES
app.use("/api/brands", brandRoutes);
app.use("/api/product-types", productTypeRoutes);
app.use("/api/universal-products", universalProductRoutes);

// ✅ WAREHOUSE MANAGEMENT ROUTES
app.use("/api/warehouse", warehouseRoutes);

// ================================
// 🔹 Health Check Endpoint
// ================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uploads: {
      path: uploadsPath,
      exists: fs.existsSync(uploadsPath),
    },
  });
});

// ================================
// 🔹 Error Handling Middleware
// ================================
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);

  // Xử lý lỗi Multer (file upload)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn. Video tối đa 100MB, ảnh tối đa 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ✅ Cleanup expired VNPay orders
setInterval(async () => {
  await cancelExpiredVNPayOrders();
}, 5 * 60 * 1000);

// ================================
// 🔹 Production: Serve static files & SPA
// ================================
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(process.cwd(), "../frontend/dist");

  console.log("📁 Current working directory:", process.cwd());
  console.log("📁 Frontend path:", frontendPath);

  // Serve static files (CSS, JS, images, etc.)
  app.use(express.static(frontendPath));

  // SPA fallback - catch all non-API routes
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      res.sendFile(path.join(frontendPath, "index.html"), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send("Error loading page");
        }
      });
    } else {
      next();
    }
  });
} else {
  // Development 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.path,
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
// 🔹 Khởi động server
// ================================
const PORT = config.port || process.env.PORT || 5000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${config.nodeEnv}`);
    console.log(`📊 Analytics API: http://localhost:${PORT}/api/analytics`);
    console.log(`🛒 POS API: http://localhost:${PORT}/api/pos`);
    console.log(
      `🎬 Short Videos API: http://localhost:${PORT}/api/short-videos`
    );
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
    console.log(
      `⏰ Current time: ${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
      })}`
    );
  });
};

mongoose.connection.once("open", startServer);

export default app;
