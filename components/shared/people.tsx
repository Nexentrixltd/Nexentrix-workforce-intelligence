import { ROLE_STYLES } from "@/lib/utils";
import { Role } from "@/types/rbac";


const AVATAR_COLORS = [
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-sky-600",
    "bg-violet-600",
    "bg-teal-600",
    "bg-orange-600",
];

export function colorFor(id: string) {
    let sum = 0;
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export function RoleBadge({ role }: { role: Role }) {
    const { label, cls } = ROLE_STYLES[role];
    return (
        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${cls}`}>
            {label}
        </span>
    );
}

export function StatusBadge({ inactive }: { inactive: boolean }) {
    return inactive ? (
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Inactive
        </span>
    ) : (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Active
        </span>
    );
}

export function Avatar({ id, name, w = 10, h = 10, text = "white" }: { id: string; name: string; w?: number; h?: number; text?: string; }) {
    return (
        <div
            className={`flex h-${h} w-${w} shrink-0 items-center justify-center rounded text-sm font-bold text-${text} ${colorFor(id)}`}
        >
            {initials(name)}
        </div>
    );
}