import { useState } from 'react';
import { Input } from '@/components/ui/input.jsx'; // Fixed typo: @componets → @components
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';

const IPhoneVariantsForm = ({ variants, onVariantsChange }) => {
  const [newVariant, setNewVariant] = useState({
    color: '',
    images: [''],
    options: [{ storage: '', ram: '', cpuGpu: '', price: 0, originalPrice: 0, quantity: 0 }],
  });

  const addImage = () => {
    setNewVariant((prev) => ({ ...prev, images: [...prev.images, ''] }));
  };

  const updateImage = (index, value) => {
    const updatedImages = [...newVariant.images];
    updatedImages[index] = value;
    setNewVariant((prev) => ({ ...prev, images: updatedImages }));
  };

  const addOption = () => {
    setNewVariant((prev) => ({
      ...prev,
      options: [...prev.options, { storage: '', ram: '', cpuGpu: '', price: 0, originalPrice: 0, quantity: 0 }],
    }));
  };

  const updateOption = (index, field, value) => {
    const updatedOptions = [...newVariant.options];
    updatedOptions[index][field] = value;
    setNewVariant((prev) => ({ ...prev, options: updatedOptions }));
  };

  const addVariant = () => {
    onVariantsChange([...variants, newVariant]);
    setNewVariant({
      color: '',
      images: [''],
      options: [{ storage: '', ram: '', cpuGpu: '', price: 0, originalPrice: 0, quantity: 0 }],
    });
  };

  return (
    <div>
      <Label>Màu sắc</Label>
      <Input
        value={newVariant.color}
        onChange={(e) => setNewVariant((prev) => ({ ...prev, color: e.target.value }))}
        placeholder="Nhập màu sắc (e.g., Black)"
      />
      <Label>Ảnh cho màu</Label>
      {newVariant.images.map((img, index) => (
        <Input
          key={index}
          value={img}
          onChange={(e) => updateImage(index, e.target.value)}
          placeholder={`URL ảnh ${index + 1}`}
          className="mt-2"
        />
      ))}
      <Button type="button" onClick={addImage} className="mt-2">
        Thêm ảnh
      </Button>
      <Label className="mt-4 block">Tùy chọn biến thể</Label>
      {newVariant.options.map((opt, index) => (
        <div key={index} className="mt-2 border p-4">
          <Input
            value={opt.storage}
            onChange={(e) => updateOption(index, 'storage', e.target.value)}
            placeholder="Dung lượng (e.g., 128GB)"
          />
          <Input
            value={opt.ram}
            onChange={(e) => updateOption(index, 'ram', e.target.value)}
            placeholder="RAM (e.g., 6GB)"
            className="mt-2"
          />
          <Input
            value={opt.cpuGpu}
            onChange={(e) => updateOption(index, 'cpuGpu', e.target.value)}
            placeholder="CPU-GPU (e.g., A16 Bionic)"
            className="mt-2"
          />
          <Input
            type="number"
            value={opt.price}
            onChange={(e) => updateOption(index, 'price', e.target.value)}
            placeholder="Giá bán"
            className="mt-2"
          />
          <Input
            type="number"
            value={opt.originalPrice}
            onChange={(e) => updateOption(index, 'originalPrice', e.target.value)}
            placeholder="Giá gốc"
            className="mt-2"
          />
          <Input
            type="number"
            value={opt.quantity}
            onChange={(e) => updateOption(index, 'quantity', e.target.value)}
            placeholder="Số lượng"
            className="mt-2"
          />
        </div>
      ))}
      <Button type="button" onClick={addOption} className="mt-2">
        Thêm tùy chọn
      </Button>
      <Button type="button" onClick={addVariant} className="mt-4">
        Thêm biến thể
      </Button>
    </div>
  );
};

export default IPhoneVariantsForm;