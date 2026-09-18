import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Not rendered: the template shows the hint in the placeholder, so this names the field for screen readers. */
  label: string;
  /** Material Design Icon name, e.g. "email-outline", matching the template's input groups. */
  icon?: string;
}

export function Field({ label, id, icon, className = "", placeholder, ...props }: FieldProps) {
  return (
    <div className="input-group mb-3 bg-white rounded-4 shadow-sm p-1">
      {icon && (
        <span className="input-group-text bg-white border-0 ps-3">
          <i className={`mdi mdi-${icon} fs-4 text-primary`} />
        </span>
      )}
      <input
        id={id}
        aria-label={label}
        placeholder={placeholder ?? label}
        className={`form-control border-0 px-2 py-3 ${className}`}
        {...props}
      />
    </div>
  );
}
