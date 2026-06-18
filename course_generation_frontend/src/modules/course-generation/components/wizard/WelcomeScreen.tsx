import { ArrowRight, BookOpen, Clock, Sparkles, Users, Zap } from 'lucide-react'
import { useCourseStore } from '../../store/courseStore'

export const WelcomeScreen = () => {
  const setPhase = useCourseStore((s) => s.setPhase)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(99,102,241,0.04) 100%)',
        backgroundImage: `
          linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(99,102,241,0.04) 100%),
          radial-gradient(circle, #e2e8f0 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 24px 24px',
      }}
    >
      {/* Content */}
      <div className="min-h-full flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-7">
          {/* Badge chip */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold rounded-full">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            AI Course Builder
          </div>

          {/* Headline */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight">
              Build a complete course<br />
              <span className="text-indigo-600">in minutes, not days</span>
            </h1>
            <p className="text-slate-500 text-base max-w-sm text-center leading-relaxed mx-auto">
              Walk through 7 guided steps. The AI builds structure, objectives, and a timed outline from your materials.
            </p>
          </div>

          {/* Three mini-cards */}
          <div className="grid grid-cols-3 gap-3 max-w-sm w-full">
            {[
              { icon: BookOpen, step: '01', label: 'Describe' },
              { icon: Users, step: '02', label: 'Audience' },
              { icon: Zap, step: '03', label: 'AI Outline' },
            ].map(({ icon: Icon, step, label }) => (
              <div
                key={step}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center"
              >
                <Icon className="w-5 h-5 text-indigo-500" />
                <span className="font-mono text-xs text-slate-400">{step}</span>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Time estimate */}
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            ~5 min setup
          </div>

          {/* CTA button */}
          <button
            onClick={() => setPhase('wizard-basics')}
            className="group relative overflow-hidden flex items-center gap-3 px-8 py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-300/40 hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300/40 active:translate-y-0 transition-all duration-200"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
            Start Course Setup
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200 relative" />
          </button>

          {/* Footnote */}
          <p className="text-xs text-slate-400 text-center">
            Everything can be edited after setup
          </p>
        </div>
      </div>
    </div>
  )
}
