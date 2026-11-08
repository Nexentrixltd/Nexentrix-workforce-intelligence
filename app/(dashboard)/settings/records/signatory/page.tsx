import { Role } from "@prisma/client";
import { getSignatoryRecord } from "@/lib/staff-records/queries";
import { SectionCard } from "@/components/records/ui";
import { requireRole } from "@/lib/auth/session";
import { SignatoryForm } from "@/components/records/forms/SignatoryForm";

export const metadata = { title: "Signatory" };

export default async function SignatoryPage() {
    const user = await requireRole(Object.values(Role));
    const record = await getSignatoryRecord(user.id);

    return (
        <SectionCard
            title="Signatory"
            description="Your name, title and signature specimen for documents you sign."
        >
            <SignatoryForm record={record} />
        </SectionCard>
    );
}