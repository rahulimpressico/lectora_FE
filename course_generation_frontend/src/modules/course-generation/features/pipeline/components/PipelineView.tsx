import { useRef, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "../../../store/pipelineStore";
import { useCourseStore, clearCourseStorage } from "../../onboarding-flow/store";
import { retryJob, cancelJob } from "@/api/jobs/api";
import { useJobPipeline } from "../hooks/useJobPipeline";
import { CourseGifLoader } from "./CourseGifLoader";
import { PipelinePageBackground } from "./PipelinePageBackground";
import { ConfirmLeaveModal } from "@/shared/components/ConfirmLeaveModal";
import { toUserFacingPipelineLogMessage } from "@/modules/course-generation/utils/userFacingGenerationText";
import type { PipelineStageState } from "../../../types/pipeline";
import type { LogEntry } from "../../../store/pipelineStore";

interface PipelineViewProps {
  jobId: string;
}

// ── Log level config ────────────────────────────────────────────────
const LEVEL_CONFIG = {
  info: {
    dot: "bg-indigo-400",
    pingHex: "rgba(99,102,241,0.35)",
    border: "border-l-indigo-300",
    badge: "bg-indigo-50 text-indigo-600 border-indigo-100",
    text: "text-slate-600",
    label: "Info",
  },
  warn: {
    dot: "bg-amber-400",
    pingHex: "rgba(245,158,11,0.35)",
    border: "border-l-amber-300",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    text: "text-amber-800",
    label: "Warn",
  },
  error: {
    dot: "bg-red-400",
    pingHex: "rgba(239,68,68,0.35)",
    border: "border-l-red-300",
    badge: "bg-red-50 text-red-600 border-red-100",
    text: "text-red-700",
    label: "Error",
  },
  success: {
    dot: "bg-emerald-400",
    pingHex: "rgba(16,185,129,0.35)",
    border: "border-l-emerald-300",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    text: "text-emerald-700",
    label: "Done",
  },
} as const;

// ── Left panel: Activity Timeline ───────────────────────────────────
function ActivityLogPanel({
  logs,
  isLive,
  collapsed,
  onToggle,
}: {
  logs: LogEntry[];
  isLive: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collapsed) return;
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [logs.length, collapsed]);

  return (
    <div
      className={cn(
        "relative z-10 flex flex-col overflow-hidden border-white/40 bg-white/10 backdrop-blur-[12px]",
        "lg:h-full lg:w-[300px] lg:min-w-[220px] lg:shrink-0 lg:border-r lg:border-b-0",
        "max-lg:w-full max-lg:border-b max-lg:transition-[max-height] max-lg:duration-300 max-lg:ease-out",
        collapsed ? "max-lg:max-h-11" : "max-lg:max-h-[min(34vh,260px)]",
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/35 bg-white/20 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex h-2 w-2 shrink-0">
            {isLive && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                isLive ? "bg-indigo-500" : "bg-slate-300",
              )}
            />
          </div>
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Activity Feed
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-slate-200/70 bg-white/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
            {logs.length}
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "Expand activity feed" : "Collapse activity feed"
            }
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/50 bg-white/40 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-600 lg:hidden"
          >
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>

      {/* Timeline entries */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto space-y-1 px-2.5 py-2.5",
          collapsed && "hidden lg:block",
        )}
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 h-28">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200 animate-pulse" />
            <p className="text-[11px] text-slate-300 font-medium">
              Waiting for events…
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, idx) => {
              const cfg = LEVEL_CONFIG[log.level];
              const isLatest = idx === logs.length - 1;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    duration: 0.22,
                    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                  }}
                  className={cn(
                    "relative flex items-start gap-2 rounded-lg border-l-2 px-2.5 py-2 transition-all duration-200",
                    cfg.border,
                    isLatest
                      ? "border border-white/60 bg-white/55 shadow-[0_1px_8px_rgba(0,0,0,0.05)] backdrop-blur-sm"
                      : "border border-white/40 bg-white/35 backdrop-blur-sm hover:bg-white/45",
                  )}
                >
                  <div className="relative shrink-0 mt-[5px]">
                    {isLatest && isLive && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: cfg.pingHex, width: 7, height: 7 }}
                      />
                    )}
                    <span
                      className={cn("block rounded-full", cfg.dot)}
                      style={{ width: 7, height: 7 }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span
                        className={cn(
                          "inline-flex text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full border",
                          cfg.badge,
                        )}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[9px] text-slate-300 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-[11px] leading-snug break-words",
                        cfg.text,
                        !isLatest && "opacity-65",
                      )}
                    >
                      {toUserFacingPipelineLogMessage(log.message)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Stage messages ──────────────────────────────────────────────────
// Rotating status messages shown in the GenerationConsole while each
// visible stage is active.  S1 is folded into A2 so no messages needed.
const STAGE_MESSAGES: Record<string, string[]> = {
  A1: [
    "Interpreting the reviewed Course Structure…",
    "Building the enriched course structure…",
    "Mapping sections and learning objectives…",
  ],
  A2: [
    "Writing course content for each lesson…",
    "Crafting engaging explanations and examples…",
    "Generating knowledge check questions…",
  ],
  S2: [
    "Reviewing generated content for accuracy…",
    "Checking lesson depth and compliance…",
    "Ensuring all quality standards are met…",
  ],
  FINALIZATION: [
    "Assembling your course…",
    "Applying final structure and formatting…",
    "Almost ready…",
  ],
  EXPORT: [
    "Preparing your course document…",
    "Formatting headings and styles…",
    "Finalizing your download…",
  ],
};

function useRotatingMessage(activeStageId: string | null): string {
  const [tick, setTick] = useState(0);
  const prevStageRef = useRef<string | null>(undefined);
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => {
        if (prevStageRef.current !== activeStageId) {
          prevStageRef.current = activeStageId;
          return 0;
        }
        return t + 1;
      });
    }, 3500);
    return () => clearInterval(id);
  }, [activeStageId]);
  const msgs = activeStageId
    ? (STAGE_MESSAGES[activeStageId] ?? ["Processing…"])
    : ["Preparing your course…"];
  return msgs[tick % msgs.length];
}

