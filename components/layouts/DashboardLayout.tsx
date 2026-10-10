"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { Spinner } from "@/components/ui/spinner";
import Header from "@/components/ui/Header";
import DashboardSidebar from "@/components/dashboard/Sidebar";

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const { user, isLoading, hasFetchedUser, fetchUser } = useUserStore();

  useEffect(() => {
    if (!hasFetchedUser && !isLoading) {
      fetchUser();
    }
  }, [hasFetchedUser, isLoading, fetchUser]);

  useEffect(() => {
    if (hasFetchedUser && !isLoading && !user) {
      router.replace("/auth");
    }
  }, [hasFetchedUser, isLoading, user, router]);

  if (!hasFetchedUser || isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-10 w-10 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex flex-1 flex-col">
        <Header />

        <main className="flex-1 md:ml-72 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
