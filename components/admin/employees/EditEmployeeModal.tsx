"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export type EmployeeToEdit = {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "HR" | "TEAM_LEAD" | "STAFF";
    departmentId: string | null;
};

export type DepartmentOption = { id: string; name: string };

const schema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    role: z.enum(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]).optional(),
    departmentId: z.string(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
    user: EmployeeToEdit | null;
    departments: DepartmentOption[];
    currentUserId: string;
    onClose: () => void;
};

const inputCls =
    "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-500";

const EditEmployeeModal = ({ user, departments, currentUserId, onClose }: Props) => {
    const router = useRouter();
    const isSelf = user?.id === currentUserId;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (user) {
            reset({
                name: user.name,
                email: user.email,
                role: user.role,
                departmentId: user.departmentId ?? "",
            });
        }
    }, [user, reset]);

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const res = await fetch(`/api/admin/employees/${user!.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: values.name,
                    email: values.email,
                    role: isSelf ? undefined : values.role,
                    departmentId: values.departmentId || null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to update user");
            return data;
        },
        onSuccess: () => {
            toast.success("Changes saved");
            onClose();
            router.refresh();
        },
        onError: (err: Error) => toast.error(err.message),
    });

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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={handleClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-employee-title"
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="edit-employee-title" className="text-lg font-semibold">
                    Edit employee
                </h2>

                <form
                    onSubmit={handleSubmit((v) => mutation.mutate(v))}
                    className="mt-4 space-y-4"
                >
                    <div>
                        <label htmlFor="emp-name" className="block text-sm font-medium">
                            Name
                        </label>
                        <input id="emp-name" {...register("name")} className={inputCls} autoFocus />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emp-email" className="block text-sm font-medium">
                            Email
                        </label>
                        <input
                            id="emp-email"
                            type="email"
                            {...register("email")}
                            className={inputCls}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emp-role" className="block text-sm font-medium">
                            Role
                        </label>
                        <select
                            id="emp-role"
                            {...register("role")}
                            disabled={isSelf}
                            className={inputCls}
                        >
                            <option value="STAFF">Staff</option>
                            <option value="TEAM_LEAD">Team Lead</option>
                            <option value="HR">HR</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        {isSelf ? (
                            <p className="mt-1 text-xs text-gray-500">
                                You can&apos;t change your own role.
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500">
                                Changing the role signs the person out so it applies at next sign-in.
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emp-dept" className="block text-sm font-medium">
                            Department
                        </label>
                        <select id="emp-dept" {...register("departmentId")} className={inputCls}>
                            <option value="">No department</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={mutation.isPending}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
                        >
                            {mutation.isPending ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEmployeeModal;