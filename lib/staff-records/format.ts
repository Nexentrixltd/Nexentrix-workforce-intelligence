export const formatDateTime = (iso: string) =>
  `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export const formatBytes = (n: number) =>
    n < 1024 * 1024
        ? `${Math.max(1, Math.round(n / 1024))} KB`
        : `${(n / 1024 / 1024).toFixed(1)} MB`;