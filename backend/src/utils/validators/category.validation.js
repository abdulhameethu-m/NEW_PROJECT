const Joi = require("joi");

const categoryPayload = {
  name: Joi.string().trim().max(120),
  code: Joi.string().trim().max(10).allow(""),
  slug: Joi.string().trim().max(120).allow(""),
  icon: Joi.string().trim().max(120).allow(""),
  color: Joi.string().trim().max(120).allow(""),
  isActive: Joi.boolean(),
  order: Joi.number().integer().min(0),
};

const createCategorySchema = Joi.object({
  name: categoryPayload.name.required().messages({
    "any.required": "Category name is required",
    "string.empty": "Category name is required",
  }),
  slug: categoryPayload.slug,
  code: categoryPayload.code,
  icon: categoryPayload.icon,
  color: categoryPayload.color,
  isActive: categoryPayload.isActive,
  order: categoryPayload.order,
});

const updateCategorySchema = Joi.object(categoryPayload).min(1);

const toggleCategorySchema = Joi.object({
  isActive: Joi.boolean().required(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  toggleCategorySchema,
};
