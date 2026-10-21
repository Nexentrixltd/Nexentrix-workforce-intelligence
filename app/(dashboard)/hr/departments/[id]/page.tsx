import { requireRole } from "@/lib/auth/session";
import { DepartmentDetail } from "@/components/shared/DepartmentDetail";
import { hasPermission, Role } from "@/types/rbac";

export default async function HrDepartmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const hr = await requireRole(["HR"]);
    const role = hr.role as Role;
    const { id } = await params;

    return (
        <DepartmentDetail
            id={id}
            basePath="/hr/departments"
            viewerRole={role}
            canEdit={hasPermission(role, "EDIT_DEPARTMENT")}
        />
    );
}