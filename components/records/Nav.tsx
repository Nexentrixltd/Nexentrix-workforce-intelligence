"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
    { href: "/settings/records", label: "Overview", exact: true },
    { href: "/settings/records/personal", label: "Personal" },
    { href: "/settings/records/emergency", label: "Emergency contacts" },
    { href: "/settings/records/passport", label: "Passport" },
    { href: "/settings/records/payroll", label: "Payroll" },
    { href: "/settings/records/signatory", label: "Signatory" },
];

export function RecordsNav() {
    const pathname = usePathname();

    return (
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Records sections">
            {ITEMS.map((item) => {
                const active = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${active
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}