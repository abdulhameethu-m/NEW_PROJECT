import { useEffect, useState } from "react";
import { Plus, X, User, Phone, MapPin, Mail, Globe, Map, Building, Lock, Home, Star, Pencil, Trash } from "lucide-react";
import {
  createUserAddress,
  deleteUserAddress,
  getUserAddresses,
  updateUserAddress,
} from "../services/userService";
import {
  getShippingDistricts,
  getShippingStates,
} from "../services/shippingLocationService";

const defaultForm = {
  name: "",
  phone: "",
  addressLine: "",
  district: "",
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
  const [stateOptions, setStateOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);

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

  useEffect(() => {
    let cancelled = false;

    getShippingStates()
      .then((states) => {
        if (!cancelled) setStateOptions(states || []);
      })
      .catch(() => {
        if (!cancelled) setStateOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!showForm || !form.state) {
      setDistrictOptions([]);
      return () => {
        cancelled = true;
      };
    }

    getShippingDistricts(form.state)
      .then((districts) => {
        if (!cancelled) setDistrictOptions(districts || []);
      })
      .catch(() => {
        if (!cancelled) setDistrictOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [form.state, showForm]);

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
      district: address.district || address.city || "",
      city: address.city || address.district || "",
      state: address.state || "",
      pincode: address.pincode || "",
      country: address.country || "India",
      isDefault: Boolean(address.isDefault),
    });
    setEditingId(address._id);
    setShowForm(true);
  }

  function handleFieldChange(key, value) {
    if (key === "state") {
      setForm((current) => ({ ...current, state: value, district: "", city: "" }));
      return;
    }

    if (key === "district") {
      setForm((current) => ({ ...current, district: value, city: value }));
      return;
    }

    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        district: form.district || form.city,
        city: form.district || form.city,
      };

      if (!payload.state) throw new Error("Select the state.");
      if (!payload.district) throw new Error("Select the district.");

      if (editingId) {
        await updateUserAddress(editingId, payload);
      } else {
        await createUserAddress(payload);
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
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Add address
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {showForm ? (
        <form onSubmit={submitForm} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-bold text-slate-950 dark:text-white">{editingId ? "Edit address" : "New address"}</div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId("");
                setForm(defaultForm);
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Close <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {[
              { key: "name", label: "Full name", Icon: User, placeholder: "Enter full name" },
              { key: "phone", label: "Phone", Icon: Phone, placeholder: "Enter phone number" },
              { key: "addressLine", label: "Address line", Icon: MapPin, placeholder: "House no., building, street, area" },
              { key: "pincode", label: "Pincode", Icon: Mail, placeholder: "Enter pincode" },
              { key: "country", label: "Country", Icon: Globe, placeholder: "India" },
            ].map(({ key, label, Icon, placeholder }) => (
              <label key={key} className={`grid gap-2 ${key === "addressLine" ? "sm:col-span-2" : ""}`}>
                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Icon className="h-4 w-4 text-indigo-500" />
                  </div>
                  <input
                    value={form[key]}
                    onChange={(event) => handleFieldChange(key, event.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                  />
                </div>
              </label>
            ))}
            <label className="grid gap-2">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">State</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Map className="h-4 w-4 text-indigo-500" />
                </div>
                <select
                  value={form.state}
                  onChange={(event) => handleFieldChange("state", event.target.value)}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 appearance-none"
                  required
                >
                  <option value="">Select state</option>
                  {Array.from(new Set([...(stateOptions || []), form.state].filter(Boolean))).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">District</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Building className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={form.district}
                  onChange={(event) => handleFieldChange("district", event.target.value)}
                  disabled={!form.state}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900 appearance-none"
                  required
                >
                  <option value="">{form.state ? "Select district" : "Select state first"}</option>
                  {Array.from(new Set([...(districtOptions || []), form.district].filter(Boolean))).map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="sm:col-span-2 flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-[#fbfbfe] px-5 py-4 text-[13px] dark:border-slate-800 dark:bg-slate-800/50 cursor-pointer transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="font-bold text-slate-900 dark:text-white">Set as default address</span>
            </label>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-[1.25rem] bg-indigo-600 px-6 text-[13px] font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60 dark:bg-indigo-500"
            >
              <Lock className="h-4 w-4" />
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
            <div key={address._id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-indigo-600 dark:bg-indigo-500" />
              
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-slate-900 dark:text-white">{address.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                        <Phone className="h-3.5 w-3.5 text-indigo-400" /> {address.phone}
                      </div>
                    </div>
                  </div>
                  {address.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e6fcf2] px-3 py-1 text-xs font-bold text-[#059669] dark:bg-emerald-900/30 dark:text-emerald-300">
                      Default <Star className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#fbfbfe] text-indigo-400 dark:bg-slate-800 dark:text-slate-400">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="text-[13px] font-medium leading-6 text-slate-600 dark:text-slate-300">
                    <div>{address.addressLine}</div>
                    <div>{address.district || address.city}, {address.state}</div>
                    <div>{address.pincode}, {address.country}</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(address)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-100 bg-white px-4 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 active:scale-95 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAddress(address._id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50/50 px-4 text-xs font-bold text-rose-600 transition hover:bg-rose-50 active:scale-95 dark:border-rose-900/30 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  >
                    <Trash className="h-3.5 w-3.5" /> Delete
                  </button>
                  {!address.isDefault ? (
                    <button
                      type="button"
                      onClick={() => setDefault(address)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Set default
                    </button>
                  ) : null}
                </div>
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
