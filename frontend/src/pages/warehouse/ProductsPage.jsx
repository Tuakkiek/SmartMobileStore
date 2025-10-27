import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
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
import { analyticsAPI } from "@/lib/api";
import { generateSKU } from "@/lib/generateSKU";
import {
  CATEGORIES,
  getEmptyFormData,
  getEmptySpecs,
  getEmptyVariantOptions,
  emptyVariant,
  INSTALLMENT_BADGE_OPTIONS,
} from "@/lib/productConstants";
import { Loading } from "@/components/shared/Loading";
import ProductCard from "@/components/shared/ProductCard";
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
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("iPhone");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    ...getEmptyFormData("iPhone"),
    installmentBadge: "NONE", // ✅ Default value
  });
  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [justCreatedProductId, setJustCreatedProductId] = useState(null);
  const [addMode, setAddMode] = useState("normal");
  const [inputMode, setInputMode] = useState("normal");
  const [jsonInput, setJsonInput] = useState("");
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
          handleEdit(createdProduct);
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

    // Get current user ID
    const authStorage = localStorage.getItem("auth-storage");
    let createdBy = null;
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        createdBy = state?.user?._id || state?.user?.id;
      } catch (error) {
        console.error("❌ Error parsing auth-storage:", error);
      }
    }

    // Convert prices/stock to number
    cleaned.originalPrice = Number(data.originalPrice || 0);
    cleaned.price = Number(data.price || 0);
    cleaned.discount = Number(data.discount || 0);
    cleaned.quantity = Number(data.quantity || 0);

    // Clean variants for all categories
    cleaned.variants = (data.variants || [])
      .map((variant) => ({
        color: String(variant.color || "").trim(),
        images: (variant.images || []).filter((img) => img.trim()),
        options: (variant.options || [])
          .map((option) => {
            let variantOpts;
            let opt = {
              originalPrice: Number(option.originalPrice || 0),
              price: Number(option.price || 0),
              stock: Number(option.stock || 0),
            };

            if (activeTab === "iPhone") {
              variantOpts = option.storage || "";
              opt.storage = String(option.storage || "").trim();
              opt.sku =
                option.sku?.trim() ||
                generateSKU(
                  activeTab,
                  cleaned.model || "UNKNOWN",
                  variant.color || "",
                  variantOpts
                );
            } else if (activeTab === "iPad") {
              variantOpts = option.storage || "";
              opt.storage = String(option.storage || "").trim();
              opt.connectivity = String(option.connectivity || "").trim();
              opt.sku =
                option.sku?.trim() ||
                generateSKU(
                  activeTab,
                  cleaned.model || "UNKNOWN",
                  variant.color || "",
                  variantOpts,
                  option.connectivity || ""
                );
            } else if (activeTab === "Mac") {
              variantOpts = {
                cpuGpu: option.cpuGpu || "",
                ram: option.ram || "",
                storage: option.storage || "",
              };
              opt.cpuGpu = String(option.cpuGpu || "").trim();
              opt.ram = String(option.ram || "").trim();
              opt.storage = String(option.storage || "").trim();
              opt.sku =
                option.sku?.trim() ||
                generateSKU(
                  activeTab,
                  cleaned.model || "UNKNOWN",
                  variant.color || "",
                  variantOpts
                );
            } else if (activeTab === "AirPods" || activeTab === "Accessories") {
              variantOpts = option.variantName || "";
              opt.variantName = String(option.variantName || "").trim();
              opt.sku =
                option.sku?.trim() ||
                generateSKU(
                  activeTab,
                  cleaned.model || "UNKNOWN",
                  variant.color || "",
                  variantOpts
                );
            } else if (activeTab === "AppleWatch") {
              variantOpts = {
                variantName: option.variantName || "",
                bandSize: option.bandSize || "",
              };
              opt.variantName = String(option.variantName || "").trim();
              opt.bandSize = String(option.bandSize || "").trim();
              opt.sku =
                option.sku?.trim() ||
                generateSKU(
                  activeTab,
                  cleaned.model || "UNKNOWN",
                  variant.color || "",
                  variantOpts
                );
            }

            return opt;
          })
          .filter((opt) => opt.price >= 0),
      }))
      .filter((variant) => variant.options.length > 0 && variant.color.trim());

    cleaned.createdBy = createdBy;
    cleaned.category = activeTab;
    cleaned.condition = cleaned.condition || "NEW";
    cleaned.status = cleaned.status || "AVAILABLE";
    cleaned.installmentBadge = cleaned.installmentBadge || "NONE";
    cleaned.name = String(cleaned.name || "").trim();
    cleaned.model = String(cleaned.model || "").trim();
    cleaned.description = cleaned.description
      ? String(cleaned.description).trim()
      : "";

    // Clean specifications
    cleaned.specifications = { ...(data.specifications || {}) };
    cleaned.specifications.colors = Array.isArray(cleaned.specifications.colors)
      ? cleaned.specifications.colors
          .map((c) => String(c).trim())
          .filter(Boolean)
      : [];

    console.log(
      "✅ CLEANED PAYLOAD FOR",
      activeTab,
      ":",
      JSON.stringify(cleaned, null, 2)
    );
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
    setJsonInput("");
    setShowForm(true);
    setActiveFormTab("basic");
  };

  // Handle edit with proper variant grouping by color
  const handleEdit = (product) => {
    setInputMode("normal");
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
      // Add option
      let option = {
        sku: String(variant.sku || ""),
        originalPrice: variant.originalPrice
          ? String(variant.originalPrice)
          : "",
        price: variant.price ? String(variant.price) : "",
        stock: variant.stock ? String(variant.stock) : "",
      };
      if (
        activeTab === "iPhone" ||
        activeTab === "iPad" ||
        activeTab === "Mac"
      ) {
        option.storage = String(variant.storage || "");
      }
      if (activeTab === "iPad") {
        option.connectivity = String(variant.connectivity || "");
      }
      if (activeTab === "Mac") {
        option.cpuGpu = String(variant.cpuGpu || "");
        option.ram = String(variant.ram || "");
      }
      if (
        activeTab === "AirPods" ||
        activeTab === "Accessories" ||
        activeTab === "AppleWatch"
      ) {
        option.variantName = String(variant.variantName || "");
      }
      if (activeTab === "AppleWatch") {
        option.bandSize = String(variant.bandSize || "");
      }
      colorGroups[colorKey].options.push(option);
    });

    const populatedVariants =
      Object.values(colorGroups).length > 0
        ? Object.values(colorGroups)
        : [emptyVariant(activeTab)];

    // Populate form data
    setFormData({
      name: String(product.name || ""),
      model: String(product.model || ""),
      category: product.category || activeTab,
      condition: product.condition || "NEW",
      description: product.description || "",
      status: product.status || "AVAILABLE",
      installmentBadge: product.installmentBadge || "NONE",
      specifications: specs,
      variants: populatedVariants,
      originalPrice: product.originalPrice ? String(product.originalPrice) : "",
      price: product.price ? String(product.price) : "",
      discount: product.discount ? String(product.discount) : "0",
      quantity: product.quantity ? String(product.quantity) : "0",
    });

    setShowForm(true);
    setActiveFormTab("basic");

    // Debug: Verify form population
    console.log("✅ FORM POPULATED:", {
      name: product.name,
      variantsCount: populatedVariants.length,
      optionsCount: populatedVariants.reduce(
        (sum, v) => sum + v.options.length,
        0
      ),
    });
  };

  const handleDelete = async (productId) => {
    if (!productId) {
      console.error("❌ Product ID is missing");
      toast.error("Không thể xóa: ID sản phẩm không hợp lệ");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

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
        if (
          ["iPhone", "iPad", "Mac"].includes(activeTab) &&
          !option.storage?.trim()
        ) {
          toast.error(
            `Vui lòng chọn bộ nhớ cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (activeTab === "iPad" && !option.connectivity?.trim()) {
          toast.error(
            `Vui lòng chọn kết nối cho phiên bản ${j + 1} của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          activeTab === "Mac" &&
          (!option.cpuGpu?.trim() || !option.ram?.trim())
        ) {
          toast.error(
            `Vui lòng nhập CPU-GPU và RAM cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          ["AirPods", "AppleWatch", "Accessories"].includes(activeTab) &&
          !option.variantName?.trim()
        ) {
          toast.error(
            `Vui lòng nhập tên biến thể cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (!option.sku?.trim()) {
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

    // ✅ VALIDATE: price <= originalPrice cho tất cả options
    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i];

      for (let j = 0; j < variant.options.length; j++) {
        const option = variant.options[j];
        const price = Number(option.price);
        const originalPrice = Number(option.originalPrice);

        if (price > originalPrice && originalPrice > 0) {
          toast.error(
            `Giá bán (${price.toLocaleString()}đ) không được lớn hơn giá gốc (${originalPrice.toLocaleString()}đ) ` +
              `tại phiên bản ${j + 1} của biến thể ${i + 1}`
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

    let payload;

    if (inputMode === "json") {
      try {
        // ✅ FIX: PARSE JSON VÀ CLEAN RIÊNG CHO JSON MODE
        const rawData = JSON.parse(jsonInput);

        // ✅ JSON MODE: TRỰC TIẾP TỪ rawData
        payload = {
          ...rawData,
          createdBy: rawData.createdBy || getCreatedBy(), // Auto add createdBy
          category: activeTab,
          condition: rawData.condition || "NEW",
          status: rawData.status || "AVAILABLE",
          installmentBadge: rawData.installmentBadge || "NONE",
        };

        // ✅ VALIDATE JSON
        if (!payload.name?.trim()) throw new Error("Tên sản phẩm bắt buộc");
        if (!payload.model?.trim()) throw new Error("Model bắt buộc");
        if (!payload.variants?.length) throw new Error("Cần ít nhất 1 variant");

        console.log("✅ JSON PAYLOAD:", JSON.stringify(payload, null, 2));
      } catch (error) {
        toast.error("JSON không hợp lệ: " + error.message);
        return;
      }
    } else {
      // NORMAL MODE
      if (!validateForm()) return;
      payload = cleanPayload(formData);
    }

    setIsLoading(true);
    try {
      const api = API_MAP[activeTab];

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

  // ✅ THÊM HELPER FUNCTION
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
      model: formData.model,
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
                {filteredProducts.map((product) => {
                  const isAdmin =
                    user?.role === "ADMIN" || user?.role === "STAFF"; // hoặc kiểm tra quyền

                  return (
                    <div key={product._id} className="relative group">
                      <ProductCard
                        key={product._id || product.id}
                        product={product}
                        isTopNew={product.isTopNew} // ✅ Pass flag
                        isTopSeller={product.isTopSeller} // ✅ Pass flag
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onUpdate={() => fetchProducts()}
                        showVariantsBadge={true}
                        showAdminActions={isAdmin}
                        editingProductId={editingProduct?._id} // Truyền editingProductId
                        showForm={showForm} // Truyền showForm
                      />
                    </div>
                  );
                })}
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
                {inputMode === "normal" ? (
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
                              <SelectItem value="AVAILABLE">
                                Còn hàng
                              </SelectItem>
                              <SelectItem value="OUT_OF_STOCK">
                                Hết hàng
                              </SelectItem>
                              <SelectItem value="DISCONTINUED">
                                Ngừng kinh doanh
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Trả góp 0%</Label>
                          <Select
                            value={formData.installmentBadge || "NONE"}
                            onValueChange={(value) =>
                              handleBasicChange("installmentBadge", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn chương trình trả góp" />
                            </SelectTrigger>
                            <SelectContent>
                              {INSTALLMENT_BADGE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Badge này chỉ hiển thị khi sản phẩm không thuộc top
                            "Mới" hoặc "Bán chạy"
                          </p>
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
