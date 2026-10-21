import { ProjectsList } from "@/components/projects/ProjectList";
import { requireRole } from "@/lib/auth/session";

export default async function StaffProjectsPage() {
    await requireRole(["STAFF"]);
    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="min-w-0">
                <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                    My projects
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    The projects you are part of.
                </p>
            </div>
            <div className="mt-8">
                <ProjectsList basePath="/staff/projects" />
            </div>
        </div>
    );
}