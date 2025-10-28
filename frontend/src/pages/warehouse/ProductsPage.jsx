// frontend/src/pages/warehouse/ProductsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Search, Package } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import { analyticsAPI } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/shared/Loading";
import ProductCard from "@/components/shared/ProductCard";
import ProductEditModal from "@/components/shared/ProductEditModal";
import { CATEGORIES } from "@/lib/productConstants";

// ============================================
// API MAPPING
// ============================================
const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("iPhone");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [justCreatedProductId, setJustCreatedProductId] = useState(null);
  const [addMode, setAddMode] = useState("normal");
  const [showJsonForm, setShowJsonForm] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  // Fetch products khi thay đổi tab
  useEffect(() => {
    fetchProducts();
  }, [activeTab]);

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const api = API_MAP[activeTab];
      if (!api || !api.getAll) {
        throw new Error(`API for ${activeTab} is not properly configured`);
      }

      console.log(`✅ Fetching products for category: ${activeTab}`);
      const response = await api.getAll({ limit: 100 });
      const data = response?.data?.data?.products || response?.data || [];

      // ✅ TÍNH TOP 10 MỚI NHẤT
      const sortedByDate = [...data].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const top10NewIds = sortedByDate.slice(0, 10).map((p) => p._id);

      // ✅ LẤY TOP 10 BÁN CHẠY
      let top10SellerIds = [];
      try {
        const sellersRes = await analyticsAPI.getTopSellers(activeTab, 10);
        top10SellerIds = sellersRes.data.data.map((s) => s.productId);
      } catch (error) {
        console.warn("Failed to fetch top sellers:", error);
      }

      // ✅ ATTACH FLAGS VÀO PRODUCTS
      const productsWithFlags = data.map((p) => ({
        ...p,
        isTopNew: top10NewIds.includes(p._id),
        isTopSeller: top10SellerIds.includes(p._id),
      }));

      setProducts(Array.isArray(productsWithFlags) ? productsWithFlags : []);

      // If we just created a product, find it and auto-open edit
      if (justCreatedProductId) {
        const createdProduct = productsWithFlags.find(
          (p) => p._id === justCreatedProductId
        );
        if (createdProduct) {
          setCurrentMode('edit');
          setCurrentProduct(createdProduct);
          setShowModal(true);
          setJustCreatedProductId(null);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching products:", {
        message: error.message,
        response: error.response?.data,
      });
      toast.error(error.response?.data?.message || "Lỗi khi tải sản phẩm");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleCreate = (mode) => {
    setAddMode(mode);
    if (mode === "json") {
      setJsonInput("");
      setShowJsonForm(true);
    } else {
      setCurrentMode("create");
      setCurrentProduct(null);
      setShowModal(true);
    }
  };

  const handleEdit = (product) => {
    setCurrentMode("edit");
    setCurrentProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!productId) {
      console.error("❌ Product ID is missing");
      toast.error("Không thể xóa: ID sản phẩm không hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      const api = API_MAP[activeTab];
      if (!api || !api.delete) {
        throw new Error(`API for ${activeTab} is not properly configured`);
      }
      console.log(`✅ Sending DELETE request for product ID: ${productId}`);
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      await fetchProducts();
    } catch (error) {
      console.error("❌ Error deleting product:", {
        message: error.message,
        response: error.response?.data,
      });
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const getCreatedBy = () => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        return state?.user?._id || state?.user?.id;
      } catch (error) {
        console.error("❌ Error parsing auth-storage:", error);
      }
    }
    return null;
  };

  const handleSubmitJson = async (e) => {
    e.preventDefault();

    let payload;
    try {
      const rawData = JSON.parse(jsonInput);

      payload = {
        ...rawData,
        createdBy: getCreatedBy(),
        category: activeTab,
        condition: rawData.condition || "NEW",
        status: rawData.status || "AVAILABLE",
        installmentBadge: rawData.installmentBadge || "NONE",
      };

      if (!payload.name?.trim()) throw new Error("Tên sản phẩm bắt buộc");
      if (!payload.model?.trim()) throw new Error("Model bắt buộc");
      if (!payload.variants?.length) throw new Error("Cần ít nhất 1 variant");

      console.log("✅ JSON PAYLOAD:", JSON.stringify(payload, null, 2));
    } catch (error) {
      toast.error("JSON không hợp lệ: " + error.message);
      return;
    }

    setIsLoading(true);
    try {
      const api = API_MAP[activeTab];
      const response = await api.create(payload);
      const newId = response?.data?._id || response?.data?.id;
      toast.success("Tạo sản phẩm thành công!");
      setShowJsonForm(false);
      setJustCreatedProductId(newId);
      fetchProducts();
    } catch (error) {
      console.error("❌ ERROR:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Lưu sản phẩm thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // FILTER PRODUCTS
  // ============================================
  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">
            Quản lý sản phẩm theo từng danh mục
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={addMode} onValueChange={setAddMode}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn kiểu thêm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Bình thường</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleCreate(addMode)}>
            <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
          </Button>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* SEARCH */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* PRODUCTS GRID */}
        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            {isLoading ? (
              <Loading />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Không tìm thấy sản phẩm"
                    : "Chưa có sản phẩm nào"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isAdmin =
                    user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

                  return (
                    <div key={product._id} className="relative group">
                      <ProductCard
                        product={product}
                        isTopNew={product.isTopNew}
                        isTopSeller={product.isTopSeller}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onUpdate={() => fetchProducts()}
                        showVariantsBadge={true}
                        showAdminActions={isAdmin}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* JSON FORM MODAL */}
      {showJsonForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Thêm sản phẩm mới bằng JSON - {activeTab}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowJsonForm(false);
                }}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmitJson}>
              <div className="p-6">
                <div className="space-y-2">
                  <Label>Nhập JSON sản phẩm</Label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border rounded-md font-mono"
                    placeholder="Nhập JSON ở đây... (cấu trúc tương tự formData)"
                  />
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowJsonForm(false);
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Đang lưu..." : "Tạo mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARED EDIT/CREATE MODAL */}
      <ProductEditModal
        open={showModal}
        onOpenChange={setShowModal}
        mode={currentMode}
        category={activeTab}
        product={currentProduct}
        onSave={(newId) => {
          fetchProducts();
          if (currentMode === "create" && newId) {
            setJustCreatedProductId(newId);
          }
        }}
      />
    </div>
  );
};

export default ProductsPage;