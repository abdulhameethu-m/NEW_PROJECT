import { useMemo, useState } from "react";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

export function ProductImage({ media = [], productName = "Product" }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({
    transformOrigin: "center center",
    transform: "scale(1)",
  });

  const safeMedia = useMemo(() => (Array.isArray(media) ? media.filter((item) => item?.url) : []), [media]);
  const activeMedia = safeMedia[Math.min(activeIndex, Math.max(safeMedia.length - 1, 0))] || null;
  const fallbackPoster = safeMedia.find((item) => item.type === "image")?.url || "";
  const hasThumbnails = safeMedia.length > 1;

  function resetZoom() {
    setZoomStyle({
      transformOrigin: "center center",
      transform: "scale(1)",
    });
  }

  return (
    <section className={`grid w-full gap-4 lg:items-stretch ${hasThumbnails ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {hasThumbnails ? (
        <div className="order-2 flex gap-3 overflow-x-auto pb-2 lg:order-1 lg:flex-col lg:pb-0">
          {safeMedia.map((item, index) => (
            <button
              key={`${item.type}-${item.url}-${index}`}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                resetZoom();
              }}
              className={`group relative h-20 w-20 flex-none overflow-hidden rounded-xl border bg-white shadow-md transition hover:-translate-y-0.5 ${
                index === activeIndex
                  ? "border-[color:var(--commerce-accent)] ring-2 ring-[color:var(--commerce-accent-soft)]"
                  : "border-slate-200"
              }`}
              aria-label={`Preview ${index + 1}`}
            >
              {item.type === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs font-semibold text-white">
                  Video
                </div>
              ) : (
                <img
                  src={resolveApiAssetUrl(item.url)}
                  alt={item.altText || `${productName} thumbnail ${index + 1}`}
                  loading="lazy"
                  className="h-full w-full object-contain p-2"
                />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`order-1 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-gray-100 shadow-md ${hasThumbnails ? "lg:order-2" : "col-span-1"}`}>
        <div className="relative flex h-[24rem] w-full items-center justify-center overflow-hidden p-4 sm:h-[28rem] sm:p-6 lg:h-[34rem] lg:p-8 xl:h-[38rem]">
          {activeMedia ? (
            activeMedia.type === "video" ? (
              <video
                key={activeMedia.url}
                controls
                playsInline
                className="h-full w-full rounded-xl object-contain"
                poster={fallbackPoster ? resolveApiAssetUrl(fallbackPoster) : undefined}
              >
                <source src={resolveApiAssetUrl(activeMedia.url)} />
              </video>
            ) : (
              <img
                src={resolveApiAssetUrl(activeMedia.url)}
                alt={activeMedia.altText || productName}
                loading="lazy"
                className="block h-full max-h-full w-full max-w-full rounded-xl object-contain transition duration-300 ease-out hover:scale-105 lg:cursor-zoom-in"
                style={zoomStyle}
                onMouseMove={(event) => {
                  if (window.innerWidth < 1024) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - bounds.left) / bounds.width) * 100;
                  const y = ((event.clientY - bounds.top) / bounds.height) * 100;
                  setZoomStyle({
                    transformOrigin: `${x}% ${y}%`,
                    transform: "scale(1.1)",
                  });
                }}
                onMouseLeave={resetZoom}
                onError={(event) => {
                  event.currentTarget.src = "https://via.placeholder.com/900x900?text=Product";
                }}
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-white text-sm text-slate-500">
              No product image available
            </div>
          )}

          {activeMedia?.type === "image" ? (
            <div className="absolute bottom-4 right-4 hidden rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white lg:block">
              Hover to zoom
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
