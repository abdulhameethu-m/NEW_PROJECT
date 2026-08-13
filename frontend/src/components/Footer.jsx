import { ArrowUpRight, Send } from "lucide-react";
import { useBranding } from "../context/BrandingContext";

const fallbackFooter = {
  enabled: true,
  theme: "dark",
  backgroundColor: "#0f172a",
  textColor: "#e2e8f0",
  linkColor: "#60a5fa",
  sections: [
    {
      title: "About",
      description: "Modern marketplace identity, brand story, and press updates.",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Our Story", href: "/our-story" },
        { label: "Careers", href: "/careers" },
        { label: "Press", href: "/press" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      title: "Customer Service",
      description: "Support for orders, returns, shipping, and refunds.",
      links: [
        { label: "Help Center", href: "/help-center" },
        { label: "Track Order", href: "/track-order" },
        { label: "Returns", href: "/returns" },
        { label: "Refund Policy", href: "/refund-policy" },
        { label: "Shipping Policy", href: "/shipping-policy" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
    {
      title: "Shop",
      description: "Browse categories, brands, and the latest deals.",
      links: [
        { label: "Categories", href: "/categories" },
        { label: "Brands", href: "/brands" },
        { label: "Deals", href: "/deals" },
        { label: "New Arrivals", href: "/new-arrivals" },
        { label: "Best Sellers", href: "/best-sellers" },
      ],
    },
    {
      title: "Vendors",
      description: "Seller resources, policies, and partner onboarding.",
      links: [
        { label: "Become a Seller", href: "/become-a-seller" },
        { label: "Seller Dashboard", href: "/seller-dashboard" },
        { label: "Vendor Directory", href: "/vendor-directory" },
        { label: "Seller Policies", href: "/seller-policies" },
      ],
    },
    {
      title: "Legal",
      description: "Terms, privacy, cookie, and disclaimer policies.",
      links: [
        { label: "Terms & Conditions", href: "/terms-and-conditions" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Cookies Policy", href: "/cookies-policy" },
        { label: "Disclaimer", href: "/disclaimer" },
      ],
    },
  ],
  socialLinks: [
    { label: "Facebook", href: "https://facebook.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Twitter/X", href: "https://twitter.com" },
  ],
  legalLinks: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
    { label: "Cookies Policy", href: "/cookies-policy" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
  paymentIcons: ["Visa", "MasterCard", "UPI", "PayPal", "Stripe"],
};

function isExternalLink(href = "") {
  return /^https?:\/\//i.test(href);
}

export function Footer() {
  const year = new Date().getFullYear();
  const { branding } = useBranding();
  const footer = branding?.footer || fallbackFooter;
  if (footer.enabled === false) return null;

  const sections = footer.sections?.filter((section) => section?.title || section?.description || (section.links || []).some((link) => link?.label || link?.href)) || fallbackFooter.sections;
  const socialLinks = footer.socialLinks?.filter((link) => link?.label || link?.href) || fallbackFooter.socialLinks;
  const legalLinks = footer.legalLinks?.filter((link) => link?.label || link?.href) || fallbackFooter.legalLinks;
  const paymentIcons = footer.paymentIcons || fallbackFooter.paymentIcons;
  const companyName = branding?.companyName || "UChooseMe";
  const supportEmail = branding?.supportEmail || "support@uchooseme.com";
  const supportPhone = branding?.supportPhone || "";

  // ─── All colours driven by CSS variables (set by ThemeContext) ──────────────
  // This ensures every change made in the Dynamic Theme editor is reflected live
  // without any hardcoded Tailwind colour override getting in the way.

  const footerStyle = {
    background: "var(--theme-footer-background)",
    color: "var(--theme-footer-text)",
    borderTopColor: "var(--theme-footer-border)",
  };

  const headingStyle = {
    color: "var(--theme-footer-heading)",
  };

  const mutedTextStyle = {
    color: "var(--theme-footer-text)",
    opacity: 0.75,
  };

  const linkStyle = {
    color: "var(--theme-footer-link)",
  };

  const cardStyle = {
    background: "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 8%, transparent), color-mix(in srgb, var(--theme-accent) 4%, transparent))",
    borderColor: "var(--theme-footer-border)",
  };

  const socialChipStyle = {
    color: "var(--theme-footer-link)",
    borderColor: "var(--theme-footer-border)",
    backgroundColor: "rgba(255,255,255,0.06)",
  };

  const legalChipStyle = {
    color: "var(--theme-footer-link)",
    borderColor: "var(--theme-footer-border)",
    backgroundColor: "rgba(255,255,255,0.06)",
  };

  const newsletterInputStyle = {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "var(--theme-footer-border)",
    color: "var(--theme-footer-text)",
  };

  const newsletterButtonStyle = {
    background: "var(--theme-newsletter-button)",
    color: "var(--theme-newsletter-text, #ffffff)",
  };

  const paymentCardStyle = {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderColor: "var(--theme-footer-border)",
    color: "var(--theme-footer-text)",
  };

  const paymentBadgeStyle = {
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "var(--theme-footer-heading)",
  };

  const connectCardStyle = {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderColor: "var(--theme-footer-border)",
    color: "var(--theme-footer-text)",
  };

  return (
    <footer
      className="relative mt-12 overflow-hidden border-t"
      style={footerStyle}
    >
      {/* Subtle dynamic ambient glow using Theme Primary & Accent colors */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at top left, color-mix(in srgb, var(--theme-primary) 12%, transparent), transparent 28%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--theme-accent) 12%, transparent), transparent 24%)"
        }}
      />

      <div className="relative w-full px-3 py-12 sm:px-4 lg:px-8 lg:py-16">
        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div
          className="grid gap-8 rounded-[2rem] border p-6 backdrop-blur-xl lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:p-8"
          style={cardStyle}
        >
          {/* Left — brand pitch */}
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ borderColor: "var(--theme-footer-border)", color: "var(--theme-footer-link)" }}
            >
              Premium commerce
            </span>
            <h2
              className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.05em] lg:text-4xl"
              style={headingStyle}
            >
              Built for discovery, trusted by modern shoppers, and shaped for smooth conversion.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 lg:text-base" style={mutedTextStyle}>
              A premium storefront experience with polished motion, thoughtful responsiveness, and scalable components that support growth.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{ background: "var(--theme-footer-heading)", color: "var(--theme-footer-background)" }}
              >
                Contact support
                <ArrowUpRight className="h-4 w-4" />
              </a>
              {supportPhone ? (
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm"
                  style={{ borderColor: "var(--theme-footer-border)", color: "var(--theme-footer-text)" }}
                >
                  <Send className="h-4 w-4" style={{ color: "var(--theme-footer-link)" }} />
                  {supportPhone}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right — link columns */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sections.map((group, index) => (
              <div key={index}>
                <h3
                  className="text-sm font-semibold uppercase tracking-[0.24em]"
                  style={headingStyle}
                >
                  {group.title || "Information"}
                </h3>
                <p className="mt-2 text-sm leading-6" style={mutedTextStyle}>
                  {group.description}
                </p>
                <div className="mt-4 space-y-3">
                  {(group.links || [])
                    .filter((link) => link?.label || link?.href)
                    .map((link, linkIndex) => (
                      <a
                        key={`${index}-${linkIndex}`}
                        href={link.href || "#"}
                        target={isExternalLink(link.href) ? "_blank" : undefined}
                        rel={isExternalLink(link.href) ? "noreferrer" : undefined}
                        style={linkStyle}
                        className="block text-sm transition hover:underline"
                      >
                        <span>{link.label || link.href}</span>
                      </a>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Social + Newsletter row ─────────────────────────────────── */}
          <div
            className="mt-10 rounded-[1.75rem] border p-6"
            style={cardStyle}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              {/* Social */}
              <div>
                <h3
                  className="text-sm font-semibold uppercase tracking-[0.24em]"
                  style={headingStyle}
                >
                  Connect with us
                </h3>
                <p className="mt-2 text-sm leading-6" style={mutedTextStyle}>
                  Follow our social channels for updates, offers, and news.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href || "#"}
                      target={isExternalLink(link.href) ? "_blank" : undefined}
                      rel={isExternalLink(link.href) ? "noreferrer" : undefined}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition hover:opacity-80"
                      style={socialChipStyle}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div>
                <h3
                  className="text-sm font-semibold uppercase tracking-[0.24em]"
                  style={headingStyle}
                >
                  Newsletter
                </h3>
                <p className="mt-2 text-sm leading-6" style={mutedTextStyle}>
                  Enter your email to receive product updates and offers.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    aria-label="Email address"
                    placeholder="Enter your email"
                    className="min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/10"
                    style={newsletterInputStyle}
                  />
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                    style={newsletterButtonStyle}
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-[1.75rem] border p-6"
          style={cardStyle}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center">
            <div>
              <div className="text-sm" style={{ color: "var(--theme-footer-text)" }}>
                {footer.copyrightText || `© ${year} ${companyName}. All Rights Reserved.`}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {(legalLinks || []).map((link, index) => (
                  <a
                    key={index}
                    href={link.href || "#"}
                    target={isExternalLink(link.href) ? "_blank" : undefined}
                    rel={isExternalLink(link.href) ? "noreferrer" : undefined}
                    className="rounded-full border px-3 py-2 transition hover:opacity-80"
                    style={legalChipStyle}
                  >
                    {link.label || link.href}
                  </a>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Payment methods */}
              <div className="rounded-3xl border p-4 text-sm" style={paymentCardStyle}>
                <div className="font-semibold" style={headingStyle}>Payment Methods</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {paymentIcons.map((icon, index) => (
                    <span
                      key={index}
                      className="rounded-full px-3 py-1"
                      style={paymentBadgeStyle}
                    >
                      {icon}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="rounded-3xl border p-4 text-sm" style={connectCardStyle}>
                <div className="font-semibold" style={headingStyle}>Connect</div>
                <div className="mt-3 space-y-2 text-xs" style={mutedTextStyle}>
                  <div>{supportEmail}</div>
                  {supportPhone ? <div>{supportPhone}</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
