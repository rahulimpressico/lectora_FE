import apiClient from "@/api/client";
import type {
  GenerateLearningObjectivesBody,
  GenerateLearningObjectivesResponse,
  RegenerateLearningObjectivesBody,
  RegenerateLearningObjectivesResponse,
} from "../types";

// ─── Generate ──────────────────────────────────────────────────────────────────

/** AI-generate measurable learning objectives from course metadata. */
export async function generateLearningObjectives(
  body: GenerateLearningObjectivesBody,
): Promise<GenerateLearningObjectivesResponse> {
  const { data } = await apiClient.post<GenerateLearningObjectivesResponse>(
    "/generate-learning-objectives",
    body,
    { timeout: 60_000 },
  );
  return data;
}

// ─── Regenerate ────────────────────────────────────────────────────────────────

/** Revise existing learning objectives based on user feedback. */
export async function regenerateLearningObjectives(
  body: RegenerateLearningObjectivesBody,
): Promise<RegenerateLearningObjectivesResponse> {
  const { data } = await apiClient.post<RegenerateLearningObjectivesResponse>(      
    "/regenerate-learning-objectives",
    body,
    { timeout: 60_000 },
  );
  return data;
}
