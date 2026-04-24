import { useParams } from "react-router-dom";
import { ProductEditor } from "../components/ProductEditor";
import { createProduct, generateAdminProductNumber, getProductById, updateProduct } from "../services/adminService";

export function AdminProductEdit() {
  const { id } = useParams();

  return (
    <ProductEditor
      mode="admin"
      productId={id}
      title="Edit Product"
      createLabel="Create Product"
      updateLabel="Save Changes"
      backTo="/admin/products"
      listPath="/admin/products"
      fetchProduct={getProductById}
      generateProductNumber={generateAdminProductNumber}
      createProduct={createProduct}
      updateProduct={updateProduct}
    />
  );
}
