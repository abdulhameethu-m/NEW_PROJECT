import { useParams } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { ProductEditor } from "../components/ProductEditor";
import * as productService from "../services/productService";

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
      backTo={isAdmin ? "/admin/products" : "/seller/products"}
      listPath={isAdmin ? "/admin/products" : "/seller/products"}
      fetchProduct={productService.getProductById}
      createProduct={productService.createProduct}
      updateProduct={productService.updateProduct}
    />
  );
}
