# Production Performance Audit - 2026-06-19

## Scope

This pass covered the Vite React frontend, Express/Mongoose backend route surface, background jobs, build output, and high-confidence dead-code candidates. The focus was safe optimization without breaking admin, vendor, influencer, checkout, payment, affiliate, campaign, commission, escrow, wallet, analytics, or RBAC flows.

## Implemented Changes

### Frontend Bundle And Startup

- Reworked `frontend/vite.config.js` to use vendor-only manual chunks.
  - Removed app feature chunk grouping for admin/vendor/influencer/commerce pages.
  - Result: route lazy imports now create independent route chunks instead of large feature bundles.
- Lazy-loaded heavy layout shells in `frontend/src/App.jsx`.
  - `Layout`, `AdminLayout`, `VendorLayout`, `UserAccountLayout`, and `StaffDashboardLayout` now load only when their route group is entered.
- Disabled build-time `modulepreload` injection in `frontend/vite.config.js`.
  - Prevents homepage HTML from preloading dashboard-only shared chunks.
- Moved `react-date-range` CSS imports out of `frontend/src/main.jsx` and into `frontend/src/components/DateRangePicker.jsx`.
  - Prevents global date-picker CSS from being linked by the initial HTML.

### Dead Code Removed

Removed an isolated performance-demo/helper cluster that was not imported by runtime app code:

- `frontend/src/examples/PerformanceExamples.jsx`
- `frontend/src/utils/apiOptimization.js`
- `frontend/src/utils/moduleLazyLoader.js`
- `frontend/src/utils/prefetchManager.js`
- `frontend/src/utils/serviceWorkerManager.js`
- `frontend/src/hooks/usePerformance.js`

These files referenced only each other or the example file and were not part of `App.jsx` routes or application services.

## Build Measurements

Before this pass, the build contained broad app feature bundles:

- `chunk-admin`: ~1,739.97 KB raw / ~425.29 KB gzip
- `chunk-vendor`: ~318.51 KB raw / ~67.24 KB gzip
- `chunk-commerce`: ~309.32 KB raw / ~68.84 KB gzip
- `chunk-influencer`: ~200.91 KB raw / ~42.60 KB gzip
- App entry: ~162.90 KB raw / ~38.43 KB gzip before layout laziness, later observed ~174.50 KB raw / ~41.94 KB gzip after route chunk regrouping

After this pass:

- App entry: ~40.31 KB raw / ~8.40 KB gzip
- `index.html`: ~0.77 KB raw / ~0.41 KB gzip
- Largest app route chunk: `VendorInfluencerPage`, ~122.39 KB raw / ~26.64 KB gzip
- Admin/vendor/influencer pages are emitted as independent route chunks.
- Initial HTML no longer includes modulepreload links for vendor charts, date range, admin/vendor layouts, or dashboard-only route dependencies.

## Backend Audit Findings

Largest backend files by source size:

- `backend/src/modules/commission/service.js` (~156 KB)
- `backend/src/modules/influencer/service.js` (~135 KB)
- `backend/src/modules/influencerCommerce/service.js` (~115 KB)
- `backend/src/modules/adminInfluencerCommerce/service.js` (~77 KB)
- `backend/src/services/checkout.service.js` (~68 KB)
- `backend/src/services/homepage-container.service.js` (~65 KB)
- `backend/src/services/payment.service.js` (~64 KB)

These are not safe delete candidates. They are active domain services and should be optimized by endpoint profiling, query explain plans, and route-specific refactors.

Background jobs found:

- `settlement.job.js`
- `payment-maintenance.job.js`
- `influencer-commerce.job.js`
- `cod-analytics.job.js`
- `cod-pending-audit.job.js`
- Recommendation and event queues under modules

No jobs were removed in this pass because settlement, payment maintenance, analytics, and influencer event processing are production-sensitive.

## High-Confidence Next Backend Work

- Add request timing logs per route group for admin/vendor/influencer dashboards.
- Capture MongoDB `explain("executionStats")` for slow dashboard endpoints before adding/removing indexes.
- Split large service files by read model vs mutation workflow:
  - commission dashboard/read APIs
  - influencer public storefront reads
  - vendor influencer commerce analytics
- Move page-load analytics toward cached/pre-aggregated read models where endpoints currently aggregate multiple collections on each request.
- Review dashboard polling intervals after endpoint profiling.

## Deferred Cleanup Candidates

These need one more confirmation pass before removal:

- `frontend/src/config/queryConfig.js` and `@tanstack/react-query`
  - The config is not wired into `main.jsx`, but dependency removal should update lockfiles intentionally.
- Large page files such as `VendorInfluencerPage.jsx`, `AdminInfluencerCommercePage.jsx`, and `AdminHomepageContainersPage.jsx`
  - They are active routes, but should be split into tab-level lazy components.
- Backend duplicate payment aliases:
  - `/api/payments` and `/api/payment` both mount payment routes. This may be backwards compatibility, not dead code.

## Verification

- `npm run build` passed in `frontend`.
- Final build confirms the reduced entry chunk and route-level page chunks.

