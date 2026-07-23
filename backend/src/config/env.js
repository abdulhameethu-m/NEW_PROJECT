const dotenv = require("dotenv");
if (!global.__grmEnvLoaded) {
  dotenv.config({ override: true });
  global.__grmEnvLoaded = true;
}

function isWeakSecret(value) {
  const secret = String(value || "").trim();
  return (
    secret.length < 32 ||
    /^(secret|changeme|change_me|development|test|password|jwt_secret)$/i.test(secret)
  );
}

if (process.env.NODE_ENV === "production") {
  const required = [
    "MONGODB_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "CSRF_SECRET",
    "CORS_ORIGINS",
  ];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const weakSecrets = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "CSRF_SECRET"].filter((key) =>
    isWeakSecret(process.env[key])
  );
  if (weakSecrets.length) {
    throw new Error(`Weak production secrets: ${weakSecrets.join(", ")}`);
  }
}
