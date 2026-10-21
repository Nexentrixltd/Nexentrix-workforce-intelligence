"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MemberPicker, type UserOption } from "./MemberPicker";
import { Role } from "@/types/rbac";

export type ArmOption = { id: string; name: string };

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  focus: z.string().trim().max(200, "Keep the focus under 200 characters"),
  armId: z.string().min(1, "Choose an arm"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  viewerRole: Role;
  arms: ArmOption[];
};

const USERS_KEY = ["users-available"];

const inputCls =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary";

const AddDepartmentModal = ({ open, onClose, viewerRole, arms }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", focus: "", armId: "" },
  });

  const usersQuery = useQuery({
    queryKey: USERS_KEY,
    enabled: open,
    staleTime: 0,
    queryFn: async (): Promise<UserOption[]> => {
      const res = await fetch("/api/employees");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load users");
      return data.users as UserOption[];
    },
  });

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
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          focus: values.focus || null,
          armId: values.armId,
          userIds: Array.from(selected),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create department");
      return data;
    },
    onSuccess: () => {
      toast.success("Department created");
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      closeAndReset();
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeAndReset = () => {
    reset();
    setSelected(new Set());
    onClose();
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    closeAndReset();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-department-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-department-title" className="text-lg font-semibold">
          Add department
        </h2>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
        >
          <div>
            <label htmlFor="add-dept-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="add-dept-name"
              {...register("name")}
              className={inputCls}
              placeholder="e.g. Data & Analytics"
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="add-dept-arm" className="block text-sm font-medium">
              Arm
            </label>
            <select id="add-dept-arm" {...register("armId")} className={inputCls}>
              <option value="">Choose an arm</option>
              {arms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.armId && <p className="mt-1 text-xs text-red-600">{errors.armId.message}</p>}
            <p className="mt-1 text-xs text-gray-500">
              The arm decides who the department reports to: its Arm Head, or the Chief of Staff for
              Group Shared Services.
            </p>
          </div>

          <div>
            <label htmlFor="add-dept-focus" className="block text-sm font-medium">
              Focus (optional)
            </label>
            <input
              id="add-dept-focus"
              {...register("focus")}
              placeholder="What this department is responsible for"
              className={inputCls}
            />
            {errors.focus && <p className="mt-1 text-xs text-red-600">{errors.focus.message}</p>}
          </div>

          <MemberPicker
            users={usersQuery.data ?? []}
            selected={selected}
            onToggle={toggleUser}
            viewerRole={viewerRole}
            isLoading={usersQuery.isLoading}
            errorMessage={usersQuery.isError ? usersQuery.error.message : undefined}
            onRetry={() => usersQuery.refetch()}
            emptyMessage="No unassigned users available"
          />

          <p className="text-xs text-gray-500">
            New departments start as Planned. Set the Team Lead and status afterwards from Edit.
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
              {mutation.isPending ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDepartmentModal;