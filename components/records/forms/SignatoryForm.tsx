"use client";

import type { SignatoryDto } from "@/lib/staff-records/queries";
import {
    FormMessage,
    ReviewBanner,
    TextField,
    primaryButton,
} from "@/components/records/ui";
import { useRecordForm } from "../useRecordForm";
import { ImageUpload } from "../ImageUpload";

export function SignatoryForm({ record }: { record: SignatoryDto | null }) {
    const { values, set, fieldError, saving, message, submit } = useRecordForm(
        {
            signatoryName: record?.signatoryName ?? "",
            title: record?.title ?? "",
            signatureKey: "",
        },
        "/api/me/records/signatory",
        { afterSave: (v) => ({ ...v, signatureKey: "" }) }
    );

    return (
        <form onSubmit={submit} className="space-y-5">
            <ReviewBanner status={record?.status} note={record?.reviewNote} />

            <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Name as used on documents" name="signatoryName" required value={values.signatoryName} onChange={(v) => set("signatoryName", v)} error={fieldError("signatoryName")} />
                <TextField label="Title or position" name="title" value={values.title} onChange={(v) => set("title", v)} error={fieldError("title")} />
            </div>

            <ImageUpload
                kind="signature"
                label="Signature image"
                required={!record?.hasSignature}
                hasExisting={Boolean(record?.hasSignature)}
                maxDim={1000}
                outputType="image/png"
                error={fieldError("signatureKey")}
                hint="Sign on plain white paper, photograph it in good light, and crop close to the signature."
                onUploaded={(key) => set("signatureKey", key)}
            />

            <div className="flex items-center gap-4">
                <button type="submit" className={primaryButton} disabled={saving}>
                    {saving ? "Saving…" : "Save signatory details"}
                </button>
                <FormMessage message={message} />
            </div>
        </form>
    );
}