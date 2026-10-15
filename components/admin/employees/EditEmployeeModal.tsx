"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ROLES, type Role } from "@/types/rbac";

export type EmployeeToEdit = {
    id: string;
    name: string;
    email: string;
    role: Role;
    departmentId: string | null;
    leadsDepartment?: boolean;
};

export type DepartmentOption = { id: string; name: string; hasLead?: boolean };

const schema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    role: z.enum(ROLES).optional(),
    departmentId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ROLE_LABEL: Record<Role, string> = {
    STAFF: "Staff",
    TEAM_LEAD: "Team Lead",
    HR: "HR",
    EXECUTIVE: "Executive",
    ARM_HEAD: "Arm Head",
    CHIEF_OF_STAFF: "Chief of Staff",
    ADMIN: "Admin",
};

const EDITABLE_ROLES: Role[] = ["STAFF", "TEAM_LEAD", "HR", "EXECUTIVE", "ADMIN"];
const ARM_ROLES: Role[] = ["ARM_HEAD", "CHIEF_OF_STAFF"];
const DEPARTMENTLESS_ROLES: Role[] = ["ARM_HEAD", "CHIEF_OF_STAFF", "EXECUTIVE"];

type Props = {
    user: EmployeeToEdit | null;
    departments: DepartmentOption[];
    currentUserId: string;
    canChangeRole: boolean;
    onClose: () => void;
};

const inputCls =
    "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-500";

const EditEmployeeModal = ({ user, departments, currentUserId, canChangeRole, onClose }: Props) => {
    const router = useRouter();

    const isSelf = user?.id === currentUserId;
    const isArmRole = !!user && ARM_ROLES.includes(user.role);
    const leadsDepartment = !!user?.leadsDepartment;
    const roleLocked = isSelf || !canChangeRole || isArmRole || leadsDepartment;

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setError,
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

    const watchedRole = (watch("role") ?? user?.role) as Role | undefined;
    const effectiveRole = roleLocked ? user?.role : watchedRole;
    const showDepartment = !!effectiveRole && !DEPARTMENTLESS_ROLES.includes(effectiveRole);
    const departmentLocked = leadsDepartment;

    const roleOptions = user
        ? EDITABLE_ROLES.includes(user.role)
            ? EDITABLE_ROLES
            : [user.role, ...EDITABLE_ROLES]
        : EDITABLE_ROLES;

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const body: Record<string, unknown> = { name: values.name, email: values.email };

            if (!roleLocked && values.role && values.role !== user!.role) {
                body.role = values.role;
            }

            if (showDepartment && !departmentLocked) {
                const next = values.departmentId || null;
                if (next !== user!.departmentId) body.departmentId = next;
            }

            const res = await fetch(`/api/employees/${user!.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
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

    const submit = (values: FormValues) => {
        if (effectiveRole === "TEAM_LEAD" && showDepartment && !departmentLocked && !values.departmentId) {
            setError("departmentId", { message: "Choose a department for a Team Lead" });
            return;
        }
        mutation.mutate(values);
    };

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

    const isFormDisabled = mutation.isPending;

    const roleNote = isSelf
        ? "You can't change your own role."
        : isArmRole
            ? "Arm Head and Chief of Staff assignments are managed from the Arms page."
            : leadsDepartment
                ? "This person leads a department. Replace them as Team Lead from the Departments page before changing their role or department."
                : !canChangeRole
                    ? "Only administrators can change roles."
                    : "Changing the role signs the person out so it applies at next sign-in.";

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

                <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="emp-name" className="block text-sm font-medium">
                            Name
                        </label>
                        <input
                            id="emp-name"
                            {...register("name")}
                            className={inputCls}
                            autoFocus
                            disabled={isFormDisabled}
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="emp-email" className="block text-sm font-medium">
                            Email
                        </label>
                        <input
                            id="emp-email"
                            type="email"
                            {...register("email")}
                            disabled={isFormDisabled}
                            className={inputCls}
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="emp-role" className="block text-sm font-medium">
                            Role
                        </label>
                        <select
                            id="emp-role"
                            {...register("role")}
                            disabled={roleLocked || isFormDisabled}
                            className={inputCls}
                        >
                            {roleOptions.map((r) => (
                                <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">{roleNote}</p>
                    </div>

                    {showDepartment ? (
                        <div>
                            <label htmlFor="emp-dept" className="block text-sm font-medium">
                                Department
                            </label>
                            <select
                                id="emp-dept"
                                {...register("departmentId")}
                                className={inputCls}
                                disabled={departmentLocked || isFormDisabled}
                            >
                                <option value="">No department</option>
                                {departments.map((d) => {
                                    const blocked =
                                        effectiveRole === "TEAM_LEAD" && d.hasLead && d.id !== user.departmentId;
                                    return (
                                        <option key={d.id} value={d.id} disabled={blocked}>
                                            {d.name}
                                            {blocked ? " (has a Team Lead)" : ""}
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.departmentId && (
                                <p className="mt-1 text-xs text-red-600">{errors.departmentId.message}</p>
                            )}
                        </div>
                    ) : (
                        <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                            This role sits above departments, so it has no department.
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isFormDisabled}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isFormDisabled}
                            className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
                        >
                            {isFormDisabled ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEmployeeModal;