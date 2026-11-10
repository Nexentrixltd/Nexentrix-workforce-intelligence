import Link from "next/link";
import type { ReactNode } from "react";
import {
    ArrowLeft,
    Download,
    Eye,
    FileText,
    FolderOpen,
    PenTool,
    PhoneCall,
    ShieldCheck,
    UserRound,
    Wallet,
    type LucideIcon,
} from "lucide-react";
import type { StaffReviewData } from "@/lib/staff-records/hr-queries";
import {
    DOCUMENT_LABELS,
    REQUIRED_DOCUMENT_TYPES,
} from "@/lib/staff-records/documents";
import { formatBytes, formatDateTime } from "@/lib/staff-records/format";
import { ReviewActions } from "./ReviewActions";
import { RevealAccountNumber } from "./RevealAccountNumber";
import { Avatar } from "../shared/people";

function Section({
    icon: Icon,
    title,
    children,
}: {
    icon: LucideIcon;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                </span>
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function Row({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </dt>
            <dd className="mt-1 text-sm font-medium">
                {value || <span className="text-muted-foreground">—</span>}
            </dd>
        </div>
    );
}

const Empty = ({ children }: { children: ReactNode }) => (
    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {children}
    </p>
);

export function StaffRecordsReview({
    data,
    basePath,
    viewerId,
}: {
    data: StaffReviewData;
    basePath: string;
    viewerId: string;
}) {
    const { user, profile, contacts, payroll, signatory, documents, access } = data;
    const canReview = viewerId !== user.id;
    const fileBase = `/api/staff/${user.id}/records`;

    const missingRequired = REQUIRED_DOCUMENT_TYPES.filter(
        (t) => !documents.some((d) => d.type === t)
    );

    return (
        <div className="space-y-6">
            <Link
                href={basePath}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                All staff
            </Link>

            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border/60 bg-muted/20 p-5 sm:p-6">
                <Avatar id={user.id} name={user.name} imgURL={user.image ? user.image : undefined} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name}</h1>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                            {user.role.replace(/_/g, " ")}
                        </span>
                        {user.department ? (
                            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                                {user.department}
                            </span>
                        ) : null}
                        {user.deactivated ? (
                            <span className="rounded-full bg-red-500/10 px-2.5 py-1 font-medium text-red-600 dark:text-red-400">
                                Deactivated
                            </span>
                        ) : null}
                    </p>
                </div>
            </div>

            {!canReview ? (
                <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    These are your own records. You can view them, but another HR or admin user must review them.
                </p>
            ) : null}

            <Section icon={UserRound} title="Personal details">
                {profile ? (
                    <>
                        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                            <Row label="Legal name" value={profile.preferredName} />
                            <Row label="Date of birth" value={profile.dateOfBirth ? formatDateTime(profile.dateOfBirth) : null} />
                            <Row label="Phone" value={profile.phone} />
                            <Row label="Alternate phone" value={profile.altPhone} />
                            <Row label="Personal email" value={profile.personalEmail} />
                            <Row label="Gender" value={profile.gender} />
                            <Row label="Marital status" value={profile.maritalStatus} />
                            <Row label="Nationality" value={profile.nationality} />
                            <Row label="State of origin" value={profile.stateOfOrigin} />
                            <Row
                                label="Address"
                                value={[profile.addressLine, profile.city, profile.state, profile.country]
                                    .filter(Boolean)
                                    .join(", ")}
                            />
                        </dl>
                        {canReview ? (
                            <ReviewActions
                                userId={user.id}
                                target={{ type: "profile" }}
                                status={profile.status}
                                version={profile.version}
                                reviewNote={profile.reviewNote}
                            />
                        ) : null}
                    </>
                ) : (
                    <Empty>Not submitted yet.</Empty>
                )}
            </Section>

            <Section icon={PhoneCall} title="Emergency contacts">
                {contacts.length === 0 ? (
                    <Empty>No emergency contact added yet.</Empty>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {contacts.map((c) => (
                            <li key={c.id} className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm">
                                <p className="font-semibold">
                                    {c.name}
                                    {c.isPrimary ? (
                                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                            Primary
                                        </span>
                                    ) : null}
                                </p>
                                <p className="text-muted-foreground">
                                    {c.relationship} · {c.phone}
                                    {c.altPhone ? ` · ${c.altPhone}` : ""}
                                </p>
                                {c.address ? <p className="text-muted-foreground">{c.address}</p> : null}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section icon={FolderOpen} title="Documents">
                {missingRequired.length > 0 ? (
                    <p className="mb-4 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-400">
                        Still needed: {missingRequired.map((t) => DOCUMENT_LABELS[t]).join(", ")}
                    </p>
                ) : null}

                {documents.length === 0 ? (
                    <Empty>No documents uploaded yet.</Empty>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                        {documents.map((d) => {
                            const fileUrl = `${fileBase}/documents/${d.id}/file`;
                            const showThumb = d.type === "PASSPORT_PHOTO" && d.mimeType.startsWith("image/");
                            return (
                                <li key={d.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted text-muted-foreground">
                                            {showThumb ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={fileUrl} alt="Passport photograph" className="h-full w-full object-cover object-top" />
                                            ) : (
                                                <FileText className="h-8 w-8" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">{DOCUMENT_LABELS[d.type]}</p>
                                            {d.title ? <p className="truncate text-sm text-muted-foreground">{d.title}</p> : null}
                                            <p className="mt-1 truncate text-xs text-muted-foreground" title={d.fileName}>
                                                {d.fileName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatBytes(d.sizeBytes)} · {formatDateTime(d.createdAt)}
                                            </p>
                                            <div className="mt-2 flex gap-1">
                                                <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    View
                                                </a>
                                                <a
                                                    href={`${fileUrl}?download=1`}
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    {canReview ? (
                                        <ReviewActions
                                            userId={user.id}
                                            target={{ type: "document", id: d.id }}
                                            status={d.status}
                                            version={d.version}
                                            reviewNote={d.reviewNote}
                                        />
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>

            <Section icon={Wallet} title="Payroll">
                {payroll ? (
                    <>
                        <dl className="flex flex-col gap-y-8">
                            <Row label="Bank name" value={payroll.bankName} />
                            <Row label="Account name" value={payroll.accountName} />
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Account number
                                </dt>
                                <dd className="mt-1.5">
                                    <RevealAccountNumber userId={user.id} masked={payroll.accountNumberMasked} />
                                </dd>
                            </div>
                        </dl>
                        {canReview ? (
                            <ReviewActions
                                userId={user.id}
                                target={{ type: "payroll" }}
                                status={payroll.status}
                                version={payroll.version}
                                reviewNote={payroll.reviewNote}
                            />
                        ) : null}
                    </>
                ) : (
                    <Empty>Not submitted yet.</Empty>
                )}
            </Section>

            <Section icon={PenTool} title="Signatory">
                {signatory ? (
                    <>
                        <div className="flex flex-wrap items-center gap-6">
                            <dl className="grid flex-1 gap-4 sm:grid-cols-2">
                                <Row label="Name on documents" value={signatory.signatoryName} />
                                <Row label="Title" value={signatory.title} />
                            </dl>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`${fileBase}/file/signature`}
                                alt="Signature"
                                className="h-24 max-w-64 rounded-xl border border-border/60 bg-white object-contain p-2"
                            />
                        </div>
                        {canReview ? (
                            <ReviewActions
                                userId={user.id}
                                target={{ type: "signatory" }}
                                status={signatory.status}
                                version={signatory.version}
                                reviewNote={signatory.reviewNote}
                            />
                        ) : null}
                    </>
                ) : (
                    <Empty>Not submitted yet.</Empty>
                )}
            </Section>

            <Section icon={ShieldCheck} title="Access history">
                {access.length === 0 ? (
                    <Empty>Nobody has opened sensitive details for this person yet.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 text-sm">
                        {access.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                                <span>
                                    <span className="font-medium">{a.what}</span>{" "}
                                    <span className="text-muted-foreground">by {a.by}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">{formatDateTime(a.at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        </div>
    );
}