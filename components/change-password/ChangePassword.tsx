"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
    changePasswordSchema,
    type ChangePasswordValues,
} from "@/lib/validations/password";

const inputCls =
    "w-full rounded-md border border-border bg-muted px-3 py-2 pr-10 text-sm outline-none focus:border-primary";

function PasswordField({
    id,
    label,
    error,
    autoComplete,
    registration,
}: {
    id: string;
    label: string;
    error?: string;
    autoComplete: string;
    registration: React.InputHTMLAttributes<HTMLInputElement>;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-text-primary">
                {label}
            </label>
            <div className="relative mt-1">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    className={inputCls}
                    {...registration}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export function ChangePasswordForm({ destination }: { destination: string }) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const onSubmit = async (values: ChangePasswordValues) => {
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to change password");

            toast.success("Password updated");
            window.location.assign(destination);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        }
    };

    const signOut = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            window.location.assign("/auth");
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                <PasswordField
                    id="currentPassword"
                    label="Current password"
                    autoComplete="current-password"
                    error={errors.currentPassword?.message}
                    registration={register("currentPassword")}
                />
                <PasswordField
                    id="newPassword"
                    label="New password"
                    autoComplete="new-password"
                    error={errors.newPassword?.message}
                    registration={register("newPassword")}
                />
                <PasswordField
                    id="confirmPassword"
                    label="Confirm new password"
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                    registration={register("confirmPassword")}
                />

                <p className="text-xs text-gray-500">
                    At least 8 characters, with a letter and a number.
                </p>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:opacity-60"
                >
                    {isSubmitting ? "Saving..." : "Set password and continue"}
                </button>
            </form>

            <button
                type="button"
                onClick={signOut}
                className="mt-4 w-full text-center text-sm text-muted-foreground hover:bg-muted py-2"
            >
                Sign out
            </button>
        </>
    );
}