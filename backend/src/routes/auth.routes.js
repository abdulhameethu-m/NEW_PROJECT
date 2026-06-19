const express = require("express");
const { validate } = require("../middleware/validate");
const { authRequired, authOptional } = require("../middleware/auth");
const authController = require("../controllers/auth.controller");
const { 
  registerSchema, 
  loginSchema, 
  passwordResetRequestSchema, 
  passwordResetSchema,
  findUserForRecoverySchema,
  verifyPasswordResetOTPSchema
} = require("../utils/validators/auth.validation");
const { AppError } = require("../utils/AppError");

const router = express.Router();

router.post(
  "/register",
  validate(registerSchema),
  (req, res, next) => {
    if (req.body.role === "admin" && process.env.ALLOW_ADMIN_REGISTRATION !== "true") {
      return next(new AppError("Admin registration disabled", 403, "FORBIDDEN"));
    }
    next();
  },
  authController.register
);

router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.get("/csrf", authController.csrf);
// Use authOptional for logout - allows graceful logout even if token is missing
router.post("/logout", authOptional, authController.logout);
router.post("/logout-all", authRequired, authController.logoutAll);
router.get("/sessions", authRequired, authController.listSessions);
router.delete("/sessions/:id", authRequired, authController.revokeSession);
router.get("/me", authRequired, authController.me);
router.patch("/preferences/theme", authRequired, authController.updateThemePreference);

/**
 * PASSWORD RESET ENDPOINTS
 */
router.post("/password-reset/request", validate(passwordResetRequestSchema), authController.requestPasswordReset);
router.post("/password-reset/confirm", validate(passwordResetSchema), authController.resetPassword);

/**
 * PASSWORD RESET WITH OTP (New Flow)
 */
router.post("/password-reset-otp/request", validate(passwordResetRequestSchema), authController.requestPasswordResetOTP);
router.post("/password-reset-otp/verify", validate(verifyPasswordResetOTPSchema), authController.verifyPasswordResetOTP);

/**
 * FORGOT USERNAME ENDPOINT
 */
router.post("/forgot-username", validate(findUserForRecoverySchema), authController.findUserForRecovery);

/**
 * POST-LOGIN MERGE
 * Merge guest cart and wishlist data after successful login
 */
router.post("/merge-guest-data", authRequired, authController.mergeGuestData);

module.exports = router;

