import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";

export function ImageUploadZone({
  title,
  description,
  helperText,
  onFilesSelected,
  disabled = false,
  compact = false,
  isUploading = false,
  accept = "image/png,image/jpg,image/jpeg,image/webp",
}) {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDragEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    if (event.type === "dragenter" || event.type === "dragover") {
      setIsDragActive(true);
    } else {
      setIsDragActive(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    onFilesSelected?.(event.dataTransfer?.files);
  }

  return (
    <div
      onDragEnter={handleDragEvent}
      onDragOver={handleDragEvent}
      onDragLeave={handleDragEvent}
      onDrop={handleDrop}
      className={[
        "relative overflow-hidden rounded-3xl border border-dashed transition-all",
        compact ? "p-4" : "p-6 sm:p-8",
        isDragActive
          ? "border-[color:var(--commerce-accent)] bg-[color:var(--commerce-accent-soft)] shadow-lg shadow-slate-200/60"
          : "border-slate-300 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))] hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/80",
        disabled ? "pointer-events-none opacity-70" : "",
      ].join(" ")}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(event) => {
          onFilesSelected?.(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_42%)]" />

      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[color:var(--commerce-accent)] shadow-sm dark:bg-slate-900">
          {isUploading ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[color:var(--commerce-accent)] focus:ring-offset-2 dark:bg-white dark:text-slate-950"
          >
            <ImagePlus className="h-4 w-4" />
            Browse Files
          </button>
          <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">or drag & drop</span>
        </div>
        {helperText ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{helperText}</p> : null}
      </div>
    </div>
  );
}
