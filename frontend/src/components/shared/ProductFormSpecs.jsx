import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const ProductFormSpecs = ({ formData, handleSpecChange, handleColorChange, addColor, removeColor }) => {
  console.log("formData.specifications.colors:", formData.specifications.colors); // Debug log

  const macSpecLabels = {
    chip: "Chip",
    gpuType: "Loại card đồ họa",
    ram: "Dung lượng RAM",
    storage: "Ổ cứng",
    screenSize: "Kích thước màn hình",
    screenTechnology: "Công nghệ màn hình",
    battery: "Pin",
    operatingSystem: "Hệ điều hành",
    screenResolution: "Độ phân giải màn hình",
    cpuType: "Loại CPU",
    ports: "Cổng giao tiếp",
  };

  const currentSpecs = formData.category === "Mac"
    ? ["chip", "gpuType", "ram", "storage", "screenSize", "screenTechnology", "battery", "operatingSystem", "screenResolution", "cpuType", "ports"]
    : ["screenSize", "cpu", "operatingSystem", "storage", "ram", "mainCamera", "frontCamera", "battery", "colors"];

  return (
    <div className="space-y-4">
      {formData.category === "Mac" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentSpecs.map((spec) => (
            <div key={spec} className="space-y-2">
              <Label>{macSpecLabels[spec]}</Label>
              <Input
                value={formData.specifications[spec] || ""}
                onChange={(e) => handleSpecChange(spec, e.target.value)}
                placeholder={`Nhập ${macSpecLabels[spec]}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentSpecs.map((spec) => (
            spec !== "colors" && (
              <div key={spec} className="space-y-2">
                <Label>{spec}</Label>
                <Input
                  value={formData.specifications[spec] || ""}
                  onChange={(e) => handleSpecChange(spec, e.target.value)}
                />
              </div>
            )
          ))}
          {formData.category !== "Mac" && (
            <div className="space-y-2 col-span-full">
              <Label>Màu sắc</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.isArray(formData.specifications.colors) ? (
                  formData.specifications.colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={color}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        className="w-32"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeColor(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-red-500">Error: Colors data is invalid</p>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addColor}>
                  <Plus className="w-3 h-3 mr-1" /> Thêm
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductFormSpecs;