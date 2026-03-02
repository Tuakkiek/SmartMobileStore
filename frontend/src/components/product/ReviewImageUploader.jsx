import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { reviewAPI } from "@/lib/api";

const isTruthyEnvValue = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const isCloudUploadEnabled = isTruthyEnvValue(
  import.meta.env.VITE_FEATURE_REVIEW_CLOUD_UPLOAD,
  true
);

const base64ToBlob = (base64Data) => {
  const parts = base64Data.split(",");
  const metadata = parts[0] || "";
  const rawData = parts[1] || "";
  const mimeMatch = metadata.match(/^data:(.*);base64$/i);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const byteCharacters = atob(rawData);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
};

const ReviewImageUploader = ({
  images = [],
  onChange,
  maxImages = 5,
  onUploadingChange,
}) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (typeof onUploadingChange === "function") {
      onUploadingChange(isUploading);
    }
  }, [isUploading, onUploadingChange]);

  const compressImage = (file, maxWidth = 1200, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", quality));
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const uploadToCloudinary = async (base64Image, originalName, signatureData) => {
    const formData = new FormData();
    const blob = base64ToBlob(base64Image);
    const cloudinaryFileName = `${Date.now()}-${originalName.replace(/\s+/g, "-")}`;

    formData.append("file", blob, cloudinaryFileName);
    formData.append("api_key", signatureData.apiKey);
    formData.append("timestamp", String(signatureData.timestamp));
    formData.append("signature", signatureData.signature);
    formData.append("folder", signatureData.folder);
    formData.append("upload_preset", signatureData.uploadPreset);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || uploadResult?.error?.message) {
      throw new Error(uploadResult?.error?.message || "Cloud upload failed");
    }

    return uploadResult.secure_url;
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`You can upload up to ${maxImages} images`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newImages = [];

    setIsUploading(true);
    toast.loading("Processing images...", { id: "review-image-upload" });

    try {
      let signatureData = null;
      if (isCloudUploadEnabled) {
        const signatureResponse = await reviewAPI.getUploadSignature("image");
        signatureData = signatureResponse?.data?.data;
        if (
          !signatureData?.cloudName ||
          !signatureData?.apiKey ||
          !signatureData?.timestamp ||
          !signatureData?.signature
        ) {
          throw new Error("Upload signature response is incomplete");
        }
      }

      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB`);
          continue;
        }

        try {
          const compressedBase64 = await compressImage(file);

          if (isCloudUploadEnabled) {
            const secureUrl = await uploadToCloudinary(
              compressedBase64,
              file.name,
              signatureData
            );
            newImages.push(secureUrl);
          } else {
            newImages.push(compressedBase64);
          }
        } catch (error) {
          console.error("Review image upload failed:", error);
          toast.error(`Cannot process ${file.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("Failed to initialize review image upload:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Cannot upload images right now"
      );
    } finally {
      toast.dismiss("review-image-upload");
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
      toast.success(`Added ${newImages.length} image(s)`);
    }
  };

  const handleRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
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

              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2 border-dashed"
            disabled={isUploading}
          >
            <Upload className="w-4 h-4" />
            {isUploading
              ? "Uploading..."
              : `Add images (${images.length}/${maxImages})`}
          </Button>

          <p className="text-xs text-gray-500 mt-2">
            JPG, PNG, WebP • Max 10MB/image • Auto-compress • Max {maxImages} images
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewImageUploader;
