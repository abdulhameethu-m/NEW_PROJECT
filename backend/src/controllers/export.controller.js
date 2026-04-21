const { asyncHandler } = require("../utils/asyncHandler");
const exportService = require("../services/export.service");

const downloadReport = asyncHandler(async (req, res) => {
  const result = await exportService.exportModule({
    user: req.user,
    query: req.query,
  });

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename=\"${result.filename}\"`);
  res.send(result.buffer);
});

module.exports = {
  downloadReport,
};
