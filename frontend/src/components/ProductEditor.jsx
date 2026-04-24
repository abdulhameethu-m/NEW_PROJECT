import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "./BackButton";
import { DynamicAttributeField } from "./DynamicAttributeField";
import { useCategories } from "../hooks/useCategories";
import { getSubcategoriesByCategory } from "../services/subcategoryService";
import { getAttributes } from "../services/attributeService";
import { getFilters } from "../services/filterService";
import { getProductModules } from "../services/productModuleService";
import * as productService from "../services/productService";
import {
  buildVariantCombinations,
  mergeVariantRows,
  normalizeVariantPayloadRows,
  parseCommaSeparatedValues,
} from "../utils/productVariants";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

function getInitialForm() {
  return {
    name: "",
    description: "",
    shortDescription: "",
    category: "",
    categoryId: "",
    subCategory: "",
    subCategoryId: "",
    price: "",
    discountPrice: "",
    stock: "",
    SKU: "",
    productNumber: "",
    lowStockThreshold: 10,
    images: [],
    tags: "",
    weight: "",
    returnPolicy: "",
    metaDescription: "",
    metaKeywords: "",
    modulesData: {},
    attributes: {},
  };
}

function buildInitialVariantSelections(variantDefs, existingVariants = []) {
  const selections = {};
  for (const def of variantDefs) {
    const values = Array.from(
      new Set(
        (existingVariants || [])
          .map((variant) => variant?.attributes?.[def.key])
          .filter(Boolean)
      )
    );
    selections[def.key] = values;
  }
  return selections;
}

