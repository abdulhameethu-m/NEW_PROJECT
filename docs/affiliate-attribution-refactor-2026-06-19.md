# Affiliate And Attribution Refactor - 2026-06-19

## Objective

Stabilize affiliate click tracking, order attribution, revenue attribution, commission attribution, campaign analytics, and dashboard metrics without removing Influencer Commerce, Commission Campaigns, Hybrid Campaigns, Campaign Analytics, Revenue Tracking, the Commission Engine, Wallets, or dashboard modules.

## Audit Summary

### Working Components

- Canonical affiliate collections already existed in `backend/src/modules/commission/models.js`:
  - `affiliate_links`
  - `affiliate_clicks`
  - `affiliate_attributions`
  - `affiliate_conversions`
- `trackingService.click()` creates a `TrackingSession`, signs a tracking token, emits tracking events, and calls `commissionService.recordAffiliateClickFromSession()`.
- Checkout attribution resolves cart or checkout tracking tokens and attaches `order.attribution`.
- Commission and campaign analytics already consume `CampaignAffiliateClick`, `CampaignAffiliateAttribution`, and `AffiliateConversion` in several places.

### Broken Components Removed Or Rewired

- Removed duplicate affiliate model definitions from `backend/src/modules/reel/engagement.model.js`.
- Rewired reel product click tracking so reels only record reel engagement rows and the tracking/commission engine owns affiliate click and attribution rows.
- Replaced duplicate conversion `create()` paths with an idempotent affiliate conversion upsert in `backend/src/modules/commission/service.js`.
- Changed influencer dashboard click counts to use canonical `affiliate_clicks` instead of the previous max of reel clicks, tracking sessions, and affiliate clicks.
- Changed influencer dashboard order/revenue rows to include `affiliate_conversions`, so conversion data can repair dashboard visibility even when legacy order attribution is incomplete.
- Changed campaign analytics and vendor commerce click aggregates to consume `affiliate_clicks` as the click source of truth.

## New Source Of Truth

The affiliate engine now treats these as the durable domain ledger:

- `AffiliateLink` -> `affiliate_links`
- `CampaignAffiliateClick` -> `affiliate_clicks`
- `CampaignAffiliateAttribution` -> `affiliate_attributions`
- `AffiliateConversion` -> `affiliate_conversions`

Flow:

1. Product click creates a tracking session and canonical affiliate click.
2. Canonical attribution is opened for that click/session/product.
3. Checkout resolves the tracking token and stores order attribution.
4. Order conversion upserts one `AffiliateConversion` by `orderId`.
5. Commission calculation can enrich the same conversion with final commission values.
6. Dashboards and analytics read from canonical affiliate clicks/conversions.

## Payment Model Coverage

- Fixed campaigns: clicks, orders, revenue, and products delivered remain tracked through affiliate clicks/conversions and campaign metrics.
- Commission campaigns: clicks, orders, revenue, commission, and conversion rate are tracked through affiliate clicks, conversions, commission snapshots, and earnings.
- Hybrid campaigns: fixed payout data remains in campaign release metrics; commission and revenue are tracked through conversions and commission earnings.
- Free product campaigns: clicks, orders, revenue, products shipped, and products delivered remain represented in campaign metrics without requiring commission earnings.

## Validation Performed

- `node -c` passed for:
  - `backend/src/modules/commission/service.js`
  - `backend/src/modules/commission/models.js`
  - `backend/src/modules/reel/service.js`
  - `backend/src/modules/reel/engagement.model.js`
  - `backend/src/modules/analytics/service.js`
  - `backend/src/modules/influencerCommerce/service.js`
- `npm.cmd run test:affiliate` passed.

## Notes

- Existing historical orders that have no `order.attribution` will not be retroactively changed by this refactor.
- New orders after this change should produce one conversion row per attributed order and dashboard order cards should be driven by `affiliate_conversions`.
- A production backfill can be added separately if old tracking sessions need to repair historical order attribution.
