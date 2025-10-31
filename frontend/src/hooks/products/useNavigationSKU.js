import { useNavigate } from "react-router-dom";

export const useNavigationSKU = () => {
  const navigate = useNavigate();

  const goToProductPage = (category, model, sku) => {
    const baseSlug = `${category.toLowerCase()}-${model.replace(/\s+/g, "-").toLowerCase()}`;
    navigate(`/${baseSlug}?sku=${sku}`, { replace: true });
  };

  return { goToProductPage };
};