import { requireRole } from "@/lib/auth/session";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

export default async function StaffProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole(["STAFF"]);
    const { id } = await params;
    return (
        <ProjectDetailView
            projectId={id}
            viewerId={user.id}
            backHref="/staff/projects"
            reportHref="/staff/reports/new"
        />
    );
}