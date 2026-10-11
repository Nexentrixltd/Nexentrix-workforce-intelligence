"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, Filter, ChevronRight } from "lucide-react";
import { colorFor, formatDate } from "@/components/shared/people";

export type HrDepartmentRow = {
  id: string;
  name: string;
  code: string;
  members: number;
  createdAt: string;
};

export function DepartmentsTable({
  departments,
}: {
  departments: HrDepartmentRow[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      [d.name, d.code].some((v) => v.toLowerCase().includes(q))
    );
  }, [departments, search]);

  const emptyState = (
    <div className="px-6 py-16 text-center">
      <Filter size={30} className="mx-auto mb-3 text-slate-300" />
      <p className="font-semibold text-slate-700">No departments found</p>
      <p className="mt-1 text-sm text-slate-500">
        Try searching with a different name or code.
      </p>
    </div>
  );

  const badge = (d: HrDepartmentRow) => (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${colorFor(d.id)}`}
    >
      {d.name.slice(0, 2).toUpperCase()}
    </div>
  );

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">All Departments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a department to see its members.
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
          {departments.length} departments
        </span>
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="relative w-full md:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            aria-label="Search departments"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden">
        {filtered.length === 0 ? (
          emptyState
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/hr/departments/${d.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50"
                >
                  {badge(d)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {d.name}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-medium text-slate-600">
                        {d.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-slate-400" />
                        {d.members}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Members</th>
              <th className="whitespace-nowrap px-6 py-4">Date Created</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <tr key={d.id} className="transition hover:bg-slate-50/70">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {badge(d)}
                    <span className="text-sm font-semibold text-slate-800">
                      {d.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                    {d.code}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={16} className="text-slate-400" />
                    {d.members}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {formatDate(d.createdAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/hr/departments/${d.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View members
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5}>{emptyState}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-5">
        Showing {filtered.length} of {departments.length} departments
      </div>
    </section>
  );
}