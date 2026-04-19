const PHONE_REGEX = /^[0-9]{10}$/;
const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export function isValidPhone(phone) {
  return PHONE_REGEX.test(String(phone || "").trim());
}

export function isValidGmail(email) {
  return GMAIL_REGEX.test(String(email || "").trim());
}

export function validateAuthForm({ identifier, email, phone, password, requireEmail = false } = {}) {
  const errors = {};

  if (identifier !== undefined) {
    const value = String(identifier || "").trim();
    if (!value) {
      errors.identifier = "Enter your 10-digit phone number or Gmail address.";
    } else if (value.includes("@")) {
      if (!isValidGmail(value)) {
        errors.identifier = "Use a valid Gmail address ending with @gmail.com.";
      }
    } else if (!isValidPhone(value)) {
      errors.identifier = "Phone number must be exactly 10 digits.";
    }
  }

  if (email !== undefined) {
    const normalizedEmail = String(email || "").trim();
    if (requireEmail && !normalizedEmail) {
      errors.email = "Email is required.";
    } else if (normalizedEmail && !isValidGmail(normalizedEmail)) {
      errors.email = "Use a valid Gmail address ending with @gmail.com.";
    }
  }

  if (phone !== undefined && !isValidPhone(phone)) {
    errors.phone = "Phone number must be exactly 10 digits.";
  }

  if (password !== undefined && String(password || "").length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}
