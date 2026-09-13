import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export function Toast({
  children,
  tone = "success",
  onClose,
}: {
  children: ReactNode;
  tone?: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div className={`ui-toast ui-toast--${tone}`} role="status">
      <span className="ui-toast-icon">
        {tone === "success" ? (
          <CheckCircle2 size={18} />
        ) : (
          <XCircle size={18} />
        )}
      </span>
      <span>{children}</span>
      <button onClick={onClose} aria-label="Dismiss notification">
        &times;
      </button>
    </div>
  );
}
