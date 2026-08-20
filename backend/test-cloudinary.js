require('dotenv').config();
const { configureCloudinary } = require("./src/config/cloudinary");
const { enabled, cloudinary } = configureCloudinary();

console.log("Cloudinary Configured?", enabled);
if (enabled) {
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error("Cloudinary Ping Error:", error);
    } else {
      console.log("Cloudinary Ping Success:", result);
    }
  });
}
