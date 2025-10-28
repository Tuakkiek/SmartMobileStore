import { useNavigate } from "react-router-dom";

export const useNavigationSKU = () => {
  const navigate = useNavigate();

  const goToProductPage = (category, model, sku) => {
    const slug = `${category.toLowerCase()}-${model.replace(/\s+/g, "-")}`;
    navigate(`/${slug}?sku=${sku}`, { replace: true });
  };

  return { goToProductPage };
};
