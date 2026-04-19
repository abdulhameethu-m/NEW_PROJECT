import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProductById, updateProduct } from "../services/adminService";
import { BackButton } from "../components/BackButton";

export function AdminProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDescription: "",
    category: "",
    subCategory: "",
    price: "",
    stock: "",
    SKU: "",
    lowStockThreshold: "10",
    images: [],
    tags: "",
    discountPrice: "",
  });

  const [imageUrl, setImageUrl] = useState("");
  const [imageAltText, setImageAltText] = useState("");

  function normalizeError(err) {
    return err?.response?.data?.message || err?.message || "Request failed";
  }

  // Load product data
  useEffect(() => {
    async function loadProduct() {
      try {
        const result = await getProductById(id);
        const product = result.data;

        setFormData({
          name: product.name || "",
          description: product.description || "",
          shortDescription: product.shortDescription || "",
          category: product.category || "",
          subCategory: product.subCategory || "",
          price: product.price || "",
          stock: product.stock || "",
          SKU: product.SKU || "",
          lowStockThreshold: product.lowStockThreshold || 10,
          images: product.images || [],
          tags: (product.tags || []).join(", "),
          discountPrice: product.discountPrice || "",
        });
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) {
      setError("Please enter an image URL");
      return;
    }

    const newImage = {
      url: imageUrl,
      altText: imageAltText || formData.name,
      isPrimary: formData.images.length === 0,
    };

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImage],
    }));

    setImageUrl("");
    setImageAltText("");
    setError("");
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSetPrimary = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      })),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      setError("Stock cannot be negative");
      return;
    }
    if (!formData.SKU.trim()) {
      setError("SKU is required");
      return;
    }
    if (formData.images.length === 0) {
      setError("At least one image is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        category: formData.category,
        subCategory: formData.subCategory,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        SKU: formData.SKU,
        lowStockThreshold: parseInt(formData.lowStockThreshold),
        images: formData.images,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        ...(formData.discountPrice && { discountPrice: parseFloat(formData.discountPrice) }),
      };

      await updateProduct(id, payload);
      setSuccess("Product updated successfully!");
      setTimeout(() => {
        navigate("/admin/products");
      }, 1500);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Loading product...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Product</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="border-b border-slate-200 pb-6 dark:border-slate-700">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Basic Information</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  maxLength={255}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SKU *</label>
                <input
                  type="text"
                  name="SKU"
                  value={formData.SKU}
                  onChange={handleInputChange}
                  placeholder="Enter unique SKU"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter detailed product description"
                  rows="4"
                  maxLength={5000}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Short Description</label>
                <input
                  type="text"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  placeholder="Brief product summary"
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="border-b border-slate-200 pb-6 dark:border-slate-700">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Classification</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Electronics, Fashion"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Category</label>
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleInputChange}
                  placeholder="e.g., Mobile Phones"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="Comma-separated tags (e.g., new, trending, sale)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="border-b border-slate-200 pb-6 dark:border-slate-700">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Pricing & Inventory</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Price (₹) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Discount Price (₹)</label>
                <input
                  type="number"
                  name="discountPrice"
                  value={formData.discountPrice}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Stock *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Low Stock Threshold</label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  placeholder="10"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="border-b border-slate-200 pb-6 dark:border-slate-700">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Product Images</h2>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alt Text</label>
                  <input
                    type="text"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    placeholder="Image description"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddImage}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Add Image
              </button>

              {/* Images List */}
              <div className="space-y-2">
                {formData.images.map((img, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-1 items-center gap-3">
                      <img src={img.url} alt={img.altText} className="h-10 w-10 rounded object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{img.altText}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{img.url}</p>
                      </div>
                      {img.isPrimary && (
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(index)}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
