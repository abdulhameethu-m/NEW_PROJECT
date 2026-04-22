import { ProductEditor } from "../components/ProductEditor";
import { createProduct, getProductById, updateProduct } from "../services/adminService";

export function AdminProductCreate() {
  return (
    <ProductEditor
      mode="admin"
      title="Create Product"
      createLabel="Create Product"
      updateLabel="Update Product"
      backTo="/admin/products"
      listPath="/admin/products"
      fetchProduct={getProductById}
      createProduct={createProduct}
      updateProduct={updateProduct}
    />
  );
}
