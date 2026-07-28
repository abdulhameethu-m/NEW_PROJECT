const fs = require('fs');
const path = 'e:/GRM/PROJ/backend/src/utils/validators/product.validation.js';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '  discountPrice: Joi.number().min(0),',
  '  discountPrice: Joi.number().min(0).less(Joi.ref(\'price\')).messages({ \'number.less\': \'Variant discount price must be less than price\' }),'
);

content = content.replace(
  `  discountPrice: Joi.number().min(0).messages({
    "number.base": "Discount price must be a number",
    "number.min": "Discount price cannot be negative",
  }),`,
  `  discountPrice: Joi.number().min(0).less(Joi.ref('price')).messages({
    "number.base": "Discount price must be a number",
    "number.min": "Discount price cannot be negative",
    "number.less": "Discount price must be less than base price",
  }),`
);

content = content.replace(
  '  discountPrice: Joi.number().min(0).allow(null),',
  '  discountPrice: Joi.number().min(0).less(Joi.ref(\'price\')).allow(null).messages({ \'number.less\': \'Discount price must be less than base price\' }),'
);

content = content.replace(
  '  discountPrice: Joi.number().min(0),',
  '  discountPrice: Joi.number().min(0).less(Joi.ref(\'price\')).messages({ \'number.less\': \'Discount price must be less than base price\' }),'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated product.validation.js');
