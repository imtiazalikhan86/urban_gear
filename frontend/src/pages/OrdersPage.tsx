import { useEffect, useState } from "react";
import { Loader, OrderStatusBadge } from "../components/ui";
import { orderService } from "../services/order.service";
import { apiErrorMessage } from "../constants";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Order, OrderStatus } from "../types/api";

const statusFilters: Array<{ label: string; value: OrderStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function OrdersPage() {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector((state) => state.auth.user?.role) === "ADMIN";
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void orderService
      .list(filter === "ALL" ? undefined : filter, 25)
      .then((response) => {
        if (active) setOrders(response.data);
      })
      .catch(() => {
        if (active) {
          setOrders([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  async function changeStatus(order: Order, status: "CONFIRMED" | "CANCELLED") {
    setUpdatingId(order.id);
    try {
      const response = await orderService.updateStatus(order.id, status);
      setOrders((current) => current.map((item) => (item.id === order.id ? response.data : item)));
      dispatch(
        toastShown({ message: `${order.orderNumber} ${status.toLowerCase()}.`, tone: "success" }),
      );
    } catch (error) {
      dispatch(
        toastShown({
          message: apiErrorMessage(error, "Order status could not be changed."),
          tone: "error",
        }),
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="mb-3">
        <p className="small text-primary fw-semibold m-0">
          {isAdmin ? "ALL RESELLER ORDERS" : "YOUR ORDERS"}
        </p>
        <h5 className="fw-bold mb-0">Bulk orders</h5>
      </div>

      {/* Pill tab group, as used on the template's notification screen: the row/col
          wrapper is what keeps the tabs side by side rather than stacked. */}
      <div className="nav nav-pills rounded-pill mb-3 btn-group p-1 shadow-sm bg-white" role="tablist">
        <div className="row w-100 m-0 g-0">
          {statusFilters.map((option) => (
            <div className="col p-0" key={option.value}>
              <div className="nav-item" role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === option.value}
                  className={`nav-link btn btn-outline-primary text-center w-100 rounded-pill px-1 ${filter === option.value ? "active" : ""}`}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : failed ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          Orders could not be loaded. Your session may have expired.
          <button
            className="btn btn-primary rounded-4 w-100 mt-3"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          <i className="mdi mdi-package-variant fs-1 text-primary d-block mb-2" />
          {filter === "ALL"
            ? "No orders yet. Build a quote in the cart and place your first bulk order."
            : `No ${filter.toLowerCase()} orders.`}
        </div>
      ) : (
        orders.map((order) => {
          const quantity = order.items.reduce((total, item) => total + item.quantity, 0);
          const expanded = expandedId === order.id;
          return (
            <div className="bg-white rounded-4 mb-3 shadow-sm overflow-hidden" key={order.id}>
              <button
                className="d-flex p-3 w-100 border-0 bg-white text-start align-items-center"
                onClick={() => setExpandedId(expanded ? null : order.id)}
                aria-expanded={expanded}
              >
                <div className="lh-sm me-auto">
                  <p className="mb-1 fw-bold">{order.orderNumber}</p>
                  <p className="mb-0 text-secondary small">
                    {new Date(order.createdAt).toLocaleString()} · {quantity} items
                  </p>
                </div>
                <div className="text-end">
                  <p className="mb-1 fw-bold">
                    {order.currency} {order.total.toFixed(2)}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <i className={`mdi mdi-chevron-${expanded ? "up" : "down"} fs-4 text-secondary ms-2`} />
              </button>

              {expanded && (
                <div className="border-top p-3">
                  {order.items.map((item) => (
                    <div
                      className="d-flex justify-content-between align-items-center mb-2"
                      key={item.productId}
                    >
                      <div className="lh-sm">
                        <p className="mb-0 fw-semibold small">{item.productName}</p>
                        <p className="mb-0 text-secondary little-text">
                          {item.sku} · {item.quantity} × {order.currency}{" "}
                          {item.customerUnitPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="fw-bold small">
                        {order.currency} {item.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="d-flex justify-content-between border-top pt-2 mt-2">
                    <strong className="small">Customer total</strong>
                    <strong className="small text-primary">
                      {order.currency} {order.total.toFixed(2)}
                    </strong>
                  </div>
                  <p className="text-muted little-text mt-2 mb-0">
                    Margin applied at order time: {order.marginPercent}%
                  </p>

                  {isAdmin && order.status === "PENDING" && (
                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn btn-primary rounded-4 w-100"
                        disabled={updatingId === order.id}
                        onClick={() => void changeStatus(order, "CONFIRMED")}
                      >
                        Confirm
                      </button>
                      <button
                        className="btn btn-light shadow-sm rounded-4 w-100"
                        disabled={updatingId === order.id}
                        onClick={() => void changeStatus(order, "CANCELLED")}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
