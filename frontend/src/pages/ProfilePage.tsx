import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark, Button, Field, OrderStatusBadge } from "../components/ui";
import { authService } from "../services/auth.service";
import { orderService } from "../services/order.service";
import { tokenStorage } from "../services/http";
import { MINIMUM_PASSWORD_LENGTH, apiErrorMessage } from "../constants";
import { signedOut, userUpdated } from "../store/auth.slice";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { Order } from "../types/api";

const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [margin, setMargin] = useState(user?.marginPercent ?? 15);
  const [marginSaving, setMarginSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    void orderService
      .list()
      .then((response) => setOrders(response.data))
      .catch(() => setOrders([]));
  }, []);

  async function saveMargin() {
    setMarginSaving(true);
    try {
      const response = await authService.updateMargin(margin);
      dispatch(userUpdated(response.data));
      dispatch(toastShown({ message: `Default margin saved at ${margin}%.`, tone: "success" }));
    } catch {
      dispatch(toastShown({ message: "Margin could not be saved.", tone: "error" }));
    } finally {
      setMarginSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      dispatch(
        toastShown({
          message: `New password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
          tone: "error",
        }),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      dispatch(toastShown({ message: "New passwords do not match.", tone: "error" }));
      return;
    }
    if (newPassword === currentPassword) {
      dispatch(
        toastShown({
          message: "Choose a password different from your current one.",
          tone: "error",
        }),
      );
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordForm(emptyPasswordForm);
      setPasswordOpen(false);
      dispatch(toastShown({ message: "Password updated.", tone: "success" }));
    } catch (error) {
      dispatch(
        toastShown({
          message: apiErrorMessage(error, "Password could not be updated."),
          tone: "error",
        }),
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function signOut() {
    const refreshToken = tokenStorage.refresh();
    if (refreshToken) await authService.logout(refreshToken).catch(() => undefined);
    dispatch(signedOut());
  }

  if (!user) return null;
  const isAdmin = user.role === "ADMIN";

  return (
    <>
      {/* Profile header, after the template's profile screen. */}
      <div className="text-center mb-4">
        <BrandMark size={96} className="shadow-sm mb-3" />
        <h5 className="fw-bold mb-0">{user.name}</h5>
        <p className="text-muted small mb-2">{user.email}</p>
        <span className="badge rounded-pill bg-primary px-3 py-2">{user.role}</span>
      </div>

      {!isAdmin && (
        <div className="bg-white rounded-4 shadow-sm p-3 mb-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="icon-sm shadow-sm text-primary">
              <span className="mdi mdi-percent-outline mdi-18px" />
            </span>
            <div className="lh-sm">
              <p className="mb-0 fw-bold">Default margin</p>
              <p className="mb-0 text-secondary little-text">
                Applied to your customer quote previews
              </p>
            </div>
          </div>
          <div className="input-group bg-light rounded-4 p-1 mb-3">
            <input
              type="number"
              min="0"
              max="1000"
              className="form-control border-0 bg-light px-3 py-2 fw-bold"
              placeholder="Margin %"
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
              aria-label="Default margin percentage"
            />
            <span className="input-group-text bg-light border-0 fw-bold text-primary">%</span>
          </div>
          <Button className="w-100" onClick={saveMargin} disabled={marginSaving}>
            {marginSaving ? "Saving..." : "Update margin"}
          </Button>
        </div>
      )}

      <div className="bg-white rounded-4 shadow-sm mb-3 overflow-hidden">
        <button
          className="d-flex align-items-center gap-2 p-3 w-100 border-0 bg-white text-start"
          onClick={() => setPasswordOpen(!passwordOpen)}
          aria-expanded={passwordOpen}
        >
          <span className="icon-sm shadow-sm text-primary">
            <span className="mdi mdi-lock-outline mdi-18px" />
          </span>
          <div className="lh-sm me-auto">
            <p className="mb-0 fw-bold">Update password</p>
            <p className="mb-0 text-secondary little-text">
              At least {MINIMUM_PASSWORD_LENGTH} characters
            </p>
          </div>
          <i className={`mdi mdi-chevron-${passwordOpen ? "up" : "right"} fs-4 text-secondary`} />
        </button>
        {passwordOpen && (
          <form className="p-3 border-top" onSubmit={changePassword}>
            <Field
              id="current-password"
              label="Current password"
              icon="lock-outline"
              placeholder="Current password"
              type="password"
              autoComplete="current-password"
              required
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
            />
            <Field
              id="new-password"
              label="New password"
              icon="lock-reset"
              placeholder={`New password, at least ${MINIMUM_PASSWORD_LENGTH} characters`}
              type="password"
              autoComplete="new-password"
              minLength={MINIMUM_PASSWORD_LENGTH}
              required
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
            />
            <Field
              id="confirm-password"
              label="Confirm new password"
              icon="lock-check-outline"
              placeholder="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
            />
            <Button className="w-100" type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-4 shadow-sm mb-3 overflow-hidden">
        <div className="d-flex align-items-center gap-2 p-3 border-bottom">
          <span className="icon-sm shadow-sm text-primary">
            <span className="mdi mdi-package-variant-closed mdi-18px" />
          </span>
          <div className="lh-sm me-auto">
            <p className="mb-0 fw-bold">{isAdmin ? "Recent reseller orders" : "Recent orders"}</p>
            <p className="mb-0 text-secondary little-text">{orders.length} in the latest page</p>
          </div>
          <Link to="/orders" className="btn btn-light btn-sm rounded-pill shadow-sm">
            View all
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-muted small p-3 mb-0">Your placed orders will appear here.</p>
        ) : (
          orders.slice(0, 4).map((order) => (
            <div className="d-flex p-3 border-bottom align-items-center" key={order.id}>
              <div className="lh-sm me-auto">
                <p className="mb-1 fw-semibold small">{order.orderNumber}</p>
                <p className="mb-0 text-secondary little-text">
                  {order.items.reduce((total, item) => total + item.quantity, 0)} items ·{" "}
                  {order.currency} {order.total.toFixed(2)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          ))
        )}
      </div>

      <button className="btn btn-light shadow-sm rounded-4 w-100 mb-3" onClick={() => void signOut()}>
        <span className="mdi mdi-logout me-2" /> Sign out
      </button>
    </>
  );
}
