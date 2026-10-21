"use client";

import { useState } from "react";
import AddEmployeeModal, {
    type DepartmentOption,
    type ArmOption,
} from "./AddEmployeeModal";
import type { Role } from "@/types/rbac";

type Props = {
    departments: DepartmentOption[];
    arms: ArmOption[];
    allowedRoles: Role[];
};

export function AddEmployeeButton({ departments, arms, allowedRoles }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
                <span className="text-lg leading-none">+</span>
                Add Employee
            </button>

            <AddEmployeeModal
                open={open}
                onClose={() => setOpen(false)}
                departments={departments}
                arms={arms}
                allowedRoles={allowedRoles}
            />
        </>
    );
}