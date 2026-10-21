import { requireRole } from "@/lib/auth/session";
import { DepartmentDetail } from "@/components/shared/DepartmentDetail";
import { hasPermission, Role } from "@/types/rbac";

export default async function AdminDepartmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const admin = await requireRole(["ADMIN"]);
    const role = admin.role as Role;
    const { id } = await params;

    return (
        <DepartmentDetail
            id={id}
            basePath="/admin/departments"
            viewerRole={role}
            canEdit={hasPermission(role, "EDIT_DEPARTMENT")}
        />
    );
}