# Enterprise Codebase Audit - 2026-06-25

## Section 1 - Architecture Findings

- Frontend: Vite React SPA with route declarations in `frontend/src/App.jsx`.
- Backend: Express API mounted from `backend/src/app.js` with Mongoose domain models and Bull/Cron jobs.
- Source files scanned: 806
- Frontend route declarations: 198
- Backend route mounts: 64
- Backend endpoint declarations: 689
- Mongoose model declarations found: 221
- Scheduled/queue triggers found: 9
- Full JSON graph: `docs/enterprise-codebase-dependency-graph-2026-06-25.json`

## Section 2 - Unused Files

The following files have zero static inbound imports in the source graph. They are **not automatically safe to delete**; each one needs runtime verification for routing, scripts, external calls, generated imports, and scheduled triggers.

| file |category |size |proof |
| --- |--- |--- |--- |
| frontend/src/pages/ShopPage.jsx |frontend-page |18379 |zero-static-inbound-needs-runtime-verification |
| frontend/src/__tests__/guestUX.test.js |test |13251 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/AdminPayoutAccountPanel.jsx |frontend-component |12642 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/VendorShippingPanel.jsx |frontend-component |11905 |zero-static-inbound-needs-runtime-verification |
| frontend/src/pages/SellerProductsPage.jsx |frontend-page |11846 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/OrderTrackingPanel.jsx |frontend-component |10816 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/HeroSlider.jsx |frontend-component |10711 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/campaign/ReleasePaymentModal.jsx |frontend-component |10144 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/ProductSection.jsx |frontend-component |9907 |zero-static-inbound-needs-runtime-verification |
| frontend/src/pages/AdminNotificationCenterPage.jsx |frontend-page |9509 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/campaign/EscrowStatusTracker.jsx |frontend-component |9424 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/VirtualList.jsx |frontend-component |9112 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/ErrorBoundaries.jsx |frontend-component |8628 |zero-static-inbound-needs-runtime-verification |
| frontend/src/utils/imageOptimization.jsx |frontend-utility |8350 |zero-static-inbound-needs-runtime-verification |
| backend/src/scripts/seedPlatformElectronicsProducts.js |backend-script |8126 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/campaign-escrow-domain.test.js |test |7502 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/commerce/DynamicPriceBreakdown.jsx |frontend-component |7180 |zero-static-inbound-needs-runtime-verification |
| frontend/src/pages/VendorInventoryPage.jsx |frontend-page |7024 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/SkeletonLoaders.jsx |frontend-component |6654 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/auth-cookie-csrf-security.test.js |test |6449 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/BannerCarousel.jsx |frontend-component |6344 |zero-static-inbound-needs-runtime-verification |
| backend/src/modules/staff/utils/permission-logger.js |backend-module |5759 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/platform-bootstrap-security.test.js |test |5337 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/campaign-domain.test.js |test |5313 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/VendorModuleSidebar.jsx |frontend-component |5111 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/ProductImage.jsx |frontend-component |4861 |zero-static-inbound-needs-runtime-verification |
| frontend/src/hooks/useAdmin.js |frontend-hook |4624 |zero-static-inbound-needs-runtime-verification |
| frontend/src/types/influencerRegistration.d.ts |type-definition |4349 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/MultiSelect.jsx |frontend-component |4052 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/campaign-dynamic-funding-domain.test.js |test |4029 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/commission-domain.test.js |test |3527 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/analytics/EarningsPanel.jsx |frontend-component |3492 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/private-document-security.test.js |test |3457 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/campaign/CampaignPanel.jsx |frontend-component |3361 |zero-static-inbound-needs-runtime-verification |
| frontend/src/services/staffPermissionService.js |frontend-service |3308 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/campaign-execution-domain.test.js |test |3195 |zero-static-inbound-needs-runtime-verification |
| frontend/src/config/adminSidebar.js |source |3165 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/company-branding-domain.test.js |test |3084 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/__tests__/homepage-layout-visual.test.js |test |3067 |zero-static-inbound-needs-runtime-verification |
| frontend/src/components/influencer/CampaignCard.jsx |frontend-component |2952 |zero-static-inbound-needs-runtime-verification |


## Section 3 - Unused Services

Potential service candidates are the zero-inbound rows whose category is `frontend-service` or `backend-service`. Treat backend services as active until controller/module/script usage and external integrations are checked.

