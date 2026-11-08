
"use client";

import type { ProfileDto } from "@/lib/staff-records/queries";
import {
    ConfirmModal,
    FormMessage,
    ReviewBanner,
    SelectField,
    TextField,
    primaryButton,
} from "@/components/records/ui";
import { useRecordForm } from "../useRecordForm";
import { useRef, useState } from "react";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const MARITAL = ["Single", "Married", "Divorced", "Widowed", "Prefer not to say"];

export function PersonalForm({ record }: { record: ProfileDto | null }) {
    const { values, set, fieldError, saving, message, submit } = useRecordForm(
        {
            preferredName: record?.preferredName ?? "",
            phone: record?.phone ?? "",
            altPhone: record?.altPhone ?? "",
            personalEmail: record?.personalEmail ?? "",
            addressLine: record?.addressLine ?? "",
            city: record?.city ?? "",
            state: record?.state ?? "",
            country: record?.country ?? "",
            dateOfBirth: record?.dateOfBirth ?? "",
            gender: record?.gender ?? "",
            maritalStatus: record?.maritalStatus ?? "",
            nationality: record?.nationality ?? "",
            stateOfOrigin: record?.stateOfOrigin ?? "",
        },
        "/api/me/records/profile"
    );

    const [isConfirmed, setIsConfirmed] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleConfirm = () => {
        setIsConfirmed(true);
        setShowConfirmModal(false);
        formRef.current?.requestSubmit();
    }

    const handleCancel = () => {
        setShowConfirmModal(false);
        setIsConfirmed(false);
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-7">
            <ReviewBanner status={record?.status} note={record?.reviewNote} />

            <section className="space-y-5">
                <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="size-5"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="8" r="3.5" />
                            <path d="M5 20c.5-3.5 3-5.5 7-5.5s6.5 2 7 5.5" />
                        </svg>
                    </div>

                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                            Personal information
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Basic details used to identify and maintain your employee profile.
                        </p>
                    </div>
                </div>

                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <TextField
                        label="Full Legal name"
                        name="preferredName"
                        value={values.preferredName}
                        onChange={(v) => set("preferredName", v)}
                        error={fieldError("preferredName")}
                    />

                    <TextField
                        label="Date of birth"
                        name="dateOfBirth"
                        type="date"
                        required
                        value={values.dateOfBirth}
                        onChange={(v) => set("dateOfBirth", v)}
                        error={fieldError("dateOfBirth")}
                    />

                    <TextField
                        label="Nationality"
                        name="nationality"
                        required
                        value={values.nationality}
                        onChange={(v) => set("nationality", v)}
                        error={fieldError("nationality")}
                    />

                    <TextField
                        label="State or region of origin"
                        name="stateOfOrigin"
                        value={values.stateOfOrigin}
                        onChange={(v) => set("stateOfOrigin", v)}
                        error={fieldError("stateOfOrigin")}
                    />

                    <SelectField
                        label="Gender"
                        name="gender"
                        options={GENDERS}
                        value={values.gender}
                        onChange={(v) => set("gender", v)}
                        error={fieldError("gender")}
                    />

                    <SelectField
                        label="Marital status"
                        name="maritalStatus"
                        options={MARITAL}
                        value={values.maritalStatus}
                        onChange={(v) => set("maritalStatus", v)}
                        error={fieldError("maritalStatus")}
                    />
                </div>
            </section>

            <div className="border-t border-border" />

            <section className="space-y-5">
                <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="size-5"
                            aria-hidden="true"
                        >
                            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
                            <path d="m5 6 7 6 7-6" />
                        </svg>
                    </div>

                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                            Contact information
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Provide your active contact details so HR can reach you when necessary.
                        </p>
                    </div>
                </div>

                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <TextField
                        label="Phone number"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={values.phone}
                        onChange={(v) => set("phone", v)}
                        error={fieldError("phone")}
                    />

                    <TextField
                        label="Alternate phone"
                        name="altPhone"
                        type="tel"
                        inputMode="tel"
                        value={values.altPhone}
                        onChange={(v) => set("altPhone", v)}
                        error={fieldError("altPhone")}
                    />

                    <div className="sm:col-span-2">
                        <TextField
                            label="Personal email"
                            name="personalEmail"
                            type="email"
                            inputMode="email"
                            value={values.personalEmail}
                            onChange={(v) => set("personalEmail", v)}
                            error={fieldError("personalEmail")}
                        />
                    </div>
                </div>
            </section>

            <div className="border-t border-border" />

            <section className="space-y-5">
                <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="size-5"
                            aria-hidden="true"
                        >
                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                        </svg>
                    </div>

                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                            Residential address
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Your current residential location and address.
                        </p>
                    </div>
                </div>

                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <TextField
                            label="Residential address"
                            name="addressLine"
                            autoComplete="street-address"
                            required
                            value={values.addressLine}
                            onChange={(v) => set("addressLine", v)}
                            error={fieldError("addressLine")}
                        />
                    </div>

                    <TextField
                        label="City"
                        name="city"
                        required
                        value={values.city}
                        onChange={(v) => set("city", v)}
                        error={fieldError("city")}
                    />

                    <TextField
                        label="State"
                        name="state"
                        required
                        value={values.state}
                        onChange={(v) => set("state", v)}
                        error={fieldError("state")}
                    />

                    <TextField
                        label="Country"
                        name="country"
                        required
                        value={values.country}
                        onChange={(v) => set("country", v)}
                        error={fieldError("country")}
                    />
                </div>
            </section>

            <div className="flex w-full gap-3 border-t border-border flex-row items-center  justify-end">
                <div className="flex flex-wrap items-center gap-4 pt-4">
                    <FormMessage message={message} />

                    <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className={primaryButton}
                        disabled={saving || isConfirmed}
                    >
                        {saving && isConfirmed ? (
                            <>

                                Saving…
                            </>
                        ) : (
                            "Save details"
                        )}
                    </button>
                </div>
            </div>

            {
                showConfirmModal && (
                    <ConfirmModal
                        title="Confirm Details"
                        description="Please ensure that the personal details you entered are correct."
                        confirmText="Proceed"
                        onCancel={handleCancel}
                        onConfirm={handleConfirm}
                    />
                )
            }
        </form>
    );
}
