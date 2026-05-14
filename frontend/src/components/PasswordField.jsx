import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  wrapperClassName = "",
  className = "",
  buttonClassName = "",
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800 ${buttonClassName}`}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
