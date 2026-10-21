"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProjectForm } from "@/components/projects/ProjectForm";
import type { ProjectInput } from "@/lib/validations/project";

export default function NewProjectPage() {
    const router = useRouter();
    const qc = useQueryClient();

    async function onSubmit(values: ProjectInput) {
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        const body = await res.json();
        if (!res.ok) {
            const first =
                typeof body.error === "string"
                    ? body.error
                    : (Object.values(body.error)[0] as string[])?.[0];
            toast.error(first ?? "Could not create project");
            return;
        }
        toast.success("Project created");
        qc.invalidateQueries({ queryKey: ["admin-projects"] });
        router.push(`/admin/projects/${body.id}`);
    }

    return (
        <div className="max-w-4xl px-4 py-8 sm:px-6">
            <Link
                href="/admin/projects"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
                Back to projects
            </Link>

            <div className="mb-10 mt-4">
                <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                    New project
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Set up the project, pick a lead, then add members from its page.
                </p>
            </div>

            <ProjectForm
                submitLabel="Create project"
                onSubmit={onSubmit}
                onCancel={() => router.push("/admin/projects")}
            />
        </div>
    );
}