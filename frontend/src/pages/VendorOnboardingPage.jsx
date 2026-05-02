import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
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
        <BackButton fallbackTo="/" />
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
                onChange={(e) => setGstNumber(e.target.value)}
                disabled={noGst}
                placeholder={noGst ? "Not required" : "Enter GST number"}
              />
            </label>
            <label className="text-sm font-medium">
              Upload verification documents (PDF/JPG/PNG/WebP)
              <input
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={(e) => setDocuments(Array.from(e.target.files || []))}
              />
              <div className="mt-1 text-xs text-slate-500">
                You can upload now or later. Files are appended to your profile.
              </div>
            </label>
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
              <input
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setShopImages(Array.from(e.target.files || []))}
              />
              <div className="mt-1 text-xs text-slate-500">
                Final submission will set status to <span className="font-semibold">pending</span>.
              </div>
            </label>
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
