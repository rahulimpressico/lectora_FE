import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  label: string
  value: string
  subValue?: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  accent: string
  glow: string
  trend?: number // percentage change, positive = up, negative = down
  trendLabel?: string
  delay?: number
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

export function KPICard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor,
  iconBg,
  accent,
  glow,
  trend,
  trendLabel,
  delay = 0,
}: Props) {
  const hasTrend = trend !== undefined
  const isUp = (trend ?? 0) > 0
  const isNeutral = trend === 0

  return (
    <motion.div
      custom={delay}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="group relative rounded-2xl border border-slate-200/70 bg-white px-6 py-5 overflow-hidden cursor-default"
      style={{ boxShadow: glow }}
    >
      {/* Background glow blob */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-slate-50 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums leading-none">
            {value}
          </p>
          {subValue && (
            <p className="mt-0.5 text-xs text-slate-400 font-medium">{subValue}</p>
          )}
          {hasTrend && (
            <div className="mt-2 flex items-center gap-1">
              {isNeutral ? (
                <Minus size={11} className="text-slate-400" />
              ) : isUp ? (
                <TrendingUp size={11} className="text-emerald-500" />
              ) : (
                <TrendingDown size={11} className="text-red-400" />
              )}
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  isNeutral
                    ? 'text-slate-400'
                    : isUp
                      ? 'text-emerald-600'
                      : 'text-red-500',
                )}
              >
                {isUp ? '+' : ''}
                {trend?.toFixed(1)}%
              </span>
              {trendLabel && (
                <span className="text-[11px] text-slate-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>

        <motion.div
          whileHover={{ scale: 1.12, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={18} className={iconColor} />
        </motion.div>
      </div>

      {/* Accent bar */}
      <div className="mt-5 h-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full w-full rounded-full bg-gradient-to-r ${accent} opacity-70`} />
      </div>
    </motion.div>
  )
}
