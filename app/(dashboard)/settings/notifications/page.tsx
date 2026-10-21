"use client";

import React, { useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  CalendarDays,
  ShieldCheck,
  FileText,
  Users,
  Save,
  RotateCcw,
  Check,
} from "lucide-react";

type NotificationSetting = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  email: boolean;
  push: boolean;
};

const initialSettings: NotificationSetting[] = [
  {
    id: "attendance",
    title: "Attendance updates",
    description: "Get notified about clock-ins, clock-outs, and attendance exceptions.",
    icon: Clock,
    email: true,
    push: true,
  },
  {
    id: "leave",
    title: "Leave requests",
    description: "Receive updates when leave requests are submitted, approved, or rejected.",
    icon: CalendarDays,
    email: true,
    push: true,
  },
  {
    id: "team",
    title: "Team updates",
    description: "Stay informed about important changes involving your team.",
    icon: Users,
    email: false,
    push: true,
  },
  {
    id: "security",
    title: "Security alerts",
    description: "Get alerts about new sign-ins and important account security events.",
    icon: ShieldCheck,
    email: true,
    push: true,
  },
  {
    id: "reports",
    title: "Workforce reports",
    description: "Receive workforce summaries, analytics, and scheduled reports.",
    icon: FileText,
    email: true,
    push: false,
  },
];

const NotificationsSettingPage = () => {
  const [settings, setSettings] =
    useState<NotificationSetting[]>(initialSettings);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = (
    id: string,
    channel: "email" | "push",
    checked: boolean,
  ) => {
    setSettings((current) =>
      current.map((setting) =>
        setting.id === id
          ? { ...setting, [channel]: checked }
          : setting,
      ),
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Connect this handler to your notification settings API.
      // Example: await fetch("/api/settings/notifications", { ... })

      await new Promise((resolve) => setTimeout(resolve, 400));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setWeeklyDigest(true);
    setProductUpdates(false);
    setSaved(false);
  };

  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fca311] focus-visible:ring-offset-2 ${
        checked ? "bg-[#fca311]" : "bg-gray-300 dark:bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="w-full max-w-5xl space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fca311]/10 text-[#fca311]">
              <Bell size={22} />
            </div>

            <h1 className="font-triakis text-3xl tracking-tight md:text-4xl">
              Notifications
            </h1>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Manage how and when Nexentrix keeps you informed about workforce
            activity, account security, and important updates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          <RotateCcw size={15} />
          Reset defaults
        </button>
      </div>

      {/* Notification channels */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-100 p-5 dark:border-gray-800 md:p-6">
          <h2 className="text-base font-semibold">Notification channels</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose where you want to receive notifications.
          </p>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_90px_90px]">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Notification type
            </span>
            <span className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500">
              <Mail size={17} />
              Email
            </span>
            <span className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500">
              <Smartphone size={17} />
              Push
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {settings.map((setting) => {
            const Icon = setting.icon;

            return (
              <div
                key={setting.id}
                className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-3 p-5 transition hover:bg-gray-50/70 dark:hover:bg-gray-900/50 sm:grid-cols-[minmax(0,1fr)_90px_90px] md:p-6"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{setting.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400 sm:text-sm">
                      {setting.description}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Toggle
                    checked={setting.email}
                    onChange={(checked) =>
                      updateSetting(setting.id, "email", checked)
                    }
                    label={`${setting.title} email notifications`}
                  />
                </div>

                <div className="flex justify-center">
                  <Toggle
                    checked={setting.push}
                    onChange={(checked) =>
                      updateSetting(setting.id, "push", checked)
                    }
                    label={`${setting.title} push notifications`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional preferences */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-100 p-5 dark:border-gray-800 md:p-6">
          <h2 className="text-base font-semibold">Additional preferences</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Fine-tune the updates you receive from Nexentrix.
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center justify-between gap-5 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <CalendarDays size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Weekly digest</h3>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400 sm:text-sm">
                  Receive a weekly summary of workforce activity and key metrics.
                </p>
              </div>
            </div>

            <Toggle
              checked={weeklyDigest}
              onChange={(checked) => {
                setWeeklyDigest(checked);
                setSaved(false);
              }}
              label="Weekly digest"
            />
          </div>

          <div className="flex items-center justify-between gap-5 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Product announcements</h3>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400 sm:text-sm">
                  Hear about new features, improvements, and platform updates.
                </p>
              </div>
            </div>

            <Toggle
              checked={productUpdates}
              onChange={(checked) => {
                setProductUpdates(checked);
                setSaved(false);
              }}
              label="Product announcements"
            />
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-[#fca311]/25 bg-[#fca311]/5 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#fca311]" size={20} />
        <div>
          <h3 className="text-sm font-semibold">Important security alerts</h3>
          <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400 sm:text-sm">
            Critical security notifications may still be delivered when
            other notification preferences are disabled to help protect your account.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-sm">
          {saved && (
            <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Check size={16} />
              Preferences saved successfully.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14213d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1c3055] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#fca311] dark:text-[#14213d] dark:hover:bg-[#ffb52e]"
        >
          <Save size={16} />
          {saving ? "Saving preferences..." : "Save preferences"}
        </button>
      </div>
    </div>
  );
};

export default NotificationsSettingPage;