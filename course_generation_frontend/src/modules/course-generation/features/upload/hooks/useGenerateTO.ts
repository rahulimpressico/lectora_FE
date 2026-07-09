import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCourseStore } from "../../onboarding-flow/store";
import { normalizeTrainingOutlineForPanel } from "../../review/utils/trainingOutlinePanel";
import {
  cancelGenerateTO,
  generateTimedOutline,
} from "../../onboarding-flow/step-7-outline-preference/api";
import { calcWordCount } from "../../../utils/courseConfig";
import type { WorkflowPhase } from "../../../types";

/**
 * Per-call overrides for useGenerateTO.mutate().
 *
 * Case 2 (DOCX/PDF outline upload, step-7): pass { outlineBlobPaths } to
 * generate from the uploaded outline document instead of the source materials.
 */
export type GenerateTOOverrides = {
  outlineBlobPaths?: string[];
};

/**
 * Drives Training Outline generation against the real backend.
 *
 * There is exactly one backend endpoint — `POST /documents/generate-to`
 * (see app/api/v1/endpoints/onboarding/timed_outline.py) — a synchronous
 * call with no job/poll cycle, no separate regenerate/upload/extract
 * endpoint, and no `rules` in the response. A `.json` Timed Outline among
 * `blobPaths` short-circuits AI generation server-side, but the request
 * and response shape are identical either way, so "generate", "regenerate",
 * and "extract from an uploaded outline doc" are all the same call here.
 */
export function useGenerateTO(successPhase: WorkflowPhase = "three-panel") {
  const { setPhase, setIsGeneratingTO, setTOData } = useCourseStore();

  const successPhaseRef = useRef(successPhase);
  successPhaseRef.current = successPhase;
  const abortRef = useRef<AbortController | null>(null);

  const startMutation = useMutation({
    retry: false,
    mutationFn: async (overrides: GenerateTOOverrides = {}) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGeneratingTO(true);

      const {
        rawDocuments,
        toDocument,
        durationHours,
        difficultyLevel,
        calculatedWordCount,
        audience,
        courseTitle,
        courseTopic,
        courseTypeHint,
        detectedRuleFamily,
        wizardData,
        customToPrompt,
      } = useCourseStore.getState();

      const sourceBlobPaths = rawDocuments
        .filter(
          (f) =>
            f.status === "success" && f.uploadRole !== "outline" && f.blobPath,
        )
        .map((f) => f.blobPath as string);

      const bypassBlobPaths =
        overrides.outlineBlobPaths ??
        (toDocument?.status === "success" && toDocument.blobPath
          ? [toDocument.blobPath]
          : undefined);

      const blobPaths = bypassBlobPaths ?? sourceBlobPaths;
      if (blobPaths.length === 0) {
        throw new Error("No uploaded documents found.");
      }

      if (!audience.trim()) {
        throw new Error(
          "Please provide the target audience before generating the Training Outline.",
        );
      }
      if (!courseTitle.trim()) {
        throw new Error(
          "Please provide a course title before generating the Training Outline.",
        );
      }
      const courseDescription =
        wizardData.description.trim() || customToPrompt.trim();
      if (!courseDescription) {
        throw new Error(
          "Please provide a course description before generating the Training Outline.",
        );
      }
      if (!durationHours || !difficultyLevel) {
        throw new Error(
          "Please select both a course duration and difficulty level before generating the Training Outline.",
        );
      }
      if (wizardData.objectives.length === 0) {
        throw new Error(
          "Please add at least one learning objective before generating the Training Outline.",
        );
      }
      if (wizardData.requiredTopics.length === 0) {
        throw new Error(
          "Please add at least one required topic before generating the Training Outline.",
        );
      }

      const preferredChapters = wizardData.preferredChapters
        ? Number(wizardData.preferredChapters)
        : undefined;
      const validPreferredChapters =
        preferredChapters != null && !Number.isNaN(preferredChapters)
          ? preferredChapters
          : undefined;

      return generateTimedOutline(
        {
          blobPaths,
          courseTitle: courseTitle.trim(),
          courseDescription,
          durationHours,
          calculatedWordCount:
            calculatedWordCount ??
            calcWordCount(durationHours, difficultyLevel) ??
            0,
          audience: audience.trim(),
          learningObjectives: wizardData.objectives,
          requiredTopics: wizardData.requiredTopics,
          courseTopic: courseTopic || undefined,
          difficultyLevel,
          courseTypeHint: courseTypeHint || undefined,
          ruleFamily: detectedRuleFamily || undefined,
          experienceLevel: wizardData.experienceLevel || undefined,
          learnerOutcomes: wizardData.learnerOutcomes || undefined,
          tone: wizardData.tone || undefined,
          depth: wizardData.depth,
          emphasis: wizardData.emphasis || undefined,
          avoid: wizardData.avoid || undefined,
          includeCaseStudies: wizardData.includeCaseStudies,
          includeExamples: wizardData.includeExamples,
          includeKnowledgeChecks: wizardData.includeKnowledgeChecks,
          preferredChapters: validPreferredChapters,
          lessonStyle: wizardData.lessonStyle,
        },
        controller.signal,
      );
    },
    onSuccess: (result) => {
      const { courseTypeHint } = useCourseStore.getState();
      const normalizedTo = normalizeTrainingOutlineForPanel(
        result.timedOutline,
        courseTypeHint,
      );
      setTOData(normalizedTo, normalizedTo);
      setPhase(successPhaseRef.current);
    },
    onSettled: () => {
      setIsGeneratingTO(false);
      abortRef.current = null;
    },
  });

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGeneratingTO(false);
    startMutation.reset();
    void cancelGenerateTO().catch(() => {});
  }

  return {
    isPending: startMutation.isPending,
    isError: startMutation.isError,
    error: startMutation.error instanceof Error ? startMutation.error : null,
    mutate: (overrides?: GenerateTOOverrides) =>
      startMutation.mutate(overrides ?? {}),
    cancel,
    reset: cancel,
    statusMessage: startMutation.isPending
      ? "Generating your Training Outline…"
      : null,
    stageLogs: [],
  };
}
