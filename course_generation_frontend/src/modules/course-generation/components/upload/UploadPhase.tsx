import { Fragment, useState } from "react";
import {
  Wand2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileCheck,
  X,
  Cloud,
  HardDrive,
  Check,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/components/Button";
import { UploadZone } from "../UploadZone";
import { FileCard } from "../FileCard";
import { useCourseStore } from "../../store/courseStore";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useGenerateTO } from "../../hooks/useGenerateTO";
import { courseApi } from "../../api/courseApi";
import { TOGenerationLoader } from "./TOGenerationLoader";
import { InlineAzureBrowser } from "./InlineAzureBrowser";

type UploadMode = "system" | "azure";

const STEPS = ["Upload", "Review & Edit", "Generate"];

export function UploadPhase() {
  const {
    rawDocuments,
    removeRawDocument,
    openPreview,
    courseTopic,
    setCourseTopic,
    uploadFolder,
    setUploadFolder,
    customToPrompt,
    setCustomToPrompt,
    courseTypeHint,
    setCourseTypeHint,
    toDocument,
    setToDocument,
  } = useCourseStore();

  const { enqueueFiles, enqueueAzureFiles, isTopicValid } =
    useFileUpload("raw");
  const generateTO = useGenerateTO();

  const [uploadMode, setUploadMode] = useState<UploadMode>("system");
  const [toUploadError, setToUploadError] = useState<string | null>(null);

  const { mutate: uploadTO, isPending: isUploadingTO } = useMutation({
    mutationFn: async (file: File) => {
      const { blobPath, uploadFolder: folder } = await courseApi.uploadDocument(
        file,
        courseTopic.trim(),
      );
      setUploadFolder(folder);
      return { blobPath, file };
    },
    onSuccess: ({ blobPath, file }) => {
      setToUploadError(null);
      setToDocument({
        id: "to-doc",
        name: file.name,
        sizeBytes: file.size,
        status: "success",
        fileType: "docx",
        blobPath,
        source: "system",
      });
    },
    onError: (err) => {
      setToUploadError(
        err instanceof Error ? err.message : "Failed to upload TO document",
      );
    },
  });

  const topicLocked = rawDocuments.length > 0;
  const topicError =
    courseTopic.trim().length > 0 && !isTopicValid
      ? "Enter at least 2 characters with a letter or number"
      : null;

  const successFiles = rawDocuments.filter((f) => f.status === "success");
  const processingFiles = rawDocuments.filter(
    (f) => f.status === "parsing" || f.status === "uploading",
  );
  const errorFiles = rawDocuments.filter((f) => f.status === "error");
  const canGenerate = successFiles.length > 0 && processingFiles.length === 0;
  const toProvided = toDocument?.status === "success";

  const handleTOFileDrop = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const docx = arr.find((f) => f.name.toLowerCase().endsWith(".docx"));
    if (!docx || !isTopicValid) return;
    uploadTO(docx);
  };

  const addedAzurePaths = new Set(
    rawDocuments
      .filter((f) => f.source === "azure" && f.blobPath)
      .map((f) => f.blobPath as string),
  );

  return (
    <div className="flex flex-col h-full bg-[#eceff8]">
      {generateTO.isPending && <TOGenerationLoader />}

      {/* ── Page header ──────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-200/60 shadow-[0_1px_0_0_rgb(226,232,240)]">
        <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 sm:px-10 py-4 gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_3px_12px_0_rgb(99,102,241,0.4)]">
              <Upload size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">
                Upload Source Documents
              </h1>
              <p className="text-[12px] text-slate-500 mt-0.5 leading-none hidden sm:block">
                Provide study materials to generate your Training Outline
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <nav
            className="hidden lg:flex items-center gap-1.5 shrink-0"
            aria-label="Progress"
          >
            {STEPS.map((label, i) => (
              <Fragment key={label}>
                {i > 0 && <div className="w-8 h-px bg-slate-200" />}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all",
                    i === 0
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/70"
                      : "text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      i === 0
                        ? "bg-indigo-600 text-white shadow-[0_1px_4px_0_rgb(99,102,241,0.5)]"
                        : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {i + 1}
                  </span>
                  {label}
                </div>
              </Fragment>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-4">
          {/* Two-column grid — right column is sticky, left grows freely */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] gap-4">

            {/* ════ LEFT: SOURCE DOCUMENTS PANEL ════════════════════ */}
            <div className="rounded-2xl bg-white border border-slate-200/50 shadow-[0_2px_12px_-2px_rgb(0,0,0,0.08),0_8px_32px_-6px_rgb(0,0,0,0.05)] overflow-hidden">

              {/* Panel header */}
              <div className="px-6 pt-4 pb-3.5 border-b border-slate-100/80">
                <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">
                  Source Documents
                </h2>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                  Upload files from your system or browse Azure storage. All files are analyzed together to generate the Training Outline.
                </p>
              </div>

              {/* ── Mode tabs ── */}
              <div className="grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => setUploadMode("system")}
                  className={cn(
                    "group relative flex items-center gap-3 px-5 py-3.5 text-left transition-all duration-200",
                    uploadMode === "system"
                      ? "bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700"
                      : "bg-slate-50/70 hover:bg-slate-50 border-r border-slate-100",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                      uploadMode === "system"
                        ? "bg-white/20 shadow-[0_2px_8px_rgb(0,0,0,0.12)]"
                        : "bg-white border border-slate-200 shadow-sm group-hover:border-indigo-200 group-hover:bg-indigo-50/80",
                    )}
                  >
                    <HardDrive
                      size={15}
                      className={
                        uploadMode === "system"
                          ? "text-white"
                          : "text-slate-500 group-hover:text-indigo-600 transition-colors"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[13px] font-semibold leading-none",
                        uploadMode === "system" ? "text-white" : "text-slate-800",
                      )}
                    >
                      Upload from System
                    </p>
                    <p
                      className={cn(
                        "text-[11px] mt-1 leading-none",
                        uploadMode === "system" ? "text-indigo-200" : "text-slate-500",
                      )}
                    >
                      New files from your computer
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all",
                      uploadMode === "system"
                        ? "bg-white/25"
                        : "border-2 border-slate-200 group-hover:border-indigo-300",
                    )}
                  >
                    {uploadMode === "system" && (
                      <Check size={9} className="text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMode("azure")}
                  className={cn(
                    "group relative flex items-center gap-3 px-5 py-3.5 text-left transition-all duration-200",
                    uploadMode === "azure"
                      ? "bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700"
                      : "bg-slate-50/70 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                      uploadMode === "azure"
                        ? "bg-white/20 shadow-[0_2px_8px_rgb(0,0,0,0.12)]"
                        : "bg-white border border-slate-200 shadow-sm group-hover:border-sky-200 group-hover:bg-sky-50/80",
                    )}
                  >
                    <Cloud
                      size={15}
                      className={
                        uploadMode === "azure"
                          ? "text-white"
                          : "text-slate-500 group-hover:text-sky-600 transition-colors"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[13px] font-semibold leading-none",
                        uploadMode === "azure" ? "text-white" : "text-slate-800",
                      )}
                    >
                      Select from Azure
                    </p>
                    <p
                      className={cn(
                        "text-[11px] mt-1 leading-none",
                        uploadMode === "azure" ? "text-indigo-200" : "text-slate-500",
                      )}
                    >
                      Browse already-uploaded files
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all",
                      uploadMode === "azure"
                        ? "bg-white/25"
                        : "border-2 border-slate-200 group-hover:border-sky-300",
                    )}
                  >
                    {uploadMode === "azure" && (
                      <Check size={9} className="text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
              </div>

              {/* Sliding underline */}
              <div className="h-[3px] bg-slate-100 relative overflow-hidden">
                <div
                  className="absolute top-0 h-full w-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(${uploadMode === "azure" ? "100%" : "0%"})`,
                  }}
                />
              </div>

              {/* ── Mode content ── */}
              <div className="px-5 py-4">
                {uploadMode === "system" && (
                  <div className="space-y-4">
                    {/* Course Topic */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="course-topic"
                          className="text-[11px] font-bold uppercase tracking-widest text-slate-400"
                        >
                          Course Topic <span className="text-red-400">*</span>
                        </label>
                        {topicLocked && uploadFolder && (
                          <span className="text-[11px] text-slate-500">
                            Folder:{" "}
                            <code className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600 border border-indigo-100">
                              {uploadFolder}
                            </code>
                          </span>
                        )}
                      </div>
                      <input
                        id="course-topic"
                        type="text"
                        value={courseTopic}
                        onChange={(e) => setCourseTopic(e.target.value)}
                        disabled={topicLocked}
                        placeholder="e.g. Enhanced Flood Insurance, FINRA Regulatory Module"
                        className={cn(
                          "w-full rounded-xl border px-4 py-2.5 text-[13px] text-slate-800 outline-none transition-all",
                          "placeholder:text-slate-400",
                          topicLocked
                            ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                            : topicError
                              ? "bg-white border-red-300 focus:ring-2 focus:ring-red-100"
                              : "bg-white border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50",
                        )}
                      />
                      {topicError && (
                        <p className="text-[12px] font-medium text-red-500">
                          {topicError}
                        </p>
                      )}
                      {!topicLocked && !topicError && (
                        <p className="text-[12px] text-slate-400">
                          This becomes your folder name in Azure Blob Storage.
                        </p>
                      )}
                    </div>

                    {/* Upload zone */}
                    <UploadZone
                      onFiles={enqueueFiles}
                      multiple
                      disabled={!isTopicValid}
                      accept=".docx,.pdf"
                      label={
                        isTopicValid
                          ? "Drop your DOCX or PDF files here"
                          : "Enter a course topic above to enable upload"
                      }
                      sublabel="or click to browse your computer"
                    />
                  </div>
                )}

                {uploadMode === "azure" && (
                  <InlineAzureBrowser
                    accept={[".docx", ".pdf"]}
                    onAdd={enqueueAzureFiles}
                    addedPaths={addedAzurePaths}
                  />
                )}
              </div>

              {/* ── File queue ── */}
              {rawDocuments.length > 0 && (
                <div className="border-t border-slate-100/80">
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Documents Queue
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-bold rounded-full px-2.5 py-0.5 border",
                          successFiles.length === rawDocuments.length
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-600 border-slate-200",
                        )}
                      >
                        {successFiles.length}/{rawDocuments.length} ready
                      </span>
                      {processingFiles.length > 0 && (
                        <span className="text-[11px] text-indigo-600 font-medium animate-pulse">
                          Processing…
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {rawDocuments.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          onRemove={removeRawDocument}
                          onPreview={openPreview}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Inline error banners (inside the card, below queue) ── */}
              {(errorFiles.length > 0 || generateTO.isError) && (
                <div className="border-t border-slate-100/80 px-5 py-3.5 space-y-2">
                  {errorFiles.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 border border-red-200 mt-0.5">
                        <AlertCircle size={13} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-red-700">
                          {errorFiles.length} file
                          {errorFiles.length !== 1 ? "s" : ""} failed to upload
                        </p>
                        <p className="text-[12px] text-red-500 mt-0.5">
                          Remove the failed files and try uploading again.
                        </p>
                      </div>
                    </div>
                  )}
                  {generateTO.isError && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 border border-red-200 mt-0.5">
                        <AlertCircle size={13} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-red-700">
                          Failed to generate Training Outline
                        </p>
                        <p className="text-[12px] text-red-500 mt-0.5">
                          {generateTO.error instanceof Error
                            ? generateTO.error.message
                            : "An unexpected error occurred. Please try again."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ════ RIGHT: SETTINGS COLUMN (sticky) ════════════════ */}
            {/*
              self-start is required for position:sticky to work in a CSS grid.
              Without it the grid item stretches to the row height, disabling stickiness.
            */}
            <div className="flex flex-col gap-4 sticky top-4 self-start">

              {/* ── Training Outline card ── */}
              <div className="rounded-2xl bg-white border border-slate-200/50 shadow-[0_2px_12px_-2px_rgb(0,0,0,0.08),0_8px_32px_-6px_rgb(0,0,0,0.05)] overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500" />

                <div className="px-5 pt-4 pb-3 border-b border-slate-100/80">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_2px_8px_0_rgb(16,185,129,0.3)]">
                        <FileCheck size={12} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-bold text-slate-900 leading-none">
                          Training Outline
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Upload a pre-built TO document to bypass AI generation
                        </p>
                      </div>
                    </div>
                    {toProvided ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 size={9} />
                        Provided
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200 shrink-0">
                        Optional
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4">
                  {toDocument ? (
                    <div
                      className={cn(
                        "flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-all",
                        toDocument.status === "success"
                          ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/40"
                          : "border-red-200/80 bg-red-50/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          toDocument.status === "success" ? "bg-emerald-100" : "bg-red-100",
                        )}
                      >
                        <FileCheck
                          size={14}
                          className={
                            toDocument.status === "success"
                              ? "text-emerald-600"
                              : "text-red-500"
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800">
                          {toDocument.name}
                        </p>
                        {toDocument.status === "success" && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            AI generation overridden
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setToDocument(null);
                          setToUploadError(null);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <UploadZone
                      onFiles={handleTOFileDrop}
                      multiple={false}
                      disabled={!isTopicValid || isUploadingTO}
                      accept=".docx"
                      compact
                      label={
                        isUploadingTO
                          ? "Uploading TO document…"
                          : isTopicValid
                            ? "Drop your TO document here"
                            : "Enter course topic first"
                      }
                      sublabel="DOCX only · click to browse"
                    />
                  )}
                  {toUploadError && (
                    <p className="mt-2.5 text-[12px] font-medium text-red-500">
                      {toUploadError}
                    </p>
                  )}
                </div>
              </div>

              {/* ── AI Generation Settings card ── */}
              <div className="relative rounded-2xl bg-white border border-slate-200/50 shadow-[0_2px_12px_-2px_rgb(0,0,0,0.08),0_8px_32px_-6px_rgb(0,0,0,0.05)] overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-violet-500 to-purple-500" />

                <div className="px-5 pt-3.5 pb-3 border-b border-slate-100/80">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_2px_8px_0_rgb(139,92,246,0.3)]">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-bold text-slate-900 leading-none">
                          AI Generation
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Optional context to improve outline quality
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200 shrink-0">
                      Optional
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3.5 space-y-3">
                  {/* Course type */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Course Type / Domain
                    </label>
                    <input
                      type="text"
                      value={courseTypeHint}
                      onChange={(e) => setCourseTypeHint(e.target.value)}
                      placeholder="e.g. Flood Insurance CE, FINRA Regulatory"
                      className={cn(
                        "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 outline-none",
                        "placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all",
                      )}
                    />
                    {courseTypeHint.trim() && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 border border-violet-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                        <p className="text-[12px] text-violet-700 font-medium truncate">
                          Prioritizing:{" "}
                          <span className="font-bold">{courseTypeHint.trim()}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Custom prompt */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Custom Generation Prompt
                    </label>
                    <textarea
                      value={customToPrompt}
                      onChange={(e) => setCustomToPrompt(e.target.value)}
                      placeholder="e.g. Create 8–10 sections. Focus on practical applications and regulatory compliance procedures…"
                      rows={3}
                      className={cn(
                        "w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-800 outline-none",
                        "placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all",
                      )}
                    />
                    {customToPrompt.trim() && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 border border-violet-100">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                        <p className="text-[12px] text-violet-700 font-medium">
                          Custom prompt active — overrides default generation
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* TO provided overlay */}
                {toProvided && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-[2px] z-10">
                    <div className="flex flex-col items-center gap-2 text-center px-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 border border-emerald-200">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-emerald-800">
                          AI Generation Disabled
                        </p>
                        <p className="text-[12px] text-emerald-600 mt-0.5">
                          Your Training Outline overrides this
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* ═════════════════════════════════════════════════════ */}

          </div>
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-slate-200/60 shadow-[0_-2px_12px_-4px_rgb(0,0,0,0.08)]">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-4 px-6 sm:px-10 py-4">
          <div className="min-w-0">
            {isUploadingTO ? (
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-slate-800 leading-none">
                    Uploading TO document…
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Please wait while your Training Outline is uploading.
                  </p>
                </div>
              </div>
            ) : toProvided ? (
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-emerald-700 leading-none">
                    TO provided — using your document
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Your Training Outline will override AI generation.
                  </p>
                </div>
              </div>
            ) : processingFiles.length > 0 ? (
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-slate-800 leading-none">
                    Processing {processingFiles.length} file
                    {processingFiles.length !== 1 ? "s" : ""}…
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Uploading and parsing — this will only take a moment.
                  </p>
                </div>
              </div>
            ) : canGenerate ? (
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-slate-800 leading-none">
                    {successFiles.length} file
                    {successFiles.length !== 1 ? "s" : ""} ready
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {customToPrompt.trim()
                      ? "Custom prompt active — click Generate TO to analyze."
                      : "Click Generate TO to analyze and extract the Training Outline."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-slate-400 leading-none">
                    Waiting for files
                  </p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    Upload or select at least one DOCX or PDF file to continue.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<Wand2 size={15} />}
            loading={generateTO.isPending}
            disabled={!canGenerate || generateTO.isPending || isUploadingTO}
            onClick={() => {
              if (!generateTO.isPending) generateTO.mutate();
            }}
          >
            {generateTO.isPending
              ? "Generating Training Outline…"
              : "Generate Training Outline"}
          </Button>
        </div>
      </div>
    </div>
  );
}
