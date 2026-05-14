import { GripVertical, Star, Trash2 } from "lucide-react";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";

export function DraggableImageCard({
  image,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemove,
  onSetPrimary,
  onAltTextChange,
  compact = false,
}) {
  const previewUrl = resolveApiAssetUrl(image.url);

  return (
    <article
      draggable
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(event) => onDragOver?.(event, index)}
      onDragEnd={() => onDragEnd?.()}
      className={[
        "group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950",
        compact ? "" : "min-h-full",
      ].join(" ")}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={previewUrl}
          alt={image.altText || `Product image ${index + 1}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <GripVertical className="h-3.5 w-3.5" />
            Drag
          </span>
          {image.isPrimary ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
              <Star className="h-3.5 w-3.5 fill-current" />
              Primary
            </span>
          ) : null}
        </div>

        {image.status === "uploading" ? (
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-3 py-2 text-xs text-white">
            <div className="flex items-center justify-between">
              <span>Uploading...</span>
              <span>{Math.max(0, Math.min(100, Number(image.uploadProgress || 0)))}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[color:var(--commerce-accent)] transition-[width]"
                style={{ width: `${Math.max(4, Math.min(100, Number(image.uploadProgress || 0)))}%` }}
              />
            </div>
          </div>
        ) : null}

        {image.error ? (
          <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 px-3 py-2 text-xs font-medium text-white">
            {image.error}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Position {index + 1}
          </div>
          <div className="flex items-center gap-2">
            {!image.isPrimary ? (
              <button
                type="button"
                onClick={() => onSetPrimary?.(index)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200"
              >
                Set Primary
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove?.(index)}
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300"
              aria-label={`Remove image ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>

        <input
          type="text"
          value={image.altText || ""}
          onChange={(event) => onAltTextChange?.(index, event.target.value)}
          placeholder="Describe this image for accessibility"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[color:var(--commerce-accent)] focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>
    </article>
  );
}
