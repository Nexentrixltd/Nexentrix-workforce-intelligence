"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { cn, dashboardNav } from "@/lib/utils";
import { Role } from "@/types/rbac";

const formatRole = (role: Role) =>
  role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const isLoggingOut = useUserStore((state) => state.isLoggingOut);

  if (!user) return null;

  const avatarUrl = user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.name || "User",
  )}&background=random`;

  const visibleSections = useMemo(() => {
    return dashboardNav
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          user?.role ? item.roles.includes(user.role as Role) : false,
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [user?.role]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getActiveHref = (items: { href: string }[]) => {
    const cleanPath = pathname.replace(/\/$/, "");

    let activeHref = "";
    let maxLength = 0;

    for (const item of items) {
      const cleanHref = item.href.replace(/\/$/, "");

      const isMatch =
        cleanPath === cleanHref ||
        (cleanPath.startsWith(cleanHref) &&
          cleanPath.charAt(cleanHref.length) === "/");

      if (isMatch && cleanHref.length > maxLength) {
        activeHref = cleanHref;
        maxLength = cleanHref.length;
      }
    }

    return activeHref;
  };

  return (
    <aside className="hidden fixed left-0 top-0 bottom-0 h-screen w-72 shrink-0 border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center">
            <img src="/assets/nexentrix.png" alt="Nexentrix" className="block h-full w-full object-contain dark:hidden" />

            <img
              src="/assets/logo-mark-white.svg"
              alt="Nexentrix"
              className="hidden h-full w-full object-contain dark:block"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              Nexentrix
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Workforce Intelligence
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-primary">
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const activeHref = getActiveHref(section.items);
                  const active = activeHref === item.href.replace(/\/$/, "");
                  const Icon = active ? item.iconFilled : item.iconOutline;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center justify-between rounded px-3 py-3 text-sm transition-all duration-200",
                        active
                          ? "bg-background text-text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active
                              ? "text-text-primary"
                              : "text-muted-foreground",
                          )}
                        />

                        <span
                          className={cn(
                            "truncate",
                            active ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.label}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="w-full flex flex-col items-start justify-between gap-4 p-4">
        <div className="flex gap-2 w-full">
          <img
            src={avatarUrl}
            alt={user.name || "User"}
            className="h-10 w-10 rounded object-cover border border-border/50"
          />

          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {user.name || "User"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}