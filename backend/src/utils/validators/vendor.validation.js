const Joi = require("joi");

const step1Schema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().trim().min(6).max(30).optional(),
  companyName: Joi.string().trim().min(2).max(160).required(),
  address: Joi.string().trim().min(5).max(500).required(),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).required(),
});

const step2Schema = Joi.object({
  gstNumber: Joi.string().trim().max(30).allow("", null),
  noGst: Joi.boolean().default(false),
}).custom((value, helpers) => {
  if (value.noGst) return value;
  if (!value.gstNumber) return helpers.error("any.custom", { message: "GST number required or set noGst=true" });
  return value;
}, "GST requirement");

const step3Schema = Joi.object({
  bankDetails: Joi.object({
    accountNumber: Joi.string().trim().min(6).max(40).allow("", null),
    IFSC: Joi.string().trim().min(5).max(20).allow("", null),
    holderName: Joi.string().trim().min(2).max(160).allow("", null),
    bankName: Joi.string().trim().max(160).allow("", null),
  }).optional(),
  upiId: Joi.string().trim().max(160).allow("", null),
}).custom((value, helpers) => {
  const bd = value.bankDetails || {};
  const hasBankDetails = bd.accountNumber && bd.IFSC && bd.holderName;
  const hasUpi = value.upiId;
  if (!hasBankDetails && !hasUpi) {
    return helpers.error("any.custom", { message: "Provide either complete bank details or a UPI ID" });
  }
  return value;
}, "Bank or UPI requirement");

const step4Schema = Joi.object({
  shopName: Joi.string().trim().min(2).max(160).required(),
});

module.exports = { step1Schema, step2Schema, step3Schema, step4Schema };

