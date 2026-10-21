"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { Spinner } from "@/components/shared/spinner";
import { Role, roleRoutes } from "@/types/rbac";

type RoleGuardProps = {
  allowedRoles: Role[];
  children: React.ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const role = useUserStore((s) => s.user?.role) as Role | undefined;
  const isLoading = useUserStore((s) => s.isLoading);
  const hasFetchedUser = useUserStore((s) => s.hasFetchedUser);

  const allowed = !!role && allowedRoles.includes(role);

  useEffect(() => {
    if (!hasFetchedUser || isLoading || !role || allowed) return;

    const fallback = roleRoutes[role];
    if (fallback) router.replace(fallback);
  }, [hasFetchedUser, isLoading, role, allowed, router]);

  if (!hasFetchedUser || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}