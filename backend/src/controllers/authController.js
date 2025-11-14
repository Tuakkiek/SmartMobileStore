// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { signToken } from "../middleware/authMiddleware.js";

// Đăng ký
export const register = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role } = req.body;

    // Kiểm tra số điện thoại đã tồn tại
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại đã được sử dụng",
      });
    }

    // Tạo user mới
    const user = await User.create({
      fullName,
      phoneNumber,
      email,
      province,
      password,
      role: role || "CUSTOMER",
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Đăng nhập
export const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Tìm user (cần select password vì schema ẩn nó)
    const user = await User.findOne({ phoneNumber }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Cho phép tất cả role đăng nhập
    const allowedRoles = [
      "CUSTOMER",
      "WAREHOUSE_STAFF",
      "ORDER_MANAGER",
      "SHIPPER",
      "POS_STAFF",
      "ACCOUNTANT",
      "ADMIN",
    ];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản không hợp lệ",
      });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.status === "LOCKED") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    // So sánh mật khẩu
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Tạo JWT token
    const token = signToken(user._id);

    // Xóa password khỏi response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// Đăng xuất
export const logout = async (req, res) => {
  try {
    // Với JWT, client sẽ tự xóa token
    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi đăng xuất",
    });
  }
};

// Lấy thông tin user hiện tại
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Đổi mật khẩu
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Lấy user với password
    const user = await User.findById(req.user._id).select("+password");

    // Kiểm tra mật khẩu cũ
    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