| file |size |proof |
| --- |--- |--- |
| frontend/src/services/staffPermissionService.js |3308 |zero-static-inbound-needs-runtime-verification |
| backend/src/services/pendingAction.service.js |2602 |zero-static-inbound-needs-runtime-verification |
| frontend/src/services/orderService.js |684 |zero-static-inbound-needs-runtime-verification |


## Section 4 - Unused APIs

No API route was removed. Backend mounts and endpoints were mapped for manual verification. Duplicate/shadow candidates are listed below.

Duplicate mount handler groups:

- `/uploads`: express.static(path.join(process.cwd(), "uploads", "public"), {, express.static(path.join(process.cwd(), "uploads"), {
- `/api`: apiLimiter), pickupRoutes), marketplaceSettlementRoutes), analyticsRoutes)
- `/api/admin`: adminRoutes), settlementRoutes)

Duplicate endpoint path groups:

- `GET /dashboard`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/modules/influencer/routes.js, backend/src/modules/influencerCommerce/routes.js, backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `GET /vendors`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/routes/admin.routes.js, backend/src/routes/public.routes.js
- `GET /campaigns`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/modules/influencerCommerce/routes.js
- `GET /payouts`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `GET /settings`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/routes/invoice.routes.js
- `GET /audit-logs`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/routes/admin.routes.js
- `GET /configuration`: backend/src/modules/adminInfluencerCommerce/routes.js, backend/src/modules/influencerCommerce/routes.js
- `POST /create`: backend/src/modules/campaign/routes.js, backend/src/routes/checkout.routes.js, backend/src/routes/order.routes.js
- `GET /vendor`: backend/src/modules/campaign/routes.js, backend/src/modules/campaignFinance/routes.js, backend/src/routes/review.routes.js
- `GET /influencer`: backend/src/modules/campaign/routes.js, backend/src/modules/campaignFinance/routes.js, backend/src/modules/reel/routes.js
- `GET /admin/list`: backend/src/modules/campaign/routes.js, backend/src/modules/influencer/routes.js, backend/src/modules/reel/routes.js
- `GET /admin`: backend/src/modules/campaignFinance/routes.js, backend/src/routes/review.routes.js
- `GET /affiliate-products`: backend/src/modules/influencer/routes.js, backend/src/modules/influencerCommerce/routes.js
- `POST /register`: backend/src/modules/influencer/routes.js, backend/src/routes/auth.routes.js
- `GET /products`: backend/src/modules/influencerCommerce/routes.js, backend/src/routes/admin.routes.js
- `GET /analytics`: backend/src/modules/influencerCommerce/routes.js, backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `GET /product/:productId`: backend/src/modules/recommendation/routes.js, backend/src/routes/inventory.routes.js
- `GET /cart`: backend/src/modules/recommendation/routes.js, backend/src/routes/user.routes.js
- `POST /media`: backend/src/modules/reel/routes.js, backend/src/routes/product.routes.js
- `GET /:id`: backend/src/modules/reel/routes.js, backend/src/routes/order.routes.js, backend/src/routes/payment.routes.js, backend/src/routes/product.routes.js
- `GET /analytics/products/:id`: backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `GET /orders`: backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `GET /inventory`: backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `PATCH /orders/:id/status`: backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `PATCH /orders/:id/cancel`: backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js
- `POST /orders/:id/cancel`: backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js
- `GET /orders/:id`: backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `GET /refunds`: backend/src/routes/admin.routes.js, backend/src/routes/payment.routes.js
- `GET /payout-requests`: backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `POST /products/media`: backend/src/routes/admin.routes.js, backend/src/routes/vendor.routes.js
- `GET /reviews`: backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `DELETE /reviews/:id`: backend/src/routes/admin.routes.js, backend/src/routes/user.routes.js
- `GET /pricing-rules`: backend/src/routes/admin.routes.js, backend/src/routes/pricing.routes.js
- `GET /`: backend/src/routes/adminNotification.routes.js, backend/src/routes/attribute.routes.js, backend/src/routes/cart.routes.js, backend/src/routes/category.routes.js, backend/src/routes/compare.routes.js, backend/src/routes/config.routes.js, backend/src/routes/export.routes.js, backend/src/routes/homepage-container.routes.js, backend/src/routes/notification.routes.js, backend/src/routes/payment.routes.js, backend/src/routes/pricing.routes.js, backend/src/routes/product-module.routes.js, backend/src/routes/product.routes.js, backend/src/routes/shippingConfig.routes.js, backend/src/routes/subcategory.routes.js, backend/src/routes/vendorModule.routes.js, backend/src/routes/wishlist.routes.js
- `DELETE /:id`: backend/src/routes/adminNotification.routes.js, backend/src/routes/product.routes.js, backend/src/routes/review.routes.js
- `GET /me`: backend/src/routes/auth.routes.js, backend/src/routes/vendor.routes.js
- `POST /merge`: backend/src/routes/cart.routes.js, backend/src/routes/compare.routes.js, backend/src/routes/wishlist.routes.js
- `GET /:productId/status`: backend/src/routes/compare.routes.js, backend/src/routes/wishlist.routes.js
- `POST /:productId`: backend/src/routes/compare.routes.js, backend/src/routes/wishlist.routes.js
- `DELETE /:productId`: backend/src/routes/compare.routes.js, backend/src/routes/wishlist.routes.js
- `GET /:key`: backend/src/routes/config.routes.js, backend/src/routes/vendorModule.routes.js
- `PATCH /:key`: backend/src/routes/config.routes.js, backend/src/routes/vendorModule.routes.js
- `GET /:slug/products`: backend/src/routes/homepage-container.routes.js, backend/src/routes/vendor-public.routes.js, backend/src/routes/vendor-storefront.routes.js
- `GET /public`: backend/src/routes/homepage-layout.routes.js, backend/src/routes/product.routes.js
- `GET /summary`: backend/src/routes/notification.routes.js, backend/src/routes/pricing.routes.js, backend/src/routes/review.routes.js, backend/src/routes/shippingConfig.routes.js
- `POST /`: backend/src/routes/product.routes.js, backend/src/routes/review.routes.js, backend/src/routes/shippingConfig.routes.js
- `GET /returns`: backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `GET /notifications`: backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `PATCH /notifications/:id/read`: backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `POST /support/:id/reply`: backend/src/routes/user.routes.js, backend/src/routes/vendor.routes.js
- `GET /:slug`: backend/src/routes/vendor-public.routes.js, backend/src/routes/vendor-storefront.routes.js
- `POST /:slug/follow`: backend/src/routes/vendor-public.routes.js, backend/src/routes/vendor-storefront.routes.js
- `DELETE /:slug/follow`: backend/src/routes/vendor-public.routes.js, backend/src/routes/vendor-storefront.routes.js

