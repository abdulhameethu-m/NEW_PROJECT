const cloudinary = require("cloudinary").v2;

function configureCloudinary() {
  const hasUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasParts =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);

  if (!hasUrl && !hasParts) return { enabled: false };

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return { enabled: true, cloudinary };
}

module.exports = { configureCloudinary };

