import { motion as Motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function PromoBanner({
  title,
  description,
  eyebrow,
  image,
  mediaType = "image",
  ctaText = "Explore",
  href = "/shop",
  align = "left",
  onClick,
}) {
  const handleClick = () => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }

    if (href) {
      window.location.assign(href);
    }
  };

  return (
    <Motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 shadow-[0_30px_100px_-45px_rgba(15,23,42,0.55)]"
    >
      {mediaType === "video" ? (
        <video
          src={image}
          autoPlay
          muted
          loop
          playsInline
          className="h-72 w-full object-cover transition duration-700 group-hover:scale-110 sm:h-80"
        />
      ) : (
        <img
          src={image}
          alt={title}
          className="h-72 w-full object-cover transition duration-700 group-hover:scale-110 sm:h-80"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/55 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_26%)]" />

      <div className={`absolute inset-0 flex flex-col justify-end p-6 sm:p-8 ${align === "right" ? "items-end text-right" : ""}`}>
        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-orange-200/90 backdrop-blur">
          {eyebrow}
        </span>
        <h3 className="mt-4 max-w-lg text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 max-w-md translate-y-5 text-sm leading-7 text-white/70 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {description}
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          {ctaText}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Motion.article>
  );
}
