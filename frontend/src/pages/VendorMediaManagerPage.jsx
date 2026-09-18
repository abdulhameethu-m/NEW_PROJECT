import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import { 
  Search, 
  Film, 
  Image as ImageIcon, 
  FileText, 
  Trash2, 
  FolderPlus, 
  RefreshCw, 
  X, 
  Menu, 
  Heart, 
  HardDrive, 
  Database, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  UploadCloud,
  AlertTriangle,
  FileCheck2,
  Folder
} from "lucide-react";

const STATUS_COLORS = {
  READY:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPLOADING: "bg-blue-50 text-blue-700 border-blue-200",
  ORPHANED:  "bg-amber-50 text-amber-700 border-amber-200",
  DELETING:  "bg-orange-50 text-orange-700 border-orange-200",
  DELETED:   "bg-gray-100 text-gray-500 border-gray-200",
  FAILED:    "bg-rose-50 text-rose-700 border-rose-200",
};

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function getTimelineGroup(dateString) {
  if (!dateString) return "Recent";
  const d = new Date(dateString);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

// ── Asset grid card ──────────────────────────────────────────────────────────
function AssetCard({ asset, isSelected, onClick, onSelect, onToggleFavorite, canSelect = true }) {
  const isImage = asset.resourceType === "image";
  const isVideo = asset.resourceType === "video";
  const isRaw = asset.resourceType === "raw" || (!isImage && !isVideo);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(asset)}
      onKeyDown={(e) => e.key === "Enter" && onClick(asset)}
      className={`group relative break-inside-avoid inline-block w-full bg-white border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 mb-3.5 ${
        isSelected ? "border-violet-500 ring-2 ring-violet-300" : "border-slate-200/90 hover:border-violet-300"
      }`}
    >
      {/* Checkbox overlay */}
      {canSelect && (
        <div 
          className={`absolute top-2.5 left-2.5 z-20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); onSelect(asset._id); }}
        >
          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center backdrop-blur-md shadow-sm transition-all ${
            isSelected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-400 bg-white/90 text-transparent hover:border-violet-500"
          }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Favorite overlay */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset._id); }}
        className={`absolute top-2.5 right-2.5 p-1.5 z-20 rounded-full backdrop-blur-md shadow-sm transition-all ${
          asset.isFavorite ? "text-rose-500 bg-white/90 opacity-100" : "text-slate-400 bg-white/80 opacity-0 group-hover:opacity-100 hover:text-rose-500"
        }`}
        title={asset.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
      >
        <Heart className={`w-4 h-4 ${asset.isFavorite ? "fill-rose-500" : ""}`} />
      </button>

      {/* Resource Type Tag Overlay */}
      {isVideo && (
        <div className="absolute bottom-16 left-2.5 z-20 px-2 py-0.5 rounded-md bg-slate-950/75 text-[10px] font-bold text-white backdrop-blur flex items-center gap-1">
          <Film className="w-3 h-3 text-violet-400" />
          <span>VIDEO</span>
        </div>
      )}
      {isRaw && (
        <div className="absolute bottom-16 left-2.5 z-20 px-2 py-0.5 rounded-md bg-slate-950/75 text-[10px] font-bold text-white backdrop-blur flex items-center gap-1">
          <FileText className="w-3 h-3 text-amber-400" />
          <span>{asset.format?.toUpperCase() || "DOC"}</span>
        </div>
      )}

      {/* Preview media */}
      <div className="w-full bg-slate-100/80 flex items-center justify-center overflow-hidden min-h-[140px] max-h-[260px]">
        {isImage && asset.secureUrl ? (
          <img
            src={asset.secureUrl}
            alt={asset.originalFilename || "media"}
            className="w-full h-auto block object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='none' stroke='%2394a3b8' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
            }}
          />
        ) : isVideo && asset.secureUrl ? (
          <div className="w-full h-36 bg-slate-950 flex flex-col items-center justify-center text-slate-300 group-hover:bg-slate-900 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1 text-violet-400">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Video Asset</span>
          </div>
        ) : (
          <div className="w-full h-36 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-10 h-10 mb-1 text-slate-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{asset.format || asset.resourceType || "FILE"}</span>
          </div>
        )}
      </div>

      {/* Info card footer */}
      <div className="p-3 bg-white border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-800 truncate" title={asset.originalFilename}>
          {asset.originalFilename || "untitled"}
        </p>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_COLORS[asset.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {asset.status}
          </span>
          <span className="text-[10px] font-medium text-slate-400 tracking-wide">{formatBytes(asset.fileSize)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Asset detail drawer ──────────────────────────────────────────────────────
function AssetDrawer({ asset, albums = [], onClose, onReconcile, onDelete, reconciling, deleting }) {
  if (!asset) return null;

  const isImage = asset.resourceType === "image";
  const isVideo = asset.resourceType === "video";

  const assetAlbumNames = (albums || []).filter(a => asset.albums?.includes(a._id));

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      <div className="flex-1 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg">Asset Details</h2>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[260px]">{asset.originalFilename || "Media asset"}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60">
          {isImage && asset.secureUrl ? (
            <div className="rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
              <img src={asset.secureUrl} alt={asset.originalFilename} className="w-full object-contain max-h-56" />
            </div>
          ) : isVideo && asset.secureUrl ? (
            <div className="rounded-xl overflow-hidden bg-slate-950 shadow-md">
              <video src={asset.secureUrl} controls className="w-full max-h-56" />
            </div>
          ) : (
            <div className="rounded-xl p-6 bg-white border border-slate-200 flex flex-col items-center text-center">
              <FileText className="w-12 h-12 text-violet-500 mb-2" />
              <p className="font-semibold text-sm text-slate-800 break-all">{asset.originalFilename}</p>
              <p className="text-xs text-slate-400 mt-0.5 uppercase">{asset.format} document</p>
              {asset.secureUrl && (
                <a 
                  href={asset.secureUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="mt-3 px-4 py-1.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                >
                  Download File
                </a>
              )}
            </div>
          )}
        </div>

        {/* Metadata List */}
        <div className="p-5 space-y-5 flex-1">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              {[
                ["Asset ID", <span className="font-mono text-[11px] text-slate-600">{asset._id}</span>],
                ["Status", <span className={`px-2 py-0.5 rounded-full font-bold border ${STATUS_COLORS[asset.status] || ""}`}>{asset.status}</span>],
                ["Format", asset.format?.toUpperCase() || "—"],
                ["MIME Type", asset.mimeType || "—"],
                ["Resource Type", <span className="uppercase font-semibold text-slate-700">{asset.resourceType || "—"}</span>],
                ["Dimensions", asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "—"],
                ["File Size", formatBytes(asset.fileSize)],
                ["Usage Count", <span className="font-bold text-slate-800">{asset.usageCount ?? 0}</span>],
                ["Favorite", asset.isFavorite ? "⭐ Yes" : "No"],
                ["Cloudinary ID", <span className="font-mono text-[10px] break-all text-slate-500">{asset.cloudinaryPublicId || "—"}</span>],
                ["Uploaded At", formatDate(asset.createdAt)],
                ["Orphaned At", formatDate(asset.orphanedAt)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="py-2.5 pr-3 text-slate-400 font-semibold w-32 align-top">{label}</td>
                  <td className="py-2.5 text-slate-700 break-all font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Albums Membership */}
          {assetAlbumNames.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Albums</p>
              <div className="flex flex-wrap gap-1.5">
                {assetAlbumNames.map(alb => (
                  <span key={alb._id} className="text-xs font-bold px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg border border-violet-100">
                    📁 {alb.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* References Table */}
          {asset.references?.length > 0 ? (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active References ({asset.references.length})</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">In Use</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {asset.references.map((r, i) => (
                  <div key={i} className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-700">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-violet-700">{r.entityType}</span>
                      {r.field && <span className="text-[10px] text-slate-400 font-normal">field: {r.field}</span>}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 mt-1 truncate">ID: {r.entityId}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active References</p>
              <p className="text-xs text-slate-500 font-medium">No active entity links. This asset is currently unreferenced.</p>
            </div>
          )}

          {/* Public URL Link */}
          {asset.secureUrl && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Public URL</p>
              <a 
                href={asset.secureUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-violet-600 hover:text-violet-800 break-all font-medium flex items-center gap-1"
              >
                <span>{asset.secureUrl}</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 bg-white flex gap-3">
          <button
            type="button"
            onClick={() => onReconcile(asset._id)}
            disabled={reconciling || deleting}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} />
            {reconciling ? "Reconciling…" : "Reconcile"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(asset._id)}
            disabled={deleting || reconciling}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting…" : "Delete Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function CreateAlbumModal({ onClose, onSubmit, loading }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, description: desc });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-xl">Create New Album</h3>
            <p className="text-xs font-medium text-slate-500">Organize your media collections</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 pl-1">Album Name</label>
            <input 
              type="text" 
              autoFocus
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all font-semibold text-slate-800 placeholder-slate-400"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Collection 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 pl-1">Description <span className="font-normal text-slate-400">(Optional)</span></label>
            <textarea 
              rows={3}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none font-medium text-slate-800 placeholder-slate-400"
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="A few words about this album..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-none hover:shadow-lg hover:shadow-violet-600/30 transition-all">
              {loading ? "Creating..." : "Create Album"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddToAlbumModal({ albums, onClose, onSelect, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="mb-4">
          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Add to Album</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Select an album to copy the selected assets into.</p>
        </div>
        
        <div className="overflow-y-auto flex-1 space-y-2.5 mb-5 pr-1">
          {albums.length === 0 ? (
             <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-500 text-sm font-medium">No albums exist yet.</div>
          ) : (
            albums.map(album => (
              <button 
                type="button"
                key={album._id} 
                onClick={() => onSelect(album._id)}
                disabled={loading}
                className="group w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-violet-500 hover:shadow-md hover:shadow-violet-600/10 transition-all text-left disabled:opacity-50 focus:outline-none"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-slate-800 group-hover:text-violet-700 transition-colors truncate pr-2 text-sm">{album.name}</div>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 group-hover:bg-violet-100 group-hover:text-violet-700 px-2.5 py-1 rounded-lg transition-colors shrink-0">
                  {album.assetCount || 0} items
                </div>
              </button>
            ))
          )}
        </div>
        
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmBulkDeleteDialog({ count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-black text-slate-800 text-lg mb-1.5">Delete {count} Selected Assets?</h3>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          This permanently deletes the selected {count} assets. Assets currently attached to products, reviews, or other resources will be <strong>skipped safely</strong>.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Vendor Media Manager Page ────────────────────────────────────────────
export default function VendorMediaManagerPage() {
  const [assets, setAssets]             = useState([]);
  const [albums, setAlbums]             = useState([]);
  const [metrics, setMetrics]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  
  // Gallery & Filter State
  const [selectedView, setSelectedView] = useState("ALL"); // "ALL", "FAVORITES", "ORPHANED", or <albumId>
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [searchQuery, setSearchQuery]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resourceType, setResourceType] = useState("all"); // "all", "image", "video", "raw"
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({ total: 0, pages: 1, limit: 30 });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum]   = useState(false);
  const [showBulkDelete, setShowBulkDelete]   = useState(false);
  
  const [selectedAsset, setSelectedAsset]     = useState(null);
  const [reconciling, setReconciling]         = useState(false);
  const [deletingSingle, setDeletingSingle]   = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [toast, setToast]                     = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Timeline grouping for the current page
  const timelineGroups = useMemo(() => {
    return assets.reduce((acc, obj) => {
      const key = getTimelineGroup(obj.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(obj);
      return acc;
    }, {});
  }, [assets]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/api/vendor/media/metrics");
      if (data?.metrics) setMetrics(data.metrics);
    } catch { /* best-effort metrics */ }
  }, []);

  const fetchAlbums = useCallback(async () => {
    try {
      const { data } = await api.get("/api/vendor/albums");
      setAlbums(data.albums || []);
    } catch { /* best-effort albums */ }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 30 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (resourceType !== "all") params.resourceType = resourceType;
      
      if (selectedView === "FAVORITES") params.isFavorite = true;
      else if (selectedView === "ORPHANED") params.status = "ORPHANED";
      else if (selectedView !== "ALL") params.albumId = selectedView;
      
      const { data } = await api.get("/api/vendor/media", { params });
      setAssets(data.assets || []);
      setPagination({
        total: data.total || 0,
        pages: data.pages || 1,
        limit: data.limit || 30,
        page: data.page || page,
      });
      setSelectedIds(new Set());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load media assets");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, resourceType, selectedView]);

  useEffect(() => {
    fetchMetrics();
    fetchAlbums();
  }, [fetchMetrics, fetchAlbums]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Actions
  function toggleSelection(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleToggleFavorite(id) {
    try {
      const { data } = await api.put(`/api/vendor/media/${id}/favorite`);
      setAssets(prev => prev.map(a => a._id === id ? { ...a, isFavorite: data.asset.isFavorite } : a));
      if (selectedAsset?._id === id) {
        setSelectedAsset(prev => ({ ...prev, isFavorite: data.asset.isFavorite }));
      }
      showToast(data.asset.isFavorite ? "Added to favorites" : "Removed from favorites");
      if (selectedView === "FAVORITES" && !data.asset.isFavorite) {
        fetchAssets();
      }
    } catch {
      showToast("Failed to update favorite status", "error");
    }
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
       formData.append("files", files[i]);
    }

    try {
      const { data } = await api.post("/api/vendor/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(data.message || "Assets uploaded successfully");
      fetchAssets();
      fetchMetrics();
      fetchAlbums();
    } catch (err) {
      showToast(err?.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  }

  async function handleCreateAlbum(payload) {
    try {
      await api.post("/api/vendor/albums", payload);
      showToast("Album created!");
      setShowCreateAlbum(false);
      fetchAlbums();
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to create album", "error");
    }
  }

  async function handleBulkAction(action, targetAlbumId = null) {
    try {
      const assetIds = Array.from(selectedIds);
      const res = await api.post("/api/vendor/media/bulk-action", { action, assetIds, targetAlbumId });
      
      if (action === "addToAlbum") showToast(`Added ${assetIds.length} assets to album`);
      if (action === "removeFromAlbum") showToast(`Removed ${assetIds.length} assets from this album`);
      if (action === "delete") {
        const { deletedCount, failedCount } = res.data.result || {};
        if (failedCount > 0) showToast(`Deleted ${deletedCount}. Skipped ${failedCount} in-use assets.`, "error");
        else showToast(`Successfully deleted ${deletedCount} assets.`);
      }
      
      setShowAddToAlbum(false);
      setShowBulkDelete(false);
      clearSelection();
      fetchAssets();
      fetchMetrics();
      fetchAlbums();
    } catch (e) {
      showToast(e?.response?.data?.message || "Bulk action failed", "error");
    }
  }

  async function handleDeleteSingleAsset(id) {
    if (!window.confirm("Are you sure you want to permanently delete this media asset?")) return;
    setDeletingSingle(true);
    try {
      const { data } = await api.delete(`/api/vendor/media/${id}`);
      if (data.success) {
        showToast("Asset deleted successfully");
        setSelectedAsset(null);
        fetchAssets();
        fetchMetrics();
        fetchAlbums();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Cannot delete: Asset is actively referenced", "error");
    } finally {
      setDeletingSingle(false);
    }
  }
  
  async function handleDeleteAlbum(albumId) {
    if (!window.confirm("Are you sure you want to delete this album? Photos inside will NOT be deleted.")) return;
    try {
      await api.delete(`/api/vendor/albums/${albumId}`);
      showToast("Album deleted");
      if (selectedView === albumId) setSelectedView("ALL");
      fetchAlbums();
    } catch {
      showToast("Failed to delete album", "error");
    }
  }

  async function handleReconcile(id) {
    setReconciling(true);
    try {
      const { data } = await api.post(`/api/vendor/media/${id}/reconcile`);
      setSelectedAsset(data.asset);
      fetchAssets();
      showToast("Usage count reconciled");
    } catch (e) {
      showToast(e?.response?.data?.message || "Reconciliation failed", "error");
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50 overflow-hidden font-sans">
      {/* Toast message notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[70] px-5 py-3 rounded-2xl shadow-xl text-white font-bold text-sm flex items-center gap-2 animate-in slide-in-from-top-4 duration-200 ${
          toast.type === "error" ? "bg-rose-600 shadow-rose-600/20" : "bg-emerald-600 shadow-emerald-600/20"
        }`}>
          {toast.type === "error" ? <AlertTriangle className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Modals */}
      {showCreateAlbum && <CreateAlbumModal onClose={() => setShowCreateAlbum(false)} onSubmit={handleCreateAlbum} />}
      {showAddToAlbum && <AddToAlbumModal albums={albums} onClose={() => setShowAddToAlbum(false)} onSelect={(id) => handleBulkAction("addToAlbum", id)} />}
      {showBulkDelete && <ConfirmBulkDeleteDialog count={selectedIds.size} onCancel={() => setShowBulkDelete(false)} onConfirm={() => handleBulkAction("delete")} />}

      {/* Asset details drawer */}
      {selectedAsset && (
        <AssetDrawer
          asset={selectedAsset}
          albums={albums}
          onClose={() => setSelectedAsset(null)}
          onReconcile={handleReconcile}
          onDelete={handleDeleteSingleAsset}
          reconciling={reconciling}
          deleting={deletingSingle}
        />
      )}

      {/* Top Metrics Cards Bar */}
      {metrics && (
        <div className="px-6 py-3.5 bg-white border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-7xl">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Assets</div>
                <div className="text-base font-black text-slate-800 leading-tight">{metrics.totalAssets || 0}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active / In Use</div>
                <div className="text-base font-black text-slate-800 leading-tight">{metrics.readyAssets || 0}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Orphaned / Unused</div>
                <div className="text-base font-black text-slate-800 leading-tight">{metrics.orphanedAssets || 0}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Cloud Storage</div>
                <div className="text-base font-black text-slate-800 leading-tight">{metrics.totalCloudinaryAssets || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area (Sidebar + Gallery) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Backdrop */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar Nav */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
          w-64 bg-white border-r border-slate-200/90 flex flex-col flex-shrink-0
          transition-transform duration-200 ease-in-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="p-4 pt-5 flex-1 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-violet-600" />
                Library
              </h2>
              <button 
                type="button" 
                onClick={() => setMobileSidebarOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Views section */}
            <div className="space-y-1 mb-6">
              <button 
                type="button"
                onClick={() => { setSelectedView("ALL"); setPage(1); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedView === "ALL" ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Layers className="w-4 h-4 opacity-80" />
                <span>All Media</span>
              </button>

              <button 
                type="button"
                onClick={() => { setSelectedView("FAVORITES"); setPage(1); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedView === "FAVORITES" ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Heart className={`w-4 h-4 ${selectedView === "FAVORITES" ? "fill-white" : "opacity-80"}`} />
                <span>Favorites</span>
              </button>

              <button 
                type="button"
                onClick={() => { setSelectedView("ORPHANED"); setPage(1); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedView === "ORPHANED" ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-4 h-4 opacity-80" />
                <span>Orphaned (Unused)</span>
              </button>
            </div>

            {/* Albums Section */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Albums</h3>
              <button 
                type="button"
                onClick={() => setShowCreateAlbum(true)} 
                className="text-violet-600 hover:bg-violet-50 p-1 rounded-lg transition-colors" 
                title="Create New Album"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto flex-1 pb-4">
              {albums.map(album => (
                <div 
                  key={album._id} 
                  onClick={() => { setSelectedView(album._id); setPage(1); setMobileSidebarOpen(false); }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedView === album._id ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-100"
                  }`} 
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="w-4 h-4 opacity-60 shrink-0" />
                    <span className="truncate">{album.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                      selectedView === album._id ? "bg-violet-200/80 text-violet-900" : "bg-slate-100 text-slate-500"
                    }`}>
                      {album.assetCount || 0}
                    </span>
                    {selectedView === album._id && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album._id); }} 
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all"
                        title="Delete Album"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {albums.length === 0 && (
                <p className="px-2 py-3 text-xs text-slate-400 font-medium text-center">No albums created yet.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Gallery Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
          {/* Toolbar */}
          <div className="h-16 border-b border-slate-200/90 bg-white px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 flex-1 max-w-xl">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden"
                title="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by filename, public ID, or hash…"
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-slate-800 placeholder-slate-400"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Resource Type Filter Chips */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "all", label: "All" },
                  { id: "image", label: "Images" },
                  { id: "video", label: "Videos" },
                  { id: "raw", label: "Docs" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setResourceType(tab.id); setPage(1); }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      resourceType === tab.id ? "bg-white text-violet-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { fetchAssets(); fetchMetrics(); fetchAlbums(); }}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                title="Refresh Gallery"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-violet-600" : ""}`} />
              </button>

              <label className={`cursor-pointer inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-700 transition-all shadow-sm shadow-violet-600/20 ${uploading ? "opacity-75 cursor-not-allowed" : ""}`}>
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">{uploading ? "Uploading…" : "Upload Media"}</span>
                <span className="sm:hidden">{uploading ? "…" : "Upload"}</span>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  accept="image/*,video/*,application/pdf" 
                  onChange={handleFileUpload} 
                  disabled={uploading} 
                />
              </label>
            </div>
          </div>

          {/* Subheader: View Title & Active Filters */}
          <div className="px-6 py-2.5 bg-white/70 border-b border-slate-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-semibold">
              <span>View:</span>
              <span className="font-extrabold text-violet-700">
                {selectedView === "ALL" ? "All Photos & Media" : selectedView === "FAVORITES" ? "Favorites" : selectedView === "ORPHANED" ? "Orphaned (Unused)" : albums.find(a => a._id === selectedView)?.name || "Album View"}
              </span>
              {resourceType !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-bold border border-violet-100 capitalize">
                  Type: {resourceType}
                </span>
              )}
              {debouncedSearch && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                  Matches: "{debouncedSearch}"
                </span>
              )}
            </div>
            <div className="text-slate-400 font-medium">
              {pagination.total} item{pagination.total === 1 ? "" : "s"} total
            </div>
          </div>

          {/* Scrollable Gallery */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
                <span className="text-xs font-bold text-slate-400">Loading gallery…</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto mt-10">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <p className="font-bold text-sm">{error}</p>
                <button type="button" onClick={fetchAssets} className="mt-3 text-xs font-bold underline text-rose-700 hover:text-rose-900">
                  Try Again
                </button>
              </div>
            ) : assets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <p className="font-black text-slate-700 text-base">No media assets found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                  {debouncedSearch ? "Try adjusting your search query or type filter." : "Click Upload Media above to add photos, videos, or documents."}
                </p>
              </div>
            ) : (
              <div className="pb-24">
                {Object.entries(timelineGroups).map(([monthYear, groupAssets]) => (
                  <div key={monthYear} className="mb-8">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3.5 px-1 flex items-center gap-2">
                      <span>{monthYear}</span>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                        {groupAssets.length}
                      </span>
                    </h3>
                    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3.5">
                      {groupAssets.map(asset => (
                        <AssetCard 
                          key={asset._id} 
                          asset={asset}
                          isSelected={selectedIds.has(asset._id)}
                          onClick={setSelectedAsset}
                          onSelect={toggleSelection}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls Footer */}
          {pagination.pages > 1 && (
            <div className="h-14 border-t border-slate-200/80 bg-white px-6 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 font-medium">
                Page <span className="font-bold text-slate-800">{pagination.page}</span> of <span className="font-bold text-slate-800">{pagination.pages}</span> ({pagination.total} items)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Sticky Floating Bar for Multi-Selection */}
          {selectedIds.size > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 sm:gap-6 z-40 border border-slate-800 animate-[slideUp_0.2s_ease-out]">
              <span className="font-extrabold text-xs bg-slate-800 px-3 py-1.5 rounded-xl">
                {selectedIds.size} Selected
              </span>
              <div className="h-5 w-px bg-slate-700" />
              
              {/* If we are inside a specific album, show "Remove from Album" */}
              {selectedView !== "ALL" && selectedView !== "FAVORITES" && selectedView !== "ORPHANED" && (
                <button 
                  type="button"
                  onClick={() => handleBulkAction("removeFromAlbum", selectedView)} 
                  className="text-xs font-bold hover:text-amber-300 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove from Album</span>
                </button>
              )}

              <button 
                type="button"
                onClick={() => setShowAddToAlbum(true)} 
                className="text-xs font-bold hover:text-violet-300 transition-colors flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add to Album</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setShowBulkDelete(true)} 
                className="text-xs font-bold hover:text-rose-400 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button 
                type="button"
                onClick={clearSelection} 
                className="ml-2 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition-colors"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
