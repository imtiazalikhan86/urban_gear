import type { OrderStatus } from "../../types/api";

/**
 * One definition of how an order status looks, so every screen renders it identically.
 * Pending reads as awaiting action, confirmed as done, cancelled as stopped.
 */
const orderStatusTone: Record<OrderStatus, string> = {
  PENDING: "bg-warning-subtle text-warning-emphasis",
  CONFIRMED: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
};

const orderStatusIcon: Record<OrderStatus, string> = {
  PENDING: "clock-outline",
  CONFIRMED: "check-circle-outline",
  CANCELLED: "close-circle-outline",
};

export function OrderStatusBadge({
  status,
  className = "",
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={`badge rounded-pill fw-semibold px-3 py-2 d-inline-flex align-items-center gap-1 ${orderStatusTone[status]} ${className}`}
    >
      <i className={`mdi mdi-${orderStatusIcon[status]}`} />
      {status}
    </span>
  );
}
