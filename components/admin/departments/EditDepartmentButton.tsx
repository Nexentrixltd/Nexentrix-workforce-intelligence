"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import EditDepartmentModal, {
    type DepartmentToEdit,
} from "./EditDepartmentModal";
import { Role } from "@/types/rbac";

type Props = {
    department: DepartmentToEdit;
    viewerRole: Role;
};

export function EditDepartmentButton({ department, viewerRole }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
                <Pencil size={16} />
                Edit department
            </button>

            <EditDepartmentModal
                department={open ? department : null}
                viewerRole={viewerRole}
                onClose={() => setOpen(false)}
            />
        </>
    );
}