// ============================================
// FILE: frontend/src/components/product/ReviewImageUploader.jsx
// ✅ WITH IMAGE COMPRESSION to reduce payload size
// ============================================

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

const ReviewImageUploader = ({ images = [], onChange, maxImages = 5 }) => {
  const fileInputRef = useRef(null);

  // ✅ COMPRESS IMAGE BEFORE UPLOAD
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Chỉ được tải lên tối đa ${maxImages} ảnh`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newImages = [];

    toast.loading("Đang xử lý ảnh...", { id: "compress-images" });

    for (const file of filesToProcess) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} không phải là file ảnh`);
        continue;
      }

      // Validate file size (raw - before compression)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} quá lớn (tối đa 10MB)`);
        continue;
      }

      try {
        // ✅ COMPRESS IMAGE
        const compressedBase64 = await compressImage(file);

        // Check compressed size
        const compressedSize = Math.round((compressedBase64.length * 3) / 4); // Approximate size in bytes
        console.log(
          `Compressed ${file.name}: ${(compressedSize / 1024).toFixed(2)}KB`
        );

        newImages.push(compressedBase64);
      } catch (error) {
        console.error("Error compressing file:", error);
        toast.error(`Không thể xử lý ${file.name}`);
      }
    }

    toast.dismiss("compress-images");

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
      toast.success(`Đã thêm ${newImages.length} ảnh`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border group"
            >
              <img
                src={image}
                alt={`Review ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Image Index */}
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2 border-dashed"
          >
            <Upload className="w-4 h-4" />
            Thêm ảnh ({images.length}/{maxImages})
          </Button>

          <p className="text-xs text-gray-500 mt-2">
            JPG, PNG, GIF • Tối đa 10MB/ảnh • Tự động nén • Tối đa {maxImages}{" "}
            ảnh
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewImageUploader;
