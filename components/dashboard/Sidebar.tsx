
"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  ChevronLeft,
  Settings as SettingsIcon,
  UserRound,
  ShieldCheck,
  Bell,
} from "lucide-react";

import { useUserStore } from "@/store/userStore";
import { cn, dashboardNav } from "@/lib/utils";
import { Role } from "@/types/rbac";

const settingsNav = [
  {
    label: "Profile",
    href: "/settings/profile",
    iconOutline: UserRound,
    iconFilled: UserRound,
  },
  {
    label: "Security",
    href: "/settings/security",
    iconOutline: ShieldCheck,
    iconFilled: ShieldCheck,
  },
  {
    label: "Notifications",
    href: "/settings/notifications",
    iconOutline: Bell,
    iconFilled: Bell,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const isLoggingOut = useUserStore((state) => state.isLoggingOut);

  const [isSettingsPageActive, setIsSettingsPageActive] =
    useState(false);

  // Keep the correct navigation visible after refresh or direct navigation.
  useEffect(() => {
    setIsSettingsPageActive(
      pathname === "/settings" || pathname.startsWith("/settings/"),
    );
  }, [pathname]);

  const visibleSections = useMemo(() => {
    return dashboardNav
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          user?.role
            ? item.roles.includes(user.role as Role)
            : false,
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

  if (!user) return null;

  const allDashboardItems = visibleSections.flatMap(
    (section) => section.items,
  );

  const activeDashboardHref = getActiveHref(allDashboardItems);
  const activeSettingsHref = getActiveHref(settingsNav);

  return (
    <aside className="hidden fixed left-0 top-0 bottom-0 h-screen w-72 shrink-0 border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center">
            <img
              src="/assets/nexentrix.png"
              alt="Nexentrix"
              className="block h-full w-full object-contain dark:hidden"
            />

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
        {isSettingsPageActive ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setIsSettingsPageActive(false);
                router.push(`/${user?.role}/dashboard`);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div>
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-primary">
                Settings
              </p>

              <div className="space-y-1">
                {settingsNav.map((item) => {
                  const active =
                    activeSettingsHref ===
                    item.href.replace(/\/$/, "");

                  const Icon = active
                    ? item.iconFilled
                    : item.iconOutline;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center rounded-l-sm px-3 py-3 text-sm transition-all duration-200",
                        active
                          ? "bg-muted border-r-4 border-primary text-text-primary"
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
          </div>
        ) : (
          <div className="space-y-6">
            {visibleSections.map((section) => (
              <div key={section.label}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-primary">
                  {section.label}
                </p>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active =
                      activeDashboardHref ===
                      item.href.replace(/\/$/, "");

                    const Icon = active
                      ? item.iconFilled
                      : item.iconOutline;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          if (item.href === "/settings") {
                            setIsSettingsPageActive(true);
                          }
                        }}
                        className={cn(
                          "group flex items-center rounded-l-sm px-3 py-3 text-sm transition-all duration-200",
                          active
                            ? "bg-muted border-r-4 border-primary text-text-primary"
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
        )}
      </nav>

      <div className="flex w-full flex-col items-start justify-between gap-4 p-4">
        <div className="flex w-full gap-2">
          <img
            src={user.image || "/assets/default-avatar.png"}
            alt={user.name || "User"}
            className="h-10 w-10 rounded object-cover border border-border/50"
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-semibold">
              {user.name || "User"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          <span>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </button>
      </div>
    </aside>
  );
}
