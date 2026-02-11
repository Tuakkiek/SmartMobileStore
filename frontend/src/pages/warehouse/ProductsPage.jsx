// frontend/src/pages/warehouse/ProductsPage.jsx
// ✅ REFACTORED: Universal Products with dynamic tabs
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Search, Package } from "lucide-react";
import { universalProductAPI, productTypeAPI } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/shared/Loading";
import ProductCard from "@/components/shared/ProductCard";
import UniversalProductForm from "@/components/shared/UniversalProductForm";

const ProductsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Product Types State
  const [productTypes, setProductTypes] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  
  // Products State
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  
  const LIMIT = 12;

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(total / LIMIT),
    hasPrev: page > 1,
    hasNext: page < Math.ceil(total / LIMIT),
  };

  // Fetch Product Types on mount
  useEffect(() => {
    fetchProductTypes();
  }, []);

  // Fetch Products when activeTab, page, or search changes
  useEffect(() => {
    if (activeTab) {
      fetchProducts();
    }
  }, [activeTab, page, searchQuery]);

  // Reset page when changing tabs or search
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // ============================================
  // FETCH PRODUCT TYPES
  // ============================================
  const fetchProductTypes = async () => {
    try {
      const response = await productTypeAPI.getAll({ status: "ACTIVE" });
      console.log("📦 Raw API response:", response);
      
      // Handle different response structures
      let types = [];
      if (Array.isArray(response?.data?.data?.productTypes)) {
        // Backend structure: { data: { data: { productTypes: [...] } } }
        types = response.data.data.productTypes;
      } else if (Array.isArray(response?.data?.productTypes)) {
        // Alternate structure: { data: { productTypes: [...] } }
        types = response.data.productTypes;
      } else if (Array.isArray(response?.data?.data)) {
        // Direct array in data.data
        types = response.data.data;
      } else if (Array.isArray(response?.data)) {
        // Direct array in data
        types = response.data;
      }
      
      console.log("📦 Parsed product types:", types);
      setProductTypes(types);
      
      // Set first type as active tab
      if (types.length > 0 && !activeTab) {
        setActiveTab(types[0]._id);
      }
    } catch (error) {
      console.error("❌ Error fetching product types:", error);
      toast.error("Không thể tải danh sách loại sản phẩm");
      setProductTypes([]); // Ensure always an array
    }
  };

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = async () => {
    if (!activeTab) return;
    
    console.log("📥 Fetching products for Tab:", activeTab);
    setIsLoading(true);
    try {
      const response = await universalProductAPI.getAll({
        page,
        limit: LIMIT,
        search: searchQuery || undefined,
        productType: activeTab, // Filter by product type
      });

      console.log("📦 API Response:", response.data);

      const data = response?.data?.data;
      if (!data) throw new Error("Không có dữ liệu");

      const productsList = data.products || [];
      const totalCount = data.total || productsList.length;

      console.log(`✅ Loaded ${productsList.length} products`);

      setProducts(productsList);
      setTotal(totalCount);
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      toast.error(error.response?.data?.message || "Lỗi tải sản phẩm");
      setProducts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleCreate = () => {
    setCurrentMode("create");
    setCurrentProduct(null);
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setCurrentMode("edit");
    setCurrentProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!productId) {
      toast.error("Không thể xóa: ID sản phẩm không hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      await universalProductAPI.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      
      if (products.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (productTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Chưa có loại sản phẩm</h2>
          <p className="text-muted-foreground mb-4">
            Vui lòng tạo loại sản phẩm trước khi thêm sản phẩm
          </p>
          <Button onClick={() => navigate("/admin/product-types")}>
            Quản lý loại sản phẩm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">
            Quản lý sản phẩm theo loại sản phẩm
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
        </Button>
      </div>

      {/* CATEGORY TABS - DYNAMIC */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto w-full gap-2 bg-transparent p-0 justify-start">
          {productTypes.map((type) => (
            <TabsTrigger 
              key={type._id} 
              value={type._id}
              className="flex-shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border rounded-md px-4 py-2"
            >
              <span className="mr-2">{type.icon}</span>
              {type.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* SEARCH */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tên hoặc model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Tìm thấy <span className="font-semibold">{total}</span> sản phẩm
            {total > 0 && ` • Trang ${page} / ${Math.ceil(total / LIMIT)}`}
          </p>
        </div>

        {/* PRODUCTS GRID */}
        {productTypes.map((type) => (
          <TabsContent key={type._id} value={type._id}>
            {isLoading ? (
              <Loading />
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Không tìm thấy sản phẩm"
                    : `Chưa có sản phẩm ${type.name} nào`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => {
                  const isAdmin =
                    user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

                  return (
                    <div key={product._id} className="relative group">
                      <ProductCard
                        product={product}
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

            {/* PAGINATION */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-8 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </Button>

                <div className="text-sm font-medium min-w-[140px] text-center">
                  Trang {pagination.currentPage} / {pagination.totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages || isLoading}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* UNIVERSAL PRODUCT FORM */}
      <UniversalProductForm
        open={showModal}
        onOpenChange={setShowModal}
        mode={currentMode}
        product={currentProduct}
        onSave={() => {
          fetchProducts();
        }}
      />
    </div>
  );
};

export default ProductsPage;
