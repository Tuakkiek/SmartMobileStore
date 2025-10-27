// frontend/src/pages/HomePage.jsx
// ADMIN: Edit sản phẩm ngay trên Homepage – form giống ProductsPage

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Box,
} from "lucide-react";
import { HeroBannerCarousel } from "@/components/shared/HeroBanner";
import ProductCard from "@/components/shared/ProductCard";
import IPhoneShowcase from "@/components/shared/iPhoneShowcase";
import { Loading } from "@/components/shared/Loading";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
  analyticsAPI,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INSTALLMENT_BADGE_OPTIONS,
  emptyVariant,
} from "@/lib/productConstants";
import { generateSKU } from "@/lib/generateSKU";

// === IMPORT SPECS & VARIANTS FORMS ===
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import IPadSpecsForm from "@/components/shared/specs/IPadSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecs slogForm";

import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import IPadVariantsForm from "@/components/shared/variants/IPadVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";

// ============================================
// CATEGORY CONFIG
// ============================================
const CATEGORY_ICONS = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Laptop,
  AppleWatch: Watch,
  AirPods: Headphones,
  Accessories: Box,
};

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AppleWatch: appleWatchAPI,
  AirPods: airPodsAPI,
  Accessories: accessoryAPI,
};

const categories = Object.keys(CATEGORY_ICONS);

