import { Link } from "react-router-dom";

function SocialIcon({ name, className }) {
  const common = "h-4.5 w-4.5";
  const cls = className ? `${common} ${className}` : common;

  switch (name) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.5 21v-7h2.35l.35-2.75H13.5V9.6c0-.8.22-1.35 1.38-1.35h1.47V5.76c-.25-.03-1.14-.1-2.18-.1-2.16 0-3.64 1.32-3.64 3.75v1.84H8.2V14h2.33v7H13.5z"
          />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path
            fill="currentColor"
            d="M18.6 3H21l-5.23 6 6.15 12H16.9l-3.94-7.62L6.7 21H4.3l5.6-6.6L4 3h5.1l3.56 6.9L18.6 3zm-.86 16h1.33L8.93 4.92H7.5L17.74 19z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path
            fill="currentColor"
            d="M7.5 2.5h9A5 5 0 0 1 21.5 7.5v9a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5zm9 2h-9a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3z"
          />
          <path
            fill="currentColor"
            d="M12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z"
          />
          <path fill="currentColor" d="M17.3 6.7a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.6 8.1a3 3 0 0 0-2.1-2.1C17.7 5.5 12 5.5 12 5.5s-5.7 0-7.5.5A3 3 0 0 0 2.4 8.1 31 31 0 0 0 2 12a31 31 0 0 0 .4 3.9 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-3.9zM10.2 15.2V8.8L15.8 12l-5.6 3.2z"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path
            fill="currentColor"
            d="M6.3 6.8a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM4.8 20.8h3V9h-3v11.8zM10.1 9h2.9v1.6h.04c.4-.77 1.4-1.58 2.88-1.58 3.07 0 3.64 2.02 3.64 4.65v7.07h-3v-6.26c0-1.49-.03-3.4-2.07-3.4-2.07 0-2.39 1.62-2.39 3.29v6.37h-3V9z"
          />
        </svg>
      );
    default:
      return null;
  }
}

function SocialLink({ href, label, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/15"
      aria-label={label}
      title={label}
    >
      <SocialIcon name={icon} />
    </a>
  );
}

function GooglePlayIcon({ className }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path
        fill="#00F076"
        d="M51.2 39.8c-7.3 8.2-11.2 19-11.2 32.1v368.2c0 13.1 3.9 23.9 11.2 32.1l.9.9 206.4-206.4v-17.9L52.1 38.9l-.9.9z"
      />
      <path
        fill="#FFC400"
        d="M345.6 354.6 258.5 267.5v-23l87.1-87.1 5 .8 102.9 58.4c29.4 16.7 29.4 43.9 0 60.6l-102.9 58.4-5 .8z"
      />
      <path
        fill="#FF3D57"
        d="M340.6 353.8 257.6 270.8 51.2 477.2c11.5 12.9 30.7 15.8 52.3 3.5l237.1-126.9z"
      />
      <path
        fill="#4AA3FF"
        d="M340.6 158.2 103.5 31.3C81.9 19 62.7 22 51.2 34.9l206.4 206.4 83-83z"
      />
    </svg>
  );
}

function AppleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7 13.2c0-1.6.9-2.8 2.3-3.5-.8-1.2-2.1-1.9-3.5-2-.7-.1-1.6.2-2.3.5-.6.3-1 .5-1.5.5s-.9-.2-1.5-.5c-.6-.3-1.3-.6-2.1-.6-1.6 0-3.2 1-4 2.6-1 2-.3 5.1.8 6.7.6.9 1.4 1.9 2.4 1.9.7 0 1.2-.2 1.7-.4.6-.2 1.1-.4 1.9-.4s1.2.2 1.8.4c.6.2 1.1.4 1.8.4 1.1 0 1.8-.9 2.4-1.8.4-.6.7-1.3.9-2-.9-.4-2.1-1.4-2.1-3.8z"
      />
      <path
        fill="currentColor"
        d="M14.8 4.1c.5-.7.9-1.6.8-2.6-.9.1-1.8.6-2.4 1.3-.5.6-1 1.6-.8 2.5 1 .1 1.9-.5 2.4-1.2z"
      />
    </svg>
  );
}

function AppBadge({ href, kind }) {
  const isGoogle = kind === "google";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-3 rounded-xl bg-black px-3 py-2 text-white ring-1 ring-white/10 hover:bg-black/90"
      aria-label={isGoogle ? "Get it on Google Play" : "Download on the App Store"}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
        {isGoogle ? (
          <GooglePlayIcon className="h-6 w-6" />
        ) : (
          <AppleIcon className="h-6 w-6" />
        )}
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/70">
          {isGoogle ? "Get it on" : "Available on the"}
        </span>
        <span className="block text-sm font-semibold">
          {isGoogle ? "Google Play" : "App Store"}
        </span>
      </span>
    </a>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-lg font-semibold tracking-tight text-white">
              UChooseMe
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              UChooseMe is a trusted platform to connect users with the right
              vendors. We focus on quality, transparency, and a smooth experience
              across every step.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mobile apps
              </div>
              <div className="flex gap-2">
                <AppBadge href="https://play.google.com/store/games?device=windows" kind="google" />
                <AppBadge href="https://www.apple.com/app-store/" kind="apple" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quick links
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link className="transition hover:text-white hover:underline" to="/">
                  Home
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/dashboard">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/role">
                  Get started
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/login">
                  Login
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/terms-and-conditions">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/return-policy">
                  Return Policy
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white hover:underline" to="/shipping-policy">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Contacts
            </div>
            <dl className="mt-4 space-y-2 text-sm text-slate-300">
              <div>
                <dt className="sr-only">Address</dt>
                <dd>Coimbatore, Tamil Nadu, India</dd>
              </div>
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>
                  <a className="hover:text-white hover:underline" href="tel:+910000000000">
                    +91 96294 72277
                  </a>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a
                    className="hover:text-white hover:underline"
                    href="mailto:support@uchooseme.com"
                  >
                    support@uchooseme.com
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              My account
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link className="hover:text-white hover:underline" to="/login">
                  Login
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:underline" to="/register">
                  Register
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:underline" to="/dashboard">
                  Track status
                </Link>
              </li>
            </ul>

            <div className="mt-7">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Follow us
              </div>
              <div className="mt-3 flex gap-2">
                <SocialLink href="#" label="Facebook" icon="facebook" />
                <SocialLink href="#" label="X" icon="x" />
                <SocialLink href="#" label="Instagram" icon="instagram" />
                <SocialLink href="#" label="YouTube" icon="youtube" />
                <SocialLink href="#" label="LinkedIn" icon="linkedin" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-400">
          © {year} UChooseMe. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

