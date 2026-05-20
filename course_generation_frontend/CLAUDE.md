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

`src/router/index.tsx` defines two routes under `AppLayout` (sidebar + topbar shell):

- `/` → `DashboardPage` (placeholder)
- `/generate` → `CourseGenerationPage`

### Feature: course-generation

All active UI lives under `src/features/course-generation/`. The feature is self-contained — it exports only from `index.ts`.

**Four-phase workflow** driven by `WorkflowPhase` in Zustand (`courseStore.ts`):

1. **`upload`** — `UploadPhase` component; user drops `.docx` files, each is parsed client-side with `mammoth` into preview HTML, then uploaded to `/api/documents/upload`. After upload, "Generate TO" calls `/api/documents/generate-to` to get the Training Outline (TO) and rule pack JSON.

2. **`three-panel`** — `ThreePanelLayout` with three resizable panels:
   - **Left** `DocViewerPanel` — rendered HTML preview of the uploaded `.docx`
   - **Middle** `TOPanel` — editable tree of the TO JSON via `RecursiveJsonEditor`
   - **Right** `RulesPanel` — editable tree of the rules JSON via `RecursiveJsonEditor`
   - **Bottom banner** `GenerateCourseBanner` — triggers `POST /api/jobs` then advances to `pipeline` phase.

3. **`pipeline`** — `PipelineView` component; live monitoring via SSE (`GET /api/jobs/{jobId}/events`). `PipelineSSEClient` (`hooks/useJobPipeline.ts`) handles the event stream with exponential-backoff reconnection. Stage progress, per-stage logs, and blocker messages are written into `pipelineStore`. Advances to `course-editor` when the job reaches `COMPLETED`.

4. **`course-editor`** — `CourseEditorView` component; section-based editing UI with sidebar navigation, expandable section panels, and an AI operations toolbar. AI operations call `POST /api/jobs/{jobId}/ai` and are tracked in `editorStore`.

### State: Zustand stores

Three stores, all with `devtools` + `persist` middleware. `partialize` returns `{}` — **nothing is persisted**; state resets on every page refresh.

- **`courseStore.ts`** — workflow phase, uploaded files, TO/rules JSON, job ID, blob paths.
- **`pipelineStore.ts`** — stage progress array, SSE log lines, current stage, blocker details.
- **`editorStore.ts`** — course sections, active section, AI operation state.

Dirty-tracking in `courseStore`: `modifiedTOPaths` and `modifiedRulesPaths` are `Set<string>` of dot-joined paths. `updateTOField` / `updateRulesField` add paths; `resetTOField` / `resetRulesField` remove them and restore the original value via `deepGet`/`deepSet` from `utils/deepUpdate.ts`.

### API layer

`src/services/axiosInstance.ts` — single Axios instance with `baseURL: '/api'` and 120 s timeout. The Vite dev server proxies `/api` → `http://localhost:8000`. The proxy has **two separate rules**: `/api/jobs` uses `timeout: 0` (required for SSE streams); all other `/api` routes use 120 s. Both rules must exist — changing the order or merging them breaks SSE.

`src/features/course-generation/api/courseApi.ts` — typed wrappers for all backend endpoints.

**`generateTO` uses an async poll pattern.** `POST /documents/generate-to` may return HTTP 202 (`GenerateTOJobAccepted`) instead of the result immediately. When it does, `courseApi.generateTO` polls `GET /documents/generate-to/jobs/{jobId}` every 1 s for up to 15 minutes until status is `completed` or `failed`. If the POST returns the result directly (`GenerateTOResponse`), polling is skipped. Both shapes are discriminated by checking for the `to` key (`isCompletedResponse`). The function also accepts an `AbortSignal` and a `difficulty` parameter (default `'intermediate'`).

### Dev-mode fallbacks

When the backend is unreachable, `useFileUpload` marks the file with `status: 'error'` and message `'Upload failed — server unreachable'`. `useGenerateTO` detects a `__mock__/` blob path and returns hardcoded `MOCK_TO` / `MOCK_RULES` after a 1.2 s delay, allowing the three-panel phase to be reached without a running backend.

### Path alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`). Always use `@/` for non-relative imports.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. No `tailwind.config.*` file — configuration is done in CSS using v4's native `@theme` syntax. `src/lib/cn.ts` exports a `clsx` + `tailwind-merge` helper — use it for conditional class names.

### TypeScript strictness

`noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly` are enabled. All `import type` usage must use the `import type` syntax (`verbatimModuleSyntax` is on).
