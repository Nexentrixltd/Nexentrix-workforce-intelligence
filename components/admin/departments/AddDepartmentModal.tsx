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

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must be at most 10 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  viewerRole: Role;
};

const USERS_KEY = ["users-available"];

const AddDepartmentModal = ({ open, onClose, viewerRole }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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

  const handleClose = () => {
    reset();
    setSelected(new Set());
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          code: values.code.toUpperCase(),
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
      handleClose();
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-department-title" className="text-lg font-semibold">
          Add department
        </h2>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                {...register("name")}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="e.g. Engineering"
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium">
                Code
              </label>
              <input
                id="code"
                {...register("code")}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:border-primary"
                placeholder="ENG"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>
              )}
            </div>
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