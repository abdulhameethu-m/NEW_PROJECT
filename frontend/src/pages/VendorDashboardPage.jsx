import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as vendorService from "../services/vendorService";

export function VendorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    vendorService
      .getVendorMe()
      .then((response) => {
        if (active) setVendor(response.data);
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.message || "Failed to load vendor profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="text-sm text-slate-600">Loading vendor access...</div>;
  if (error) return <div className="text-sm text-rose-700">{error}</div>;
  if (vendor?.status !== "approved") return <Navigate to="/vendor/status" replace />;
  return <Navigate to="/vendor/dashboard" replace />;
}
