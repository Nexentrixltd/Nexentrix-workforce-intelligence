import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/change-password/ChangePassword";
import { roleRoutes } from "@/types/rbac";

export default async function ChangePasswordPage() {
    const user = await getSessionUser();
    if (!user) redirect("/auth");

    const destination =
        roleRoutes[user.role as keyof typeof roleRoutes] ?? "/auth";

    if (!user.isFirstLogin) redirect(destination);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-muted p-6 shadow-sm sm:p-8">
                <h1 className="font-triakis text-3xl tracking-tight">Set your password</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Welcome, {user.name}. For your security, replace the temporary
                    password you were given before continuing.
                </p>

                <ChangePasswordForm destination={destination} />
            </div>
        </div>
    );
}