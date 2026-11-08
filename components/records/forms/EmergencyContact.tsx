"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContactDto } from "@/lib/staff-records/queries";
import { sendJson } from "@/lib/records-client";
import {
    FormMessage,
    TextField,
    primaryButton,
    secondaryButton,
} from "@/components/records/ui";
import { useRecordForm } from "../useRecordForm";

const MAX_CONTACTS = 5;
const BASE = "/api/me/records/emergency-contacts";

function ContactForm({
    contact,
    onDone,
}: {
    contact?: ContactDto;
    onDone: () => void;
}) {
    const { values, set, fieldError, saving, message, submit } = useRecordForm(
        {
            name: contact?.name ?? "",
            relationship: contact?.relationship ?? "",
            phone: contact?.phone ?? "",
            altPhone: contact?.altPhone ?? "",
            address: contact?.address ?? "",
            isPrimary: contact?.isPrimary ?? false,
        },
        contact ? `${BASE}/${contact.id}` : BASE,
        {
            method: contact ? "PATCH" : "POST",
            successText: "Contact saved.",
            onSuccess: onDone,
        }
    );

    return (
        <form
            onSubmit={submit}
            className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-800"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Full name" name="ec-name" required value={values.name} onChange={(v) => set("name", v)} error={fieldError("name")} />
                <TextField label="Relationship" name="ec-relationship" required value={values.relationship} onChange={(v) => set("relationship", v)} error={fieldError("relationship")} />
                <TextField label="Phone number" name="ec-phone" type="tel" inputMode="tel" required value={values.phone} onChange={(v) => set("phone", v)} error={fieldError("phone")} />
                <TextField label="Alternate phone" name="ec-altPhone" type="tel" inputMode="tel" value={values.altPhone} onChange={(v) => set("altPhone", v)} error={fieldError("altPhone")} />
                <div className="sm:col-span-2">
                    <TextField label="Address" name="ec-address" value={values.address} onChange={(v) => set("address", v)} error={fieldError("address")} />
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={values.isPrimary}
                    disabled={contact?.isPrimary}
                    onChange={(e) => set("isPrimary", e.target.checked)}
                />
                Primary contact
                {contact?.isPrimary ? (
                    <span className="text-xs text-gray-500">
                        (to change it, mark another contact as primary)
                    </span>
                ) : null}
            </label>

            <div className="flex items-center gap-3">
                <button type="submit" className={primaryButton} disabled={saving}>
                    {saving ? "Saving…" : "Save contact"}
                </button>
                <button type="button" className={secondaryButton} onClick={onDone}>
                    Cancel
                </button>
                <FormMessage message={message?.type === "error" ? message : null} />
            </div>
        </form>
    );
}

export function EmergencyContacts({ contacts }: { contacts: ContactDto[] }) {
    const router = useRouter();
    const [editing, setEditing] = useState<string | "new" | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function remove(c: ContactDto) {
        if (!window.confirm(`Remove ${c.name} from your emergency contacts?`)) return;
        setBusyId(c.id);
        setError(null);
        const result = await sendJson(`${BASE}/${c.id}`, "DELETE");
        setBusyId(null);
        if (!result.ok) return setError(result.error);
        router.refresh();
    }

    async function makePrimary(c: ContactDto) {
        setBusyId(c.id);
        setError(null);
        const result = await sendJson(`${BASE}/${c.id}`, "PATCH", {
            name: c.name,
            relationship: c.relationship,
            phone: c.phone,
            altPhone: c.altPhone ?? "",
            address: c.address ?? "",
            isPrimary: true,
        });
        setBusyId(null);
        if (!result.ok) return setError(result.error);
        router.refresh();
    }

    return (
        <div className="space-y-4">
            {contacts.length === 0 && editing !== "new" ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You haven’t added an emergency contact yet.
                </p>
            ) : null}

            <ul className="space-y-3">
                {contacts.map((c) =>
                    editing === c.id ? (
                        <li key={c.id}>
                            <ContactForm contact={c} onDone={() => setEditing(null)} />
                        </li>
                    ) : (
                        <li
                            key={c.id}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-gray-200 p-4 dark:border-gray-800"
                        >
                            <div className="text-sm">
                                <p className="font-medium">
                                    {c.name}{" "}
                                    {c.isPrimary ? (
                                        <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                            Primary
                                        </span>
                                    ) : null}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {c.relationship} · {c.phone}
                                    {c.altPhone ? ` · ${c.altPhone}` : ""}
                                </p>
                                {c.address ? (
                                    <p className="text-gray-500 dark:text-gray-400">{c.address}</p>
                                ) : null}
                            </div>
                            <div className="flex gap-2">
                                {!c.isPrimary ? (
                                    <button type="button" className={secondaryButton} disabled={busyId === c.id} onClick={() => makePrimary(c)}>
                                        Make primary
                                    </button>
                                ) : null}
                                <button type="button" className={secondaryButton} disabled={busyId === c.id} onClick={() => setEditing(c.id)}>
                                    Edit
                                </button>
                                <button type="button" className={secondaryButton} disabled={busyId === c.id} onClick={() => remove(c)}>
                                    Remove
                                </button>
                            </div>
                        </li>
                    )
                )}
            </ul>

            {editing === "new" ? (
                <ContactForm onDone={() => setEditing(null)} />
            ) : contacts.length < MAX_CONTACTS ? (
                <button type="button" className={primaryButton} onClick={() => setEditing("new")}>
                    Add contact
                </button>
            ) : (
                <p className="text-xs text-gray-500">You can add up to {MAX_CONTACTS} contacts.</p>
            )}

            {error ? (
                <p className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}