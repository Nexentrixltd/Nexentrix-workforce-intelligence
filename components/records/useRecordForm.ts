"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sendJson, type FieldErrors } from "@/lib/records-client";
import { toast } from "sonner";

type Message = { type: "success" | "error"; text: string };

type Options<V> = {
  method?: "PUT" | "POST" | "PATCH";
  successText?: string;
  afterSave?: (values: V) => V;
  onSuccess?: () => void;
};

export function useRecordForm<V extends Record<string, unknown>>(
  initial: V,
  url: string,
  options: Options<V> = {},
) {
  const router = useRouter();
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const set = <K extends keyof V & string>(key: K, value: V[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const fieldError = (key: string) => errors[key]?.[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors({});

    const result = await sendJson(url, options.method ?? "PUT", values);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors);
      toast.error(result.error ?? "Failed to save. Please try again.");
      return;
    }

    toast.success(options.successText ?? "Saved successfully.");
    if (options.afterSave) setValues((v) => options.afterSave!(v));
    options.onSuccess?.();
    router.refresh();
  };

  return { values, set, fieldError, saving, message, submit };
}
