// backend/src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  province: {
    type: String,
    required: true,
    trim: true,
  },
  ward: {
    type: String,
    required: true,
    trim: true,
  },
  detailAddress: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    // ✅ THÊM POS_STAFF VÀ CASHIER
    role: {
      type: String,
      enum: [
        "USER",
        "CUSTOMER",
        "WAREHOUSE_STAFF",
        "ORDER_MANAGER",
        "SHIPPER",
        "POS_STAFF", // ✅ NHÂN VIÊN BÁN HÀNG TRỰC TIẾP
        "CASHIER", // ✅ Thu ngân
        "ADMIN",
      ],
      default: "USER",
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      sparse: true,
      lowercase: true,
    },
    province: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "LOCKED"],
      default: "ACTIVE",
    },
    addresses: [addressSchema],

    avatar: {
      type: String,
      default: null,
      trim: true,
    },

    // ✅ THÊM: Thông tin nhân viên POS
    storeLocation: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);
