"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Pencil,
  KeyRound,
  LogOut,
  UserX,
  UserCheck,
  Lock,
} from "lucide-react";
import EditEmployeeModal, {
  type DepartmentOption,
  type EmployeeToEdit,
} from "./EditEmployeeModal";
import ConfirmActionModal, { type ConfirmAction } from "./ConfirmActionModal";
import ResetPasswordModal, { type ResetTarget } from "./ResetPasswordModal";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";
import { useUserStore } from "@/store/userStore";
import { ROLE_STYLES } from "@/lib/utils";
import { Avatar } from "@/components/shared/people";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: { id: string; name: string } | null;
  createdAt: string;
  deactivatedAt: string | null;
};

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-teal-600",
  "bg-orange-600",
];

function colorFor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: Role }) {
  const { label, cls } = ROLE_STYLES[role];
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>
  );
}

function InactiveBadge() {
  return (
    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Inactive
    </span>
  );
}

function DepartmentBadge({ department }: { department: StaffRow["department"] }) {
  if (!department) return <span className="text-sm text-slate-400">None</span>;
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {department.name}
    </span>
  );
}

const iconBtn =
  "cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400";

const selectCls =
  "w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 lg:w-40";

type Props = {
  users: StaffRow[];
  departments: DepartmentOption[];
  currentUserId: string;
  viewerRole: Role;
};

export function EmployeesTable({ users, departments, currentUserId, viewerRole }: Props) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [dept, setDept] = useState<string>("ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [toEdit, setToEdit] = useState<EmployeeToEdit | null>(null);
  const [toReset, setToReset] = useState<ResetTarget | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const user = useUserStore((s) => s.user)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "ALL" && u.role !== role) return false;
      if (status === "ACTIVE" && u.deactivatedAt) return false;
      if (status === "INACTIVE" && !u.deactivatedAt) return false;
      if (dept === "NONE" && u.department) return false;
      if (dept !== "ALL" && dept !== "NONE" && u.department?.id !== dept) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, search, role, dept, status]);

  const openEdit = (u: StaffRow) =>
    setToEdit({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.department?.id ?? null,
    });

  const askLogout = (u: StaffRow) =>
    setConfirm({
      title: "Sign out everywhere",
      message: `${u.name} will be signed out on all devices and will need to log in again.`,
      confirmLabel: "Sign out",
      danger: true,
      url: `/api/employees/${u.id}/sessions`,
      method: "DELETE",
      successMessage: "User signed out",
    });

  const askToggle = (u: StaffRow) => {
    const deactivating = !u.deactivatedAt;
    setConfirm(
      deactivating
        ? {
          title: "Deactivate account",
          message: `${u.name} will be signed out everywhere and won't be able to log in until reactivated. Their data is kept.`,
          confirmLabel: "Deactivate",
          danger: true,
          url: `/api/employees/${u.id}/status`,
          method: "POST",
          body: { active: false },
          successMessage: "Account deactivated",
        }
        : {
          title: "Reactivate account",
          message: `${u.name} will be able to log in again.`,
          confirmLabel: "Reactivate",
          url: `/api/employees/${u.id}/status`,
          method: "POST",
          body: { active: true },
          successMessage: "Account reactivated",
        }
    );
  };

  const renderActions = (u: StaffRow) => {
    if (!canManageUser(viewerRole, u.role)) {
      return (
        <div className="flex justify-end">
          <span
            title="Only administrators can manage this account"
            className="p-2 text-slate-300"
          >
            <Lock size={18} aria-label="Managed by administrators only" />
          </span>
        </div>
      );
    }

    const isSelf = u.id === currentUserId;
    const inactive = !!u.deactivatedAt;

    return (
      <div className="flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={() => openEdit(u)}
          aria-label={`Edit ${u.name}`}
          title="Edit"
          className={iconBtn}
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          onClick={() => setToReset({ id: u.id, name: u.name })}
          disabled={isSelf}
          aria-label={`Reset password for ${u.name}`}
          title={isSelf ? "Use your account settings" : "Reset password"}
          className={iconBtn}
        >
          <KeyRound size={18} />
        </button>
        <button
          type="button"
          onClick={() => askLogout(u)}
          disabled={isSelf}
          aria-label={`Sign ${u.name} out everywhere`}
          title={isSelf ? "Not available for yourself" : "Sign out everywhere"}
          className={iconBtn}
        >
          <LogOut size={18} />
        </button>
        <button
          type="button"
          onClick={() => askToggle(u)}
          disabled={isSelf}
          aria-label={`${inactive ? "Reactivate" : "Deactivate"} ${u.name}`}
          title={
            isSelf
              ? "You can't deactivate yourself"
              : inactive
                ? "Reactivate"
                : "Deactivate"
          }
          className={`${iconBtn} ${inactive ? "hover:text-emerald-600!" : "hover:text-red-600!"
            }`}
        >
          {inactive ? <UserCheck size={18} /> : <UserX size={18} />}
        </button>
      </div>
    );
  };

  const emptyState = (
    <div className="px-6 py-16 text-center">
      <Filter size={30} className="mx-auto mb-3 text-muted-foreground" />
      <p className="font-semibold text-slate-700">No employees found</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
    </div>
  );

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">All Employees</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse everyone, filter by role, department or status, and manage accounts.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-primary">
          {users.length} people
        </span>
      </div>

      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
        <div className="relative w-full lg:max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or department..."
            aria-label="Search employees"
            className="w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          aria-label="Filter by role"
          className={selectCls}
        >
          <option value="ALL">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="HR">HR</option>
          <option value="TEAM_LEAD">Team Lead</option>
          <option value="STAFF">Staff</option>
        </select>

        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          aria-label="Filter by department"
          className={selectCls}
        >
          <option value="ALL">All departments</option>
          <option value="NONE">No department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Filter by status"
          className={selectCls}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="md:hidden">
        {filtered.length === 0 ? (
          emptyState
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((u) => (
              <li
                key={u.id}
                className={`p-4 ${u.deactivatedAt ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar id={u.id} name={u.name} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-primary">
                        {u.id === user?.id ? "You" : u.name}
                      </p>
                      <RoleBadge role={u.role} />
                    </div>

                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>

                    {u.deactivatedAt && (
                      <div className="mt-1">
                        <InactiveBadge />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <DepartmentBadge department={u.department} />

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </span>
                  </div>

                  {renderActions(u)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead className="bg-muted">
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Department</th>
              <th className="whitespace-nowrap px-6 py-4">Date Added</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr
                key={u.id}
                className={`transition hover:bg-muted ${u.deactivatedAt ? "opacity-70" : ""
                  }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar id={u.id} name={u.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {u.id === user?.id ? "You" : u.name}
                        </p>
                        {u.deactivatedAt && <InactiveBadge />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-6 py-4">
                  <DepartmentBadge department={u.department} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-6 py-4">{renderActions(u)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5}>{emptyState}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-muted px-4 py-4 text-sm text-muted-foreground sm:px-5">
        Showing {filtered.length} of {users.length} people
      </div>

      <EditEmployeeModal
        user={toEdit}
        departments={departments}
        currentUserId={currentUserId}
        canChangeRole={viewerRole === "ADMIN"}
        onClose={() => setToEdit(null)}
      />
      <ResetPasswordModal user={toReset} onClose={() => setToReset(null)} />
      <ConfirmActionModal action={confirm} onClose={() => setConfirm(null)} />
    </section>
  );
}