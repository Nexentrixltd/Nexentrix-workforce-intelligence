"use client";

import { useState } from "react";
import AddDepartmentModal, { type ArmOption } from "@/components/admin/departments/AddDepartmentModal";
import type { Role } from "@/types/rbac";

type Props = {
  viewerRole: Role;
  arms: ArmOption[];
};

export function AddDepartmentButton({ viewerRole, arms }: Props) {
  const [open, setOpen] = useState(false);
  console.log(arms, viewerRole)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
      >
        <span className="text-lg leading-none">+</span>
        Add Department
      </button>

      <AddDepartmentModal
        open={open}
        onClose={() => setOpen(false)}
        viewerRole={viewerRole}
        arms={arms}
      />
    </>
  );
}