"use client";

import { useState } from "react";
import { WorkloadTable } from "@/components/projects/WorkloadTable";
import { ProjectsList } from "@/components/projects/ProjectList";

const TABS = [
    { key: "projects", label: "Projects" },
    { key: "workload", label: "Workload" },
] as const;

export default function HrProjectsPage() {
    const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("projects");

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="min-w-0">
                <h1 className="font-triakis text-3xl tracking-tight sm:text-4xl">
                    Projects
                </h1>
                <p className="mt-2 text-sm text-secondary">
                    Review all projects and see how people are allocated across them.
                </p>
            </div>

            <div role="tablist" className="mt-6 flex gap-6 border-b border-gray-200">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className={`-mb-px border-b-2 pb-3 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${tab === t.key
                                ? "border-primary font-semibold text-primary"
                                : "border-transparent text-secondary hover:text-gray-900"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {tab === "projects" ? (
                    <ProjectsList basePath="/hr/projects" />
                ) : (
                    <WorkloadTable projectsBasePath="/hr/projects" />
                )}
            </div>
        </div>
    );
}