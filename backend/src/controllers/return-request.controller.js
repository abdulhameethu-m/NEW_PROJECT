const returnRequestService = require("../services/return-request.service");
const { AppError } = require("../utils/AppError");
const { configureCloudinary } = require("../config/cloudinary");

// ── Evidence Upload Helper ────────────────────────────────────

async function uploadEvidenceToCloudinary(files = [], folder = "returns/evidence") {
  const urls = [];
  const assets = [];
  for (const file of files) {
    const asset = await returnRequestService.__mediaService.uploadIfNotExists(file, {
      folder,
      entityType: "ReturnRequest",
      entityId: "unknown",
      field: "evidence",
      visibility: "restricted"
    });
    urls.push(asset.url);
    assets.push(asset);
  }
  return { urls, assets };
}

// ── Customer Controllers ──────────────────────────────────────

async function customerCreateReturn(req, res, next) {
  try {
    const actor = req.user;
    const { orderId, productId, variantSku, quantity, reasonCode, customerDescription, subCategoryId } = req.body;

    let customerEvidence = [];
    let uploadedAssets = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return next(new AppError("Maximum 5 evidence photos allowed", 400, "VALIDATION_ERROR"));
      }
      const folder = `returns/evidence/customer/${Date.now()}`;
      const uploadResult = await uploadEvidenceToCloudinary(req.files, folder);
      customerEvidence = uploadResult.urls;
      uploadedAssets = uploadResult.assets;
    }

    const returnRequest = await returnRequestService.createReturnRequest({
      orderId,
      productId,
      variantSku: variantSku || "",
      quantity: Number(quantity),
      reasonCode,
      customerDescription: customerDescription || "",
      customerEvidence,
      subCategoryId: subCategoryId || null,
      actor,
    });

    // Link references
    for (const asset of uploadedAssets) {
      await returnRequestService.__mediaService.addReference(asset._id, {
        entityType: "ReturnRequest",
        entityId: returnRequest._id,
        field: "customerEvidence",
      });
    }

    res.status(201).json({ success: true, data: returnRequest, message: "Return request submitted successfully" });
  } catch (err) {
    next(err);
  }
}

async function customerGetReturns(req, res, next) {
  try {
    const customerId = req.user?.sub || req.user?._id;
    const { page, limit } = req.query;
    const result = await returnRequestService.getCustomerReturns(customerId, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getReturnById(req, res, next) {
  try {
    const doc = await returnRequestService.getById(req.params.id, req.user);
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

// ── Admin Controllers ─────────────────────────────────────────

async function adminGetStats(req, res, next) {
  try {
    const stats = await returnRequestService.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function adminListReturns(req, res, next) {
  try {
    const { status, vendorId, customerId, orderId, reasonCode, page, limit, startDate, endDate } = req.query;
    console.log("[adminListReturns] CALLED WITH:", req.query);
    const result = await returnRequestService.getAdminList({ status, vendorId, customerId, orderId, reasonCode, page, limit, startDate, endDate });
    console.log("[adminListReturns] RETURNING:", result.returns.length, "items.");
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[adminListReturns] ERROR:", err);
    next(err);
  }
}

async function adminGetReturn(req, res, next) {
  try {
    const doc = await returnRequestService.getById(req.params.id, req.user);
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

async function adminApproveReturn(req, res, next) {
  try {
    const { note } = req.body;
    const doc = await returnRequestService.adminApprove(req.params.id, req.user, note);
    res.json({ success: true, data: doc, message: "Return approved" });
  } catch (err) {
    next(err);
  }
}

async function adminRejectReturn(req, res, next) {
  try {
    const { reason } = req.body;
    const doc = await returnRequestService.adminReject(req.params.id, req.user, reason);
    res.json({ success: true, data: doc, message: "Return rejected" });
  } catch (err) {
    next(err);
  }
}

async function adminGetDisputes(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await returnRequestService.getAdminDisputeQueue({ page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function adminResolveDispute(req, res, next) {
  try {
    const { decision, reason } = req.body;
    const doc = await returnRequestService.adminResolveDispute(req.params.id, req.user, { decision, reason });
    res.json({ success: true, data: doc, message: "Dispute resolved" });
  } catch (err) {
    next(err);
  }
}

// ── Vendor Controllers ────────────────────────────────────────

async function vendorGetReturns(req, res, next) {
  try {
    const vendorId = req.user?.vendorId || req.user?.vendor?._id || req.vendor?._id;
    if (!vendorId) return next(new AppError("Vendor identity not found in token", 403, "FORBIDDEN"));
    const { status, page, limit, startDate, endDate } = req.query;
    const result = await returnRequestService.getVendorReturns(vendorId, { status, page, limit, startDate, endDate });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function vendorGetReturn(req, res, next) {
  try {
    const doc = await returnRequestService.getById(req.params.id, req.user);
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

async function vendorMarkReceived(req, res, next) {
  try {
    const doc = await returnRequestService.vendorMarkReceived(req.params.id, req.user);
    res.json({ success: true, data: doc, message: "Return marked as received" });
  } catch (err) {
    next(err);
  }
}

async function vendorCreatePickup(req, res, next) {
  try {
    const doc = await returnRequestService.vendorCreatePickup(req.params.id, req.user);
    res.json({ success: true, data: doc, message: "Reverse pickup scheduled successfully." });
  } catch (err) {
    next(err);
  }
}

async function vendorAccept(req, res, next) {
  try {
    const { notes } = req.body;
    const doc = await returnRequestService.vendorAccept(req.params.id, req.user, notes);
    res.json({ success: true, data: doc, message: "Return accepted. Refund initiated." });
  } catch (err) {
    next(err);
  }
}

async function vendorDispute(req, res, next) {
  try {
    const { reasonCode, description } = req.body;
    let evidence = [];
    let uploadedAssets = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return next(new AppError("Maximum 5 vendor evidence photos allowed", 400, "VALIDATION_ERROR"));
      }
      const folder = `returns/evidence/vendor/${Date.now()}`;
      const uploadResult = await uploadEvidenceToCloudinary(req.files, folder);
      evidence = uploadResult.urls;
      uploadedAssets = uploadResult.assets;
    }
    const doc = await returnRequestService.vendorDispute(req.params.id, req.user, { reasonCode, description, evidence });
    
    // Link references
    for (const asset of uploadedAssets) {
      await returnRequestService.__mediaService.addReference(asset._id, {
        entityType: "ReturnRequest",
        entityId: doc._id,
        field: "vendorEvidence",
      });
    }
    
    res.json({ success: true, data: doc, message: "Dispute submitted. Admin will review." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  customerCreateReturn,
  customerGetReturns,
  getReturnById,
  adminGetStats,
  adminListReturns,
  adminGetReturn,
  adminApproveReturn,
  adminRejectReturn,
  adminGetDisputes,
  adminResolveDispute,
  vendorGetReturns,
  vendorGetReturn,
  vendorCreatePickup,
  vendorMarkReceived,
  vendorAccept,
  vendorDispute,
};
