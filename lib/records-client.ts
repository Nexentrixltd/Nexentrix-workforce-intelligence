export type FieldErrors = Record<string, string[] | undefined>;

export type SaveResult =
  | { ok: true; record: unknown }
  | { ok: false; error: string; fieldErrors: FieldErrors };

export async function sendJson(
  url: string,
  method: "PUT" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<SaveResult> {
  try {
    const res = await fetch(url, {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? "Something went wrong. Please try again.",
        fieldErrors: data.fieldErrors ?? {},
      };
    }
    return { ok: true, record: data.record ?? data.contact ?? data };
  } catch {
    return {
      ok: false,
      error: "Network error. Please try again.",
      fieldErrors: {},
    };
  }
}

export async function downscaleImage(
  file: File,
  maxDim: number,
  type: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.85,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([blob], `${base}.${type === "image/png" ? "png" : "jpg"}`, {
    type,
  });
}

export async function uploadRecordImage(
  kind: "passport-scan" | "signature",
  file: File,
): Promise<{ key: string } | { error: string }> {
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`/api/me/records/upload/${kind}`, {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.key) return { error: data.error ?? "Upload failed" };
    return { key: data.key as string };
  } catch {
    return { error: "Network error. Please try again." };
  }
}
