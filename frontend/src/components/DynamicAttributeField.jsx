export function DynamicAttributeField({ attribute, value, onChange }) {
  const commonClass =
    "mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white";

  if (attribute.type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(attribute.key, event.target.value)}
        className={commonClass}
        required={attribute.required}
      />
    );
  }

  if (attribute.type === "select") {
    return (
      <select
        value={value ?? ""}
        onChange={(event) => onChange(attribute.key, event.target.value)}
        className={commonClass}
        required={attribute.required}
      >
        <option value="">{`Select ${attribute.name}`}</option>
        {(attribute.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (attribute.type === "multi-select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <select
        multiple
        value={selected}
        onChange={(event) =>
          onChange(
            attribute.key,
            Array.from(event.target.selectedOptions).map((option) => option.value)
          )
        }
        className={commonClass}
      >
        {(attribute.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (attribute.type === "boolean") {
    return (
      <select
        value={value === true ? "true" : value === false ? "false" : ""}
        onChange={(event) => onChange(attribute.key, event.target.value)}
        className={commonClass}
        required={attribute.required}
      >
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (attribute.type === "color") {
    return (
      <input
        type="color"
        value={value || "#000000"}
        onChange={(event) => onChange(attribute.key, event.target.value)}
        className={`${commonClass} h-10 p-1`}
        required={attribute.required}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(event) => onChange(attribute.key, event.target.value)}
      className={commonClass}
      required={attribute.required}
      placeholder={attribute.name}
    />
  );
}
