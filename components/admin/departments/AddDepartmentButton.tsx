"use client";

import { useState } from "react";
import AddDepartmentModal from "@/components/admin/departments/AddDepartmentModal";
import { Role } from "@/types/rbac";

export function AddDepartmentButton({ viewerRole }: { viewerRole: Role }) {
  const [open, setOpen] = useState(false);

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
      />
    </>
  );
}