import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Package,
  Search,
} from "lucide-react";
import {
  generateAffiliateProductLinks,
  listAffiliateProducts,
} from "../../services/influencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";

const TABS = [
  ["promotion", "My Promotion Products", Package],
  ["links", "Generate Affiliate Links", LinkIcon],
];
const TAB_IDS = new Set(TABS.map(([id]) => id));

function Card({ title, icon: Icon = Package, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {createElement(Icon, { className: "h-4 w-4 text-indigo-500" })}
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ProductCard({ product, onLink, onSelect }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-44 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {product.image ? <img src={resolveApiAssetUrl(product.image)} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">{product.name}</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">{product.vendor || product.brand || "Vendor"} - {product.category}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
          {product.campaignName ? <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">{product.campaignName}</span> : null}
          <span className="rounded-full bg-emerald-50 px-2 py-1 capitalize text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{product.promotionStatus || "approved"}</span>
          {product.campaignStatus ? <span className="rounded-full bg-slate-100 px-2 py-1 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{product.campaignStatus}</span> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><span className="block text-slate-500">Price</span><b className="text-slate-950 dark:text-white">{formatCurrency(product.salePrice)}</b></div>
          <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/30"><span className="block text-emerald-700 dark:text-emerald-300">Commission</span><b className="text-emerald-700 dark:text-emerald-300">{formatCurrency(product.commissionAmount)}</b></div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><span className="block text-slate-500">Rate</span><b className="text-slate-950 dark:text-white">{product.commissionRate}%</b></div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-950"><span className="block text-slate-500">Campaign</span><b className="line-clamp-1 text-slate-950 dark:text-white">{product.campaignName || "Approved"}</b></div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => onLink(product)} className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Generate Link</button>
          <button onClick={() => onSelect(product)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-white"><ExternalLink className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  );
}

export default function InfluencerAffiliateProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(TAB_IDS.has(searchParams.get("tab")) ? searchParams.get("tab") : "promotion");
  const [filters, setFilters] = useState({ search: "", category: "", availability: "all", sort: "best_selling", page: 1, limit: 12 });
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [links, setLinks] = useState([]);
  const [utm, setUtm] = useState({ utmSource: "influencer", utmMedium: "social", utmCampaign: "", utmContent: "", utmTerm: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const query = useMemo(() => ({ ...filters, mode: tab }), [filters, tab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab !== "links") {
        const response = await listAffiliateProducts(query);
        setProducts(response?.data?.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [query, tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const nextTab = searchParams.get("tab") || "promotion";
    setTab(TAB_IDS.has(nextTab) ? nextTab : "promotion");
  }, [searchParams]);

  async function generate(product = selected) {
    if (!product) return;
    const response = await generateAffiliateProductLinks({ productIds: [product.id], ...utm });
    setLinks(response?.data?.links || []);
    setSelected(product);
    selectTab("links");
    setMessage("Affiliate link generated.");
  }

  function selectTab(nextTab) {
    const safeTab = TAB_IDS.has(nextTab) ? nextTab : "promotion";
    setTab(safeTab);
    setSearchParams(safeTab === "promotion" ? {} : { tab: safeTab });
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {message ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">{message}</div> : null}

      {tab !== "links" ? (
        <Card title="Filters" icon={Search}>
          <div className="grid gap-3 md:grid-cols-4">
            <input value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value, page: 1 }))} placeholder="Search product, SKU, category" className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <input value={filters.category} onChange={(e) => setFilters((c) => ({ ...c, category: e.target.value, page: 1 }))} placeholder="Category" className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <select value={filters.availability} onChange={(e) => setFilters((c) => ({ ...c, availability: e.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="all">All availability</option><option value="in_stock">In stock</option></select>
            <select value={filters.sort} onChange={(e) => setFilters((c) => ({ ...c, sort: e.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="best_selling">Best selling</option><option value="trending">Trending</option><option value="highest_rated">Highest rated</option><option value="highest_commission">Highest commission</option><option value="newest">Newest</option><option value="most_viewed">Most viewed</option></select>
          </div>
        </Card>
      ) : null}

      {tab === "links" ? (
        <Card title="Generate Affiliate Link" icon={LinkIcon}>
          <div className="grid gap-4 md:grid-cols-2">
            {["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"].map((key) => <label key={key} className="text-sm font-semibold dark:text-white">{key}<input value={utm[key]} onChange={(e) => setUtm((c) => ({ ...c, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>)}
          </div>
          {selected ? <button onClick={() => generate(selected)} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Generate for {selected.name}</button> : <p className="mt-4 text-sm text-slate-500">Choose a product from another tab to generate a link.</p>}
          <div className="mt-4 space-y-3">
            {links.map((link) => <div key={link.productId} className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950 dark:text-white"><div className="break-all">{link.affiliateUrl}</div><button onClick={() => navigator.clipboard?.writeText(link.affiliateUrl)} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"><Copy className="h-3.5 w-3.5" />Copy</button></div>)}
          </div>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 dark:text-white">Loading products...</div> : products.map((product) => <ProductCard key={product.id} product={product} onLink={generate} onSelect={setSelected} />)}
          {!loading && !products.length ? <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">No products found.</div> : null}
        </section>
      )}
    </div>
  );
}
