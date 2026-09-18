import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandMark, SplashLoader, Toast } from "../components/ui";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../services/http";
import { signedOut } from "../store/auth.slice";
import { selectCartCount } from "../store/cart.slice";
import { selectUnreadCount } from "../store/notification.slice";
import { toastCleared } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

type Role = "ADMIN" | "RESELLER";

type NavItem = {
  to: string;
  label: string;
  mobileLabel: string;
  icon: string;
  roles: Role[];
  bottomNavFor: Role[];
};

/**
 * Cart and alerts are reseller tools: an admin never buys, and product notifications
 * fan out to resellers only. Admins get user management and every reseller order instead.
 * Five entries is the practical maximum for the bottom bar, so Orders sits in the
 * drawer for resellers and in the bar for admins.
 */
const navItems: NavItem[] = [
  { to: "/", label: "Home", mobileLabel: "Home", icon: "home-variant-outline", roles: ["ADMIN", "RESELLER"], bottomNavFor: ["ADMIN", "RESELLER"] },
  { to: "/search", label: "Search", mobileLabel: "Search", icon: "magnify", roles: ["ADMIN", "RESELLER"], bottomNavFor: ["ADMIN", "RESELLER"] },
  { to: "/cart", label: "Cart", mobileLabel: "Cart", icon: "cart-outline", roles: ["RESELLER"], bottomNavFor: ["RESELLER"] },
  // Alerts stay out of the bottom bar: the header bell already opens them, and Orders
  // is the more frequent destination for a reseller.
  { to: "/alerts", label: "Notifications", mobileLabel: "Alerts", icon: "bell-outline", roles: ["RESELLER"], bottomNavFor: [] },
  { to: "/orders", label: "Orders", mobileLabel: "Orders", icon: "package-variant-closed", roles: ["ADMIN", "RESELLER"], bottomNavFor: ["ADMIN", "RESELLER"] },
  { to: "/users", label: "Users", mobileLabel: "Users", icon: "account-multiple-outline", roles: ["ADMIN"], bottomNavFor: ["ADMIN"] },
  { to: "/profile", label: "Profile", mobileLabel: "Profile", icon: "account-circle-outline", roles: ["ADMIN", "RESELLER"], bottomNavFor: ["ADMIN", "RESELLER"] },
];

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const toast = useAppSelector((state) => state.ui.toast);
  const cartCount = useAppSelector(selectCartCount);
  const unreadCount = useAppSelector(selectUnreadCount);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => dispatch(toastCleared()), 3600);
    return () => window.clearTimeout(timeout);
  }, [dispatch, toast]);

  // Mirror the URL back into the field for deep links and the back button, but never
  // while the field has focus, or it would overwrite what is being typed.
  useEffect(() => {
    if (document.activeElement === searchInputRef.current) return;
    setHeaderSearch(new URLSearchParams(location.search).get("q") ?? "");
  }, [location.pathname, location.search]);

  useEffect(() => () => window.clearTimeout(searchDebounceRef.current), []);

  function goToSearch(value: string) {
    const trimmed = value.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search", {
      replace: location.pathname === "/search",
    });
  }

  function changeSearch(value: string) {
    setHeaderSearch(value);
    window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => goToSearch(value), 300);
  }

  async function signOut() {
    const refreshToken = tokenStorage.refresh();
    if (refreshToken) await authService.logout(refreshToken).catch(() => undefined);
    dispatch(signedOut());
  }

  // The session is restored from /auth/me after a reload, so show a placeholder rather than a blank screen.
  if (!user) {
    return (
      <div className="osahan-page">
        <SplashLoader label="Loading your workspace..." />
      </div>
    );
  }

  const role = user.role as Role;
  const visibleNav = navItems.filter((item) => item.roles.includes(role));
  const bottomNav = navItems.filter((item) => item.bottomNavFor.includes(role));

  return (
    <div className="osahan-page d-flex flex-column min-vh-100 bg-light">
      <div className="osahan-page-header p-3 bg-light">
        <div className="d-flex align-items-center justify-content-between">
          {location.pathname !== "/" && (
            <button
              type="button"
              className="text-black bg-white rounded-pill icon-sm shadow-sm me-3 border-0"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <span className="mdi mdi-arrow-left mdi-18px" />
            </button>
          )}
          <div className="d-flex align-items-center text-decoration-none me-auto gap-1">
            <i className="mdi mdi-map-marker-circle h2 m-0 text-primary" />
            <div className="ms-2 lh-1">
              <h6 className="text-dark mb-0 fw-bold">
                {role === "ADMIN" ? "Admin console" : "Reseller workspace"}
              </h6>
              <small className="text-muted opacity-75 mb-0">{user.name}</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <NavLink to="/profile" aria-label="Open profile">
              <BrandMark size={36} tone="light" className="shadow-sm" />
            </NavLink>
            {role === "RESELLER" && (
              <NavLink
                to="/alerts"
                className="icon-sm shadow-sm position-relative"
                aria-label={
                  unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
                }
              >
                <span className="mdi mdi-bell-outline text-primary mdi-18px" />
                {unreadCount > 0 && (
                  <span className="header-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </NavLink>
            )}
            <button
              type="button"
              className="toggle d-flex align-items-center justify-content-center bg-white shadow-sm icon-sm fs-5 border-0"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <i className="bi bi-list text-primary mdi-18px" />
            </button>
          </div>
        </div>
        <form
          className="input-group mt-3 bg-white rounded-pill shadow-sm overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            window.clearTimeout(searchDebounceRef.current);
            goToSearch(headerSearch);
          }}
        >
          <span className="input-group-text bg-white border-0 ps-3">
            <i className="mdi mdi-magnify fs-4 text-secondary" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            className="form-control border-0 px-0 py-2"
            placeholder="Search products"
            aria-label="Search products"
            value={headerSearch}
            onChange={(event) => changeSearch(event.target.value)}
          />
          {headerSearch && (
            <button
              type="button"
              className="btn border-0 bg-white text-secondary"
              aria-label="Clear search"
              onClick={() => {
                window.clearTimeout(searchDebounceRef.current);
                setHeaderSearch("");
                searchInputRef.current?.focus();
                goToSearch("");
              }}
            >
              <i className="mdi mdi-close" />
            </button>
          )}
        </form>
      </div>

      <div className="osahan-page-body flex-grow-1 overflow-auto px-3">
        <Outlet />
      </div>

      {toast && (
        <Toast tone={toast.tone} onClose={() => dispatch(toastCleared())}>
          {toast.message}
        </Toast>
      )}

      <nav className="app-bottom-nav" aria-label="Primary navigation">
        {bottomNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            <span className="h5 m-0 position-relative">
              <span className={`mdi mdi-${item.icon}`} />
              {item.to === "/cart" && cartCount > 0 && <span className="app-nav-badge">{cartCount}</span>}
              {item.to === "/alerts" && unreadCount > 0 && (
                <span className="app-nav-badge">{unreadCount}</span>
              )}
            </span>
            {item.mobileLabel}
          </NavLink>
        ))}
      </nav>

      {drawerOpen && (
        <button
          className="app-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        />
      )}
      <aside className={`app-drawer ${drawerOpen ? "show" : ""}`}>
        <div className="osahan-user-profile bg-primary p-3">
          <div className="d-flex align-items-center gap-2">
            <BrandMark size={34} tone="light" />
            <div className="ps-1">
              <h6 className="fw-bold text-white mb-0">Hey, {user.name.split(" ")[0]}!</h6>
              <p className="text-white-50 m-0 small">
                {role === "ADMIN" ? "Admin console" : "Reseller workspace"}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm text-white ms-auto border-0"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <i className="mdi mdi-close fs-5" />
            </button>
          </div>
        </div>
        <nav>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="nav-link text-decoration-none"
              onClick={() => setDrawerOpen(false)}
            >
              <span className={`mdi mdi-${item.icon} me-3 fs-5`} />
              {item.label}
              {item.to === "/cart" && cartCount > 0 && (
                <span className="badge bg-primary rounded-pill ms-auto">{cartCount}</span>
              )}
              {item.to === "/alerts" && unreadCount > 0 && (
                <span className="badge bg-primary rounded-pill ms-auto">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button className="btn btn-light shadow-sm rounded-4 w-100" onClick={() => void signOut()}>
            <span className="mdi mdi-logout me-2" /> Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
