import { Role } from "@prisma/client";
import { getDocuments } from "@/lib/staff-records/queries";
import { SectionCard } from "@/components/records/ui";
import { requireRole } from "@/lib/auth/session";
import { DocumentsManager } from "@/components/records/forms/DocumentsManager";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireRole(Object.values(Role));
  const documents = await getDocuments(user.id);

  return (
    <SectionCard
      title="Documents"
      description="Upload your passport photograph, appointment letter and other important documents. HR reviews each one."
    >
      <DocumentsManager documents={documents} />
    </SectionCard>
  );
}