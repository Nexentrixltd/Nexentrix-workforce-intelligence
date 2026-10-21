import { requireRole } from "@/lib/auth/session";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

export default async function TeamLeadProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireRole(["TEAM_LEAD"]);
    const { id } = await params;
    return (
        <ProjectDetailView
            projectId={id}
            viewerId={user.id}
            backHref="/team-lead/projects"
        />
    );
}