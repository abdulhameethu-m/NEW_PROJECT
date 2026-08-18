import { ShieldCheck, Users, Lock, FileText, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:p-12">
          <div className="relative z-10 sm:w-2/3">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Legal
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              This policy describes what information UChooseMe collects, how it is used, and when it is shared.
            </p>
          </div>
          
          {/* Decorative graphic for header (Right aligned on larger screens) */}
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 sm:block">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10">
              <FileText className="h-16 w-16 text-indigo-200 dark:text-indigo-500/30" />
              <div className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg">
                <Lock className="h-5 w-5" />
              </div>
              <span className="absolute -top-2 left-4 text-indigo-300">✦</span>
              <span className="absolute bottom-2 -left-2 text-indigo-300">✦</span>
              <span className="absolute right-0 top-6 text-indigo-300">✦</span>
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <div className="flex flex-col gap-6 rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:flex-row sm:p-10">
          <div className="shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ClipboardList className="h-8 w-8" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                We collect account details, contact information, addresses, order history, device data, and support interactions needed to operate the platform and fulfill purchases.
              </p>
              <p>
                Payment credentials are handled through approved payment partners. We do not intentionally store raw card details on our application servers.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="flex flex-col gap-6 rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:flex-row sm:p-10">
          <div className="shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. How We Use Information</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                Your data is used to authenticate accounts, process orders, provide delivery updates, improve product discovery, prevent fraud, and respond to support requests.
              </p>
              <p>
                We may also use limited contact data for service notifications, security alerts, and marketing preferences that you explicitly enable.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="flex flex-col gap-6 rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:flex-row sm:p-10">
          <div className="shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Users className="h-8 w-8" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Sharing and Retention</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                Information is shared only with sellers, logistics providers, payment processors, and service partners required to complete transactions or comply with legal obligations.
              </p>
              <p>
                We retain data for operational, tax, accounting, and dispute-resolution purposes only as long as necessary under business and legal requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-indigo-50 p-6 dark:bg-indigo-500/10 sm:flex-row sm:px-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Lock className="h-6 w-6" />
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300">
            We are committed to protecting your privacy and ensuring the security of your information.{" "}
            <br className="hidden sm:block" />
            If you have any questions, please{" "}
            <Link to="/support" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              contact our support team.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
