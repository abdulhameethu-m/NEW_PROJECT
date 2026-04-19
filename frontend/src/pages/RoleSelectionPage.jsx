import { Link } from "react-router-dom";

function RoleCard({ title, desc, to }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
      <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:underline">
        Continue →
      </div>
    </Link>
  );
}

export function RoleSelectionPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-center text-2xl font-semibold tracking-tight">
        Choose your role
      </h1>
      <p className="mt-2 text-center text-slate-600">
        This determines your onboarding flow and dashboard access.
      </p>

      <div className="mt-6 grid gap-4">
        <RoleCard
          title="User"
          desc="Browse and buy. Access user dashboard and profile."
          to="/register?role=user"
        />
        <RoleCard
          title="Vendor"
          desc="Sell on the platform. Complete onboarding and wait for approval."
          to="/register?role=vendor"
        />
      </div>
    </div>
  );
}

