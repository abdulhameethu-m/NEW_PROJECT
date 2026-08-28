import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Barcode from "react-barcode";
import * as vendorDashboardService from "../services/vendorDashboardService";

export default function VendorShippingLabelPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      vendorDashboardService.getVendorOrderById(id),
      vendorDashboardService.getVendorShippingSettings().catch(() => null),
    ])
      .then(([orderRes, settingsRes]) => {
        setOrder(orderRes?.data || orderRes);
        setSettings(settingsRes?.data || settingsRes);
      })
      .catch((err) => {
        setError("Failed to load order tracking details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && !error && order) {
      // Small timeout to allow React to render the barcode fully
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, error, order]);

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Generating Label...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  const getPickupLocation = () => {
    return (
      order?.pickupAddressSnapshot ||
      settings?.pickupLocations?.find?.((location) => location?.isDefault) ||
      settings?.pickupLocations?.[0] ||
      settings?.pickupAddress ||
      {}
    );
  };

  const to = order.shippingAddress;
  const from = getPickupLocation();
  const courier = order.courierName || order.deliveryPartner;
  const trackingId = order.trackingId;

  const totalWeight = (order.items || []).reduce(
    (acc, item) => acc + (Number(item.weight || 0) * (item.units || 1)),
    0
  );

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-8 flex justify-center print:bg-white print:p-0">
      <div className="w-full max-w-[400px] border border-black bg-white p-4 print:border-none print:shadow-none print:p-0">
        
        {/* Header Ribbon */}
        <div className="flex border-b-2 border-black pb-2 mb-4 justify-between items-end">
          <div>
            <h1 className="text-2xl font-extrabold uppercase">SHIPPING MANIFEST</h1>
            <p className="text-sm font-semibold text-gray-600">Order: {order.orderNumber}</p>
          </div>
          <div className="text-right">
            <span className="bg-black text-white px-2 py-1 text-sm font-bold uppercase rounded">
              {order.paymentMethod === "COD" ? "COD" : "PREPAID"}
            </span>
          </div>
        </div>

        {/* Courier Meta */}
        <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Courier</h3>
            <p className="text-lg font-bold capitalize">{courier}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Weight</h3>
            <p className="text-lg font-bold">{totalWeight > 0 ? totalWeight.toFixed(2) + " kg" : "N/A"}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="flex flex-col gap-4 border-b-2 border-black pb-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Deliver To</h3>
            <p className="font-bold text-lg">{to.fullName}</p>
            <p className="text-sm">{to.line1}</p>
            {to.line2 && <p className="text-sm">{to.line2}</p>}
            <p className="text-sm">{to.city}, {to.state} {to.postalCode}</p>
            <p className="text-sm mt-1 font-semibold">Ph: {to.phone}</p>
          </div>
          
          <div className="pt-2 border-t border-gray-300">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Return To</h3>
            <p className="font-medium text-sm">{from.shopName || from.name || "Vendor"}</p>
            <p className="text-sm">{from.addressLine1}</p>
            {from.addressLine2 && <p className="text-sm">{from.addressLine2}</p>}
            <p className="text-sm">{from.city}, {from.state} {from.pincode}</p>
          </div>
        </div>

        {/* Barcode Segment */}
        {trackingId ? (
          <div className="flex flex-col items-center justify-center pt-2">
            <Barcode 
              value={trackingId} 
              width={2}
              height={80}
              fontSize={18}
              background="#ffffff"
              lineColor="#000000"
              margin={0}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 border-2 border-dashed border-gray-400">
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No AWB Assigned</p>
          </div>
        )}

      </div>
    </div>
  );
}
