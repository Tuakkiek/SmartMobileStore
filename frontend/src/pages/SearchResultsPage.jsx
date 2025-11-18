import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shared/ProductCard";
import { Loading } from "@/components/shared/Loading";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const SEARCH_CATEGORIES = [
  { id: "iphone", name: "iPhone", api: iPhoneAPI, route: "dien-thoai" },
  { id: "ipad", name: "iPad", api: iPadAPI, route: "may-tinh-bang" },
  { id: "mac", name: "Mac", api: macAPI, route: "macbook" },
  { id: "airpods", name: "AirPods", api: airPodsAPI, route: "tai-nghe" },
  { id: "watch", name: "Apple Watch", api: appleWatchAPI, route: "apple-watch" },
  { id: "accessories", name: "Phụ kiện", api: accessoryAPI, route: "phu-kien" },
];

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get("s") || "";

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        navigate("/");
        return;
      }

      setIsLoading(true);
      try {
        const searchPromises = SEARCH_CATEGORIES.map(async (category) => {
          try {
            const response = await category.api.getAll({
              search: searchQuery,
              limit: 100,
            });
            const products = response.data?.data?.products || [];
            return products.map((product) => ({
              ...product,
              _category: category.route,
              _categoryName: category.name,
            }));
          } catch (error) {
            return [];
          }
        });

        const allResults = await Promise.all(searchPromises);
        setResults(allResults.flat());
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, navigate]);

  if (isLoading) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-gray-400" />
          <h1 className="text-2xl font-bold">
            Kết quả tìm kiếm cho "{searchQuery}"
          </h1>
        </div>

        <p className="text-gray-600">
          Tìm thấy {results.length} sản phẩm
        </p>
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              showVariantsBadge={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Không tìm thấy kết quả
          </h3>
          <p className="text-gray-600 mb-6">
            Không có sản phẩm nào phù hợp với "{searchQuery}"
          </p>
          <Button onClick={() => navigate("/")}>
            Quay về trang chủ
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;