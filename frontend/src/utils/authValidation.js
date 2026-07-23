const PHONE_REGEX = /^[0-9]{10}$/;
const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function isValidPhone(phone) {
  return PHONE_REGEX.test(String(phone || "").trim());
}

function isValidGmail(email) {
  return GMAIL_REGEX.test(String(email || "").trim());
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email || "").trim());
}

export function validateAuthForm({ identifier, name, email, phone, password, requireEmail = false } = {}) {
  const errors = {};

  // Name validation
  if (name !== undefined) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      errors.name = "Name is required";
    } else if (trimmedName.length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (trimmedName.length > 50) {
      errors.name = "Name must not exceed 50 characters";
    } else if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      errors.name = "Name can only contain letters, spaces, hyphens, and apostrophes";
    }
  }

  if (identifier !== undefined) {
    const value = String(identifier || "").trim();
    if (!value) {
      errors.identifier = "Phone or email is required";
    } else if (value.includes("@")) {
      if (!isValidEmail(value)) {
        errors.identifier = "Enter a valid email address (e.g., name@gmail.com)";
      }
    } else {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length !== 10) {
        errors.identifier = "Phone number must be exactly 10 digits";
      } else if (!isValidPhone(digitsOnly)) {
        errors.identifier = "Enter a valid 10-digit phone number";
      }
    }
  }

  if (email !== undefined) {
    const normalizedEmail = String(email || "").trim();
    if (requireEmail && !normalizedEmail) {
      errors.email = "Email is required";
    } else if (normalizedEmail) {
      if (!isValidEmail(normalizedEmail)) {
        errors.email = "Enter a valid email address";
      }
      if (!isValidGmail(normalizedEmail)) {
        errors.email = "Email must be a Gmail address (@gmail.com)";
      }
    }
  }

  if (phone !== undefined) {
    const trimmedPhone = String(phone || "").trim();
    if (trimmedPhone) {
      const digitsOnly = trimmedPhone.replace(/\D/g, "");
      if (digitsOnly.length !== 10) {
        errors.phone = "Phone number must be exactly 10 digits";
      } else if (!isValidPhone(digitsOnly)) {
        errors.phone = "Enter a valid 10-digit phone number";
      }
    }
  }

  if (password !== undefined) {
    const pwd = String(password || "");
    if (!pwd) {
      errors.password = "Password is required";
    } else if (pwd.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (pwd.length > 128) {
      errors.password = "Password must not exceed 128 characters";
    } else if (!/[a-z]/.test(pwd)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/[A-Z]/.test(pwd)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(pwd)) {
      errors.password = "Password must contain at least one number";
    }
  }

  return errors;
}
