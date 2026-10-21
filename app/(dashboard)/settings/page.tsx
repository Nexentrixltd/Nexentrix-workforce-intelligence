"use client";

import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const API = {
  settings: "/api/settings", 
  changePassword: "/api/auth/change-password",
  sessions: "/api/auth/sessions", 
  revokeSession: (id: string) => `/api/auth/sessions/${id}`,
  revokeOthers: "/api/auth/sessions/others",
};

const SETTINGS_KEY = ["account", "settings"];
const SESSIONS_KEY = ["auth", "sessions"];
const BROWSER_PREF_KEY = "nexentrix:browser-notifications";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Password" },
  { id: "sessions", label: "Devices" },
  { id: "notifications", label: "Notifications" },
];

type Role = "ADMIN" | "HR" | "TEAM_LEAD" | "STAFF" | "EXECUTIVE";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  HR: "HR",
  TEAM_LEAD: "Team lead",
  STAFF: "Staff",
  EXECUTIVE: "Executive",
};

// Add a feature here, then wrap its UI in can("feature", role).
// This only controls what is shown. The API must enforce the same rule.
const ACCESS: Record<string, Role[]> = {
  dailyReminder: ["STAFF"],
  departmentRow: ["STAFF", "TEAM_LEAD", "HR"],
};

function can(feature: keyof typeof ACCESS, role?: Role) {
  return !!role && ACCESS[feature].includes(role);
}

// Who the person should contact to change their own details
function profileNote(role: Role) {
  if (role === "ADMIN") return null;
  if (role === "HR" || role === "EXECUTIVE")
    return "Your name, email and role are managed by an admin. Contact them if something is wrong.";
  return "Your name, email and department are managed by HR. Contact them if something is wrong.";
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type Settings = {
  name: string;
  email: string;
  role: Role;
  department: string | null;
  memberSince: string;
  reminderEnabled: boolean | null; 
};

type SessionItem = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  current: boolean;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

class ApiError extends Error {
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    if (err && typeof err === "object")
      throw new ApiError("Please check the highlighted fields.", err);
    throw new ApiError(
      typeof err === "string" ? err : `Request failed (${res.status})`,
    );
  }
  return data as T;
}

function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => request<Settings>(API.settings),
  });
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function describeAgent(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  // Android UAs contain "Linux" and iPhone UAs contain "Mac OS X", so check those first.
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";
  return `${browser} on ${os}`;
}

/* -------------------------------------------------------------------------- */
/* Small UI pieces                                                             */
/* -------------------------------------------------------------------------- */

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-red-500";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border border-border bg-muted"
    >
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-black/10 dark:bg-white/10" />
      ))}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{message}</p>;
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-black/20 dark:bg-white/20"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

