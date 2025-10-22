// frontend/src/pages/warehouse/ProductPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import ProductCategoryModal from '@/components/shared/ProductCategoryModal';
import ProductFormBasic from '@/components/shared/ProductFormBasic';

// Import specific specs and variants forms
import IPhoneSpecsForm from '@/components/shared/specs/IPhoneSpecsForm';
import IPadSpecsForm from '@/components/shared/specs/IPadSpecsForm';
import MacSpecsForm from '@/components/shared/specs/MacSpecsForm';
import AirPodsSpecsForm from '@/components/shared/specs/AirPodsSpecsForm';
import AppleWatchSpecsForm from '@/components/shared/specs/AppleWatchSpecsForm';
import AccessoriesSpecsForm from '@/components/shared/specs/AccessoriesSpecsForm';

import IPhoneVariantsForm from '@/components/shared/variants/IPhoneVariantsForm';
import IPadVariantsForm from '@/components/shared/variants/IPadVariantsForm';
import MacVariantsForm from '@/components/shared/variants/MacVariantsForm';
import AirPodsVariantsForm from '@/components/shared/variants/AirPodsVariantsForm';
import AppleWatchVariantsForm from '@/components/shared/variants/AppleWatchVariantsForm';
import AccessoriesVariantsForm from '@/components/shared/variants/AccessoriesVariantsForm';

import { Loading } from '@/components/shared/Loading.jsx';
import {ErrorMessage} from '@/components/shared/ErrorMessage.jsx';

