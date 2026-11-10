import {
    CheckCircle2,
    CircleDashed,
    Clock,
    TriangleAlert,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionState } from "@/lib/staff-records/hr-queries";

const STATES: Record<SectionState, { label: string; icon: LucideIcon; className: string }> = {
    VERIFIED: {
        label: "Verified",
        icon: CheckCircle2,
        className: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
    },
    PENDING: {
        label: "Pending",
        icon: Clock,
        className: "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400",
    },
    REJECTED: {
        label: "Rejected",
        icon: XCircle,
        className: "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400",
    },
    ADDED: {
        label: "Added",
        icon: CheckCircle2,
        className: "bg-primary/10 text-primary ring-primary/25",
    },
    INCOMPLETE: {
        label: "Incomplete",
        icon: TriangleAlert,
        className: "bg-orange-500/10 text-orange-600 ring-orange-500/25 dark:text-orange-400",
    },
    MISSING: {
        label: "Missing",
        icon: CircleDashed,
        className: "bg-muted text-muted-foreground ring-border",
    },
};

export function StatusChip({ state }: { state: SectionState }) {
    const s = STATES[state];
    const Icon = s.icon;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                s.className
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {s.label}
        </span>
    );
}