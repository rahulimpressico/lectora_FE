import { Award, BookOpen, GraduationCap } from 'lucide-react'
import { EXPERIENCE_LEVEL_LABELS } from '../../../../types/wizard'
import type { ExperienceCard } from '../types'

export const AUDIENCE_PILLS = [
  'Financial Advisors',
  'Insurance Agents',
  'Compliance Officers',
  'New Employees',
  'All Staff',
]

export const EXPERIENCE_CARDS: ExperienceCard[] = [
  {
    value: 'new',
    label: EXPERIENCE_LEVEL_LABELS.new,
    description: 'Little to no prior knowledge',
    icon: <GraduationCap className="w-5 h-5" />,
  },
  {
    value: 'some',
    label: EXPERIENCE_LEVEL_LABELS.some,
    description: 'Familiar with core concepts',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    value: 'experienced',
    label: EXPERIENCE_LEVEL_LABELS.experienced,
    description: 'Strong existing knowledge',
    icon: <Award className="w-5 h-5" />,
  },
]

export const pillVariant = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
}
