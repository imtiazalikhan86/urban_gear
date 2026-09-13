import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  { children, className = "", ...props },
  ref,
) {
  return (
    <section ref={ref} className={`ui-panel ${className}`} {...props}>
      {children}
    </section>
  );
});
