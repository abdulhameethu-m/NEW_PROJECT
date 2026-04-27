const { AppError } = require("../utils/AppError");
const { validationResult } = require("express-validator");

function validate(schema, property = "body") {
  return async (req, res, next) => {
    if (Array.isArray(schema)) {
      await Promise.all(schema.map((validation) => validation.run(req)));
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return next(
          new AppError("Validation failed", 400, "VALIDATION_ERROR", {
            issues: errors.array().map((err) => ({
              message: err.msg,
              path: [err.param],
              type: err.location,
            })),
          })
        );
      }

      return next();
    }

    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return next(
        new AppError("Validation failed", 400, "VALIDATION_ERROR", {
          issues: error.details.map((d) => ({
            message: d.message,
            path: d.path,
            type: d.type,
          })),
        })
      );
    }

    req[property] = value;
    next();
  };
}

module.exports = { validate };

