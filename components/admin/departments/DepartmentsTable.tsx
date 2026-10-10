"use client";

import { useState } from "react";
import {
    Search,
    Users,
    MoreHorizontal,
    Eye,
    Pencil,
    Trash2,
    Filter,
} from "lucide-react";
import { Department } from "@/types/stores";
import ConfirmDeleteDepartmentModal from "./ConfirmDeleteDepartmentModal";
import EditDepartmentModal, { DepartmentToEdit } from "./EditDepartmentModal";

const departmentColors = [
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-sky-600",
    "bg-violet-600",
    "bg-teal-600",
    "bg-orange-600",
];

interface DepartmentToDelete {
    id: string;
    name: string;
    members: number;
}

export function DepartmentsTable({
    departments,
}: {
    departments: Department[];
}) {
    const [search, setSearch] = useState("");
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<DepartmentToDelete | null>(null);
    const [toEdit, setToEdit] = useState<DepartmentToEdit | null>(null);

    const filteredDepartments = departments.filter((department) =>
        [department.name, department.code].some((value) =>
            value.toLowerCase().includes(search.toLowerCase())
        )
    );

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-lg font-bold">All Departments</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Browse and manage your organization's departments.
                    </p>
                </div>

                <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
                    {departments.length} departments
                </span>
            </div>

            <div className="border-b border-slate-100 p-4">
                <div className="relative max-w-md">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by department name or code..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-left">
                    <thead className="bg-slate-50">
                        <tr className="text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Department Code</th>
                            <th className="px-6 py-4">Members</th>
                            <th className="px-6 py-4">Date Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {filteredDepartments.map((department, index) => (
                            <tr
                                key={department.id}
                                className="transition hover:bg-slate-50/70"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${departmentColors[index % departmentColors.length]
                                                }`}
                                        >
                                            {department.name.slice(0, 2).toUpperCase()}
                                        </div>

                                        <span className="text-sm font-semibold text-slate-800">
                                            {department.name}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                                        {department.code}
                                    </span>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Users size={16} className="text-slate-400" />
                                        {department.members}
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(department.createdAt).toLocaleDateString(
                                        "en-GB",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }
                                    )}
                                </td>

                                <td className="px-6 py-4 text-right">
                                    <div className="relative inline-block">
                                        <button
                                            onClick={() =>
                                                setOpenMenu(
                                                    openMenu === department.id
                                                        ? null
                                                        : department.id
                                                )
                                            }
                                            aria-label={`Actions for ${department.name}`}
                                            className="rounded-lg cursor-pointer p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            <MoreHorizontal size={20} />
                                        </button>

                                        {openMenu === department.id && (
                                            <div className="absolute right-0 z-10 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                                                <button
                                                    onClick={() => {
                                                        window.location.href =
                                                            `/admin/departments/${department.id}`;
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Eye size={15} /> View
                                                </button>

                                                <button
                                                    onClick={() =>
    setToEdit({ id: department.id, name: department.name, code: department.code })
  }
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Pencil size={15} /> Edit
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        setToDelete({ id: department.id, name: department.name, members: department.members })
                                                    }
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={15} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filteredDepartments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <Filter
                                        size={30}
                                        className="mx-auto mb-3 text-slate-300"
                                    />
                                    <p className="font-semibold text-slate-700">
                                        No departments found
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Try searching with a different name or code.
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                Showing {filteredDepartments.length} of {departments.length} departments
            </div>

            <ConfirmDeleteDepartmentModal
                department={toDelete}
                onClose={() => setToDelete(null)}
            />

            <EditDepartmentModal department={toEdit} onClose={() => setToEdit(null)} />
        </section>
    );
}
