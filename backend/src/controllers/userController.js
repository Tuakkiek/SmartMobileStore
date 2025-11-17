import User from "../models/User.js";

// Cập nhật thông tin người dùng
export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, province } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, email, province },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Thêm địa chỉ mới cho người dùng
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Nếu địa chỉ mới được chọn là mặc định, set tất cả các địa chỉ khác là không mặc định
    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(req.body);
    await user.save();

    res.json({
      success: true,
      message: "Thêm địa chỉ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Cập nhật địa chỉ cho người dùng
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy địa chỉ" });
    }

    // Nếu địa chỉ mới được chọn là mặc định, set tất cả các địa chỉ khác là không mặc định
    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Cập nhật địa chỉ
    Object.assign(address, req.body);
    await user.save();

    res.json({
      success: true,
      message: "Cập nhật địa chỉ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa địa chỉ của người dùng
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.addressId);
    await user.save();

    res.json({
      success: true,
      message: "Xóa địa chỉ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy tất cả nhân viên
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({
      role: {
        $in: [
          "WAREHOUSE_STAFF",
          "ORDER_MANAGER",
          "SHIPPER",
          "ADMIN",
          "POS_STAFF",
          "CASHIER",
        ],
      },
    }).select("-password");

    res.json({ success: true, data: { employees } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Tạo nhân viên mới
export const createEmployee = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role } = req.body;
    const user = await User.create({
      fullName,
      phoneNumber,
      email,
      province,
      password,
      role,
    });

    res.status(201).json({
      success: true,
      message: "Tạo nhân viên thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Thay đổi trạng thái nhân viên (kích hoạt hoặc khóa)
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    // Chuyển đổi trạng thái giữa ACTIVE và LOCKED
    user.status = user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await user.save();

    res.json({
      success: true,
      message: `${
        user.status === "LOCKED" ? "Khóa" : "Mở khóa"
      } nhân viên thành công`,
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa nhân viên
export const deleteEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    res.json({ success: true, message: "Xóa nhân viên thành công" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
