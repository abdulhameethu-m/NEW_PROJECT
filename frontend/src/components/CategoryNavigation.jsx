import { logger } from "../services/logger/logger.js";
import { memo, useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
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
  const scrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);
  const [localMinimized, setLocalMinimized] = useState(false);
  
  const minimized = isMinimized !== undefined ? isMinimized : localMinimized;
  const toggleMinimized = onToggleMinimize || (() => setLocalMinimized(!localMinimized));

  const presentedCategories = usePresentedCategories(categories);
  const categoryList = Array.isArray(presentedCategories) ? presentedCategories : [];

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
    }, 150);
  };

  const hoveredCategory = categoryList.find(c => c.id === hoveredCategoryId || c._id === hoveredCategoryId);

  if (categoryList.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop Category Navigation */}
      <nav
        className="hidden lg:flex sticky top-16 z-30 border-b border-slate-200/40 bg-white/95 backdrop-blur-md will-change-none dark:border-slate-800/50 dark:bg-slate-950/95 py-3"
      >
        <div className="w-full px-2 lg:px-4 h-full flex items-center relative">
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
            <div className="flex items-start gap-2 sm:gap-4 px-2 h-full whitespace-nowrap lg:px-12">
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
                      className="flex flex-row items-center justify-start gap-2 px-3 py-1.5 h-full transition-all duration-200 relative group/btn focus:outline-none"
                    >
                      <div className={`h-[36px] w-[36px] rounded-[12px] flex items-center justify-center overflow-hidden transition-all duration-200 flex-shrink-0 ${isSelected
                          ? "bg-[#e0f0ff] dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-transparent text-slate-800 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}>
                        {IconComponent ? (
                          <div className="w-5 h-5">
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
            className="absolute left-0 w-full flex justify-center z-40 px-4 pointer-events-none"
            style={{ top: "100%" }}
            onMouseEnter={() => {
              if (dropdownTimeoutRef.current) {
                clearTimeout(dropdownTimeoutRef.current);
              }
            }}
            onMouseLeave={handleHoverLeave}
          >
            <div
              className="w-full max-w-[900px] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in duration-200 mt-2 overflow-hidden pointer-events-auto"
            >
              <div className="w-full px-6 py-6 flex gap-8">
                {loadingSubcategories === hoveredCategoryId ? (
                  <div className="w-full py-10 text-center text-slate-500">Loading subcategories...</div>
                ) : (subcategories[hoveredCategoryId] || []).length > 0 ? (
                  <>
                    <div className="flex-1">
                      {hoveredCategory?.name && (
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
                          {hoveredCategory.name}
                        </h3>
                      )}
                      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8">
                        {(subcategories[hoveredCategoryId] || []).map((sub) => (
                          <button
                            key={sub._id || sub.id}
                            type="button"
                            onClick={() => {
                              onSelect?.(sub);
                              setHoveredCategoryId(null);
                            }}
                            className="block w-full text-left py-1.5 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 break-inside-avoid transition-colors"
                          >
                            {sub.name}
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
                                <img src={resolveApiAssetUrl(banner.image)} className="w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-700" alt={banner.title || "Promo"} />
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
                  <div className="w-full py-20 text-center text-slate-500">No subcategories available</div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Horizontal Category Scroller */}
      <div className={`block lg:hidden sticky z-[31] bg-white/95 backdrop-blur-md will-change-none dark:bg-slate-950/95 border-b border-slate-100 dark:border-white/5 transition-all duration-300 ${minimized ? 'top-[57px] py-0.5' : 'top-[144px] py-1.5'}`}>
        <div className="flex items-center relative">
          <div className="overflow-x-auto scrollbar-hide flex-1 flex gap-2 sm:gap-3 px-3 scroll-smooth">
            {categoryList.map((category) => {
              const isSelected = selectedCategory?.id === category.id || selectedCategory?.slug === category.slug;
              const IconComponent = category.IconComponent;
              
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`flex items-center justify-start flex-shrink-0 group focus:outline-none relative transition-all duration-300 ${
                    minimized
                      ? "flex-row gap-1.5 px-2 py-1 min-w-auto"
                      : "flex-col gap-0 min-w-[60px] pb-1.5"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center overflow-hidden transition-all duration-300 flex-shrink-0 ${
                      minimized ? "h-7 w-7 rounded-[8px]" : "h-12 w-12 rounded-[14px]"
                    } ${
                      isSelected
                        ? "bg-[#e0f0ff] dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-transparent text-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {IconComponent ? (
                      <div className={`transition-all duration-300 ${minimized ? 'w-4 h-4' : 'w-6 h-6'}`}>
                        <IconComponent />
                      </div>
                    ) : (
                      <span className={`font-bold transition-all duration-300 ${minimized ? 'text-sm' : 'text-lg'}`}>
                        {String(category.name).charAt(0)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-center leading-tight tracking-tight transition-all duration-300 ${
                      minimized ? "text-[12px] whitespace-nowrap" : "text-[11px] truncate w-full pt-0.5"
                    } ${
                      isSelected
                        ? "font-bold text-slate-900 dark:text-white"
                        : "font-medium text-slate-700 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    {category.name}
                  </span>
                  
                  {isSelected && (
                    <div className={`absolute bottom-0 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300 ${
                      minimized ? "left-1 right-1 h-[2px]" : "left-1/2 -translate-x-1/2 w-6 h-[2px]"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="pr-3 pl-1 flex items-center justify-center h-full">
            <button 
              onClick={toggleMinimized} 
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
              aria-label={minimized ? "Maximize categories" : "Minimize categories"}
            >
              {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
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
