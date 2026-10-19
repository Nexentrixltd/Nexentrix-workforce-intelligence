"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Bell,
    Briefcase,
    CheckCheck,
    CheckCircle2,
    FileText,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { getPusher } from "@/lib/pusher/client";

type Notif = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: string | null;
    createdAt: string;
};
type Data = { items: Notif[]; unreadCount: number };

// Which cached lists to refresh when a notification of this kind arrives
const REFRESH: Record<string, string[]> = {
    REPORT_SUBMITTED: ["reports"],
    REPORT_APPROVED: ["reports"],
    REPORT_REJECTED: ["reports"],
    PROJECT_ADDED: ["my-projects", "admin-projects", "admin-project"],
    PROJECT_REMOVED: ["my-projects", "admin-projects", "admin-project"],
    PROJECT_LEAD_ASSIGNED: ["my-projects", "admin-projects", "admin-project"],
};

const ICONS: Record<string, { Icon: LucideIcon; tone: string }> = {
    REPORT_SUBMITTED: { Icon: FileText, tone: "bg-primary/10 text-primary" },
    REPORT_APPROVED: {
        Icon: CheckCircle2,
        tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    REPORT_REJECTED: {
        Icon: XCircle,
        tone: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    PROJECT_ADDED: { Icon: Briefcase, tone: "bg-primary/10 text-primary" },
    PROJECT_REMOVED: { Icon: Briefcase, tone: "bg-muted text-muted-foreground" },
    PROJECT_LEAD_ASSIGNED: { Icon: Briefcase, tone: "bg-primary/10 text-primary" },
};
const FALLBACK = { Icon: Bell, tone: "bg-muted text-muted-foreground" };

function timeAgo(iso: string) {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 60) return "Just now";
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    return rtf.format(Math.round(diff / 86400), "day");
}

const fullDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export function NotificationBell({ userId }: { userId: string }) {
    const qc = useQueryClient();
    const router = useRouter();

    const [open, setOpen] = useState(false); // what the person asked for
    const [mounted, setMounted] = useState(false); // keeps the panel in the DOM while it slides out
    const [shown, setShown] = useState(false); // drives the slide animation
    const [tab, setTab] = useState<"all" | "unread">("all");

    const bellRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const { data, isLoading } = useQuery<Data>({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await fetch("/api/notifications");
            if (!res.ok) throw new Error("Failed to load notifications");
            return res.json();
        },
        refetchInterval: 60_000, // safety net if a live push is ever missed
        refetchOnWindowFocus: true,
    });

    // Live updates
    useEffect(() => {
        const pusher = getPusher();
        if (!pusher) return;

        const name = `private-user-${userId}`;
        const channel = pusher.subscribe(name);

        const onNotification = (n: Notif) => {
            qc.setQueryData<Data>(["notifications"], (old) => {
                if (!old) return old;
                if (old.items.some((i) => i.id === n.id)) return old;
                return {
                    items: [n, ...old.items].slice(0, 30),
                    unreadCount: old.unreadCount + 1,
                };
            });
            qc.invalidateQueries({ queryKey: ["notifications"] });

            for (const key of REFRESH[n.type] ?? [])
                qc.invalidateQueries({ queryKey: [key] });

            toast(n.title, {
                description: n.body ?? undefined,
                action: n.href
                    ? { label: "View", onClick: () => router.push(n.href!) }
                    : undefined,
            });
        };

        channel.bind("notification", onNotification);
        return () => {
            channel.unbind("notification", onNotification);
            pusher.unsubscribe(name);
        };
    }, [userId, qc, router]);

    // Mount first, then slide in; slide out, then unmount
    useEffect(() => {
        if (open) {
            setMounted(true);
            const t = setTimeout(() => setShown(true), 15);
            return () => clearTimeout(t);
        }
        setShown(false);
        const t = setTimeout(() => setMounted(false), 300);
        return () => clearTimeout(t);
    }, [open]);

    // While open: lock page scroll, move focus in, keep Tab inside, close on Escape
    useEffect(() => {
        if (!open) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                return;
            }
            if (e.key !== "Tab" || !panelRef.current) return;
            const focusable = panelRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKey);
            bellRef.current?.focus();
        };
    }, [open]);

    async function markRead(body: { ids: string[] } | { all: true }) {
        // Update the screen first, then tell the server
        qc.setQueryData<Data>(["notifications"], (old) => {
            if (!old) return old;
            const now = new Date().toISOString();
            const items = old.items.map((i) =>
                ("all" in body || body.ids.includes(i.id)) && !i.readAt
                    ? { ...i, readAt: now }
                    : i,
            );
            return {
                items,
                unreadCount: items.filter((i) => !i.readAt).length,
            };
        });
        try {
            const res = await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error();
        } catch {
            qc.invalidateQueries({ queryKey: ["notifications"] });
        }
    }

    function openItem(n: Notif) {
        if (!n.readAt) markRead({ ids: [n.id] });
        setOpen(false);
        if (n.href) router.push(n.href);
    }

    const unread = data?.unreadCount ?? 0;
    const all = data?.items ?? [];
    const list = tab === "unread" ? all.filter((n) => !n.readAt) : all;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const at = (n: Notif) => new Date(n.createdAt);
    const today = list.filter((n) => at(n) >= startOfToday);
    const yesterday = list.filter(
        (n) => at(n) >= startOfYesterday && at(n) < startOfToday,
    );
    const earlier = list.filter((n) => at(n) < startOfYesterday);

    function renderGroup(label: string, group: Notif[]) {
        if (group.length === 0) return null;
        return (
            <section>
                <h3 className="sticky top-0 z-10 bg-card/90 px-5 py-2 text-xs font-medium text-muted-foreground backdrop-blur">
                    {label}
                </h3>
                <ul className="space-y-1 px-3 pb-3">
                    {group.map((n) => {
                        const { Icon, tone } = ICONS[n.type] ?? FALLBACK;
                        const isUnread = !n.readAt;
                        return (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => openItem(n)}
                                    className={`relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${isUnread
                                            ? "bg-primary/5 hover:bg-primary/10"
                                            : "hover:bg-muted"
                                        }`}
                                >
                                    {isUnread && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute bottom-3 left-0 top-3 w-0.75 rounded-full bg-primary"
                                        />
                                    )}

                                    <span
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
                                        aria-hidden="true"
                                    >
                                        <Icon size={18} />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-3">
                                            <span
                                                className={`text-sm leading-snug ${isUnread
                                                        ? "font-semibold text-text-primary"
                                                        : "text-muted-foreground"
                                                    }`}
                                            >
                                                {isUnread && <span className="sr-only">Unread. </span>}
                                                {n.title}
                                            </span>
                                            <time
                                                dateTime={n.createdAt}
                                                title={fullDate(n.createdAt)}
                                                className="shrink-0 pt-0.5 text-xs text-muted-foreground"
                                            >
                                                {timeAgo(n.createdAt)}
                                            </time>
                                        </span>
                                        {n.body && (
                                            <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted-foreground">
                                                {n.body}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    }

    const EmptyIcon = tab === "unread" ? CheckCheck : Bell;

    return (
        <>
            <button
                ref={bellRef}
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={
                    unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
                <Bell size={20} />
                {unread > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-background">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {mounted &&
                createPortal(
                    <div className="fixed inset-0 z-50">
                        {/* Backdrop */}
                        <div
                            aria-hidden="true"
                            onClick={() => setOpen(false)}
                            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"
                                }`}
                        />

                        {/* Panel */}
                        <aside
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="notifications-title"
                            className={`absolute right-0 top-0 flex h-full w-104 max-w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:right-3 sm:top-3 sm:h-[calc(100%-1.5rem)] sm:rounded-2xl sm:border ${shown
                                    ? "translate-x-0"
                                    : "translate-x-full sm:translate-x-[calc(100%+1rem)]"
                                }`}
                        >
                            <header className="px-5 pt-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <h2
                                            id="notifications-title"
                                            className="text-lg font-semibold text-text-primary"
                                        >
                                            Notifications
                                        </h2>
                                        {unread > 0 && (
                                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        ref={closeRef}
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        aria-label="Close notifications"
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Segmented tabs */}
                                <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                                    {(
                                        [
                                            ["all", "All", all.length],
                                            ["unread", "Unread", unread],
                                        ] as const
                                    ).map(([value, label, count]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={tab === value}
                                            onClick={() => setTab(value)}
                                            className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${tab === value
                                                    ? "bg-card font-semibold text-text-primary shadow-sm"
                                                    : "text-muted-foreground hover:text-text-primary"
                                                }`}
                                        >
                                            {label}
                                            <span
                                                className={`rounded-full px-1.5 text-xs tabular-nums ${tab === value
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground"
                                                    }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between py-3">
                                    <p className="text-sm text-muted-foreground">
                                        {unread > 0 ? `${unread} unread` : "You're all caught up"}
                                    </p>
                                    {unread > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => markRead({ all: true })}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                                        >
                                            <CheckCheck size={16} />
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                            </header>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto border-t border-border">
                                {isLoading && !data ? (
                                    <ul className="space-y-1 px-3 py-3" aria-hidden="true">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <li key={i} className="flex gap-3 rounded-xl px-3 py-3">
                                                <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                                                <div className="flex-1 space-y-2 pt-1">
                                                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                                                    <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : list.length === 0 ? (
                                    <div className="px-5 py-16 text-center">
                                        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                                            <span className="absolute inset-0 rounded-full bg-primary/5" />
                                            <span className="absolute inset-3 rounded-full bg-primary/10" />
                                            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border">
                                                <EmptyIcon size={22} />
                                            </span>
                                        </div>
                                        <p className="mt-5 text-sm font-semibold text-text-primary">
                                            {tab === "unread" ? "Nothing unread" : "No notifications yet"}
                                        </p>
                                        <p className="mx-auto mt-1 max-w-[16rem] text-sm text-muted-foreground">
                                            {tab === "unread"
                                                ? "You've seen everything. New activity will land here."
                                                : "Report reviews, project changes and updates will show up here as they happen."}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {renderGroup("Today", today)}
                                        {renderGroup("Yesterday", yesterday)}
                                        {renderGroup("Earlier", earlier)}
                                        {all.length >= 30 && tab === "all" && (
                                            <p className="px-5 pb-5 pt-2 text-center text-xs text-muted-foreground">
                                                Showing your latest 30 notifications.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>,
                    document.body,
                )}
        </>
    );
}