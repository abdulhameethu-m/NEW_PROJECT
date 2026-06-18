const test = require("node:test");
const assert = require("node:assert/strict");
const { CampaignDeliverable, DeliverableSubmission, DeliverableReview, DeliverablePayout } = require("../../modules/campaign/executionModel");
const executionService = require("../../modules/campaign/executionService");

const { deriveDeliverables, progress, requiredPublishedContentCount, allDeliverablesPublished } = executionService.__private__;

test("campaign execution models use requested collection boundaries", () => {
  assert.equal(CampaignDeliverable.collection.collectionName, "campaign_deliverables");
  assert.equal(DeliverableSubmission.collection.collectionName, "deliverable_submissions");
  assert.equal(DeliverableReview.collection.collectionName, "deliverable_reviews");
  assert.equal(DeliverablePayout.collection.collectionName, "deliverable_payouts");
});

test("deriveDeliverables builds dynamic deliverables from selected services", () => {
  const deliverables = deriveDeliverables({
    pricing: { currency: "INR" },
    influencerRateSnapshot: {
      selectedServices: [
        { serviceTypeKey: "reel", serviceName: "Reel", quantity: 1, total: 1000 },
        { serviceTypeKey: "post", serviceName: "Post", quantity: 2, total: 2000 },
      ],
    },
  });

  assert.equal(deliverables.length, 2);
  assert.equal(deliverables[0].deliverableType, "reel");
  assert.equal(deliverables[0].unitPrice, 1000);
  assert.equal(deliverables[1].quantity, 2);
  assert.equal(deliverables[1].unitPrice, 1000);
});

test("deriveDeliverables expands package quantity into required published deliverables", () => {
  const deliverables = deriveDeliverables({
    pricing: { currency: "INR" },
    influencerRateSnapshot: {
      selectedServices: [
        { serviceTypeKey: "reel", serviceName: "Reel Bundle", quantity: 1, packageQuantity: 3, total: 3000 },
      ],
    },
  });

  assert.equal(deliverables.length, 1);
  assert.equal(deliverables[0].quantity, 3);
  assert.equal(deliverables[0].unitPrice, 1000);
});

test("deriveDeliverables falls back to vendor required deliverables without hardcoded types", () => {
  const deliverables = deriveDeliverables({
    marketplace: { requiredDeliverables: ["Podcast Clip", "Newsletter Mention"] },
  });

  assert.deepEqual(deliverables.map((row) => row.deliverableType), ["podcast_clip", "newsletter_mention"]);
});

test("progress supports partial completion percentages", () => {
  assert.deepEqual(progress([
    { status: "completed", completionStatus: "completed" },
    { status: "pending", completionStatus: "pending" },
    { status: "under_review", completionStatus: "pending" },
  ]), { completed: 1, total: 3, completionPercent: 33 });
});

test("publication requirement uses deliverable quantities", () => {
  const deliverables = [
    { quantity: 3 },
    { quantity: 1 },
  ];

  assert.equal(requiredPublishedContentCount(deliverables), 4);
  assert.deepEqual(allDeliverablesPublished(deliverables, 3), { requiredCount: 4, publishedCount: 3, complete: false });
  assert.deepEqual(allDeliverablesPublished(deliverables, 4), { requiredCount: 4, publishedCount: 4, complete: true });
});
