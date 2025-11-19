import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const CSVImporter = ({ category, api, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResults(null);
    } else {
      toast.error("Vui lòng chọn file CSV");
    }
  };

  const parseCSV = () => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });
  };

  const convertCSVToProduct = (rows) => {
    // Group rows by model (mỗi model là 1 product)
    const productsMap = {};

    rows.forEach((row) => {
      const model = row.model?.trim();
      if (!model) return;

      if (!productsMap[model]) {
        productsMap[model] = {
          name: row.name?.trim(),
          model: model,
          condition: row.condition || "NEW",
          description: row.description?.trim() || "",
          status: row.status || "AVAILABLE",
          featuredImages: row.featuredImages
            ? row.featuredImages
                .split("|")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          videoUrl: row.videoUrl?.trim() || "",
          specifications: {},
          variants: [],
        };

        // Specifications theo category
        if (category === "iPhone" || category === "iPad") {
          productsMap[model].specifications = {
            chip: row.chip?.trim(),
            ram: row.ram?.trim(),
            storage: row.storage_spec?.trim(),
            frontCamera: row.frontCamera?.trim(),
            rearCamera: row.rearCamera?.trim(),
            screenSize: row.screenSize?.trim(),
            screenTech: row.screenTech?.trim(),
            battery: row.battery?.trim(),
            os: row.os?.trim(),
            colors: [],
          };
        } else if (category === "Mac") {
          productsMap[model].specifications = {
            chip: row.chip?.trim(),
            gpu: row.gpu?.trim(),
            ram: row.ram_spec?.trim(),
            storage: row.storage_spec?.trim(),
            screenSize: row.screenSize?.trim(),
            screenResolution: row.screenResolution?.trim(),
            battery: row.battery?.trim(),
            os: row.os?.trim(),
            colors: [],
          };
        }
      }

      // Tìm hoặc tạo variant group theo color
      const color = row.color?.trim();
      if (!color) return;

      let variantGroup = productsMap[model].variants.find(
        (v) => v.color === color
      );
      if (!variantGroup) {
        variantGroup = {
          color: color,
          images: row.images
            ? row.images
                .split("|")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          options: [],
        };
        productsMap[model].variants.push(variantGroup);

        // Thêm color vào specifications.colors
        if (!productsMap[model].specifications.colors.includes(color)) {
          productsMap[model].specifications.colors.push(color);
        }
      }

      // Thêm option
      const option = {
        originalPrice: parseInt(row.originalPrice) || 0,
        price: parseInt(row.price) || 0,
        stock: parseInt(row.stock) || 0,
      };

      if (category === "iPhone") {
        option.storage = row.storage?.trim();
      } else if (category === "iPad") {
        option.storage = row.storage?.trim();
        option.connectivity = row.connectivity?.trim() || "WiFi";
      } else if (category === "Mac") {
        option.cpuGpu = row.cpuGpu?.trim();
        option.ram = row.ram?.trim();
        option.storage = row.storage?.trim();
      }

      variantGroup.options.push(option);
    });

    return Object.values(productsMap);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file CSV");
      return;
    }

    setIsProcessing(true);
    try {
      // Parse CSV
      const rows = await parseCSV();
      console.log("📊 CSV Rows:", rows);

      // Convert to products
      const products = convertCSVToProduct(rows);
      console.log("📦 Products:", products);

      if (products.length === 0) {
        throw new Error("Không có sản phẩm hợp lệ trong file CSV");
      }

      // Import từng product
      const importResults = {
        success: [],
        failed: [],
      };

      for (const product of products) {
        try {
          await api.create(product);
          importResults.success.push(product.name);
        } catch (error) {
          importResults.failed.push({
            name: product.name,
            error: error.response?.data?.message || error.message,
          });
        }
      }

      setResults(importResults);

      if (importResults.success.length > 0) {
        toast.success(
          `Import thành công ${importResults.success.length} sản phẩm`
        );
        onSuccess?.();
      }

      if (importResults.failed.length > 0) {
        toast.error(`${importResults.failed.length} sản phẩm thất bại`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Lỗi import: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <Button variant="outline" asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              Chọn file CSV
            </span>
          </Button>
        </label>

        {file && (
          <span className="text-sm text-muted-foreground">{file.name}</span>
        )}

        <Button onClick={handleImport} disabled={!file || isProcessing}>
          {isProcessing ? "Đang import..." : "Import"}
        </Button>
      </div>

      {results && (
        <div className="space-y-2 p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              Thành công: {results.success.length}
            </span>
          </div>
          {results.failed.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">
                  Thất bại: {results.failed.length}
                </span>
              </div>
              <ul className="text-sm text-red-600 ml-7 space-y-1">
                {results.failed.map((item, i) => (
                  <li key={i}>
                    {item.name}: {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVImporter;
