"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { useUserStore } from "@/store/userStore";
import { roleRoutes } from "@/lib/utils";

export default function LoginLayout({ children }: { children: ReactNode }) {
  const role = useUserStore((s) => s.user?.role);
  const router = useRouter();

  useEffect(() => {
    if (!role) return;

    const destination = roleRoutes[role as keyof typeof roleRoutes];
    if (destination) {
      router.replace(destination);
    }
  }, [role, router]);

  return <QueryProvider>{children}</QueryProvider>;
}