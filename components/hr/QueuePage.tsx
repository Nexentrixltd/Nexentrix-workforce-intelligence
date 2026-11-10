import { requireRole } from "@/lib/auth/session";
import { RECORD_REVIEWERS } from "@/lib/staff-records/acess";
import {
    QUEUE_FILTERS,
    getReviewQueue,
    type QueueFilter,
} from "@/lib/staff-records/hr-queries";
import { ReviewQueue } from "./ReviewQueue";

export default async function RecordsQueuePage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string | string[]; filter?: string | string[] }>;
}) {
    const user = await requireRole(RECORD_REVIEWERS);
    const sp = await searchParams;

    const filter: QueueFilter =
        typeof sp.filter === "string" &&
            (QUEUE_FILTERS as readonly string[]).includes(sp.filter)
            ? (sp.filter as QueueFilter)
            : "all";
    const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";

    const data = await getReviewQueue({ q, filter });
    const basePath = user.role === "ADMIN" ? "/admin/records" : "/hr/records";

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Staff records</h1>
                <p className="mt-1 text-muted-foreground">
                    Review the details and documents staff submit. Anything waiting for you is listed first.
                </p>
            </div>

            <ReviewQueue data={data} filter={filter} q={q} basePath={basePath} />
        </div>
    );
}