## Section 5 - Unused Schemas

Mongoose schemas/models require database/runtime verification before removal. Model declarations found:

| model |file |
| --- |--- |
| AdminNotification |backend/src/models/AdminNotification.js |
| Attribute |backend/src/models/Attribute.js |
| AuditLog |backend/src/models/AuditLog.js |
| CampaignDeliverableFunding |backend/src/models/CampaignDeliverableFunding.js |
| CampaignEscrowLedger |backend/src/models/CampaignEscrowLedger.js |
| CampaignEscrowWallet |backend/src/models/CampaignEscrowWallet.js |
| CampaignFeeConfiguration |backend/src/models/CampaignFeeConfiguration.js |
| CampaignPaymentOrder |backend/src/models/CampaignPaymentOrder.js |
| CampaignPaymentRelease |backend/src/models/CampaignPaymentRelease.js |
| CampaignRefund |backend/src/models/CampaignRefund.js |
| CancellationPolicy |backend/src/models/CancellationPolicy.js |
| Cart |backend/src/models/Cart.js |
| Category |backend/src/models/Category.js |
| CODConfig |backend/src/models/CODConfig.js |
| CommissionRule |backend/src/models/CommissionRule.js |
| CompanyBranding |backend/src/models/CompanyBranding.js |
| CompanyBrandingVersion |backend/src/models/CompanyBrandingVersion.js |
| CompareItem |backend/src/models/CompareItem.js |
| DocumentAccessLog |backend/src/models/DocumentAccessLog.js |
| HomepageContainer |backend/src/models/HomepageContainer.js |
| HomepageLayout |backend/src/models/HomepageLayout.js |
| HomepageLayoutAssignment |backend/src/models/HomepageLayoutAssignment.js |
| HomepageLayoutDraft |backend/src/models/HomepageLayoutDraft.js |
| HomepageLayoutVersion |backend/src/models/HomepageLayoutVersion.js |
| InfluencerScoreConfig |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerTier |backend/src/models/InfluencerCommerceConfig.js |
| VendorSubscriptionPlan |backend/src/models/InfluencerCommerceConfig.js |
| VendorSubscription |backend/src/models/InfluencerCommerceConfig.js |
| SubscriptionPayment |backend/src/models/InfluencerCommerceConfig.js |
| SubscriptionRevenue |backend/src/models/InfluencerCommerceConfig.js |
| VendorSubscriptionChange |backend/src/models/InfluencerCommerceConfig.js |
| SubscriptionCreditWallet |backend/src/models/InfluencerCommerceConfig.js |
| CampaignBudgetControl |backend/src/models/InfluencerCommerceConfig.js |
| BudgetProtectionRule |backend/src/models/InfluencerCommerceConfig.js |
| MarketplaceRankingRule |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerPlatformConfiguration |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerServiceType |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerPackageTemplate |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerCategoryOption |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerLanguageOption |backend/src/models/InfluencerCommerceConfig.js |
| CampaignAttributionWindow |backend/src/models/InfluencerCommerceConfig.js |
| CampaignPaymentModelConfig |backend/src/models/InfluencerCommerceConfig.js |
| CampaignTypeConfig |backend/src/models/InfluencerCommerceConfig.js |
| CampaignPaymentModelOption |backend/src/models/InfluencerCommerceConfig.js |
| CampaignPaymentRuleConfig |backend/src/models/InfluencerCommerceConfig.js |
| CampaignDynamicFieldConfig |backend/src/models/InfluencerCommerceConfig.js |
| CampaignValidationRuleConfig |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerRequirementField |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerCampaignTemplate |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerDiscoveryRule |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerCampaignRule |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerDynamicFormField |backend/src/models/InfluencerCommerceConfig.js |
| InfluencerConfigVersion |backend/src/models/InfluencerCommerceConfig.js |
| ConfigAuditLog |backend/src/models/InfluencerCommerceConfig.js |
| InventoryLedger |backend/src/models/InventoryLedger.js |
| InvoiceAuditLog |backend/src/models/InvoiceAuditLog.js |
| InvoiceMetadata |backend/src/models/InvoiceMetadata.js |
| InvoiceSettings |backend/src/models/InvoiceSettings.js |
| Ledger |backend/src/models/Ledger.js |
| Notification |backend/src/models/Notification.js |


