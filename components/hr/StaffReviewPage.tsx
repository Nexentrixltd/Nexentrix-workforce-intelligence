import { notFound } from "next/navigation";
import { getStaffRecordsForReview } from "@/lib/staff-records/hr-queries";
import { requireRole } from "@/lib/auth/session";
import { RECORD_REVIEWERS } from "@/lib/staff-records/acess";
import { StaffRecordsReview } from "./StaffRecordsReview";

export default async function StaffReviewPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const viewer = await requireRole(RECORD_REVIEWERS);
    const { userId } = await params;

    const data = await getStaffRecordsForReview(userId);
    if (!data) notFound();

    const basePath = viewer.role === "ADMIN" ? "/admin/records" : "/hr/records";

    return <StaffRecordsReview data={data} basePath={basePath} viewerId={viewer.id} />;
}