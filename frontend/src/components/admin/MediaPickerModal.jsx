import { useState, useEffect, useCallback } from "react";
import { adminHttp } from "../../services/adminHttp";
import { Search } from "lucide-react";

export function MediaPickerModal({ isOpen, onClose, onSelect, maxSelect = 1 }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [albums, setAlbums] = useState([]);
  const [selectedView, setSelectedView] = useState("ALL");

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all assets (backend hides DELETED by default)
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (selectedView === "FAVORITES") params.isFavorite = true;
      else if (selectedView !== "ALL") params.albumId = selectedView;
      
      const { data } = await adminHttp.get("/api/admin/media", { params });
      // Extra safety filter for images that are valid for insertion
      const onlyImages = (data.assets || []).filter(a => a.resourceType === "image" && (a.status === "READY" || a.status === "ORPHANED"));
      setAssets(onlyImages);
      setPagination({ total: data.total, pages: data.pages });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load media assets");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedView]);

  const fetchAlbums = useCallback(async () => {
    try {
      const { data } = await adminHttp.get("/api/admin/albums");
      setAlbums(data.albums || []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchAssets();
      fetchAlbums();
    }
  }, [isOpen, fetchAssets, fetchAlbums]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  }

  function toggleSelection(asset) {
    const next = new Set(selectedIds);
    if (next.has(asset._id)) {
      next.delete(asset._id);
    } else {
      if (maxSelect === 1) {
        next.clear();
      } else if (next.size >= maxSelect) {
        return; // hit max limit
      }
      next.add(asset._id);
    }
    setSelectedIds(next);
  }

  function handleInsert() {
    const selectedAssets = assets.filter(a => selectedIds.has(a._id));
    onSelect(selectedAssets);
    onClose();
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
       formData.append("files", files[i]);
    }

    try {
      await adminHttp.post("/api/admin/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPage(1);
      fetchAssets();
    } catch (err) {
      setUploadError(err?.response?.data?.message || "Upload failed");
      // clear error after 4s
      setTimeout(() => setUploadError(""), 4000);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">Media Manager</h2>
            <label className={`cursor-pointer inline-flex items-center gap-2 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors shadow-sm ${uploading ? "opacity-75 cursor-not-allowed" : ""}`}>
              {uploading ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Photos
                </>
              )}
              <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>
            {uploadError && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">{uploadError}</span>}
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 max-w-md items-center relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
            />
          </form>
          
          <div className="text-sm font-medium text-slate-600">
            {selectedIds.size} / {maxSelect} selected
          </div>
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mini Sidebar */}
          <div className="w-56 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-y-auto shrink-0 p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Library</h3>
            <div className="space-y-1 mb-6">
              <button onClick={() => setSelectedView("ALL")} className={`w-full flex justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedView === "ALL" ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                All Photos
              </button>
              <button onClick={() => setSelectedView("FAVORITES")} className={`w-full flex justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedView === "FAVORITES" ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                Favorites
              </button>
            </div>
            
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Albums</h3>
             <div className="space-y-1">
               {albums.map(album => (
                 <button key={album._id} onClick={() => setSelectedView(album._id)} className={`w-full flex justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate ${selectedView === album._id ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                   {album.name}
                 </button>
               ))}
               {albums.length === 0 && <p className="text-xs text-slate-400 ml-1">No albums</p>}
             </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-10">
                <p>{error}</p>
                <button onClick={fetchAssets} className="mt-3 text-sm underline text-red-600 hover:text-red-800">Retry</button>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium text-slate-600">No assets found</p>
                <p className="text-sm mt-1">Upload images via the dashboard first.</p>
              </div>
            ) : (
              <div>
                <div className="columns-3 sm:columns-4 md:columns-5 gap-3">
                  {assets.map(asset => {
                    const isSelected = selectedIds.has(asset._id);
                    return (
                      <div
                        key={asset._id}
                        onClick={() => toggleSelection(asset)}
                        className={`group relative break-inside-avoid inline-block w-full rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 mb-3 ${
                          isSelected ? "border-violet-600 shadow-md ring-2 ring-violet-600 ring-offset-1" : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={asset.secureUrl}
                          alt={asset.originalFilename}
                          className="w-full h-auto block bg-slate-200"
                          loading="lazy"
                        />
                        {/* Selection overlay */}
                        <div className={`absolute inset-0 bg-slate-900/20 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                        
                        {/* Checkbox indicator */}
                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-md border-2 flex items-center justify-center backdrop-blur-sm shadow-sm transition-colors ${
                          isSelected 
                            ? "border-violet-600 bg-violet-600 text-white" 
                            : "border-slate-400 bg-white/80 text-transparent hover:border-violet-500/50"
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        
                        {/* Filtered Favorites indication */}
                        {asset.isFavorite && (
                          <div className="absolute top-2 left-2 text-red-500 bg-white/80 rounded-full p-1 drop-shadow-sm">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                          </div>
                        )}
                        
                        {/* Filename tooltip bar */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white truncate text-[10px]">
                          {asset.originalFilename}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-slate-200/60">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium text-slate-500">
                      {page} / {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={page >= pagination.pages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={selectedIds.size === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-violet-600/20"
          >
            Insert {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
