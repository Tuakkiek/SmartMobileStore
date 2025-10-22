// backend/src/server.js
import { connectDB } from './config/db.js'; // Import connectDB từ db.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/config.js'; // Đảm bảo import đúng file config.js
import path from 'path';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';

import iPhoneRoutes from './routes/iPhoneRoutes.js';
import iPadRoutes from './routes/iPadRoutes.js';
import macRoutes from './routes/macRoutes.js';
import airPodsRoutes from './routes/airPodsRoutes.js';
import appleWatchRoutes from './routes/appleWatchRoutes.js';
import accessoryRoutes from './routes/accessoryRoutes.js';


import dotenv from 'dotenv';
dotenv.config();

// Khởi tạo ứng dụng Express
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Đồng bộ với frontend Vite (port 5173)
  credentials: true, // Cho phép gửi cookie/credentials
}));
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Serve static files (nếu có, ví dụ: uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Kết nối MongoDB
connectDB()
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/promotions', promotionRoutes);

app.use('/api/iphones', iPhoneRoutes);
app.use('/api/ipads', iPadRoutes);
app.use('/api/macs', macRoutes);
app.use('/api/airpods', airPodsRoutes);
app.use('/api/applewatches', appleWatchRoutes);
app.use('/api/accessories', accessoryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start server
const PORT = config.port || 5000;
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${config.nodeEnv}`);
    console.log(`⏰ Current time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  });
};

// Xử lý sự cố kết nối MongoDB và khởi động server
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Thoát nếu không kết nối được
});

mongoose.connection.once('open', startServer);

export default app; // Xuất app để dùng trong test hoặc module khác nếu cần