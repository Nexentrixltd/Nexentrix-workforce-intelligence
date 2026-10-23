"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  Clock,
  FileText,
  Users,
  Save,
  RotateCcw,
  LoaderCircle,
  Send,
  ClipboardCheck,
  CalendarClock,
} from "lucide-react";
import {
  disablePush,
  enablePush,
  getPushState,
  sendTestPush,
  syncPushSubscription,
  type PushState,
} from "@/lib/push-client";

const API = "/api/settings/notifications";
const QUERY_KEY = ["settings", "notifications"];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "reports-to-review": FileText,
  "report-reviews": ClipboardCheck,
  "project-assignments": Users,
  "project-deadlines": CalendarClock,
};

type Category = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

type NotificationSettings = {
  categories: Category[];
  dailyReminder: boolean | null; 
};

type Draft = {
  categories: Record<string, boolean>;
  dailyReminder: boolean | null;
};

const toDraft = (data: NotificationSettings): Draft => ({
  categories: Object.fromEntries(data.categories.map((c) => [c.id, c.enabled])),
  dailyReminder: data.dailyReminder,
});

const sameDraft = (a: Draft, b: Draft) =>
  a.dailyReminder === b.dailyReminder &&
  Object.keys(a.categories).length === Object.keys(b.categories).length &&
  Object.entries(a.categories).every(([id, on]) => b.categories[id] === on);

async function request<T>(
  url: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `Request failed (${res.status})`,
    );
  }
  return data as T;
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fca311] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-[#fca311]" : "bg-gray-300 dark:bg-gray-700"
        }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"
          }`}
      />
    </button>
  );
}

function Row({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5 p-5 transition hover:bg-muted md:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}

function CardHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-border p-5 md:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

const CARD_CLASS =
  "overflow-hidden rounded-2xl border border-border bg-card";

const PUSH_DESCRIPTIONS: Record<PushState | "loading", string> = {
  loading: "Checking this device...",
  on: "This device receives notifications even when Nexentrix is closed or in the background.",
  off: "Get notifications on this device even when Nexentrix is closed or in the background.",
  denied:
    "Blocked in your browser. Allow notifications for this site in your browser settings, then come back.",
  "needs-install":
    "On iPhone and iPad, add Nexentrix to your Home Screen first (Share, then Add to Home Screen), then open it from there to turn this on.",
  unsupported: "This browser does not support push notifications.",
  "not-configured": "Push notifications are not available right now.",
};

function PushNotificationsCard() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await getPushState();
      if (current === "on") await syncPushSubscription().catch(() => null);
      if (!cancelled) setState(current);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        await enablePush();
        toast.success("Push notifications are on for this device");
      } else {
        await disablePush();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update push notifications",
      );
    } finally {
      setState(await getPushState());
      setBusy(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      await sendTestPush();
      toast.success("Test notification sent. It should arrive in a few seconds.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the test notification",
      );
    } finally {
      setTesting(false);
    }
  }

  const canToggle = state === "on" || state === "off";

  return (
    <section className={CARD_CLASS}>
      <CardHeader
        title="This device"
        description="Changes here apply immediately and do not need saving."
      />

      <Row
        icon={BellRing}
        title="Push notifications"
        description={PUSH_DESCRIPTIONS[state]}
      >
        {busy ? (
          <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <Toggle
            checked={state === "on"}
            onChange={toggle}
            label="Push notifications on this device"
            disabled={!canToggle}
          />
        )}
      </Row>

      {state === "on" && (
        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="text-sm text-muted-foreground">
            Not seeing notifications? Send yourself a test.
          </p>
          <button
            type="button"
            onClick={test}
            disabled={testing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {testing ? "Sending..." : "Send test notification"}
          </button>
        </div>
      )}
    </section>
  );
}

const NotificationsSettingPage = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<NotificationSettings>({
    queryKey: QUERY_KEY,
    queryFn: () => request<NotificationSettings>(API),
  });

  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  const saved = data ? toDraft(data) : null;
  const dirty = !!draft && !!saved && !sameDraft(draft, saved);

  const saveMutation = useMutation({
    mutationFn: (d: Draft) =>
      request<NotificationSettings>(API, {
        method: "PATCH",
        body: {
          categories: d.categories,
          ...(d.dailyReminder !== null ? { dailyReminder: d.dailyReminder } : {}),
        },
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(QUERY_KEY, result);
      toast.success("Notification preferences saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setCategory = (id: string, enabled: boolean) =>
    setDraft((current) =>
      current
        ? { ...current, categories: { ...current.categories, [id]: enabled } }
        : current,
    );

  const handleReset = () =>
    setDraft((current) =>
      current
        ? {
          categories: Object.fromEntries(
            Object.keys(current.categories).map((id) => [id, true]),
          ),
          dailyReminder: current.dailyReminder === null ? null : true,
        }
        : current,
    );

  const saving = saveMutation.isPending;
  const hasAnything = !!data && (data.categories.length > 0 || data.dailyReminder !== null);

  return (
    <div className="w-full max-w-5xl space-y-8 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell size={22} />
            </div>

            <h1 className="font-triakis text-3xl tracking-tight md:text-4xl">
              Notifications
            </h1>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose which updates reach your notifications and how this browser
            alerts you.
          </p>
        </div>

        {hasAnything && (
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={15} />
            Reset defaults
          </button>
        )}
      </div>

      <section className={CARD_CLASS}>
        <CardHeader
          title="What you are notified about"
          description="Turn off a type and you will no longer receive it in your notifications."
        />

        {isLoading || (data && !draft) ? (
          <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading your preferences...
          </div>
        ) : isError || !data || !draft ? (
          <div className="space-y-3 p-6">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              Unable to load your notification preferences.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Try again
            </button>
          </div>
        ) : !hasAnything ? (
          <p className="p-6 text-sm text-muted-foreground">
            There are no notification types to manage for your role yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {data.dailyReminder !== null && draft.dailyReminder !== null && (
              <Row
                icon={Clock}
                title="Daily report reminder"
                description="Get a reminder on working days if you have not submitted your report, and a last warning before a missed day can no longer be submitted."
              >
                <Toggle
                  checked={draft.dailyReminder}
                  onChange={(checked) =>
                    setDraft((current) =>
                      current ? { ...current, dailyReminder: checked } : current,
                    )
                  }
                  label="Daily report reminder"
                  disabled={saving}
                />
              </Row>
            )}

            {data.categories.map((category) => (
              <Row
                key={category.id}
                icon={CATEGORY_ICONS[category.id] ?? Bell}
                title={category.title}
                description={category.description}
              >
                <Toggle
                  checked={draft.categories[category.id] ?? true}
                  onChange={(checked) => setCategory(category.id, checked)}
                  label={category.title}
                  disabled={saving}
                />
              </Row>
            ))}
          </div>
        )}
      </section>

      <PushNotificationsCard />

      {hasAnything && draft && (
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5 text-sm text-muted-foreground">
            {dirty && "You have unsaved changes."}
          </div>

          <button
            type="button"
            onClick={() => draft && saveMutation.mutate(draft)}
            disabled={!dirty || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving preferences..." : "Save preferences"}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsSettingPage;