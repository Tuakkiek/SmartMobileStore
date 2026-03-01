import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/shared/Loading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api"; // Assuming api is available, or use axios directly
import { Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { provinces } from "@/province";
import { toast } from "sonner";

const StoreManagementPage = () => {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "STORE",
    address: {
      province: "",
      district: "",
      ward: "",
      street: "",
    },
    phone: "",
    email: "", // Added email
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const buildDeleteBlockedMessage = (payload = {}) => {
    const counts = payload?.blockerCounts || {};
    const storeName = payload?.storeName || "cửa hàng";

    const parts = [];
    const usersCount = Number(counts?.users || 0);
    const orderCount = Number(counts?.orders || 0);
    const inventoryCount = Number(counts?.inventory || 0);

    if (usersCount > 0) parts.push(`${usersCount} nhân viên`);
    if (orderCount > 0) parts.push(`${orderCount} đơn hàng`);
    if (inventoryCount > 0) parts.push(`${inventoryCount} bản ghi tồn kho`);

    if (parts.length > 0) {
      return `Không thể xóa chi nhánh "${storeName}" vì vẫn còn ${parts.join(", ")}. Vui lòng xóa dữ liệu con trước khi xóa chi nhánh.`;
    }

    return payload?.message || "Không thể xóa cửa hàng vì vẫn còn dữ liệu con.";
  };

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/stores"); // Ensure storeRoutes are mounted at /api/stores
      setStores(res.data.stores || []);
    } catch (err) {
      setError("Không thể tải danh sách cửa hàng");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStore(null);
    setFormData({
      code: "",
      name: "",
      type: "STORE",
      address: {
        province: "",
        district: "",
        ward: "",
        street: "",
      },
      phone: "",
      email: "", // Added email
      status: "ACTIVE",
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (store) => {
    setEditingStore(store);
    setFormData({
      code: store.code,
      name: store.name,
      type: store.type,
      address: {
        province: store.address?.province || "",
        district: store.address?.district || "",
        ward: store.address?.ward || "",
        street: store.address?.street || "",
      },
      phone: store.phone || "",
      email: store.email || "", // Added email
      status: store.status,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStore) {
        await api.put(`/stores/${editingStore._id}`, formData);
        toast.success("Cập nhật cửa hàng thành công");
      } else {
        await api.post("/stores", formData);
        toast.success("Tạo cửa hàng thành công");
      }
      setShowDialog(false);
      fetchStores();
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, storeName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa (vô hiệu hóa) chi nhánh "${storeName}" không?`)) return;

    try {
      const res = await api.delete(`/stores/${id}`);
      toast.success(res.data?.message || "Đã vô hiệu hóa cửa hàng thành công");
      fetchStores();
    } catch (err) {
      const payload = err?.response?.data;

      if (payload?.code === "STORE_DELETE_BLOCKED") {
        toast.error(buildDeleteBlockedMessage(payload), { duration: 8000 });
        return;
      }

      toast.error(payload?.message || "Xóa thất bại");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Cửa hàng / Chi nhánh</h1>
          <p className="text-muted-foreground">
            Quản lý danh sách các chi nhánh và kho hàng
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" /> Thêm mới
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store._id}>
                    <TableCell className="font-medium">{store.code}</TableCell>
                    <TableCell>{store.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{store.type}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col text-sm">
                            <span>{store.address?.street}, {store.address?.ward}</span>
                            <span className="text-muted-foreground">{store.address?.district}, {store.address?.province}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col text-sm space-y-1">
                            {store.phone && (
                                <div className="flex items-center">
                                    <Phone className="w-3 h-3 mr-1" /> {store.phone}
                                </div>
                            )}
                            {store.email && (
                                <div className="flex items-center">
                                    <Mail className="w-3 h-3 mr-1" /> {store.email}
                                </div>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          store.status === "ACTIVE"
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }
                      >
                        {store.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(store)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(store._id, store.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStore ? "Cập nhật cửa hàng" : "Thêm cửa hàng mới"}
            </DialogTitle>
             {/* Visually hidden description for accessibility */}
            <div className="sr-only" aria-describedby="dialog-description">
              Nhập thông tin chi tiết cho cửa hàng hoặc chi nhánh
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã cửa hàng *</Label>
                <Input
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  placeholder="VD: CT001"
                />
              </div>
              <div className="space-y-2">
                <Label>Tên cửa hàng *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="VD: Cửa hàng Cần Thơ"
                />
              </div>

              <div className="space-y-2">
                <Label>Loại</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, type: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORE">Cửa hàng (Store)</SelectItem>
                    <SelectItem value="WAREHOUSE">Kho hàng (Warehouse)</SelectItem>
                    <SelectItem value="SHOWROOM">Showroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trạng thái</Label>
                 <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                    <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                    <SelectItem value="MAINTENANCE">Bảo trì</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

               <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
                <Label className="text-base font-semibold">Địa chỉ</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tỉnh/Thành phố *</Label>
                        <Select
                            value={formData.address.province}
                            onValueChange={(val) => setFormData(prev => ({...prev, address: {...prev.address, province: val}}))}
                        >
                             <SelectTrigger>
                                <SelectValue placeholder="Chọn Tỉnh/Thành" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {provinces.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Quận/Huyện *</Label>
                        <Input 
                            name="address.district"
                            value={formData.address.district}
                            onChange={handleChange}
                            required
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Phường/Xã</Label>
                         <Input 
                            name="address.ward"
                            value={formData.address.ward}
                            onChange={handleChange}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Số nhà, Tên đường *</Label>
                         <Input 
                            name="address.street"
                            value={formData.address.street}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang xử lý..." : editingStore ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreManagementPage;
