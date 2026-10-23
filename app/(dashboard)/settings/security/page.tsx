"use client";

import React, { useState } from "react";
import {
    useForm,
    type SubmitHandler,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Clock3,
    Eye,
    EyeOff,
    KeyRound,
    Laptop,
    Loader2,
    Monitor,
    Shield,
    ShieldCheck,
    Smartphone,
    Trash2,
} from "lucide-react";

const API = {
    password: "/api/settings/password",
    sessions: "/api/settings/sessions",
    session: (id: string) => `/api/settings/sessions/${id}`,
};

const SESSIONS_KEY = ["settings", "sessions"] as const;

type SessionItem = {
    id: string;
    userAgent: string | null;
    ip: string | null;
    createdAt: string;
    current: boolean;
};

type ApiError = {
    message?: string;
};

async function request<T>(
    url: string,
    init?: RequestInit,
): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            (data as ApiError).message || "Something went wrong.",
        );
    }

    return data as T;
}

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor(
        (Date.now() - date.getTime()) / 1000,
    );

    if (Number.isNaN(seconds) || seconds < 0) {
        return "Recently";
    }

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
        return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
        return `${months} month${months === 1 ? "" : "s"} ago`;
    }

    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? "" : "s"} ago`;
}

function isMobileAgent(userAgent: string | null) {
    return /android|iphone|ipad|mobile/i.test(userAgent || "");
}

function describeAgent(userAgent: string | null) {
    if (!userAgent) return "Unknown device";

    if (/windows/i.test(userAgent)) return "Windows device";
    if (/macintosh|mac os/i.test(userAgent)) return "Mac device";
    if (/android/i.test(userAgent)) return "Android device";
    if (/iphone|ipad|ios/i.test(userAgent)) return "Apple mobile device";
    if (/linux/i.test(userAgent)) return "Linux device";

    return "Unknown device";
}

function formatUserAgent(userAgent: string | null) {
    if (!userAgent) return "Unknown browser";

    let browser = "Unknown browser";
    let version = "";

    if (/Edg\//i.test(userAgent)) {
        browser = "Microsoft Edge";
        version = userAgent.match(/Edg\/([\d.]+)/i)?.[1] ?? "";
    } else if (/OPR\//i.test(userAgent)) {
        browser = "Opera";
        version = userAgent.match(/OPR\/([\d.]+)/i)?.[1] ?? "";
    } else if (/Firefox\//i.test(userAgent)) {
        browser = "Firefox";
        version = userAgent.match(/Firefox\/([\d.]+)/i)?.[1] ?? "";
    } else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
        browser = "Google Chrome";
        version = userAgent.match(/Chrome\/([\d.]+)/i)?.[1] ?? "";
    } else if (/Safari\//i.test(userAgent) && /Version\//i.test(userAgent)) {
        browser = "Safari";
        version = userAgent.match(/Version\/([\d.]+)/i)?.[1] ?? "";
    }

    const os = /Windows NT/i.test(userAgent)
        ? "Windows"
        : /Android/i.test(userAgent)
            ? "Android"
            : /iPhone|iPad|iPod/i.test(userAgent)
                ? "iOS"
                : /Mac OS X|Macintosh/i.test(userAgent)
                    ? "macOS"
                    : /Linux/i.test(userAgent)
                        ? "Linux"
                        : "Unknown OS";

    return `${browser}${version ? ` ${version.split(".")[0]}` : ""} · ${os}`;
}

function passwordStrength(password: string) {
    if (!password) {
        return {
            score: 0,
            label: "Not entered",
            color: "bg-border",
        };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        score++;
    }
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
        return {
            score: 1,
            label: "Weak",
            color: "bg-destructive",
        };
    }

    if (score <= 3) {
        return {
            score: 2,
            label: "Fair",
            color: "bg-amber-500",
        };
    }

    return {
        score: 3,
        label: "Strong",
        color: "bg-emerald-500",
    };
}

const passwordSchema = z
    .object({
        currentPassword: z
            .string()
            .min(1, "Enter your current password."),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(128, "Password must not exceed 128 characters."),
        confirmPassword: z
            .string()
            .min(1, "Confirm your new password."),
    })
    .refine(
        (values) => values.newPassword === values.confirmPassword,
        {
            message: "Passwords do not match.",
            path: ["confirmPassword"],
        },
    )
    .refine(
        (values) => values.currentPassword !== values.newPassword,
        {
            message: "Your new password must be different.",
            path: ["newPassword"],
        },
    );

type PasswordFormValues = z.infer<typeof passwordSchema>;

function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-base font-semibold tracking-tight">
                    {title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

function PasswordField({
    label,
    name,
    register,
    error,
    placeholder,
    autoComplete,
}: {
    label: string;
    name: keyof PasswordFormValues;
    register: ReturnType<
        typeof useForm<PasswordFormValues>
    >["register"];
    error?: string;
    placeholder: string;
    autoComplete: string;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="min-w-0 space-y-2">
            <label
                htmlFor={name}
                className="block text-sm font-medium"
            >
                {label}
            </label>

            <div className="relative">
                <input
                    id={name}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    {...register(name)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${name}-error` : undefined}
                    className={`h-11 w-full min-w-0 rounded-xl border bg-background px-3.5 pr-11 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 ${error ? "border-destructive" : "border-border"
                        }`}
                />

                <button
                    type="button"
                    onClick={() => setVisible((value) => !value)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    {visible ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </button>
            </div>

            {error && (
                <p
                    id={`${name}-error`}
                    className="text-xs text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

function ChangePasswordCard() {
    const queryClient = useQueryClient();

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
        mode: "onTouched",
    });

    const newPassword = form.watch("newPassword");
    const strength = passwordStrength(newPassword);

    const mutation = useMutation({
        mutationFn: (values: PasswordFormValues) =>
            request<{ message?: string }>(API.password, {
                method: "POST",
                body: JSON.stringify({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                }),
            }),

        onSuccess: (data) => {
            toast.success(data.message || "Password updated successfully.");
            form.reset();
            queryClient.invalidateQueries({
                queryKey: SESSIONS_KEY,
            });
        },

        onError: (error: Error) => {
            toast.error(error.message || "Unable to update password.");
        },
    });

    const onSubmit: SubmitHandler<PasswordFormValues> = (
        values,
    ) => {
        mutation.mutate(values);
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-5 sm:p-6">
                <SectionHeader
                    icon={KeyRound}
                    title="Change password"
                    description="Update your password regularly to help keep your account secure."
                />
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div className="sm:col-span-2">
                        <PasswordField
                            label="Current password"
                            name="currentPassword"
                            register={form.register}
                            error={form.formState.errors.currentPassword?.message}
                            placeholder="Enter your current password"
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="min-w-0">
                        <PasswordField
                            label="New password"
                            name="newPassword"
                            register={form.register}
                            error={form.formState.errors.newPassword?.message}
                            placeholder="Enter a new password"
                            autoComplete="new-password"
                        />

                        {newPassword && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted-foreground">
                                        Password strength
                                    </span>

                                    <span className="text-xs font-medium">
                                        {strength.label}
                                    </span>
                                </div>

                                <div className="flex gap-1.5">
                                    {[1, 2, 3].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1.5 flex-1 rounded-full ${strength.score >= level
                                                ? strength.color
                                                : "bg-border"
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <PasswordField
                            label="Confirm new password"
                            name="confirmPassword"
                            register={form.register}
                            error={form.formState.errors.confirmPassword?.message}
                            placeholder="Confirm your new password"
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 sm:col-span-2">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                        <p className="text-xs leading-5 text-muted-foreground">
                            Use at least 8 characters. A combination of uppercase
                            and lowercase letters, numbers, and symbols is
                            recommended.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-xs text-muted-foreground">
                        You may need to sign in again on other devices.
                    </p>

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Updating password...
                            </>
                        ) : (
                            <>
                                <Check className="size-4" />
                                Update password
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}

const securityChecklist = [
    {
        icon: CheckCircle2,
        title: "Use a strong password",
        description:
            "Use a unique password that you do not use on other websites.",
    },
    {
        icon: Smartphone,
        title: "Review your devices",
        description:
            "Remove sessions from devices you no longer recognize or use.",
    },
    {
        icon: ShieldCheck,
        title: "Keep your account private",
        description:
            "Never share your password or verification details with anyone.",
    },
];

function SecurityChecklistCard() {
    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-5 sm:p-6">
                <SectionHeader
                    icon={Shield}
                    title="Security checklist"
                    description="A few simple habits can help protect your Nexentrix account."
                />
            </div>

            <div className="divide-y divide-border">
                {securityChecklist.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={item.title}
                            className="flex items-start gap-4 p-5 sm:px-6"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/5 bg-primary/5 text-muted-foreground">
                                <Icon className="size-4.5 text-primary" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="text-sm font-medium">
                                    {item.title}
                                </h3>

                                <p className="text-sm leading-6 text-muted-foreground">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function DevicesCard() {
    const queryClient = useQueryClient();

    const sessionsQuery = useQuery({
        queryKey: SESSIONS_KEY,
        queryFn: async (): Promise<SessionItem[]> => {
            const data = await request<unknown>(API.sessions);

            if (Array.isArray(data)) {
                return data as SessionItem[];
            }

            if (
                typeof data === "object" &&
                data !== null &&
                "sessions" in data &&
                Array.isArray(data.sessions)
            ) {
                return data.sessions as SessionItem[];
            }

            return [];
        },
    });

    const sessions: SessionItem[] = sessionsQuery.data ?? [];

    const hasOthers = sessions.some(
        (session) => !session.current,
    );

    const deleteSessionMutation = useMutation({
        mutationFn: (id: string) =>
            request<{ message?: string }>(API.session(id), {
                method: "DELETE",
            }),

        onSuccess: (data) => {
            toast.success(data.message || "Session removed.");
            queryClient.invalidateQueries({
                queryKey: SESSIONS_KEY,
            });
        },

        onError: (error: Error) => {
            toast.error(error.message || "Unable to remove session.");
        },
    });

    const revokeOtherSessionsMutation = useMutation({
        mutationFn: () =>
            request<{ message?: string }>(API.sessions, {
                method: "DELETE",
            }),

        onSuccess: (data) => {
            toast.success(data.message || "Other sessions signed out.");
            queryClient.invalidateQueries({
                queryKey: SESSIONS_KEY,
            });
        },

        onError: (error: Error) => {
            toast.error(error.message || "Unable to sign out other sessions.");
        },
    });

    const isRevoking =
        deleteSessionMutation.isPending ||
        revokeOtherSessionsMutation.isPending;

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <SectionHeader
                    icon={Monitor}
                    title="Active devices"
                    description="Review devices that have signed in to your account."
                />

                {sessions.some((session) => hasOthers) && (
                    <button
                        type="button"
                        onClick={() => {
                            if (
                                window.confirm(
                                    "Sign out all other devices? Your current session will remain active.",
                                )
                            ) {
                                revokeOtherSessionsMutation.mutate();
                            }
                        }}
                        disabled={isRevoking}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                    >
                        {revokeOtherSessionsMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <LogOutIcon />
                        )}
                        Sign out others
                    </button>
                )}
            </div>

            {sessionsQuery.isPending ? (
                <div className="space-y-4 p-5 sm:p-6">
                    {[1, 2].map((item) => (
                        <div
                            key={item}
                            className="flex animate-pulse items-center gap-4"
                        >
                            <div className="size-11 rounded-xl bg-muted" />

                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-36 rounded bg-muted" />
                                <div className="h-3 w-48 max-w-full rounded bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : sessionsQuery.isError ? (
                <div className="flex flex-col items-start gap-3 p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="size-4 text-destructive" />
                        Unable to load active devices
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {(sessionsQuery.error as Error).message ||
                            "Please try again."}
                    </p>

                    <button
                        type="button"
                        onClick={() => sessionsQuery.refetch()}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-3 text-sm font-medium transition hover:bg-muted"
                    >
                        Try again
                    </button>
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-border bg-muted">
                        <Laptop className="size-5 text-muted-foreground" />
                    </div>

                    <h3 className="text-sm font-medium">
                        No active sessions found
                    </h3>

                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                        Your active devices will appear here when available.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {sessions.map((session) => {
                        const mobile = isMobileAgent(session.userAgent);
                        const DeviceIcon = mobile ? Smartphone : Laptop;

                        return (
                            <div
                                key={session.id}
                                className="flex items-start gap-3.5 p-5 sm:items-center sm:gap-4 sm:px-6"
                            >
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/5 bg-primary/5 ">
                                    <DeviceIcon className="size-5 text-primary" />
                                </div>

                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-bold">
                                            {describeAgent(session.userAgent)}
                                        </h3>
                                    </div>

                                    <p className="wrap-break-word text-xs leading-5 text-muted-foreground">
                                        {formatUserAgent(session.userAgent)}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {session.ip && (
                                            <p> <span className="text-text-primary font-semibold">IP:</span> {session.ip}</p>
                                        )}

                                        <span className="inline-flex items-center gap-1">
                                            <Clock3 className="size-3.5" />
                                            {timeAgo(session.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {!session.current ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    "Are you sure you want to remove this session?",
                                                )
                                            ) {
                                                deleteSessionMutation.mutate(session.id);
                                            }
                                        }}
                                        disabled={isRevoking}
                                        aria-label="Remove session"
                                        title="Remove session"
                                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {deleteSessionMutation.isPending &&
                                            deleteSessionMutation.variables === session.id ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-4" />
                                        )}
                                    </button>
                                ) : (

                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                        This device
                                    </span>

                                )
                                }
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="border-t border-border bg-muted/20 px-5 py-4 sm:px-6">
                <p className="text-xs leading-5 text-muted-foreground">
                    If you see a device you do not recognize, remove its session
                    and change your password immediately.
                </p>
            </div>
        </section>
    );
}

function LogOutIcon() {
    return <Trash2 className="size-4" />;
}

export default function SecuritySettingsPage() {
    return (
        <main className="w-full max-w-5xl space-y-6 p-4 sm:space-y-8 sm:p-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ShieldCheck size={22} />
                    </div>

                    <h1 className="font-triakis text-3xl tracking-tight md:text-4xl">
                        Security Settings
                    </h1>
                </div>

                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Manage your password and review the devices connected to
                    your account.
                </p>
            </header>

            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <ShieldCheck className="size-5 text-primary" />

                <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold">
                        Keep your account secure
                    </h2>

                    <p className="text-sm leading-6 text-muted-foreground">
                        Use a strong, unique password and review your active
                        sessions regularly to help protect your account.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <ChangePasswordCard />
                <SecurityChecklistCard />
                <DevicesCard />
            </div>
        </main>
    );
}
