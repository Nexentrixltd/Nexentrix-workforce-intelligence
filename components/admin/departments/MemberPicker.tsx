"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/types/rbac";

export type UserOption = {
    id: string;
    name: string;
    email: string;
    role: Role;
};

const ROLE_LABELS: Record<Role, string> = {
    EXECUTIVE: "Executive",
    ADMIN: "Admin",
    HR: "HR",
    CHIEF_OF_STAFF: "Chief of Staff",
    ARM_HEAD: "Arm head",
    TEAM_LEAD: "Team Lead",
    STAFF: "Staff",
};

type Props = {
    users: UserOption[];
    selected: Set<string>;
    onToggle: (id: string) => void;
    viewerRole: Role;
    isLoading: boolean;
    errorMessage?: string;
    onRetry?: () => void;
    emptyMessage: string;
};

export function MemberPicker({
    users,
    selected,
    onToggle,
    viewerRole,
    isLoading,
    errorMessage,
    onRetry,
    emptyMessage,
}: Props) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
    }, [users, search]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
                <label htmlFor="member-search" className="text-sm font-medium">
                    Members <span className="text-gray-400">(optional)</span>
                </label>
                <span className="text-xs text-gray-500">{selected.size} selected</span>
            </div>

            <input
                id="member-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <ul className="mt-2 max-h-56 min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
                {isLoading ? (
                    <li className="px-3 py-6 text-center text-sm text-gray-500">
                        Loading users...
                    </li>
                ) : errorMessage ? (
                    <li className="px-3 py-6 text-center text-sm text-red-600">
                        {errorMessage}{" "}
                        {onRetry && (
                            <button type="button" onClick={onRetry} className="underline">
                                Retry
                            </button>
                        )}
                    </li>
                ) : filtered.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-gray-500">
                        {users.length === 0 ? emptyMessage : "No users match your search"}
                    </li>
                ) : (
                    filtered.map((u) => {
                        const locked = !canManageUser(viewerRole, u.role);
                        return (
                            <li key={u.id}>
                                <label
                                    title={locked ? "Only administrators can assign this account" : undefined}
                                    className={`flex items-center gap-3 px-3 py-2 ${locked
                                            ? "cursor-not-allowed opacity-60"
                                            : "cursor-pointer hover:bg-gray-50"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(u.id)}
                                        disabled={locked}
                                        onChange={() => onToggle(u.id)}
                                        className="h-4 w-4"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{u.name}</p>
                                        <p className="truncate text-xs text-gray-500">{u.email}</p>
                                    </div>
                                    {locked && <Lock size={14} className="shrink-0 text-gray-400" />}
                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                                        {ROLE_LABELS[u.role]}
                                    </span>
                                </label>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}