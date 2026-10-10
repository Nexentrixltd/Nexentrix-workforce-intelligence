import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { roleRoutes } from "@/lib/utils";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) redirect("/auth");
  if (user.isFirstLogin) redirect("/change-password");

  redirect(roleRoutes[user.role as keyof typeof roleRoutes] ?? "/auth");
}