// ============================================
// MAIN COMPONENT
// ============================================
const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [categoryProducts, setCategoryProducts] = useState({});
  const [topSellersMap, setTopSellersMap] = useState({});
  const [newArrivals, setNewArrivals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // EDIT MODAL
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin =
    isAuthenticated &&
    ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user?.role);

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchHomeData = useCallback(async () => {
    setIsLoading(true);
    const allProducts = {};
    const topSellers = {};

    try {
      await Promise.all(
        categories.map(async (cat) => {
          const api = API_MAP[cat];
          if (!api?.getAll) return;

          try {
            const productsRes = await api.getAll({ limit: 8 });
            const products =
              productsRes.data?.data?.products || productsRes.data || [];

            let sellerIds = [];
            try {
              const sellersRes = await analyticsAPI.getTopSellers(cat, 10);
              const data = sellersRes.data?.data || sellersRes.data;
              sellerIds = Array.isArray(data)
                ? data.map((s) => s.productId).filter(Boolean)
                : [];
            } catch (err) {
              console.warn(`Top sellers failed for ${cat}:`, err);
            }

            allProducts[cat] = Array.isArray(products) ? products : [];
            topSellers[cat] = sellerIds;
          } catch (error) {
            console.error(`Error fetching ${cat}:`, error);
            allProducts[cat] = [];
            topSellers[cat] = [];
          }
        })
      );

      const allProductsList = Object.values(allProducts).flat();
      const sortedNewArrivals = [...allProductsList]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

      // ĐÃ SỬA: employers → sortedNewArrivals
      setNewArrivals(sortedNewArrivals);
      setCategoryProducts(allProducts);
      setTopSellersMap(topSellers);
    } catch (err) {
      console.error("Lỗi tải trang chủ:", err);
      toast.error("Không thể tải dữ liệu trang chủ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // ============================================
  // TOP NEW IDS
  // ============================================
  const getTopNewIds = (products) => {
    if (!Array.isArray(products) || products.length === 0) return [];
    return [...products]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((p) => p._id)
      .filter(Boolean);
  };

  // ============================================
  // HANDLE DELETE
  // ============================================
  const handleDelete = async (productId, category) => {
    if (!window.confirm("Xác nhận xóa sản phẩm này?")) return;

    const api = API_MAP[category];
    if (!api?.delete) {
      toast.error("Không hỗ trợ xóa sản phẩm này");
      return;
    }

    try {
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      setCategoryProducts((prev) => ({
        ...prev,
        [category]: prev[category]?.filter((p) => p._id !== productId) || [],
      }));
      setNewArrivals((prev) => prev.filter((p) => p._id !== productId));
      fetchHomeData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleViewAll = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  // ============================================
  // HANDLE EDIT – LOAD DỮ LIỆU CŨ (Giống ProductsPage)
  // ============================================
  const handleEdit = (product) => {
    if (!isAdmin) return;

    const category = product.category || "iPhone";
    setEditingProduct(product);

    // === SPECIFICATIONS ===
    let specs = { ...product.specifications };
    if (!specs.colors || !Array.isArray(specs.colors)) {
      specs.colors = [];
    }

    // === GROUP VARIANTS BY COLOR ===
    const colorGroups = {};
    product.variants.forEach((variant) => {
      const colorKey = variant.color?.trim().toLowerCase() || "unknown";
      if (!colorGroups[colorKey]) {
        colorGroups[colorKey] = {
          color: variant.color || "",
          images: Array.isArray(variant.images)
            ? variant.images.map((img) => String(img || ""))
            : [""],
          options: [],
        };
      }

      const option = {
        sku: String(variant.sku || ""),
        originalPrice: String(variant.originalPrice || ""),
        price: String(variant.price || ""),
        stock: String(variant.stock || ""),
        storage: String(variant.storage || ""),
        connectivity: String(variant.connectivity || ""),
        cpuGpu: String(variant.cpuGpu || ""),
        ram: String(variant.ram || ""),
        variantName: String(variant.variantName || ""),
        bandSize: String(variant.bandSize || ""),
      };
      colorGroups[colorKey].options.push(option);
    });

    const populatedVariants =
      Object.values(colorGroups).length > 0
        ? Object.values(colorGroups)
        : [emptyVariant(category)];

    // === SET FORM DATA ===
    setFormData({
      name: String(product.name || ""),
      model: String(product.model || ""),
      condition: product.condition || "NEW",
      description: product.description || "",
      status: product.status || "AVAILABLE",
      installmentBadge: product.installmentBadge || "NONE",
      specifications: specs,
      variants: populatedVariants,
    });

    setShowEditModal(true);
    setActiveFormTab("basic");
  };

  // ============================================
  // CLEAN PAYLOAD (giống ProductsPage)
  // ============================================
  const cleanPayload = (data) => {
    const cleaned = { ...data };
    const authStorage = localStorage.getItem("auth-storage");
    let createdBy = null;
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        createdBy = state?.user?._id || state?.user?.id;
      } catch (e) {
        console.warn("Lỗi parse auth-storage:", e);
      }
    }

    cleaned.variants = (data.variants || [])
      .map((variant) => ({
        color: String(variant.color || "").trim(),
        images: (variant.images || []).filter((img) => img.trim()),
        options: (variant.options || [])
          .map((opt) => {
            const o = {
              originalPrice: Number(opt.originalPrice || 0),
              price: Number(opt.price || 0),
              stock: Number(opt.stock || 0),
            };
            if (editingProduct.category === "iPhone") o.storage = opt.storage;
            if (editingProduct.category === "iPad") {
              o.storage = opt.storage;
              o.connectivity = opt.connectivity;
            }
            if (editingProduct.category === "Mac") {
              o.cpuGpu = opt.cpuGpu;
              o.ram = opt.ram;
              o.storage = opt.storage;
            }
            if (["AirPods", "Accessories", "AppleWatch"].includes(editingProduct.category)) {
              o.variantName = opt.variantName;
            }
            if (editingProduct.category === "AppleWatch") o.bandSize = opt.bandSize;
            o.sku = opt.sku || generateSKU(editingProduct.category, cleaned.model, variant.color, opt.storage || opt.variantName || "");
            return o;
          })
          .filter((o) => o.price >= 0 && o.stock >= 0),
      }))
      .filter((v) => v.color && v.options.length > 0);

    cleaned.createdBy = createdBy;
    cleaned.category = editingProduct.category;
    cleaned.name = cleaned.name.trim();
    cleaned.model = cleaned.model.trim();
    cleaned.description = cleaned.description.trim();
    cleaned.specifications = {
      ...cleaned.specifications,
      colors: Array.isArray(cleaned.specifications.colors)
        ? cleaned.specifications.colors.map(c => String(c).trim()).filter(Boolean)
        : [],
    };

    return cleaned;
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!formData?.name?.trim() || !formData?.model?.trim()) {
      toast.error("Vui lòng nhập tên và model sản phẩm");
      return;
    }

    setIsSubmitting(true);
    try {
      const api = API_MAP[editingProduct.category];
      const payload = cleanPayload(formData);
      await api.update(editingProduct._id, payload);
      toast.success("Cập nhật sản phẩm thành công!");
      setShowEditModal(false);
      setEditingProduct(null);
      setFormData(null);
      fetchHomeData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // FORM HANDLERS (giống ProductsPage)
  // ============================================
  const handleBasicChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, [key]: value },
    }));
  };

  const handleColorChange = (idx, value) => {
    const colors = [...(formData.specifications.colors || [])];
    colors[idx] = value;
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  };

  const addColor = () => {
    const colors = [...(formData.specifications.colors || []), ""];
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  };

  const removeColor = (idx) => {
    const colors = (formData.specifications.colors || []).filter((_, i) => i !== idx);
    setFormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, emptyVariant(editingProduct.category)],
    }));
  };

  const removeVariant = (vIdx) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== vIdx),
    }));
  };

  const handleVariantChange = (vIdx, field, value) => {
    const variants = [...formData.variants];
    variants[vIdx] = { ...variants[vIdx], [field]: value };
    setFormData(prev => ({ ...prev, variants }));
  };

  const handleVariantImageChange = (vIdx, imgIdx, value) => {
    const variants = [...formData.variants];
    variants[vIdx].images[imgIdx] = value;
    setFormData(prev => ({ ...prev, variants }));
  };

  const addVariantImage = (vIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].images.push("");
    setFormData(prev => ({ ...prev, variants }));
  };

  const removeVariantImage = (vIdx, imgIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].images = variants[vIdx].images.filter((_, i) => i !== imgIdx);
    setFormData(prev => ({ ...prev, variants }));
  };

  const addVariantOption = (vIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].options.push({
      sku: "",
      originalPrice: "",
      price: "",
      stock: "",
      storage: "",
      connectivity: "",
      cpuGpu: "",
      ram: "",
      variantName: "",
      bandSize: "",
    });
    setFormData(prev => ({ ...prev, variants }));
  };

  const removeVariantOption = (vIdx, oIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].options = variants[vIdx].options.filter((_, i) => i !== oIdx);
    setFormData(prev => ({ ...prev, variants }));
  };

  const handleVariantOptionChange = (vIdx, oIdx, field, value) => {
    const variants = [...formData.variants];
    variants[vIdx].options[oIdx] = {
      ...variants[vIdx].options[oIdx],
      [field]: value,
    };
    setFormData(prev => ({ ...prev, variants }));
  };

  // ============================================
  // RENDER SPECS FORM
  // ============================================
  const renderSpecsForm = () => {
    if (!formData || !editingProduct) return null;

    const props = {
      specs: formData.specifications || {},
      onChange: handleSpecChange,
      onColorChange: handleColorChange,
      onAddColor: addColor,
      onRemoveColor: removeColor,
    };

    switch (editingProduct.category) {
      case "iPhone": return <IPhoneSpecsForm {...props} />;
      case "iPad": return <IPadSpecsForm {...props} />;
      case "Mac": return <MacSpecsForm {...props} />;
      case "AirPods": return <AirPodsSpecsForm {...props} />;
      case "AppleWatch": return <AppleWatchSpecsForm {...props} />;
      case "Accessories":
        return (
          <AccessoriesSpecsForm
            customSpecs={Array.isArray(formData.specifications) ? formData.specifications : []}
            onChange={() => {}}
            onAdd={() => {}}
            onRemove={() => {}}
          />
        );
      default: return null;
    }
  };

  // ============================================
  // RENDER VARIANTS FORM
  // ============================================
  const renderVariantsForm = () => {
    if (!formData || !editingProduct) return null;

    const props = {
      variants: formData.variants || [],
      onAddVariant: addVariant,
      onRemoveVariant: removeVariant,
      onVariantChange: handleVariantChange,
      onImageChange: handleVariantImageChange,
      onAddImage: addVariantImage,
      onRemoveImage: removeVariantImage,
      onOptionChange: handleVariantOptionChange,
      onAddOption: addVariantOption,
      onRemoveOption: removeVariantOption,
      model: formData.model,
    };

    switch (editingProduct.category) {
      case "iPhone": return <IPhoneVariantsForm {...props} />;
      case "iPad": return <IPadVariantsForm {...props} />;
      case "Mac": return <MacVariantsForm {...props} />;
      case "AirPods": return <AirPodsVariantsForm {...props} />;
      case "AppleWatch": return <AppleWatchVariantsForm {...props} />;
      case "Accessories": return <AccessoriesVariantsForm {...props} />;
      default: return null;
    }
  };

  // ============================================
  // EDIT FORM
  // ============================================
  const EditForm = () => {
    if (!formData || !editingProduct) return null;

    return (
      <form onSubmit={handleSubmitEdit} className="space-y-6">
        <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
            <TabsTrigger value="specs">Thông số</TabsTrigger>
            <TabsTrigger value="variants">Biến thể</TabsTrigger>
          </TabsList>

          {/* TAB CƠ BẢN */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tên sản phẩm *</Label>
                <Input
                  value={formData.name}
                  onChange={e => handleBasicChange("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Model *</Label>
                <Input
                  value={formData.model}
                  onChange={e => handleBasicChange("model", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Tình trạng</Label>
                <Select value={formData.condition} onValueChange={v => handleBasicChange("condition", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Mới 100%</SelectItem>
                    <SelectItem value="LIKE_NEW">Like new</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trạng thái</Label>
                <Select value={formData.status} onValueChange={v => handleBasicChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trả góp 0%</Label>
                <Select value={formData.installmentBadge} onValueChange={v => handleBasicChange("installmentBadge", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSTALLMENT_BADGE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mô tả</Label>
              <textarea
                value={formData.description}
                onChange={e => handleBasicChange("description", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </TabsContent>

          {/* TAB THÔNG SỐ */}
          <TabsContent value="specs">
            {renderSpecsForm()}
          </TabsContent>

          {/* TAB BIẾN THỂ */}
          <TabsContent value="variants">
            {renderVariantsForm()}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Cập nhật"}
          </Button>
        </div>
      </form>
    );
  };

  // ============================================
  // SECTIONS
  // ============================================
  const CategorySection = ({ category, products }) => {
    const Icon = CATEGORY_ICONS[category] || Box;
    if (!Array.isArray(products) || products.length === 0) return null;

    const topNewIds = getTopNewIds(products);
    const topSellerIds = topSellersMap[category] || [];

    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold text-gray-900">{category}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleViewAll(category)}>
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <div key={product._id} className="relative group">
                <ProductCard
                  product={product}
                  isTopNew={topNewIds.includes(product._id)}
                  isTopSeller={topSellerIds.includes(product._id)}
                  onEdit={isAdmin ? () => handleEdit(product) : undefined}
                  onDelete={isAdmin ? () => handleDelete(product._id, category) : undefined}
                  onUpdate={fetchHomeData}
                  showVariantsBadge={true}
                  showAdminActions={isAdmin}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const CategoryNav = () => (
    <section className="py-10 bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Box;
            const productCount = categoryProducts[cat]?.length || 0;

            return (
              <button
                key={cat}
                onClick={() => handleViewAll(cat)}
                className="group flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
              >
                <Icon className="w-9 h-9 text-primary group-hover:text-white transition-colors" />
                <div className="text-center">
                  <span className="text-sm font-medium group-hover:text-white block">
                    {cat}
                  </span>
                  {productCount > 0 && (
                    <span className="text-xs text-muted-foreground group-hover:text-white/80">
                      {productCount} sản phẩm
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );

  const NewArrivalsSection = () => {
    if (!Array.isArray(newArrivals) || newArrivals.length === 0) return null;

    return (
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sản phẩm mới</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/products?sort=createdAt")}>
              Xem tất cả <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product) => {
              const productCategory =
                Object.keys(categoryProducts).find((cat) =>
                  categoryProducts[cat]?.some((p) => p._id === product._id)
                ) || null;

              return (
                <div key={product._id} className="relative group">
                  <ProductCard
                    product={{ ...product, isTopNew: true }}
                    isTopNew={true}
                    isTopSeller={false}
                    onEdit={isAdmin ? () => handleEdit(product) : undefined}
                    onDelete={isAdmin && productCategory ? () => handleDelete(product._id, productCategory) : undefined}
                    onUpdate={fetchHomeData}
                    showVariantsBadge={true}
                    showAdminActions={isAdmin}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroBannerCarousel />
      <CategoryNav />
      <NewArrivalsSection />

      {categories.map((cat) => (
        <CategorySection key={cat} category={cat} products={categoryProducts[cat] || []} />
      ))}

      {categoryProducts.iPhone?.length > 0 && <IPhoneShowcase />}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Chỉnh sửa: {editingProduct?.name}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                X
              </Button>
            </div>
            <div className="p-6">
              <EditForm />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;