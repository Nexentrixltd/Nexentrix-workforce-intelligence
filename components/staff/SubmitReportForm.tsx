"use client";

import React, { useState, useCallback } from "react";
import {
  Send,
  Clock,
  AlertCircle,
  BarChart3,
  Calendar,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { departments } from "@/lib/utils";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

const SubmitReportForm = () => {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    timeSpentHours: "",
    tomorrowPriority: "",
    moodLevel: "3",
    projectId: "",
    milestoneId: "",
    departmentId: "",
    status: "submitted",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > MAX_IMAGES) {
      alert(`Max ${MAX_IMAGES} images allowed.`);
      return;
    }

    const validFiles = files.filter((file) => {
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        alert(`${file.name} is not a supported format.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large (Max 10MB).`);
        return false;
      }
      return true;
    });

    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImgs = [...prev];
      URL.revokeObjectURL(newImgs[index].preview);
      newImgs.splice(index, 1);
      return newImgs;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to build FormData and send to API
    console.log(
      "Submitting:",
      form,
      "with images:",
      images.map((i) => i.file.name),
    );
  };

  const inputClass =
    "w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-on-surface-variant/50";
  const labelClass =
    "text-sm font-medium text-on-surface-variant mb-1.5 flex items-center gap-2";
  const sectionClass =
    "bg-surface-container/40 p-6 rounded-3xl border border-outline-variant/5 space-y-4 shadow-sm";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-full mx-auto space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className={sectionClass}>
            <h2 className={labelClass}>
              <Calendar size={18} className="text-primary" /> Project Context
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">
                  Reporting Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">
                  Department
                </label>
                <select
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="projectId"
                placeholder="Project ID / Name"
                value={form.projectId}
                onChange={handleChange}
                className={inputClass}
                required
              />
              <input
                type="text"
                name="milestoneId"
                placeholder="Milestone ID"
                value={form.milestoneId}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={labelClass}>
              <BarChart3 size={18} className="text-primary" /> Progress Updates
            </h2>
            <textarea
              name="tasksCompleted"
              rows={3}
              placeholder="Tasks completed today..."
              value={form.tasksCompleted}
              onChange={handleChange}
              className={inputClass}
              required
            />
            <textarea
              name="tasksInProgress"
              rows={3}
              placeholder="Tasks currently in progress..."
              value={form.tasksInProgress}
              onChange={handleChange}
              className={inputClass}
            />
            <div className="relative">
              <textarea
                name="blockers"
                rows={2}
                placeholder="Any blockers or hurdles?"
                value={form.blockers}
                onChange={handleChange}
                className={`${inputClass} border-error/20 focus:ring-error/30`}
              />
              <AlertCircle
                size={16}
                className="absolute right-3 top-3 text-error/50"
              />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className={sectionClass}>
            <h2 className={labelClass}>
              <ImageIcon size={18} className="text-primary" /> Evidence
              (Screenshots)
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg overflow-hidden border border-outline-variant/20 bg-surface"
                >
                  <img
                    src={img.preview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-error text-white rounded-full p-0.5 shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all">
                  <Upload size={20} className="text-muted-foreground" />
                  <span className="text-[10px] mt-1 text-muted-foreground">
                    Upload
                  </span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_FORMATS.join(",")}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Up to 5 images. PNG, JPG, WebP (Max 10MB each)
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={labelClass}>
              <Clock size={18} className="text-primary" /> Planning & Mood
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                name="timeSpentHours"
                placeholder="Hours spent (e.g. 8)"
                value={form.timeSpentHours}
                onChange={handleChange}
                className={inputClass}
                required
              />
              <select
                name="moodLevel"
                value={form.moodLevel}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="1">😞 Low Energy</option>
                <option value="2">😐 Neutral</option>
                <option value="3">🙂 Focused</option>
                <option value="4">😊 High Energy</option>
                <option value="5">🔥 Unstoppable</option>
              </select>
            </div>
            <textarea
              name="tomorrowPriority"
              rows={3}
              placeholder="Priorities for tomorrow..."
              value={form.tomorrowPriority}
              onChange={handleChange}
              className={inputClass}
            />
          </section>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-outline-variant/10">
        <button
          type="button"
          className="px-8 py-3 rounded-xl border border-outline-variant/30 text-on-surface font-medium hover:bg-surface-container transition-all"
        >
          Discard Draft
        </button>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-10 py-3 rounded-md bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer active:scale-95 transition-all"
        >
          <CheckCircle2 size={18} />
          Submit Today's Report
        </button>
      </div>
    </form>
  );
};

export default SubmitReportForm;
