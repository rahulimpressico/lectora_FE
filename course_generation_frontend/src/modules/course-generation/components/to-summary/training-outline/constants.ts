export const STEPS = ['Overview', 'Learning Objectives', 'Sections'] as const

export const DIFFICULTY_OPTIONS = [
  { value: 'basic',        label: 'Basic',        desc: 'Foundational concepts' },
  { value: 'intermediate', label: 'Intermediate',  desc: 'Applied knowledge' },
  { value: 'advanced',     label: 'Advanced',      desc: 'Expert-level content' },
] as const

export const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all'
