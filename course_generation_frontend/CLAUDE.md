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

All active UI lives under `src/modules/course-generation/`. The module is self-contained — it exports only from `index.ts`.

**Five-phase workflow** driven by `WorkflowPhase` in Zustand (`courseStore.ts`):

1. **`upload`** — `UploadPhase` component; user drops `.docx` files, each is parsed client-side with `mammoth` into preview HTML, then uploaded to `/api/documents/upload`. User also selects course topic, duration (1–5 hrs), difficulty level, and optional custom TO prompt. "Generate TO" calls `/api/documents/generate-to` with these parameters. `InlineAzureBrowser` (within upload) lets users pick existing blobs from Azure storage instead of uploading fresh files.

2. **`to-summary`** — `TOSummaryPhase` component (`components/to-summary/`); a two-card review screen shown after TO generation. Displays a summary of the generated TO (course metadata, section structure, rule family) and rules alongside a preview via `TrainingOutlineModal`. Users can edit the course title here, then proceed to the three-panel editor. The `partialize` function in `courseStore` persists the full TO/rules JSON for `to-summary` and `three-panel` phases so data survives page refresh without re-fetching from blob storage; `useLoadTrainingOutline` skips the blob fetch if data is already hydrated.

3. **`three-panel`** — `ThreePanelLayout` with three resizable panels:
   - **Left** `DocViewerPanel` — rendered HTML preview of the uploaded `.docx`
   - **Middle** `TOPanel` — editable tree of the TO JSON via `RecursiveJsonEditor`
   - **Right** `RulesPanel` / `RulesEditorPanel` — `RulesPanel` wraps `RecursiveJsonEditor` (legacy tree view); `RulesEditorPanel` is a richer structured editor with field-type-aware widgets (string, number, bool, string-array, number-pair), add/remove controls, and tooltips from `utils/rulePackTooltips.ts`
   - **Bottom banner** `GenerateCourseBanner` — triggers `POST /api/jobs` then advances to `pipeline` phase.

4. **`pipeline`** — `PipelineView` component; live monitoring via SSE (`GET /api/jobs/{jobId}/events`) using `PipelineSSEClient` (`src/api/pipeline/sse.ts`). SSE events are merged into `pipelineStore`. Advances to `course-editor` when the job reaches `COMPLETED`.

5. **`course-editor`** — `CourseEditorView` component; section-based editing UI with sidebar navigation, expandable section panels, and an AI operations toolbar. AI operations call `POST /api/jobs/{jobId}/ai`. Artifact download uses `exportCourseToDocx` to produce a `.docx` client-side via the `docx` package.

### State: Zustand stores

- **`courseStore.ts`** (`src/modules/course-generation/store/`) — workflow phase, uploaded files, TO/rules JSON, job ID, blob paths, course configuration (topic, duration, difficulty, word count, custom prompt, `audience`, `specialInstructions`, `courseTitle`, `detectedRuleFamily`). Uses `devtools` + `persist`; `partialize` has three save modes: (a) `to-summary`/`three-panel` phases — persists full TO/rules JSON + metadata so edits survive page refresh; (b) active job — persists `{ activeJobId, phase }` to reconnect to an in-flight pipeline; (c) otherwise — nothing. `audience` is mandatory — `useGenerateTO` throws if it is empty.
- **`pipelineStore.ts`** — `PipelineOverview` (stage states, active stage, error), log entries, fatal error flag. Uses `devtools` only (no persist). Log entries are capped at 400. Backend log IDs are deduplicated via a module-level `_maxSeenBackendLogId` counter — on SSE reconnect, re-delivered log entries are skipped.
- **`editorStore.ts`** — `CourseContent`, per-section `SectionEditState` (Map keyed by section ID), expand/collapse state, preview open flag. Uses `devtools` only (no persist). Section tree mutations use recursive `updateSectionTree`.
- **`settingsStore.ts`** (`src/store/`) — persisted UI preferences (theme, animations, autoSave, compactMode). Saved to localStorage under `lactora-settings`. DOM side-effects from theme changes are applied in `AppLayout`, not in the store.

Dirty-tracking in `courseStore`: `modifiedTOPaths` and `modifiedRulesPaths` are `Set<string>` of dot-joined paths. `updateTOField` / `updateRulesField` add paths; `resetTOField` / `resetRulesField` remove them and restore the original value via `deepGet`/`deepSet` from `utils/deepUpdate.ts`.

**Bidirectional TO sync** (`courseStore.ts`): editing `totals.word_count` or `totals.credit_hours` proportionally redistributes values across all `sections[*]`; editing a section value recalculates the `totals` sum. `FINALIZATION` and `EXPORT` stages are auto-completed by the pipeline store when `overallStatus` reaches `completed`.

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

`PipelineSSEClient` is a class-based SSE client. It connects to `GET /api/jobs/{jobId}/events` using the browser's native `EventSource` (which automatically sends `Last-Event-ID` on reconnect). It handles three server-sent event types: `message` (stage updates), `done` (pipeline complete), and `timeout` (30-minute hard limit). On connection error it retries with exponential backoff — base 1.5 s, up to 30 s, max 8 retries.

### API layer

All API modules live under `src/api/`, each focused on a domain:

