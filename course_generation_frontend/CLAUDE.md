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

All active UI lives under `src/modules/course-generation/`. The module is self-contained — it exports from `index.ts` and its entry point is `pages/CourseGenerationPage.tsx`.

#### Internal module structure

```
src/modules/course-generation/
├── features/
│   ├── onboarding-flow/ ← welcome screen + 8-step wizard, one dir per step (step-1-course-basics … step-8-outline-review). Each step and the onboarding-flow root have components/, utils/, types/, constants/ subdirs; cross-step code (WizardLayout, CoursePreviewPanel, AIGenerationLoader, WizardNavContext, shared animation variants) lives in the root ones
│   ├── upload/        ← file drop, Azure browser, TO generation
│   ├── review/        ← three-panel editor + rules editor
│   └── pipeline/      ← SSE pipeline monitor + course editor
├── pages/             ← CourseGenerationPage (phase router)
├── shared/components/ ← RecursiveJsonEditor, InlineEditField
├── store/             ← editorStore, pipelineStore, useBrowserHistory, courseEditorDraft (courseStore itself now lives in features/onboarding-flow/store/ — the single state store for the whole module, onboarding and beyond)
├── types/             ← index, pipeline, editor, wizard
├── utils/
└── config/
```

Each feature owns its components and hooks internally — import from the feature path directly.

#### Workflow phases

`WorkflowPhase` (in `types/index.ts`) drives `CourseGenerationPage`. Two entry paths converge at `three-panel`:

**Path A — Wizard (new users)**

| Phase | Component | Description |
|---|---|---|
| `welcome` | `WelcomeScreen` | Full-viewport landing; user chooses wizard or direct upload |
| `wizard-basics` … `wizard-outline-review` | `WizardLayout` + step components | 8 animated steps collecting course configuration into `courseStore.wizardData` (`WizardData`). Steps in order: `CourseBasicsStep`, `RequiredTopicsStep`, `AudienceStep`, `SourceMaterialStep`, `LearningObjectivesStep`, `CourseDirectionStep`, `OutlinePreferenceStep`, `OutlineReviewStep`. `OutlineReviewStep` triggers TO generation; on success advances to `three-panel`. `WizardNavContext` lets each step override Next/Back label and behavior via `setConfig()`. |

**Path B — Direct upload**

| Phase | Component | Description |
|---|---|---|
| `upload` | `UploadPhase` (`features/upload/`) | Drop `.docx` files (parsed client-side with `mammoth`), or pick from Azure via `InlineAzureBrowser`. "Generate TO" calls `POST /documents/generate-to`, which runs **A0 → A1 → S1 (`full`)** up to 3 cycles on the backend. Response `to`/`rules` come from **A0** output. If S1 still blocks after all retries, `S1BlockedPanel` shows quality scores, blocker issues, and recommendations. |

**Shared phases**

| Phase | Component | Description |
|---|---|---|
| `three-panel` | `ThreePanelPhase` (`features/review/`) | Three resizable panels: `DocViewerPanel` (`.docx` HTML preview), `TOPanel` (TO JSON via `RecursiveJsonEditor`), `RulesEditorPanel` (card-based rules editor). `GenerateCourseBanner` submits `POST /api/jobs` and advances to `pipeline`. |
| `pipeline` | `PipelineView` (`features/pipeline/`) | Live SSE monitoring (`GET /api/jobs/{jobId}/events`). Advances to `course-editor` on `COMPLETED`. |
| `course-editor` | `CourseEditorView` (`features/pipeline/`) | Section-based editing with drag-and-drop reorder (`@hello-pangea/dnd`), AI toolbar (`POST /api/jobs/{jobId}/ai`), and inline title editing. Session managed by `useCourseEditorSession`; DnD by `useCourseEditorDragEnd`. Export syncs the full tree to the backend first (`syncCourseContent`), then downloads the DOCX. |

**Course editor session** (`features/pipeline/hooks/useCourseEditorSession`): manages the full lifecycle of the course editor — loads content from an IndexedDB draft first (via `store/courseEditorDraft.ts`, key `lectora:course-draft:{jobId}`, backed by `idb-keyval`), falls back to the API if no draft exists, debounce-saves to IndexedDB on every edit (400 ms), and calls `syncCourseContent` before Save to Azure or Download to push the full tree to the backend. Handles expired-job 404s via an `onExpiredJob` callback. `useCourseEditorDragEnd` handles `@hello-pangea/dnd` `DropResult` for section reorder, same-section child reorder, and cross-section child moves (strips the index suffix from `draggableId` to recover real IDs).

**Browser history** (`store/useBrowserHistory.ts`): syncs the phase-based navigation with the browser History API so Back/Forward buttons work across all phases. On phase change it calls `pushState`; on `popstate` it calls `setPhase`, guarding against restoring `pipeline`/`course-editor` without an active job ID (falls back to `three-panel`).

