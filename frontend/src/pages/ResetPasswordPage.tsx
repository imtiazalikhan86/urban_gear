import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { BrandMark } from "../components/ui";
import { authService } from "../services/auth.service";
import { MINIMUM_PASSWORD_LENGTH, apiErrorMessage } from "../constants";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  if (!token) return <Navigate to="/login" replace />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setNotice(`New password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setNotice("New passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await authService.resetPassword(token!, form.newPassword);
      navigate("/login", { replace: true });
    } catch (error) {
      setNotice(apiErrorMessage(error, "That reset link is invalid or has expired."));
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
        <h5 className="display-6 fw-bold py-5 mb-0">
          Choose a new <br />
          password
        </h5>
        <form onSubmit={submit}>
          <div className="input-group mb-3 bg-white rounded-4 shadow p-1">
            <span className="input-group-text bg-white border-0 ps-3">
              <i className="mdi mdi-lock-reset fs-4 text-primary" />
            </span>
            <input
              type="password"
              className="form-control border-0 px-2 py-3"
              placeholder={`At least ${MINIMUM_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
              minLength={MINIMUM_PASSWORD_LENGTH}
              required
              value={form.newPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, newPassword: event.target.value }))
              }
            />
          </div>
          <div className="input-group mb-3 bg-white rounded-4 shadow p-1">
            <span className="input-group-text bg-white border-0 ps-3">
              <i className="mdi mdi-lock-check-outline fs-4 text-primary" />
            </span>
            <input
              type="password"
              className="form-control border-0 px-2 py-3"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
            />
          </div>
          <div className="py-4 vstack gap-3">
            <button type="submit" className="btn btn-primary rounded-4 w-100 btn-lg" disabled={busy}>
              {busy ? "Updating..." : "Set new password"}
            </button>
            <button
              type="button"
              className="btn btn-light shadow-sm rounded-4 w-100 btn-lg"
              onClick={() => navigate("/login")}
            >
              Back to sign in
            </button>
          </div>
        </form>
        {notice && (
          <div className="alert alert-light border-0 shadow-sm rounded-4 small mb-0" role="status">
            {notice}
          </div>
        )}
      </div>
    </div>
  );
}
