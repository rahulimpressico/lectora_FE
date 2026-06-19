/**
 * Display labels for rule family identifiers returned by the backend.
 * Keys are the snake_case family IDs used in rule pack JSON.
 */
export const RULE_FAMILY_LABELS: Record<string, string> = {
  insurance_ce: 'Insurance Continuing Education',
  iarce: 'IARCE',
  firm_element: 'Firm Element',
}

/**
 * Human-readable tooltips for rule pack fields shown in the Rules panel.
 * Keys match the snake_case field names used in the JSON returned by the backend.
 */
export const RULE_PACK_TOOLTIPS: Record<string, string> = {
  // ── Top-level metadata ──────────────────────────────────────────────────────
  id:                         'Unique identifier for this rule pack version (e.g. rp-insurance-ce-v3.4).',
  family:                     'Human-readable name of the course family (e.g. "Insurance CE").',
  version:                    'Semantic version of this rule pack.',
  full_name:                  'Full formal name of the course type.',
  governed_by:                'Regulatory body or standard that governs this course type.',
  audience:                   'Who takes this course — used to calibrate vocabulary, examples, and LO phrasing.',
  default_difficulty:         'Difficulty level applied when none is specified by the user.',
  words_per_credit_hour:      'Target word count per CE credit hour. Insurance CE uses 9 000; Firm Element uses 6 000.',
  difficulty_multiplier:      'Scaling factor applied to word count for the selected difficulty (Basic 1.0×, Intermediate 1.25×, Advanced 1.5×).',

  // ── Assessment rules ────────────────────────────────────────────────────────
  final_exam_min_questions:   'Minimum number of questions required on the final exam.',
  answer_options_count:       'Standard number of answer choices per question (typically 4).',
  allow_true_false:           'Whether True/False questions are permitted on the final exam.',
  allow_all_of_the_above:     'Whether "All of the above" is allowed as an answer option.',
  forbidden_question_types:   'List of prohibited question formats (e.g. "true_false", "roman_numeral_questions").',
  require_rationale:          'Whether the correct answer must include an explanation.',
  require_distractor_rationales: 'Whether incorrect answers must be explained (why they are wrong).',
  objective_coverage_required: 'Whether every stated learning objective must be tested in the exam.',
  require_exam_cross_reference: 'Whether exam questions must cite the section or page number from source material.',

  // ── Style constraints ───────────────────────────────────────────────────────
  reading_level:              'Maximum reading grade level for generated content (e.g. "Max 9th grade").',
  voice:                      'Grammatical perspective for addressing learners — "second_person" (you/we) or "third_person" (the agent/the producer).',
  tone:                       'Overall writing tone — e.g. "conversational_professional_beginner_friendly" or "formal_direct_clean".',
  paragraph_length:           'Target paragraph length: "short" (1–3 sentences), "medium" (3–5), or "long" (5–7).',
  max_sentences_per_paragraph: 'Hard limit on sentences per paragraph (typically 4–6).',
  avoid_complex_jargon:       'When true, the AI minimises technical jargon and prefers plain language.',
  explain_terms_on_first_use: 'Requires all specialised terms to be defined on their first mention.',
  bold_first_key_term:        'The first occurrence of each key term should be bolded for emphasis.',
  require_scenario_based_examples: 'Examples must be grounded in realistic scenarios, not just abstract definitions.',
  require_transition_sentences: 'Each section must open with a sentence that bridges from the previous topic.',
  instructional_emphasis_labels: 'Allowed callout-box label types (e.g. "Important", "Pro Tip", "Warning").',

  // ── Compliance elements ─────────────────────────────────────────────────────
  regulatory_mode:            '"strict_real_regulators" enforces citations of actual regulatory standards; looser modes allow generic references.',
  require_non_advisory_language: 'Prohibits financial-advice phrasing — content must describe rules, not recommend actions.',
  forbidden_phrases:          'Explicit phrases the AI must never use in generated content.',
  required_behaviors:         'Mandatory writing practices (e.g. "always cite primary sources", "use second-person you").',

  // ── Content rules ───────────────────────────────────────────────────────────
  must_map_to_learning_objectives: 'All generated content must clearly connect back to a stated learning objective.',
  require_learning_objectives_in_first_section: 'Learning objectives must appear in the opening section of the course.',
  require_expanded_summary_section: 'The final section must re-state and expand on all learning objectives.',
  require_conclusion_section: 'A concluding section is mandatory at the end of the course.',
  require_source_fidelity:    'Content must faithfully paraphrase the source material — the AI cannot invent facts.',
  require_intro_section:      'An introductory section is required at the start of the course.',
  require_learning_objectives: 'Learning objectives must be explicitly stated in the course.',
  learning_objectives_range:  '[min, max] number of course-level learning objectives allowed.',
  learning_objectives_per_lesson_range: '[min, max] learning objectives per individual lesson.',
  require_active_verb_learning_objectives: "Learning objectives must start with Bloom's Taxonomy action verbs (e.g. Identify, Explain, Apply).",
  require_examples_per_section: '[min, max] concrete examples required per section.',
  require_callouts_per_section: '[min, max] instructional callout boxes (Important / Pro Tip / Warning) required per section.',
  allow_case_studies:         'Whether case-study or scenario-narrative content is permitted.',
  allow_regulatory_updates_section: 'Whether a "Regulatory Updates" or "Recent Changes" section is permitted.',
  require_timed_outline:      'A NAIC Timed Outline document is required before pipeline can run.',
  require_ethics_category_application: 'An ethics category application form is required for this course family.',
  no_duplicate_concepts_across_sections: 'The same concept may not be taught in more than one section.',
  no_unverified_statistics:   'All statistics must be sourced from the study guide — no invented figures.',
  no_opinion_based_statements: 'All statements must be factual; opinion or subjective phrasing is prohibited.',
  self_contained_subtopics:   'Each subtopic must be independently understandable without reading other subtopics.',
  maintain_section_boundary_integrity: 'Content from one section must not bleed into an adjacent section.',

  // ── KC placement rules ──────────────────────────────────────────────────────
  placement:                  'Strategy for placing Knowledge Checks — e.g. "every 5–10 screens" or "after each critical concept".',
  min_kc_per_lesson:          'Minimum number of Knowledge Checks required in each lesson.',
  max_kc_per_lesson:          'Maximum number of Knowledge Checks allowed in each lesson.',
  min_answer_options:         'Minimum number of answer choices per Knowledge Check (typically 2–4).',
  max_answer_options:         'Maximum number of answer choices per Knowledge Check (typically 4).',
  require_explanation:        'The correct answer must include an explanation of why it is correct.',
  distractor_quality:         'Quality standard for wrong answers — "plausible" means they must look credible, not obviously wrong.',
  forbidden_placements:       'Sections where Knowledge Checks must never appear (e.g. introduction, summary).',
  kc_triggers:                'Conditions that should trigger placement of a Knowledge Check (e.g. "after complex explanation", "end of section").',
  placement_priorities:       'Order of preference for KC placement when multiple locations are candidates.',
  avoid_kc_on:                'Topics or content types where KCs are inappropriate (e.g. rapidly-changing figures).',

  // ── Deduplication rules ─────────────────────────────────────────────────────
  similarity_threshold:       'Cosine-similarity score (0–1) above which two questions are considered duplicates and one is removed. 0.82 = 82% similar.',
  apply_between:              'Which question pools to check for duplicates (e.g. KC-to-KC, KC-to-Exam, Exam-to-Exam).',

  // ── Technical / LMS constraints ─────────────────────────────────────────────
  max_words_per_page:         'Maximum words per screen in the LMS authoring tool (typically 180–400).',
  prefer_bulleted_content:    'Favour bullet lists over long prose paragraphs where possible.',
  allow_callouts:             'Whether highlighted callout boxes are permitted in the LMS template.',
  allow_tables:               'Whether tables are permitted in the LMS template.',
  avoid_large_text_blocks:    'Break up passages longer than ~4 sentences into bullets or sub-sections.',
  page_break_strategy:        'When to insert page breaks — "subtopic_based" splits at each subtopic; "word_count_based" splits every N words.',

  // ── Error tolerance ─────────────────────────────────────────────────────────
  word_count_tolerance_percent: 'Allowed variance from the target word count before a validation warning triggers (e.g. 10 = ±10%).',
  retry_on_failure:           'Whether a failed generation step is automatically retried.',
  max_retries_per_step:       'Maximum retry attempts before the pipeline marks the step as permanently failed.',
}
