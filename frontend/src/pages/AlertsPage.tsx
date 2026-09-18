import { useNavigate } from "react-router-dom";
import { notificationService } from "../services/notification.service";
import {
  notificationRead,
  selectNotifications,
  selectUnreadCount,
} from "../store/notification.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function AlertsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const notifications = useAppSelector(selectNotifications);
  const unread = useAppSelector(selectUnreadCount);

  function openNotification(notification: (typeof notifications)[number]) {
    if (!notification.readAt) {
      dispatch(notificationRead(notification.id));
      void notificationService.markRead(notification.id).catch(() => undefined);
    }
    if (notification.product) navigate(`/products/${notification.product.id}`);
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <p className="small text-primary fw-semibold m-0">NOTIFICATIONS</p>
          <h5 className="fw-bold mb-0">Product alerts</h5>
        </div>
        {unread > 0 && (
          <span className="badge rounded-pill bg-primary px-3 py-2">{unread} unread</span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          <i className="mdi mdi-bell-off-outline fs-1 text-primary d-block mb-2" />
          No product notifications yet. New catalog launches appear here the moment they go live.
        </div>
      ) : (
        notifications.map((notification) => (
          <button
            key={notification.id}
            className={`bg-white rounded-4 mb-3 shadow-sm w-100 border-0 text-start p-0 ${notification.readAt ? "opacity-75" : ""}`}
            onClick={() => openNotification(notification)}
          >
            <div className="d-flex p-3 gap-3 align-items-center">
              <span
                className={`icon-sm shadow-sm ${notification.readAt ? "text-secondary" : "text-primary"}`}
              >
                <span className="mdi mdi-package-variant-closed mdi-18px" />
              </span>
              <div className="lh-sm me-auto">
                <p className="mb-1 fw-bold">
                  {notification.title}
                  {!notification.readAt && (
                    <span className="badge bg-primary rounded-pill ms-2 little-text">NEW</span>
                  )}
                </p>
                <p className="mb-1 text-secondary small">{notification.message}</p>
                <p className="mb-0 text-secondary little-text opacity-75">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {notification.product && <i className="mdi mdi-chevron-right text-secondary fs-4" />}
            </div>
          </button>
        ))
      )}
    </>
  );
}
