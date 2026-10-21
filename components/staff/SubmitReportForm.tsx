"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, ReportInput, reportSchema } from "@/lib/validations/reports";
import { reportDateRange, todayInTz } from "@/lib/report-dates";

const DRAFT_KEY = "nexentrix:report-draft";

const MOODS = [
  { value: 1, emoji: "😞", label: "Low energy" },
  { value: 2, emoji: "😐", label: "Neutral" },
  { value: 3, emoji: "🙂", label: "Focused" },
  { value: 4, emoji: "😊", label: "High energy" },
  { value: 5, emoji: "🔥", label: "Unstoppable" },
];

const HOUR_PRESETS = [2, 4, 6, 8];

type ProjectOption = { id: string; name: string; code: string; status: string };

type Attachment = {
  key: string;
  file: File;
  url: string;
  publicId?: string;
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  type: string;
  allowedFormats: string;
  signature: string;
};

const todayISO = () => new Date().toLocaleDateString("en-CA");

const blank = (): ReportInput => ({
  reportDate: todayInTz(),
  projectId: "",
  hoursSpent: 0,
  mood: 3,
  tasksCompleted: "",
  tasksInProgress: "",
  blockers: "",
  tomorrowPriority: "",
});

const inputClass = (invalid?: boolean) =>
  `w-full rounded-xl border bg-muted px-4 py-3 text-sm text-on-surface transition placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 ${invalid ? "border-error" : "border-outline-variant/30"
  }`;
const labelClass = "mb-1.5 block text-sm font-medium";
const hintClass = "mt-1.5 text-xs text-muted-foreground";
const errorClass = "mt-1.5 text-xs font-medium text-error";

