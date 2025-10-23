import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  CATEGORIES,
  getEmptyFormData,
  getEmptySpecs,
  getEmptyVariantOptions,
  emptyVariant,
} from "@/lib/productConstants";
import { Loading } from "@/components/shared/Loading";
import { ProductCard } from "@/components/shared/ProductCard"; // ✅ Imported ProductCard
import IPhoneSpecsForm from "@/components/shared/specs/IPhoneSpecsForm";
import IPadSpecsForm from "@/components/shared/specs/IPadSpecsForm";
import MacSpecsForm from "@/components/shared/specs/MacSpecsForm";
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";
import IPhoneVariantsForm from "@/components/shared/variants/IPhoneVariantsForm";
import IPadVariantsForm from "@/components/shared/variants/IPadVariantsForm";
import MacVariantsForm from "@/components/shared/variants/MacVariantsForm";
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";

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
  const [activeTab, setActiveTab] = useState("iPhone");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData("iPhone"));
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [justCreatedProductId, setJustCreatedProductId] = useState(null);
  const [addMode, setAddMode] = useState('normal'); // New state for dropdown selection
  const [inputMode, setInputMode] = useState('normal'); // New state for modal input mode
  const [jsonInput, setJsonInput] = useState(''); // New state for JSON textarea

  // Fetch products khi thay đổi tab
  useEffect(() => {
    fetchProducts();
  }, [activeTab]);

  // Reset form khi thay đổi category (chỉ khi KHÔNG đang edit)
  useEffect(() => {
    if (!editingProduct && !justCreatedProductId) {
      setFormData(getEmptyFormData(activeTab));
    }
  }, [activeTab, editingProduct, justCreatedProductId]);

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const api = API_MAP[activeTab];
      const response = await api.getAll({ limit: 100 });
      const data = response?.data?.data?.products || response?.data || [];
      setProducts(Array.isArray(data) ? data : []);

      // If we just created a product, find it and auto-open edit
      if (justCreatedProductId) {
        const createdProduct = data.find((p) => p._id === justCreatedProductId);
        if (createdProduct) {
          handleEdit(createdProduct);
          setJustCreatedProductId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Lỗi khi tải sản phẩm");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // FORM HANDLERS - TAB CƠ BẢN
  // ============================================
  const handleBasicChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ============================================
  // FORM HANDLERS - TAB THÔNG SỐ
  // ============================================
  const handleSpecChange = (key, value) => {
    if (activeTab === "Accessories") return;
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [key]: value },
    }));
  };

  const handleColorChange = (idx, value) => {
    const colors = [...(formData.specifications.colors || [""])];
    colors[idx] = value;
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  };

  const addColor = () => {
    const colors = [...(formData.specifications.colors || [""]), ""];
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  };

  const removeColor = (idx) => {
    const colors = (formData.specifications.colors || [""]).filter(
      (_, i) => i !== idx
    );
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  };

  // For Accessories only
  const handleCustomSpecChange = (idx, field, value) => {
    const specs = [...(formData.specifications || [])];
    specs[idx] = { ...specs[idx], [field]: value };
    setFormData((prev) => ({ ...prev, specifications: specs }));
  };

  const addCustomSpec = () => {
    const specs = [...(formData.specifications || []), { key: "", value: "" }];
    setFormData((prev) => ({ ...prev, specifications: specs }));
  };

  const removeCustomSpec = (idx) => {
    const specs = (formData.specifications || []).filter((_, i) => i !== idx);
    setFormData((prev) => ({ ...prev, specifications: specs }));
  };

  // ============================================
  // FORM HANDLERS - TAB BIẾN THỂ
  // ============================================
  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, emptyVariant(activeTab)],
    }));
  };

  const removeVariant = (vIdx) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== vIdx),
    }));
  };

  const handleVariantChange = (vIdx, field, value) => {
    const variants = [...formData.variants];
    variants[vIdx] = { ...variants[vIdx], [field]: value };
    setFormData((prev) => ({ ...prev, variants }));
  };

  const handleVariantImageChange = (vIdx, imgIdx, value) => {
    const variants = [...formData.variants];
    variants[vIdx].images[imgIdx] = value;
    setFormData((prev) => ({ ...prev, variants }));
  };

  const addVariantImage = (vIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].images.push("");
    setFormData((prev) => ({ ...prev, variants }));
  };

  const removeVariantImage = (vIdx, imgIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].images = variants[vIdx].images.filter(
      (_, i) => i !== imgIdx
    );
    setFormData((prev) => ({ ...prev, variants }));
  };

  const addVariantOption = (vIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].options.push(getEmptyVariantOptions(activeTab)[0]);
    setFormData((prev) => ({ ...prev, variants }));
  };

  const removeVariantOption = (vIdx, oIdx) => {
    const variants = [...formData.variants];
    variants[vIdx].options = variants[vIdx].options.filter(
      (_, i) => i !== oIdx
    );
    setFormData((prev) => ({ ...prev, variants }));
  };

  const handleVariantOptionChange = (vIdx, oIdx, field, value) => {
    const variants = [...formData.variants];
    variants[vIdx].options[oIdx] = {
      ...variants[vIdx].options[oIdx],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, variants }));
  };

  // ============================================
  // CLEAN PAYLOAD
  // ============================================
  const cleanPayload = (data) => {
    const cleaned = { ...data };

    // Get current user ID from token
    const authStorage = localStorage.getItem("auth-storage");
    let createdBy = null;
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        createdBy = state?.user?._id || state?.user?.id;
      } catch (error) {
        console.error("❌ Error parsing auth-storage for createdBy:", error);
      }
    }

    // Generate unique SKU
    const generateUniqueSKU = (productName, color, storage, index) => {
      const timestamp = Date.now();
      return `${productName}-${color}-${storage}-${timestamp}-${index}`
        .replace(/\s+/g, "")
        .toUpperCase();
    };

    // Convert prices/stock to number
    cleaned.originalPrice = data.originalPrice ? Number(data.originalPrice) : 0;
    cleaned.price = data.price ? Number(data.price) : 0;
    cleaned.discount = Number(data.discount || 0);
    cleaned.quantity = Number(data.quantity || 0);

    // For iPhone: Separate variants → createVariants array
    if (activeTab === "iPhone") {
      cleaned.variants = [];
      cleaned.createVariants = (data.variants || [])
        .map((variant, vIndex) => ({
          color: String(variant.color || "").trim(),
          images: (variant.images || []).filter((img) => img.trim()),
          options: (variant.options || [])
            .map((option, oIndex) => ({
              storage: String(option.storage || "").trim(),
              sku:
                option.sku?.trim() ||
                generateUniqueSKU(
                  cleaned.name,
                  variant.color,
                  option.storage,
                  oIndex
                ),
              originalPrice: Number(option.originalPrice || 0),
              price: Number(option.price || 0),
              stock: Number(option.stock || 0),
            }))
            .filter((opt) => opt.sku && opt.storage && opt.price >= 0),
          productId: null,
          createdBy: createdBy,
        }))
        .filter((variant) => variant.options.length > 0);
    } else {
      cleaned.variants = (data.variants || [])
        .map((variant) => ({
          color: String(variant.color || "").trim(),
          images: (variant.images || []).filter((img) => img.trim()),
          options: (variant.options || [])
            .map((option, oIndex) => ({
              storage: String(option.storage || "").trim(),
              sku:
                option.sku?.trim() ||
                generateUniqueSKU(
                  cleaned.name,
                  variant.color,
                  option.storage,
                  oIndex
                ),
              originalPrice: Number(option.originalPrice || 0),
              price: Number(option.price || 0),
              stock: Number(option.stock || 0),
            }))
            .filter((opt) => opt.sku && opt.price >= 0),
        }))
        .filter((variant) => variant.options.length > 0);
    }

    // Main product: Add createdBy
    cleaned.createdBy = createdBy;

    // Clean specifications
    if (activeTab === "Accessories") {
      cleaned.specifications = (data.specifications || [])
        .map((spec) => ({
          key: String(spec.key || "").trim(),
          value: String(spec.value || "").trim(),
        }))
        .filter((spec) => spec.key && spec.value);
    } else {
      cleaned.specifications = { ...(data.specifications || {}) };
      Object.keys(cleaned.specifications).forEach((key) => {
        if (
          cleaned.specifications[key] !== null &&
          cleaned.specifications[key] !== undefined
        ) {
          cleaned.specifications[key] = String(
            cleaned.specifications[key]
          ).trim();
        }
      });

      const colors = cleaned.specifications.colors;
      if (Array.isArray(colors)) {
        cleaned.specifications.colors = colors
          .map((color) => String(color || "").trim())
          .filter((color) => color);
      } else if (typeof colors === "string") {
        cleaned.specifications.colors = [String(colors).trim()].filter(
          (color) => color
        );
      } else {
        cleaned.specifications.colors = [];
      }
    }

    // Required fields
    cleaned.category = activeTab;
    cleaned.condition = cleaned.condition || "NEW";
    cleaned.status = cleaned.status || "AVAILABLE";
    cleaned.name = String(cleaned.name || "").trim();
    cleaned.model = String(cleaned.model || "").trim();
    cleaned.description = cleaned.description
      ? String(cleaned.description).trim()
      : null;

    // Clean up extra fields
    delete cleaned.images;
    delete cleaned.badges;
    delete cleaned.seoTitle;
    delete cleaned.seoDescription;

    console.log("✅ CLEANED PAYLOAD:", JSON.stringify(cleaned, null, 2));
    return cleaned;
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleCreate = (mode) => {
    setInputMode(mode);
    setEditingProduct(null);
    setJustCreatedProductId(null);
    setFormData(getEmptyFormData(activeTab));
    setJsonInput(''); // Reset JSON input
    setShowForm(true);
    setActiveFormTab("basic");
  };

  // Handle edit with proper variant grouping by color
  const handleEdit = (product) => {
    setInputMode('normal'); // Editing always in normal mode
    console.log("🔄 LOADING PRODUCT DATA:", product.name);

    setEditingProduct(product);

    // Ensure specifications.colors is always an array
    let specs = { ...product.specifications };
    if (specs && specs.colors) {
      if (!Array.isArray(specs.colors)) {
        specs.colors = [specs.colors];
      }
    } else {
      specs = getEmptySpecs(activeTab);
    }

    // Group variants by color
    const colorGroups = {};
    product.variants.forEach((variant) => {
      const colorKey = variant.color?.trim().toLowerCase() || 'unknown';
      if (!colorGroups[colorKey]) {
        colorGroups[colorKey] = {
          color: variant.color || '',
          images: Array.isArray(variant.images) ? variant.images.map(img => String(img || '')) : [''],
          options: []
        };
      }
      // Add option (storage combo)
      colorGroups[colorKey].options.push({
        storage: String(variant.storage || ''),
        sku: String(variant.sku || ''),
        originalPrice: variant.originalPrice ? String(variant.originalPrice) : '',
        price: variant.price ? String(variant.price) : '',
        stock: variant.stock ? String(variant.stock) : ''
      });
      // If images differ, prioritize the first (assume consistency)
    });

    const populatedVariants = Object.values(colorGroups).length > 0
      ? Object.values(colorGroups)
      : [emptyVariant(activeTab)];

    // Populate form data
    setFormData({
      name: String(product.name || ''),
      model: String(product.model || ''),
      category: product.category || activeTab,
      condition: product.condition || 'NEW',
      description: product.description || '',
      status: product.status || 'AVAILABLE',
      specifications: specs,
      variants: populatedVariants,
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      price: product.price ? String(product.price) : '',
      discount: product.discount ? String(product.discount) : '0',
      quantity: product.quantity ? String(product.quantity) : '0',
    });

    setShowForm(true);
    setActiveFormTab('basic');

    // Debug: Verify form population
    console.log("✅ FORM POPULATED:", {
      name: product.name,
      variantsCount: populatedVariants.length,
      optionsCount: populatedVariants.reduce((sum, v) => sum + v.options.length, 0),
    });
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    try {
      const api = API_MAP[activeTab];
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const validateForm = () => {
    if (!formData.name?.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      setActiveFormTab("basic");
      return false;
    }
    if (!formData.model?.trim()) {
      toast.error("Vui lòng nhập model sản phẩm");
      setActiveFormTab("basic");
      return false;
    }
    if (!formData.variants?.length) {
      toast.error("Vui lòng thêm ít nhất một biến thể");
      setActiveFormTab("variants");
      return false;
    }

    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i];
      if (!variant.color?.trim()) {
        toast.error(`Vui lòng nhập màu sắc cho biến thể ${i + 1}`);
        setActiveFormTab("variants");
        return false;
      }
      if (!variant.images?.length || !variant.images[0]?.trim()) {
        toast.error(`Vui lòng thêm ít nhất một ảnh cho biến thể ${i + 1}`);
        setActiveFormTab("variants");
        return false;
      }
      if (!variant.options?.length) {
        toast.error(
          `Vui lòng thêm ít nhất một phiên bản cho biến thể ${i + 1}`
        );
        setActiveFormTab("variants");
        return false;
      }

      for (let j = 0; j < variant.options.length; j++) {
        const option = variant.options[j];
        if (activeTab === "iPhone" && !option.storage?.trim()) {
          toast.error(
            `Vui lòng chọn bộ nhớ cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (activeTab === "iPhone" && !option.sku?.trim()) {
          toast.error(
            `Vui lòng nhập SKU cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.price?.trim() ||
          isNaN(Number(option.price)) ||
          Number(option.price) < 0
        ) {
          toast.error(
            `Vui lòng nhập giá bán hợp lệ cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.originalPrice?.trim() ||
          isNaN(Number(option.originalPrice)) ||
          Number(option.originalPrice) < 0
        ) {
          toast.error(
            `Vui lòng nhập giá gốc hợp lệ cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.stock?.trim() ||
          isNaN(Number(option.stock)) ||
          Number(option.stock) < 0
        ) {
          toast.error(
            `Vui lòng nhập số lượng tồn kho hợp lệ cho phiên bản ${
              j + 1
            } của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let dataToClean;
    if (inputMode === 'json') {
      try {
        dataToClean = JSON.parse(jsonInput);
      } catch (error) {
        toast.error("JSON không hợp lệ: " + error.message);
        return;
      }
    } else {
      if (!validateForm()) return;
      dataToClean = formData;
    }

    setIsLoading(true);
    try {
      const api = API_MAP[activeTab];
      const payload = cleanPayload(dataToClean);

      console.log("✅ CLEANED PAYLOAD:", JSON.stringify(payload, null, 2));

      let newProductId = null;

      if (editingProduct) {
        await api.update(editingProduct._id, payload);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        const response = await api.create(payload);
        newProductId = response?.data?._id || response?.data?.id;
        toast.success("Tạo sản phẩm thành công!");
        setJustCreatedProductId(newProductId);
      }

      await fetchProducts();
    } catch (error) {
      console.error("❌ ERROR:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Lưu sản phẩm thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // RENDER SPECS FORM
  // ============================================
  const renderSpecsForm = () => {
    const props = {
      specs: formData.specifications || {},
      onChange: handleSpecChange,
      onColorChange: handleColorChange,
      onAddColor: addColor,
      onRemoveColor: removeColor,
    };

    switch (activeTab) {
      case "iPhone":
        return <IPhoneSpecsForm {...props} />;
      case "iPad":
        return <IPadSpecsForm {...props} />;
      case "Mac":
        return <MacSpecsForm {...props} />;
      case "AirPods":
        return <AirPodsSpecsForm {...props} />;
      case "AppleWatch":
        return <AppleWatchSpecsForm {...props} />;
      case "Accessories":
        return (
          <AccessoriesSpecsForm
            customSpecs={
              Array.isArray(formData.specifications)
                ? formData.specifications
                : []
            }
            onChange={handleCustomSpecChange}
            onAdd={addCustomSpec}
            onRemove={removeCustomSpec}
          />
        );
      default:
        return null;
    }
  };

  // ============================================
  // RENDER VARIANTS FORM
  // ============================================
  const renderVariantsForm = () => {
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
    };

    switch (activeTab) {
      case "iPhone":
        return <IPhoneVariantsForm {...props} />;
      case "iPad":
        return <IPadVariantsForm {...props} />;
      case "Mac":
        return <MacVariantsForm {...props} />;
      case "AirPods":
        return <AirPodsVariantsForm {...props} />;
      case "AppleWatch":
        return <AppleWatchVariantsForm {...props} />;
      case "Accessories":
        return <AccessoriesVariantsForm {...props} />;
      default:
        return null;
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
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id || product.id}
                    product={{
                      ...product,
                      variantsCount: product.variants?.length || 0, // Add variantsCount for ProductCard
                    }}
                    onEdit={handleEdit}
                    onUpdate={() => fetchProducts()} // Optional: Refresh products if badges are updated
                    showVariantsBadge={true} // Show variants badge in warehouse view
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"} -{" "}
                {activeTab}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                  setJustCreatedProductId(null);
                }}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6">
                {inputMode === 'normal' ? (
                  <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                      <TabsTrigger value="specs">Thông số</TabsTrigger>
                      <TabsTrigger value="variants">Biến thể</TabsTrigger>
                    </TabsList>

                    {/* TAB CƠ BẢN */}
                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Tên sản phẩm <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={formData.name || ""}
                            onChange={(e) =>
                              handleBasicChange("name", e.target.value)
                            }
                            placeholder="VD: iPhone 17 Pro Max"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Model <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={formData.model || ""}
                            onChange={(e) =>
                              handleBasicChange("model", e.target.value)
                            }
                            placeholder="VD: A3101"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tình trạng</Label>
                          <Select
                            value={formData.condition || "NEW"}
                            onValueChange={(value) =>
                              handleBasicChange("condition", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NEW">Mới 100%</SelectItem>
                              <SelectItem value="LIKE_NEW">Like new</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Trạng thái</Label>
                          <Select
                            value={formData.status || "AVAILABLE"}
                            onValueChange={(value) =>
                              handleBasicChange("status", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                              <SelectItem value="OUT_OF_STOCK">
                                Hết hàng
                              </SelectItem>
                              <SelectItem value="DISCONTINUED">
                                Ngừng kinh doanh
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Mô tả</Label>
                        <textarea
                          value={formData.description || ""}
                          onChange={(e) =>
                            handleBasicChange("description", e.target.value)
                          }
                          rows={4}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="Nhập mô tả sản phẩm..."
                        />
                      </div>
                    </TabsContent>

                    {/* TAB THÔNG SỐ */}
                    <TabsContent value="specs" className="mt-4">
                      {renderSpecsForm()}
                    </TabsContent>

                    {/* TAB BIẾN THỂ */}
                    <TabsContent value="variants" className="mt-4">
                      {renderVariantsForm()}
                    </TabsContent>
                  </Tabs>
                ) : (
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
                )}
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    setJustCreatedProductId(null);
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Đang lưu..."
                    : editingProduct
                    ? "Cập nhật"
                    : "Tạo mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;