"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const hasFetchedUser = useUserStore((state) => state.hasFetchedUser);
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    if (!hasFetchedUser && !isLoading && !user) {
      fetchUser();
    }
  }, [hasFetchedUser, isLoading, user, fetchUser]);

  return <>{children}</>;
}