import { ProductEditor } from "../components/ProductEditor";
import { createProduct, generateAdminProductNumber, getProductById, updateProduct } from "../services/adminService";

export function StaffProductCreate() {
  return (
    <ProductEditor
      mode="admin"
      title="Create Product"
      createLabel="Create Product"
      updateLabel="Update Product"
      backTo="/staff/products"
      listPath="/staff/products"
      fetchProduct={getProductById}
      generateProductNumber={generateAdminProductNumber}
      createProduct={createProduct}
      updateProduct={updateProduct}
    />
  );
}
