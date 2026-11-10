"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, Lock } from "lucide-react";

export function RevealAccountNumber({
    userId,
    masked,
}: {
    userId: string;
    masked: string | null;
}) {
    const [value, setValue] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    async function reveal() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/staff/${userId}/records/reveal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field: "payroll.accountNumber" }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || typeof data.value !== "string") {
                setError(data.error ?? "Could not reveal the number.");
                return;
            }
            setValue(data.value);
            setConfirming(false);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setValue(null), 30_000);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function hide() {
        clearTimeout(timer.current);
        setValue(null);
        setCopied(false);
    }

    async function copy() {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    }

    if (value) {
        return (
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-background px-3 py-1.5 font-mono text-base font-semibold tracking-wider ring-1 ring-border">
                        {value}
                    </span>
                    <button
                        type="button"
                        onClick={copy}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                        type="button"
                        onClick={hide}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <EyeOff className="h-3.5 w-3.5" />
                        Hide
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Hides automatically in 30 seconds. This view was recorded in the access log.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-sm font-semibold">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    {masked ?? "—"}
                </span>

                {confirming ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Show the full number? This is recorded.
                        </span>
                        <button
                            type="button"
                            onClick={reveal}
                            disabled={loading}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                        >
                            {loading ? "Revealing…" : "Yes, reveal"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Reveal
                    </button>
                )}
            </div>

            {error ? (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    );
}