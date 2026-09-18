import { useEffect, useState } from "react";
import { Button, ConfirmModal, Field, Loader, Modal } from "../components/ui";
import { userService, type UserListResponse } from "../services/user.service";
import { MINIMUM_PASSWORD_LENGTH, apiErrorMessage } from "../constants";
import { toastShown } from "../store/ui.slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { UserRole } from "../types/api";

type ManagedUser = UserListResponse["data"][number];

const emptyForm = { name: "", email: "", password: "", role: "RESELLER" as UserRole };

export function UsersPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<ManagedUser | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  function load() {
    setLoading(true);
    setFailed(false);
    return userService
      .list({ search: search || undefined })
      .then((response) => setUsers(response.data))
      .catch(() => {
        setUsers([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      await userService.create(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
      dispatch(toastShown({ message: `${form.email} created.`, tone: "success" }));
    } catch (error) {
      dispatch(
        toastShown({ message: apiErrorMessage(error, "User could not be created."), tone: "error" }),
      );
    } finally {
      setCreating(false);
    }
  }

  async function suspendUser(user: ManagedUser) {
    setBusyId(user.id);
    try {
      await userService.suspend(user.id);
      await load();
      setPendingSuspend(null);
      dispatch(toastShown({ message: `${user.email} suspended.`, tone: "success" }));
    } catch (error) {
      dispatch(
        toastShown({ message: apiErrorMessage(error, "User could not be suspended."), tone: "error" }),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function reactivateUser(user: ManagedUser) {
    setBusyId(user.id);
    try {
      await userService.update(user.id, { status: "ACTIVE" });
      await load();
      dispatch(toastShown({ message: `${user.email} reactivated.`, tone: "success" }));
    } catch (error) {
      dispatch(
        toastShown({ message: apiErrorMessage(error, "User could not be reactivated."), tone: "error" }),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function submitPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = resetTarget;
    if (!user) return;
    if (resetPasswordValue.length < MINIMUM_PASSWORD_LENGTH) {
      dispatch(
        toastShown({
          message: `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
          tone: "error",
        }),
      );
      return;
    }
    setBusyId(user.id);
    try {
      await userService.resetPassword(user.id, resetPasswordValue);
      setResetTarget(null);
      setResetPasswordValue("");
      dispatch(toastShown({ message: `Password reset for ${user.email}.`, tone: "success" }));
    } catch (error) {
      dispatch(
        toastShown({ message: apiErrorMessage(error, "Password could not be reset."), tone: "error" }),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <p className="small text-primary fw-semibold m-0">ADMIN TOOL</p>
          <h5 className="fw-bold mb-0">Resellers and admins</h5>
        </div>
        <button
          className={`btn btn-sm rounded-pill ${showForm ? "btn-light shadow-sm" : "btn-primary"}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Close" : "Add user"}{" "}
          <i className={`mdi mdi-${showForm ? "close" : "account-plus-outline"}`} />
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-4 shadow-sm p-3 mb-3">
          <p className="text-muted small">
            There is no public sign-up. Create the account here and share the password with them;
            they can change it from their profile.
          </p>
          <form onSubmit={createUser}>
            <Field
              id="user-name"
              label="Full name"
              icon="account-outline"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              minLength={2}
              required
            />
            <Field
              id="user-email"
              label="Email address"
              icon="email-outline"
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
            <Field
              id="user-password"
              label={`Temporary password (min ${MINIMUM_PASSWORD_LENGTH} characters)`}
              icon="lock-outline"
              type="password"
              placeholder={`Temporary password, min ${MINIMUM_PASSWORD_LENGTH} characters`}
              autoComplete="new-password"
              minLength={MINIMUM_PASSWORD_LENGTH}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <div className="input-group mb-3 bg-white rounded-4 shadow-sm p-1">
              <span className="input-group-text bg-white border-0 ps-3">
                <i className="mdi mdi-shield-account-outline fs-4 text-primary" />
              </span>
              <select
                id="user-role"
                aria-label="Role"
                className="form-select border-0 px-2 py-3"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
              >
                <option value="RESELLER">Role: Reseller</option>
                <option value="ADMIN">Role: Administrator</option>
              </select>
            </div>
            <Button className="w-100" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create user"}
            </Button>
          </form>
        </div>
      )}

      <div className="input-group mb-3 bg-white rounded-pill shadow-sm overflow-hidden">
        <span className="input-group-text bg-white border-0 ps-3">
          <i className="mdi mdi-magnify fs-5 text-secondary" />
        </span>
        <input
          className="form-control border-0 px-0 py-2"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users"
        />
      </div>

      {loading ? (
        <Loader />
      ) : failed ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          Users could not be loaded. Your session may have expired.
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-4 shadow-sm p-4 text-center text-muted">
          No users match that search.
        </div>
      ) : (
        users.map((user) => {
          const isSelf = user.id === currentUser?.id;
          return (
            <div className="bg-white rounded-4 mb-3 shadow-sm p-3" key={user.id}>
              <div className="d-flex align-items-center gap-3">
                <span className="icon-sm shadow-sm text-primary">
                  <span className="mdi mdi-account-outline mdi-18px" />
                </span>
                <div className="lh-sm me-auto">
                  <p className="mb-1 fw-bold">
                    {user.name} {isSelf && <span className="text-muted fw-normal">(you)</span>}
                  </p>
                  <p className="mb-0 text-secondary small">{user.email}</p>
                </div>
                <div className="text-end">
                  <span
                    className={`badge rounded-pill ${user.role === "ADMIN" ? "bg-primary" : "bg-success-subtle text-success"}`}
                  >
                    {user.role}
                  </span>
                  {user.status === "SUSPENDED" && (
                    <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis d-block mt-1">
                      SUSPENDED
                    </span>
                  )}
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-light shadow-sm rounded-4 w-100 btn-sm"
                  disabled={busyId === user.id}
                  onClick={() => {
                    setResetPasswordValue("");
                    setResetTarget(user);
                  }}
                >
                  <i className="mdi mdi-lock-reset me-1" /> Reset password
                </button>
                {user.status === "ACTIVE" ? (
                  <button
                    className="btn btn-light shadow-sm rounded-4 w-100 btn-sm"
                    disabled={busyId === user.id || isSelf}
                    title={isSelf ? "You cannot suspend your own account" : undefined}
                    onClick={() => setPendingSuspend(user)}
                  >
                    <i className="mdi mdi-account-off-outline me-1" /> Suspend
                  </button>
                ) : (
                  <button
                    className="btn btn-primary rounded-4 w-100 btn-sm"
                    disabled={busyId === user.id}
                    onClick={() => void reactivateUser(user)}
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      <ConfirmModal
        open={pendingSuspend !== null}
        icon="account-off-outline"
        title="Suspend this account?"
        message={`${pendingSuspend?.email ?? ""} will not be able to sign in. Their orders and history are kept, and you can reactivate them at any time.`}
        confirmLabel="Suspend"
        tone="danger"
        busy={busyId === pendingSuspend?.id}
        onConfirm={() => pendingSuspend && void suspendUser(pendingSuspend)}
        onCancel={() => setPendingSuspend(null)}
      />

      <Modal
        open={resetTarget !== null}
        icon="lock-reset"
        title="Set a new password"
        onClose={() => setResetTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-light shadow-sm rounded-4 w-100 m-0"
              onClick={() => setResetTarget(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reset-password-form"
              className="btn btn-primary rounded-4 w-100 m-0"
              disabled={busyId === resetTarget?.id}
            >
              {busyId === resetTarget?.id ? "Saving..." : "Save password"}
            </button>
          </>
        }
      >
        <p className="text-muted small">
          {resetTarget?.email} will sign in with this password. Share it with them directly; they
          can change it from their profile.
        </p>
        <form id="reset-password-form" onSubmit={submitPasswordReset}>
          <Field
            id="reset-user-password"
            label="New password"
            icon="lock-outline"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${MINIMUM_PASSWORD_LENGTH} characters`}
            minLength={MINIMUM_PASSWORD_LENGTH}
            required
            autoFocus
            value={resetPasswordValue}
            onChange={(event) => setResetPasswordValue(event.target.value)}
          />
        </form>
      </Modal>
    </>
  );
}
