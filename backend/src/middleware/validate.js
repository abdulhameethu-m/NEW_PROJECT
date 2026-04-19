const { AppError } = require("../utils/AppError");

function validate(schema, property = "body") {
  return (req, res, next) => {
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

