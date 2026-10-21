"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ROLES, type Role } from "@/types/rbac";

export type DepartmentOption = { id: string; name: string; hasLead?: boolean };
export type ArmOption = { id: string; name: string; isShared?: boolean; hasHead?: boolean };

const schema = z
    .object({
        name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
        email: z.string().trim().toLowerCase().email("Enter a valid email"),
        role: z.enum(ROLES),
        departmentId: z.string(),
        armId: z.string(),
    })
    .superRefine((v, ctx) => {
        if ((v.role === "STAFF" || v.role === "TEAM_LEAD") && !v.departmentId) {
            ctx.addIssue({ code: "custom", path: ["departmentId"], message: "Choose a department" });
        }
        if (v.role === "ARM_HEAD" && !v.armId) {
            ctx.addIssue({ code: "custom", path: ["armId"], message: "Choose an arm" });
        }
    });

type FormValues = z.infer<typeof schema>;

type Created = { name: string; email: string; temporaryPassword: string };

const ROLE_OPTIONS: { value: Role; label: string }[] = [
    { value: "STAFF", label: "Staff" },
    { value: "TEAM_LEAD", label: "Team Lead" },
    { value: "HR", label: "HR" },
    { value: "ARM_HEAD", label: "Arm Head" },
    { value: "CHIEF_OF_STAFF", label: "Chief of Staff" },
    { value: "EXECUTIVE", label: "Executive" },
    { value: "ADMIN", label: "Admin" },
];

const DEPARTMENT_ROLES: Role[] = ["STAFF", "TEAM_LEAD", "HR", "ADMIN"];
const DEPARTMENT_REQUIRED: Role[] = ["STAFF", "TEAM_LEAD"];

type Props = {
    open: boolean;
    onClose: () => void;
    departments: DepartmentOption[];
    arms?: ArmOption[];
    allowedRoles?: Role[];
};

const inputCls =
    "mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary";

const AddEmployeeModal = ({
    open,
    onClose,
    departments,
    arms = [],
    allowedRoles = [...ROLES],
}: Props) => {
    const router = useRouter();
    const [created, setCreated] = useState<Created | null>(null);

    const defaultRole: Role = allowedRoles.includes("STAFF") ? "STAFF" : (allowedRoles[0] ?? "STAFF");

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "", role: defaultRole, departmentId: "", armId: "" },
    });

    const role = watch("role");

    useEffect(() => {
        setValue("departmentId", "");
        setValue("armId", "");
    }, [role, setValue]);

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: values.name,
                    email: values.email,
                    role: values.role,
                    departmentId: DEPARTMENT_ROLES.includes(values.role) ? values.departmentId || null : null,
                    armId: values.role === "ARM_HEAD" ? values.armId : null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to create user");
            return data as {
                user: { name: string; email: string };
                temporaryPassword: string;
            };
        },
        onSuccess: (data) => {
            setCreated({
                name: data.user.name,
                email: data.user.email,
                temporaryPassword: data.temporaryPassword,
            });
            router.refresh();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const handleClose = () => {
        if (mutation.isPending) return;
        setCreated(null);
        mutation.reset();
        reset();
        onClose();
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !mutation.isPending) handleClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, mutation.isPending]);

    if (!open) return null;

    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        } catch {
            toast.error("Couldn't copy. Select and copy it manually.");
        }
    };

    const chiefTaken = arms.some((a) => a.isShared && a.hasHead);
    const showDepartment = DEPARTMENT_ROLES.includes(role);
    const departmentRequired = DEPARTMENT_REQUIRED.includes(role);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={handleClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-employee-title"
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-muted p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {created ? (
                    <>
                        <h2 id="add-employee-title" className="text-lg font-semibold">
                            Account created
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Share these credentials securely with{" "}
                            <span className="font-semibold text-text-primary">{created.name}</span>. The password is
                            shown only once, and they must choose a new one at first sign-in.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Email</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <code className="flex-1 select-all break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
                                        {created.email}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => copy(created.email, "Email")}
                                        className="rounded-md border border-border hover:bg-muted px-3 py-2 text-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Temporary password</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <code className="flex-1 select-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
                                        {created.temporaryPassword}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => copy(created.temporaryPassword, "Password")}
                                        className="rounded-md border border-border hover:bg-muted px-3 py-2 text-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-md bg-primary px-4 py-2 text-sm text-text-primary"
                            >
                                Done
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 id="add-employee-title" className="text-lg font-semibold">
                            Add employee
                        </h2>

                        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="new-name" className="block text-sm font-medium">
                                    Full name
                                </label>
                                <input
                                    id="new-name"
                                    {...register("name")}
                                    className={inputCls}
                                    placeholder="e.g. Ada Obi"
                                    autoFocus
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label htmlFor="new-email" className="block text-sm font-medium">
                                    Email
                                </label>
                                <input
                                    id="new-email"
                                    type="email"
                                    {...register("email")}
                                    className={inputCls}
                                    placeholder="name@company.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="new-role" className="block text-sm font-medium">
                                    Role
                                </label>
                                <select id="new-role" {...register("role")} className={inputCls}>
                                    {ROLE_OPTIONS.filter((o) => allowedRoles.includes(o.value)).map((o) => (
                                        <option
                                            key={o.value}
                                            value={o.value}
                                            disabled={o.value === "CHIEF_OF_STAFF" && chiefTaken}
                                        >
                                            {o.label}
                                            {o.value === "CHIEF_OF_STAFF" && chiefTaken ? " (already assigned)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {showDepartment && (
                                <div>
                                    <label htmlFor="new-dept" className="block text-sm font-medium">
                                        Department{departmentRequired ? "" : " (optional)"}
                                    </label>
                                    <select id="new-dept" {...register("departmentId")} className={inputCls}>
                                        <option value="">
                                            {departmentRequired ? "Choose a department" : "No department"}
                                        </option>
                                        {departments.map((d) => {
                                            const blocked = role === "TEAM_LEAD" && d.hasLead;
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
                            )}

                            {role === "ARM_HEAD" && (
                                <div>
                                    <label htmlFor="new-arm" className="block text-sm font-medium">
                                        Arm
                                    </label>
                                    <select id="new-arm" {...register("armId")} className={inputCls}>
                                        <option value="">Choose an arm</option>
                                        {arms
                                            .filter((a) => !a.isShared)
                                            .map((a) => (
                                                <option key={a.id} value={a.id} disabled={a.hasHead}>
                                                    {a.name}
                                                    {a.hasHead ? " (already has a head)" : ""}
                                                </option>
                                            ))}
                                    </select>
                                    {errors.armId && (
                                        <p className="mt-1 text-xs text-red-600">{errors.armId.message}</p>
                                    )}
                                </div>
                            )}

                            {role === "CHIEF_OF_STAFF" && (
                                <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                    Automatically becomes head of Group Shared Services and lead of the Executive /
                                    Board Office. Only one Chief of Staff can exist.
                                </p>
                            )}

                            {role === "EXECUTIVE" && (
                                <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                    Executives sit above every arm and department and get a company-wide, read-only
                                    view.
                                </p>
                            )}

                            <p className="text-xs text-gray-500">
                                A temporary password is generated for you to share. The person must change it at
                                first sign-in.
                            </p>

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
                                    {mutation.isPending ? "Creating..." : "Create account"}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default AddEmployeeModal;