async function uploadToCloudinary(file: File, sig: UploadSignature) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  fd.append("type", sig.type);
  fd.append("allowed_formats", sig.allowedFormats);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) throw new Error("Image upload failed");
  const json = await res.json();
  return json.public_id as string;
}

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
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default function SubmitReportForm() {
  const [images, setImages] = useState<Attachment[]>([]);
  const [compressing, setCompressing] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading">("idle");
  const imagesRef = useRef<Attachment[]>([]);
  imagesRef.current = images;

  const { min: minDate, max: maxDate } = reportDateRange();
  const qc = useQueryClient();

  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const { data: submitted } = useQuery<
    { date: string; projectId: string | null }[]
  >({
    queryKey: ["my-report-dates"],
    queryFn: async () => {
      const res = await fetch("/api/reports/submitted");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const openProjects = (projects ?? []).filter(
    (p) => p.status !== "COMPLETED" && p.status !== "CANCELLED",
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: blank(),
  });

  const hours = watch("hoursSpent");
  const mood = watch("mood");
  const completedLength = watch("tasksCompleted")?.length ?? 0;
  const selectedDate = watch("reportDate");
  const selectedProject = watch("projectId") || null;

  const reportedToday = (submitted ?? []).filter((s) => s.date === selectedDate);
  const alreadySubmitted = reportedToday.some(
    (s) => s.projectId === selectedProject,
  );
  const reportedProjectIds = new Set(reportedToday.map((s) => s.projectId));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) reset({ ...blank(), ...JSON.parse(raw) });
    } catch { }
  }, [reset]);

  useEffect(() => {
    const sub = watch((values) => {
      try {
        const { reportDate, ...rest } = values;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      } catch { }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  useEffect(
    () => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.url)),
    [],
  );

  async function addImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (images.length + compressing + files.length > MAX_IMAGES) {
      toast.error(`You can attach up to ${MAX_IMAGES} images`);
      return;
    }

    const valid = files.filter((f) => {
      if (!IMAGE_TYPES.includes(f.type)) {
        toast.error(`${f.name} is not a PNG, JPG or WebP image`);
        return false;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name} is larger than 10MB`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    setCompressing((c) => c + valid.length);
    const { default: imageCompression } = await import(
      "browser-image-compression"
    );

    await Promise.all(
      valid.map(async (original) => {
        try {
          const file = await imageCompression(original, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: "image/jpeg",
            initialQuality: 0.8,
          });
          setImages((prev) => [
            ...prev,
            {
              key: crypto.randomUUID(),
              file,
              url: URL.createObjectURL(file),
            },
          ]);
        } catch {
          toast.error(`${original.name} could not be processed`);
        } finally {
          setCompressing((c) => c - 1);
        }
      }),
    );
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.key !== key);
    });
  }

  function clearAll() {
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    reset(blank());
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch { }
  }

  function discard() {
    if (!confirm("Discard this draft? What you have written will be lost."))
      return;
    clearAll();
  }

  async function onSubmit(values: ReportInput) {
    try {
      const pending = images.filter((i) => !i.publicId);
      if (pending.length > 0) {
        setStage("uploading");
        const sigRes = await fetch("/api/reports/uploads/sign", {
          method: "POST",
        });
        if (!sigRes.ok) throw new Error("Could not start the image upload");
        const sig: UploadSignature = await sigRes.json();

        const uploaded = await Promise.all(
          pending.map(async (img) => ({
            key: img.key,
            publicId: await uploadToCloudinary(img.file, sig),
          })),
        );
        const byKey = new Map(uploaded.map((u) => [u.key, u.publicId]));
        setImages((prev) =>
          prev.map((i) =>
            byKey.has(i.key) ? { ...i, publicId: byKey.get(i.key) } : i,
          ),
        );
        pending.forEach((p) => (p.publicId = byKey.get(p.key)));
      }

      setStage("idle");
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          images: images.map((i) => i.publicId).filter(Boolean),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const e = body.error;
        toast.error(
          typeof e === "string"
            ? e
            : e
              ? ((Object.values(e)[0] as string[])?.[0] ?? "Could not submit")
              : "Could not submit your report",
        );
        return;
      }

      toast.success("Report submitted");
      qc.invalidateQueries({ queryKey: ["my-report-dates"] });
      clearAll();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit your report");
    } finally {
      setStage("idle");
    }
  }

  const busy = isSubmitting || compressing > 0 || alreadySubmitted;
  const submitLabel = isSubmitting
    ? stage === "uploading"
      ? "Uploading images..."
      : "Submitting..."
    : compressing > 0
      ? "Preparing images..."
      : "Submit report";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-4xl">
      <Section
        title="Report details"
        description="Which day and project this report covers."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="reportDate" className={labelClass}>
              Date
            </label>
            <input
              id="reportDate"
              type="date"
              min={minDate}
              max={maxDate}
              className={inputClass(!!errors.reportDate)}
              {...register("reportDate")}
            />
            {errors.reportDate ? (
              <p className={errorClass}>{errors.reportDate.message}</p>
            ) : (
              <p className={hintClass}>Today or up to 6 days earlier.</p>
            )}
          </div>

          <div>
            <label htmlFor="projectId" className={labelClass}>
              Project
            </label>
            <select
              id="projectId"
              className={inputClass(!!errors.projectId || alreadySubmitted)}
              {...register("projectId")}
            >
              <option value="" disabled={reportedProjectIds.has(null)}>
                No project (general work)
                {reportedProjectIds.has(null) ? " (already reported)" : ""}
              </option>
              {openProjects.map((p) => (
                <option key={p.id} value={p.id} disabled={reportedProjectIds.has(p.id)}>
                  {p.name}
                  {reportedProjectIds.has(p.id) ? " (already reported)" : ""}
                </option>
              ))}
            </select>
            {errors.projectId ? (
              <p className={errorClass}>{errors.projectId.message}</p>
            ) : alreadySubmitted ? (
              <p className={errorClass}>
                You already reported on this for this date. Pick another project or date.
              </p>
            ) : (
              <p className={hintClass}>One report per project each day.</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="hoursSpent" className={labelClass}>
            Hours worked
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {HOUR_PRESETS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setValue("hoursSpent", h, { shouldDirty: true })}
                aria-pressed={hours === h}
                className={`h-11 min-w-14 rounded-xl border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${hours === h
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-outline-variant/30 bg-surface-container text-on-surface hover:border-outline-variant"
                  }`}
              >
                {h}h
              </button>
            ))}
            <input
              id="hoursSpent"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={16}
              step={0.5}
              placeholder="Other"
              value={hours ? hours : ""}
              onChange={(e) =>
                setValue(
                  "hoursSpent",
                  e.target.value === "" ? 0 : Number(e.target.value),
                  { shouldDirty: true },
                )
              }
              className={`${inputClass(!!errors.hoursSpent)} h-11 w-28 py-0`}
            />
          </div>
          {errors.hoursSpent && (
            <p className={errorClass}>{errors.hoursSpent.message}</p>
          )}
        </div>
      </Section>

      <Section
        title="Work done"
        description="What moved forward today, and what got in the way."
      >
        <div>
          <label htmlFor="tasksCompleted" className={labelClass}>
            Completed today
          </label>
          <textarea
            id="tasksCompleted"
            rows={4}
            placeholder="What did you finish today?"
            className={`${inputClass(!!errors.tasksCompleted)} resize-y`}
            {...register("tasksCompleted")}
          />
          <div className="flex justify-between">
            {errors.tasksCompleted ? (
              <p className={errorClass}>{errors.tasksCompleted.message}</p>
            ) : (
              <span />
            )}
            <p className={hintClass}>{completedLength} / 3000</p>
          </div>
        </div>

        <div>
          <label htmlFor="tasksInProgress" className={labelClass}>
            Still in progress
          </label>
          <textarea
            id="tasksInProgress"
            rows={3}
            placeholder="What are you part-way through?"
            className={`${inputClass(!!errors.tasksInProgress)} resize-y`}
            {...register("tasksInProgress")}
          />
        </div>

        <div>
          <label htmlFor="blockers" className={labelClass}>
            Blockers
          </label>
          <textarea
            id="blockers"
            rows={3}
            placeholder="Anything slowing you down? Leave empty if nothing."
            className={`${inputClass(!!errors.blockers)} resize-y`}
            {...register("blockers")}
          />
          <p className={hintClass}>
            Tell your team lead what is slowing you down.
          </p>
        </div>
      </Section>

      <Section
        title="Looking ahead"
        description="Your plan for tomorrow and how today felt."
      >
        <div>
          <label htmlFor="tomorrowPriority" className={labelClass}>
            Priorities for tomorrow
          </label>
          <textarea
            id="tomorrowPriority"
            rows={3}
            placeholder="What matters most tomorrow?"
            className={`${inputClass(!!errors.tomorrowPriority)} resize-y`}
            {...register("tomorrowPriority")}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>How was your day?</legend>
          <div role="radiogroup" className="grid grid-cols-5 gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mood === m.value}
                onClick={() => setValue("mood", m.value, { shouldDirty: true })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${mood === m.value
                  ? "border-primary bg-primary/10"
                  : "border-outline-variant/30 bg-surface-container hover:border-outline-variant"
                  }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {m.emoji}
                </span>
                <span
                  className={`text-xs ${mood === m.value
                    ? "font-medium text-primary"
                    : "text-on-surface-variant"
                    }`}
                >
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section
        title="Screenshots"
        description="Optional proof of your work. Up to 5 images, PNG, JPG or WebP. They are shrunk automatically before upload."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img, i) => (
            <div
              key={img.key}
              className="relative aspect-square overflow-hidden rounded-xl border border-outline-variant/30 bg-surface"
            >
              <img
                src={img.url}
                alt={`Screenshot ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.key)}
                disabled={isSubmitting}
                aria-label={`Remove screenshot ${i + 1}`}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {Array.from({ length: compressing }).map((_, i) => (
            <div
              key={`busy-${i}`}
              className="flex aspect-square animate-pulse items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container text-xs text-on-surface-variant"
            >
              Shrinking...
            </div>
          ))}

          {images.length + compressing < MAX_IMAGES && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-outline-variant/40 text-on-surface-variant transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-within:ring-4 focus-within:ring-primary/15">
              <ImagePlus size={20} />
              <span className="text-xs">Add</span>
              <input
                type="file"
                multiple
                accept={IMAGE_TYPES.join(",")}
                onChange={addImages}
                className="sr-only"
              />
            </label>
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 border-t border-outline-variant/20 bg-background/85 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant">
            Your text is saved on this device until you submit.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={discard}
              disabled={isSubmitting}
              className="h-11 rounded-xl px-5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50"
            >
              Discard draft
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}