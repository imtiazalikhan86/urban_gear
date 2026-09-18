import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  icon?: string;
  children?: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}

/**
 * Bootstrap's modal markup driven by React state: the template ships Bootstrap's CSS but
 * its JS is jQuery-based, so open/close is handled here rather than with data-bs-toggle.
 */
export function Modal({ open, title, icon, children, footer, onClose }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content rounded-4 border-0 shadow">
            <div className="modal-body p-4 text-center">
              {icon && (
                <span className="icon-sm shadow-sm text-primary mx-auto mb-3" style={{ width: 56, height: 56 }}>
                  <i className={`mdi mdi-${icon} fs-2`} />
                </span>
              )}
              <h5 className="fw-bold mb-2">{title}</h5>
              {children}
            </div>
            <div className="modal-footer border-0 pt-0 px-4 pb-4 d-flex gap-2 flex-nowrap">{footer}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  icon = "help-circle-outline",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      icon={icon}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="btn btn-light shadow-sm rounded-4 w-100 m-0"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-${tone} rounded-4 w-100 m-0`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-muted small mb-0">{message}</p>
    </Modal>
  );
}
