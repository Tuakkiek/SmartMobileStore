// ============================================
// FILE: frontend/src/pages/HomePage.jsx
// Fully dynamic homepage layout from database
// ============================================

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Loading } from "@/shared/ui/Loading";
import DynamicSection from "../components/DynamicSection";
import { ProductEditModal, universalProductAPI } from "@/features/catalog";
import { useAuthStore } from "@/features/auth";
import { homePageAPI } from "../api/homepage.api";
import { toast } from "sonner";

const HomePage = () => {
  const { isAuthenticated, user } = useAuthStore();

  const [layout, setLayout] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialLoadRef = useRef(false);
  const lastProductsLogSignatureRef = useRef("");

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const isAdmin =
    isAuthenticated &&
    ["ADMIN", "WAREHOUSE_MANAGER", "PRODUCT_MANAGER"].includes(user?.role);

  // ============================================
  // FETCH HOMEPAGE LAYOUT
  // ============================================
  const fetchLayout = useCallback(async () => {
    try {
      const response = await homePageAPI.getLayout();
      const layoutData = response.data?.data?.layout;
      setLayout(layoutData);
    } catch (error) {
      console.error("Error fetching layout:", error);
      toast.error("Không thể tải cấu hình trang chủ");
    }
  }, []);

  // ============================================
  // FETCH ALL PRODUCTS (Universal ONLY)
  // ============================================
  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await universalProductAPI.getAll({ limit: 500 }); // Fetch enough for homepage
      const products = response.data?.data?.products || [];

      // Normalize for display
      const normalizedProducts = products.map((p) => ({
        ...p,
        createAt: p.createdAt || p.createAt,
        category: p.productType?.name || "Sản phẩm",
        isUniversal: true,
      }));

      const newestPreview = [...normalizedProducts]
        .sort(
          (a, b) =>
            new Date(b.createAt || 0).getTime() -
            new Date(a.createAt || 0).getTime()
        )
        .slice(0, 10)
        .map((p) => ({
          id: p._id,
          model: p.model,
          createdAt: p.createAt,
        }));

      const logPayload = {
        total: normalizedProducts.length,
        newestPreview,
      };
      if (import.meta.env.DEV) {
        const signature = JSON.stringify(logPayload);
        if (signature !== lastProductsLogSignatureRef.current) {
          lastProductsLogSignatureRef.current = signature;
          console.log("[HOMEPAGE] Loaded universal products:", signature);
        }
      }

      setAllProducts(normalizedProducts);
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error("Không thể tải dữ liệu sản phẩm");
    }
  }, []);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    if (hasInitialLoadRef.current) return;
    hasInitialLoadRef.current = true;

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLayout(), fetchAllProducts()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchLayout, fetchAllProducts]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    try {
      await universalProductAPI.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      fetchAllProducts(); // Reload products
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleSaveProduct = () => {
    fetchAllProducts(); // Reload products after edit
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return <Loading />;
  }

  // Sort sections by order
  const sortedSections =
    layout?.sections
      ?.filter((s) => s.enabled)
      ?.sort((a, b) => a.order - b.order) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {sortedSections.length > 0 ? (
        sortedSections.map((section) => (
          <DynamicSection
            key={section.id}
            section={section}
            allProducts={allProducts}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Chưa có cấu hình trang chủ</p>
            {isAdmin && (
              <p className="text-sm text-gray-400 mt-2">Vào trang quản lý để thiết lập giao diện</p>
            )}
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      <ProductEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mode="edit"
        product={editingProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
};

export default HomePage;