function sortDefinitions(defs = []) {
  return [...defs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function flattenAttributeGroups(groups = {}) {
  return Object.values(groups).flatMap((fields) => (Array.isArray(fields) ? fields : []));
}

function buildModuleSections(groups = {}, modules = []) {
  const moduleByKey = new Map((modules || []).map((moduleDef) => [moduleDef.key, moduleDef]));
  return Object.entries(groups)
    .map(([moduleKey, fields]) => ({
      key: moduleKey,
      name: moduleByKey.get(moduleKey)?.name || fields?.[0]?.group || moduleKey,
      order: moduleByKey.get(moduleKey)?.order ?? 999,
      fields: sortDefinitions(fields || []),
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function mergeLegacyModulesData(moduleSections = [], currentModulesData = {}, legacyAttributes = {}) {
  const nextModulesData = { ...(currentModulesData || {}) };

  for (const section of moduleSections) {
    for (const field of section.fields.filter((item) => !item.isVariant)) {
      const existingValue = nextModulesData?.[section.key]?.[field.key];
      const fallbackValue = legacyAttributes?.[field.key];
      if (existingValue !== undefined || fallbackValue === undefined) continue;
      nextModulesData[section.key] = {
        ...(nextModulesData[section.key] || {}),
        [field.key]: fallbackValue,
      };
    }
  }

  return nextModulesData;
}

export function ProductEditor({
  mode = "vendor",
  productId = "",
  title,
  createLabel,
  updateLabel,
  backTo,
  listPath,
  fetchProduct,
  createProduct,
  updateProduct,
}) {
  const navigate = useNavigate();
  const isEditing = Boolean(productId);
  const isAdmin = mode === "admin";
  const { categories, loading: categoriesLoading } = useCategories({ includeInactive: isAdmin });

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(getInitialForm);
  const [imageUrl, setImageUrl] = useState("");
  const [subcategories, setSubcategories] = useState([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [attributeGroups, setAttributeGroups] = useState({});
  const [filterDefinitions, setFilterDefinitions] = useState([]);
  const [productModules, setProductModules] = useState([]);
  const [variantRows, setVariantRows] = useState([]);
  const [variantSelections, setVariantSelections] = useState({});
  const [loadedVariantSnapshot, setLoadedVariantSnapshot] = useState([]);

  const moduleSections = useMemo(
    () => buildModuleSections(attributeGroups, productModules),
    [attributeGroups, productModules]
  );
  const sortedAttributeDefs = useMemo(() => sortDefinitions(flattenAttributeGroups(attributeGroups)), [attributeGroups]);
  const variantDefs = useMemo(
    () => sortedAttributeDefs.filter((item) => item.isVariant),
    [sortedAttributeDefs]
  );
  const productFilterDefs = useMemo(
    () => sortDefinitions((filterDefinitions || []).filter((item) => !["price", "rating"].includes(item.key))),
    [filterDefinitions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      try {
        const response = await getProductModules();
        if (!cancelled) {
          setProductModules(Array.isArray(response?.data) ? response.data : []);
        }
      } catch {
        if (!cancelled) setProductModules([]);
      }
    }

    loadModules();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetchProduct(productId);
        const product = response?.data;
        if (!product || cancelled) return;

        setFormData({
          name: product.name || "",
          description: product.description || "",
          shortDescription: product.shortDescription || "",
          category: product.category || "",
          categoryId: product.categoryId?._id || product.categoryId || "",
          subCategory: product.subCategory || "",
          subCategoryId: product.subCategoryId?._id || product.subCategoryId || "",
          price: product.price?.toString() || "",
          discountPrice: product.discountPrice?.toString() || "",
          stock: product.stock?.toString() || "",
          SKU: product.productNumber || product.SKU || "",
          productNumber: product.productNumber || product.SKU || "",
          lowStockThreshold: product.lowStockThreshold || 10,
          images: product.images || [],
          tags: product.tags?.join(", ") || "",
          weight: product.weight?.toString() || "",
          returnPolicy: product.returnPolicy || "",
          metaDescription: product.metaDescription || "",
          metaKeywords: product.metaKeywords?.join(", ") || "",
          modulesData: product.modulesData || product.extraDetails || {},
          attributes: product.attributes || {},
        });

        setVariantRows(
          (product.variants || []).map((variant) => ({
            ...variant,
            price: variant.price?.toString?.() ?? variant.price ?? "",
            discountPrice: variant.discountPrice?.toString?.() ?? "",
            stock: variant.stock?.toString?.() ?? variant.stock ?? 0,
            imageUrlsText: Array.isArray(variant.images) ? variant.images.map((image) => image.url).join(", ") : "",
          }))
        );
        setLoadedVariantSnapshot(product.variants || []);
      } catch (err) {
        if (!cancelled) setError(normalizeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchProduct, isEditing, productId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSubcategories() {
      if (!formData.categoryId) {
        setSubcategories([]);
        return;
      }
      setSubcategoriesLoading(true);
      try {
        const res = await getSubcategoriesByCategory(formData.categoryId);
        if (!cancelled) setSubcategories(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!cancelled) setSubcategories([]);
      } finally {
        if (!cancelled) setSubcategoriesLoading(false);
      }
    }
    loadSubcategories();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAttributes() {
      if (!formData.categoryId || !formData.subCategoryId) {
        setAttributeGroups({});
        return;
      }

      try {
        const res = await getAttributes({
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId,
        });
        const groupedDefs = res?.data && typeof res.data === "object" ? res.data : {};
        const defs = sortDefinitions(flattenAttributeGroups(groupedDefs));
        if (cancelled) return;
        setAttributeGroups(groupedDefs);
        setFormData((prev) => {
          const nextModulesData = mergeLegacyModulesData(
            buildModuleSections(groupedDefs, productModules),
            prev.modulesData || {},
            prev.attributes || {}
          );
          for (const section of buildModuleSections(groupedDefs, productModules)) {
            for (const def of section.fields.filter((item) => !item.isVariant)) {
              if (nextModulesData?.[section.key]?.[def.key] === undefined) {
                nextModulesData[section.key] = {
                  ...(nextModulesData[section.key] || {}),
                  [def.key]: def.type === "multi-select" ? [] : "",
                };
              }
            }
          }
          return { ...prev, modulesData: nextModulesData };
        });

        setVariantSelections((prev) => {
          const seeded = Object.keys(prev || {}).length
            ? prev
            : buildInitialVariantSelections(defs.filter((item) => item.isVariant), loadedVariantSnapshot);
          const next = {};
          for (const def of defs.filter((item) => item.isVariant)) {
            next[def.key] = Array.isArray(seeded?.[def.key]) ? seeded[def.key] : [];
          }
          return next;
        });
      } catch {
        if (!cancelled) {
          setAttributeGroups({});
        }
      }
    }
    loadAttributes();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, formData.subCategoryId, loadedVariantSnapshot, productModules]);

  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      if (!formData.categoryId) {
        setFilterDefinitions([]);
        return;
      }

      try {
        const res = await getFilters({
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId || undefined,
        });
        const defs = Array.isArray(res?.data) ? res.data : [];
        if (cancelled) return;
        setFilterDefinitions(defs);
        setFormData((prev) => {
          const nextAttributes = { ...(prev.attributes || {}) };
          for (const def of defs) {
            if (["price", "rating"].includes(def.key)) continue;
            if (nextAttributes[def.key] !== undefined) continue;
            nextAttributes[def.key] = def.type === "checkbox" ? [] : "";
          }
          return { ...prev, attributes: nextAttributes };
        });
      } catch {
        if (!cancelled) setFilterDefinitions([]);
      }
    }

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, formData.subCategoryId]);

  useEffect(() => {
    let cancelled = false;
    async function loadProductNumber() {
      if (isEditing || !formData.categoryId || !formData.subCategoryId) return;
      try {
        const res = await productService.generateProductNumber({
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId,
        });
        const nextNumber = res?.data?.productNumber || "";
        if (!cancelled) {
          setFormData((prev) => ({
            ...prev,
            SKU: nextNumber,
            productNumber: nextNumber,
          }));
        }
      } catch {
        if (!cancelled) {
          setFormData((prev) => ({ ...prev, SKU: "", productNumber: "" }));
        }
      }
    }
    loadProductNumber();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, formData.subCategoryId, isEditing]);

  useEffect(() => {
    if (!variantDefs.length) return;
    const combinations = buildVariantCombinations(variantDefs, variantSelections);
    setVariantRows((prev) =>
      mergeVariantRows({
        combinations,
        existingVariants: prev,
        basePrice: formData.price,
        baseDiscountPrice: formData.discountPrice,
        baseStock: formData.stock,
        productNumber: formData.productNumber,
      })
    );
  }, [variantDefs, variantSelections, formData.price, formData.discountPrice, formData.stock, formData.productNumber]);

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "categoryId") {
      const selectedCategory = categories.find((category) => category._id === value);
      setFormData((prev) => ({
        ...prev,
        categoryId: value,
        category: selectedCategory?.name || "",
        subCategoryId: "",
        subCategory: "",
        productNumber: "",
        SKU: "",
        modulesData: {},
        attributes: {},
      }));
      setVariantSelections({});
      setVariantRows([]);
      setLoadedVariantSnapshot([]);
      return;
    }

    if (name === "subCategoryId") {
      const selectedSubcategory = subcategories.find((item) => item._id === value);
      setFormData((prev) => ({
        ...prev,
        subCategoryId: value,
        subCategory: selectedSubcategory?.name || "",
        modulesData: {},
        attributes: {},
      }));
      setVariantSelections({});
      setVariantRows([]);
      setLoadedVariantSnapshot([]);
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddImage() {
    if (!imageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url: imageUrl.trim(),
          altText: `${prev.name || "Product"} image ${prev.images.length + 1}`,
          isPrimary: prev.images.length === 0,
        },
      ],
    }));
    setImageUrl("");
  }

  function handleRemoveImage(index) {
    setFormData((prev) => {
      const nextImages = prev.images.filter((_, currentIndex) => currentIndex !== index);
      return {
        ...prev,
        images: nextImages.map((image, imageIndex) => ({
          ...image,
          isPrimary: imageIndex === 0 ? true : image.isPrimary && imageIndex === 0,
        })),
      };
    });
  }

  function handleVariantSelectionChange(def, rawValue) {
    if (def.type === "multi-select" || def.options?.length) {
      setVariantSelections((prev) => ({
        ...prev,
        [def.key]: Array.isArray(rawValue) ? rawValue : [],
      }));
      return;
    }

    setVariantSelections((prev) => ({
      ...prev,
      [def.key]: parseCommaSeparatedValues(rawValue),
    }));
  }

  function updateVariantRow(variantId, patch) {
    setVariantRows((prev) =>
      prev.map((row) => (row.variantId === variantId ? { ...row, ...patch } : row))
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) return setError("Product name is required");
    if (!formData.description.trim()) return setError("Product description is required");
    if (!formData.categoryId) return setError("Category is required");
    if (!formData.subCategoryId) return setError("Subcategory is required");
    if (formData.images.length === 0) return setError("At least one product image is required");
    if (!formData.productNumber.trim()) return setError("Product number is required");

    for (const section of moduleSections) {
      for (const field of section.fields.filter((item) => !item.isVariant)) {
        const value = formData.modulesData?.[section.key]?.[field.key];
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);
        if (field.required && isEmpty) return setError(`${section.name}: ${field.name} is required`);
      }
    }

    const normalizedVariantRows = variantDefs.length
      ? normalizeVariantPayloadRows(variantRows, formData.name)
      : [];

    if (variantDefs.length && normalizedVariantRows.length === 0) {
      return setError("Select values for each variant type to generate product variants");
    }

    for (const variant of normalizedVariantRows) {
      if (!variant.sku) return setError("Each variant requires a SKU");
      if (!Number.isFinite(variant.price) || variant.price < 0) return setError("Each variant requires a valid price");
      if (!Number.isFinite(variant.stock) || variant.stock < 0) return setError("Each variant requires a valid stock quantity");
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        category: formData.category,
        categoryId: formData.categoryId,
        subCategory: formData.subCategory,
        subCategoryId: formData.subCategoryId,
        price: Number(formData.price || 0),
        ...(formData.discountPrice !== "" ? { discountPrice: Number(formData.discountPrice || 0) } : {}),
        stock: Number(formData.stock || 0),
        SKU: formData.productNumber.toUpperCase(),
        productNumber: formData.productNumber.toUpperCase(),
        modulesData: formData.modulesData || {},
        attributes: Object.fromEntries(
          Object.entries(formData.attributes || {}).filter(([, value]) =>
            !(
              value === undefined ||
              value === null ||
              value === "" ||
              (Array.isArray(value) && value.length === 0)
            )
          )
        ),
        variants: normalizedVariantRows,
        lowStockThreshold: Number(formData.lowStockThreshold || 10),
        images: formData.images,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        ...(formData.weight ? { weight: Number(formData.weight) } : {}),
        returnPolicy: formData.returnPolicy,
        metaDescription: formData.metaDescription,
        metaKeywords: formData.metaKeywords
          .split(",")
          .map((key) => key.trim())
          .filter(Boolean),
      };

      if (isEditing) {
        await updateProduct(productId, payload);
      } else {
        await createProduct(payload);
      }

      navigate(listPath);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">Loading product...</div>;
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Dynamic attributes, category-based variants, and admin-controlled product modules all stay in one workflow.
          </p>
        </div>
        <BackButton fallbackTo={backTo} />
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Basic information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product name *</label>
              <input name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description *</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Short description</label>
              <input name="shortDescription" value={formData.shortDescription} onChange={handleChange} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Classification</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category *</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} disabled={categoriesLoading} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                <option value="">{categoriesLoading ? "Loading..." : "Select category"}</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subcategory *</label>
              <select name="subCategoryId" value={formData.subCategoryId} onChange={handleChange} disabled={!formData.categoryId || subcategoriesLoading} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                <option value="">{!formData.categoryId ? "Select category first" : subcategoriesLoading ? "Loading..." : "Select subcategory"}</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tags</label>
              <input name="tags" value={formData.tags} onChange={handleChange} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" placeholder="wireless, flagship, premium" />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Pricing seed and inventory baseline</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            These values seed new variants. Once variants are generated, live selling price and stock come from the variant rows.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Base price *</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} min="0" step="0.01" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Base discount price</label>
              <input type="number" name="discountPrice" value={formData.discountPrice} onChange={handleChange} min="0" step="0.01" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Base stock *</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product number *</label>
              <input type="text" name="productNumber" value={formData.productNumber} disabled className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Product images</h2>
          <div className="mt-4 flex gap-2">
            <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/image.jpg" className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            <button type="button" onClick={handleAddImage} className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950">Add image</button>
          </div>
          {formData.images.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {formData.images.map((image, index) => (
                <div key={`${image.url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <img src={image.url} alt={image.altText || formData.name} className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>{image.isPrimary ? "Primary" : `Image ${index + 1}`}</span>
                    <button type="button" onClick={() => handleRemoveImage(index)} className="font-semibold text-rose-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {moduleSections.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Module-driven fields</h2>
            <div className="mt-4 grid gap-5">
              {moduleSections.map((section) => {
                const moduleFields = section.fields.filter((item) => !item.isVariant);
                if (!moduleFields.length) return null;

                return (
                  <div key={section.key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="text-base font-semibold text-slate-950 dark:text-white">{section.name}</div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {moduleFields.map((attribute) => (
                        <div key={attribute._id || `${section.key}-${attribute.key}`}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {attribute.name}
                            {attribute.required ? " *" : ""}
                          </label>
                          <DynamicAttributeField
                            attribute={attribute}
                            value={formData.modulesData?.[section.key]?.[attribute.key]}
                            onChange={(key, value) =>
                              setFormData((prev) => ({
                                ...prev,
                                modulesData: {
                                  ...(prev.modulesData || {}),
                                  [section.key]: {
                                    ...(prev.modulesData?.[section.key] || {}),
                                    [key]: value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {productFilterDefs.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Filter-ready attributes</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              These fields feed the storefront filter sidebar for this category and subcategory.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {productFilterDefs.map((filterDef) => (
                <div key={filterDef._id || filterDef.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {filterDef.name}
                  </label>
                  <DynamicAttributeField
                    attribute={filterDef}
                    value={formData.attributes?.[filterDef.key]}
                    onChange={(key, value) =>
                      setFormData((prev) => ({
                        ...prev,
                        attributes: {
                          ...(prev.attributes || {}),
                          [key]: filterDef.type === "range" && value !== "" ? Number(value) : value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {variantDefs.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Dynamic variants</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Variant types come from admin-managed attributes marked for variants. Select values and the system generates the sellable SKU matrix.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {variantDefs.map((def) => (
                <div key={def.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{def.name}</label>
                  {def.options?.length ? (
                    <select
                      multiple
                      value={variantSelections?.[def.key] || []}
                      onChange={(event) =>
                        handleVariantSelectionChange(
                          def,
                          Array.from(event.target.selectedOptions).map((option) => option.value)
                        )
                      }
                      className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      {def.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={(variantSelections?.[def.key] || []).join(", ")}
                      onChange={(event) => handleVariantSelectionChange(def, event.target.value)}
                      placeholder={`Enter ${def.name} values separated by commas`}
                      className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[minmax(240px,1.4fr)_120px_120px_160px_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <div>Variant</div>
                <div>Price</div>
                <div>Stock</div>
                <div>SKU</div>
                <div>Variant images</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {variantRows.length ? (
                  variantRows.map((variant) => (
                    <div key={variant.variantId} className="grid grid-cols-[minmax(240px,1.4fr)_120px_120px_160px_1fr] gap-3 px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-950 dark:text-white">{variant.title}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {variant.options?.map((item) => `${item.name}: ${item.value}`).join(" | ")}
                        </div>
                      </div>
                      <input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariantRow(variant.variantId, { price: event.target.value })} className="rounded border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                      <input type="number" min="0" value={variant.stock} onChange={(event) => updateVariantRow(variant.variantId, { stock: event.target.value })} className="rounded border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                      <input type="text" value={variant.sku} onChange={(event) => updateVariantRow(variant.variantId, { sku: event.target.value.toUpperCase() })} className="rounded border border-slate-300 px-2 py-2 text-sm uppercase dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                      <input type="text" value={variant.imageUrlsText || ""} onChange={(event) => updateVariantRow(variant.variantId, { imageUrlsText: event.target.value })} placeholder="Comma-separated image URLs" className="rounded border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Select variant values above to generate combinations automatically.</div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Additional details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Weight (kg)</label>
              <input type="number" name="weight" value={formData.weight} onChange={handleChange} min="0" step="0.01" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Low stock threshold</label>
              <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} min="0" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Return policy</label>
              <textarea name="returnPolicy" value={formData.returnPolicy} onChange={handleChange} rows={3} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Meta description</label>
              <input name="metaDescription" value={formData.metaDescription} onChange={handleChange} maxLength={160} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Meta keywords</label>
              <input name="metaKeywords" value={formData.metaKeywords} onChange={handleChange} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={submitting} className="rounded-2xl bg-[color:var(--commerce-accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {submitting ? "Saving..." : isEditing ? updateLabel : createLabel}
          </button>
          <button type="button" onClick={() => navigate(listPath)} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
