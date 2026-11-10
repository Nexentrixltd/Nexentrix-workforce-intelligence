"use client";

import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type FormEvent,
    type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    BookOpen,
    Briefcase,
    Camera,
    CheckCircle2,
    Clock,
    CreditCard,
    Download,
    Eye,
    FileText,
    FolderOpen,
    GraduationCap,
    Lock,
    Paperclip,
    Receipt,
    Trash2,
    UploadCloud,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocumentDto } from "@/lib/staff-records/queries";
import {
    ACCEPT_ALL,
    ACCEPT_IMAGES,
    DOCUMENT_LABELS,
    DOCUMENT_TYPES,
    IMAGE_ONLY_TYPES,
    MAX_DOCUMENT_BYTES,
    REQUIRED_DOCUMENT_TYPES,
    type DocumentTypeKey,
} from "@/lib/staff-records/documents";
import { downscaleImage, sendJson, type FieldErrors } from "@/lib/records-client";
import { formatBytes } from "@/lib/staff-records/format";

const BASE = "/api/me/records/documents";

const IMAGE_MIME = ACCEPT_IMAGES.split(",");
const isPdfFile = (f: File) =>
    f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImageFile = (f: File) => IMAGE_MIME.includes(f.type);
const ALL_MIME = ACCEPT_ALL.split(",");

const TYPE_ICONS: Record<DocumentTypeKey, LucideIcon> = {
    PASSPORT_PHOTO: Camera,
    APPOINTMENT_LETTER: FileText,
    EDUCATION_CERTIFICATE: GraduationCap,
    NATIONAL_ID: CreditCard,
    CV: Briefcase,
    EMPLOYEE_HANDBOOK: BookOpen,
    DEFERRED_PAYMENT_FORM: Receipt,
    OTHER: Paperclip,
};

const TIPS: Record<DocumentTypeKey, string> = {
    PASSPORT_PHOTO:
        "A recent passport-style photo: plain background, face centred and clearly visible, no filters. JPG, PNG or WebP.",
    APPOINTMENT_LETTER:
        "A clear scan or photo of your signed appointment letter. A PDF works best.",
    EDUCATION_CERTIFICATE: "A clear scan or photo of your certificate. PDF or image.",
    NATIONAL_ID: "Both sides in one file if you can. Make sure all details are readable.",
    CV: "Your latest CV or resume, preferably as a PDF.",
    EMPLOYEE_HANDBOOK:
        "Your signed acknowledgement of the employee handbook. A PDF or clear scan works best.",
    DEFERRED_PAYMENT_FORM:
        "Your completed and signed deferred payment form. A PDF or clear scan works best.",
    OTHER: "Give it a short title so HR knows what it is, for example “Guarantor form”.",
};

const STATUS: Record<
    DocumentDto["status"],
    { label: string; icon: LucideIcon; className: string }
> = {
    VERIFIED: {
        label: "Verified",
        icon: CheckCircle2,
        className:
            "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400",
    },
    PENDING: {
        label: "Pending review",
        icon: Clock,
        className: "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-400",
    },
    REJECTED: {
        label: "Rejected",
        icon: XCircle,
        className: "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400",
    },
};

const fieldClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15";

const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";

const ghostBtn =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDate = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};

type Message = { type: "success" | "error"; text: string };
type UploadResult = { ok: boolean; data: { error?: string; fieldErrors?: FieldErrors } };

function uploadWithProgress(
    url: string,
    form: FormData,
    onProgress: (pct: number) => void
): Promise<UploadResult> {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            let data: UploadResult["data"] = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch { }
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
        };
        xhr.onerror = () =>
            resolve({ ok: false, data: { error: "Network error. Please try again." } });
        xhr.send(form);
    });
}

function StatusChip({ status }: { status: DocumentDto["status"] }) {
    const s = STATUS[status];
    const Icon = s.icon;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                s.className
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {s.label}
        </span>
    );
}

function ProgressRing({ value, total }: { value: number; total: number }) {
    const r = 22;
    const c = 2 * Math.PI * r;
    const pct = total === 0 ? 0 : value / total;
    return (
        <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
                <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
                <circle
                    cx="28"
                    cy="28"
                    r={r}
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    className="stroke-primary transition-all duration-700"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {value}/{total}
            </span>
        </div>
    );
}

function SectionHeading({
    icon: Icon,
    title,
    aside,
}: {
    icon: LucideIcon;
    title: string;
    aside?: string;
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold">{title}</h3>
            {aside ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {aside}
                </span>
            ) : null}
        </div>
    );
}

function DocumentCard({
    doc,
    confirming,
    busy,
    onAskRemove,
    onCancel,
    onConfirm,
}: {
    doc: DocumentDto;
    confirming: boolean;
    busy: boolean;
    onAskRemove: () => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const [imgFailed, setImgFailed] = useState(false);
    const Icon = TYPE_ICONS[doc.type];
    const isImage = doc.mimeType.startsWith("image/") && !imgFailed;
    const isPdf = doc.mimeType === "application/pdf";
    const fileUrl = `${BASE}/${doc.id}/file`;
    const locked = doc.status === "VERIFIED";

    return (
        <li className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/40">
            <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                    {isImage ? (
                        <img
                            src={fileUrl}
                            alt={DOCUMENT_LABELS[doc.type]}
                            loading="lazy"
                            onError={() => setImgFailed(true)}
                            className="h-full w-full object-cover object-top"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Icon className="h-8 w-8" />
                        </div>
                    )}
                    {isPdf ? (
                        <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-foreground">
                            PDF
                        </span>
                    ) : null}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{DOCUMENT_LABELS[doc.type]}</p>
                    {doc.title ? (
                        <p className="truncate text-sm text-muted-foreground">{doc.title}</p>
                    ) : null}
                    <p className="mt-1 truncate text-xs text-muted-foreground" title={doc.fileName}>
                        {doc.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt)}
                    </p>
                    <div className="mt-2.5">
                        <StatusChip status={doc.status} />
                    </div>
                </div>
            </div>

            {doc.status === "REJECTED" && doc.reviewNote ? (
                <div className="flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                        <span className="font-semibold">Note from HR:</span> {doc.reviewNote}
                    </p>
                </div>
            ) : null}

            {confirming ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <p className="text-sm font-medium">Remove this document?</p>
                    <div className="flex gap-2">
                        <button type="button" className={ghostBtn} onClick={onCancel} disabled={busy}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {busy ? "Removing…" : "Yes, remove"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-1 border-t border-border/60 pt-3">
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={ghostBtn}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                    </a>
                    <a href={`${fileUrl}?download=1`} className={ghostBtn}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                    </a>
                    <div className="ml-auto">
                        {locked ? (
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground"
                                title="Verified by HR. Ask HR if it needs to be removed."
                            >
                                <Lock className="h-3.5 w-3.5" />
                                Locked
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={onAskRemove}
                                className={cn(ghostBtn, "hover:bg-red-500/10 hover:text-red-600")}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

export function DocumentsManager({ documents }: { documents: DocumentDto[] }) {
    const router = useRouter();
    const uploadRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const uploadedRequired = REQUIRED_DOCUMENT_TYPES.filter((t) =>
        documents.some((d) => d.type === t)
    ).length;
    const firstMissing = REQUIRED_DOCUMENT_TYPES.find(
        (t) => !documents.some((d) => d.type === t)
    );

    const [type, setType] = useState<DocumentTypeKey>(firstMissing ?? "OTHER");
    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [message, setMessage] = useState<Message | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const imageOnly = IMAGE_ONLY_TYPES.includes(type);

    useEffect(() => {
        if (!file || !file.type.startsWith("image/")) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        if (message?.type !== "success") return;
        const id = setTimeout(() => setMessage(null), 5000);
        return () => clearTimeout(id);
    }, [message]);

    function pickType(next: DocumentTypeKey) {
        setType(next);
        setErrors({});
        setNotice(null);
        if (IMAGE_ONLY_TYPES.includes(next) && file && !isImageFile(file)) {
            setFile(null);
            setNotice(
                "A passport photograph must be an image, so the PDF you chose was removed. Choose a JPG, PNG or WebP photo."
            );
        }
    }

    function startUpload(t: DocumentTypeKey) {
        pickType(t);
        uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleFile(f: File | null | undefined) {
        if (!f) return;
        setMessage(null);
        setNotice(null);

        const pdf = isPdfFile(f);
        if (!pdf && !isImageFile(f)) {
            setErrors({ file: ["Use a JPG, PNG, WebP or PDF file."] });
            return;
        }

        if (pdf && IMAGE_ONLY_TYPES.includes(type)) {
            const next =
                REQUIRED_DOCUMENT_TYPES.find(
                    (t) =>
                        !IMAGE_ONLY_TYPES.includes(t) &&
                        !documents.some((d) => d.type === t)
                ) ?? "OTHER";
            setType(next);
            setNotice(
                `A PDF can't be a passport photograph, so the type was switched to “${DOCUMENT_LABELS[next]}”. Change it above if that's not right.`
            );
        }

        setErrors({});
        setFile(f);
    }

    function onInputChange(e: ChangeEvent<HTMLInputElement>) {
        handleFile(e.target.files?.[0]);
        e.target.value = "";
    }

    function onDrop(e: DragEvent) {
        e.preventDefault();
        setDragging(false);
        if (!uploading) handleFile(e.dataTransfer.files?.[0]);
    }

    function onZoneKey(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
        }
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setMessage(null);
        setErrors({});

        if (type === "OTHER" && !title.trim()) {
            setErrors({ title: ["Enter a title for this document"] });
            return;
        }
        if (!file) {
            setErrors({ file: ["Choose a file to upload"] });
            return;
        }

        if (IMAGE_ONLY_TYPES.includes(type) && !isImageFile(file)) {
            setErrors({
                file: ["A passport photograph must be a JPG, PNG or WebP image."],
            });
            return;
        }

        setUploading(true);
        setProgress(null);
        try {
            const toSend = isImageFile(file)
                ? await downscaleImage(file, type === "PASSPORT_PHOTO" ? 1200 : 2400)
                : file;

            if (toSend.size > MAX_DOCUMENT_BYTES) {
                setErrors({
                    file: [`File is too large (max ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB).`],
                });
                return;
            }

            const form = new FormData();
            form.append("type", type);
            if (title.trim()) form.append("title", title.trim());
            form.append("file", toSend);

            setProgress(0);
            const result = await uploadWithProgress(BASE, form, setProgress);

            if (!result.ok) {
                setErrors(result.data.fieldErrors ?? {});
                setMessage({ type: "error", text: result.data.error ?? "Upload failed." });
                return;
            }

            setMessage({
                type: "success",
                text: `${DOCUMENT_LABELS[type]} uploaded. HR will review it shortly.`,
            });
            setTitle("");
            setFile(null);
            router.refresh();
        } catch {
            setMessage({
                type: "error",
                text: "Could not read this file. Use a JPG, PNG, WebP or PDF.",
            });
        } finally {
            setUploading(false);
            setProgress(null);
        }
    }

    async function confirmRemove(d: DocumentDto) {
        setBusyId(d.id);
        setMessage(null);
        const result = await sendJson(`${BASE}/${d.id}`, "DELETE");
        setBusyId(null);
        setConfirmingId(null);
        if (!result.ok) return setMessage({ type: "error", text: result.error });
        router.refresh();
    }

    return (
        <div className="space-y-10">
            <section aria-labelledby="required-heading" className="space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
                    <ProgressRing value={uploadedRequired} total={REQUIRED_DOCUMENT_TYPES.length} />
                    <div>
                        <h3 id="required-heading" className="text-base font-semibold">
                            Required documents
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {uploadedRequired === REQUIRED_DOCUMENT_TYPES.length
                                ? "All required documents are uploaded. Nice work."
                                : `${uploadedRequired} of ${REQUIRED_DOCUMENT_TYPES.length} uploaded. HR needs the rest to complete your file.`}
                        </p>
                    </div>
                </div>

                <ul className="grid gap-3 sm:grid-cols-2">
                    {REQUIRED_DOCUMENT_TYPES.map((t) => {
                        const doc = documents.find((d) => d.type === t);
                        const Icon = TYPE_ICONS[t];
                        return (
                            <li
                                key={t}
                                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4"
                            >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{DOCUMENT_LABELS[t]}</p>
                                    <div className="mt-1.5">
                                        {doc ? (
                                            <StatusChip status={doc.status} />
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                Not uploaded
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button type="button" className={ghostBtn} onClick={() => startUpload(t)}>
                                    {doc ? "Replace" : "Upload"}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section
                ref={uploadRef}
                aria-labelledby="upload-heading"
                className="scroll-mt-24 space-y-5 rounded-2xl border border-border/60 bg-muted/20 p-5 sm:p-6"
            >
                <div id="upload-heading">
                    <SectionHeading icon={UploadCloud} title="Upload a document" />
                </div>

                <form onSubmit={onSubmit} noValidate className="space-y-5">
                    <div>
                        <p className="mb-2 text-sm font-medium">Document type</p>
                        <div role="radiogroup" aria-label="Document type" className="flex flex-wrap gap-2">
                            {DOCUMENT_TYPES.map((t) => {
                                const Icon = TYPE_ICONS[t];
                                const selected = t === type;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => pickType(t)}
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                                            selected
                                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {DOCUMENT_LABELS[t]}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">{TIPS[type]}</p>
                        {notice ? (
                            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                                {notice}
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <label htmlFor="doc-title" className="mb-2 block text-sm font-medium">
                            Title{" "}
                            <span className="font-normal text-muted-foreground">
                                {type === "OTHER" ? "(required)" : "(optional)"}
                            </span>
                        </label>
                        <input
                            id="doc-title"
                            type="text"
                            value={title}
                            maxLength={100}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setErrors((prev) => ({ ...prev, title: undefined }));
                            }}
                            placeholder={type === "OTHER" ? "e.g. Guarantor form" : "Add a short label"}
                            aria-invalid={Boolean(errors.title?.[0])}
                            className={cn(fieldClass, errors.title?.[0] && "border-red-500/60")}
                        />
                        {errors.title?.[0] ? (
                            <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                                {errors.title[0]}
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <input
                            ref={inputRef}
                            type="file"
                            tabIndex={-1}
                            accept={ACCEPT_ALL}
                            onChange={onInputChange}
                            className="sr-only"
                        />

                        {file ? (
                            <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted text-muted-foreground">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Selected file preview"
                                            className="h-full w-full object-cover object-top"
                                        />
                                    ) : (
                                        <FileText className="h-7 w-7" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(file.size)} ·{" "}
                                        {file.type === "application/pdf" ? "PDF" : "Image"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className={ghostBtn}
                                    disabled={uploading}
                                    onClick={() => inputRef.current?.click()}
                                >
                                    Change
                                </button>
                                <button
                                    type="button"
                                    aria-label="Remove selected file"
                                    disabled={uploading}
                                    onClick={() => setFile(null)}
                                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label="Choose a file to upload"
                                onClick={() => inputRef.current?.click()}
                                onKeyDown={onZoneKey}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                className={cn(
                                    "flex cursor-pointer flex-col items-center bg-muted/40 justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20",
                                    dragging
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/60 hover:bg-muted/50",
                                    errors.file?.[0] && "border-red-500/60"
                                )}
                            >
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <UploadCloud className="h-6 w-6" />
                                </span>
                                <p className="text-sm">
                                    <span className="font-semibold">Drag and drop your file here</span>
                                    <span className="text-muted-foreground">, or </span>
                                    <span className="font-semibold text-primary">browse</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    <p className="text-xs text-muted-foreground">
                                        {imageOnly
                                            ? "Photos only for this type (JPG, PNG or WebP). For a PDF, choose another type above."
                                            : "JPG, PNG, WebP or PDF"}{" "}
                                        · up to {MAX_DOCUMENT_BYTES / 1024 / 1024} MB
                                    </p>
                                    {MAX_DOCUMENT_BYTES / 1024 / 1024} MB
                                </p>
                            </div>
                        )}

                        {errors.file?.[0] ? (
                            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                                {errors.file[0]}
                            </p>
                        ) : null}
                    </div>

                    {type === "PASSPORT_PHOTO" && documents.some((d) => d.type === "PASSPORT_PHOTO") ? (
                        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                            Uploading a new passport photograph replaces your current one.
                        </p>
                    ) : null}

                    {uploading ? (
                        <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${progress ?? 5}%` }}
                            />
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-4">
                        <button type="submit" className={primaryBtn} disabled={uploading || !file}>
                            <UploadCloud className="h-4 w-4" />
                            {uploading
                                ? progress === null
                                    ? "Preparing…"
                                    : `Uploading ${progress}%`
                                : "Upload document"}
                        </button>

                        {message ? (
                            <p
                                role={message.type === "error" ? "alert" : "status"}
                                className={cn(
                                    "inline-flex items-center gap-2 text-sm",
                                    message.type === "error"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                )}
                            >
                                {message.type === "error" ? (
                                    <AlertCircle className="h-4 w-4" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                {message.text}
                            </p>
                        ) : null}
                    </div>
                </form>
            </section>

            {/* Library */}
            <section aria-labelledby="library-heading" className="space-y-4">
                <div id="library-heading">
                    <SectionHeading icon={FolderOpen} title="Your documents" aside={String(documents.length)} />
                </div>

                {documents.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <FolderOpen className="h-6 w-6" />
                        </span>
                        <p className="text-sm font-medium">No documents yet</p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                            Start with your passport photograph and appointment letter. They appear here as soon as they upload.
                        </p>
                    </div>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                        {documents.map((d) => (
                            <DocumentCard
                                key={d.id}
                                doc={d}
                                confirming={confirmingId === d.id}
                                busy={busyId === d.id}
                                onAskRemove={() => setConfirmingId(d.id)}
                                onCancel={() => setConfirmingId(null)}
                                onConfirm={() => confirmRemove(d)}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}