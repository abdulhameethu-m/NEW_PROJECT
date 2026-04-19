import { useEffect, useState } from "react";
import {
  createUserAddress,
  deleteUserAddress,
  getUserAddresses,
  updateUserAddress,
} from "../services/userService";

const defaultForm = {
  name: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to update address.";
}

export function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadAddresses() {
    setLoading(true);
    try {
      const response = await getUserAddresses();
      setAddresses(response.data || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  function startCreate() {
    setForm(defaultForm);
    setEditingId("");
    setShowForm(true);
  }

  function startEdit(address) {
    setForm({
      name: address.name || "",
      phone: address.phone || "",
      addressLine: address.addressLine || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      country: address.country || "India",
      isDefault: Boolean(address.isDefault),
    });
    setEditingId(address._id);
    setShowForm(true);
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateUserAddress(editingId, form);
      } else {
        await createUserAddress(form);
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditingId("");
      await loadAddresses();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id) {
    setError("");
    try {
      await deleteUserAddress(id);
      await loadAddresses();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function setDefault(address) {
    setError("");
    try {
      await updateUserAddress(address._id, { isDefault: true });
      await loadAddresses();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Address book</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add, edit, and manage your saved delivery destinations.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          Add address
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {showForm ? (
        <form onSubmit={submitForm} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-950 dark:text-white">{editingId ? "Edit address" : "New address"}</div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId("");
                setForm(defaultForm);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["name", "Full name"],
              ["phone", "Phone"],
              ["addressLine", "Address line"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"],
              ["country", "Country"],
            ].map(([key, label]) => (
              <label key={key} className={`grid gap-2 ${key === "addressLine" ? "sm:col-span-2" : ""}`}>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            ))}
            <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
              />
              <span>Set as default address</span>
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update address" : "Save address"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : addresses.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={address._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950 dark:text-white">{address.name}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{address.phone}</div>
                </div>
                {address.isDefault ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Default
                  </span>
                ) : null}
              </div>
              <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <div>{address.addressLine}</div>
                <div>{address.city}, {address.state}</div>
                <div>{address.pincode}, {address.country}</div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(address)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Edit
                </button>
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => setDefault(address)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Set default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeAddress(address._id)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No addresses saved yet. Add your first delivery address to speed up checkout.
        </div>
      )}
    </div>
  );
}
