import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/ui";
import { authService } from "../services/auth.service";
import { apiErrorMessage } from "../constants";
import { signedIn } from "../store/auth.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const expired = useAppSelector((state) => state.auth.sessionExpired);
  const [view, setView] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  if (token) return <Navigate to="/" replace />;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await authService.login(
        String(form.get("email")),
        String(form.get("password")),
      );
      dispatch(
        signedIn({
          token: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
        }),
      );
      navigate("/", { replace: true });
    } catch {
      setNotice("Login failed. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await authService.forgotPassword(forgotEmail);
      setNotice(response.data.message);
    } catch (error) {
      setNotice(apiErrorMessage(error, "We could not start the reset. Try again shortly."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="osahan-page d-flex flex-column min-vh-100 bg-light">
      <div className="osahan-page-body my-auto overflow-auto p-3">
        <div className="text-center pt-5">
          <BrandMark size={88} className="shadow-sm" />
        </div>

        {view === "forgot" ? (
          <>
            <h5 className="display-6 fw-bold py-5 mb-0">
              Reset your <br />
              password
            </h5>
            <form onSubmit={submitForgotPassword}>
              <div className="input-group mb-3 bg-white rounded-4 shadow p-1">
                <span className="input-group-text bg-white border-0 ps-3">
                  <i className="mdi mdi-email-outline fs-4 text-primary" />
                </span>
                <input
                  type="email"
                  className="form-control border-0 px-2 py-3"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                />
              </div>
              <div className="py-4 vstack gap-3">
                <button type="submit" className="btn btn-primary rounded-4 w-100 btn-lg" disabled={busy}>
                  {busy ? "Sending..." : "Send reset link"}
                </button>
                <p className="fw-semibold text-center mt-2 text-secondary mb-0">
                  Remembered it?
                  <button
                    type="button"
                    className="btn btn-link text-black ps-2 text-decoration-none fw-semibold"
                    onClick={() => {
                      setView("login");
                      setNotice("");
                    }}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          </>
        ) : (
          <>
            <h5 className="display-6 fw-bold py-5 mb-0">
              Login your <br />
              account
            </h5>
            <form onSubmit={handleLogin}>
              <div className="input-group mb-3 bg-white rounded-4 shadow p-1">
                <span className="input-group-text bg-white border-0 ps-3">
                  <i className="mdi mdi-email-outline fs-4 text-primary" />
                </span>
                <input
                  name="email"
                  type="email"
                  className="form-control border-0 px-2 py-3"
                  placeholder="reseller@urbangear.local"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="input-group mb-3 bg-white rounded-4 shadow p-1">
                <span className="input-group-text bg-white border-0 ps-3">
                  <i className="mdi mdi-lock-outline fs-4 text-primary" />
                </span>
                <input
                  name="password"
                  type="password"
                  className="form-control border-0 px-2 py-3"
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="text-end mb-4">
                <button
                  type="button"
                  className="btn btn-link text-secondary text-decoration-none"
                  onClick={() => {
                    setView("forgot");
                    setNotice("");
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="py-2 vstack gap-3">
                <button type="submit" className="btn btn-primary rounded-4 w-100 btn-lg" disabled={busy}>
                  {busy ? "Signing in..." : "Login"}
                </button>
              </div>
            </form>
          </>
        )}

        {(notice || expired) && (
          <div className="alert alert-light border-0 shadow-sm rounded-4 mt-3 small mb-0" role="status">
            {notice || "Your session expired. Sign in again to continue."}
          </div>
        )}
      </div>
      <div className="osahan-page-footer mt-auto p-4 text-center border-top">
        <p className="text-muted small mb-0">
          Urban Gear reseller platform · accounts are created by an administrator
        </p>
      </div>
    </div>
  );
}
