// ============================================
// FILE: frontend/src/components/admin/homepage/SectionEditorModal.jsx
// Modal for editing section configuration
// ============================================

import React, { useState, useEffect } from "react";
import { useHomeLayoutStore } from "@/store/homeLayoutStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "./ImageUploader";
import { toast } from "sonner";

const SectionEditorModal = ({ section, open, onClose }) => {
  const { updateSectionConfig } = useHomeLayoutStore();
  const [formData, setFormData] = useState({
    title: "",
    config: {},
  });

  useEffect(() => {
    if (section) {
      setFormData({
        title: section.title || "",
        config: section.config || {},
      });
    }
  }, [section]);

  const handleSave = () => {
    if (!section) return;

    updateSectionConfig(section.id, formData.config, formData.title);
    toast.success("Đã cập nhật section");
    onClose();
  };

  const renderConfigFields = () => {
    if (!section) return null;

    switch (section.type) {
      case "hero":
      case "secondary-banners":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Banner Images</Label>
                <ImageUploader
                  images={formData.config.images || []}
                  onChange={(images) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, images },
                    })
                  }
                />
              </div>

              <div>
                <Label>Links (1 per line, matching image order)</Label>
                <Textarea
                  value={(formData.config.links || []).join("\n")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        links: e.target.value.split("\n").filter(Boolean),
                      },
                    })
                  }
                  rows={5}
                  placeholder="/dien-thoai&#10;/may-tinh-bang&#10;/macbook"
                />
              </div>
            </div>
          </>
        );

      case "deals-grid":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Deal Images (6 ảnh)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Hiển thị trong lưới deals
                </p>
                <ImageUploader
                  images={
                    formData.config.dealImages || formData.config.images || []
                  }
                  onChange={(images) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        images,
                        dealImages: images,
                      },
                    })
                  }
                />
              </div>

              <div>
                <Label>Deal Links (1 per line)</Label>
                <Textarea
                  value={(
                    formData.config.dealLinks ||
                    formData.config.links ||
                    []
                  ).join("\n")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        links: e.target.value.split("\n").filter(Boolean),
                        dealLinks: e.target.value.split("\n").filter(Boolean),
                      },
                    })
                  }
                  rows={6}
                  placeholder="/products?category=iPhone&#10;/products?category=iPad"
                />
              </div>
            </div>
          </>
        );

      case "magic-deals":
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Banner chính (bên trái)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Chỉ upload 1 ảnh banner cho phần bên trái. 8 sản phẩm bên phải
                  sẽ tự động hiển thị sản phẩm có % giảm giá cao nhất.
                </p>
                <ImageUploader
                  images={formData.config.images?.slice(0, 1) || []}
                  onChange={(images) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        images: images.slice(0, 1), // Chỉ lấy 1 ảnh
                      },
                    })
                  }
                />
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <strong className="text-blue-900">Lưu ý:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-blue-800">
                  <li>Banner bên trái: Có thể tùy chỉnh</li>
                  <li>8 sản phẩm bên phải: Tự động hiển thị top giảm giá</li>
                  <li>Click vào sản phẩm để xem chi tiết</li>
                </ul>
              </div>
            </div>
          </>
        );
        return (
          <>
            <div className="space-y-4">
              <div>
                <Label>Magic Deals Images (9 ảnh)</Label>
                <p className="text-xs text-gray-500 mb-2">
                  1 banner chính + 8 ảnh danh mục (4+4)
                </p>
                <ImageUploader
                  images={formData.config.images || []}
                  onChange={(images) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        images,
                      },
                    })
                  }
                />
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Thứ tự ảnh:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ảnh 1: Banner chính (bên trái)</li>
                  <li>Ảnh 2-5: Khối danh mục 1 (trên phải)</li>
                  <li>Ảnh 6-9: Khối danh mục 2 (dưới phải)</li>
                </ul>
              </div>
            </div>
          </>
        );
      case "products-new":
      case "products-topSeller":
        return (
          <div>
            <Label>Product Limit</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.config.limit || 10}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    limit: parseInt(e.target.value) || 10,
                  },
                })
              }
            />
          </div>
        );

      case "category-section":
        return (
          <>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.config.categoryFilter || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, categoryFilter: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iPhone">iPhone</SelectItem>
                  <SelectItem value="iPad">iPad</SelectItem>
                  <SelectItem value="Mac">Mac</SelectItem>
                  <SelectItem value="AirPods">AirPods</SelectItem>
                  <SelectItem value="AppleWatch">Apple Watch</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Product Limit</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.config.limit || 10}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      limit: parseInt(e.target.value) || 10,
                    },
                  })
                }
              />
            </div>
          </>
        );

      case "iphone-showcase":
        return (
          <div>
            <Label>Showcase Items (JSON format)</Label>
            <Textarea
              value={JSON.stringify(
                formData.config.showcaseItems || [],
                null,
                2
              )}
              onChange={(e) => {
                try {
                  const items = JSON.parse(e.target.value);
                  setFormData({
                    ...formData,
                    config: { ...formData.config, showcaseItems: items },
                  });
                } catch (err) {
                  // Invalid JSON, ignore
                }
              }}
              rows={10}
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: [{`{title, subtitle, image, link}`}, ...]
            </p>
          </div>
        );

      default:
        return (
          <div className="text-gray-500 text-sm">
            No configuration needed for this section type.
          </div>
        );
    }
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Section: {section.type}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section Title */}
          <div>
            <Label>Section Title (Display Name)</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Sản phẩm mới"
            />
          </div>

          {/* Config Fields */}
          {renderConfigFields()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>Lưu thay đổi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SectionEditorModal;