- `src/api/client.ts` — shared Axios instance (120 s timeout, error-normalisation interceptor). Import this instead of creating ad-hoc instances.
- `src/api/errors.ts` — `ApiClientError` class (preserves HTTP status) and `isExpiredJobError()` helper (returns true for 404 or expired-session responses). Use these for error classification throughout the app.
- `src/api/course-generation/api.ts` — `uploadDocument`, `generateTO` (with async-poll fallback)
- `src/api/jobs/api.ts` — `createJob`, `getJobDetail`, `retryJob`, `getArtifacts`
- `src/api/pipeline/sse.ts` — `PipelineSSEClient`
- `src/api/editor/api.ts` — `getCourseContent`, `performAIOperation`, `saveSectionContent`, `downloadCourseArtifact`, `saveToAzure`. The download call handles two shapes: binary blob (local dev) triggers a browser download; JSON `{ url }` (production) opens a signed blob URL. `saveToAzure` calls `POST /jobs/{jobId}/artifacts/save-to-azure` and is wrapped by `useSaveToAzure` (TanStack Query mutation).
- `src/api/storage/api.ts` — `browseStorage(prefix, source)` where `source` is `'uploads'` or `'artifacts'`; also exposes download and delete calls.
- `src/api/settings/api.ts` — settings persistence

`baseURL` comes from `src/config/api.ts` (`API_BASE_URL`): in dev it resolves to `/api` (Vite proxy → `http://localhost:8000`); in production it defaults to the Render backend URL, overridable via `VITE_API_BASE_URL`. The Vite proxy has **two separate rules**: `/api/jobs` uses `timeout: 0` (required for SSE streams); all other `/api` routes use **10 minutes**. **Do not merge or reorder these rules** — SSE will break.

**`generateTO` uses an async poll pattern.** `POST /documents/generate-to` may return HTTP 202 (`GenerateTOJobAccepted`) instead of the result immediately. When it does, `generateTO` polls `GET /documents/generate-to/jobs/{jobId}` every 1 s for up to 15 minutes. Requires `audience`, `durationHours`, and `difficultyLevel` to be set in the store (unless the user uploaded a custom TO document). On success, `useGenerateTO` also seeds `courseTitle` from `to.course_name` and `detectedRuleFamily` from `to.rule_family`. `GenerateCoursePayload` (`POST /jobs`) also carries `audience` (mandatory) and `specialInstructions` (optional).

Hooks use **TanStack Query** (`@tanstack/react-query`) for mutations — e.g. `useGenerateTO` wraps `generateTO` in `useMutation`. Query client config (`src/lib/queryClient.ts`): `staleTime: 60_000`, `retry: 2` for queries / `0` for mutations, `refetchOnWindowFocus: false`.

**Page-refresh reconnect** (`useJobPipeline`): on mount, the hook calls `getJobDetail` to verify the job still exists before opening SSE. A 404 response (server restarted / stale session) silently calls `reset()` and returns the user to the upload phase — no error is shown. Any other error surfaces a recoverable message in the log panel.

### Costing module (`src/modules/costing/`)

`CostingDashboardPage` at `/costing` shows LLM usage and cost analytics. It owns its own Zustand store (`costingStore.ts`, no persist) that fetches from two backend endpoints: `GET /costing/summary` (`CostingSummary`) and `GET /costing/documents/{documentId}` (`DocumentCost`). Charts are built with Recharts and live in `components/charts/`. `DocumentDrilldown` renders per-document stage and model breakdowns when a document row is selected. All cost and token data comes from `llm_traces.jsonl` (local `pipeline/logs/` and synced Azure Blob artifacts). No mock fallback — errors and empty states surface directly.

`useDocumentList` hook (`hooks/useDocumentList.ts`) handles document-list filtering/sorting/pagination: debounced search (250 ms), status filter, sort by name/lastUpdated/cost with toggle direction, and paginated output (max 7 items with ellipsis).

### Storage module (`src/modules/storage/`)

`StorageExplorer` is shared between `AssetLibraryPage` and `DocumentsLibraryPage`. It handles folder navigation, file preview (`FilePreviewDialog`), and deletion (`StorageDeleteConfirmDialog`). `ArtifactRenderer` renders structured course artifacts in `CourseEditorModal`, which allows browsing and inspecting stored job outputs without leaving the storage view.

### Shared UI (`src/shared/components/`)

Three reusable primitives used across modules — prefer these over inline or ad-hoc implementations:

- **`Button`** — polymorphic button with variants (`primary`/`secondary`/`ghost`/`danger`), sizes (`sm`/`md`/`lg`), loading state, and icon slot.
- **`ConfirmLeaveModal`** — portal-based confirmation dialog for destructive navigation; handles Escape key and backdrop dismiss.
- **`Spinner`** — animated loading indicator (Lucide `Loader2`).

### Global hooks (`src/hooks/`)

- **`useModalEscape`** — locks `body` scroll and handles Escape key dismissal for modal overlays. Used by `ConfirmLeaveModal` and other dialogs.

### Shared utilities (`src/utils/`)

`fileExtension`, `formatBytes`, and `formatDate` — thin formatting helpers used across modules.

### Types

Split across three files under `src/modules/course-generation/types/`:
- `index.ts` — workflow, file upload, TO, job, and API response types.
- `pipeline.ts` — `PipelineStageId`, `PipelineStageState`, `PipelineOverview`, `StageBlocker`, `SSEPipelineEvent`.
- `editor.ts` — `CourseContent`, `CourseSection`, `SectionEditState`, AI operation types.

### Path alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`). Always use `@/` for non-relative imports.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. No `tailwind.config.*` file — configuration is done in CSS using v4's native `@theme` syntax. `src/lib/cn.ts` exports a `clsx` + `tailwind-merge` helper — use it for conditional class names.

### TypeScript strictness

`noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly` are enabled. All `import type` usage must use the `import type` syntax (`verbatimModuleSyntax` is on).
