"use client";

import type { PayrollDto } from "@/lib/staff-records/queries";
import {
    ConfirmModal,
    FormMessage,
    ReviewBanner,
    TextField,
    primaryButton,
} from "@/components/records/ui";
import { useRecordForm } from "../useRecordForm";
import { useRef, useState } from "react";

export function PayrollForm({ record }: { record: PayrollDto | null }) {
    const { values, set, fieldError, saving, message, submit } = useRecordForm(
        {
            bankName: record?.bankName ?? "",
            accountName: record?.accountName ?? "",
            accountNumber: "",
            taxId: "",
            pensionNumber: "",
        },
        "/api/me/records/payroll",
        {
            afterSave: (v) => ({ ...v, accountNumber: "", taxId: "", pensionNumber: "" }),
        }
    );

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleConfirm = () => {
        setIsConfirmed(true)
        setShowConfirmModal(false);
        formRef.current?.requestSubmit();
    };

    const handleCancel = () => {
        setShowConfirmModal(false);
        setIsConfirmed(false);
    };

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-5">
            <ReviewBanner status={record?.status} note={record?.reviewNote} />

            <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Bank name" name="bankName" required value={values.bankName} onChange={(v) => set("bankName", v)} error={fieldError("bankName")} />
                <TextField label="Account name" name="accountName" required value={values.accountName} onChange={(v) => set("accountName", v)} error={fieldError("accountName")} />
                <TextField
                    label="Account number"
                    name="accountNumber"
                    inputMode="numeric"
                    required={!record}
                    value={values.accountNumber}
                    onChange={(v) => set("accountNumber", v)}
                    error={fieldError("accountNumber")}
                    hint={
                        record
                            ? `Saved: ${record.accountNumberMasked}. Leave blank to keep it.`
                            : undefined
                    }
                />
                <div />
            </div>

            <div className="flex items-center w-full justify-end gap-4">
                <button type="button" onClick={() => setShowConfirmModal(true)} className={primaryButton} disabled={saving}>
                    {saving && isConfirmed ? "Saving…" : "Save payroll details"}
                </button>
            </div>

            {showConfirmModal && (
                <ConfirmModal
                    title="Confirm Details"
                    description="Please ensure that the payroll details you entered are correct."
                    confirmText="Proceed"
                    onCancel={handleCancel}
                    onConfirm={handleConfirm}
                />
            )}
        </form>
    );
}