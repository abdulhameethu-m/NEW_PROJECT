import { useEffect, useRef, useState } from "react";

export function CategoryCarousel({
  categories: categoriesProp,
  onSelect,
  title = "Categories",
  loading = false,
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);
  const categories = Array.isArray(categoriesProp) ? categoriesProp.filter(Boolean) : [];

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
  }, [categories.length, loading]);

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scroll("left");
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scroll("right");
    }
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:py-4">
      <div className="flex items-center justify-between px-3 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>

      {canScrollLeft && !loading ? (
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
      ) : null}

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide mt-3 flex gap-3 overflow-x-auto px-3 pb-1 scroll-smooth snap-x snap-mandatory sm:gap-4 sm:px-4"
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Category carousel"
      >
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="snap-start flex h-[96px] w-[86px] shrink-0 animate-pulse rounded-xl bg-slate-100 sm:w-[96px] dark:bg-slate-800"
              />
            ))
          : categories.map((category) => {
              const Icon = category.IconComponent;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect?.(category)}
                  className={`snap-start flex h-[96px] w-[86px] shrink-0 translate-y-0 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br px-2.5 py-3 text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-[96px] sm:px-3 ${category.color}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/18">
                    <CategoryIcon Icon={Icon} />
                  </span>
                  <span className="line-clamp-2 text-center text-[11px] font-medium leading-4 sm:text-xs">
                    {category.name}
                  </span>
                </button>
              );
            })}

        {!loading && categories.length === 0 ? (
          <div className="flex min-h-[96px] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No categories available
          </div>
        ) : null}
      </div>

      {canScrollRight && !loading ? (
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
      ) : null}
    </div>
  );
}

function CategoryIcon({ Icon }) {
  if (!Icon) {
    return null;
  }

  const sample = <Icon className="h-5 w-5" />;
  if (sample?.type === "span") {
    return sample;
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      {sample}
    </svg>
  );
}
