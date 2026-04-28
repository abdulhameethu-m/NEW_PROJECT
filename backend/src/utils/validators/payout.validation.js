const Joi = require("joi");

const payoutRequestSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
}).required();

const payoutAccountSchema = Joi.object({
  accountHolderName: Joi.string().trim().max(160).allow("", null),
  accountNumber: Joi.string().trim().max(40).allow("", null),
  ifscCode: Joi.string().trim().max(20).allow("", null),
  bankName: Joi.string().trim().max(160).allow("", null),
  upiId: Joi.string().trim().max(160).allow("", null),
})
  .custom((value, helpers) => {
    const hasBankDetails = value.accountHolderName && value.accountNumber && value.ifscCode;
    const hasUpi = value.upiId;
    if (!hasBankDetails && !hasUpi) {
      return helpers.error("any.invalid");
    }
    return value;
  }, "payout account validation")
  .messages({
    "any.invalid": "Provide either bank account details or a UPI id",
  })
  .required();

const payoutApprovalSchema = Joi.object({
  adminNote: Joi.string().trim().max(1000).allow("", null),
}).required();

const payoutRejectionSchema = Joi.object({
  adminNote: Joi.string().trim().max(1000).required(),
}).required();

const payoutPaymentSchema = Joi.object({
  transactionId: Joi.string().trim().max(120).when("mode", {
    is: "MANUAL",
    then: Joi.required(),
    otherwise: Joi.allow("", null),
  }),
  mode: Joi.string().valid("MANUAL", "RAZORPAY").default("MANUAL"),
  adminNote: Joi.string().trim().max(1000).allow("", null),
}).required();

/**
 * Schema for rejecting vendor payout account
 */
const accountRejectionSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(500).required().messages({
    "string.min": "Rejection reason must be at least 10 characters",
    "string.max": "Rejection reason cannot exceed 500 characters",
    "any.required": "Rejection reason is required",
  }),
}).required();

module.exports = {
  payoutRequestSchema,
  payoutAccountSchema,
  payoutApprovalSchema,
  payoutRejectionSchema,
  payoutPaymentSchema,
  accountRejectionSchema,
};
