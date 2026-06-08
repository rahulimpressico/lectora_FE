import { useEffect, useState } from 'react'

export const MODEL_COLORS: Record<string, string> = {
  o3: '#f59e0b',
  'o4-mini': '#f97316',
  'gpt-5.4-mini': '#8b5cf6',
  'gpt-5-mini': '#8b5cf6',
  'gpt-4o': '#06b6d4',
  'gpt-4o-mini': '#14b8a6',
  'text-embedding-3-small': '#10b981',
  default: '#94a3b8',
}

export const STAGE_COLORS: Record<string, string> = {
  to_generation: '#6366f1',
  content_generation: '#8b5cf6',
  assessment_generation: '#06b6d4',
  image_generation: '#10b981',
  metadata_generation: '#f59e0b',
  search_operations: '#f97316',
  other: '#94a3b8',
}

export function getModelColor(modelId: string): string {
  return MODEL_COLORS[modelId] ?? MODEL_COLORS.default
}

export function getStageColor(stageKey: string): string {
  return STAGE_COLORS[stageKey] ?? STAGE_COLORS.other
}

export const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#f97316',
  '#ec4899',
]

export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export function chartAxisStyle(isDark: boolean) {
  return {
    fill: isDark ? '#94a3b8' : '#64748b',
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
  }
}

export function chartGridColor(isDark: boolean): string {
  return isDark ? 'rgba(148,163,184,0.10)' : 'rgba(148,163,184,0.18)'
}

export function tooltipStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)'}`,
    borderRadius: '10px',
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12)',
    padding: '10px 14px',
    color: isDark ? '#f1f5f9' : '#1e293b',
    fontSize: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
  }
}
