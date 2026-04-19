import { useEffect, useMemo, useRef, useState } from "react";

export function CategoryCarousel({
  categories: categoriesProp,
  onSelect,
  title = "Categories",
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);

  const categories = useMemo(() => {
    const fallback = [
      { id: 1, name: "Electronics", icon: "ðŸ“±", color: "from-blue-400 to-blue-600" },
      { id: 2, name: "Fashion", icon: "ðŸ‘”", color: "from-pink-400 to-pink-600" },
      { id: 3, name: "Home", icon: "ðŸ ", color: "from-yellow-400 to-yellow-600" },
      { id: 4, name: "Books", icon: "ðŸ“š", color: "from-purple-400 to-purple-600" },
      { id: 5, name: "Sports", icon: "âš½", color: "from-green-400 to-green-600" },
      { id: 6, name: "Toys", icon: "ðŸŽ®", color: "from-red-400 to-red-600" },
      { id: 7, name: "Beauty", icon: "ðŸ’„", color: "from-indigo-400 to-indigo-600" },
      { id: 8, name: "Grocery", icon: "ðŸ›’", color: "from-orange-400 to-orange-600" },
    ];
    const normalized = Array.isArray(categoriesProp) ? categoriesProp.filter(Boolean) : [];
    return normalized.length ? normalized : fallback;
  }, [categoriesProp]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.max(240, Math.floor(scrollContainerRef.current.clientWidth * 0.75));
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const raf = window.requestAnimationFrame(handleScroll);
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      window.addEventListener("resize", handleScroll);
      return () => {
        window.cancelAnimationFrame(raf);
        container.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
      };
    }
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scroll("left");
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scroll("right");
    }
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:py-4">
      <div className="flex items-center justify-between px-3 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          type="button"
          aria-label="Scroll categories left"
          className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/95 p-2 shadow-lg transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800/95 dark:hover:bg-slate-700 sm:inline-flex"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12.7 15.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L8.41 10l4.29 4.3a1 1 0 0 1 0 1.4Z" />
          </svg>
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide mt-3 flex gap-3 overflow-x-auto px-3 pb-1 scroll-smooth snap-x snap-mandatory sm:gap-4 sm:px-4"
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Category carousel"
      >
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect?.(category)}
            className={`snap-start flex w-[86px] shrink-0 flex-col items-center gap-2 rounded-2xl bg-gradient-to-br px-2.5 py-3 text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-[96px] sm:px-3 ${category.color}`}
          >
            <span className="text-xl leading-none sm:text-2xl">{category.icon}</span>
            <span className="line-clamp-2 text-center text-[11px] font-medium leading-4 sm:text-xs">
              {category.name}
            </span>
          </button>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          type="button"
          aria-label="Scroll categories right"
          className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/95 p-2 shadow-lg transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800/95 dark:hover:bg-slate-700 sm:inline-flex"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L11.59 10 7.3 5.7a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
