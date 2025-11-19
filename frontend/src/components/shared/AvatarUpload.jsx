// components/shared/AvatarUpload.jsx
import React, { useState } from "react";
import { Camera, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AvatarUpload = ({ currentAvatar, userName, onUpload }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước ảnh không được vượt quá 2MB");
      return;
    }

    setUploading(true);

    // Convert to base64 or upload to cloud (Cloudinary, AWS S3, etc.)
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      await onUpload(base64String);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative w-20 h-20 cursor-pointer group">
            <Avatar className="w-20 h-20">
              {currentAvatar && <AvatarImage src={currentAvatar} alt={userName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <label className="cursor-pointer">
              <Camera className="w-4 h-4 mr-2 inline" />
              Thay đổi ảnh đại diện
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </DropdownMenuItem>

          {currentAvatar && (
            <DropdownMenuItem onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Xem ảnh đại diện
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ảnh đại diện</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <img
              src={currentAvatar}
              alt={userName}
              className="max-w-full max-h-96 rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {uploading && (
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </>
  );
};