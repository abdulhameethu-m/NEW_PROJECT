import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createOrder, listUsers, listProducts } from "../services/adminApi";
import { formatCurrency } from "../utils/formatCurrency";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

export function AdminOrderCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  const [userId, setUserId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  const [lines, setLines] = useState([{ productId: "", quantity: 1 }]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      listUsers({ role: "user" }),
      listProducts({ page: 1, limit: 50, status: "APPROVED" }),
    ])
      .then(([usersRes, productsRes]) => {
        if (cancelled) return;
        setUsers(usersRes.data || []);
        setProducts(productsRes.data?.products || []);
      })
      .catch((err) => {
        if (!cancelled) setError(normalizeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const computedTotal = useMemo(() => {
    const priceById = new Map(products.map((p) => [String(p._id), Number(p.discountPrice || p.price || 0)]));
    return lines.reduce((sum, ln) => sum + (priceById.get(String(ln.productId)) || 0) * Number(ln.quantity || 0), 0);
  }, [lines, products]);

  function updateLine(index, patch) {
    setLines((cur) => cur.map((ln, i) => (i === index ? { ...ln, ...patch } : ln)));
  }

  function addLine() {
    setLines((cur) => [...cur, { productId: "", quantity: 1 }]);
  }

  function removeLine(index) {
    setLines((cur) => cur.filter((_, i) => i !== index));
  }

  async function onCreate() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        userId,
        items: lines.filter((l) => l.productId).map((l) => ({ productId: l.productId, quantity: Number(l.quantity || 1) })),
        paymentMethod,
        paymentStatus,
        orderStatus: "PLACED",
        address,
      };
      const res = await createOrder(payload);
      const createdOrders = res.data?.orders || res.data || [];
      const first = Array.isArray(createdOrders) ? createdOrders[0] : null;
      if (first?._id) {
        navigate(`/admin/orders/${first._id}`, { replace: true });
      } else {
        navigate("/admin/orders", { replace: true });
      }
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Orders</div>
          <div className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Create order</div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/orders"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </Link>
          <button
            type="button"
            disabled={loading || saving}
            onClick={onCreate}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">Customer & payment</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</span>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select customer</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email || u.phone || "no contact"})
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Payment method</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="COD">COD</option>
                <option value="ONLINE">ONLINE</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Payment status</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">Shipping address</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["fullName", "Full name"],
              ["phone", "Phone"],
              ["line1", "Address line 1"],
              ["line2", "Address line 2"],
              ["city", "City"],
              ["state", "State"],
              ["postalCode", "Postal code"],
              ["country", "Country"],
            ].map(([key, label]) => (
              <label key={key} className={`grid gap-2 ${key === "line1" ? "sm:col-span-2" : ""}`}>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
                <input
                  value={address[key]}
                  onChange={(e) => setAddress((cur) => ({ ...cur, [key]: e.target.value }))}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Items</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Total (approx): {formatCurrency(computedTotal)}</div>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Add item
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {lines.map((ln, idx) => (
            <div key={idx} className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product</span>
                <select
                  value={ln.productId}
                  onChange={(e) => updateLine(idx, { productId: e.target.value })}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({formatCurrency(p.discountPrice || p.price || 0)}) · stock {p.stock}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Qty</span>
                <input
                  type="number"
                  min="1"
                  value={ln.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Number(e.target.value || 1) })}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <button
                type="button"
                onClick={() => removeLine(idx)}
                disabled={lines.length === 1}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

