import { useEffect, useState, useMemo } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { Camera, X, Loader2 } from "lucide-react";

const REASON_CODES = [
  { value: "DEFECTIVE", label: "Defective or damaged" },
  { value: "WRONG_ITEM", label: "Wrong item delivered" },
  { value: "SIZE_FIT_ISSUE", label: "Size or fit issue" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "QUALITY_ISSUE", label: "Poor quality" },
  { value: "OTHER", label: "Other reason" },
];

export function ReturnOrderModal({
  open,
  loading = false,
  order = null,
  onClose,
  onSubmit, // async (payload, files) => {}
}) {
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState("DEFECTIVE");
  const [customerDescription, setCustomerDescription] = useState("");
  const [files, setFiles] = useState([]);
  
  const items = useMemo(() => {
    return order?.pricingSnapshot?.items || order?.items || [];
  }, [order]);

  useEffect(() => {
    if (!open) {
      setSelectedItem("");
      setQuantity(1);
      setReasonCode("DEFECTIVE");
      setCustomerDescription("");
      setFiles([]);
    } else if (items.length > 0) {
      // Auto-select first item
      const first = items[0];
      setSelectedItem(`${first.productId?._id || first.productId}|${first.variantSku || ""}`);
      setQuantity(first.quantity || 1);
    }
  }, [open, items]);

  const currentItem = useMemo(() => {
    return items.find((item) => `${item.productId?._id || item.productId}|${item.variantSku || ""}` === selectedItem);
  }, [items, selectedItem]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      alert("You can only upload a maximum of 5 images.");
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = null; 
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentItem) return alert("Please select an item to return");
    if (!customerDescription.trim()) return alert("Please add a description");

    const payload = {
      orderId: order._id,
      productId: currentItem.productId?._id || currentItem.productId,
      variantSku: currentItem.variantSku || "",
      quantity: quantity,
      reasonCode,
      customerDescription,
      subCategoryId: currentItem.productId?.subCategoryId || "",
    };
    onSubmit(payload, files);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#4338ca)] px-6 py-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">Return Request</div>
          <h2 className="mt-2 text-2xl font-semibold">Initiate a Return</h2>
          <p className="mt-2 text-sm text-slate-200">
            Select the item you want to return and provide details and photographic evidence.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-6">
              
              {/* Item Selection */}
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Select Item to Return</span>
                <select
                  required
                  value={selectedItem}
                  onChange={(e) => {
                    setSelectedItem(e.target.value);
                    const it = items.find(i => `${i.productId?._id || i.productId}|${i.variantSku || ""}` === e.target.value);
                    if (it) setQuantity(it.quantity || 1);
                  }}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                >
                  <option value="" disabled>Select an item</option>
                  {items.map((item, i) => (
                    <option key={i} value={`${item.productId?._id || item.productId}|${item.variantSku || ""}`}>
                      {item.productName || item.productId?.name || "Product"} {item.variantTitle ? `(${item.variantTitle})` : ""} - {item.quantity} units
                    </option>
                  ))}
                </select>
              </label>

              {/* Quantity */}
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quantity</span>
                <input
                  type="number"
                  min="1"
                  max={currentItem?.quantity || 1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </label>

              {/* Reason Code */}
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Reason</span>
                <select
                  required
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                >
                  {REASON_CODES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>

              {/* Description */}
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description of Issue</span>
                <textarea
                  required
                  rows={3}
                  value={customerDescription}
                  onChange={(e) => setCustomerDescription(e.target.value)}
                  placeholder="Please describe exactly what is wrong..."
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </label>

              {/* Evidence Upload */}
              <div className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Photographic Evidence (Max 5)</span>
                
                <div className="flex flex-wrap gap-3">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200">
                      <img src={URL.createObjectURL(file)} alt="Evidence" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {files.length < 5 && (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100 transition">
                      <Camera className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Upload</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-500">Provide clear photos showing the damage or wrong item. (JPEG, PNG, WEBP)</p>
              </div>

            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Return Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
