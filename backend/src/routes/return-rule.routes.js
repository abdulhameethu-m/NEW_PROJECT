const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const protect = authRequired;
const admin = requireRole("admin", "super_admin");
const { ReturnRule } = require("../models/ReturnRule");
const { Category } = require("../models/Category");
const { Subcategory } = require("../models/Subcategory");

const router = express.Router();

// @route   POST /api/return-rules
// @desc    Create a new return rule (Admin only)
// @access  Private/Admin
router.post("/", protect, admin, async (req, res) => {
  try {
    const { categoryId, subCategoryId, ruleType, returnDays } = req.body;

    if (!categoryId || !subCategoryId || !ruleType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (ruleType === "returnable" && !returnDays) {
      return res.status(400).json({ success: false, message: "Return days is required when rule type is returnable" });
    }

    const existingRule = await ReturnRule.findOne({ categoryId, subCategoryId });
    if (existingRule) {
      return res.status(400).json({ success: false, message: "Return rule for this subcategory already exists" });
    }

    const returnRule = await ReturnRule.create({
      categoryId,
      subCategoryId,
      ruleType,
      returnDays: ruleType === "returnable" ? returnDays : 0,
    });

    res.status(201).json({ success: true, data: returnRule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create return rule", error: error.message });
  }
});

// @route   GET /api/return-rules
// @desc    Get all return rules (Admin only)
// @access  Private/Admin
router.get("/", protect, admin, async (req, res) => {
  try {
    const returnRules = await ReturnRule.find()
      .populate("categoryId", "name")
      .populate("subCategoryId", "name")
      .sort("-createdAt");
    res.status(200).json({ success: true, data: returnRules });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch return rules", error: error.message });
  }
});

// @route   PUT /api/return-rules/:id
// @desc    Update a return rule (Admin only)
// @access  Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const { ruleType, returnDays } = req.body;

    const returnRule = await ReturnRule.findById(req.params.id);
    if (!returnRule) {
      return res.status(404).json({ success: false, message: "Return rule not found" });
    }

    if (ruleType) returnRule.ruleType = ruleType;
    if (ruleType === "no_return") {
      returnRule.returnDays = 0;
    } else if (returnDays !== undefined) {
      returnRule.returnDays = returnDays;
    }

    await returnRule.save();

    res.status(200).json({ success: true, data: returnRule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update return rule", error: error.message });
  }
});

// @route   DELETE /api/return-rules/:id
// @desc    Delete a return rule (Admin only)
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const returnRule = await ReturnRule.findById(req.params.id);
    if (!returnRule) {
      return res.status(404).json({ success: false, message: "Return rule not found" });
    }

    await returnRule.deleteOne();
    res.status(200).json({ success: true, message: "Return rule removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete return rule", error: error.message });
  }
});

// @route   GET /api/return-rules/public/:subCategoryId
// @desc    Get return rule for a specific subcategory (Public/Vendor user)
// @access  Public
router.get("/public/:subCategoryId", async (req, res) => {
  try {
    const rule = await ReturnRule.findOne({ subCategoryId: req.params.subCategoryId });
    if (!rule) {
      return res.status(200).json({ success: true, data: null });
    }
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch return rule", error: error.message });
  }
});

module.exports = router;
