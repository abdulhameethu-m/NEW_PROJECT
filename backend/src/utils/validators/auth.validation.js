const Joi = require("joi");
const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
const phonePattern = /^[0-9]{10}$/;
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 128 characters",
    "string.pattern.base": "Password must contain uppercase, lowercase, and number characters",
  });

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().pattern(gmailPattern).allow("", null).messages({
    "string.pattern.base": "Email must be a valid Gmail address",
  }),
  phone: Joi.string().trim().pattern(phonePattern).required().messages({
    "string.pattern.base": "Phone number must be exactly 10 digits",
  }),
  password: passwordSchema.required(),
  role: Joi.string().valid("user", "vendor", "influencer").default("user"),
}).custom((value, helpers) => {
  if (["vendor", "influencer"].includes(value.role)) {
    if (!value.email) return helpers.error("any.custom", { message: "Email is required for vendors" });
  }
  return value;
}, "Role-based register rules");
const loginSchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return helpers.error("any.required");
      if (value.includes("@")) {
        if (!gmailPattern.test(value)) {
          return helpers.message("Login email must be a valid Gmail address");
        }
        return value;
      }
      if (!phonePattern.test(value)) {
        return helpers.message("Phone number must be exactly 10 digits");
      }
      return value;
    })
    .required(),
  password: Joi.string().min(1).max(128).required(),
});
const passwordResetRequestSchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return helpers.error("any.required");
      if (value.includes("@")) {
        if (!gmailPattern.test(value)) {
          return helpers.message("Email must be a valid Gmail address");
        }
        return value;
      }
      if (!phonePattern.test(value)) {
        return helpers.message("Phone number must be exactly 10 digits");
      }
      return value;
    })
    .required(),
});
const passwordResetSchema = Joi.object({
  token: Joi.string().trim().required(),
  password: passwordSchema.required(),
});
const findUserForRecoverySchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return helpers.error("any.required");
      if (value.includes("@")) {
        if (!gmailPattern.test(value)) {
          return helpers.message("Email must be a valid Gmail address");
        }
        return value;
      }
      if (!phonePattern.test(value)) {
        return helpers.message("Phone number must be exactly 10 digits");
      }
      return value;
    })
    .required(),
});
const verifyPasswordResetOTPSchema = Joi.object({
  email: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return helpers.error("any.required");
      if (value.includes("@")) {
        if (!gmailPattern.test(value)) {
          return helpers.message("Email must be a valid Gmail address");
        }
        return value;
      }
      if (!phonePattern.test(value)) {
        return helpers.message("Phone number must be exactly 10 digits");
      }
      return value;
    })
    .required(),
  otp: Joi.string().trim().required().min(6).max(6).messages({
    "string.min": "OTP must be 6 digits",
    "string.max": "OTP must be 6 digits",
  }),
});
module.exports = { 
  registerSchema, 
  loginSchema, 
  passwordResetRequestSchema, 
  passwordResetSchema, 
  findUserForRecoverySchema,
  verifyPasswordResetOTPSchema,
};