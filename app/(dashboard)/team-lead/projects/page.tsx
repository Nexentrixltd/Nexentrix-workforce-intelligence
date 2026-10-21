import { ProjectsList } from "@/components/projects/ProjectList";
import { requireRole } from "@/lib/auth/session";

export default async function TeamLeadProjectsPage() {
    await requireRole(["TEAM_LEAD"]);
    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="min-w-0">
                <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                    Projects
                </h1>
                <p className="mt-2 text-sm text-secondary">
                    Projects you lead or belong to. Open one you lead to manage its team.
                </p>
            </div>
            <div className="mt-8">
                <ProjectsList basePath="/team-lead/projects" />
            </div>
        </div>
    );
}