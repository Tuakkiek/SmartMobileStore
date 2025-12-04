// frontend/src/pages/RegisterPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { UserPlus, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { provinces } from "@/province";
const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    province: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  // Password validation checks
  const passwordChecks = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
  };
  const allPasswordChecksPassed = Object.values(passwordChecks).every(Boolean);
  // Validate phone number
  const validatePhoneNumber = (phone) => {
    if (!phone) return "Vui lòng nhập số điện thoại";
    if (!/^0\d{9}$/.test(phone)) {
      return "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0";
    }
    return "";
  };
  // Validate email
  const validateEmail = (email) => {
    if (!email) return ""; // Email is optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Email không hợp lệ. Email phải có dạng: example@domain.com";
    }
    return "";
  };
  // Validate password
  const validatePassword = (password) => {
    if (!password) return "Vui lòng nhập mật khẩu";
    if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
    if (!allPasswordChecksPassed) {
      return "Mật khẩu phải bao gồm chữ thường, chữ hoa, số và ký tự đặc biệt";
    }
    return "";
  };
  const handleChange = (e) => {
    clearError();
    setLocalError("");
    const { name, value } = e.target;

    // Chỉ cho phép nhập số vào trường phoneNumber
    if (name === "phoneNumber" && !/^\d*$/.test(value)) {
      return; // Không cập nhật nếu giá trị chứa ký tự không phải số
    }

    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear field error when user types
    setFieldErrors({
      ...fieldErrors,
      [name]: "",
    });
  };
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = "";
    switch (name) {
      case "phoneNumber":
        error = validatePhoneNumber(value);
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "password":
        error = validatePassword(value);
        break;
      case "confirmPassword":
        if (value && value !== formData.password) {
          error = "Mật khẩu xác nhận không khớp";
        }
        break;
      default:
        break;
    }
    setFieldErrors({
      ...fieldErrors,
      [name]: error,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate all fields
    const errors = {};
    if (!formData.fullName || formData.fullName.length < 2) {
      errors.fullName = "Họ tên phải có ít nhất 2 ký tự";
    }
    errors.phoneNumber = validatePhoneNumber(formData.phoneNumber);
    errors.email = validateEmail(formData.email);
    errors.password = validatePassword(formData.password);
    if (!formData.province) {
      errors.province = "Vui lòng chọn tỉnh/thành phố";
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    // Remove empty errors
    Object.keys(errors).forEach((key) => {
      if (!errors[key]) delete errors[key];
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLocalError("Vui lòng kiểm tra lại thông tin");
      return;
    }
    // Remove confirmPassword before sending
    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);
    if (result.success) {
      navigate("/login");
    }
  };
  const CheckItem = ({ checked, label }) => (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-300" />
      )}
      <span className={checked ? "text-green-600" : "text-gray-500"}>
        {label}
      </span>
    </div>
  );
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-xl mx-auto">
        <Card className="border-4">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Đăng ký</CardTitle>
            <CardDescription className="text-center">
              Tạo tài khoản mới để mua sắm
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {(error || localError) && (
                <ErrorMessage message={error || localError} />
              )}
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldErrors.fullName ? "border-red-500" : ""}
                  required
                />
                {fieldErrors.fullName && (
                  <p className="text-sm text-red-500">{fieldErrors.fullName}</p>
                )}
              </div>
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Số điện thoại <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="0123456789"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldErrors.phoneNumber ? "border-red-500" : ""}
                  maxLength={10}
                  required
                />
                {fieldErrors.phoneNumber && (
                  <p className="text-sm text-red-500">
                    {fieldErrors.phoneNumber}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0
                </p>
                <p className="text-xs text-gray-400">
                  Ví dụ: 0901234567, 0812345678
                </p>
              </div>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email (tùy chọn)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldErrors.email ? "border-red-500" : ""}
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-500">{fieldErrors.email}</p>
                )}
                <p className="text-xs text-gray-400">
                  Email phải có dạng: example@domain.com
                </p>
              </div>
              {/* Province */}
              <div className="space-y-2">
                <Label htmlFor="province">
                  Tỉnh/Thành phố <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.province}
                  onValueChange={(value) =>
                    handleChange({ target: { name: "province", value } })
                  }
                >
                  <SelectTrigger
                    className={`w-full ${
                      fieldErrors.province ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder="Chọn tỉnh/thành phố" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {provinces.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.province && (
                  <p className="text-sm text-red-500">{fieldErrors.province}</p>
                )}
              </div>
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`pr-10 ${
                      fieldErrors.password ? "border-red-500" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {/* Password Requirements */}
                {formData.password && (
                  <div className="space-y-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium mb-2">
                      Yêu cầu mật khẩu:
                    </p>
                    <CheckItem
                      checked={passwordChecks.length}
                      label="Ít nhất 8 ký tự"
                    />
                    <CheckItem
                      checked={passwordChecks.lowercase}
                      label="Có chữ thường (a-z)"
                    />
                    <CheckItem
                      checked={passwordChecks.uppercase}
                      label="Có chữ hoa (A-Z)"
                    />
                    <CheckItem
                      checked={passwordChecks.number}
                      label="Có số (0-9)"
                    />
                    <CheckItem
                      checked={passwordChecks.special}
                      label="Có ký tự đặc biệt (!@#$%...)"
                    />
                  </div>
                )}
              </div>
              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`pr-10 ${
                      fieldErrors.confirmPassword ? "border-red-500" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !allPasswordChecksPassed}
              >
                {isLoading ? "Đang đăng ký..." : "Đăng ký"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Đăng nhập
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
export default RegisterPage;
