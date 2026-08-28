import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Barcode from "react-barcode";
import { getOrderById } from "../services/adminApi";

export default function AdminOrderLabelPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrderById(id)
      .then((res) => {
        setOrder(res?.data || res);
      })
      .catch((err) => {
        console.error("Failed to load order for label", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && order) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, order]);

  if (loading) {
    return <div className="p-10 text-center font-semibold text-slate-500">Loading manifest...</div>;
  }

  if (!order) {
    return <div className="p-10 text-center font-semibold text-red-500">Failed to load order details.</div>;
  }

  const trackingId = order.trackingId || "PENDING";
  const courier = order.courierName || "Shadowfax";
  const address = order.shippingAddress;
  const pickup = order.pickupAddressSnapshot || order.sellerId?.pickupAddress || (order.sellerId?.pickupLocations || [])[0] || {};
  const isPrepaid = order.paymentMethod !== "COD";

  const getFullAddress = (addr) => {
    if (!addr) return "";
    return [
      addr.addressLine1 || addr.line1,
      addr.addressLine2 || addr.line2,
      addr.city,
      addr.state,
      addr.postalCode || addr.pincode
    ].filter(Boolean).join(", ");
  };

  return (
    <div className="flex justify-center bg-[#f0f2f5] p-8 min-h-screen print:bg-white print:p-0">
      <div className="w-[400px] bg-white border border-slate-700 p-6 flex flex-col font-sans print:w-full print:border-none print:shadow-none shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1">
              SHIPPING MANIFEST
            </h1>
            <p className="text-sm text-slate-600">
              Order: ORD-{trackingId}
            </p>
          </div>
          {isPrepaid && (
            <div className="bg-black text-white px-3 py-1 font-bold text-xs uppercase rounded mt-1">
              PREPAID
            </div>
          )}
        </div>

        <div className="border-b-[2px] border-black mb-4"></div>

        {/* Courier & Weight */}
        <div className="flex justify-between mb-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">COURIER</div>
            <div className="text-xl font-semibold text-slate-900">{courier}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">WEIGHT</div>
            <div className="text-xl font-semibold text-slate-900">N/A</div>
          </div>
        </div>

        <div className="border-b border-slate-300 mb-4"></div>

        {/* Deliver To */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">DELIVER TO</div>
          <div className="text-lg font-bold text-slate-900 mb-1">{address?.fullName}</div>
          <div className="text-sm text-slate-700 leading-snug">
            {address?.line1}
            {address?.line2 && <><br />{address.line2}</>}
            <br />
            {address?.city}, {address?.state} {address?.postalCode}
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-2">
            Ph: {address?.phone}
          </div>
        </div>

        <div className="border-b border-slate-300 mb-4"></div>

        {/* Return To */}
        <div className="mb-6">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">RETURN TO</div>
          <div className="text-[15px] font-medium text-[#113a5f] mb-1">
            {pickup?.name || "Vendor WareHouse"}
          </div>
          <div className="text-sm text-[#113a5f] leading-snug">
            {getFullAddress(pickup)}
            <br />
            {pickup?.country || "India"}
          </div>
        </div>
        
        <div className="border-b-[2px] border-black mb-6"></div>

        {/* Barcode */}
        <div className="flex justify-center -mb-2 mt-auto">
          {trackingId !== "PENDING" ? (
            <Barcode 
              value={trackingId} 
              format="CODE128" 
              width={1.8} 
              height={70} 
              displayValue={true}
              fontSize={16}
              margin={0}
              background="#ffffff"
            />
          ) : (
            <div className="h-[90px] flex items-center justify-center text-slate-400 font-semibold border-2 border-dashed border-slate-300 w-full">
              NO TRACKING ID ASSIGNED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
