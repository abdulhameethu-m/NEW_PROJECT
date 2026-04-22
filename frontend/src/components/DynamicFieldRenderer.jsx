import { DynamicAttributeField } from "./DynamicAttributeField";

export function DynamicFieldRenderer({ field, value, onChange }) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(field.key, event.target.value)}
        rows={4}
        className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        placeholder={field.name}
      />
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value ?? ""}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
    );
  }

  return <DynamicAttributeField attribute={field} value={value} onChange={onChange} />;
}
