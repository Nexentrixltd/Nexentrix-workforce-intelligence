// components/admin/departments/AddDepartmentModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AssignableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

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
};

const USERS_KEY = ["unassigned-users"];

const AddDepartmentModal = ({ open, onClose }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

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
    queryFn: async (): Promise<AssignableUser[]> => {
      const res = await fetch("/api/admin/departments/unassigned-users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load users");
      return data.users;
    },
  });

  const users = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

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
    setSearch("");
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/admin/departments", {
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
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
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
                <p className="mt-1 text-xs text-red-600">
                  {errors.code.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <label htmlFor="user-search" className="text-sm font-medium">
                Members <span className="text-gray-400">(optional)</span>
              </label>
              <span className="text-xs text-gray-500">
                {selected.size} selected
              </span>
            </div>

            <input
              id="user-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <ul className="mt-2 min-h-0 max-h-56 flex-1 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
              {usersQuery.isLoading ? (
                <li className="px-3 py-6 text-center text-sm text-gray-500">
                  Loading users...
                </li>
              ) : usersQuery.isError ? (
                <li className="px-3 py-6 text-center text-sm text-red-600">
                  {usersQuery.error.message}{" "}
                  <button
                    type="button"
                    onClick={() => usersQuery.refetch()}
                    className="underline"
                  >
                    Retry
                  </button>
                </li>
              ) : filteredUsers.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-gray-500">
                  {users.length === 0
                    ? "No unassigned users available"
                    : "No users match your search"}
                </li>
              ) : (
                filteredUsers.map((u) => (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {u.email}
                        </p>
                      </div>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                        {u.role}
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm"
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