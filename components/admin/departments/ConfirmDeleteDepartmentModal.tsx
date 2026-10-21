"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type DepartmentToDelete = {
    id: string;
    name: string;
    members: number;
};

type Props = {
    department: DepartmentToDelete | null;
    onClose: () => void;
};

const ConfirmDeleteDepartmentModal = ({ department, onClose }: Props) => {
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(
                `/api/departments?id=${encodeURIComponent(id)}`,
                { method: "DELETE" }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to delete department");
            return data;
        },
        onSuccess: () => {
            toast.success("Department deleted");
            onClose();
            router.refresh();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    useEffect(() => {
        if (!department) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !mutation.isPending) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [department, onClose, mutation.isPending]);

    if (!department) return null;

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
                aria-labelledby="delete-department-title"
                aria-describedby="delete-department-desc"
                className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="delete-department-title" className="text-lg font-semibold">
                    Delete department
                </h2>

                <p id="delete-department-desc" className="mt-2 text-sm text-gray-600">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-900">{department.name}</span>
                    ? This cannot be undone.
                    {department.members > 0 && (
                        <>
                            {" "}
                            Its {department.members}{" "}
                            {department.members === 1 ? "member" : "members"} will be removed
                            from this department but their accounts will not be deleted.
                        </>
                    )}
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
                        onClick={() => mutation.mutate(department.id)}
                        disabled={mutation.isPending}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {mutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteDepartmentModal;