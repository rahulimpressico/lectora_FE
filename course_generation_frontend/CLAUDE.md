# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:5173 with HMR
npm run build      # tsc -b && vite build (type-check + bundle)
npm run lint       # ESLint
npm run preview    # serve production build locally
```

### Docker

Docker files live in the parent `lectora_FE/` directory. From there:

```bash
cd ..   # lectora_FE root
cp .env.example .env   # optional: FE_PORT, BACKEND_HOST
docker compose up --build -d
# App: http://localhost:8080  (proxies /api → BACKEND_HOST)
```

Backend must be running separately (e.g. `uvicorn lectora_backend.main:app` on port 8000).
Set `BACKEND_HOST=host.docker.internal:8000` when the API runs on the host.

There is no test suite yet.

## Architecture

### Routing & Layout

`src/router/index.tsx` defines routes:

- `/` → `HomePage` (landing/marketing page, outside AppLayout)
- `/dashboard` → `DashboardPage` (placeholder, inside AppLayout)
- `/generate` → `CourseGenerationPage`
- `/assert_library` → `AssetLibraryPage`
- `/documents_library` → `DocumentsLibraryPage`
- `/costing` → `CostingDashboardPage`

`AppLayout` (`src/layouts/AppLayout.tsx`) provides the sidebar + topbar shell for all routes except `/`. It includes three slide-over panels (`src/layouts/panels/`): `HelpPanel`, `SettingsPanel`, and `TasksPanel`. `TasksPanel` shows TO-generation background jobs with status badges, cancel controls, and expandable detail rows — it sources data from `useToTasks` and displays a running-count badge in the sidebar.

### Feature: course-generation

All active UI lives under `src/modules/course-generation/`. The module is self-contained — it exports only from `index.ts`. The entry point is `pages/CourseGenerationPage.tsx`.

**Workflow phases** driven by `WorkflowPhase` in Zustand (`courseStore.ts`). There are two entry paths:

**Path A — Wizard (new users):**

1. **`welcome`** — `WelcomeScreen`; full-viewport landing, user chooses wizard or direct upload.
2. **`wizard-basics` → `wizard-outline-review`** — 7 sequential steps in `WizardLayout` with an animated step progress bar. Steps: `CourseBasicsStep`, `AudienceStep`, `SourceMaterialStep`, `LearningObjectivesStep`, `CourseDirectionStep`, `OutlinePreferenceStep`, `OutlineReviewStep`. All step data accumulates in `courseStore.wizardData` (`WizardData` type from `types/wizard.ts`). `OutlineReviewStep` triggers TO generation and on success advances to `to-summary`. `WizardNavContext` (`WizardNavContext.tsx`) lets each step override the Next/Back button behavior and label by calling `setConfig()`.

**Path B — Direct upload:**

3. **`upload`** — `UploadPhase` (`to_rules_generation_view/components/`); user drops `.docx` files parsed client-side with `mammoth`, uploaded to `/api/documents/upload`. `InlineAzureBrowser` lets users pick existing blobs instead. "Generate TO" calls `/api/documents/generate-to`.

**Shared post-generation phases:**

4. **`to-summary`** — `TOSummaryPhase` (`to_rules_edit_card_view/components/`); two-card review screen displaying the generated TO and rules. Modals: `TrainingOutlineModal` (step-by-step TO viewer with sub-topics editor) and `RulesModal`. Users can edit the course title here before proceeding. `courseStore.partialize` persists the full TO/rules JSON at this phase so data survives page refresh — `useLoadTrainingOutline` skips the blob fetch if already hydrated.

5. **`three-panel`** — `ThreePanelPhase` (`to_rules_edit_card_view/components/`); `ThreePanelLayout` with three resizable panels:
   - **Left** `DocViewerPanel` — rendered HTML preview of the uploaded `.docx`
   - **Middle** `TOPanel` — editable TO JSON via `RecursiveJsonEditor`
   - **Right** `RulesEditorPanel` — card-based structured rules editor with field-type-aware widgets (string, number, bool, string-array, number-pair), overview card, per-rule cards, and tooltips from `utils/rulePackTooltips.ts`. The real implementation lives in `to_rules_edit_card_view/components/RulesEditorPanel.tsx`; `components/panels/RulesEditorPanel.tsx` is a re-export shim. A `RulesWizard` step-flow also lives in `to_rules_edit_card_view/components/rules-wizard/`.
   - **Bottom banner** `GenerateCourseBanner` — triggers `POST /api/jobs` then advances to `pipeline`.

6. **`pipeline`** — `PipelineView` (`course_generation/components/`); live monitoring via SSE (`GET /api/jobs/{jobId}/events`) using `PipelineSSEClient`. Advances to `course-editor` on `COMPLETED`.

7. **`course-editor`** — `CourseEditorView` (`course_generation/components/`); section-based editing UI with sidebar navigation, expandable section panels, and AI operations toolbar. AI operations call `POST /api/jobs/{jobId}/ai`. Artifact download uses `exportCourseToDocx` (client-side `.docx` via the `docx` package).

#### Module subdirectory layout

The module has been refactored into view-specific subdirectories:

| Directory | Contents |
|---|---|
| `to_rules_generation_view/` | Upload-phase components and hooks (`UploadPhase`, `InlineAzureBrowser`, `useGenerateTO`, `useFileUpload`, etc.) |
| `to_rules_edit_card_view/` | TO-summary and three-panel components, `RulesEditorPanel`, `TrainingOutlineModal`, `RulesModal`, `rules-wizard/`, `training-outline/`, `useLoadTrainingOutline` |
| `course_generation/` | Pipeline and course-editor components and hooks (`PipelineView`, `CourseEditorView`, `useJobPipeline`, `useSaveToAzure`, `useAIOperation`) |
| `components/wizard/` | Wizard onboarding components: `WelcomeScreen`, `WizardLayout`, `WizardNavContext`, `CoursePreviewPanel`, and all step components under `steps/` |
| `components/panels/` | Thin re-export shims pointing into the view subdirectories above |
| `hooks/` | Top-level hook re-exports (some hooks have been moved into the view subdirectories) |

### State: Zustand stores

- **`courseStore.ts`** — workflow phase, uploaded files, TO/rules JSON, job IDs, blob paths, course configuration (`audience`, `courseTitle`, `detectedRuleFamily`, `specialInstructions`, `courseTopic`, `difficultyLevel`, `durationHours`), and `wizardData` (`WizardData`). Uses `devtools` + `persist`; `partialize` has three save modes: (a) `to-summary`/`three-panel` phases — persists full TO/rules JSON + metadata; (b) active job — persists `{ activeJobId, phase }`; (c) otherwise — persists wizard/welcome phases with `wizardData` so the wizard survives refresh. `audience` is mandatory — `useGenerateTO` throws if empty.
- **`pipelineStore.ts`** — `PipelineOverview` (stage states, active stage, error), log entries, fatal error flag. No persist. Log entries capped at 400; backend log IDs deduplicated via `_maxSeenBackendLogId`.
- **`editorStore.ts`** — `CourseContent`, per-section `SectionEditState` (Map keyed by section ID), expand/collapse state. No persist. Section tree mutations use recursive `updateSectionTree`.
- **`settingsStore.ts`** (`src/store/`) — persisted UI preferences (theme, animations, autoSave, compactMode). Saved to localStorage under `lactora-settings`.

Dirty-tracking in `courseStore`: `modifiedTOPaths` and `modifiedRulesPaths` are `Set<string>` of dot-joined paths. `updateTOField`/`updateRulesField` add paths; `resetTOField`/`resetRulesField` remove them and restore original values via `deepGet`/`deepSet` from `utils/deepUpdate.ts`.

**Bidirectional TO sync** (`courseStore.ts`): editing `totals.word_count` or `totals.credit_hours` proportionally redistributes values across all `sections[*]`; editing a section value recalculates the `totals` sum. `FINALIZATION` and `EXPORT` stages are auto-completed when `overallStatus` reaches `completed`.

### Course config constants (`utils/courseConfig.ts`)

- `WORDS_PER_CREDIT_HOUR = 9_000` — NAIC CE standard
- `DIFFICULTY_MULTIPLIERS` — `{ basic: 1.0, intermediate: 1.25, advanced: 1.5 }`
- `calcWordCount(durationHours, difficulty)` — derives the target word count used in `POST /api/jobs`

### Pipeline stages

Defined in `config/pipelineConfig.ts`. The six visible stages are:

| Frontend ID | Backend ID | Role |
|---|---|---|
| `A1` | `A1` | Knowledge Extraction |
| `S1` | `S1` | Structure Review (gate) |
| `A2` | `A2` | Content Generation |
| `S2` | `S2` | Quality Assurance (gate) |
| `FINALIZATION` | `A6` | Course Assembly |
| `EXPORT` | `__export__` | Final Export (virtual, FE only) |

`A0`, `SECTION_MAPPER`, and `KC_PLANNER` are internal backend stages folded into adjacent visible stages.

### SSE client (`src/api/pipeline/sse.ts`)

`PipelineSSEClient` connects to `GET /api/jobs/{jobId}/events` via the browser's native `EventSource` (sends `Last-Event-ID` on reconnect). Handles three event types: `message` (stage updates), `done` (pipeline complete), `timeout` (30-minute hard limit). Retries with exponential backoff — base 1.5 s, up to 30 s, max 8 retries.

### API layer

All API modules live under `src/api/`, each focused on a domain:

- `src/api/client.ts` — shared Axios instance (120 s timeout, error-normalisation interceptor). Import this instead of creating ad-hoc instances.
- `src/api/errors.ts` — `ApiClientError` class (preserves HTTP status) and `isExpiredJobError()` helper.
- `src/api/course-generation/api.ts` — `uploadDocument`, `generateTO` (with async-poll fallback)
- `src/api/jobs/api.ts` — `createJob`, `getJobDetail`, `retryJob`, `getArtifacts`
- `src/api/pipeline/sse.ts` — `PipelineSSEClient`
- `src/api/editor/api.ts` — `getCourseContent`, `performAIOperation`, `saveSectionContent`, `downloadCourseArtifact`, `saveToAzure`. Download handles binary blob (local dev → browser download) and JSON `{ url }` (production → signed blob URL). `saveToAzure` calls `POST /jobs/{jobId}/artifacts/save-to-azure`.
- `src/api/storage/api.ts` — `browseStorage(prefix, source)` where `source` is `'uploads'` or `'artifacts'`; also download and delete.
- `src/api/settings/api.ts` — settings persistence

`baseURL` from `src/config/api.ts`: dev resolves to `/api` (Vite proxy → `:8000`); production defaults to the Render backend URL, overridable via `VITE_API_BASE_URL`. The Vite proxy has **two separate rules**: `/api/jobs` uses `timeout: 0` (SSE); all other `/api` routes use 10 minutes. **Do not merge or reorder these rules** — SSE will break.

**`generateTO` async poll pattern:** `POST /documents/generate-to` may return HTTP 202 (`GenerateTOJobAccepted`). When it does, `generateTO` polls `GET /documents/generate-to/jobs/{jobId}` every 1 s for up to 15 minutes. Requires `audience`, `durationHours`, and `difficultyLevel` in the store. On success, `useGenerateTO` seeds `courseTitle` from `to.course_name` and `detectedRuleFamily` from `to.rule_family`.

Hooks use **TanStack Query** (`@tanstack/react-query`): `staleTime: 60_000`, `retry: 2` for queries / `0` for mutations, `refetchOnWindowFocus: false`.

**Page-refresh reconnect** (`useJobPipeline`): on mount, calls `getJobDetail` before opening SSE. A 404 silently resets to upload phase; other errors surface in the log panel.

### Types

Under `src/modules/course-generation/types/`:
- `index.ts` — `WorkflowPhase`, file upload, TO, job, and API response types; re-exports `pipeline.ts`, `editor.ts`, `wizard.ts`.
- `pipeline.ts` — `PipelineStageId`, `PipelineStageState`, `PipelineOverview`, `StageBlocker`, `SSEPipelineEvent`.
- `editor.ts` — `CourseContent`, `CourseSection`, `SectionEditState`, AI operation types.
- `wizard.ts` — `WizardData`, `DEFAULT_WIZARD_DATA`.

### Costing module (`src/modules/costing/`)

`CostingDashboardPage` at `/costing` shows LLM usage and cost analytics. Owns its own Zustand store (`costingStore.ts`, no persist) fetching from `GET /costing/summary` and `GET /costing/documents/{documentId}`. Charts are built with Recharts in `components/charts/`. `DocumentDrilldown` shows per-document stage/model breakdowns. `useDocumentList` hook handles filtering/sorting/pagination (debounced search 250 ms, 7-item pages).

### Storage module (`src/modules/storage/`)

`StorageExplorer` is shared between `AssetLibraryPage` and `DocumentsLibraryPage`. Handles folder navigation, file preview (`FilePreviewDialog`), and deletion. `ArtifactRenderer` renders structured course artifacts in `CourseEditorModal`.

### Shared UI (`src/shared/components/`)

Prefer these over ad-hoc implementations:

- **`Button`** — polymorphic, variants (`primary`/`secondary`/`ghost`/`danger`), sizes (`sm`/`md`/`lg`), loading state, icon slot.
- **`ConfirmLeaveModal`** — portal-based confirmation dialog; Escape key + backdrop dismiss.
- **`Spinner`** — animated loading indicator (Lucide `Loader2`).

### Global hooks (`src/hooks/`)

- **`useModalEscape`** — locks `body` scroll and handles Escape key dismissal for modal overlays.

### Shared utilities (`src/utils/`)

`fileExtension`, `formatBytes`, `formatDate` — thin formatting helpers.

### Path alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`). Always use `@/` for non-relative imports.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. No `tailwind.config.*` — configuration uses v4's `@theme` syntax in CSS. `src/lib/cn.ts` exports a `clsx` + `tailwind-merge` helper.

### TypeScript strictness

`noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly` are enabled. All `import type` usage must use the `import type` syntax (`verbatimModuleSyntax` is on).
