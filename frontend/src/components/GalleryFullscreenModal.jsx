import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

export function GalleryFullscreenModal({
  media = [],
  selectedIndex = 0,
  onSelect = () => {},
  onClose = () => {},
  productName = "Product",
}) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  const activeMedia = media[currentIndex] || null;
  const totalImages = media.length;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
    setZoomLevel(1);
  }, [totalImages]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  }, [totalImages]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "+") {
        event.preventDefault();
        setZoomLevel((prev) => Math.min(prev + 0.5, 3));
      } else if (event.key === "-") {
        event.preventDefault();
        setZoomLevel((prev) => Math.max(prev - 0.5, 1));
      } else if (event.key === "0") {
        event.preventDefault();
        setZoomLevel(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, onClose]);

  useEffect(() => {
    return () => {
      onSelect(currentIndex);
    };
  }, [currentIndex, onSelect]);

  if (!activeMedia) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur">
      <div className="relative flex h-full w-full items-center justify-center overflow-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-slate-950/82 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/70 transition hover:bg-black"
          title="Close (Esc)"
          aria-label="Close fullscreen"
        >
          <X className="h-6 w-6" />
        </button>

        {activeMedia.type === "image" ? (
          <img
            key={activeMedia.url}
            src={resolveApiAssetUrl(activeMedia.url)}
            alt={activeMedia.altText || `${productName} - Image ${currentIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            style={{
              transform: `scale(${zoomLevel})`,
              transition: "transform 0.2s ease-out",
            }}
            onError={(event) => {
              event.currentTarget.src =
                "https://via.placeholder.com/1200x1200?text=Image+Not+Found";
            }}
          />
        ) : (
          <video key={activeMedia.url} controls className="max-h-[90vh] max-w-[90vw] object-contain">
            <source src={resolveApiAssetUrl(activeMedia.url)} />
            Your browser does not support the video tag.
          </video>
        )}

        {totalImages > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 z-[55] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-slate-950/82 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/70 transition hover:bg-black"
              title="Previous (Left Arrow)"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-[55] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-slate-950/82 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/70 transition hover:bg-black"
              title="Next (Right Arrow)"
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        ) : null}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {currentIndex + 1} / {totalImages}
            </div>
            {activeMedia.type === "image" ? (
              <div className="text-xs text-slate-300">
                Zoom: {zoomLevel.toFixed(1)}x | Use +/- to zoom | 0 to reset
              </div>
            ) : null}
          </div>
        </div>

        {activeMedia.type === "image" ? (
          <div className="absolute bottom-24 left-1/2 z-[55] flex -translate-x-1/2 gap-2 rounded-full border border-white/20 bg-slate-950/82 p-2 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/50">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.5, 1))}
              className="h-10 w-10 rounded-full bg-white/20 transition hover:bg-white/30"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="h-10 w-10 rounded-full bg-white/20 text-xs transition hover:bg-white/30"
              title="Reset zoom (0)"
              aria-label="Reset zoom"
            >
              1:1
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.5, 3))}
              className="h-10 w-10 rounded-full bg-white/20 transition hover:bg-white/30"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      {totalImages > 1 ? (
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/40 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {media.map((item, index) => (
              <button
                key={`fullscreen-thumb-${item.url}-${index}`}
                type="button"
                onClick={() => {
                  setCurrentIndex(index);
                  setZoomLevel(1);
                }}
                className={`group relative h-16 w-16 flex-none overflow-hidden rounded-lg border-2 transition ${
                  index === currentIndex
                    ? "border-[color:var(--commerce-accent)] ring-2 ring-[color:var(--commerce-accent-soft)]"
                    : "border-white/20 hover:border-white/40"
                }`}
                aria-label={`Go to image ${index + 1}`}
                aria-current={index === currentIndex}
              >
                {item.type === "image" ? (
                  <img
                    src={resolveApiAssetUrl(item.url)}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-700 text-xs text-white">
                    Play
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
