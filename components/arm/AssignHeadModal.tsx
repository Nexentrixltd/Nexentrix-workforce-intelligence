"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import type { ArmCard, HeadCandidate } from "./ArmsList";

const ROLE_LABEL: Record<string, string> = {
    STAFF: "Staff",
    TEAM_LEAD: "Team Lead",
    ARM_HEAD: "Arm Head",
    CHIEF_OF_STAFF: "Chief of Staff",
};

type Props = {
    arm: ArmCard | null;
    candidates: HeadCandidate[];
    onClose: () => void;
};

const AssignHeadModal = ({ arm, candidates, onClose }: Props) => {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const headRole = arm?.isShared ? "CHIEF_OF_STAFF" : "ARM_HEAD";
    const title = arm?.isShared ? "Chief of Staff" : "Arm Head";

    const eligible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return candidates
            .filter((c) => ["STAFF", "TEAM_LEAD", headRole].includes(c.role))
            .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }, [candidates, headRole, search]);

    const selected = candidates.find((c) => c.id === selectedId) ?? null;

    const mutation = useMutation({
        mutationFn: async (userId: string | null) => {
            const res = await fetch(`/api/arms/${arm!.id}/head`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Failed to update");
            return data;
        },
        onSuccess: (_data, userId) => {
            toast.success(userId ? `${title} updated` : `${title} removed`);
            onClose();
            router.refresh();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    useEffect(() => {
        if (!arm) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !mutation.isPending) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [arm, onClose, mutation.isPending]);

    if (!arm) return null;

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
                aria-labelledby="assign-head-title"
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="assign-head-title" className="text-lg font-semibold">
                    {arm.head ? `Change ${title}` : `Assign ${title}`}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{arm.name}</p>

                {arm.head && (
                    <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        Current {title}: <span className="font-medium text-gray-900">{arm.head.name}</span>.
                        Replacing them returns them to Staff with no department.
                    </p>
                )}

                <div className="relative mt-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        aria-label="Search people"
                        className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                    />
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-gray-200">
                    {eligible.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-500">
                            No eligible people found. Create the account first, or free someone from a Team Lead
                            role.
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {eligible.map((c) => (
                                <li key={c.id}>
                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="head"
                                            checked={selectedId === c.id}
                                            onChange={() => setSelectedId(c.id)}
                                            className="accent-indigo-600"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                                            <p className="truncate text-xs text-gray-500">{c.email}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-xs font-medium text-gray-600">{ROLE_LABEL[c.role] ?? c.role}</p>
                                            {c.departmentName && (
                                                <p className="max-w-32 truncate text-xs text-gray-400">{c.departmentName}</p>
                                            )}
                                        </div>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {selected && selected.role !== headRole && (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {selected.name}&apos;s role changes from {ROLE_LABEL[selected.role] ?? selected.role} to{" "}
                        {title}
                        {arm.isShared
                            ? ", and they become lead of the Executive / Board Office."
                            : " and they leave their department."}{" "}
                        They will be signed out so it applies at next sign-in.
                    </p>
                )}

                {arm.head && (
                    <div className="mt-5 border-t border-gray-100 pt-4">
                        {confirmRemove ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-gray-600">
                                    Remove {arm.head.name} as {title}? The arm will have no head.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmRemove(false)}
                                        disabled={mutation.isPending}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-60"
                                    >
                                        Keep
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => mutation.mutate(null)}
                                        disabled={mutation.isPending}
                                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                        {mutation.isPending ? "Removing..." : "Remove"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmRemove(true)}
                                disabled={mutation.isPending}
                                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                            >
                                Remove current {title}
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
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
                        onClick={() => selectedId && mutation.mutate(selectedId)}
                        disabled={!selectedId || mutation.isPending}
                        className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
                    >
                        {mutation.isPending ? "Saving..." : `Set as ${title}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignHeadModal;