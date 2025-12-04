// ============================================
// FILE: frontend/src/components/admin/homepage/SectionItem.jsx
// ✅ UPDATED: Added icon for 'short-videos'
// ============================================

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useHomeLayoutStore } from "@/store/homeLayoutStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Image as ImageIcon,
  LayoutGrid,
  TrendingUp,
  Package,
  Grid3x3,
  Sparkles,
  Video, // ✅ NEW
} from "lucide-react";

// Section type icons
const SECTION_ICONS = {
  hero: ImageIcon,
  "promo-strip": Sparkles,
  "category-nav": LayoutGrid,
  "deals-grid": Grid3x3,
  "magic-deals": Sparkles,
  "products-new": TrendingUp,
  "products-topSeller": TrendingUp,
  "category-section": Package,
  "iphone-showcase": ImageIcon,
  "secondary-banners": ImageIcon,
  "short-videos": Video, // ✅ NEW
};

// Section type labels
const SECTION_LABELS = {
  hero: "Hero Banner",
  "promo-strip": "Promo Strip",
  "category-nav": "Danh mục sản phẩm",
  "deals-grid": "Deals Grid",
  "magic-deals": "Magic Deals",
  "products-new": "Sản phẩm mới",
  "products-topSeller": "Sản phẩm bán chạy",
  "category-section": "Danh mục",
  "iphone-showcase": "iPhone Showcase",
  "secondary-banners": "Secondary Banners",
  "short-videos": "Video ngắn", // ✅ NEW
};

const SectionItem = ({ section, onEdit }) => {
  const { toggleSection } = useHomeLayoutStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = SECTION_ICONS[section.type] || Package;
  const label = SECTION_LABELS[section.type] || section.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 ${
        isDragging ? "shadow-lg z-50" : "shadow-sm"
      } ${!section.enabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Section Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            section.enabled
              ? "bg-blue-50 text-blue-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Section Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {section.title || label}
            </h3>
            {section.type === "category-section" &&
              section.config?.categoryFilter && (
                <Badge variant="outline" className="text-xs">
                  {section.config.categoryFilter}
                </Badge>
              )}
            {section.type === "short-videos" && section.config?.videoType && (
              <Badge variant="outline" className="text-xs">
                {section.config.videoType === "trending"
                  ? "Trending"
                  : "Mới nhất"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {section.type} • Order: {section.order}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Visibility Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={section.enabled}
              onCheckedChange={() => toggleSection(section.id)}
            />
            {section.enabled ? (
              <Eye className="w-4 h-4 text-green-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* Edit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SectionItem;
