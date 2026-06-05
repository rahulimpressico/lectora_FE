import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { generateTO } from '@/api/course-generation/api'
import { useCourseStore } from '../store/courseStore'

function buildDynamicPrompt({
  audience,
  difficultyLevel,
  durationHours,
  targetWordCount,
  courseId,
  courseTitle,
  courseType,
  domain,
  additionalContext,
  finalOutputFormat,
}: {
  audience: string
  difficultyLevel: string
  durationHours: number
  targetWordCount: number
  courseId: string
  courseTitle: string
  courseType: string
  domain: string
  additionalContext: string
  finalOutputFormat: 'wrapped' | 'raw'
}) {
  const lines = [
    "Today’s task is:",
    "Consume PDF and DOCX files, then detect the Table of Contents (TOC) or Index pages and extract all topics/headings from them.",
    "The solution should be dynamic, meaning it should work for different document formats and layouts automatically.",
    "After extracting the topics, send them into a prompt and generate a structured TO_outline.",
    "",
    "Example workflow:",
    "Upload/consume PDF or DOCX",
    "Detect TOC / Index section",
    "Extract all headings/topics",
    "Clean and structure the extracted data",
    "Pass extracted topics into an LLM prompt",
    "Generate a hierarchical TO_outline",
    "",
    `These are the source files. I need to generate a ${difficultyLevel}-level course for ${audience || 'the requested audience'}. The course duration should be ${durationHours} hours.`,
    "",
    "This is the formula for total word count:",
    "* Across all difficulty levels, ~27,000 words = 3 CE credits (S1 / rule-pack credit check)",
    "* If using only outline_metrics + difficulty reverse scaling:",
    "  * Basic: 27,000 words",
    "  * Intermediate: 21,600 words",
    "  * Advanced: 18,000 words",
    "",
    "Create a Table of Contents (TO) that includes all important topics and subtopics from both files. Adjust the word count distribution and credit hours appropriately based on the total course structure.",
    "",
    "Important:",
    "Any title or section you extract from the files must remain exactly the same as written in the source files. Do not rename, paraphrase, or modify section names.",
    "",
    "Dynamic course configuration:",
    `- course_id: ${courseId || '533'}`,
    `- course_title: ${courseTitle || 'Course ka naam'}`,
    `- audience: ${audience || 'trained insurance agents'}`,
    `- course_level: ${difficultyLevel}`,
    `- duration_hours: ${durationHours}`,
    `- target_word_count: ${targetWordCount}`,
    `- course_type: ${courseType || 'insurance'}`,
    `- domain: ${domain || 'flood insurance'}`,
    `- final_output_format: ${finalOutputFormat}`,
  ]

  if (additionalContext.trim()) {
    lines.push(`- additional_context: ${additionalContext.trim()}`)
  }

  lines.push(
    "",
    "Main TO object — llm_to_outline",
    "{",
    '  "course_title": "Course ka naam",',
    `  "course_id": "${courseId || '533'}",`,
    '  "description": "2–4 sentences explaining who the course is for, what they will learn, and why it is important.",',
    '  "learning_objectives": [',
    '    "Explain ...",',
    '    "Identify ..."',
    "  ],",
    '  "sections": [ /* lessons */ ],',
    '  "totals": {',
    `    "word_count": ${targetWordCount},`,
    `    "minutes": ${durationHours * 60},`,
    `    "credit_hours": ${durationHours}`,
    "  }",
    "}",
    "",
    "Section object:",
    "{",
    '  "title": "1. Introduction",',
    '  "content": "Students will learn to ...",',
    '  "subtopics": [',
    '    {',
    '      "title": "2.1 Community",',
    '      "content": "",',
    '      "word_count": "72",',
    '      "minutes": "0.4",',
    '      "credit_hour": ".008",',
    '      "interactive_elements": []',
    "    }",
    "  ],",
    '  "word_count": 2200,',
    '  "minutes": "12.22",',
    '  "credit_hours": 0.244,',
    '  "interactive_elements": []',
    "}",
    "",
    "Output valid JSON only."
  )

  return lines.join('\n')
}

export function useGenerateTO() {
  const { setTOData, setRulesData, setPhase, setGeneratedToBlobPath, setCourseTitle, setDetectedRuleFamily } = useCourseStore()
  const abortRef = useRef<AbortController | null>(null)

  return useMutation({
    retry: false,
    mutationFn: async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const {
        rawDocuments,
        customToPrompt,
        courseTypeHint,
        toDocument,
        durationHours,
        difficultyLevel,
        calculatedWordCount,
        audience,
        courseId,
        courseTitle,
        courseType,
        domain,
        additionalContext,
        finalOutputFormat,
      } = useCourseStore.getState()
      // Collect all successfully uploaded file blob paths (preserving order).
      const blobPaths = rawDocuments
        .filter((f) => f.status === 'success' && f.blobPath)
        .map((f) => f.blobPath as string)

      if (blobPaths.length === 0) throw new Error('No uploaded documents found.')

      if (!audience.trim()) {
        throw new Error('Please provide the target audience before generating the Training Outline.')
      }

      // Validate that the user has selected both duration and difficulty
      // (required for the new dynamic TO generation flow).
      if (!toDocument && (!durationHours || !difficultyLevel)) {
        throw new Error('Please select both a course duration and difficulty level before generating the Training Outline.')
      }

      const toDocBlobPath =
        toDocument?.status === 'success' && toDocument.blobPath
          ? toDocument.blobPath
          : undefined

      const effectiveDurationHours = durationHours ?? 3
      const difficulty = (difficultyLevel ?? 'intermediate').toLowerCase()
      const targetWordCount = calculatedWordCount ?? 0

      const dynamicPrompt = buildDynamicPrompt({
        audience,
        difficultyLevel: difficulty,
        durationHours: effectiveDurationHours,
        targetWordCount,
        courseId,
        courseTitle,
        courseType,
        domain,
        additionalContext,
        finalOutputFormat,
      })

      return generateTO(
        blobPaths,
        controller.signal,
        difficulty,
        customToPrompt.trim()
          ? `${dynamicPrompt}\n\nAdditional custom instructions:\n${customToPrompt.trim()}`
          : dynamicPrompt,
        courseTypeHint.trim() || undefined,
        toDocBlobPath,
        effectiveDurationHours,
        difficulty,
        calculatedWordCount,
        audience.trim() || undefined,
      )
    },
    onSuccess: ({ to, rules, toBlobPath }) => {
      setTOData(to, to)
      setRulesData(rules, rules)
      setGeneratedToBlobPath(toBlobPath ?? null)
      if (to.course_name && typeof to.course_name === 'string') {
        setCourseTitle(to.course_name)
      }
      if (to.rule_family && typeof to.rule_family === 'string') {
        setDetectedRuleFamily(to.rule_family)
      }
      setPhase('three-panel')
    },
  })
}
