import { useState } from "react";
import { CreditCard, Eye, Megaphone, Search, Send, ShieldCheck, Star } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";
import { PremiumSubscriptionPlans } from "./SubscriptionTab";
import {
  EmptyState,
  influencerRowId,
  MetricTile,
  numberValue,
  packageKey,
  packagePrice,
  Pagination,
  percentValue,
  Section,
  servicePackages,
  serviceStartingPrice,
  StatusBadge,
} from "./VendorInfluencerShared";

function DiscoverView({ rows, pagination, subscriptionData = {}, busyId, onSubscribe, onSave, onVisit, onInvite, onPage }) {
  const [expandedCards, setExpandedCards] = useState({});
  return (
    <div className="grid gap-5">
      <PremiumSubscriptionPlans data={subscriptionData} busyId={busyId} onSubscribe={onSubscribe} />

      <Section title="Influencer Discovery Marketplace" icon={Search}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const rowId = influencerRowId(row);
          const inviteBusy = busyId === `invite-${rowId}`;
          const saveBusy = busyId === `save-${rowId}`;
          const visitBusy = busyId === `visit-${rowId}`;
          const invited = row.status === "invited" || row.status === "approved" || row.status === "active";
          const rateCard = Array.isArray(row.rateCard) ? row.rateCard : Array.isArray(row.services) ? row.services : [];
          const pricedServices = rateCard.filter((service) => serviceStartingPrice(service) > 0);
          const startingRate = Number(row.startingRate || (pricedServices.length ? Math.min(...pricedServices.map((service) => serviceStartingPrice(service))) : 0));
          const cardKey = String(rowId || row._id);
          const expanded = Boolean(expandedCards[cardKey]);
          const visibleServices = expanded ? rateCard : rateCard.slice(0, 2);
          return (
            <article key={rowId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {row.profilePicture ? <img src={resolveApiAssetUrl(row.profilePicture)} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-slate-950 dark:text-white">{row.name}</h3>
                  <p className="truncate text-sm text-slate-500">@{row.username}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {row.verified ? <ShieldCheck className="h-5 w-5 text-emerald-500" aria-label="Verified" /> : null}
                  {row.status ? <StatusBadge value={row.status} /> : null}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <MetricTile label="Followers" value={numberValue(row.followers)} />
                <MetricTile label="Engage" value={percentValue(row.engagementRate)} />
                <MetricTile label="Convert" value={percentValue(row.conversionRate)} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <MetricTile label="Score" value={numberValue(row.influencerScore)} />
                <MetricTile label="Rating" value={Number(row.rating || 0).toFixed(1)} />
                <MetricTile label="Complete" value={percentValue(row.completionRate)} />
              </div>
              <p className="mt-3 min-h-10 text-sm text-slate-600 dark:text-slate-300">{row.category || "General"} - {(row.languages || []).join(", ") || "Any language"}</p>
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold uppercase tracking-wide text-slate-500">Starting Rate</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{startingRate ? formatCurrency(startingRate) : "Rate on request"}</span>
                </div>
                {visibleServices.length ? (
                  <div className="space-y-2">
                    {visibleServices.map((service) => (
                      <div key={service._id || service.id || service.serviceName} className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{service.serviceName || service.label || service.serviceTypeKey}</span>
                          <span className="text-slate-500">{service.minimumNoticePeriod ? `${service.minimumNoticePeriod}d notice` : ""}</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {servicePackages(service).slice(0, expanded ? 6 : 2).map((pkg) => (
                            <div key={packageKey(service, pkg)} className="flex items-center justify-between gap-2 text-slate-500">
                              <span className="truncate">{pkg.packageName || "Package"} · {Number(pkg.quantity || 1)}x · {pkg.deliveryDays ?? service.deliveryDays ?? 0}d</span>
                              <b className="shrink-0 text-slate-800 dark:text-slate-100">{packagePrice(pkg, service) ? formatCurrency(packagePrice(pkg, service)) : "Request"}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {rateCard.length > 2 ? (
                      <button type="button" onClick={() => setExpandedCards((current) => ({ ...current, [cardKey]: !expanded }))} className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                        {expanded ? "Show less" : `Show ${rateCard.length - 2} more`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={inviteBusy} onClick={() => onInvite(row)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><Send className="h-3.5 w-3.5" />{invited ? "Invite Again" : "Invite"}</button>
                <button type="button" disabled={visitBusy} onClick={() => onVisit(row)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"><Eye className="h-3.5 w-3.5" />{row.visited ? "Visit Again" : "View"}</button>
                <button type="button" disabled={saveBusy} onClick={() => onSave(row)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"><Star className="h-3.5 w-3.5" />{row.saved ? "Saved" : "Save"}</button>
              </div>
            </article>
          );
        })}
        {!rows.length ? <EmptyState message="No influencers match the current filters." /> : null}
        </div>
        <Pagination pagination={pagination} onPage={onPage} />
      </Section>
    </div>
  );
}

export default DiscoverView;
