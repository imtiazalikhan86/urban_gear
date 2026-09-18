import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AlertsPage } from "./pages/AlertsPage";
import { CartPage } from "./pages/CartPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductPage } from "./pages/ProductPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SearchPage } from "./pages/SearchPage";
import { UsersPage } from "./pages/UsersPage";
import { authService } from "./services/auth.service";
import { notificationService } from "./services/notification.service";
import { sessionExpired, signedOut, tokenRefreshed, userUpdated } from "./store/auth.slice";
import { notificationReceived, notificationsLoaded } from "./store/notification.slice";
import { toastShown } from "./store/ui.slice";
import { useAppDispatch, useAppSelector } from "./store/hooks";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((state) => state.auth.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Keeps reseller-only and admin-only screens out of the wrong console, URL included. */
function RequireRole({ role, children }: { role: "ADMIN" | "RESELLER"; children: React.ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  if (!user) return null;
  return user.role === role ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const role = useAppSelector((state) => state.auth.user?.role);

  useEffect(() => {
    const handleUnauthorized = () => dispatch(sessionExpired());
    const handleRefreshed = () => dispatch(tokenRefreshed());
    window.addEventListener("urbangear:unauthorized", handleUnauthorized);
    window.addEventListener("urbangear:refreshed", handleRefreshed);
    return () => {
      window.removeEventListener("urbangear:unauthorized", handleUnauthorized);
      window.removeEventListener("urbangear:refreshed", handleRefreshed);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!token) return;
    void authService
      .me()
      .then((response) => dispatch(userUpdated(response.data)))
      .catch(() => dispatch(signedOut()));
  }, [dispatch, token]);

  useEffect(() => {
    if (!token || role !== "RESELLER") return;
    void notificationService
      .list()
      .then((response) => dispatch(notificationsLoaded(response.data)))
      .catch(() => dispatch(notificationsLoaded([])));
  }, [dispatch, token, role]);

  useEffect(() => {
    if (!token || role !== "RESELLER") return;
    return notificationService.stream({
      onNotification: (notification) => {
        dispatch(notificationReceived(notification));
        dispatch(toastShown({ message: notification.message, tone: "success" }));
      },
    });
  }, [dispatch, token, role]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route
          path="/cart"
          element={
            <RequireRole role="RESELLER">
              <CartPage />
            </RequireRole>
          }
        />
        <Route path="/orders" element={<OrdersPage />} />
        <Route
          path="/alerts"
          element={
            <RequireRole role="RESELLER">
              <AlertsPage />
            </RequireRole>
          }
        />
        <Route
          path="/users"
          element={
            <RequireRole role="ADMIN">
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
