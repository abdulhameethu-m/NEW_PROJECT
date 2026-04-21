import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { BackButton } from "../components/BackButton";
import { useCategories } from "../hooks/useCategories";
import * as productService from "../services/productService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

export function ProductFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  const isEditing = !!productId;
  const isAdmin = user?.role === "admin";
  const { categories, loading: categoriesLoading } = useCategories();

  const [loading, setLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    category: "",
    subCategory: "",
    price: "",
    discountPrice: "",
    currency: "INR",
    stock: "",
    SKU: "",
    lowStockThreshold: 10,
    images: [],
    tags: "",
    weight: "",
    warranty: "",
    returnPolicy: "",
    metaDescription: "",
    metaKeywords: "",
  });

  const [imageUrl, setImageUrl] = useState("");

  // Load product if editing
  useEffect(() => {
    if (!isEditing) return;

    (async () => {
      try {
        const res = await productService.getProductById(productId);
        const product = res.data;
        setFormData({
          name: product.name || "",
          slug: product.slug || "",
          description: product.description || "",
          shortDescription: product.shortDescription || "",
          category: product.category || "",
          subCategory: product.subCategory || "",
          price: product.price?.toString() || "",
          discountPrice: product.discountPrice?.toString() || "",
          currency: product.currency || "INR",
          stock: product.stock?.toString() || "",
          SKU: product.SKU || "",
          lowStockThreshold: product.lowStockThreshold || 10,
          images: product.images || [],
          tags: product.tags?.join(", ") || "",
          weight: product.weight?.toString() || "",
          warranty: product.warranty || "",
          returnPolicy: product.returnPolicy || "",
          metaDescription: product.metaDescription || "",
          metaKeywords: product.metaKeywords?.join(", ") || "",
        });
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) {
      alert("Please enter an image URL");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url: imageUrl,
          altText: `${formData.name} - Image ${prev.images.length + 1}`,
          isPrimary: prev.images.length === 0,
        },
      ],
    }));
    setImageUrl("");
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // Ensure at least one is primary
      if (newImages.length > 0 && !newImages.some((img) => img.isPrimary)) {
        newImages[0].isPrimary = true;
      }
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Product description is required");
      return;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Valid price is required");
      return;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      setError("Valid stock quantity is required");
      return;
    }
    if (!formData.SKU.trim()) {
      setError("SKU is required");
      return;
    }
    if (formData.images.length === 0) {
      setError("At least one product image is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        category: formData.category,
        subCategory: formData.subCategory,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : undefined,
        currency: formData.currency,
        stock: parseInt(formData.stock),
        SKU: formData.SKU.toUpperCase(),
        lowStockThreshold: formData.lowStockThreshold,
        images: formData.images,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        warranty: formData.warranty,
        returnPolicy: formData.returnPolicy,
        metaDescription: formData.metaDescription,
        metaKeywords: formData.metaKeywords
          .split(",")
          .map((key) => key.trim())
          .filter(Boolean),
      };

      if (isEditing) {
        await productService.updateProduct(productId, payload);
      } else {
        await productService.createProduct(payload);
      }

      setError("");
      
      if (isAdmin) {
        alert(isEditing ? "Product updated!" : "Product created and automatically approved!");
        navigate("/admin/products");
      } else {
        alert(isEditing ? "Product updated!" : "Product created! It's now awaiting admin approval.");
        navigate("/seller/products");
      }
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <div className="text-sm text-slate-600">Loading product...</div>
      </div>
    );

  return (
    <div className="grid gap-4 sm:gap-6 px-3 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {isEditing ? "Edit Product" : "Create New Product"}
          </h1>
          {!isEditing && (
            <p className="mt-1 text-sm text-slate-600">
              Fill in the details below. Your product will be reviewed by our team before being
              published.
            </p>
          )}
        </div>
        <BackButton fallbackTo={isAdmin ? "/dashboard/admin" : "/dashboard/vendor"} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm dark:shadow-slate-950">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Basic Information</h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Premium Wireless Headphones"
                maxLength={255}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-slate-500">{formData.name.length}/255</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide detailed product description..."
                maxLength={5000}
                rows={4}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-slate-500">{formData.description.length}/5000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Short Description
              </label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="Brief description for listings"
                maxLength={500}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Category & Classification */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm dark:shadow-slate-950">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Category & Classification</h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
                disabled={categoriesLoading || categories.length === 0}
              >
                <option value="">
                  {categoriesLoading ? "Loading categories..." : categories.length ? "Select a category" : "No active categories available"}
                </option>
                {categories.map((category) => (
                  <option key={category._id || category.slug} value={category.name}>
                    {category.name}
                  </option>
                ))}
                {formData.category && !categories.some((category) => category.name === formData.category) ? (
                  <option value={formData.category}>{formData.category}</option>
                ) : null}
              </select>
              {!categoriesLoading && categories.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Ask an admin to create and enable categories first.</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Subcategory
              </label>
              <input
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                placeholder="e.g., Audio, Mobile Phones"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., wireless, headphones, audio (comma-separated)"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm dark:shadow-slate-950">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pricing & Inventory</h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Price * ($)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="99.99"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Discount Price</label>
              <input
                type="number"
                name="discountPrice"
                value={formData.discountPrice}
                onChange={handleChange}
                placeholder="79.99"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Stock * (units)</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="100"
                min="0"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">SKU *</label>
              <input
                type="text"
                name="SKU"
                value={formData.SKU}
                onChange={handleChange}
                placeholder="WH-1000XM5"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase"
                required
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Product Images *</h2>

          <div className="mt-4 space-y-4">
            {/* Add Image */}
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Image
              </button>
            </div>

            {/* Image List */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative overflow-hidden rounded border bg-slate-100">
                    <img
                      src={img.url}
                      alt={img.altText}
                      className="h-32 w-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/200?text=Image+Error";
                      }}
                    />
                    {img.isPrimary && (
                      <div className="absolute top-1 left-1 rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                        Primary
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute bottom-1 right-1 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Additional Details</h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="0.25"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Warranty</label>
              <input
                type="text"
                name="warranty"
                value={formData.warranty}
                onChange={handleChange}
                placeholder="e.g., 2 Years Manufacturer Warranty"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Return Policy</label>
              <textarea
                name="returnPolicy"
                value={formData.returnPolicy}
                onChange={handleChange}
                placeholder="e.g., 30 days money-back guarantee"
                rows={2}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm dark:shadow-slate-950\">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100\">SEO Details</h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Meta Description
              </label>
              <input
                type="text"
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                placeholder="Brief description for search engines (max 160 chars)"
                maxLength={160}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">{formData.metaDescription.length}/160</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Meta Keywords
              </label>
              <input
                type="text"
                name="metaKeywords"
                value={formData.metaKeywords}
                onChange={handleChange}
                placeholder="keyword1, keyword2, keyword3"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-blue-600 dark:bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update Product"
                : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/seller/products")}
            className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
