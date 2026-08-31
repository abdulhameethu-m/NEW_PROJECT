import { useLocation } from "react-router-dom";
import { ProductEditor } from "../components/ProductEditor";
import { createProduct, generateAdminProductNumber, getProductById, updateProduct, uploadAdminProductImages } from "../services/adminService";
import { useAdminSession } from "../hooks/useAdminSession";

export function AdminProductCreate() {
  const { basePath } = useAdminSession();

  return (
    <ProductEditor
      mode="admin"
      title="Create Product"
      createLabel="Create Product"
      updateLabel="Update Product"
      backTo={`${basePath}/products`}
      listPath={`${basePath}/products`}
      fetchProduct={getProductById}
      generateProductNumber={generateAdminProductNumber}
      createProduct={createProduct}
      updateProduct={updateProduct}
      uploadImages={uploadAdminProductImages}
    />
  );
}
