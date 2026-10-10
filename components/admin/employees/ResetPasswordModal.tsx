"use client";

import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type ResetTarget = { id: string; name: string };

type Props = {
    user: ResetTarget | null;
    onClose: () => void;
};

const ResetPasswordModal = ({ user, onClose }: Props) => {
    const [password, setPassword] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/employees/${id}/password`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to reset password");
            return data.temporaryPassword as string;
        },
        onSuccess: (temp) => setPassword(temp),
        onError: (err: Error) => toast.error(err.message),
    });

    useEffect(() => {
        if (!user) {
            setPassword(null);
            mutation.reset();
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !mutation.isPending) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [user, onClose, mutation.isPending]);

    if (!user) return null;

    const handleClose = () => {
        if (!mutation.isPending) onClose();
    };

    const copy = async () => {
        if (!password) return;
        try {
            await navigator.clipboard.writeText(password);
            toast.success("Copied");
        } catch {
            toast.error("Couldn't copy. Select and copy it manually.");
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={handleClose}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="reset-password-title"
                className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="reset-password-title" className="text-lg font-semibold">
                    Reset password
                </h2>

                {password ? (
                    <>
                        <p className="mt-2 text-sm text-gray-600">
                            Temporary password for{" "}
                            <span className="font-semibold text-gray-900">{user.name}</span>.
                            It is shown only once. Share it securely. They must choose a new
                            password at next sign-in.
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                            <code className="flex-1 select-all rounded-md bg-slate-100 px-3 py-2 font-mono text-sm">
                                {password}
                            </code>
                            <button
                                type="button"
                                onClick={copy}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                            >
                                Copy
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md bg-primary px-4 py-2 text-sm text-white"
                            >
                                Done
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="mt-2 text-sm text-gray-600">
                            This sets a new temporary password for{" "}
                            <span className="font-semibold text-gray-900">{user.name}</span>{" "}
                            and signs them out everywhere. Their current password stops
                            working immediately.
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={mutation.isPending}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => mutation.mutate(user.id)}
                                disabled={mutation.isPending}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {mutation.isPending ? "Resetting..." : "Reset password"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordModal;