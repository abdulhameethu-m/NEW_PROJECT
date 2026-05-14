import { ProductEditor } from "../components/ProductEditor";
import { createProduct, generateAdminProductNumber, getProductById, updateProduct, uploadAdminProductImages } from "../services/adminService";

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
      generateProductNumber={generateAdminProductNumber}
      createProduct={createProduct}
      updateProduct={updateProduct}
      uploadImages={uploadAdminProductImages}
    />
  );
}
