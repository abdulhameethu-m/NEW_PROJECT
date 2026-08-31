import { useLocation,  useParams  } from "react-router-dom";
import { ProductEditor } from "../components/ProductEditor";
import { createProduct, generateAdminProductNumber, getProductById, updateProduct, uploadAdminProductImages } from "../services/adminService";
import { useAdminSession } from "../hooks/useAdminSession";

export function AdminProductEdit() {
  const { id } = useParams();
  const { basePath } = useAdminSession();

  return (
    <ProductEditor
      mode="admin"
      productId={id}
      title="Edit Product"
      createLabel="Create Product"
      updateLabel="Save Changes"
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