const STAGE_LABEL_MAP: Record<string, string> = {
  A1: "Preparing Final Outline",
  A2: "Generating Content",
  S2: "Validating Content",
  FINALIZATION: "Assembly",
  EXPORT: "Export",
};

// ── Blocker card ────────────────────────────────────────────────────
function StageBlockerCard({ stage }: { stage: PipelineStageState }) {
  const isRetrying =
    stage.status === "retrying" ||
    (stage.status === "processing" && stage.retryAttempt > 0);
  return (
    <div className="w-full rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
        <span className="text-xs font-semibold text-amber-800">
          {stage.label}
          {isRetrying && stage.retryAttempt > 0 && (
            <span className="ml-1.5 font-normal text-amber-600">
              · attempt {stage.retryAttempt}/3
            </span>
          )}
        </span>
        {isRetrying && (
          <span className="ml-auto text-[10px] font-medium text-amber-500 uppercase tracking-wide">
            Retrying
          </span>
        )}
      </div>
      <ul className="space-y-1 pl-1">
        {stage.blockers.map((b, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-xs text-amber-700"
          >
            <span className="shrink-0 mt-px text-amber-400">•</span>
            <span>{b.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Generation Console ──────────────────────────────────────────────
function GenerationConsole({
  statusMessage,
  activeStageId,
  progressPct,
  completedCount,
  totalCount,
}: {
  statusMessage: string;
  activeStageId: string | null;
  progressPct: number;
  completedCount: number;
  totalCount: number;
}) {
  const stageLabel = activeStageId
    ? (STAGE_LABEL_MAP[activeStageId] ?? activeStageId)
    : "Initializing";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full overflow-hidden rounded-2xl border border-white/65 bg-white/82 shadow-[0_8px_32px_rgba(99,102,241,0.08),0_1px_4px_rgba(15,23,42,0.04)] backdrop-blur-2xl"
    >
      {/* Accent top bar */}
      <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <div className="flex items-stretch divide-x divide-slate-100/80 max-lg:flex-col max-lg:divide-x-0 max-lg:divide-y max-lg:divide-slate-100/80">
        {/* Left: status + progress */}
        <div className="min-w-0 flex-1 px-5 py-4 space-y-3 max-lg:px-4 max-lg:py-3.5 max-lg:space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shrink-0">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
              AI Processing
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={statusMessage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="text-[15px] font-semibold leading-snug text-slate-800 max-lg:text-[13px]"
            >
              {statusMessage}
            </motion.p>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="h-[3px] overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${Math.max(progressPct, 3)}%` }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            />
          </div>

          {/* Stage badge + activity indicator */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 max-lg:truncate max-lg:max-w-[12rem]">
              {stageLabel}
            </span>
            <div className="flex shrink-0 items-center gap-[5px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-[5px] w-[5px] rounded-full bg-indigo-400/80 animate-bounce"
                  style={{
                    animationDelay: `${i * 0.16}s`,
                    animationDuration: "0.85s",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: progress stat */}
        <div className="flex w-[120px] shrink-0 flex-col items-center justify-center gap-1 px-4 py-4 max-lg:w-full max-lg:flex-row max-lg:items-center max-lg:justify-between max-lg:border-t max-lg:px-4 max-lg:py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 max-lg:text-[9px]">
            Progress
          </p>
          <p className="text-[32px] font-bold leading-none tabular-nums text-indigo-600 max-lg:text-2xl">
            {progressPct}
            <span className="text-lg font-semibold text-indigo-400">%</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium tabular-nums">
            {completedCount} <span className="text-slate-300">/</span>{" "}
            {totalCount} stages
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100/70 bg-slate-50/50 px-5 py-2 max-lg:px-4">
        <p className="text-center text-[10px] text-slate-400 tracking-wide">
          Do not close this tab — generation is running on the server.
        </p>
      </div>
    </motion.div>
  );
}

// ── Stage timeline ──────────────────────────────────────────────────
function StageTimeline({ stages }: { stages: PipelineStageState[] }) {
  return (
    <div className="w-full max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:[-webkit-overflow-scrolling:touch]">
      <div className="flex flex-wrap items-center justify-center gap-1 max-lg:min-w-max max-lg:flex-nowrap max-lg:px-1 max-lg:pb-0.5">
        {stages.map((stage, i) => (
          <div
            key={stage.id}
            className="flex items-center gap-1 max-lg:shrink-0"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: i * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 24,
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-300 max-lg:gap-1 max-lg:px-2 max-lg:py-1 max-lg:text-[10px]",
                stage.status === "completed" &&
                  "border-emerald-200/70 bg-emerald-50 text-emerald-700 shadow-[0_1px_6px_rgba(16,185,129,0.1)]",
                stage.status === "processing" &&
                  "border-indigo-200/80 bg-white text-indigo-700 shadow-[0_2px_10px_rgba(99,102,241,0.14)] ring-1 ring-indigo-200/60",
                stage.status === "retrying" &&
                  "border-amber-200 bg-amber-50 text-amber-700",
                (stage.status === "pending" || stage.status === "failed") &&
                  "border-slate-100 bg-white/60 text-slate-400",
              )}
            >
              {stage.status === "completed" && (
                <CheckCircle2 size={10} className="shrink-0 text-emerald-500" />
              )}
              {stage.status === "processing" && (
                <Loader2
                  size={10}
                  className="animate-spin shrink-0 text-indigo-500"
                />
              )}
              {stage.status === "retrying" && (
                <AlertTriangle size={10} className="shrink-0 text-amber-500" />
              )}
              {(stage.status === "pending" || stage.status === "failed") && (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200 shrink-0" />
              )}
              {stage.shortLabel}
            </motion.div>
            {i < stages.length - 1 && (
              <div
                className="h-px w-3 shrink-0 rounded-full transition-colors duration-700"
                style={{
                  background:
                    stage.status === "completed"
                      ? "linear-gradient(90deg, rgb(110,231,183), rgb(167,243,208))"
                      : "rgb(226,232,240)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────────
export function PipelineView({ jobId }: PipelineViewProps) {
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const { pipeline, logs, fatalError } = usePipelineStore();
  const { reset, setActiveJobId, setPhase, courseTitle } = useCourseStore();
  const { clearPipeline } = usePipelineStore();

  useJobPipeline(jobId);

  /** Shared helper for every "go back to three-panel" path in this view. */
  function backToThreePanel() {
    clearPipeline()
    setActiveJobId(null)
    setPhase("three-panel")
  }

  const retryMutation = useMutation({
    mutationFn: () => retryJob(jobId, pipeline?.error?.stage ?? "A1"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(jobId),
    onSettled: () => {
      backToThreePanel()
    },
  });

  const statusMessage = useRotatingMessage(pipeline?.activeStageId ?? null);

  if (fatalError) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Back bar */}
        <div className="relative z-20 shrink-0 flex items-center gap-3 bg-white/85 backdrop-blur-md border-b border-slate-200/60 px-5 py-2">
          <button
            type="button"
            onClick={() => backToThreePanel()}
            className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-150 shrink-0 group"
          >
            <ArrowLeft
              size={14}
              className="transition-transform duration-150 group-hover:-translate-x-0.5"
            />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="w-px h-3.5 bg-slate-200 shrink-0" />
          <span className="text-[12px] font-medium text-slate-400 truncate">
            Course generation progress
          </span>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
          <PipelinePageBackground />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 max-w-md w-full rounded-2xl border border-red-200/80 bg-white/95 p-8 text-center shadow-[0_8px_32px_rgba(239,68,68,0.08)] backdrop-blur-sm"
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
                <XCircle size={24} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-2">
              Session expired
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {fatalError}
            </p>
            <button
              type="button"
              onClick={() => {
                clearCourseStorage();
                reset();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.35)] hover:shadow-[0_5px_20px_rgba(99,102,241,0.45)] hover:scale-[1.02] transition-all duration-200"
            >
              <ArrowLeft size={14} />
              Start Over
            </button>
          </motion.div>
        </div>
        {/* end inner centered card wrapper */}
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <PipelinePageBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400 font-medium">
            Connecting to course generation…
          </p>
        </div>
      </div>
    );
  }

  const { stages, activeStageId, overallStatus, error } = pipeline;
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const totalCount = stages.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const isProcessing =
    overallStatus === "pending" || overallStatus === "processing";
  const isCompleted = overallStatus === "completed";
  const isFailed = overallStatus === "failed";

  const stagesWithBlockers = stages.filter(
    (s) =>
      s.blockers.length > 0 &&
      (s.status === "processing" ||
        s.status === "retrying" ||
        s.status === "failed"),
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Back bar ──────────────────────────────────────────────────── */}
      <div className="relative z-20 shrink-0 flex items-center gap-3 bg-white/85 backdrop-blur-md border-b border-slate-200/60 px-5 py-2">
        <button
          type="button"
          onClick={() => isProcessing ? setShowBackConfirm(true) : backToThreePanel()}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors duration-150 shrink-0 group"
        >
          <ArrowLeft
            size={14}
            className="transition-transform duration-150 group-hover:-translate-x-0.5"
          />
          <span className="hidden sm:inline">Back</span>
        </button>

        <ConfirmLeaveModal
          open={showBackConfirm}
          title="Leave while generating?"
          message="Your course is still being generated. Going back will stop monitoring but the job will continue running in the background. You can check its status later."
          confirmLabel="Go back"
          cancelLabel="Keep watching"
          onConfirm={() => { setShowBackConfirm(false); backToThreePanel() }}
          onCancel={() => setShowBackConfirm(false)}
        />
        <div className="w-px h-3.5 bg-slate-200 shrink-0" />
        <div className="flex-1 min-w-0">
          {courseTitle ? (
            <>
              <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                {courseTitle}
              </p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                Course generation progress
              </p>
            </>
          ) : (
            <span className="text-[12px] font-medium text-slate-400 truncate">
              Course generation progress
            </span>
          )}
        </div>
        {isProcessing && (
          <button
            type="button"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all duration-150 disabled:opacity-50 shrink-0"
          >
            {cancelMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Ban size={12} />
            )}
            Cancel Generation
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden max-lg:flex-col max-lg:overflow-x-hidden">
        <PipelinePageBackground />

        <ActivityLogPanel
          logs={logs}
          isLive={isProcessing}
          collapsed={feedCollapsed}
          onToggle={() => setFeedCollapsed((v) => !v)}
        />

        {/* Main content */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden px-6 py-5 max-lg:min-w-0 max-lg:overflow-y-auto max-lg:px-4 max-lg:py-4">
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-1 inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600 shadow-[0_2px_16px_rgba(99,102,241,0.08)] backdrop-blur-xl"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
              </span>
              Generating your course
            </motion.div>
          )}

          {/* Hero: status pill → robot */}
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4 pb-5 pt-0 max-lg:max-w-2xl max-lg:gap-3 max-lg:pb-4">
            <AnimatePresence mode="wait">
              {isCompleted && (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 shadow-sm"
                >
                  <CheckCircle2 size={11} />
                  Course ready
                </motion.div>
              )}
              {isFailed && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200/70 bg-red-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 shadow-sm"
                >
                  <XCircle size={11} />
                  Generation failed
                </motion.div>
              )}
            </AnimatePresence>

            <CourseGifLoader
              activeStageId={activeStageId}
              overallStatus={overallStatus}
              size="large"
            />
          </div>

          {/* Bottom dock: progress card + timeline */}
          <div className="flex w-full max-w-xl shrink-0 flex-col items-center gap-2.5 pb-2 max-lg:max-w-full max-lg:gap-2">
            {isProcessing && (
              <>
                <GenerationConsole
                  statusMessage={statusMessage}
                  activeStageId={activeStageId}
                  progressPct={progressPct}
                  completedCount={completedCount}
                  totalCount={totalCount}
                />
                <StageTimeline stages={stages} />
              </>
            )}

            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-col items-center gap-3 text-center"
              >
                <p className="text-sm font-semibold text-emerald-600">
                  Opening the Course Editor…
                </p>
                <StageTimeline stages={stages} />
              </motion.div>
            )}

            {isFailed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-xl border border-red-200/70 bg-red-50/80 px-5 py-3.5 text-center text-sm text-red-600 max-lg:px-4 max-lg:py-3"
              >
                {error?.message ??
                  "An unexpected error occurred during generation."}
              </motion.div>
            )}

            {stagesWithBlockers.length > 0 && (
              <div className="w-full space-y-2">
                {stagesWithBlockers.map((stage) => (
                  <StageBlockerCard key={stage.id} stage={stage} />
                ))}
              </div>
            )}

            {isFailed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2.5 max-lg:w-full max-lg:flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => backToThreePanel()}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.97] max-lg:min-w-0 max-lg:flex-1 max-lg:justify-center"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                {error?.retryable && (
                  <button
                    type="button"
                    disabled={retryMutation.isPending}
                    onClick={() => retryMutation.mutate()}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60 max-lg:min-w-0 max-lg:flex-1 max-lg:justify-center"
                    style={{
                      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    }}
                  >
                    {retryMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    Retry Generation
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
      {/* end inner pipeline wrapper */}
    </div>
  );
}
