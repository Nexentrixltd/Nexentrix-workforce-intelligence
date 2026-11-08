"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { downscaleImage, uploadRecordImage } from "@/lib/records-client";
import { Field, secondaryButton } from "@/components/records/ui";

type Props = {
  kind: "passport-scan" | "signature";
  label: string;
  hasExisting: boolean;
  onUploaded: (key: string) => void;
  maxDim: number;
  outputType?: "image/jpeg" | "image/png";
  error?: string;
  hint?: string;
  required?: boolean;
};

export function ImageUpload({
  kind,
  label,
  hasExisting,
  onUploaded,
  maxDim,
  outputType = "image/jpeg",
  error,
  hint,
  required,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLocalError(null);
    setBusy(true);
    try {
      const processed = await downscaleImage(file, maxDim, outputType);
      const result = await uploadRecordImage(kind, processed);
      if ("error" in result) {
        setLocalError(result.error);
        return;
      }
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(processed));
      onUploaded(result.key);
    } catch {
      setLocalError("Could not read this image. Use a JPG, PNG or WebP file.");
    } finally {
      setBusy(false);
    }
  }

  const shownSrc = preview ?? (hasExisting ? `/api/me/records/file/${kind}` : null);

  return (
    <Field
      label={label}
      htmlFor={`upload-${kind}`}
      error={localError ?? error}
      hint={hint}
      required={required}
    >
      <div className="space-y-3">
        {shownSrc ? (
          <img
            src={shownSrc}
            alt={label}
            className="max-h-56 rounded-md border border-gray-200 bg-white object-contain dark:border-gray-800"
          />
        ) : null}
        <input
          ref={inputRef}
          id={`upload-${kind}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onChange}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={secondaryButton}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : shownSrc ? "Replace image" : "Choose image"}
          </button>
          {preview ? (
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Uploaded. Save the form to keep it.
            </span>
          ) : null}
        </div>
      </div>
    </Field>
  );
}