function ProfileSection() {
  const { data, isLoading, isError } = useSettings();

  const showDepartment = data
    ? can("departmentRow", data.role) || !!data.department
    : false;
  const note = data ? profileNote(data.role) : null;

  return (
    <Section
      id="profile"
      title="Profile"
      description="How you appear to your team."
    >
      {isLoading ? (
        <Skeleton lines={4} />
      ) : isError || !data ? (
        <ErrorNote message="Could not load your profile." />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
              {initials(data.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-text-primary">
                {data.name}
              </p>
              <p className="truncate text-sm text-muted-foreground">{data.email}</p>
            </div>
          </div>

          <dl
            className={`mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 ${
              showDepartment ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
            <div>
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd className="mt-0.5 text-sm font-medium text-text-primary">
                {ROLE_LABELS[data.role] ?? data.role}
              </dd>
            </div>
            {showDepartment && (
              <div>
                <dt className="text-sm text-muted-foreground">Department</dt>
                <dd className="mt-0.5 text-sm font-medium text-text-primary">
                  {data.department ?? "Not assigned"}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Member since</dt>
              <dd className="mt-0.5 text-sm font-medium text-text-primary">
                {formatDate(data.memberSince)}
              </dd>
            </div>
          </dl>

          {note && <p className="mt-5 text-sm text-muted-foreground">{note}</p>}
        </>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Password                                                                    */
/* -------------------------------------------------------------------------- */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one",
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function PasswordField({
  id,
  label,
  autoComplete,
  error,
  registration,
}: {
  id: string;
  label: string;
  autoComplete: string;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`${INPUT_CLASS} pr-16`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function PasswordSection() {
  const queryClient = useQueryClient();
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: (values: PasswordForm) =>
      request(API.changePassword, {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      }),
    onSuccess: () => {
      toast.success("Password updated");
      form.reset();
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.fieldErrors) {
        let handled = false;
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (
            field === "currentPassword" ||
            field === "newPassword" ||
            field === "confirmPassword"
          ) {
            form.setError(field, { message: messages[0] });
            handled = true;
          }
        }
        if (handled) return;
      }
      toast.error(err instanceof Error ? err.message : "Could not update password");
    },
  });

  return (
    <Section
      id="password"
      title="Password"
      description="Use a password you don't use anywhere else."
    >
      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="max-w-md space-y-4"
        noValidate
      >
        <PasswordField
          id="currentPassword"
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          registration={form.register("currentPassword")}
        />
        <PasswordField
          id="newPassword"
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          registration={form.register("newPassword")}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          registration={form.register("confirmPassword")}
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? "Updating..." : "Update password"}
        </button>
      </form>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Devices and sessions                                                        */
/* -------------------------------------------------------------------------- */

function SessionsSection() {
  const queryClient = useQueryClient();
  const [confirmOthers, setConfirmOthers] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: () => request<SessionItem[]>(API.sessions),
  });

  const revokeOne = useMutation({
    mutationFn: (id: string) => request(API.revokeSession(id), { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Device logged out");
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not log out that device"),
  });

  const revokeOthers = useMutation({
    mutationFn: () => request(API.revokeOthers, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Logged out of all other devices");
      setConfirmOthers(false);
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
    onError: (err: unknown) => {
      setConfirmOthers(false);
      toast.error(err instanceof Error ? err.message : "Could not log out other devices");
    },
  });

  const sessions = Array.isArray(sessionsQuery.data)
  ? sessionsQuery.data
  : [];

const hasOthers = sessions.some((s) => !s.current);

  return (
    <Section
      id="sessions"
      title="Devices"
      description="Where you are currently logged in. Log out of any device you don't recognise."
    >
      {sessionsQuery.isLoading ? (
        <Skeleton lines={3} />
      ) : sessionsQuery.isError ? (
        <ErrorNote message="Could not load your devices." />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active sessions found.</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">
                      {describeAgent(s.userAgent)}
                    </p>
                    {s.current && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    {s.ip && <span>{s.ip}</span>}
                    <span>Active {timeAgo(s.lastActiveAt ?? s.createdAt)}</span>
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revokeOne.mutate(s.id)}
                    disabled={revokeOne.isPending}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:hover:bg-white/5"
                  >
                    Log out
                  </button>
                )}
              </li>
            ))}
          </ul>

          {hasOthers && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() =>
                  confirmOthers ? revokeOthers.mutate() : setConfirmOthers(true)
                }
                disabled={revokeOthers.isPending}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 dark:text-red-400"
              >
                {revokeOthers.isPending
                  ? "Logging out..."
                  : confirmOthers
                    ? "Click again to confirm"
                    : "Log out of all other devices"}
              </button>
              {confirmOthers && !revokeOthers.isPending && (
                <button
                  type="button"
                  onClick={() => setConfirmOthers(false)}
                  className="text-sm font-medium text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

function NotificationsSection() {
  const queryClient = useQueryClient();
  const settingsQuery = useSettings();
  const role = settingsQuery.data?.role;

  // Daily reminder (saved on the server, STAFF only)
  const reminderMutation = useMutation({
    mutationFn: (reminderEnabled: boolean) =>
      request(API.settings, { method: "PATCH", body: { reminderEnabled } }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = queryClient.getQueryData<Settings>(SETTINGS_KEY);
      if (previous)
        queryClient.setQueryData<Settings>(SETTINGS_KEY, {
          ...previous,
          reminderEnabled: next,
        });
      return { previous };
    },
    onError: (err, _next, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(SETTINGS_KEY, ctx.previous);
      toast.error(err instanceof Error ? err.message : "Could not save your preference");
    },
  });

  // Browser notifications (per device, saved in this browser)
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [browserOn, setBrowserOn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
    try {
      setBrowserOn(
        localStorage.getItem(BROWSER_PREF_KEY) === "1" &&
          Notification.permission === "granted",
      );
    } catch {
      /* storage unavailable */
    }
  }, []);

  async function toggleBrowser(next: boolean) {
    if (!next) {
      try {
        localStorage.removeItem(BROWSER_PREF_KEY);
      } catch {
        /* ignore */
      }
      setBrowserOn(false);
      return;
    }
    let result = Notification.permission;
    if (result === "default") result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      try {
        localStorage.setItem(BROWSER_PREF_KEY, "1");
      } catch {
        /* ignore */
      }
      setBrowserOn(true);
      toast.success("Browser notifications are on for this device");
    } else {
      toast.error("Browser notifications were not allowed");
    }
  }

  const browserDescription = !supported
    ? "This browser does not support notifications."
    : permission === "denied"
      ? "Blocked in your browser. Allow notifications for this site in your browser settings, then come back."
      : "Get a pop-up on this device when something needs your attention. This setting only applies to this browser.";

  return (
    <Section
      id="notifications"
      title="Notifications"
      description="Choose how Nexentrix keeps you on track."
    >
      <div className="divide-y divide-border">
        {can("dailyReminder", role) && (
          <SettingRow
            title="Daily report reminder"
            description="Get reminded on working days if you haven't submitted your report yet."
          >
            <Switch
              label="Daily report reminder"
              checked={settingsQuery.data?.reminderEnabled ?? true}
              disabled={settingsQuery.isError}
              onChange={(next) => reminderMutation.mutate(next)}
            />
          </SettingRow>
        )}

        <SettingRow title="Browser notifications" description={browserDescription}>
          <Switch
            label="Browser notifications"
            checked={browserOn}
            disabled={!supported || permission === "denied"}
            onChange={toggleBrowser}
          />
        </SettingRow>

        <SettingRow
          title="In-app notifications"
          description="Report reviews, project assignments and other updates always appear in your notifications."
        >
          <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Always on
          </span>
        </SettingRow>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, security and notifications.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[170px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-6 space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-text-primary"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <ProfileSection />
          <SessionsSection />
          <NotificationsSection />
        </div>
      </div>
    </div>
  );
}