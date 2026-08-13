const DynamicTheme = require("../models/DynamicTheme");
const { invalidateCache, redisClient } = require("../utils/cache");
const auditService = require("../services/audit.service");

// Helper to bust active theme cache
const bustActiveThemeCache = async () => {
  await invalidateCache("cache:/api/themes/active*");
  // Also support custom key if we ever set it manually
  if (redisClient && redisClient.status === "ready") {
    try {
      await redisClient.del("active_theme");
    } catch (err) {
      console.error("Failed to delete active_theme cache key", err);
    }
  }
};

exports.listThemes = async (req, res, next) => {
  try {
    const themes = await DynamicTheme.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: themes });
  } catch (error) {
    next(error);
  }
};

exports.getTheme = async (req, res, next) => {
  try {
    const theme = await DynamicTheme.findById(req.params.id);
    if (!theme) {
      return res.status(404).json({ success: false, message: "Theme not found" });
    }
    res.status(200).json({ success: true, data: theme });
  } catch (error) {
    next(error);
  }
};

exports.createTheme = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    const theme = new DynamicTheme({
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    });
    
    // Ensure slug is unique
    const existing = await DynamicTheme.findOne({ slug: theme.slug });
    if (existing) {
      return res.status(400).json({ success: false, message: "A theme with this slug already exists" });
    }

    if (theme.isActive) {
      // Deactivate others
      await DynamicTheme.updateMany({}, { isActive: false });
      await bustActiveThemeCache();
    }

    await theme.save();

    await auditService.log({
      action: "THEME_CREATED",
      actor: req.user,
      metadata: { details: `Created theme: ${theme.name}` },
    });

    res.status(201).json({ success: true, data: theme });
  } catch (error) {
    next(error);
  }
};

exports.updateTheme = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    const theme = await DynamicTheme.findById(req.params.id);
    
    if (!theme) {
      return res.status(404).json({ success: false, message: "Theme not found" });
    }

    if (req.body.slug && req.body.slug !== theme.slug) {
      const existing = await DynamicTheme.findOne({ slug: req.body.slug });
      if (existing) {
        return res.status(400).json({ success: false, message: "A theme with this slug already exists" });
      }
    }

    Object.assign(theme, req.body);
    theme.updatedBy = userId;

    if (theme.isActive) {
      await DynamicTheme.updateMany({ _id: { $ne: theme._id } }, { isActive: false });
      await bustActiveThemeCache();
    } else {
      await bustActiveThemeCache();
    }

    await theme.save();

    await auditService.log({
      action: "THEME_UPDATED",
      actor: req.user,
      metadata: { details: `Updated theme: ${theme.name}` },
    });

    res.status(200).json({ success: true, data: theme });
  } catch (error) {
    next(error);
  }
};

exports.deleteTheme = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    const theme = await DynamicTheme.findById(req.params.id);
    
    if (!theme) {
      return res.status(404).json({ success: false, message: "Theme not found" });
    }

    if (theme.isActive) {
      return res.status(400).json({ success: false, message: "Cannot delete the active theme. Activate another theme first." });
    }

    await DynamicTheme.findByIdAndDelete(req.params.id);

    await auditService.log({
      action: "THEME_DELETED",
      actor: req.user,
      metadata: { details: `Deleted theme: ${theme.name}` },
    });

    res.status(200).json({ success: true, message: "Theme deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.activateTheme = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    const theme = await DynamicTheme.findById(req.params.id);
    
    if (!theme) {
      return res.status(404).json({ success: false, message: "Theme not found" });
    }

    await DynamicTheme.updateMany({}, { isActive: false });
    theme.isActive = true;
    theme.updatedBy = userId;
    await theme.save();

    await bustActiveThemeCache();

    await auditService.log({
      action: "THEME_ACTIVATED",
      actor: req.user,
      metadata: { details: `Activated theme: ${theme.name}` },
    });

    res.status(200).json({ success: true, data: theme, message: "Theme activated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.setDefaultTheme = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    const theme = await DynamicTheme.findById(req.params.id);
    
    if (!theme) {
      return res.status(404).json({ success: false, message: "Theme not found" });
    }

    await DynamicTheme.updateMany({}, { isDefault: false });
    theme.isDefault = true;
    theme.updatedBy = userId;
    await theme.save();

    await auditService.log({
      action: "THEME_DEFAULT_CHANGED",
      actor: req.user,
      metadata: { details: `Set default theme: ${theme.name}` },
    });

    res.status(200).json({ success: true, data: theme, message: "Default theme set successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getActiveTheme = async (req, res, next) => {
  try {
    let activeTheme = await DynamicTheme.findOne({ isActive: true });
    
    if (!activeTheme) {
      activeTheme = await DynamicTheme.findOne({ isDefault: true });
    }

    if (!activeTheme) {
      activeTheme = {
        name: "Default Light",
        slug: "default-light",
        isActive: true,
        colors: {
          primary: "#6D4AFF",
          secondary: "#2D3748",
          accent: "#F6AD55",
          background: "#F7FAFC",
          surface: "#FFFFFF",
          text: "#1A202C",
          mutedText: "#718096",
          border: "#E2E8F0"
        },
        navbar: {
          background: "#FFFFFF",
          text: "#1A202C",
          hoverText: "#6D4AFF",
          activeText: "#6D4AFF",
          icon: "#4A5568",
          border: "#E2E8F0",
          searchBackground: "#F7FAFC",
          searchText: "#1A202C",
          cartIcon: "#4A5568",
          wishlistIcon: "#4A5568",
          accountIcon: "#4A5568"
        },
        footer: {
          background: "#1A202C",
          text: "#A0AEC0",
          heading: "#FFFFFF",
          link: "#CBD5E0",
          hoverLink: "#FFFFFF",
          border: "#2D3748",
          socialIcon: "#A0AEC0",
          newsletterBackground: "#2D3748",
          newsletterButton: "#6D4AFF",
          newsletterText: "#FFFFFF"
        },
        productGrid: {
          cardBackground: "#FFFFFF",
          cardBorder: "#E2E8F0",
          title: "#1A202C",
          price: "#1A202C",
          oldPrice: "#A0AEC0",
          discountBackground: "#E53E3E",
          discountText: "#FFFFFF",
          rating: "#ECC94B",
          buttonBackground: "#6D4AFF",
          buttonText: "#FFFFFF",
          buttonHover: "#553C9A",
          wishlist: "#A0AEC0",
          wishlistActive: "#E53E3E"
        },
        buttons: {
          primaryBackground: "#6D4AFF",
          primaryText: "#FFFFFF",
          primaryHover: "#553C9A",
          secondaryBackground: "#EDF2F7",
          secondaryText: "#1A202C",
          secondaryHover: "#E2E8F0",
          border: "#E2E8F0"
        }
      };
    }

    res.status(200).json({ success: true, data: activeTheme });
  } catch (error) {
    next(error);
  }
};
