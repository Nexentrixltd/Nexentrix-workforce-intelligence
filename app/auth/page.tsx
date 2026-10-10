"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { useUserStore } from "@/store/userStore";

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const remember = watch("remember");
  const { login } = useUserStore();

  const loginMutation = useMutation({
    mutationFn: login,

    onSuccess: (data) => {
      clearErrors();

      toast.success("Access granted", {
        description: `Welcome back ${data.user?.name ?? ""}`.trim(),
      });
    },

    onError: () => {
      const storeError = useUserStore.getState().error;

      toast.error("Authorization failed", {
        description: storeError || "Invalid credentials",
      });
    },
  });

  const onSubmit = (values: SignInInput) => {
    loginMutation.mutate(values);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-5">
        <section className="col-span-3 flex items-center justify-center px-6 py-12 lg:px-10">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-3">
              <div className="space-y-2">
                <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground">
                  Sign In
                </h2>
                <p className="text-center text-base text-muted-foreground">
                  Enter your credentials to access your dashboard.
                </p>
              </div>
            </div>

            <form className="space-y-7" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />

                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      {...register("email")}
                      className="peer h-14 w-full rounded-none border-0 border-b border-border bg-transparent px-0 pl-8 text-sm text-foreground shadow-none transition-all placeholder:text-primary focus-visible:border-primary focus-visible:ring-0"
                    />
                  </div>

                  {errors.email && (
                    <p className="text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />

                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      {...register("password")}
                      className="peer h-14 w-full rounded-none border-0 border-b border-border bg-transparent px-0 pl-8 pr-9 text-sm text-foreground shadow-none transition-all placeholder:text-primary focus-visible:border-primary focus-visible:ring-0"
                    />

                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="text-xs text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) =>
                      setValue("remember", Boolean(checked), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className="border-border data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Remember Me
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="mt-6 h-12 w-full rounded-md bg-primary text-lg font-semibold shadow-[0_0_24px_rgba(6,182,212,0.18)] transition-all hover:scale-[1.01] hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {loginMutation.isPending ? "Signing you in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </section>

        <section className="relative hidden col-span-2 overflow-hidden border-l border-white/5 bg-primary px-16 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,var(--color-accent)_1px,transparent_0)] bg-size-[32px_32px]" />
          </div>

          <div className="pointer-events-none absolute -right-40 top-1/2 h-155 w-155 -translate-y-1/2">
            <div className="h-full w-full bg-[radial-gradient(circle,rgba(6,182,212,0.18),transparent_70%)] blur-[110px]" />
          </div>

          {/* Logo watermark */}
          <div
            className="pointer-events-none absolute -bottom-24 -right-24 h-140 w-140 bg-primary-foreground opacity-[0.06]"
            style={{
              maskImage: "url(/logo-mark.svg)",
              maskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskImage: "url(/logo-mark.svg)",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
            }}
          />

          <div />

          <div className="relative z-10 max-w-lg space-y-8">
            <div className="space-y-5">
              <h1 className="flex flex-col font-triakis text-6xl leading-[0.95] tracking-tight">
                <span>Nexentrix</span>
                <span>Intelligent</span>
                <span className="font-triakis text-accent">Workforce</span>
                <span>Optimization.</span>
              </h1>
            </div>

            <p className="border-l-2 border-accent/20 pl-6 text-lg font-medium leading-relaxed text-primary-foreground/70">
              Bring clarity to your workforce. Nexentrix combines structured
              reporting, intelligent analytics, and real-time insights to help
              teams surface blockers, track progress, and drive consistent
              performance.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">
                  System Operational
                </span>
              </div>
            </div>

            <div className="h-px flex-1 bg-linear-to-r from-white/10 to-transparent" />
          </div>
        </section>
      </div>
    </main>
  );
}