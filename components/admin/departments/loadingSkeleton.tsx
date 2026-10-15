import {
    Plus,
    Building2,
    Users,
    Search,
    MoreHorizontal,
} from "lucide-react";

export default function DepartmentsLoading() {
    return (<div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"> <div className="space-y-2"> <div className="h-7 w-52 animate-pulse rounded-lg bg-slate-200" /> <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" /> </div>
            <div className="h-10 w-40 animate-pulse rounded-xl bg-indigo-200" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="space-y-3">
                            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                            <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-200" />
                        </div>

                        <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
                    </div>

                    <div className="mt-4 h-3 w-36 animate-pulse rounded bg-slate-100" />
                </div>
            ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div className="space-y-2">
                    <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />
                </div>

                <div className="h-8 w-32 animate-pulse rounded-lg bg-indigo-50" />
            </div>

            <div className="border-b border-slate-100 p-4">
                <div className="relative max-w-md">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                    />
                    <div className="h-11 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-left">
                    <thead className="bg-slate-50">
                        <tr className="text-xs uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Department Code</th>
                            <th className="px-6 py-4">Members</th>
                            <th className="px-6 py-4">Date Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
                                        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="h-6 w-20 animate-pulse rounded-md bg-slate-100" />
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-slate-200" />
                                        <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
                                    </div>
                                </td>

                                <td className="px-6 py-4">
                                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                                </td>

                                <td className="px-6 py-4">
                                    <div className="flex justify-end">
                                        <MoreHorizontal size={20} className="text-slate-200" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
            </div>
        </section>
    </div>
    );
}
