import { Role } from "@prisma/client";
import { getEmergencyContacts } from "@/lib/staff-records/queries";
import { SectionCard } from "@/components/records/ui";
import { requireRole } from "@/lib/auth/session";
import { EmergencyContacts } from "@/components/records/forms/EmergencyContact";

export const metadata = { title: "Emergency contacts" };

export default async function EmergencyPage() {
    const user = await requireRole(Object.values(Role));
    const contacts = await getEmergencyContacts(user.id);

    return (
        <SectionCard
            title="Emergency contacts"
            description="People HR can reach if something happens. Add up to 5."
        >
            <EmergencyContacts contacts={contacts} />
        </SectionCard>
    );
}