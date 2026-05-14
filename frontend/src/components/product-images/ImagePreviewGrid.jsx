import { AnimatePresence } from "framer-motion";
import { DraggableImageCard } from "./DraggableImageCard";

export function ImagePreviewGrid({
  images = [],
  dragIndex = null,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemove,
  onSetPrimary,
  onAltTextChange,
  compact = false,
}) {
  if (!images.length) return null;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {images.length} image{images.length === 1 ? "" : "s"} ready
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Drag cards to change gallery order.</p>
      </div>

      <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
        <AnimatePresence initial={false}>
          {images.map((image, index) => (
            <div key={image.id || `${image.url}-${index}`} className={dragIndex === index ? "opacity-80" : ""}>
              <DraggableImageCard
                image={image}
                index={index}
                compact={compact}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onRemove={onRemove}
                onSetPrimary={onSetPrimary}
                onAltTextChange={onAltTextChange}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
