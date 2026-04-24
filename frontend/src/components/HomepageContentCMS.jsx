import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { getActiveContent, trackView, trackClick } from "../services/contentService";

function resolveMediaSource(item) {
  return item?.image || "";
}

function MediaPreview({ item, className = "", eager = false }) {
  const source = resolveMediaSource(item);

  if (!source) {
    return null;
  }

  if (item?.mediaType === "video") {
    return (
      <video
        src={source}
        autoPlay
        muted
        loop
        playsInline
        preload={eager ? "auto" : "metadata"}
        className={className}
      />
    );
  }

  return (
    <img
      src={source}
      alt={item?.altText || item?.title}
      loading={eager ? "eager" : "lazy"}
      className={className}
    />
  );
}

function HeroSlider({ heroes }) {
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewedIdsRef = useRef(new Set());
  const advanceTimerRef = useRef(null);
  const activeVideoRef = useRef(null);
  const activeHero = heroes[currentIndex] || heroes[0];

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroes.length);
  }, [heroes.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + heroes.length) % heroes.length);
  }, [heroes.length]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || heroes.length <= 1) {
      return undefined;
    }

    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
    }

    if (activeHero?.mediaType === "video") {
      const video = activeVideoRef.current;
      if (!video) {
        return undefined;
      }

      const handleVideoEnded = () => {
        goToNext();
      };

      video.currentTime = 0;
      const playAttempt = video.play();
      if (playAttempt?.catch) {
        playAttempt.catch(() => {});
      }
      video.addEventListener("ended", handleVideoEnded);

      return () => {
        video.removeEventListener("ended", handleVideoEnded);
      };
    }

    advanceTimerRef.current = window.setTimeout(goToNext, 3000);

    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, [activeHero?._id, activeHero?.mediaType, goToNext, heroes.length, prefersReducedMotion]);

  useEffect(() => {
    if (!activeHero?._id || viewedIdsRef.current.has(activeHero._id)) {
      return;
    }

    viewedIdsRef.current.add(activeHero._id);
    trackView(activeHero._id).catch(() => {});
  }, [activeHero?._id]);

  if (!activeHero) {
    return null;
  }

  return (
    <section className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.75)] dark:border-white/10">
      <div className="relative h-[340px] sm:h-[440px] lg:h-[560px]">
        <AnimatePresence mode="wait">
          <Motion.div
            key={activeHero._id}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, x: -36 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {activeHero.mediaType === "video" ? (
              <video
                key={activeHero._id}
                ref={activeVideoRef}
                src={resolveMediaSource(activeHero)}
                autoPlay
                muted
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
              />
            ) : (
              <MediaPreview item={activeHero} eager className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_28%)]" />
            {activeHero.mediaType === "video" ? (
              <div className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
                <Play className="h-3.5 w-3.5 fill-current" />
                Video
              </div>
            ) : null}
          </Motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 z-[1] flex flex-col justify-between p-5 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              Hero banner
            </div>

            <div className="flex items-center gap-2">
              <SliderButton onClick={goToPrevious} label="Previous banner" disabled={heroes.length <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </SliderButton>
              <SliderButton onClick={goToNext} label="Next banner" disabled={heroes.length <= 1}>
                <ChevronRight className="h-4 w-4" />
              </SliderButton>
            </div>
          </div>

          <div className="max-w-3xl">
            <Motion.h2
              initial={false}
              className="translate-y-6 text-2xl font-semibold tracking-[-0.04em] text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:text-4xl lg:text-5xl"
            >
              {activeHero.title}
            </Motion.h2>
            {activeHero.description ? (
              <Motion.p
                initial={false}
                className="mt-4 max-w-2xl translate-y-6 text-sm leading-7 text-slate-200 opacity-0 transition-all duration-300 delay-75 group-hover:translate-y-0 group-hover:opacity-100 sm:text-base lg:text-lg"
              >
                {activeHero.description}
              </Motion.p>
            ) : null}
            <Motion.button
              type="button"
              initial={false}
              onClick={() => {
                trackClick(activeHero._id).catch(() => {});
                window.location.assign(activeHero.ctaUrl || "/shop");
              }}
              className="mt-6 inline-flex translate-y-6 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 opacity-0 transition-all duration-300 delay-100 group-hover:translate-y-0 group-hover:opacity-100 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95"
            >
              {activeHero.ctaText || "Explore"}
            </Motion.button>
          </div>

          <div className="flex items-center gap-2">
            {heroes.map((hero, index) => (
              <button
                key={hero._id}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to banner ${index + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-10 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderButton({ children, onClick, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PromoCards({ promos }) {
  if (promos.length === 0) return null;

  return (
    <section className="py-12">
      <h2 className="mb-8 text-3xl font-bold text-slate-950 dark:text-white">Special Offers</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {promos.map((promo) => (
          <button
            key={promo._id}
            type="button"
            onClick={() => {
              if (!promo?.ctaUrl) return;
              trackClick(promo._id).catch(() => {});
              window.location.assign(promo.ctaUrl);
            }}
            className="group relative h-64 overflow-hidden rounded-2xl border border-white/60 bg-slate-950 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-white/10"
          >
            <MediaPreview item={promo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="text-2xl font-bold text-white">{promo.title}</h3>
              {promo.description ? (
                <p className="mt-2 text-sm text-slate-200">{promo.description}</p>
              ) : null}
              {promo.ctaUrl ? (
                <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                  {promo.ctaText || "Explore"}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CollectionBanner({ collection }) {
  if (!collection) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!collection?.ctaUrl) return;
        trackClick(collection._id).catch(() => {});
        window.location.assign(collection.ctaUrl);
      }}
      className="group relative h-64 w-full overflow-hidden rounded-2xl border border-white/60 bg-slate-950 text-left dark:border-white/10 md:h-80 lg:h-96"
    >
      <MediaPreview item={collection} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12">
        <div className="max-w-md">
          <h2 className="text-4xl font-bold text-white md:text-5xl">{collection.title}</h2>
          {collection.description ? (
            <p className="mt-4 text-lg text-slate-200">{collection.description}</p>
          ) : null}
          {collection.ctaUrl ? (
            <span className="mt-6 inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-950">
              {collection.ctaText || "Discover"}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function HomepageContentCMS({
  showHero = true,
  showPromo = true,
  showCollection = true,
  onContentLoaded,
}) {
  const [content, setContent] = useState({
    hero: [],
    promo: [],
    collection: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await getActiveContent();
        const nextContent = res?.data || { hero: [], promo: [], collection: [] };
        setContent(nextContent);
        onContentLoaded?.(nextContent);
      } catch (err) {
        setError(err?.message || "Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  const heroItems = useMemo(
    () =>
      Array.isArray(content.hero)
        ? content.hero.filter((item, index, items) => index === items.findIndex((candidate) => candidate?._id === item?._id))
        : [],
    [content.hero]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-800">
          {error}
        </div>
      ) : null}

      {showHero && heroItems.length > 0 ? <HeroSlider heroes={heroItems} /> : null}
      {showPromo && content.promo?.length > 0 ? <PromoCards promos={content.promo} /> : null}
      {showCollection && content.collection?.length > 0 ? <CollectionBanner collection={content.collection[0]} /> : null}
    </div>
  );
}

export { HeroSlider, PromoCards, CollectionBanner };
