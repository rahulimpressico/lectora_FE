import { BarChart2, FileText, Layers } from 'lucide-react'
import type { DepthCard } from '../types'

export const TONE_PILLS = ['Practical', 'Formal', 'Conversational', 'Compliance-Focused']

export const DEPTH_CARDS: DepthCard[] = [
  {
    value: 'overview',
    label: 'Overview',
    description: 'High-level concepts, concise',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Equal depth and breadth',
    icon: <BarChart2 className="w-5 h-5" />,
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive, in-depth coverage',
    icon: <FileText className="w-5 h-5" />,
  },
]
