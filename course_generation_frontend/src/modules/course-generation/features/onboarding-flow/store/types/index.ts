import type {
  S1ValidationResult,
  SourceAnalysis,
  UploadedFile,
  WorkflowPhase,
  JsonObject,
  JsonValue,
  JobResponse,
  WizardData,
} from "../../../../types";

export interface CourseState {
  // ── Workflow ────────────────────────────────────────────────────────────────
  phase: WorkflowPhase;

  // ── Files ───────────────────────────────────────────────────────────────────
  rawDocuments: UploadedFile[];
  activeFileId: string | null;
  previewOpen: boolean;
  previewFileId: string | null;

  // ── TO + Rules ──────────────────────────────────────────────────────────────
  toData: JsonObject | null;
  toOriginal: JsonObject | null;
  rulesData: JsonObject | null;
  rulesOriginal: JsonObject | null;

  // ── Dirty tracking ──────────────────────────────────────────────────────────
  modifiedTOPaths: Set<string>;
  modifiedRulesPaths: Set<string>;

  // ── Job ─────────────────────────────────────────────────────────────────────
  activeJob: JobResponse | null;
  /** Stable job ID used by pipeline + editor views after job creation. */
  activeJobId: string | null;

  /** True while preset TO generation is running in the wizard or upload flow. */
  isGeneratingTO: boolean;

  generatedToBlobPath: string | null;
  /** User-provided course topic — becomes uploaded-documents/{folder}/ in Azure Blob. */
  courseTopic: string;
  /** Sanitized folder name returned by the server after first upload. */
  uploadFolder: string | null;
  /** Optional custom prompt the user provides to guide TO generation. */
  customToPrompt: string;
  /** Optional course/domain type hint (e.g. "Washington LTC Compliance Course"). */
  courseTypeHint: string;
  /**
   * Numeric DB primary key returned by `POST /api/course-basic` (`data.id`).
   * Used for `GET`/`PUT /api/course-basic/{courseId}`.
   */
  courseId: string | null;
  /**
   * Human-readable course code returned by the API (`data.course_code`, e.g. CRS-9F3A1C2B).
   * Shown in the wizard as "Course ID".
   */
  courseCode: string | null;

  toDocument: UploadedFile | null;
  uploadedOutlineJson: JsonObject | null;

  durationHours: number | null;
  difficultyLevel: string | null;
  calculatedWordCount: number | null;

  audience: string;
  courseTitle: string;
  detectedRuleFamily: string;

  wizardData: WizardData;

  sourceAnalyses: SourceAnalysis[];

  sourceAnalysesCacheKey: string | null;

  toS1Validation: S1ValidationResult | null;

  /** False until Zustand persist has rehydrated from localStorage. */
  hasHydrated: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setPhase: (phase: WorkflowPhase) => void;
  setCourseTopic: (topic: string) => void;
  setUploadFolder: (folder: string | null) => void;
  setCustomToPrompt: (prompt: string) => void;
  setCourseTypeHint: (hint: string) => void;
  setAudience: (audience: string) => void;
  setDetectedRuleFamily: (family: string) => void;
  setDurationHours: (hours: number | null) => void;
  setDifficultyLevel: (level: string | null) => void;
  setCourseId: (courseId: string | null) => void;
  setCourseCode: (courseCode: string | null) => void;
  setCourseTitle: (courseTitle: string) => void;

  addRawDocument: (file: UploadedFile) => void;
  updateRawDocument: (id: string, patch: Partial<UploadedFile>) => void;
  removeRawDocument: (id: string) => void;
  setActiveFileId: (id: string | null) => void;

  openPreview: (file: UploadedFile) => void;
  closePreview: () => void;

  setTOData: (data: JsonObject, original?: JsonObject) => void;
  updateTOField: (path: string[], value: JsonValue) => void;
  resetTOField: (path: string[]) => void;

  setRulesData: (data: JsonObject, original?: JsonObject) => void;
  updateRulesField: (path: string[], value: JsonValue) => void;
  resetRulesField: (path: string[]) => void;

  setWizardData: (patch: Partial<WizardData>) => void;
  setSourceAnalyses: (analyses: SourceAnalysis[], cacheKey?: string) => void;
  setToS1Validation: (result: S1ValidationResult | null) => void;

  setToDocument: (file: UploadedFile | null) => void;
  setUploadedOutlineJson: (json: JsonObject | null) => void;
  setActiveJob: (job: JobResponse | null) => void;
  setActiveJobId: (id: string | null) => void;
  setIsGeneratingTO: (generating: boolean) => void;
  setGeneratedToBlobPath: (path: string | null) => void;
  /** Build preset TO + rules from current wizard state and write to the store. */
  hydratePresetTrainingOutline: () => void;
  reset: () => void;
}
