import { useState, useEffect, useCallback } from "react";
import { adminHttp } from "../services/adminHttp";

const STATUSES = ["UPLOADING", "READY", "ORPHANED", "DELETING", "DELETED", "FAILED"];
const STATUS_COLORS = {
  READY:     "bg-green-100 text-green-800",
  UPLOADING: "bg-blue-100 text-blue-800",
  ORPHANED:  "bg-amber-100 text-amber-800",
  DELETING:  "bg-orange-100 text-orange-800",
  DELETED:   "bg-gray-100 text-gray-500",
  FAILED:    "bg-red-100 text-red-800",
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
  const d = new Date(dateString);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

// ── Asset grid card ──────────────────────────────────────────────────────────
function AssetCard({ asset, isSelected, onClick, onSelect, onToggleFavorite, canSelect = true }) {
  const isImage = asset.resourceType === "image";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(asset)}
      onKeyDown={(e) => e.key === "Enter" && onClick(asset)}
      className={`group relative break-inside-avoid inline-block w-full bg-white border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 mb-3 ${
        isSelected ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200 hover:border-violet-300"
      }`}
    >
      {/* Checkbox overlay */}
      {canSelect && (
        <div 
          className={`absolute top-2 left-2 z-20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); onSelect(asset._id); }}
        >
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center backdrop-blur-sm shadow-sm transition-colors ${
            isSelected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-400 bg-white/80 text-transparent hover:border-violet-500/50"
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Favorite overlay */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset._id); }}
        className={`absolute top-2 right-2 p-1.5 z-20 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all ${
          asset.isFavorite ? "text-red-500 opacity-100" : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400"
        }`}
        title={asset.isFavorite ? "Unfavorite" : "Favorite"}
      >
        <svg className="w-4 h-4" fill={asset.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      {/* Preview */}
      <div className="w-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {isImage && asset.secureUrl ? (
          <img
            src={asset.secureUrl}
            alt={asset.originalFilename || "media"}
            className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.893L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <span className="text-xs uppercase">{asset.resourceType}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-slate-700 truncate" title={asset.originalFilename}>
          {asset.originalFilename || "untitled"}
        </p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[asset.status] || "bg-slate-100 text-slate-600"}`}>
            {asset.status}
          </span>
          <span className="text-[10px] text-slate-400 tracking-wide">{formatBytes(asset.fileSize)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Asset detail drawer ──────────────────────────────────────────────────────
function AssetDrawer({ asset, onClose, onReconcile, deleting, reconciling }) {
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 text-lg">Asset Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {asset.resourceType === "image" && asset.secureUrl && (
          <div className="mx-5 mt-5 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
            <img src={asset.secureUrl} alt={asset.originalFilename} className="w-full object-contain max-h-48" />
          </div>
        )}

        <div className="p-5 space-y-4 flex-1">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                ["ID", <span className="font-mono text-xs">{asset._id}</span>],
                ["Status", <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[asset.status] || ""}`}>{asset.status}</span>],
                ["Filename", asset.originalFilename || "—"],
                ["Format", asset.format?.toUpperCase() || "—"],
                ["MIME Type", asset.mimeType || "—"],
                ["Resource Type", asset.resourceType || "—"],
                ["Dimensions", asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"],
                ["File Size", formatBytes(asset.fileSize)],
                ["Usage Count", asset.usageCount ?? 0],
                ["Favorite", asset.isFavorite ? "Yes" : "No"],
                ["Albums Count", asset.albums?.length || 0],
                ["Cloudinary ID", <span className="font-mono text-xs break-all">{asset.cloudinaryPublicId || "—"}</span>],
                ["Uploaded", formatDate(asset.createdAt)],
                ["Orphaned At", formatDate(asset.orphanedAt)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="py-2 pr-3 text-slate-500 font-medium w-36 align-top">{label}</td>
                  <td className="py-2 text-slate-800 break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {asset.references?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">References ({asset.references.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {asset.references.map((r, i) => (
                  <div key={i} className="text-xs bg-slate-50 rounded-lg px-3 py-2 text-slate-700">
                    <span className="font-semibold">{r.entityType}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="font-mono">{r.entityId}</span>
                    {r.field && <span className="text-slate-400 ml-1">({r.field})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.secureUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Secure URL</p>
              <a href={asset.secureUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 underline break-all hover:text-violet-800">
                {asset.secureUrl}
              </a>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200">
          <button
            onClick={() => onReconcile(asset._id)}
            disabled={reconciling}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {reconciling ? "Reconciling…" : "↺ Reconcile Usage Count"}
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-xl">Create New Album</h3>
            <p className="text-xs font-medium text-slate-500">Organize your media collections</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">Album Name</label>
            <input 
              type="text" 
              autoFocus
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all font-medium text-slate-800 placeholder-slate-400"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Collection 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 pl-1">Description <span className="font-normal text-slate-400">(Optional)</span></label>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                key={album._id} 
                onClick={() => onSelect(album._id)}
                disabled={loading}
                className="group w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-500 hover:shadow-md hover:shadow-violet-600/10 transition-all text-left disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="font-bold text-slate-800 group-hover:text-violet-700 transition-colors truncate pr-2 text-sm">{album.name}</div>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 group-hover:bg-violet-100 group-hover:text-violet-700 px-2.5 py-1 rounded-lg transition-colors">{album.assetCount || 0} items</div>
              </button>
            ))
          )}
        </div>
        
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmBulkDeleteDialog({ count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="font-bold text-slate-800 text-lg mb-2">Delete {count} Assets?</h3>
        <p className="text-sm text-slate-600 mb-4">
          This will permanently delete the selected {count} assets. Assets that are currently in use (having 1 or more references) will <strong>not</strong> be deleted for safety.
        </p>
        <p className="text-xs text-red-600 mb-5 font-medium">⚠ This action is permanent.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminMediaManagerPage() {
  const [assets, setAssets]         = useState([]);
  const [albums, setAlbums]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  
  // Gallery State
  const [selectedView, setSelectedView] = useState("ALL"); // "ALL", "FAVORITES", or <albumId>
  const [selectedIds, setSelectedIds]   = useState(new Set());
  
  // Modals
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [toast, setToast]           = useState(null);

  // Used for timeline grouping organically
  const timelineGroups = assets.reduce((acc, obj) => {
    const key = getTimelineGroup(obj.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {});

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchAlbums = useCallback(async () => {
    try {
      const { data } = await adminHttp.get("/api/admin/albums");
      setAlbums(data.albums || []);
    } catch { /* */ }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100 }; // Increase limit for gallery view
      if (selectedView === "FAVORITES") params.isFavorite = true;
      else if (selectedView !== "ALL") params.albumId = selectedView;
      
      const { data } = await adminHttp.get("/api/admin/media", { params });
      setAssets(data.assets || []);
      // Clear selection when view changes to avoid ghost selections
      setSelectedIds(new Set());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [selectedView]);

  useEffect(() => {
    fetchAlbums();
    fetchAssets();
  }, [fetchAlbums, fetchAssets]);

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
      const { data } = await adminHttp.put(`/api/admin/media/${id}/favorite`);
      // Optimistically update
      setAssets(assets.map(a => a._id === id ? { ...a, isFavorite: data.asset.isFavorite } : a));
      showToast(data.asset.isFavorite ? "Added to favorites" : "Removed from favorites");
      if (selectedView === "FAVORITES" && !data.asset.isFavorite) {
        fetchAssets(); // Refresh if we just un-favorited while inside Favorites view
      }
    } catch(e) {
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
      const { data } = await adminHttp.post("/api/admin/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(data.message || "Assets uploaded successfully");
      fetchAssets();
    } catch (err) {
      showToast(err?.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  }

  async function handleCreateAlbum(payload) {
    try {
      await adminHttp.post("/api/admin/albums", payload);
      showToast("Album created!");
      setShowCreateAlbum(false);
      fetchAlbums();
    } catch(e) {
      showToast(e?.response?.data?.message || "Failed to create album", "error");
    }
  }

  async function handleBulkAction(action, targetAlbumId = null) {
    try {
      const assetIds = Array.from(selectedIds);
      const res = await adminHttp.post("/api/admin/media/bulk-action", { action, assetIds, targetAlbumId });
      
      if (action === "addToAlbum") showToast(`Added ${assetIds.length} assets to album`);
      if (action === "removeFromAlbum") showToast(`Removed ${assetIds.length} assets from this album`);
      if (action === "delete") {
        const { deletedCount, failedCount } = res.data.result;
        if (failedCount > 0) showToast(`Deleted ${deletedCount}. Skipped ${failedCount} in-use assets.`, "error");
        else showToast(`Successfully deleted ${deletedCount} assets.`);
      }
      
      setShowAddToAlbum(false);
      setShowBulkDelete(false);
      clearSelection();
      fetchAssets();
    } catch(e) {
      showToast(e?.response?.data?.message || "Bulk action failed", "error");
    }
  }
  
  async function handleDeleteAlbum(albumId) {
    if (!window.confirm("Are you sure you want to delete this album? The photos inside will NOT be deleted.")) return;
    try {
      await adminHttp.delete(`/api/admin/albums/${albumId}`);
      showToast("Album deleted");
      if (selectedView === albumId) setSelectedView("ALL");
      fetchAlbums();
    } catch(e) {
      showToast("Failed to delete album", "error");
    }
  }

  async function handleReconcile(id) {
    setReconciling(true);
    try {
      const { data } = await adminHttp.post(`/api/admin/media/${id}/reconcile`);
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
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[70] px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${
          toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showCreateAlbum && <CreateAlbumModal onClose={() => setShowCreateAlbum(false)} onSubmit={handleCreateAlbum} />}
      {showAddToAlbum && <AddToAlbumModal albums={albums} onClose={() => setShowAddToAlbum(false)} onSelect={(id) => handleBulkAction("addToAlbum", id)} />}
      {showBulkDelete && <ConfirmBulkDeleteDialog count={selectedIds.size} onClose={() => setShowBulkDelete(false)} onCancel={() => setShowBulkDelete(false)} onConfirm={() => handleBulkAction("delete")} />}

      {/* Asset drawer */}
      {selectedAsset && (
        <AssetDrawer
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onReconcile={handleReconcile}
          reconciling={reconciling}
        />
      )}

      {/* Sidebar Overlay (Mobile) / Fixed (Desktop) */}
      <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50 flex-shrink-0">
        <div className="p-4 pt-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight mb-6">Gallery</h2>
          
          <div className="space-y-1 mb-8">
            <button 
              onClick={() => setSelectedView("ALL")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedView === "ALL" ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              All Photos
            </button>
            <button 
              onClick={() => setSelectedView("FAVORITES")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedView === "FAVORITES" ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <svg className={`w-5 h-5 opacity-70 ${selectedView === "FAVORITES" ? "fill-current" : ""}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Favorites
            </button>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Albums</h3>
            <button onClick={() => setShowCreateAlbum(true)} className="text-violet-600 hover:bg-violet-100 p-1 rounded-md transition-colors" title="New Album">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          
          <div className="space-y-1 overflow-y-auto flex-1 pb-4">
            {albums.map(album => (
              <div key={album._id} className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${selectedView === album._id ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setSelectedView(album._id)}>
                <div className="flex items-center gap-3 truncate">
                  <svg className="w-5 h-5 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <span className="truncate">{album.name}</span>
                </div>
                {selectedView === album._id && (
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album._id); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all">
                     <svg className="w-3.5 h-3.5 mt-[2px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                )}
              </div>
            ))}
            {albums.length === 0 && <p className="px-3 text-xs text-slate-400">No albums yet.</p>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header bar */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <h2 className="text-xl font-semibold text-slate-800">
            {selectedView === "ALL" ? "All Photos" : selectedView === "FAVORITES" ? "Favorites" : albums.find(a => a._id === selectedView)?.name || "Album View"}
          </h2>
          <div>
            <label className={`cursor-pointer inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm ${uploading ? "opacity-75 cursor-not-allowed" : ""}`}>
              {uploading ? "Uploading..." : "+ Upload Photos"}
              <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Scrollable Gallery */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading ? (
             <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
             </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">{error}</div>
          ) : assets.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-medium text-slate-500 text-lg">No photos found</p>
                <p className="text-sm mt-1">They will appear here once uploaded.</p>
             </div>
          ) : (
             <div className="pb-24">
               {Object.entries(timelineGroups).map(([monthYear, groupAssets]) => (
                 <div key={monthYear} className="mb-8">
                   <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">{monthYear}</h3>
                   <div className="columns-2 md:columns-4 lg:columns-5 xl:columns-6 gap-3">
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

        {/* Sticky Action Bar for Selection */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-[slideUp_0.2s_ease-out]">
            <span className="font-semibold text-sm bg-slate-700/50 px-3 py-1 rounded-lg scoreboard">
              {selectedIds.size} Selected
            </span>
            <div className="h-6 w-px bg-slate-600"></div>
            
            {/* If we are inside a specific album, show "Remove from Album" */}
            {selectedView !== "ALL" && selectedView !== "FAVORITES" && (
              <button 
                onClick={() => handleBulkAction("removeFromAlbum", selectedView)} 
                className="text-sm font-medium hover:text-orange-300 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Remove from Album
              </button>
            )}

            <button onClick={() => setShowAddToAlbum(true)} className="text-sm font-medium hover:text-violet-300 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add to Album
            </button>
            <button onClick={() => setShowBulkDelete(true)} className="text-sm font-medium hover:text-red-400 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
            <button onClick={clearSelection} className="ml-2 text-slate-400 hover:text-white p-1 rounded-full bg-slate-700/50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
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
