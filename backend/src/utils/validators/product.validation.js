const Joi = require("joi");

// Schema for creating/updating a product
const productSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(255).messages({
    "string.empty": "Product name is required",
    "string.min": "Product name must be at least 3 characters",
    "string.max": "Product name cannot exceed 255 characters",
  }),

  description: Joi.string().required().trim().min(10).max(5000).messages({
    "string.empty": "Product description is required",
    "string.min": "Product description must be at least 10 characters",
    "string.max": "Product description cannot exceed 5000 characters",
  }),

  shortDescription: Joi.string().trim().max(500),

  category: Joi.string().required().trim().messages({
    "string.empty": "Category is required",
  }),

  subCategory: Joi.string().trim().allow(null),

  tags: Joi.array().items(Joi.string().trim()).max(10),

  price: Joi.number().required().min(0).messages({
    "number.base": "Price must be a number",
    "number.min": "Price cannot be negative",
  }),

  discountPrice: Joi.number().min(0).messages({
    "number.base": "Discount price must be a number",
    "number.min": "Discount price cannot be negative",
  }),

  currency: Joi.string()
    .valid("USD", "EUR", "INR", "GBP")
    .default("INR"),

  stock: Joi.number().required().integer().min(0).messages({
    "number.base": "Stock must be a number",
    "number.min": "Stock cannot be negative",
  }),

  SKU: Joi.string()
    .required()
    .trim()
    .uppercase()
    .regex(/^[A-Z0-9-]+$/)
    .messages({
      "string.empty": "SKU is required",
      "string.pattern.base": "SKU can only contain uppercase letters, numbers, and hyphens",
    }),

  lowStockThreshold: Joi.number().integer().min(0).default(10),

  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        altText: Joi.string().trim().max(255),
        isPrimary: Joi.boolean(),
      })
    )
    .min(1)
    .max(10)
    .messages({
      "array.min": "At least one image is required",
      "array.max": "Maximum 10 images allowed",
    }),

  thumbnail: Joi.string().uri(),

  variants: Joi.array().items(
    Joi.object({
      name: Joi.string().required().trim(),
      values: Joi.array().items(Joi.string().trim()).min(1).required(),
    })
  ),

  metaDescription: Joi.string().trim().max(160),
  metaKeywords: Joi.array().items(Joi.string().trim()).max(10),

  weight: Joi.number().min(0),

  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
  }),

  returnPolicy: Joi.string().trim().max(1000),
  warranty: Joi.string().trim().max(500),
}).unknown(true); // Allow unknown fields but validate known ones

// Schema for creating product (stricter)
const createProductSchema = productSchema.fork(
  ["name", "description", "category", "price", "stock", "SKU", "images"],
  (schema) => schema.required()
);

// Schema for updating product (all optional)
const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255),
  description: Joi.string().trim().min(10).max(5000),
  shortDescription: Joi.string().trim().max(500),
  category: Joi.string().trim(),
  subCategory: Joi.string().trim().allow(null),
  tags: Joi.array().items(Joi.string().trim()).max(10),
  price: Joi.number().min(0),
  discountPrice: Joi.number().min(0),
  currency: Joi.string().valid("USD", "EUR", "INR", "GBP"),
  stock: Joi.number().integer().min(0),
  SKU: Joi.string().trim().uppercase().regex(/^[A-Z0-9-]+$/),
  lowStockThreshold: Joi.number().integer().min(0),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri(),
        altText: Joi.string().trim().max(255),
        isPrimary: Joi.boolean(),
      })
    )
    .max(10),
  thumbnail: Joi.string().uri(),
  variants: Joi.array().items(
    Joi.object({
      name: Joi.string().required().trim(),
      values: Joi.array().items(Joi.string().trim()).min(1).required(),
    })
  ),
  metaDescription: Joi.string().trim().max(160),
  metaKeywords: Joi.array().items(Joi.string().trim()).max(10),
  weight: Joi.number().min(0),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
  }),
  returnPolicy: Joi.string().trim().max(1000),
  warranty: Joi.string().trim().max(500),
}).unknown(true);

// Schema for admin approval
const approveProductSchema = Joi.object({}).unknown(true);

// Schema for rejecting product
const rejectProductSchema = Joi.object({
  rejectionReason: Joi.string().required().trim().min(10).max(1000).messages({
    "string.empty": "Rejection reason is required",
    "string.min": "Rejection reason must be at least 10 characters",
    "string.max": "Rejection reason cannot exceed 1000 characters",
  }),
});

module.exports = {
  productSchema,
  createProductSchema,
  updateProductSchema,
  approveProductSchema,
  rejectProductSchema,
};
