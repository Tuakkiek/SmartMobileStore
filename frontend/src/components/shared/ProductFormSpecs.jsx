import React from "react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const ProductFormSpecs = ({ formData, handleSpecChange, handleColorChange, addColor, removeColor }) => {
  console.log("formData.specifications.colors:", formData.specifications.colors); // Debug log

  // Object mapping cho tất cả các thông số với nhãn tiếng Việt
  const specLabels = {
    // Thông số chung
    screenSize: "Kích thước màn hình",
    cpu: "CPU",
    operatingSystem: "Hệ điều hành",
    storage: "Bộ nhớ trong",
    ram: "RAM",
    battery: "Pin",
    
    // Thông số camera (cho iPhone, iPad)
    mainCamera: "Camera sau",
    frontCamera: "Camera trước",
    
    // Thông số Mac
    chip: "Chip",
    gpuType: "GPU",
    screenTechnology: "Công nghệ màn hình",
    screenResolution: "Độ phân giải màn hình",
    cpuType: "Loại CPU",
    ports: "Cổng kết nối",
  };

  const macSpecLabels = {
    chip: "Chip",
    gpuType: "GPU",
    ram: "RAM",
    storage: "Bộ nhớ trong",
    screenSize: "Kích thước màn hình",
    screenTechnology: "Công nghệ màn hình",
    battery: "Pin",
    operatingSystem: "Hệ điều hành",
    screenResolution: "Độ phân giải màn hình",
    cpuType: "Loại CPU",
    ports: "Cổng kết nối",
  };

  const currentSpecs = formData.category === "Mac"
    ? ["chip", "gpuType", "ram", "storage", "screenSize", "screenTechnology", "battery", "operatingSystem", "screenResolution", "cpuType", "ports"]
    : ["screenSize", "cpu", "operatingSystem", "storage", "ram", "mainCamera", "frontCamera", "battery", "colors"];

  // Hàm lấy nhãn phù hợp cho từng loại thiết bị
  const getSpecLabel = (spec, category) => {
    if (category === "Mac") {
      return macSpecLabels[spec] || spec;
    }
    return specLabels[spec] || spec;
  };

  return (
    <div className="space-y-4">
      {formData.category === "Mac" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentSpecs.map((spec) => (
            <div key={spec} className="space-y-2">
              <Label>{getSpecLabel(spec, "Mac")}</Label>
              <Input
                value={formData.specifications[spec] || ""}
                onChange={(e) => handleSpecChange(spec, e.target.value)}
                placeholder={`VD: ${getSpecLabel(spec, "Mac")}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentSpecs.map((spec) => (
            spec !== "colors" && (
              <div key={spec} className="space-y-2">
                <Label>{getSpecLabel(spec, formData.category)}</Label>
                <Input
                  value={formData.specifications[spec] || ""}
                  onChange={(e) => handleSpecChange(spec, e.target.value)}
                  placeholder={`VD: ${getSpecLabel(spec, formData.category)}`}
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
                        placeholder="VD: Đen, Trắng, Xanh dương"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeColor(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-red-500">Lỗi: Dữ liệu màu sắc không hợp lệ</p>
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