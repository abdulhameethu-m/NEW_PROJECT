const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/modules/adminInfluencerCommerce/service.js');
let code = fs.readFileSync(file, 'utf8');

// 1. Add crypto
code = code.replace(
  /const mongoose = require\("mongoose"\);/,
  'const mongoose = require("mongoose");\nconst crypto = require("crypto");'
);

// 2. Add InfluencerPaymentProfile
code = code.replace(
  /InfluencerSocialAccount,\s*InfluencerProductAssignment,/,
  'InfluencerSocialAccount,\n  InfluencerPaymentProfile,\n  InfluencerProductAssignment,'
);

// 3. Add decryptSensitive
const decryptCode = `
function encryptionKey() {
  return crypto.createHash("sha256").update(process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || "dev-influencer-key").digest();
}
function decryptSensitive(encryptedData = "") {
  if (!encryptedData || typeof encryptedData !== "string") return "";
  const parts = encryptedData.split(":");
  if (parts.length !== 3) return "";
  try {
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const text = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(text), decipher.final()]).toString("utf8");
  } catch (e) {
    return "";
  }
}
`;
code = code.replace(
  /const \{ emitDomainEvent \} = require\("\.\.\/events\/event-bus"\);/,
  'const { emitDomainEvent } = require("../events/event-bus");\n' + decryptCode
);

// 4. Update payouts map
const payoutsTarget = /const accountIds = wallets\.map\(\(wallet\) => wallet\.influencerId\?._id \|\| wallet\.influencerId\);\s*const accounts = await InfluencerPayoutAccount\.find\(\{ influencerId: \{ \$in: accountIds \}, isActive: true \}\)\.lean\(\);\s*const accountMap = new Map\(accounts\.map\(\(account\) => \[String\(account\.influencerId\), account\]\)\);\s*return \{\s*items: wallets\.map\(\(wallet\) => \(\{ \.\.\.wallet, influencerName: influencerName\(wallet\.influencerId\), payoutAccount: accountMap\.get\(String\(wallet\.influencerId\?._id \|\| wallet\.influencerId\)\) \}\)\),\s*withdrawalRequests: withdrawals\.map\(\(request\) => \(\{\s*\.\.\.request,\s*influencerName: influencerName\(request\.influencerId\),\s*accountLabel: request\.bankAccountId\?\.bankName \|\| request\.bankAccountId\?\.paymentMethod \|\| "",\s*\}\)\),/m;

const payoutsReplacement = `    const accountIds = wallets.map((wallet) => wallet.influencerId?._id || wallet.influencerId);
    const accounts = await InfluencerPayoutAccount.find({ influencerId: { $in: accountIds }, isActive: true }).lean();
    const accountMap = new Map(accounts.map((account) => [String(account.influencerId), account]));
    
    const withdrawalInfluencerIds = [...new Set(withdrawals.map(w => String(w.influencerId?._id || w.influencerId)))];
    const paymentProfiles = await InfluencerPaymentProfile.find({ influencerId: { $in: withdrawalInfluencerIds } }).lean();
    const paymentProfileMap = new Map(paymentProfiles.map(p => [String(p.influencerId), p]));

    return {
      items: wallets.map((wallet) => ({ ...wallet, influencerName: influencerName(wallet.influencerId), payoutAccount: accountMap.get(String(wallet.influencerId?._id || wallet.influencerId)) })),
      withdrawalRequests: withdrawals.map((request) => {
        let accountLabel = request.bankAccountId?.bankName || request.bankAccountId?.paymentMethod || "";
        let bankAccountDetails = request.bankAccountId || null;
        
        if (request.metadata?.selectedAccountId) {
          const profile = paymentProfileMap.get(String(request.influencerId?._id || request.influencerId));
          if (profile && profile.additionalBankAccounts) {
            const selected = profile.additionalBankAccounts.find(acc => String(acc._id) === String(request.metadata.selectedAccountId));
            if (selected) {
              accountLabel = selected.bankName || selected.payoutMethod || "Saved Account";
              bankAccountDetails = {
                ...selected,
                upiId: selected.upiIdEncrypted ? decryptSensitive(selected.upiIdEncrypted) : "",
                paypalEmail: selected.paypalEmailEncrypted ? decryptSensitive(selected.paypalEmailEncrypted) : "",
                accountNumber: selected.accountNumberEncrypted ? decryptSensitive(selected.accountNumberEncrypted) : "",
              };
            }
          }
        }
        
        return {
          ...request,
          influencerName: influencerName(request.influencerId),
          accountLabel,
          bankAccountDetails,
        };
      }),`;

code = code.replace(payoutsTarget, payoutsReplacement);

fs.writeFileSync(file, code);
console.log('Successfully patched admin service.js');
