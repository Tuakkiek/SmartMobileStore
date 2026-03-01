import User from "./User.js";
import { deriveAuthzWriteFromLegacyInput } from "../../authz/userAccessResolver.js";
import mongoose from "mongoose";
import Store from "../store/Store.js";

const BRANCH_REQUIRED_EMPLOYEE_ROLES = new Set([
  "ADMIN",
  "BRANCH_ADMIN",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_STAFF",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "POS_STAFF",
  "CASHIER",
  "SHIPPER",
]);

const normalizeText = (value) => String(value || "").trim();

const roleRequiresStoreLocation = (role) =>
  BRANCH_REQUIRED_EMPLOYEE_ROLES.has(String(role || "").trim().toUpperCase());

const resolveHoChiMinhStoreId = async () => {
  const hcmRegex = /ho\s*chi\s*minh|tp\.?\s*hcm|sai\s*gon|^hcm$/i;
  const filter = {
    $or: [
      { code: /HCM/i },
      { name: hcmRegex },
      { "address.province": hcmRegex },
    ],
  };

  let store = await Store.findOne({ ...filter, status: "ACTIVE" })
    .select("_id")
    .lean();
  if (!store) {
    store = await Store.findOne(filter).select("_id").lean();
  }
  return normalizeText(store?._id);
};

const resolveEmployeeStoreLocation = async ({ role, storeLocation }) => {
  const normalizedRole = normalizeText(role).toUpperCase();
  const normalizedStoreLocation = normalizeText(storeLocation);

  if (normalizedStoreLocation) {
    return normalizedStoreLocation;
  }

  if (!roleRequiresStoreLocation(normalizedRole)) {
    return "";
  }

  const hoChiMinhStoreId = await resolveHoChiMinhStoreId();
  if (!hoChiMinhStoreId) {
    throw new Error("Khong tim thay chi nhanh Ho Chi Minh de gan mac dinh");
  }

  return hoChiMinhStoreId;
};

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
// GET /api/users/employees - Lấy danh sách nhân viên (có phân trang + tìm kiếm + sắp xếp)
export const getAllEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      storeLocation = "", // ✅ Filter by store
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // giới hạn tối đa 100

    // Điều kiện lọc
    const filter = {
      role: {
        $in: [
          "WAREHOUSE_MANAGER",
          "PRODUCT_MANAGER",
          "ORDER_MANAGER",
          "SHIPPER",
          "ADMIN",
          "POS_STAFF",
          "CASHIER",
        ],
      },
    };

    // Tìm kiếm theo tên hoặc email hoặc số điện thoại
    if (search.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { phoneNumber: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Lọc theo role cụ thể (nếu có truyền)
    if (role && role !== "ALL") {
      if (role.includes(',')) {
        filter.role = { $in: role.split(',') };
      } else {
        filter.role = role;
      }
    }

    // ── KILL-SWITCH: Use req.authz.activeBranchId ──
    if (!req.authz?.isGlobalAdmin) {
      if (req.authz?.activeBranchId) {
        filter.storeLocation = req.authz.activeBranchId;
      } else {
         return res.json({
          success: true,
          data: { employees: [], pagination: { currentPage: 1, totalPages: 0, total: 0, limit: limitNum } },
        });
      }
    } else {
      // Global Admin can filter by store
      if (storeLocation && storeLocation !== "ALL") {
        filter.storeLocation = storeLocation;
      }
    }

    // Sắp xếp
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Query với phân trang
    const employees = await User.find(filter)
      .select("-password -__v")
      .sort(sort)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    // Đếm tổng số để trả về phân trang
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
// Tạo nhân viên mới
export const createEmployee = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role, avatar, storeLocation } =
      req.body;
    const legacyRole = String(role || "").trim().toUpperCase();
    const effectiveStoreLocation = await resolveEmployeeStoreLocation({
      role: legacyRole,
      storeLocation,
    });
    const authzWrite = deriveAuthzWriteFromLegacyInput({
      role: legacyRole,
      storeLocation: effectiveStoreLocation,
      assignedBy: req.user?._id,
    });

    const user = await User.create({
      fullName,
      phoneNumber,
      email,
      province,
      password,
      role: legacyRole,
      avatar: avatar || "",
      systemRoles: authzWrite.systemRoles,
      taskRoles: authzWrite.taskRoles,
      branchAssignments: authzWrite.branchAssignments,
      authzState: authzWrite.authzState,
      authzVersion: 2,
      permissionsVersion: 1,
      storeLocation: effectiveStoreLocation,
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

export const updateEmployeeAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role, avatar, storeLocation } =
      req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    const nextRole = role ? String(role).trim().toUpperCase() : user.role;
    const requestedStoreLocation =
      storeLocation !== undefined ? storeLocation : user.storeLocation;
    const nextStoreLocation = await resolveEmployeeStoreLocation({
      role: nextRole,
      storeLocation: requestedStoreLocation,
    });
    const authzWrite = deriveAuthzWriteFromLegacyInput({
      role: nextRole,
      storeLocation: nextStoreLocation,
      assignedBy: req.user?._id,
    });

    const roleOrScopeChanged =
      String(user.role || "") !== String(nextRole || "") ||
      String(user.storeLocation || "") !== String(nextStoreLocation || "");

    // Cap nhat thong tin
    user.fullName = fullName || user.fullName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    user.province = province || user.province;
    user.role = nextRole;
    user.avatar = avatar !== undefined ? avatar : user.avatar;
    user.storeLocation = nextStoreLocation;
    user.systemRoles = authzWrite.systemRoles;
    user.taskRoles = authzWrite.taskRoles;
    user.branchAssignments = authzWrite.branchAssignments;
    user.authzState = authzWrite.authzState;
    user.authzVersion = 2;

    if (roleOrScopeChanged) {
      user.permissionsVersion = Number(user.permissionsVersion || 1) + 1;
    }

    // Chỉ cập nhật password nếu được cung cấp
    if (password && password.trim()) {
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllShippers = async (req, res) => {
  try {
    const filter = {
      role: "SHIPPER",
      status: "ACTIVE",
    };

    const isGlobalAdmin = Boolean(req.authz?.isGlobalAdmin || req.user?.role === "GLOBAL_ADMIN");

    if (!isGlobalAdmin) {
      const activeBranchId = String(req.authz?.activeBranchId || "").trim();
      if (!activeBranchId) {
        return res.json({
          success: true,
          data: { shippers: [] },
        });
      }

      const branchFilters = [{ storeLocation: activeBranchId }];
      if (mongoose.Types.ObjectId.isValid(activeBranchId)) {
        branchFilters.push({
          branchAssignments: {
            $elemMatch: {
              storeId: new mongoose.Types.ObjectId(activeBranchId),
              status: "ACTIVE",
            },
          },
        });
      }

      filter.$or = branchFilters;
    }

    const shippers = await User.find(filter)
      .select("_id fullName phoneNumber email")
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: { shippers },
    });
  } catch (error) {
    console.error("Get all shippers error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};



