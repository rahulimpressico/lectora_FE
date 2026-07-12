import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useCourseStore } from "../../store";
import { useAuth } from "@/auth/AuthContext";
import { useWizardNav } from "../../components/WizardNavContext";
import { cn } from "@/lib/cn";
import { fadeUp, staggerContainer } from "../../constants/animations";
import {
  COURSE_TYPE_OPTIONS,
  DURATION_OPTIONS,
  DIFFICULTY_OPTIONS,
} from "../constants";
import { saveCourseBasic, updateCourseBasic } from "../api";
import {
  courseBasicQueryKey,
  useCourseBasic,
} from "../hooks/useCourseBasic";
import type { CourseStatus } from "../types";

// ── Component ─────────────────────────────────────────────────────────────────
export const CourseBasicsStep = () => {
  // `courseId` + `courseTitle` are backend-owned (persisted via the Course
  // Basic API). `courseTypeHint`/`durationHours`/`difficultyLevel`/
  // `wizardData.description` (course_scope) are frontend wizard state — course
  // type is synced to the backend on save and reloaded from the API on return.
  const courseId = useCourseStore((s) => s.courseId);
  const setCourseId = useCourseStore((s) => s.setCourseId);
  const courseCode = useCourseStore((s) => s.courseCode);
  const setCourseCode = useCourseStore((s) => s.setCourseCode);
  const courseTitle = useCourseStore((s) => s.courseTitle);
  const setCourseTitle = useCourseStore((s) => s.setCourseTitle);
  const courseTypeHint = useCourseStore((s) => s.courseTypeHint);
  const setCourseTypeHint = useCourseStore((s) => s.setCourseTypeHint);
  const durationHours = useCourseStore((s) => s.durationHours);
  const setDurationHours = useCourseStore((s) => s.setDurationHours);
  const difficultyLevel = useCourseStore((s) => s.difficultyLevel);
  const setDifficultyLevel = useCourseStore((s) => s.setDifficultyLevel);
  const setCourseTopic = useCourseStore((s) => s.setCourseTopic);
  const setPhase = useCourseStore((s) => s.setPhase);
  const wizardData = useCourseStore((s) => s.wizardData);
  const setWizardData = useCourseStore((s) => s.setWizardData);

  const description = wizardData.description ?? "";

  const { user } = useAuth();
  const currentUserName = user?.displayName ?? user?.username ?? "";

  const queryClient = useQueryClient();
  const {
    data: record,
    isLoading,
    error: loadQueryError,
  } = useCourseBasic(courseId);
  const loadError = loadQueryError
    ? loadQueryError instanceof Error
      ? loadQueryError.message
      : "Failed to load saved course details."
    : null;

  // Custom duration text — separate from pill selection so they don't fight
  // each other. Lazily seeded from the store's (FE-only, persisted)
  // `durationHours` in case it's a custom value from a previous visit.
  const [customHours, setCustomHours] = useState(() =>
    durationHours && !DURATION_OPTIONS.includes(durationHours)
      ? String(durationHours)
      : "",
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSavingRef = useRef(false);

  const handlePillDuration = (hrs: number) => {
    setDurationHours(durationHours === hrs ? null : hrs);
    setCustomHours("");
  };

  const handleCustomDuration = (val: string) => {
    if (val === "") {
      setCustomHours("");
      setDurationHours(null);
      return;
    }
    const intPart = val.match(/^\d+/)?.[0];
    if (!intPart) return;
    setCustomHours(intPart);
    const n = parseInt(intPart, 10);
    if (n > 0) setDurationHours(n);
  };

  const handleChipClick = (label: string) => {
    setCourseTypeHint(courseTypeHint === label ? "" : label);
  };

  // Seed the store from the backend record when it loads.
  useEffect(() => {
    if (record?.id != null) {
      setCourseId(String(record.id));
    }
    if (record?.course_code) {
      setCourseCode(record.course_code);
    }
    if (record?.course_title) {
      setCourseTitle(record.course_title);
    }
    if (record?.course_type) {
      setCourseTypeHint(record.course_type);
    }
  }, [
    record?.id,
    record?.course_code,
    record?.course_title,
    record?.course_type,
    setCourseId,
    setCourseCode,
    setCourseTitle,
    setCourseTypeHint,
  ]);

  const { setConfig } = useWizardNav();

  useEffect(() => {
    const handleNext = () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveError(null);
      setIsSaving(true);

      // course_scope/course_duration/difficulty_level stay on the frontend;
      // course_title and course_type are persisted via the Course Basic API.
      const payload = {
        course_title: courseTitle.trim(),
        course_type: courseTypeHint.trim(),
      };

      // `courseId` is the single source of truth for create-vs-update: once the
      // backend has assigned one, every subsequent save is a PUT (updates
      // `updated_at` only — the id is immutable); its absence is always a POST
      // that mints the one persistent `course_id` for this course.
      const request = courseId
        ? updateCourseBasic(courseId, {
            ...payload,
            status_code: (record?.status_code as CourseStatus) ?? "DRAFT",
            created_by: record?.created_by ?? currentUserName,
          })
        : saveCourseBasic(payload);

      request
        .then((data) => {
          queryClient.setQueryData(courseBasicQueryKey(String(data.id)), data);
          setCourseId(String(data.id));
          setCourseCode(data.course_code);
          setCourseTopic(courseTitle.trim() || "course");
          setPhase("wizard-audience");
        })
        .catch((err: unknown) => {
          setSaveError(
            err instanceof Error
              ? err.message
              : "Failed to save course details. Please try again.",
          );
        })
        .finally(() => {
          isSavingRef.current = false;
          setIsSaving(false);
        });
    };

    setConfig({
      backPhase: "welcome",
      backLabel: "Welcome",
      nextLabel: "Next: Audience",
      isNextDisabled:
        !description.trim() ||
        !courseTitle.trim() ||
        !durationHours ||
        !difficultyLevel ||
        !courseTypeHint ||
        isLoading,
      isNextLoading: isSaving,
      loadingLabel: "Saving…",
      onNext: handleNext,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    description,
    courseTitle,
    durationHours,
    difficultyLevel,
    courseTypeHint,
    isLoading,
    isSaving,
    courseId,
    record,
    currentUserName,
  ]);

  return (
    <motion.div
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      style={{ willChange: "transform" }}
    >
      {/* Header */}
      <motion.div
        className="mb-8 sm:mb-10"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">
          Course Foundation
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">
          Let's build the foundation
        </h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">
          Define the essentials. The assistant uses this information to
          understand the course structure, tone, and scope.
        </p>
      </motion.div>

      {/* Loading existing course details */}
      {isLoading && (
        <motion.div
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
          variants={fadeUp}
          style={{ willChange: "transform" }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your saved course details…
        </motion.div>
      )}

      {/* Load / save errors */}
      {(loadError || saveError) && (
        <motion.div
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700"
          variants={fadeUp}
          style={{ willChange: "transform" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{saveError ?? loadError}</span>
        </motion.div>
      )}

      {/* Course Title */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
          placeholder="e.g. Washington LTC Compliance"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
        />
      </motion.div>

      {/* Course ID — backend-assigned `course_code` on first save; read-only */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course ID
        </label>
        <input
          type="text"
          value={courseCode ?? record?.course_code ?? ""}
          readOnly
          disabled
          placeholder="Assigned automatically after your first save"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-slate-50 text-slate-500 placeholder:text-slate-400 cursor-not-allowed"
        />
      </motion.div>

      {/* Description */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Scope <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={8}
          value={description}
          onChange={(e) => setWizardData({ description: e.target.value })}
          placeholder="What should this course cover?"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </motion.div>

      {/* Course Type */}
      <motion.div
        className="space-y-2"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Type <span className="text-red-500">*</span>
        </label>

        {/* Chips — one per rule pack */}
        <div className="flex flex-wrap gap-2">
          {COURSE_TYPE_OPTIONS.map((opt) => {
            const isSelected = courseTypeHint === opt.label;
            return (
              <motion.button
                key={opt.key}
                type="button"
                onClick={() => handleChipClick(opt.label)}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ willChange: "transform" }}
                className={cn(
                  "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                  isSelected
                    ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
                )}
              >
                {opt.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Duration */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Course Duration <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((hrs) => (
            <motion.button
              key={hrs}
              type="button"
              onClick={() => handlePillDuration(hrs)}
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                durationHours === hrs && customHours === ""
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
              )}
            >
              {hrs} {hrs === 1 ? "Hour" : "Hours"}
            </motion.button>
          ))}
        </div>
        {/* Custom duration text input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={customHours}
            onChange={(e) => handleCustomDuration(e.target.value)}
            placeholder="Custom (e.g. 6)"
            className="w-36 px-3.5 py-2 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
          />
          <span className="text-sm text-slate-400">hours</span>
        </div>
      </motion.div>

      {/* Difficulty */}
      <motion.div
        className="space-y-1.5"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Difficulty Level <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() =>
                setDifficultyLevel(
                  difficultyLevel === opt.value ? null : opt.value,
                )
              }
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ willChange: "transform" }}
              className={cn(
                "px-4 py-2 text-sm rounded-full border transition-colors font-medium",
                difficultyLevel === opt.value
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-brand-300 shadow-xs",
              )}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Helper card */}
      <motion.div
        className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/50 border border-brand-100 px-5 py-4 text-sm text-brand-700 flex items-start gap-3"
        variants={fadeUp}
        style={{ willChange: "transform" }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
        <span>
          Don't worry about perfection — everything can be edited later.
        </span>
      </motion.div>
    </motion.div>
  );
};