#### Rules editor

`RulesEditorPanel` (in `features/review/components/`) is a card-based structured editor with an overview card, per-rule `RuleCard` components, and typed field widgets in `rules-editor/editors/` (`StringEditor`, `NumberEditor`, `BooleanEditor`, `StringArrayEditor`, `NumberPairEditor`). A `rules-wizard/` step-flow (`OverviewRuleStep`, `SectionRuleStep`) lives alongside it. Field tooltips come from `utils/rulePackTooltips.ts`.

### State: Zustand stores

- **`features/onboarding-flow/store/` (`onboarding.store.ts` + `onboarding.types.ts`, re-exported via `index.ts` as `useCourseStore`)** — the single centralized store for the entire module: workflow phase, uploaded files, TO/rules JSON, job IDs, blob paths, course configuration (`audience`, `courseTitle`, `detectedRuleFamily`, `specialInstructions`, `courseTopic`, `difficultyLevel`, `durationHours`, `courseTypeHint`, `courseBasicRecord`), and `wizardData` (`WizardData`). Every onboarding step and every post-onboarding phase (upload, three-panel, pipeline, editor) reads/writes this one store — there is no separate per-feature or per-step store. Uses `devtools` + `persist`; `partialize` has three modes: (a) `three-panel` — persists full TO/rules JSON + metadata; (b) active job — persists `{ activeJobId, phase }`; (c) otherwise — persists wizard/welcome state with `wizardData` so the wizard survives refresh. `audience` is mandatory — `useGenerateTO` throws if empty.
- **`pipelineStore.ts`** — `PipelineOverview` (stage states, active stage, error), log entries, fatal error flag. No persist. Log entries capped at 400; backend log IDs deduplicated via `_maxSeenBackendLogId`.
- **`editorStore.ts`** — `CourseContent`, per-section `SectionEditState` (Map keyed by section ID), expand/collapse state. No persist. Uses Zustand `immer` middleware (with `enableMapSet`). Section mutations: `addSection`/`addSubtopic` (return new ID), `moveSectionByIndex`, `moveChildByIndex`, `moveChildBetweenSections`, `moveSubtopicToSection`. `getCourseSnapshot()` merges all in-progress textarea edits into a `CourseContent` value for sync. `deduplicateSections` handles backend duplicate section IDs (keeps the copy with the most children).
- **`settingsStore.ts`** (`src/store/`) — persisted UI preferences (theme, animations, autoSave, compactMode). Saved to localStorage under `lactora-settings`.

Dirty-tracking in `courseStore`: `modifiedTOPaths` and `modifiedRulesPaths` are `Set<string>` of dot-joined paths. `updateTOField`/`updateRulesField` add paths; `resetTOField`/`resetRulesField` remove them and restore original values via `deepGet`/`deepSet` (`utils/deepUpdate.ts`).

**Bidirectional TO sync:** editing `totals.word_count` or `totals.credit_hours` proportionally redistributes values across all `sections[*]`; editing a section value recalculates the `totals` sum. `FINALIZATION` and `EXPORT` stages are auto-completed when `overallStatus` reaches `completed`.

### Course config constants (`utils/courseConfig.ts`)

- `WORDS_PER_CREDIT_HOUR = 9_000` — NAIC CE standard
- `DIFFICULTY_MULTIPLIERS` — `{ basic: 1.0, intermediate: 1.25, advanced: 1.5 }`
- `calcWordCount(durationHours, difficulty)` — derives the target word count used in `POST /api/jobs`

### Pipeline stages

Defined in `config/pipelineConfig.ts`. The six visible stages:

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

`PipelineSSEClient` connects to `GET /api/jobs/{jobId}/events` via native `EventSource` (sends `Last-Event-ID` on reconnect). Handles `message` (stage updates), `done` (complete), `timeout` (30-min hard limit). Exponential backoff retry — base 1.5 s, max 30 s, 8 retries.

### API layer

All modules under `src/api/`:

- `client.ts` — shared Axios instance (120 s timeout, error-normalisation interceptor). Always import this; never create ad-hoc instances.
- `errors.ts` — `ApiClientError` (preserves HTTP status), `isExpiredJobError()`.
- `course-generation/api.ts` — `uploadDocument`, `generateTO` (backend: A0 → A1 → S1 per cycle; async-poll: 202 → `GET /documents/generate-to/jobs/{jobId}` every 1 s up to 15 min), `saveTrainingOutline` (`POST /documents/save-to`). `useGenerateTO` forwards populated `wizardData` to `POST /documents/generate-to` for A0 prompt construction.
- `jobs/api.ts` — `createJob`, `getJobDetail`, `retryJob`, `getArtifacts`. `GenerateCoursePayload` (sent by `GenerateCourseBanner`) carries: an optional `courseConfig` field forwarding `wizardData` for A2 dynamic prompt construction; an optional `sourceFileSpecs` array (`SourceFileSpec[]`) with per-file blob path, extract hint, and `ImportanceLevel` so A2 can build a chunk index and apply per-file guidance. Both `generateTO` and `createJob` receive wizard data so it influences the full pipeline (A0 → A2).
- `pipeline/sse.ts` — `PipelineSSEClient`.
- `editor/api.ts` — `getCourseContent`, `performAIOperation`, `saveSectionContent`, `downloadCourseArtifact`, `saveToAzure` (`POST /jobs/{jobId}/artifacts/save-to-azure`), `syncCourseContent` (bulk-sync full course tree before download/save), `deleteSectionAPI` (`DELETE /jobs/{jobId}/sections/{sectionId}`), `persistSectionOrder` (`PATCH /jobs/{jobId}/sections/reorder` — sends depth-first flat ID list via `buildFlatSectionOrder`), `updateCourseTitleAPI` (`PATCH /jobs/{jobId}/course`). Download handles binary blob (local → browser download) and JSON `{ url }` (prod → signed blob URL).
- `storage/api.ts` — `browseStorage(prefix, source)` (`source`: `'uploads'` | `'artifacts'`), download, delete.
- `settings/api.ts` — settings persistence.

`baseURL` from `src/config/api.ts`: dev → `/api` (Vite proxy → `:8000`); prod → Render backend URL, overridable via `VITE_API_BASE_URL`. The Vite proxy has **two separate rules**: `/api/jobs` uses `timeout: 0` (SSE); all other `/api` routes use 10 minutes. **Do not merge or reorder these rules** — SSE will break.

Hooks use **TanStack Query**: `staleTime: 60_000`, `retry: 2` for queries / `0` for mutations, `refetchOnWindowFocus: false` (`src/lib/queryClient.ts`).

**Page-refresh reconnect** (`useJobPipeline` in `features/pipeline/hooks/`): on mount calls `getJobDetail` before opening SSE. 404 → silently resets to `three-panel`; other errors surface in the log panel.

### Types (`src/modules/course-generation/types/`)

- `index.ts` — `WorkflowPhase`, file upload (`UploadedFile` with `sourceRole`, `importance`, `documentId`, `ingestionStatus` fields), `SourceAnalysis`, `SourceFileSpec`, `SourceRole`, `ImportanceLevel`, `IngestionStatus`, TO, job, `GenerateCoursePayload` (with `courseConfig` and `sourceFileSpecs`), API response types; re-exports `pipeline.ts`, `editor.ts`, `wizard.ts`.
- `pipeline.ts` — `PipelineStageId`, `PipelineStageState`, `PipelineOverview`, `StageBlocker`, `SSEPipelineEvent`, and S1 rich validation types: `S1ValidationIssue`, `S1Recommendation`, `S1MissingTopic`, `S1DependencyIssue`, `S1ValidationResult` (scores + issues + recommendations, returned in poll responses when S1 blocks).
- `editor.ts` — `CourseContent`, `CourseSection`, `SectionEditState`, AI operation types.
- `wizard.ts` — `WizardData`, `DEFAULT_WIZARD_DATA`.

### Costing module (`src/modules/costing/`)

`CostingDashboardPage` at `/costing`. Owns `costingStore.ts` (no persist) fetching `GET /costing/summary` and `GET /costing/documents/{documentId}`. Charts via Recharts. `useDocumentList` hook: debounced search (250 ms), status filter, sort, 7-item pagination.

### Storage module (`src/modules/storage/`)

`StorageExplorer` shared by `AssetLibraryPage` and `DocumentsLibraryPage`. `ArtifactRenderer` inside `CourseEditorModal` renders structured job artifacts.

### Shared UI (`src/shared/components/`)

App-wide primitives — prefer these over ad-hoc implementations:

- **`Button`** — variants (`primary`/`secondary`/`ghost`/`danger`), sizes (`sm`/`md`/`lg`), loading state, icon slot.
- **`ConfirmLeaveModal`** — portal-based destructive-navigation dialog; Escape + backdrop dismiss.
- **`Spinner`** — Lucide `Loader2` animated indicator.

`src/hooks/useModalEscape` — locks `body` scroll and handles Escape dismissal for modal overlays.

### Path alias & Styling

`@/` maps to `src/` (both `vite.config.ts` and `tsconfig.app.json`). Always use `@/` for non-relative imports.

Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.*`; use `@theme` syntax in CSS. `src/lib/cn.ts` exports a `clsx` + `tailwind-merge` helper for conditional class names.

### TypeScript strictness

`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `verbatimModuleSyntax` are all enabled. Use `import type` syntax for all type-only imports.
