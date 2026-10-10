"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type ConfirmAction = {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    url: string;
    method: "POST" | "DELETE";
    body?: unknown;
    successMessage: string;
};

type Props = {
    action: ConfirmAction | null;
    onClose: () => void;
};

const ConfirmActionModal = ({ action, onClose }: Props) => {
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: async (a: ConfirmAction) => {
            const res = await fetch(a.url, {
                method: a.method,
                headers: a.body ? { "Content-Type": "application/json" } : undefined,
                body: a.body ? JSON.stringify(a.body) : undefined,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Something went wrong");
            return data;
        },
        onSuccess: (_data, a) => {
            toast.success(a.successMessage);
            onClose();
            router.refresh();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    useEffect(() => {
        if (!action) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !mutation.isPending) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [action, onClose, mutation.isPending]);

    if (!action) return null;

    const handleClose = () => {
        if (!mutation.isPending) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={handleClose}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-action-title"
                aria-describedby="confirm-action-desc"
                className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-action-title" className="text-lg font-semibold">
                    {action.title}
                </h2>
                <p id="confirm-action-desc" className="mt-2 text-sm text-gray-600">
                    {action.message}
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
                        onClick={() => mutation.mutate(action)}
                        disabled={mutation.isPending}
                        className={`rounded-md px-4 py-2 text-sm text-white disabled:opacity-60 ${action.danger ? "bg-red-600 hover:bg-red-700" : "bg-primary"
                            }`}
                    >
                        {mutation.isPending ? "Working..." : action.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmActionModal;