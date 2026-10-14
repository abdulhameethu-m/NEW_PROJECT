import { logger } from "../services/logger/logger.js";
import { memo, useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import * as subcategoryService from "../services/subcategoryService";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { usePresentedCategories } from "../utils/categoryPresentation";

/**
 * CategoryNavigation Component
 * Premium marketplace-style horizontal category navigation navbar.
 * Matches Image 2 UI with icons above text, blue background and underline for selected items.
 */
function CategoryNavigationComponent({ categories = [], onSelect, selectedCategory, isMinimized, onToggleMinimize }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const [subcategories, setSubcategories] = useState({});
  const [loadingSubcategories, setLoadingSubcategories] = useState(null);
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);
  const dropdownContainerRef = useRef(null);
  const [localMinimized, setLocalMinimized] = useState(false);

  const minimized = isMinimized !== undefined ? isMinimized : localMinimized;
  const toggleMinimized = onToggleMinimize || (() => setLocalMinimized(!localMinimized));

  const presentedCategories = usePresentedCategories(categories);
  const categoryList = Array.isArray(presentedCategories) ? presentedCategories : [];

  // Close dropdown on route change
  useEffect(() => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setHoveredCategoryId(null);
  }, [location.pathname, location.search]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
        setHoveredCategoryId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setHoveredCategoryId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close dropdown on page scroll
  useEffect(() => {
    const handleScroll = () => {
      if (hoveredCategoryId) setHoveredCategoryId(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hoveredCategoryId]);

  // Check scroll position for arrow visibility
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categoryList]);

  // Smooth horizontal scroll
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(checkScroll, 400);
    }
  };

  const handleCategorySelect = (category) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setHoveredCategoryId(null);
    onSelect?.(category);
    setTimeout(checkScroll, 50);
  };

  // Lazy load subcategories on hover
  const handleCategoryHover = async (categoryId) => {
    setHoveredCategoryId(categoryId);

    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }

    if (subcategories[categoryId]) return;

    try {
      setLoadingSubcategories(categoryId);
      const response = await subcategoryService.getSubcategoriesByCategory(categoryId);
      setSubcategories((prev) => ({
        ...prev,
        [categoryId]: response.data || [],
      }));
    } catch (error) {
      logger.error("Failed to load subcategories:", { error: error });
    } finally {
      setLoadingSubcategories(null);
    }
  };

  const handleHoverLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setHoveredCategoryId(null);
    }, 200);
  };

  const hoveredCategory = categoryList.find(c => c.id === hoveredCategoryId || c._id === hoveredCategoryId);

  if (categoryList.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop Category Navigation */}
      <nav
        className="hidden lg:flex sticky top-[65px] z-30 border-y-0 bg-white/95 backdrop-blur-md will-change-none dark:bg-slate-950/95 py-1"
      >
        <div className="w-full px-4 lg:px-6 h-full flex items-center relative">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll("left")}
              className="hidden lg:flex absolute left-0 z-10 h-full w-12 items-center justify-center bg-gradient-to-r from-white to-transparent dark:from-slate-950 hover:from-slate-50 dark:hover:from-slate-900 transition-colors duration-200 flex-shrink-0"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}

          {/* Categories Container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex-1 overflow-x-auto scrollbar-hide flex items-center"
            style={{ scrollBehavior: "smooth", msOverflowStyle: "none" }}
          >
            <div className="flex items-start gap-1.5 sm:gap-2 px-0 h-full whitespace-nowrap">
              {categoryList.map((category) => {
                const isSelected = selectedCategory?.id === category.id || selectedCategory?.slug === category.slug;
                const IconComponent = category.IconComponent;

                return (
                  <div
                    key={category.id}
                    onMouseEnter={() => handleCategoryHover(category.id)}
                    onMouseLeave={handleHoverLeave}
                    className="relative group"
                  >
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className="flex flex-row items-center justify-start gap-1.5 px-2 py-0.5 h-full transition-all duration-200 relative group/btn focus:outline-none"
                    >
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center overflow-hidden transition-all duration-200 flex-shrink-0 ${isSelected
                        ? "bg-[#e0f0ff] dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-transparent text-slate-800 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}>
                        {IconComponent ? (
                          <div className="h-4 w-4">
                            <IconComponent />
                          </div>
                        ) : (
                          <span className="text-base font-bold">{String(category.name).charAt(0)}</span>
                        )}
                      </div>

                      <span className={`text-[13px] sm:text-sm whitespace-nowrap leading-tight tracking-tight ${isSelected
                        ? "font-bold text-slate-900 dark:text-white"
                        : "font-medium text-slate-700 dark:text-slate-300 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white"
                        }`}>
                        {category.name}
                      </span>

                      {isSelected && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-full" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll("right")}
              className="hidden lg:flex absolute right-0 z-10 h-full w-12 items-center justify-center bg-gradient-to-l from-white to-transparent dark:from-slate-950 hover:from-slate-50 dark:hover:from-slate-900 transition-colors duration-200 flex-shrink-0"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>

        {/* Mega Menu Dropdown */}
        {hoveredCategoryId && (
          <div
            ref={dropdownContainerRef}
            className="absolute left-0 w-full flex justify-center z-50 px-4 pt-1"
            style={{ top: "100%" }}
            onMouseEnter={() => {
              if (dropdownTimeoutRef.current) {
                clearTimeout(dropdownTimeoutRef.current);
              }
            }}
            onMouseLeave={handleHoverLeave}
          >
            <div
              className={`w-full ${
                hoveredCategory?.banners?.length > 0
                  ? "max-w-[900px]"
                  : (subcategories[hoveredCategoryId] || []).length > 8
                  ? "max-w-2xl"
                  : (subcategories[hoveredCategoryId] || []).length > 4
                  ? "max-w-lg"
                  : "max-w-md"
              } bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in duration-200 overflow-hidden`}
            >
              <div className="w-full px-6 py-5 flex gap-8">
                {loadingSubcategories === hoveredCategoryId ? (
                  <div className="w-full py-8 text-center text-sm text-slate-500">Loading subcategories...</div>
                ) : (subcategories[hoveredCategoryId] || []).length > 0 ? (
                  <>
                    <div className="flex-1">
                      {hoveredCategory?.name && (
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {hoveredCategory.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              handleCategorySelect(hoveredCategory);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            View all →
                          </button>
                        </div>
                      )}
                      <div className={`grid gap-2 ${
                        (subcategories[hoveredCategoryId] || []).length > 6
                          ? "grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-2"
                      }`}>
                        {(subcategories[hoveredCategoryId] || []).map((sub) => (
                          <button
                            key={sub._id || sub.id}
                            type="button"
                            onClick={() => {
                              onSelect?.(sub);
                              setHoveredCategoryId(null);
                            }}
                            className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-blue-400 transition-colors text-left"
                          >
                            <span>{sub.name}</span>
                            <span className="text-slate-300 group-hover:text-blue-500 dark:text-slate-600 transition-colors">›</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {hoveredCategory?.banners?.length > 0 && (
                      <div className="hidden lg:flex w-[260px] shrink-0 gap-4 border-l border-slate-200 dark:border-slate-800 pl-6">
                        {hoveredCategory.banners.map((banner, idx) => {
                          const BannerWrapper = banner.link ? Link : 'div';
                          const wrapperProps = banner.link ? { to: banner.link } : {};
                          return (
                            <BannerWrapper key={idx} {...wrapperProps} className="flex-1 flex flex-col group/promo cursor-pointer">
                              <div className="aspect-square w-full rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative shadow-sm border border-slate-100 dark:border-slate-700">
                                <img loading="lazy" decoding="async" src={resolveApiAssetUrl(banner.image)} className="w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-700" alt={banner.title || "Promo"} />
                                <div className="absolute inset-0 bg-black/5 group-hover/promo:bg-transparent transition-colors duration-500" />
                              </div>
                              {banner.title && <div className="font-bold text-slate-900 dark:text-white text-center text-sm">{banner.title}</div>}
                              <div className="text-sm font-medium text-slate-500 group-hover/promo:text-blue-600 text-center mt-1 transition-colors">See more</div>
                            </BannerWrapper>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full py-8 text-center text-sm text-slate-500">No subcategories available</div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Horizontal Category Scroller */}
      <div className="block lg:hidden sticky top-[49px] z-30 bg-white/95 backdrop-blur-md will-change-none dark:bg-slate-950/95 border-b border-slate-100 dark:border-white/5 py-1.5 transition-all">
        <div className="overflow-x-auto scrollbar-hide flex items-center gap-1.5 px-3 scroll-smooth">
          {categoryList.map((category) => {
            const isSelected = selectedCategory?.id === category.id || selectedCategory?.slug === category.slug;
            const IconComponent = category.IconComponent;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0 ${
                  isSelected
                    ? "bg-[#1D4ED8] text-white shadow-xs"
                    : "bg-slate-100/90 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {IconComponent ? (
                  <span className={`inline-flex items-center justify-center h-3.5 w-3.5 flex-shrink-0 ${
                    isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"
                  }`}>
                    <IconComponent />
                  </span>
                ) : null}
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-in {
          animation: fadeInScale 200ms ease-out forwards;
        }

        .fade-in {
          animation: fadeInScale 200ms ease-out;
        }
      `}</style>
    </>
  );
}

export const CategoryNavigation = memo(CategoryNavigationComponent);
