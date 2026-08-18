import { ShieldCheck, ClipboardList, Handshake, CreditCard, UserCheck, Shield } from "lucide-react";

export function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:p-12">
          <div className="relative z-10 sm:w-2/3">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Legal
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              These terms explain how purchases, accounts, and use of the UChooseMe marketplace are governed.
            </p>
          </div>
          
          {/* Decorative graphic for header (Right aligned on larger screens) */}
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 sm:block">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10">
              <ClipboardList className="h-16 w-16 text-indigo-200 dark:text-indigo-500/30" />
              <div className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg">
                <ShieldCheck className="h-5 w-5" />
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
              <Handshake className="h-8 w-8" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                01
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acceptance of Terms</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                By using UChooseMe, you agree to comply with these terms, our store policies, and applicable laws. If you do not agree, please discontinue use of the platform.
              </p>
              <p>
                These terms apply to browsing, account creation, purchases, order management, reviews, and support interactions across web and mobile experiences.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="flex flex-col gap-6 rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:flex-row sm:p-10">
          <div className="shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <CreditCard className="h-8 w-8" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                02
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Orders and Payments</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                All orders are subject to availability, price confirmation, and fraud checks. We may cancel or limit orders when inventory, pricing, or payment verification fails.
              </p>
              <p>
                Payments processed through supported gateways must be completed using valid billing and shipping information supplied by the customer.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="flex flex-col gap-6 rounded-[2rem] bg-white p-8 shadow-sm dark:bg-slate-900 sm:flex-row sm:p-10">
          <div className="shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <UserCheck className="h-8 w-8" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                03
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Accounts and Platform Use</h2>
            </div>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                You are responsible for maintaining accurate account details and safeguarding your login credentials. Activity under your account is treated as authorized unless reported otherwise.
              </p>
              <p>
                Misuse of the platform, including fraudulent purchases, abuse of returns, unlawful content, or interference with services, can result in suspension or permanent account removal.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-indigo-50 p-6 dark:bg-indigo-500/10 sm:flex-row sm:px-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Shield className="h-6 w-6" />
          </div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            By using UChooseMe, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
          </div>
        </div>
      </div>
    </div>
  );
}
