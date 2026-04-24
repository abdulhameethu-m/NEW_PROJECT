import { useParams } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { ProductEditor } from "../components/ProductEditor";
import * as productService from "../services/productService";
import * as vendorDashboardService from "../services/vendorDashboardService";

export function ProductFormPage() {
  const { productId } = useParams();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  return (
    <ProductEditor
      mode={isAdmin ? "admin" : "vendor"}
      productId={productId}
      title={productId ? "Edit Product" : "Create Product"}
      createLabel="Create Product"
      updateLabel="Update Product"
      backTo={isAdmin ? "/admin/products" : "/vendor/products"}
      listPath={isAdmin ? "/admin/products" : "/vendor/products"}
      fetchProduct={productService.getProductById}
      createProduct={isAdmin ? productService.createProduct : vendorDashboardService.createVendorProduct}
      updateProduct={isAdmin ? productService.updateProduct : vendorDashboardService.updateVendorProduct}
    />
  );
}
