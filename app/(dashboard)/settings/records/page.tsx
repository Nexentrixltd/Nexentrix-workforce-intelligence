import Link from "next/link";
import { Role } from "@prisma/client";
import { getRecordsOverview } from "@/lib/staff-records/queries";
import { StatusBadge } from "@/components/records/ui";
import { requireRole } from "@/lib/auth/session";
import { FolderOpen, PenTool, PhoneCall, UserRound, Wallet } from "lucide-react";

interface Section {
    href: string;
    title: string;
    description: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | null;
    note: string | null;
    done: boolean;
    hint: string | null;
    icon: React.ComponentType<{ size?: number }>;
    length?: number;
}

export const metadata = { title: "My Records" };

export default async function RecordsOverviewPage() {
    const user = await requireRole(Object.values(Role));
    const o = await getRecordsOverview(user.id);

    const missingDocs = [
        !o.documents.hasPassportPhoto ? "passport photograph" : null,
        !o.documents.hasAppointmentLetter ? "appointment letter" : null,
    ].filter(Boolean) as string[];

    const sections = [
        {
            href: "/settings/records/personal",
            title: "Personal details",
            description: "Contact details, address and basic information.",
            status: o.profile?.status ?? null,
            note: o.profile?.reviewNote,
            done: Boolean(o.profile),
            hint: null as string | null,
            icon: UserRound,
        },
        {
            href: "/settings/records/emergency",
            title: "Emergency contacts",
            description: "People HR can reach if something happens.",
            status: o.contactCount > 0 ? ("ADDED" as const) : null,
            note: null,
            done: o.contactCount > 0,
            hint: null,
            icon: PhoneCall,
            length: o.contactCount,
        },
        {
            href: "/settings/records/documents",
            title: "Documents",
            description: "Passport photograph, appointment letter and other important documents.",
            status: o.documents.status,
            note: o.documents.note,
            done: missingDocs.length === 0,
            hint: missingDocs.length > 0 ? `Required: ${missingDocs.join(", ")}` : null,
            icon: FolderOpen,
        },
        {
            href: "/settings/records/payroll",
            title: "Payroll",
            description: "Bank name, account name and account number.",
            status: o.payroll?.status ?? null,
            note: o.payroll?.reviewNote,
            done: Boolean(o.payroll),
            hint: null,
            icon: Wallet,
        },
        {
            href: "/settings/records/signatory",
            title: "Signatory",
            description: "Your name, title and signature specimen.",
            status: o.signatory?.status ?? null,
            note: o.signatory?.reviewNote,
            done: Boolean(o.signatory),
            hint: null,
            icon: PenTool,
        },
    ];

    const completed = sections.filter((s) => s.done).length;

    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm font-medium">
                    {completed} of {sections.length} sections complete
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(completed / sections.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {sections.map((s) => (
                    <Link
                        key={s.href}
                        href={s.href}
                        className="block rounded-lg border border-border bg-card hover:border-primary/20 transition-all p-5 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-2 items-center">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <s.icon size={20} />
                                </div>
                                <h2 className="font-semibold">{s.title}</h2>
                            </div>

                            <StatusBadge status={s.status} length={s.length} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                        {s.hint ? (
                            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{s.hint}</p>
                        ) : null}
                        {s.status === "REJECTED" && s.note ? (
                            <p className="mt-3 text-sm text-red-600">HR note: {s.note}</p>
                        ) : null}
                    </Link>
                ))}
            </div>
        </div>
    );
}