const ProductPage = () => {
  const { id } = useParams(); // Nếu có id thì là edit, không thì add new
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(!id); // Show modal nếu add new
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState('NEW');
  const [productData, setProductData] = useState({
    name: '',
    model: '',
    description: '',
    specifications: {}, // Đối với phụ kiện sẽ là array
    variants: [],
    condition: 'NEW',
    brand: 'Apple',
    status: 'AVAILABLE',
  });

  // Fetch product data if editing
  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/products/${id}`);
      const product = response.data.data.product;
      setCategory(product.category); // Set category from fetched data
      setProductData(product);
    } catch (err) {
      setError(err.message);
      toast.error('Lỗi khi tải sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCategory = () => {
    setCategory(selectedCategory);
    setProductData((prev) => ({ ...prev, condition: selectedCondition }));
    setShowCategoryModal(false);
  };

  const handleBasicChange = (data) => {
    setProductData((prev) => ({ ...prev, ...data }));
  };

  // Handlers for specifications (common for fixed fields)
  const handleSpecFieldChange = (key, value) => {
    setProductData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value,
      },
    }));
  };

  // Handlers for colors in specifications
  const handleSpecColorChange = (index, value) => {
    const colors = [...(productData.specifications.colors || [])];
    colors[index] = value;
    handleSpecFieldChange('colors', colors);
  };

  const handleAddSpecColor = () => {
    const colors = [...(productData.specifications.colors || []), ''];
    handleSpecFieldChange('colors', colors);
  };

  const handleRemoveSpecColor = (index) => {
    const colors = (productData.specifications.colors || []).filter((_, i) => i !== index);
    handleSpecFieldChange('colors', colors);
  };

  // Handlers for custom specifications (Accessories)
  const handleCustomSpecChange = (index, field, value) => {
    const newSpecs = [...(productData.specifications || [])];
    newSpecs[index][field] = value;
    setProductData((prev) => ({ ...prev, specifications: newSpecs }));
  };

  const handleAddCustomSpec = () => {
    const newSpecs = [...(productData.specifications || []), { key: '', value: '' }];
    setProductData((prev) => ({ ...prev, specifications: newSpecs }));
  };

  const handleRemoveCustomSpec = (index) => {
    const newSpecs = (productData.specifications || []).filter((_, i) => i !== index);
    setProductData((prev) => ({ ...prev, specifications: newSpecs }));
  };

  // Handlers for variants (common for all categories)
  const handleAddVariant = () => {
    setProductData((prev) => ({
      ...prev,
      variants: [...prev.variants, { color: '', images: [''], options: [] }],
    }));
  };

  const handleRemoveVariant = (vIdx) => {
    const newVariants = productData.variants.filter((_, i) => i !== vIdx);
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleVariantChange = (vIdx, field, value) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx][field] = value;
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleAddImage = (vIdx) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx].images = [...newVariants[vIdx].images, ''];
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleRemoveImage = (vIdx, imgIdx) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx].images = newVariants[vIdx].images.filter((_, i) => i !== imgIdx);
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleImageChange = (vIdx, imgIdx, value) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx].images[imgIdx] = value;
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleAddOption = (vIdx) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx].options = [...newVariants[vIdx].options, {}];
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleRemoveOption = (vIdx, oIdx) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx].options = newVariants[vIdx].options.filter((_, i) => i !== oIdx);
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const handleOptionChange = (vIdx, oIdx, field, value) => {
    const newVariants = [...productData.variants];
    newVariants[vIdx].options[oIdx][field] = value;
    setProductData((prev) => ({ ...prev, variants: newVariants }));
  };

  const validateData = () => {
    if (!productData.name || !productData.model) {
      toast.error('Vui lòng điền đầy đủ thông tin cơ bản');
      return false;
    }
    if (Object.keys(productData.specifications).length === 0 && !Array.isArray(productData.specifications)) {
      toast.error('Vui lòng điền thông số kỹ thuật');
      return false;
    }
    if (productData.variants.length === 0) {
      toast.error('Vui lòng thêm ít nhất một biến thể');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateData()) return;

    setIsLoading(true);
    try {
      let response;
      if (id) {
        response = await api.put(`/products/${id}`, { ...productData, category });
      } else {
        response = await api.post(`/products`, { ...productData, category });
      }
      toast.success(id ? 'Cập nhật sản phẩm thành công' : 'Tạo sản phẩm thành công');
      navigate('/warehouse/products');
    } catch (err) {
      setError(err.message);
      toast.error('Lỗi khi lưu sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSpecsForm = () => {
    switch (category) {
      case 'iPhone':
        return (
          <IPhoneSpecsForm
            specs={productData.specifications}
            onChange={handleSpecFieldChange}
            onColorChange={handleSpecColorChange}
            onAddColor={handleAddSpecColor}
            onRemoveColor={handleRemoveSpecColor}
          />
        );
      case 'iPad':
        return (
          <IPadSpecsForm
            specs={productData.specifications}
            onChange={handleSpecFieldChange}
            onColorChange={handleSpecColorChange}
            onAddColor={handleAddSpecColor}
            onRemoveColor={handleRemoveSpecColor}
          />
        );
      case 'Mac':
        return (
          <MacSpecsForm
            specs={productData.specifications}
            onChange={handleSpecFieldChange}
            onColorChange={handleSpecColorChange}
            onAddColor={handleAddSpecColor}
            onRemoveColor={handleRemoveSpecColor}
          />
        );
      case 'AirPods':
        return (
          <AirPodsSpecsForm
            specs={productData.specifications}
            onChange={handleSpecFieldChange}
            onColorChange={handleSpecColorChange}
            onAddColor={handleAddSpecColor}
            onRemoveColor={handleRemoveSpecColor}
          />
        );
      case 'AppleWatch':
        return (
          <AppleWatchSpecsForm
            specs={productData.specifications}
            onChange={handleSpecFieldChange}
            onColorChange={handleSpecColorChange}
            onAddColor={handleAddSpecColor}
            onRemoveColor={handleRemoveSpecColor}
          />
        );
      case 'Accessories':
        return (
          <AccessoriesSpecsForm
            customSpecs={productData.specifications || []}
            onChange={handleCustomSpecChange}
            onAdd={handleAddCustomSpec}
            onRemove={handleRemoveCustomSpec}
          />
        );
      default:
        return <ErrorMessage message="Chưa chọn danh mục" />;
    }
  };

  const renderVariantsForm = () => {
    switch (category) {
      case 'iPhone':
        return (
          <IPhoneVariantsForm
            variants={productData.variants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
          />
        );
      case 'iPad':
        return (
          <IPadVariantsForm
            variants={productData.variants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
          />
        );
      case 'Mac':
        return (
          <MacVariantsForm
            variants={productData.variants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
          />
        );
      case 'AirPods':
        return (
          <AirPodsVariantsForm
            variants={productData.variants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
          />
        );
      case 'AppleWatch':
        return (
          <AppleWatchVariantsForm
            variants={productData.variants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
          />
        );
      case 'Accessories':
        return (
          <AccessoriesVariantsForm
            variants={productData.variants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            onVariantChange={handleVariantChange}
            onImageChange={handleImageChange}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
          />
        );
      default:
        return <ErrorMessage message="Chưa chọn danh mục" />;
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h1>

      {showCategoryModal && (
        <ProductCategoryModal
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedCondition={selectedCondition}
          setSelectedCondition={setSelectedCondition}
          onSubmit={handleSubmitCategory}
          onClose={() => navigate('/warehouse/products')}
        />
      )}

      {category && (
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
            <TabsTrigger value="specs">Thông số</TabsTrigger>
            <TabsTrigger value="variants">Biến thể</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ProductFormBasic initialData={productData} onChange={handleBasicChange} editing={!!id} />
          </TabsContent>

          <TabsContent value="specs">{renderSpecsForm()}</TabsContent>

          <TabsContent value="variants">{renderVariantsForm()}</TabsContent>
        </Tabs>
      )}

      {category && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : id ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductPage;