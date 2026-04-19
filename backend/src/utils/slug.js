/**
 * Generate URL-friendly slug from text
 * @param {String} text - Text to slugify
 * @param {String} separator - Character to use between words (default: '-')
 * @returns {String} Slugified text
 */
function generateSlug(text, separator = "-") {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator) // Replace special characters with separator
    .replace(new RegExp(`${separator}+`, "g"), separator) // Replace multiple separators with single separator
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), ""); // Remove separator from start and end
}

/**
 * Generate unique slug by appending random suffix if needed
 * @param {String} baseSlug - Base slug
 * @returns {String} Slug with random suffix
 */
function generateUniqueSlug(baseSlug) {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
};
