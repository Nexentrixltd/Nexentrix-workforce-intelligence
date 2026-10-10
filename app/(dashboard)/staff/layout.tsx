import { RoleGuard } from "@/components/providers/RoleProvider";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["STAFF"]}>{children}</RoleGuard>;
}