import ReportsPageView from "@/components/reports/ReportsPageView";
import { requireRole } from "@/lib/auth/session";

export default async function AdminReportsPage() {
    const user = await requireRole(["STAFF"]);
    return (
        <ReportsPageView
            role={user?.role}
        />
    );
}