import type { ReactNode } from "react";
import type { DetailStatus } from "@prisma/client";

export const inputClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15";

export const primaryButton =
    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-base font-medium text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60";

export const secondaryButton =
    "inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60";

type BadgeStatus = DetailStatus | "ADDED" | null | undefined;

const BADGES: Record<DetailStatus | "ADDED" | "MISSING", { label: string; className: string }> = {
    MISSING: { label: "Not added", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    ADDED: { label: "Added", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
    PENDING: { label: "Pending review", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
    VERIFIED: { label: "Verified", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

export function StatusBadge({ status, length }: { status: BadgeStatus; length?: number }) {
    const b = BADGES[status ?? "MISSING"];
    return (
        <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium ${b.className}`}>
            {b.label}
            {length !== undefined && length > 0 ? (
                <span className="ml-2">
                    {length} / 5
                </span>
            ) : null}
        </span>
    );
}

const BANNERS: Record<DetailStatus, { text: string; className: string }> = {
    PENDING: {
        text: "Waiting for HR to review. You can still edit this.",
        className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    },
    VERIFIED: {
        text: "Verified by HR. Editing it will send it back for review.",
        className: "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
    },
    REJECTED: {
        text: "HR rejected this record. Please fix it and save again.",
        className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
    },
};

export function ReviewBanner({
    status,
    note,
}: {
    status?: DetailStatus | null;
    note?: string | null;
}) {
    if (!status) return null;
    const b = BANNERS[status];
    return (
        <div className={`mb-5 rounded-md border px-3 py-2 text-sm ${b.className}`}>
            <p className="font-medium">{b.text}</p>
            {status === "REJECTED" && note ? <p className="mt-1">Note from HR: {note}</p> : null}
        </div>
    );
}

export function FormMessage({
    message,
}: {
    message: { type: "success" | "error"; text: string } | null;
}) {
    if (!message) return null;
    return (
        <p
            role={message.type === "error" ? "alert" : "status"}
            className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600 dark:text-green-400"
                }`}
        >
            {message.text}
        </p>
    );
}

export function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border border-border bg-card p-5 max-w-5xl shadow-sm ">
            <h2 className="text-xl font-semibold">{title}</h2>
            {description ? (
                <p className="mb-8 mt-1 text-sm text-muted-foreground">{description}</p>
            ) : (
                <div className="mb-8" />
            )}
            {children}
        </section>
    );
}

export function Field({
    label,
    htmlFor,
    error,
    hint,
    required,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="block text-sm font-medium">
                {label}
                {required ? <span className="text-primary"> *</span> : null}
            </label>
            {children}
            {hint && !error ? (
                <p className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
            {error ? (
                <p className="text-xs text-red-600" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

type TextFieldProps = {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    hint?: string;
    required?: boolean;
    type?: "text" | "email" | "tel" | "date" | "password";
    placeholder?: string;
    inputMode?: "text" | "numeric" | "tel" | "email";
    autoComplete?: string;
};

export function TextField({
    label,
    name,
    value,
    onChange,
    error,
    hint,
    required,
    type = "text",
    placeholder,
    inputMode,
    autoComplete = "off",
}: TextFieldProps) {
    return (
        <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                placeholder={placeholder}
                inputMode={inputMode}
                autoComplete={autoComplete}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass}
                aria-invalid={error ? true : undefined}
            />
        </Field>
    );
}

export function SelectField({
    label,
    name,
    value,
    onChange,
    options,
    error,
    required,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    error?: string;
    required?: boolean;
}) {
    return (
        <Field label={label} htmlFor={name} error={error} required={required}>
            <select
                id={name}
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClass}
            >
                <option value="">Select…</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </Field>
    );
}

interface ConfirmModalProps {
    title: string;
    description: string;
    confirmText: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export function ConfirmModal({
    title,
    description,
    confirmText,
    onCancel,
    onConfirm,
}: ConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
                <h3 className="text-lg font-semibold">{title}</h3>

                <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                </p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded-md px-4 py-2 text-sm font-medium text-primary hover:bg-muted"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}