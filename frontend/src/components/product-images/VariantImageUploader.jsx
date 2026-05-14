import { ProductImageUploader } from "./ProductImageUploader";

export function VariantImageUploader(props) {
  return (
    <ProductImageUploader
      compact
      title="Upload Variant Images"
      description="Drop variant-specific images here or browse from your device."
      helperText="Variant gallery supports multiple images with automatic storefront switching."
      {...props}
    />
  );
}
