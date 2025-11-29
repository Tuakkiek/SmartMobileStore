// ============================================
// FILE: frontend/src/components/admin/homepage/ImageUploader.jsx
// Component for uploading and managing banner images
// ============================================

import React, { useRef } from "react";
import { useHomeLayoutStore } from "@/store/homeLayoutStore";
import { Button } from "@/components/ui/button";
import { Upload, X, Plus } from "lucide-react";
import { toast } from "sonner";

const ImageUploader = ({ images = [], onChange }) => {
  const fileInputRef = useRef(null);
  const { uploadBanner, deleteBanner } = useHomeLayoutStore();

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} không phải là file ảnh`);
        continue;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} vượt quá 5MB`);
        continue;
      }

      // Upload
      const imagePath = await uploadBanner(file);
      if (imagePath) {
        onChange([...images, imagePath]);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index) => {
    const imagePath = images[index];

    // Remove from list immediately
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);

    // Delete from server if it's an uploaded file
    if (imagePath?.startsWith("/uploads/")) {
      await deleteBanner(imagePath);
    }
  };

  const handleUrlAdd = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      onChange([...images, url]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Image List */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border group"
          >
            <img
              src={image}
              alt={`Banner ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/placeholder.png";
              }}
            />

            {/* Remove Button */}
            <button
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Image Index */}
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              #{index + 1}
            </div>
          </div>
        ))}

        {/* Upload Trigger */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Upload className="w-6 h-6" />
          <span className="text-xs font-medium">Upload Image</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload from Device
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUrlAdd}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Image URL
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Accepted: JPG, PNG, GIF, WebP • Max size: 5MB • Order matters (drag to
        reorder coming soon)
      </p>
    </div>
  );
};

export default ImageUploader;
