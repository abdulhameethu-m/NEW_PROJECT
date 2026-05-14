import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

export function ProductThumbnailList({
  media = [],
  selectedIndex = 0,
  onSelect = () => {},
  productName = "Product",
}) {
  const scrollContainerRef = useRef(null);
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1024 : false));

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 1024);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = scrollContainerRef.current;

    if (isDesktop) {
      setCanScrollBackward(scrollTop > 0);
      setCanScrollForward(scrollTop < scrollHeight - clientHeight - 8);
      return;
    }

    setCanScrollBackward(scrollLeft > 0);
    setCanScrollForward(scrollLeft < scrollWidth - clientWidth - 8);
  }, [isDesktop]);

  useEffect(() => {
    checkScroll();
  }, [checkScroll, isDesktop, media.length, selectedIndex]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const node = scrollContainerRef.current.querySelector(`[data-thumbnail-index="${selectedIndex}"]`);
    if (!node) return;

    if (isDesktop) {
      const top = node.offsetTop;
      const bottom = top + node.offsetHeight;
      const currentTop = scrollContainerRef.current.scrollTop;
      const currentBottom = currentTop + scrollContainerRef.current.clientHeight;

      if (top < currentTop) {
        scrollContainerRef.current.scrollTop = top - 12;
      } else if (bottom > currentBottom) {
        scrollContainerRef.current.scrollTop = bottom - scrollContainerRef.current.clientHeight + 12;
      }
      return;
    }

    const left = node.offsetLeft;
    const right = left + node.offsetWidth;
    const currentLeft = scrollContainerRef.current.scrollLeft;
    const currentRight = currentLeft + scrollContainerRef.current.clientWidth;

    if (left < currentLeft) {
      scrollContainerRef.current.scrollLeft = left - 12;
    } else if (right > currentRight) {
      scrollContainerRef.current.scrollLeft = right - scrollContainerRef.current.clientWidth + 12;
    }
  }, [isDesktop, selectedIndex]);

  function scroll(direction) {
    if (!scrollContainerRef.current) return;
    const amount = 96;

    if (isDesktop) {
      scrollContainerRef.current.scrollTop += direction === "backward" ? -amount : amount;
    } else {
      scrollContainerRef.current.scrollLeft += direction === "backward" ? -amount : amount;
    }

    setTimeout(checkScroll, 120);
  }

  return (
    <div className="relative">
      {canScrollBackward ? (
        <button
          type="button"
          onClick={() => scroll("backward")}
          className={`absolute z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/94 text-slate-700 shadow-md transition hover:bg-white ${
            isDesktop ? "left-1/2 top-2 -translate-x-1/2" : "left-2 top-1/2 -translate-y-1/2"
          }`}
          aria-label={isDesktop ? "Scroll thumbnails up" : "Scroll thumbnails left"}
        >
          <ChevronLeft className={`h-4 w-4 ${isDesktop ? "-rotate-90" : ""}`} />
        </button>
      ) : null}

      {canScrollForward ? (
        <button
          type="button"
          onClick={() => scroll("forward")}
          className={`absolute z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/94 text-slate-700 shadow-md transition hover:bg-white ${
            isDesktop ? "left-1/2 bottom-2 -translate-x-1/2" : "right-2 top-1/2 -translate-y-1/2"
          }`}
          aria-label={isDesktop ? "Scroll thumbnails down" : "Scroll thumbnails right"}
        >
          <ChevronRight className={`h-4 w-4 ${isDesktop ? "rotate-90" : ""}`} />
        </button>
      ) : null}

      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className={`scrollbar-hide flex gap-3 ${
          isDesktop
            ? "max-h-[38rem] flex-col overflow-y-auto pr-2"
            : "overflow-x-auto pb-2"
        }`}
        style={{ scrollBehavior: "smooth" }}
      >
        {media.map((item, index) => (
          <button
            key={`thumbnail-${item.url}-${index}`}
            data-thumbnail-index={index}
            type="button"
            onClick={() => onSelect(index)}
            className={`group relative h-[88px] w-[88px] flex-none overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 ${
              index === selectedIndex
                ? "scale-[1.02] border-[color:var(--commerce-accent)] ring-2 ring-[color:var(--commerce-accent-soft)] shadow-md"
                : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            }`}
            title={`Image ${index + 1}`}
            aria-label={`Select image ${index + 1}`}
            aria-current={index === selectedIndex}
          >
            {item.type === "video" ? (
              <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs font-semibold uppercase tracking-wide text-white">
                Video
              </div>
            ) : (
              <img
                src={resolveApiAssetUrl(item.url)}
                alt={item.altText || `${productName} thumbnail ${index + 1}`}
                loading="lazy"
                className="h-full w-full object-cover p-1 transition duration-200 group-hover:scale-[1.04]"
                onError={(event) => {
                  event.currentTarget.src = "https://via.placeholder.com/88x88?text=Img";
                }}
              />
            )}
          </button>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
