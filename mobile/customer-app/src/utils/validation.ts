import { z } from 'zod';

/**
 * These Regex patterns perfectly mirror the backend Joi schemas.
 * NOTE: The backend is authoritative. If backend policies change, update these here.
 */
export const GMAIL_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
export const PHONE_REGEX = /^[0-9]{10}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * Reusable password schema mirroring the backend restrictions
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, and number');

/**
 * Mobile Zod schema for Login UI
 * Handles intelligent matching of Phone OR Gmail identifier
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Please enter your phone number or email')
    .refine((val) => {
      if (val.includes('@')) {
        return GMAIL_EMAIL_REGEX.test(val);
      }
      return PHONE_REGEX.test(val);
    }, {
      message: 'Must be a valid Gmail address or 10-digit phone number',
    }),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Mobile Zod schema for Registration UI
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must not exceed 120 characters'),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'Phone number must be exactly 10 digits'),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true; // Optional for users
      return GMAIL_EMAIL_REGEX.test(val);
    }, {
      message: 'Email must be a valid Gmail address',
    }),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export type RegisterFormData = z.infer<typeof registerSchema>;
