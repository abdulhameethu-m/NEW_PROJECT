const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/modules/adminInfluencerCommerce/service.js');
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /^const mongoose = require\("mongoose"\);[\s\S]*?const \{ Campaign \} = require\("\.\.\/campaign\/model"\);/m,
  \`const mongoose = require("mongoose");
const crypto = require("crypto");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const { isInfluencerCommerceEnabled, invalidateInfluencerCommerceConfigCache } = require("../../services/influencer-commerce-config.service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");
const analyticsAggregator = require("../analytics/service");
const { AppError } = require("../../utils/AppError");
const { Campaign } = require("../campaign/model");\`
);
fs.writeFileSync(file, code);
console.log('Fixed imports');
