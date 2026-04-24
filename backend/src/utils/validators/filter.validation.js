const Joi = require("joi");

const objectId = Joi.string().hex().length(24);
const filterType = Joi.string().valid("select", "checkbox", "range", "color");

const filterPayload = {
  name: Joi.string().trim().max(120),
  key: Joi.string().trim().lowercase().pattern(/^[a-z][a-z0-9_]*$/).max(120),
  type: filterType,
  options: Joi.array().items(Joi.string().trim().max(120)).max(200),
  categoryIds: Joi.array().items(objectId).min(1).max(100),
  subCategoryIds: Joi.array().items(objectId).max(300),
  unit: Joi.string().trim().max(40).allow(""),
  placeholder: Joi.string().trim().max(120).allow(""),
  order: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
  rangeConfig: Joi.object({
    min: Joi.number(),
    max: Joi.number().greater(Joi.ref("min")),
    step: Joi.number().positive(),
  }),
};

const createFilterSchema = Joi.object({
  name: filterPayload.name.required(),
  key: filterPayload.key.required(),
  type: filterPayload.type.required(),
  options: filterPayload.options.default([]),
  categoryIds: filterPayload.categoryIds.required(),
  subCategoryIds: filterPayload.subCategoryIds.default([]),
  unit: filterPayload.unit,
  placeholder: filterPayload.placeholder,
  order: filterPayload.order,
  isActive: filterPayload.isActive,
  rangeConfig: filterPayload.rangeConfig,
});

const updateFilterSchema = Joi.object(filterPayload).min(1);

module.exports = {
  createFilterSchema,
  updateFilterSchema,
};
