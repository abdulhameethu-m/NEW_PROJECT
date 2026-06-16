import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PayoutAccountForm } from "../components/PayoutAccountForm";
import * as vendorService from "../services/vendorService";
import { LocationPickerMap } from "../components/LocationPickerMap";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

function Stepper({ step }) {
  const steps = ["Basic Info", "GST & Docs", "Bank", "Shop Setup"];
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, idx) => {
          const n = idx + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div
              key={s}
              className={[
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                active ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "",
                done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "",
                !active && !done ? "bg-white text-slate-600" : "",
              ].join(" ")}
            >
              <span className="font-semibold">{n}</span>
              <span>{s}</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-slate-500">
        Progress is saved after each step.
      </div>
    </div>
  );
}

export function VendorOnboardingPage() {
  const nav = useNavigate();
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [vendor, setVendor] = useState(null);

  const [step, setStep] = useState(1);
  const step3FormRef = useRef(null);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // Step 1 - Pickup Address
  const [pickupLocationName, setPickupLocationName] = useState("");
  const [pickupLocationPhone, setPickupLocationPhone] = useState("");
  const [pickupAddressLine1, setPickupAddressLine1] = useState("");
  const [pickupAddressLine2, setPickupAddressLine2] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupState, setPickupState] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [pickupCountry, setPickupCountry] = useState("India");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");

  // Step 2
  const [noGst, setNoGst] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [documents, setDocuments] = useState([]);

  // Step 3 - Bank Details (persisted locally)
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");

  // Step 4
  const [shopName, setShopName] = useState("");
  const [shopImages, setShopImages] = useState([]);

  const completed = useMemo(() => vendor?.stepCompleted ?? 0, [vendor]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const res = await vendorService.getVendorMe();
        if (!alive) return;
        const v = res.data;
        setVendor(v);

        if (v.status === "approved") return nav("/dashboard/vendor", { replace: true });
        if (v.status === "pending") return nav("/vendor/status", { replace: true });

        // hydrate
        setCompanyName(v.companyName || "");
        setAddress(v.address || "");
        setLat(v.location?.lat != null ? String(v.location.lat) : "");
        setLng(v.location?.lng != null ? String(v.location.lng) : "");
        setNoGst(Boolean(v.noGst));
        setGstNumber(v.gstNumber || "");
        setShopName(v.shopName || "");

        // Hydrate pickup location (from pickupLocations array or pickupAddress)
        const defaultPickup = v.pickupLocations?.[0] || v.pickupAddress;
        if (defaultPickup) {
          setPickupLocationName(defaultPickup.name || "");
          setPickupLocationPhone(defaultPickup.phone || "");
          setPickupAddressLine1(defaultPickup.addressLine1 || "");
          setPickupAddressLine2(defaultPickup.addressLine2 || "");
          setPickupCity(defaultPickup.city || "");
          setPickupState(defaultPickup.state || "");
          setPickupPincode(defaultPickup.pincode || "");
          setPickupCountry(defaultPickup.country || "India");
          setPickupLat(defaultPickup.latitude != null ? String(defaultPickup.latitude) : "");
          setPickupLng(defaultPickup.longitude != null ? String(defaultPickup.longitude) : "");
        }

        const next = Math.min(4, Math.max(1, (v.stepCompleted || 0) + 1));
        setStep(next);
      } catch {
        // no vendor profile yet → still allow onboarding
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nav]);

  async function useCurrentLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => setError("Unable to fetch location. Please enter lat/lng manually.")
    );
  }

  async function saveCurrentStep() {
    setError("");
    setSaving(true);
    try {
      if (step === 1) {
        const res = await vendorService.saveStep1({
          companyName,
          address,
          location: { lat: Number(lat), lng: Number(lng) },
          pickupLocations: [{
            name: pickupLocationName,
            phone: pickupLocationPhone,
            addressLine1: pickupAddressLine1,
            addressLine2: pickupAddressLine2,
            city: pickupCity,
            state: pickupState,
            pincode: pickupPincode,
            country: pickupCountry,
            latitude: pickupLat ? Number(pickupLat) : null,
            longitude: pickupLng ? Number(pickupLng) : null,
            isDefault: true,
          }],
        });
        setVendor(res.data);
        setStep(2);
      } else if (step === 2) {
        // Validate GST
        if (!noGst && gstNumber.length !== 15) {
          setError("GST number must be exactly 15 digits");
          setSaving(false);
          return;
        }
        const res = await vendorService.saveStep2({
          gstNumber,
          noGst,
          documents,
        });
        setVendor(res.data);
        setDocuments([]);
        setStep(3);
      } else if (step === 4) {
        const res = await vendorService.submitStep4({ shopName, shopImages });
        setVendor(res.data);
        setShopImages([]);
        nav("/vendor/status", { replace: true });
      }
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-600">Loading...</div>;

  return (
    <div className="grid gap-4 sm:gap-6 px-3 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Vendor onboarding</h1>
          <p className="mt-1 text-slate-600">
            Complete the steps and submit for admin approval.
          </p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm shadow-sm">
          <div className="text-xs text-slate-500">Completed</div>
          <div className="font-semibold">{completed}/4</div>
        </div>
      </div>

      <Stepper step={step} />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        {step === 1 ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold">Step 1 — Basic Info</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">
                Company name
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Address
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Latitude
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 13.0827"
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Longitude
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 80.2707"
                  required
                />
              </label>
            </div>

            {mapsKey ? (
              <LocationPickerMap
                apiKey={mapsKey}
                lat={lat ? Number(lat) : Number.NaN}
                lng={lng ? Number(lng) : Number.NaN}
                onChange={({ lat: newLat, lng: newLng }) => {
                  setLat(String(newLat));
                  setLng(String(newLng));
                }}
              />
            ) : (
              <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
                To enable Google Maps location picking, set{" "}
                <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
                <code className="font-mono">frontend/.env</code> and restart the
                frontend server.
              </div>
            )}

            <button
              type="button"
              className="w-fit rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={useCurrentLocation}
            >
              Use current location
            </button>

            <hr className="my-2" />

            <div className="text-sm font-semibold">Primary Pickup Location</div>
            <p className="text-xs text-slate-500">
              Enter your primary pickup location details where orders will be collected from.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">
                Location name (optional)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupLocationName}
                  onChange={(e) => setPickupLocationName(e.target.value)}
                  placeholder={companyName ? `e.g. ${companyName} - Warehouse` : "e.g. Main warehouse"}
                />
                <div className="mt-1 text-xs text-slate-500">Defaults to company name if not provided</div>
              </label>
              <label className="text-sm font-medium">
                Phone
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupLocationPhone}
                  onChange={(e) => setPickupLocationPhone(e.target.value)}
                  placeholder="e.g. +91-9876543210"
                />
              </label>
              <label className="md:col-span-2 text-sm font-medium">
                Address Line 1
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupAddressLine1}
                  onChange={(e) => setPickupAddressLine1(e.target.value)}
                  placeholder="Street address"
                />
              </label>
              <label className="md:col-span-2 text-sm font-medium">
                Address Line 2
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupAddressLine2}
                  onChange={(e) => setPickupAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </label>
              <label className="text-sm font-medium">
                City
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder="e.g. Chennai"
                />
              </label>
              <label className="text-sm font-medium">
                State
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupState}
                  onChange={(e) => setPickupState(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                />
              </label>
              <label className="text-sm font-medium">
                Pincode
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupPincode}
                  onChange={(e) => setPickupPincode(e.target.value)}
                  placeholder="e.g. 600001"
                />
              </label>
              <label className="text-sm font-medium">
                Country
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupCountry}
                  onChange={(e) => setPickupCountry(e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                Latitude
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  placeholder="e.g. 13.0827"
                />
              </label>
              <label className="text-sm font-medium">
                Longitude
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  placeholder="e.g. 80.2707"
                />
              </label>
            </div>

            {mapsKey && (pickupLat || pickupLng) ? (
              <LocationPickerMap
                apiKey={mapsKey}
                lat={pickupLat ? Number(pickupLat) : Number.NaN}
                lng={pickupLng ? Number(pickupLng) : Number.NaN}
                onChange={({ lat: newLat, lng: newLng }) => {
                  setPickupLat(String(newLat));
                  setPickupLng(String(newLng));
                }}
              />
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold">Step 2 — GST & Documents</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={noGst}
                onChange={(e) => setNoGst(e.target.checked)}
              />
              No GST
            </label>
            <label className="text-sm font-medium">
              GST number
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={gstNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 15);
                  setGstNumber(value);
                }}
                disabled={noGst}
                placeholder={noGst ? "Not required" : "Enter 15-digit GST number"}
                maxLength="15"
              />
              <div className="mt-1 text-xs text-slate-500">
                GST number must be exactly 15 digits. Entered: {gstNumber.length}/15
              </div>
              {gstNumber && gstNumber.length !== 15 ? (
                <div className="mt-1 text-xs text-rose-600">GST number must be exactly 15 digits</div>
              ) : null}
            </label>
            <label className="text-sm font-medium">
              Upload verification documents (PDF/JPG/PNG/WebP)
              <div
                className="mt-2 w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-slate-400 hover:bg-slate-100"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("border-blue-400", "bg-blue-50");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                  if (!noGst) {
                    const files = Array.from(e.dataTransfer.files || []);
                    setDocuments((prev) => [...prev, ...files]);
                  }
                }}
              >
                <input
                  id="file-upload"
                  className="hidden"
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  disabled={noGst}
                  onChange={(e) => {
                    if (!noGst) {
                      setDocuments((prev) => [...prev, ...Array.from(e.target.files || [])]);
                    }
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-sm font-medium text-slate-700">
                    Drag and drop files here or click to browse
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    PDF, JPG, PNG, WebP files supported
                  </div>
                </label>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                You can upload now or later. Files are appended to your profile.
              </div>
              {noGst ? (
                <div className="mt-2 text-xs text-amber-600">Upload is disabled when "No GST" is selected</div>
              ) : null}
            </label>

            {documents.length > 0 ? (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Uploaded Documents ({documents.length})</div>
                <div className="grid gap-2">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs text-slate-700 truncate">{doc.name}</span>
                        <span className="text-xs text-slate-500">({(doc.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg p-1 hover:bg-red-100 transition"
                        title="Delete file"
                      >
                        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold">Step 3 — Bank Details</div>
            <p className="text-sm text-slate-600">
              Provide your bank account details for payout processing. We'll verify these details with our finance team.
            </p>
            <PayoutAccountForm
              ref={step3FormRef}
              initialData={{
                accountHolderName,
                accountNumber,
                ifscCode,
                bankName,
                upiId,
              }}
              onChange={(data) => {
                setAccountHolderName(data.accountHolderName);
                setAccountNumber(data.accountNumber);
                setIfscCode(data.ifscCode);
                setBankName(data.bankName);
                setUpiId(data.upiId);
              }}
              onSubmit={async (formData) => {
                try {
                  setError("");
                  setSaving(true);
                  const res = await vendorService.saveStep3({
                    bankDetails: {
                      accountNumber: formData.accountNumber,
                      IFSC: formData.ifscCode,
                      holderName: formData.accountHolderName,
                      bankName: formData.bankName,
                    },
                    upiId: formData.upiId,
                  });
                  setVendor(res.data);
                  setStep(4);
                } catch (e) {
                  setError(normalizeError(e));
                } finally {
                  setSaving(false);
                }
              }}
              loading={saving}
              showOptionalHint={false}
              hideSubmitButton={true}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold">Step 4 — Shop Setup</div>
            <label className="text-sm font-medium">
              Shop display name (optional)
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={companyName || "Leave blank to use company name"}
              />
              <div className="mt-1 text-xs text-slate-500">
                Defaults to company name if not provided
              </div>
            </label>
            <label className="text-sm font-medium">
              Upload 4–5 shop images (JPG/PNG/WebP)
              <div
                className="mt-2 w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-slate-400 hover:bg-slate-100"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("border-blue-400", "bg-blue-50");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                  const files = Array.from(e.dataTransfer.files || []).filter((file) =>
                    file.type.startsWith("image/")
                  );
                  setShopImages((prev) => [...prev, ...files]);
                }}
              >
                <input
                  id="shop-image-upload"
                  className="hidden"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setShopImages((prev) => [...prev, ...files]);
                  }}
                />
                <label htmlFor="shop-image-upload" className="cursor-pointer">
                  <div className="text-sm font-medium text-slate-700">
                    Drag and drop images here or click to browse
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    JPG, PNG, WebP images supported (4–5 recommended)
                  </div>
                </label>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Final submission will set status to <span className="font-semibold">pending</span>.
              </div>
            </label>

            {shopImages.length > 0 ? (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Uploaded Images ({shopImages.length})</div>
                <div className="grid gap-2">
                  {shopImages.map((image, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-slate-700 truncate">{image.name}</span>
                        <span className="text-xs text-slate-500">({(image.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShopImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg p-1 hover:bg-red-100 transition"
                        title="Delete image"
                      >
                        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={saving || step === 1}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={() => {
              if (step === 3) {
                // Trigger form submission for Step 3
                step3FormRef.current?.requestSubmit?.();
              } else {
                saveCurrentStep();
              }
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : step === 4 ? "Submit for approval" : "Save & continue"}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Google Maps API integration: set <code>VITE_GOOGLE_MAPS_API_KEY</code> and
        swap the lat/lng inputs with a map picker component.
      </div>
    </div>
  );
}
