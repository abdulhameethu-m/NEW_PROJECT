import { Settings, RefreshCw, Mail, Phone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function MaintenancePage({ config, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const {
    title = "The Platform is Under Maintenance",
    subtitle = "We're making improvements to serve you better.",
    description = "Our engineers are currently deploying a system upgrade. We appreciate your patience and will be back online shortly.",
    estimatedCompletion,
    logo,
    supportEmail,
    supportPhone,
    animation = "Construction", // "Construction", "Gears", "Rocket"
  } = config || {};

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 font-sans text-slate-200">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-12 text-center">
        {logo ? (
          <img loading="lazy" decoding="async" src={logo} alt="Company Logo" className="mx-auto mb-8 h-16 w-auto object-contain drop-shadow-md" />
        ) : (
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 shadow-xl shadow-indigo-900/20 border border-slate-800">
            {animation === "Gears" ? (
              <Settings className="h-10 w-10 animate-spin-slow text-indigo-400" />
            ) : (
              <div className="relative">
                 <Settings className="h-12 w-12 animate-spin text-indigo-500" style={{ animationDuration: '4s' }} />
                 <Settings className="absolute -bottom-2 -right-2 h-8 w-8 animate-spin text-violet-400" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
              </div>
            )}
          </div>
        )}

        <h1 className="mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          {title}
        </h1>
        
        <p className="mb-8 text-lg text-slate-400 sm:text-xl font-medium">
          {subtitle}
        </p>

        {description && (
          <div className="mx-auto mb-10 max-w-lg rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 backdrop-blur-xl">
            <p className="text-sm leading-relaxed text-slate-300">
              {description}
            </p>
            {estimatedCompletion && (
              <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-800 pt-4">
                <span className="text-xs uppercase tracking-wider text-slate-500">Estimated Completion:</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {new Date(estimatedCompletion).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-900/40 active:scale-95 disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
            {refreshing ? "Checking..." : "Refresh Page"}
          </button>
          
          <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Staff Login <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>

        {(supportEmail || supportPhone) && (
          <div className="mt-16 flex items-center justify-center gap-6 text-sm text-slate-500">
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 hover:text-slate-300 transition-colors">
                <Mail className="h-4 w-4" /> {supportEmail}
              </a>
            )}
            {supportPhone && (
              <a href={`tel:${supportPhone}`} className="flex items-center gap-2 hover:text-slate-300 transition-colors">
                <Phone className="h-4 w-4" /> {supportPhone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
