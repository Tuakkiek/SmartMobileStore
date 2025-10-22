// frontend/src/pages/warehouse/ProductPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import ProductCategoryModal from '@/components/shared/ProductCategoryModal';
import ProductFormBasic from '@/components/shared/ProductFormBasic';
import ProductFormMedia from '@/components/shared/ProductFormMedia';

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
  const [showCategoryModal, setShowCategoryModal] = useState(!id); // Show modal nếu add new
  const [category, setCategory] = useState(null);
  const [productData, setProductData] = useState({
    name: '',
    model: '',
    description: '',
    specifications: {},
    variants: [],
    images: [], // Product-level images if any
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

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
    setShowCategoryModal(false);
  };

  const handleBasicChange = (data) => {
    setProductData((prev) => ({ ...prev, ...data }));
  };

  const handleMediaChange = (images) => {
    setProductData((prev) => ({ ...prev, images }));
  };

  const handleSpecsChange = (specs) => {
    setProductData((prev) => ({ ...prev, specifications: specs }));
  };

  const handleVariantsChange = (variants) => {
    setProductData((prev) => ({ ...prev, variants }));
  };

  const validateData = () => {
    if (!productData.name || !productData.model) {
      toast.error('Vui lòng điền đầy đủ thông tin cơ bản');
      return false;
    }
    if (Object.keys(productData.specifications).length === 0) {
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
        return <IPhoneSpecsForm initialData={productData.specifications} onChange={handleSpecsChange} />;
      case 'iPad':
        return <IPadSpecsForm initialData={productData.specifications} onChange={handleSpecsChange} />;
      case 'Mac':
        return <MacSpecsForm initialData={productData.specifications} onChange={handleSpecsChange} />;
      case 'AirPods':
        return <AirPodsSpecsForm initialData={productData.specifications} onChange={handleSpecsChange} />;
      case 'AppleWatch':
        return <AppleWatchSpecsForm initialData={productData.specifications} onChange={handleSpecsChange} />;
      case 'Accessories':
        return <AccessoriesSpecsForm initialData={productData.specifications} onChange={handleSpecsChange} />;
      default:
        return <ErrorMessage message="Chưa chọn danh mục" />;
    }
  };

  const renderVariantsForm = () => {
    switch (category) {
      case 'iPhone':
        return <IPhoneVariantsForm initialVariants={productData.variants} onChange={handleVariantsChange} />;
      case 'iPad':
        return <IPadVariantsForm initialVariants={productData.variants} onChange={handleVariantsChange} />;
      case 'Mac':
        return <MacVariantsForm initialVariants={productData.variants} onChange={handleVariantsChange} />;
      case 'AirPods':
        return <AirPodsVariantsForm initialVariants={productData.variants} onChange={handleVariantsChange} />;
      case 'AppleWatch':
        return <AppleWatchVariantsForm initialVariants={productData.variants} onChange={handleVariantsChange} />;
      case 'Accessories':
        return <AccessoriesVariantsForm initialVariants={productData.variants} onChange={handleVariantsChange} />;
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
          isOpen={showCategoryModal}
          onClose={() => navigate('/warehouse/products')}
          onSelect={handleCategorySelect}
        />
      )}

      {category && (
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="specs">Thông số</TabsTrigger>
            <TabsTrigger value="variants">Biến thể</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ProductFormBasic initialData={productData} onChange={handleBasicChange} />
          </TabsContent>

          <TabsContent value="media">
            <ProductFormMedia initialImages={productData.images} onChange={handleMediaChange} />
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