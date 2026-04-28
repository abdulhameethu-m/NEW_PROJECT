const crypto = require("crypto");

/**
 * Fintech-grade encryption utility for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 * 
 * SECURITY NOTES:
 * - AES-256-GCM provides both confidentiality and authenticity
 * - IV (Initialization Vector) is randomly generated per encryption
 * - Auth tag prevents tampering/corruption
 * - Master key should be 32 bytes (256 bits)
 */

class EncryptionService {
  constructor(masterKey) {
    // Master key should come from environment variable
    this.masterKey = masterKey || process.env.ENCRYPTION_MASTER_KEY;
    
    if (!this.masterKey) {
      throw new Error("ENCRYPTION_MASTER_KEY environment variable is required");
    }

    // Ensure key is 32 bytes (256 bits)
    if (this.masterKey.length < 32) {
      throw new Error("ENCRYPTION_MASTER_KEY must be at least 32 characters");
    }

    // Create a proper 32-byte key from the master key
    this.key = Buffer.from(this.masterKey.slice(0, 32), "utf-8").slice(0, 32);
    if (this.key.length < 32) {
      // Pad with zeros if needed
      this.key = Buffer.concat([this.key, Buffer.alloc(32 - this.key.length)]);
    }
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param {string} plaintext - The data to encrypt
   * @returns {string} Encrypted data in format: iv::authTag::ciphertext (all hex encoded)
   */
  encrypt(plaintext) {
    try {
      if (!plaintext || typeof plaintext !== "string") {
        throw new Error("Plaintext must be a non-empty string");
      }

      // Generate random IV (96 bits for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, "utf-8", "hex");
      encrypted += cipher.final("hex");

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Format: iv::authTag::ciphertext (all hex)
      return `${iv.toString("hex")}::${authTag.toString("hex")}::${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts encrypted data
   * @param {string} encryptedData - Data in format: iv::authTag::ciphertext
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== "string") {
        throw new Error("Encrypted data must be a non-empty string");
      }

      // Parse the encrypted data
      const parts = encryptedData.split("::");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const ciphertext = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(ciphertext, "hex", "utf-8");
      decrypted += decipher.final("utf-8");

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Masks a string by showing only last N characters
   * @param {string} value - The string to mask
   * @param {number} showLastN - Number of characters to show
   * @returns {string} Masked string (e.g., "XXXX1234")
   */
  static maskString(value, showLastN = 4) {
    if (!value || typeof value !== "string" || value.length <= showLastN) {
      return "XXXX****";
    }
    const shown = value.slice(-showLastN);
    const hiddenCount = value.length - showLastN;
    return "X".repeat(Math.min(hiddenCount, 4)) + shown;
  }

  /**
   * Hash a string using SHA-256 (for verification)
   * @param {string} value - The string to hash
   * @returns {string} Hashed value (hex)
   */
  static hashString(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}

// Singleton instance
let instance = null;

function getEncryptionService() {
  if (!instance) {
    instance = new EncryptionService();
  }
  return instance;
}

module.exports = {
  EncryptionService,
  getEncryptionService,
};
