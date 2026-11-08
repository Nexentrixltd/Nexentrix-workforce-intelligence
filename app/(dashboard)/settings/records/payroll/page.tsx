import { Role } from "@prisma/client";
import { getPayrollRecord } from "@/lib/staff-records/queries";
import { SectionCard } from "@/components/records/ui";
import { requireRole } from "@/lib/auth/session";
import { PayrollForm } from "@/components/records/forms/PayrollForm";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = await requireRole(Object.values(Role));
  const record = await getPayrollRecord(user.id);

  return (
    <SectionCard
      title="Payroll"
      description="Your account number, name and bank information are stored encrypted and only HR can view them."
    >
      <PayrollForm record={record} />
    </SectionCard>
  );
}