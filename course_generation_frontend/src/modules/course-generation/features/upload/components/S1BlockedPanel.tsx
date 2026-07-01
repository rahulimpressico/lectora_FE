/**
 * S1BlockedPanel — shown when the TO generation fails because S1 Validator
 * blocked the outline after all retry attempts.
 *
 * Displays:
 *   - Block reason (top-level error message)
 *   - Quality scores (overall, coverage, sequence, relevance, completeness, confidence)
 *   - Blocker / critical issues list
 *   - Recommendations
 *   - Missing topics
 *   - Retry prompt (what the user can provide to fix it)
 */
import { AlertTriangle, ShieldX, ChevronDown, ChevronUp, ListX, Lightbulb, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import type { S1ValidationResult } from '../../../types'

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score)
  const color =
    pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'
  const ringColor =
    pct >= 80 ? 'stroke-emerald-400' : pct >= 60 ? 'stroke-amber-400' : 'stroke-red-400'

  const r = 16
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1 min-w-[54px]">
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            className={ringColor}
            strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-[11px] font-bold', color)}>
          {pct}
        </span>
      </div>
      <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    blocker:  'bg-red-100 text-red-700 border-red-200',
    critical: 'bg-orange-100 text-orange-700 border-orange-200',
    warning:  'bg-amber-100 text-amber-700 border-amber-200',
    info:     'bg-blue-100 text-blue-700 border-blue-200',
  }
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0',
      styles[severity] ?? 'bg-slate-100 text-slate-600 border-slate-200',
    )}>
      {severity}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface S1BlockedPanelProps {
  /** Top-level error message from the job (the blocker message). */
  errorMessage: string
  /** Full S1 validation result with scores and issue details. */
  validation: S1ValidationResult
}

export function S1BlockedPanel({ errorMessage, validation }: S1BlockedPanelProps) {
  const [showDetails, setShowDetails] = useState(false)

  const blockerIssues = validation.issues.filter((i) => i.severity === 'blocker')
  const criticalIssues = validation.issues.filter((i) => i.severity === 'critical')
  const warningIssues = validation.issues.filter((i) => i.severity === 'warning')
  const visibleIssues = [...blockerIssues, ...criticalIssues]

  const hasScores = validation.overall_score > 0 || validation.coverage_score > 0

  return (
    <div className="rounded-xl border border-red-200/80 bg-red-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 border border-red-200 mt-0.5">
          <ShieldX size={14} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-red-700 leading-snug">
            S1 Validator blocked the Training Outline
          </p>
          <p className="text-[12px] text-red-500 mt-0.5 leading-relaxed">
            {errorMessage}
          </p>
        </div>
      </div>

      {/* Score overview (when available) */}
      {hasScores && (
        <div className="border-t border-red-100 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            Quality Scores
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <ScoreRing label="Overall" score={validation.overall_score} />
            {validation.coverage_score > 0 && <ScoreRing label="Coverage" score={validation.coverage_score} />}
            {validation.sequence_score > 0 && <ScoreRing label="Sequence" score={validation.sequence_score} />}
            {validation.relevance_score > 0 && <ScoreRing label="Relevance" score={validation.relevance_score} />}
            {validation.completeness_score > 0 && <ScoreRing label="Complete" score={validation.completeness_score} />}
            {validation.confidence > 0 && <ScoreRing label="Confidence" score={Math.round(validation.confidence * 100)} />}
          </div>
        </div>
      )}

      {/* Issue count pills */}
      {(blockerIssues.length > 0 || criticalIssues.length > 0 || warningIssues.length > 0) && (
        <div className="border-t border-red-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
          {blockerIssues.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-700">
              <AlertTriangle size={10} />
              {blockerIssues.length} Blocker{blockerIssues.length !== 1 ? 's' : ''}
            </span>
          )}
          {criticalIssues.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-1 text-[11px] font-bold text-orange-700">
              <AlertTriangle size={10} />
              {criticalIssues.length} Critical{criticalIssues.length !== 1 ? 's' : ''}
            </span>
          )}
          {warningIssues.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              {warningIssues.length} Warning{warningIssues.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {showDetails ? 'Hide' : 'View'} details
            {showDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      )}

      {/* Expandable details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-red-100 px-4 py-3 space-y-3">

              {/* Blocker + critical issues */}
              {visibleIssues.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ListX size={11} className="text-red-400 shrink-0" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Issues to Fix
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {visibleIssues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white/70 px-3 py-2"
                      >
                        <SeverityBadge severity={issue.severity} />
                        <div className="flex-1 min-w-0">
                          {issue.field && (
                            <p className="text-[10px] font-mono text-slate-400 mb-0.5 truncate">
                              {issue.field}
                            </p>
                          )}
                          <p className="text-[12px] text-slate-700 leading-snug">
                            {issue.message}
                          </p>
                          {issue.section && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Section: {issue.section}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing topics */}
              {validation.missing_topics.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen size={11} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Missing Topics
                    </p>
                  </div>
                  <div className="space-y-1">
                    {validation.missing_topics.slice(0, 5).map((mt, i) => (
                      <div key={i} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                        <p className="text-[12px] font-semibold text-amber-800">{mt.topic}</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">{mt.reason}</p>
                        {mt.suggested_placement && (
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            Suggested: {mt.suggested_placement}
                          </p>
                        )}
                      </div>
                    ))}
                    {validation.missing_topics.length > 5 && (
                      <p className="text-[11px] text-slate-400 px-1">
                        +{validation.missing_topics.length - 5} more…
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {validation.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb size={11} className="text-indigo-400 shrink-0" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Recommendations
                    </p>
                  </div>
                  <div className="space-y-1">
                    {validation.recommendations.slice(0, 4).map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                        <span className={cn(
                          'mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0',
                          rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                          rec.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500',
                        )}>
                          {rec.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-indigo-800 leading-snug">{rec.action}</p>
                          {rec.rationale && (
                            <p className="text-[10px] text-indigo-500 mt-0.5">{rec.rationale}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retry prompt */}
              {validation.retry_prompt && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">
                    Suggested Fix
                  </p>
                  <p className="text-[12px] text-violet-800 leading-relaxed">
                    {validation.retry_prompt}
                  </p>
                </div>
              )}

              {/* Summary */}
              {validation.summary && (
                <p className="text-[11px] text-slate-400 italic leading-relaxed border-t border-slate-100 pt-2.5">
                  {validation.summary}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
