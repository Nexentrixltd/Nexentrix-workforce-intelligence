import { Role } from "@prisma/client";
import { getProfileRecord } from "@/lib/staff-records/queries";
import { SectionCard } from "@/components/records/ui";
import { requireRole } from "@/lib/auth/session";
import { PersonalForm } from "@/components/records/forms/PersonalForm";
export const metadata = { title: "Personal details" };

export default async function PersonalPage() {
    const user = await requireRole(Object.values(Role));
    const record = await getProfileRecord(user.id);

    return (
        <SectionCard
            title="Personal details"
            description="Your contact details, address and basic information."
        >
            <PersonalForm record={record} />
        </SectionCard>
    );
}