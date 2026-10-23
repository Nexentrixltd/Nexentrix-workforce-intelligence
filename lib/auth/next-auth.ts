export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (
    value === "/auth" ||
    value.startsWith("/auth/") ||
    value.startsWith("/auth?")
  )
    return null;
  return value;
}
