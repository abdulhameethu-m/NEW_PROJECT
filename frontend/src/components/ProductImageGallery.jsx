import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { ProductMainImage } from "./ProductMainImage";
import { ProductThumbnailList } from "./ProductThumbnailList";
import { GalleryFullscreenModal } from "./GalleryFullscreenModal";

export function ProductImageGallery({ media = [], productName = "Product", galleryKey = "default" }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const safeMedia = useMemo(
    () =>
      (Array.isArray(media) ? media : [])
        .filter((item) => item?.url)
        .sort((a, b) => Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0)),
    [media]
  );

  const totalImages = safeMedia.length;
  const hasMultipleImages = totalImages > 1;
  const activeMedia = safeMedia[selectedIndex] || null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [galleryKey]);

  useEffect(() => {
    if (selectedIndex > totalImages - 1) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, totalImages]);

  useEffect(() => {
    if (!hasMultipleImages) return;

    const preloadIndexes = [
      (selectedIndex + 1) % totalImages,
      (selectedIndex - 1 + totalImages) % totalImages,
    ];

    for (const index of preloadIndexes) {
      const nextMedia = safeMedia[index];
      if (nextMedia?.type === "image" && nextMedia?.url) {
        const img = new Image();
        img.src = resolveApiAssetUrl(nextMedia.url);
      }
    }
  }, [hasMultipleImages, safeMedia, selectedIndex, totalImages]);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  }, [totalImages]);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  }, [totalImages]);

  useEffect(() => {
    if (isFullscreen || !hasMultipleImages) return;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, hasMultipleImages, isFullscreen]);

  if (totalImages === 0) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-500">No product images available</div>
          <div className="mt-1 text-xs text-slate-400">Images will appear here once uploaded.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {hasMultipleImages ? (
          <div className="w-full shrink-0 lg:w-[96px] lg:-translate-x-2 xl:-translate-x-6">
            <ProductThumbnailList
              media={safeMedia}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              productName={productName}
            />
          </div>
        ) : (
          <div className="hidden lg:block lg:w-[96px]" />
        )}

        <div className="relative min-w-0 flex-1 w-full">
          <ProductMainImage
            media={activeMedia}
            productName={productName}
            imageIndex={selectedIndex}
          />




        </div>
      </section>

      {isFullscreen && activeMedia ? (
        <GalleryFullscreenModal
          media={safeMedia}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onClose={() => setIsFullscreen(false)}
          productName={productName}
        />
      ) : null}
    </>
  );
}
