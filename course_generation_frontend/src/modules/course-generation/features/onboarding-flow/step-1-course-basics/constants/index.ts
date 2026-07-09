/**
 * Rule pack chip definitions — mirrors the three rule packs registered in
 * the backend (rule_packs.py). Each entry maps the display label used in
 * courseTypeHint to the backend key.
 */
export const COURSE_TYPE_OPTIONS = [
  { key: 'insurance_ce',  label: 'Insurance CE'  },
  { key: 'iarce',         label: 'IARCE'          },
  { key: 'firm_element',  label: 'Firm Element'   },
] as const

export const DURATION_OPTIONS = [1, 2, 3, 4, 5]

export const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'basic',        label: 'Basic'        },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
]
