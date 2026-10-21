"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MemberPicker, type UserOption } from "./MemberPicker";
import { Role } from "@/types/rbac";

export type DepartmentToEdit = {
    id: string;
    name: string;
    focus: string | null;
    status: "ACTIVE" | "PLANNED";
    teamLeadId: string | null;
};

const schema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    focus: z.string().trim().max(200, "Keep the focus under 200 characters"),
    status: z.enum(["ACTIVE", "PLANNED"]),
});

type FormValues = z.infer<typeof schema>;

type DepartmentDetail = {
    userIds: string[];
    teamLeadId: string | null;
    leadLocked: boolean;
};

type Props = {
    department: DepartmentToEdit | null;
    onClose: () => void;
    viewerRole: Role;
};

const inputCls =
    "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

const EditDepartmentModal = ({ department, onClose, viewerRole }: Props) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [leadId, setLeadId] = useState<string>("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    const usersQuery = useQuery({
        queryKey: ["users-available", department?.id],
        enabled: !!department,
        staleTime: 0,
        queryFn: async (): Promise<UserOption[]> => {
            const res = await fetch(
                `/api/employees?departmentId=${encodeURIComponent(department!.id)}`,
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to load users");
            return data.users as UserOption[];
        },
    });

    const detailQuery = useQuery({
        queryKey: ["department", department?.id],
        enabled: !!department,
        staleTime: 0,
        gcTime: 0,
        queryFn: async (): Promise<DepartmentDetail> => {
            const res = await fetch(`/api/departments/${department!.id}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to load department");
            return data.department;
        },
    });

    useEffect(() => {
        if (department) {
            reset({
                name: department.name,
                focus: department.focus ?? "",
                status: department.status,
            });
        }
    }, [department, reset]);

    useEffect(() => {
        if (detailQuery.data) {
            setSelected(new Set(detailQuery.data.userIds));
            setLeadId(detailQuery.data.teamLeadId ?? "");
        }
    }, [detailQuery.data]);

    const leadLocked = detailQuery.data?.leadLocked ?? false;

    const leadOptions = useMemo(
        () =>
            (usersQuery.data ?? []).filter(
                (u) =>
                    selected.has(u.id) &&
                    (String(u.role) === "STAFF" || String(u.role) === "TEAM_LEAD"),
            ),
        [usersQuery.data, selected],
    );

    const leadValue = leadOptions.some((o) => o.id === leadId) ? leadId : "";

    const toggleUser = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            const res = await fetch(`/api/departments/${department!.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: values.name,
                    focus: values.focus || null,
                    status: values.status,
                    userIds: Array.from(selected),
                    ...(leadLocked ? {} : { teamLeadId: leadValue || null }),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to update department");
            return data;
        },
        onSuccess: () => {
            toast.success("Department updated");
            queryClient.invalidateQueries({ queryKey: ["department", department?.id] });
            queryClient.invalidateQueries({ queryKey: ["users-available"] });
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

    const membersReady = detailQuery.isSuccess;
    const loadError = usersQuery.error ?? detailQuery.error;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={handleClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-department-title"
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="edit-department-title" className="text-lg font-semibold">
                    Edit department
                </h2>

                <form
                    onSubmit={handleSubmit((v) => mutation.mutate(v))}
                    className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                            <label htmlFor="edit-name" className="block text-sm font-medium">
                                Name
                            </label>
                            <input id="edit-name" {...register("name")} className={inputCls} autoFocus />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="edit-status" className="block text-sm font-medium">
                                Status
                            </label>
                            <select id="edit-status" {...register("status")} className={inputCls}>
                                <option value="PLANNED">Planned</option>
                                <option value="ACTIVE">Active</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="edit-focus" className="block text-sm font-medium">
                            Focus
                        </label>
                        <input
                            id="edit-focus"
                            {...register("focus")}
                            placeholder="What this department is responsible for"
                            className={inputCls}
                        />
                        {errors.focus && (
                            <p className="mt-1 text-xs text-red-600">{errors.focus.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="edit-lead" className="block text-sm font-medium">
                            Team Lead
                        </label>
                        {leadLocked ? (
                            <p className="mt-1 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                This department&apos;s lead is managed by an Admin and can&apos;t be changed here.
                            </p>
                        ) : (
                            <>
                                <select
                                    id="edit-lead"
                                    value={leadValue}
                                    onChange={(e) => setLeadId(e.target.value)}
                                    disabled={!membersReady}
                                    className={inputCls}
                                >
                                    <option value="">No Team Lead</option>
                                    {leadOptions.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    The lead must be a selected member. Staff chosen as lead become Team Lead; a
                                    replaced lead returns to Staff unless they lead another department.
                                </p>
                            </>
                        )}
                    </div>

                    <MemberPicker
                        users={usersQuery.data ?? []}
                        selected={selected}
                        onToggle={toggleUser}
                        viewerRole={viewerRole}
                        isLoading={usersQuery.isLoading || detailQuery.isLoading}
                        errorMessage={loadError ? loadError.message : undefined}
                        onRetry={() => {
                            usersQuery.refetch();
                            detailQuery.refetch();
                        }}
                        emptyMessage="No users available"
                    />

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
                            disabled={mutation.isPending || !membersReady}
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

export default EditDepartmentModal;