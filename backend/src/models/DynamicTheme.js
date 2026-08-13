const mongoose = require("mongoose");

const dynamicThemeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, required: true, unique: true },
    isActive: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },

    colors: {
      primary: { type: String, trim: true, default: "#6D4AFF" },
      secondary: { type: String, trim: true, default: "#2D3748" },
      accent: { type: String, trim: true, default: "#F6AD55" },
      background: { type: String, trim: true, default: "#F7FAFC" },
      surface: { type: String, trim: true, default: "#FFFFFF" },
      text: { type: String, trim: true, default: "#1A202C" },
      mutedText: { type: String, trim: true, default: "#718096" },
      border: { type: String, trim: true, default: "#E2E8F0" },
    },

    navbar: {
      background: { type: String, trim: true, default: "#FFFFFF" },
      text: { type: String, trim: true, default: "#1A202C" },
      hoverText: { type: String, trim: true, default: "#6D4AFF" },
      activeText: { type: String, trim: true, default: "#6D4AFF" },
      icon: { type: String, trim: true, default: "#4A5568" },
      border: { type: String, trim: true, default: "#E2E8F0" },
      searchBackground: { type: String, trim: true, default: "#F7FAFC" },
      searchText: { type: String, trim: true, default: "#1A202C" },
      cartIcon: { type: String, trim: true, default: "#4A5568" },
      wishlistIcon: { type: String, trim: true, default: "#4A5568" },
      accountIcon: { type: String, trim: true, default: "#4A5568" },
    },

    footer: {
      background: { type: String, trim: true, default: "#1A202C" },
      text: { type: String, trim: true, default: "#A0AEC0" },
      heading: { type: String, trim: true, default: "#FFFFFF" },
      link: { type: String, trim: true, default: "#CBD5E0" },
      hoverLink: { type: String, trim: true, default: "#FFFFFF" },
      border: { type: String, trim: true, default: "#2D3748" },
      socialIcon: { type: String, trim: true, default: "#A0AEC0" },
      newsletterBackground: { type: String, trim: true, default: "#2D3748" },
      newsletterButton: { type: String, trim: true, default: "#6D4AFF" },
      newsletterText: { type: String, trim: true, default: "#FFFFFF" },
    },

    productGrid: {
      cardBackground: { type: String, trim: true, default: "#FFFFFF" },
      cardBorder: { type: String, trim: true, default: "#E2E8F0" },
      title: { type: String, trim: true, default: "#1A202C" },
      price: { type: String, trim: true, default: "#1A202C" },
      oldPrice: { type: String, trim: true, default: "#A0AEC0" },
      discountBackground: { type: String, trim: true, default: "#E53E3E" },
      discountText: { type: String, trim: true, default: "#FFFFFF" },
      rating: { type: String, trim: true, default: "#ECC94B" },
      buttonBackground: { type: String, trim: true, default: "#6D4AFF" },
      buttonText: { type: String, trim: true, default: "#FFFFFF" },
      buttonHover: { type: String, trim: true, default: "#553C9A" },
      wishlist: { type: String, trim: true, default: "#A0AEC0" },
      wishlistActive: { type: String, trim: true, default: "#E53E3E" },
    },

    buttons: {
      primaryBackground: { type: String, trim: true, default: "#6D4AFF" },
      primaryText: { type: String, trim: true, default: "#FFFFFF" },
      primaryHover: { type: String, trim: true, default: "#553C9A" },
      secondaryBackground: { type: String, trim: true, default: "#EDF2F7" },
      secondaryText: { type: String, trim: true, default: "#1A202C" },
      secondaryHover: { type: String, trim: true, default: "#E2E8F0" },
      border: { type: String, trim: true, default: "#E2E8F0" },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    collection: "dynamic_themes",
  }
);

module.exports =
  mongoose.models.DynamicTheme || mongoose.model("DynamicTheme", dynamicThemeSchema);