## Section 6 - Unused Database Connections

No unused database connection was removed. The audit identified Redis/Bull usage and Mongo/Mongoose usage through imports and queue declarations. Database cleanup requires live collection statistics and query profiling.

Schedulers and queues:

| type |expression |file |
| --- |--- |--- |
| cron |cronExpression |backend/src/jobs/influencer-commerce.job.js |
| cron |schedule |backend/src/jobs/payment-maintenance.job.js |
| cron |schedule |backend/src/jobs/settlement.job.js |
| bull |settlement |backend/src/jobs/settlement.job.js |
| bull |influencer-events |backend/src/modules/events/event-bus.js |
| cron |settings.scheduling.rebuildCron \|\| "0 */6 * * *" |backend/src/modules/recommendation/job.js |
| cron |settings.scheduling.analyticsCron \|\| "*/30 * * * *" |backend/src/modules/recommendation/job.js |
| cron |settings.scheduling.cacheRefreshCron \|\| "0 * * * *" |backend/src/modules/recommendation/job.js |
| bull |recommendation-engine |backend/src/modules/recommendation/job.js |


## Section 7 - Duplicate Logic

High-signal duplicate/shadow areas:

- Payment routes are mounted under both `/api/payments` and `/api/payment`; likely compatibility alias, verify external clients before removal.
- Large domain services contain repeated dashboard and analytics aggregation patterns; split read models only after profiling.
- Frontend pages with tabbed mega-components should be decomposed into tab-level lazy chunks.

Largest files:

