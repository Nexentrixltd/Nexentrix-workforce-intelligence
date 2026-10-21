"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  UserRound,
  Info,
  Building2,
  CalendarDays,
  ShieldCheck,
  Mail,
  User,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { Role } from "@/types/rbac";

const API = {
  settings: "/api/settings",
  avatarSign: "/api/settings/avatar/sign",
  avatar: "/api/settings/avatar",
};

const SETTINGS_KEY = ["settings"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Settings = {
  name: string;
  email: string;
  image: string | null;
  role: Role;
  department: string | null;
  memberSince: string;
  reminderEnabled: boolean | null;
};

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
};

const formatRole = (role?: Role | null) => {
  if (!role) return "Not assigned";

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatDate = (date?: string | null) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function thumb(url: string | null | undefined, size: number) {
  if (!url) return null;
  if (!url.includes("/image/upload/")) return url;
  return url.replace(
    "/image/upload/",
    `/image/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`,
  );
}

async function api<T>(url: string, method = "GET"): Promise<T> {
  const res = await fetch(url, { method, credentials: "same-origin" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `Request failed (${res.status})`,
    );
  }
  return data as T;
}

async function uploadAvatar(file: File, onProgress: (percent: number) => void) {
  const sign = await api<SignResponse>(API.avatarSign, "POST");

  await new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sign.apiKey);
    form.append("timestamp", String(sign.timestamp));
    form.append("signature", sign.signature);
    form.append("public_id", sign.publicId);
    form.append("overwrite", "true");
    form.append("invalidate", "true");
    form.append("allowed_formats", "jpg,png,webp");

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    );
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "The upload failed. Please try again.";
      try {
        message = JSON.parse(xhr.responseText)?.error?.message ?? message;
      } catch {
      }
      reject(new Error(message));
    };
    xhr.onerror = () =>
      reject(new Error("Network error while uploading. Check your connection."));
    xhr.send(form);
  });

  return api<{ image: string }>(API.avatar, "POST");
}

const SettingsProfilePage = () => {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery<Settings>({
    queryKey: SETTINGS_KEY,
    queryFn: () => api<Settings>(API.settings),
  });

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const applyImage = (image: string | null) => {
    queryClient.setQueryData<Settings>(SETTINGS_KEY, (old) =>
      old ? { ...old, image } : old,
    );
    useUserStore.setState((state) => ({
      user: state.user ? ({ ...state.user, image } as typeof state.user) : state.user,
    }));
  };

  const clearSelection = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setProgress(0);
  };

  const saveMutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return uploadAvatar(file, setProgress);
    },
    onSuccess: ({ image }) => {
      applyImage(image);
      clearSelection();
      toast.success("Profile photo updated");
    },
    onError: (error: Error) => {
      setPhotoError(error.message);
      setProgress(0);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => api<{ image: null }>(API.avatar, "DELETE"),
    onSuccess: () => {
      applyImage(null);
      setConfirmRemove(false);
      toast.success("Profile photo removed");
    },
    onError: (error: Error) => {
      setConfirmRemove(false);
      setPhotoError(error.message);
    },
  });

  const saving = saveMutation.isPending;
  const removing = removeMutation.isPending;
  const busy = saving || removing;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setPhotoError(null);
    setConfirmRemove(false);

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Your photo must be smaller than 5 MB.");
      return;
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const displayName = profile?.name ?? user?.name ?? "";
  const displayEmail = profile?.email ?? user?.email ?? "";
  const displayRole = profile?.role ?? user?.role;

  const formattedRole = formatRole(displayRole as Role | undefined);
  const memberSince = formatDate(profile?.memberSince);

  const currentImage = profile ? profile.image : (user?.image ?? null);
  const avatarSrc = photoPreview ?? thumb(currentImage, 192);

  return (
    <div className="w-full max-w-5xl space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-triakis tracking-tight md:text-4xl">
          Profile Settings
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage your profile photo and view your account information
          on Nexentrix.
        </p>
      </div>

      <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

        <div className="space-y-1">
          <p className="text-sm font-semibold">
            Account information changes
          </p>

          <p className="text-sm leading-6 text-muted-foreground">
            You can change your profile photo here. To change your
            account name, email address, or role, please contact the
            HR or Admin department for assistance.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold">
            Personal information
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Your profile photo and account details.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName || "Profile photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-10 w-10 text-muted-foreground" />
              )}

              {saving && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <LoaderCircle className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Profile photo</p>

                <p className="text-sm leading-6 text-muted-foreground">
                  Choose a photo to represent you across Nexentrix.
                  JPG, PNG, or WebP, up to 5 MB.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />

              <div className="flex flex-wrap items-center gap-3">
                {selectedPhoto ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveMutation.mutate(selectedPhoto)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {saving
                        ? progress >= 100
                          ? "Finishing up..."
                          : `Uploading ${progress}%`
                        : "Save photo"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        clearSelection();
                        setPhotoError(null);
                      }}
                      disabled={busy}
                      className="rounded-md border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Camera className="h-4 w-4" />
                      Change photo
                    </button>

                    {currentImage && (
                      <button
                        type="button"
                        onClick={() =>
                          confirmRemove
                            ? removeMutation.mutate()
                            : setConfirmRemove(true)
                        }
                        onBlur={() => setConfirmRemove(false)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removing ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {removing
                          ? "Removing..."
                          : confirmRemove
                            ? "Click again to remove"
                            : "Remove photo"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {saving && (
                <div
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {photoError && (
                <p role="alert" className="text-sm text-destructive">
                  {photoError}
                </p>
              )}

              {selectedPhoto && !saving && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedPhoto.name}. Select Save photo to
                  upload it.
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-border" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <label
                htmlFor="profile-name"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <User className="h-4 w-4" />
                Full name
              </label>

              <input
                id="profile-name"
                value={displayName}
                readOnly
                aria-readonly="true"
                className="h-11 w-full cursor-not-allowed rounded-md border border-border/60 bg-muted px-3 text-sm text-muted-foreground outline-none"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label
                htmlFor="profile-email"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Mail className="h-4 w-4" />
                Email address
              </label>

              <input
                id="profile-email"
                type="email"
                value={displayEmail}
                readOnly
                aria-readonly="true"
                className="h-11 w-full cursor-not-allowed rounded-md border border-border/60 bg-muted px-3 text-sm text-muted-foreground outline-none"
              />
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Name and email changes must be requested through HR/Admin.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-base font-semibold">
            Account information
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Details associated with your Nexentrix account.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading account information...
          </div>
        ) : isError ? (
          <div className="space-y-3 p-6">
            <p role="alert" className="text-sm text-destructive">
              Unable to load your account information.
            </p>

            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Account role
              </span>

              <span className="w-fit rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium">
                {formattedRole}
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Department
              </span>

              <span className="text-sm font-medium">
                {profile?.department || "Not assigned"}
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Member since
              </span>

              <span className="text-sm font-medium">
                {memberSince}
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">
                Email address
              </span>

              <span className="break-all text-sm font-medium">
                {displayEmail || "Not available"}
              </span>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">
                Full name
              </span>

              <span className="text-sm font-medium">
                {displayName || "Not available"}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsProfilePage;