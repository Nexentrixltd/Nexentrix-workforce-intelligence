import { ReportsList } from "@/components/reports/reportList";
import { requireRole } from "@/lib/auth/session";

const SUBTITLE = {
    ADMIN: "Every report submitted across the group.",
    HR: "Review reports submitted across the group.",
    TEAM_LEAD: "Reports from your department and your own.",
    STAFF: "The reports you have submitted.",
} as const;

export default async function ReportsPage() {
    const user = await requireRole(["ADMIN", "HR", "TEAM_LEAD", "STAFF"]);
    const role = user.role as keyof typeof SUBTITLE;

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="min-w-0">
                <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                    Reports
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {SUBTITLE[role] ?? ""}
                </p>
            </div>

            <div className="mt-8">
                <ReportsList showAuthor={user.role !== "STAFF"} />
            </div>
        </div>
    );
}