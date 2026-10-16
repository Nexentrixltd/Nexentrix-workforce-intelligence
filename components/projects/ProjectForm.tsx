"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  projectSchema,
  PROJECT_STATUSES,
  type ProjectInput,
} from "@/lib/validations/project";

type Options = {
  departments: { id: string; name: string }[];
  users: { id: string; name: string; role: string }[];
};

type Props = {
  defaultValues?: Partial<ProjectInput>;
  submitLabel: string;
  onSubmit: (values: ProjectInput) => Promise<void>;
  onCancel?: () => void;
};

const STATUS_STYLE: Record<string, { label: string; dot: string }> = {
  PLANNING: { label: "Planning", dot: "bg-sky-400" },
  ACTIVE: { label: "Active", dot: "bg-emerald-400" },
  ON_HOLD: { label: "On hold", dot: "bg-amber-400" },
  COMPLETED: { label: "Completed", dot: "bg-indigo-400" },
  CANCELLED: { label: "Cancelled", dot: "bg-red-400" },
};

const inputBase =
  "w-full rounded-lg border bg-white px-3.5 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";
const inputClass = (invalid?: boolean) =>
  `${inputBase} h-11 ${invalid ? "border-red-400" : "border-gray-200"}`;

const labelClass = "mb-1.5 block text-sm font-medium text-gray-900";
const hintClass = "mt-1.5 text-xs text-muted-foreground";
const errorClass = "mt-1.5 text-xs font-medium text-red-600";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 py-8 first:border-t-0 first:pt-0">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function ProjectForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { data: options } = useQuery<Options>({
    queryKey: ["admin-project-options"],
    queryFn: async () => {
      const res = await fetch("/api/projects/options");
      if (!res.ok) throw new Error("Failed to load options");
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      status: "PLANNING",
      startDate: "",
      endDate: "",
      departmentId: "",
      leadId: "",
      ...defaultValues,
    },
  });

  const leads = options?.users.filter((u) => u.role === "TEAM_LEAD") ?? [];
  const descLength = watch("description")?.length ?? 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Section
        title="Details"
        description="What the project is called and what it is for."
      >
        <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
          <div>
            <label htmlFor="name" className={labelClass}>
              Project name
            </label>
            <input
              id="name"
              className={inputClass(!!errors.name)}
              placeholder="e.g. Payroll system rollout"
              {...register("name")}
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="code" className={labelClass}>
              Project code
            </label>
            <input
              id="code"
              className={`${inputClass(!!errors.code)} uppercase tabular-nums`}
              placeholder="NXT-2026-001"
              {...register("code")}
            />
            {errors.code && <p className={errorClass}>{errors.code.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className={`${inputBase} resize-y py-3 ${
              errors.description ? "border-red-400" : "border-gray-200"
            }`}
            placeholder="Goals, scope and what done looks like."
            {...register("description")}
          />
          <div className="flex justify-between">
            {errors.description ? (
              <p className={errorClass}>{errors.description.message}</p>
            ) : (
              <span />
            )}
            <p className={hintClass}>{descLength} / 2000</p>
          </div>
        </div>
      </Section>

      <Section
        title="Schedule"
        description="Where the project is now and when it runs."
      >
        <fieldset>
          <legend className={labelClass}>Status</legend>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STATUSES.map((s) => (
              <label key={s} className="relative cursor-pointer">
                <input
                  type="radio"
                  value={s}
                  className="peer sr-only"
                  {...register("status")}
                />
                <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`}
                  />
                  {STATUS_STYLE[s].label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className={labelClass}>
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              className={inputClass(!!errors.startDate)}
              {...register("startDate")}
            />
          </div>
          <div>
            <label htmlFor="endDate" className={labelClass}>
              End date
            </label>
            <input
              id="endDate"
              type="date"
              className={inputClass(!!errors.endDate)}
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className={errorClass}>{errors.endDate.message}</p>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Ownership"
        description="Who is accountable and which department owns it."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="leadId" className={labelClass}>
              Project lead
            </label>
            <select
              id="leadId"
              className={inputClass(!!errors.leadId)}
              {...register("leadId")}
            >
              <option value="">Select a team lead</option>
              {leads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {errors.leadId ? (
              <p className={errorClass}>{errors.leadId.message}</p>
            ) : (
              <p className={hintClass}>
                The lead is added as a member automatically.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="departmentId" className={labelClass}>
              Owning department
            </label>
            <select
              id="departmentId"
              className={inputClass()}
              {...register("departmentId")}
            >
              <option value="">No department</option>
              {options?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className={hintClass}>Members can come from any department.</p>
          </div>
        </div>
      </Section>

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-white/85 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-lg px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}