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
    <div className="app-toast shadow" role="status">
      <div
        className={`d-flex align-items-center gap-2 text-white rounded-4 p-3 ${tone === "success" ? "bg-primary" : "bg-danger"}`}
      >
        <span className={`mdi mdi-${tone === "success" ? "check-circle-outline" : "alert-circle-outline"} fs-5`} />
        <span className="small fw-semibold">{children}</span>
        <button
          type="button"
          className="btn-close btn-close-white ms-auto"
          aria-label="Dismiss"
          onClick={onClose}
        />
      </div>
    </div>
  );
}
