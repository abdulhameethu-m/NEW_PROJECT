const mongoose = require("mongoose");
const { Campaign } = require("../modules/campaign/model");

const CAMPAIGN_COLLECTIONS = [
  "campaign_acceptances",
  "campaign_invitations",
  "campaign_status_history",
  "campaign_product_shipments",
  "campaign_deliverables",
  "campaign_deliverable_funding",
  "deliverable_submissions",
  "deliverable_reviews",
  "deliverable_payouts",
  "campaign_execution_audit_logs",
  "campaign_metrics",
  "campaign_analytics",
  "campaign_analytics_events",
  "campaign_budget_controls",
  "campaign_budget_trackers",
  "campaign_escrow_wallets",
  "campaign_escrow_ledger",
  "campaign_payment_models",
  "campaign_payment_orders",
  "campaign_payment_releases",
  "campaign_payment_ledgers",
  "campaign_payment_audit_logs",
  "campaign_refunds",
  "campaign_finance_summary",
  "campaign_finance_orders",
  "campaign_order_attributions",
  "campaign_service_snapshots",
  "campaign_attribution_rules",
  "campaign_content_submissions",
  "commission_records",
  "commission_earnings",
  "commission_snapshots",
  "commission_wallet_transactions",
  "commission_adjustments",
  "commission_reversals",
  "reels",
  "tracking_sessions",
  "tracking_events",
];

function argValue(name, fallback = "") {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const uri = argValue("--uri", process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/amazon_likee");
  const pattern = new RegExp(argValue("--pattern", "^demo"), "i");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const campaigns = await Campaign.find({ title: pattern }).select("_id title state createdAt").sort({ createdAt: -1 }).lean();
  const ids = campaigns.map((campaign) => campaign._id);
  const idStrings = ids.map(String);
  const db = mongoose.connection.db;

  const results = [];
  for (const collectionName of CAMPAIGN_COLLECTIONS) {
    const collection = db.collection(collectionName);
    const filter = {
      $or: [
        { campaignId: { $in: ids } },
        { campaignId: { $in: idStrings } },
        { "metadata.campaignId": { $in: idStrings } },
        { "meta.campaignId": { $in: idStrings } },
      ],
    };
    const count = await collection.countDocuments(filter);
    if (!count) continue;
    const deleted = execute ? (await collection.deleteMany(filter)).deletedCount : 0;
    results.push({ collection: collectionName, matched: count, deleted });
  }

  const ordersFilter = {
    $or: [
      { "attribution.campaignId": { $in: ids } },
      { "attribution.campaignId": { $in: idStrings } },
    ],
  };
  const orderReferences = await db.collection("orders").countDocuments(ordersFilter);
  if (orderReferences) {
    results.push({ collection: "orders", matched: orderReferences, deleted: 0, note: "Kept orders; only attribution references were matched." });
  }

  const campaignCount = await Campaign.countDocuments({ _id: { $in: ids } });
  const deletedCampaigns = execute ? (await Campaign.deleteMany({ _id: { $in: ids } })).deletedCount : 0;
  results.unshift({ collection: "campaigns", matched: campaignCount, deleted: deletedCampaigns });

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    uri: uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@"),
    pattern: String(pattern),
    campaigns: campaigns.map((campaign) => ({
      id: String(campaign._id),
      title: campaign.title,
      state: campaign.state,
      createdAt: campaign.createdAt,
    })),
    results,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
