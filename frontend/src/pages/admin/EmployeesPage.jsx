import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { UserPlus, Lock, Unlock, Trash2, X } from "lucide-react";
import { userAPI } from "@/lib/api";
import { getStatusColor, getStatusText } from "@/lib/utils";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    province: "",
    password: "",
    role: "WAREHOUSE_STAFF",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAllEmployees();
      const data = Array.isArray(response.data.data.employees)
        ? response.data.data.employees
        : [];
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError(
        error.response?.data?.message || "Lấy danh sách nhân viên thất bại"
      );
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await userAPI.createEmployee(formData);
      await fetchEmployees();
      setShowForm(false);
      setFormData({
        fullName: "",
        phoneNumber: "",
        email: "",
        province: "",
        password: "",
        role: "WAREHOUSE_STAFF",
      });
    } catch (error) {
      setError(error.response?.data?.message || "Tạo nhân viên thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (employeeId) => {
    try {
      await userAPI.toggleEmployeeStatus(employeeId);
      await fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDelete = async (employeeId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) return;

    try {
      await userAPI.deleteEmployee(employeeId);
      await fetchEmployees();
    } catch (error) {
      alert(error.response?.data?.message || "Xóa nhân viên thất bại");
    }
  };

  // ✅ THÊM HÀM LẤY TÊN VAI TRÒ TIẾNG VIỆT
  const getRoleLabel = (role) => {
    const roleMap = {
      WAREHOUSE_STAFF: "Nhân viên kho",
      ORDER_MANAGER: "Quản lý đơn hàng",
      SHIPPER: "Nhân viên giao hàng",
      ADMIN: "Quản trị viên",
    };
    return roleMap[role] || role;
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý nhân viên</h1>
          <p className="text-muted-foreground">
            Quản lý tài khoản nhân viên trong hệ thống
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Hủy
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Thêm nhân viên
            </>
          )}
        </Button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Thêm nhân viên mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorMessage message={error} />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Số điện thoại *</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Tỉnh/Thành phố</Label>
                  <Input
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Vai trò *</Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="WAREHOUSE_STAFF">Nhân viên kho</option>
                    <option value="ORDER_MANAGER">Quản lý đơn hàng</option>
                    <option value="SHIPPER">Nhân viên giao hàng</option>
                    <option value="POS_STAFF">Nhân viên bán hàng</option>
                    <option value="ACCOUNTANT">Kế toán</option> 
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo..." : "Tạo nhân viên"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Employees List */}
      {error && <ErrorMessage message={error} />}
      {employees.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Không có nhân viên nào.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => (
            <Card key={employee._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {employee.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {employee.phoneNumber}
                    </p>
                    {/* ✅ SỬ DỤNG HÀM getRoleLabel */}
                    <Badge variant="outline">
                      {getRoleLabel(employee.role)}
                    </Badge>
                  </div>
                  <Badge className={getStatusColor(employee.status)}>
                    {getStatusText(employee.status)}
                  </Badge>
                </div>

                {employee.email && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {employee.email}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(employee._id)}
                  >
                    {employee.status === "ACTIVE" ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Khóa
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Mở khóa
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(employee._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