| file |category |size |
| --- |--- |--- |
| frontend/src/pages/VendorInfluencerPage.jsx |frontend-page |167066 |
| backend/src/modules/commission/service.js |backend-module |158778 |
| backend/src/modules/influencer/service.js |backend-module |134706 |
| frontend/src/pages/AdminHomepageContainersPage.jsx |frontend-page |120433 |
| frontend/src/pages/AdminInfluencerCommercePage.jsx |frontend-page |120231 |
| backend/src/modules/influencerCommerce/service.js |backend-module |115270 |
| frontend/src/components/homepage/DynamicHomepageRenderer.jsx |frontend-component |92311 |
| backend/src/modules/adminInfluencerCommerce/service.js |backend-module |77095 |
| frontend/src/pages/InfluencerPublicStorefrontPage.jsx |frontend-page |73954 |
| backend/src/services/checkout.service.js |backend-service |70288 |
| frontend/src/pages/AdminHomepageBuilderPage.jsx |frontend-page |68176 |
| backend/src/services/homepage-container.service.js |backend-service |65422 |
| backend/src/services/influencer-commerce-engine.service.js |backend-service |64883 |
| frontend/src/pages/influencer/campaigns.jsx |frontend-page |64049 |
| backend/src/services/payment.service.js |backend-service |63712 |
| frontend/src/pages/CheckoutPage.jsx |frontend-page |58713 |
| backend/src/services/homepage-layout.service.js |backend-service |58035 |
| backend/src/services/campaign-escrow.service.js |backend-service |52818 |
| backend/src/modules/reel/service.js |backend-module |48503 |
| frontend/src/components/ProductEditor.jsx |frontend-component |47721 |
| frontend/src/pages/AdminCommerceIntelligencePage.jsx |frontend-page |47480 |
| frontend/src/assets/hero.png |source |44919 |
| frontend/src/pages/ProductsPage.jsx |frontend-page |44370 |
| backend/src/services/product-analytics.service.js |backend-service |42866 |
| backend/src/modules/influencer/model.js |backend-module |42518 |
| frontend/src/components/reel/ReelFeed.jsx |frontend-component |42067 |
| backend/src/config/homepageContainerRegistry.js |source |42018 |
| backend/src/services/cancellation-refund.service.js |backend-service |40920 |
| frontend/src/pages/InfluencersHubPage.jsx |frontend-page |40259 |
| frontend/src/pages/VendorSettingsPage.jsx |frontend-page |39985 |


## Section 8 - Safe Removal Plan

For every candidate:

1. Confirm zero static inbound references in `docs/enterprise-codebase-dependency-graph-2026-06-25.json`.
2. Confirm it is not an App route, backend route mount, package script target, cron job, Bull queue, webhook handler, or external integration callback.
3. Confirm no dynamic string-based import or external HTTP client depends on it.
4. Remove in a small batch.
5. Run frontend build and backend route/domain tests.

Package candidates with no static source imports:

| package |version |status |
| --- |--- |--- |
| @eslint/js |^9.39.4 |no-static-source-import |
| @types/react |^19.2.14 |no-static-source-import |
| @types/react-dom |^19.2.3 |no-static-source-import |
| @vitejs/plugin-react |^6.0.1 |no-static-source-import |
| autoprefixer |^10.4.27 |no-static-source-import |
| eslint |^9.39.4 |no-static-source-import |
| eslint-plugin-react-hooks |^7.0.1 |no-static-source-import |
| eslint-plugin-react-refresh |^0.5.2 |no-static-source-import |
| globals |^17.4.0 |no-static-source-import |
| postcss |^8.5.9 |no-static-source-import |
| react-rnd |^10.5.3 |no-static-source-import |
| tailwindcss |^3.4.19 |no-static-source-import |
| vite |^8.0.4 |no-static-source-import |
| mongodb |^7.1.1 |no-static-source-import |
| nodemon |^3.1.14 |no-static-source-import |


Build tools, CLIs, type packages, and packages loaded by configuration may legitimately appear in this list. Remove packages only after checking `package.json` scripts, config files, generated code, and runtime integration settings.

## Section 9 - Performance Optimization Plan

- Keep frontend app code route-split. Avoid feature-level app chunks that pull whole admin/vendor/influencer panels.
- Split large active pages:
  - `VendorInfluencerPage.jsx`
  - `AdminHomepageContainersPage.jsx`
  - `AdminInfluencerCommercePage.jsx`
  - `InfluencerPublicStorefrontPage.jsx`
- Add request timing middleware and profile slow dashboard endpoints.
- Capture Mongo `explain("executionStats")` for dashboard, campaign, affiliate tracking, commission, wallet, escrow, and analytics queries before adding/removing indexes.
- Move expensive dashboard analytics to pre-aggregated read models where endpoints aggregate many collections on every load.

## Section 10 - Implementation Changes

- Added repeatable audit generator: `scripts/codebase-audit.mjs`.
- Generated dependency graph: `docs/enterprise-codebase-dependency-graph-2026-06-25.json`.
- Generated this enterprise audit report.
- No files, routes, schemas, jobs, packages, or APIs were deleted in this pass.
