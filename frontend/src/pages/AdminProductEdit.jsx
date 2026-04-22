import { useParams } from "react-router-dom";
import { ProductEditor } from "../components/ProductEditor";
import { createProduct, getProductById, updateProduct } from "../services/adminService";

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
      createProduct={createProduct}
      updateProduct={updateProduct}
    />
  );
}
