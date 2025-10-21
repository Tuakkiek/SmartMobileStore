import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { productAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [images, setImages] = useState([]);
  const [price, setPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRes = await productAPI.getById(id);
        const productData = productRes.data.data.product;
        setProduct(productData);

        const variantsRes = await productAPI.getVariants(id);
        const variantsList = variantsRes.data.data.variants;
        setVariants(variantsList);

        const defaultColor = variantsList[0]?.color || 'white';
        const defaultStorage = variantsList[0]?.attributes.storage || '';
        setSelectedColor(defaultColor);
        setSelectedStorage(defaultStorage);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (selectedColor && selectedStorage) {
      const fetchVariant = async () => {
        try {
          const res = await fetch(`/api/variants?productId=${id}&color=${selectedColor}&storage=${selectedStorage}`);
          const data = await res.json();
          if (data.success) {
            setImages(data.data.images);
            setPrice(data.data.price);
          }
        } catch (error) {
          console.error("Error fetching variant:", error);
        }
      };
      fetchVariant();
    }
  }, [id, selectedColor, selectedStorage]);

  if (isLoading) return <div className="container mx-auto py-12 text-center">Loading...</div>;

  if (!product) return <div className="container mx-auto py-12 text-center">Sản phẩm không tồn tại</div>;

  const availableColors = [...new Set(variants.map(v => v.color))];
  const availableStorages = [...new Set(variants.filter(v => v.color === selectedColor).map(v => v.attributes.storage))];

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img src={images[0] || product.images[0]} alt={product.name} className="w-full h-auto" />
          <div className="grid grid-cols-4 gap-2 mt-4">
            {images.map((img, idx) => (
              <img key={idx} src={img} alt={`Image ${idx}`} className="w-full h-auto" />
            ))}
          </div>
        </div>
        <div>
          <div className="space-y-4">
            <label>
              Màu sắc:
              <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Dung lượng:
              <select value={selectedStorage} onChange={(e) => setSelectedStorage(e.target.value)}>
                {availableStorages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            </label>
          </div>
          <p className="text-2xl font-bold mt-4">{formatPrice(price)}</p>
          {/* Add to cart button and other details */}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;