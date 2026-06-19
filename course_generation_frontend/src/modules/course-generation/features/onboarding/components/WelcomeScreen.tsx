import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Clock, Sparkles, Users, Zap } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const miniCardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.0 } },
}

export const WelcomeScreen = () => {
  const setPhase = useCourseStore((s) => s.setPhase)
  const reset = useCourseStore((s) => s.reset)

  useEffect(() => {
    reset()
  }, [reset])

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      style={{
        background:
          "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(99,102,241,0.04) 100%)",
        backgroundImage: `
          linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(99,102,241,0.04) 100%),
          radial-gradient(circle, #e2e8f0 1px, transparent 1px)
        `,
        backgroundSize: "auto, 24px 24px",
      }}
    >
      {/* Content */}
      <div className="min-h-full flex items-center justify-center px-4 py-16">
        <motion.div
          className="w-full max-w-md flex flex-col items-center gap-7"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          style={{ willChange: "transform" }}
        >
          {/* Badge chip */}
          <motion.div
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold rounded-full"
            variants={fadeUp}
            style={{ willChange: "transform" }}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            AI Course Builder
          </motion.div>

          {/* Headline */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight">
              <motion.span
                className="block"
                variants={fadeUp}
                custom={0.06}
                style={{ willChange: "transform" }}
              >
                Build your course draft faster{""}
              </motion.span>
              <motion.span
                className="block text-indigo-600"
                variants={fadeUp}
                custom={0.12}
                style={{ willChange: "transform" }}
              >
                with guided AI assistance
              </motion.span>
            </h1>
            <motion.p
              className="text-slate-500 text-base max-w-sm text-center leading-relaxed mx-auto"
              variants={fadeUp}
              style={{ willChange: "transform" }}
            >
              Walk through a few guided steps. The assistant uses your materials
              and direction to prepare a course structure, learning objectives,
              and timed outline for your review.
            </motion.p>
          </div>

          {/* Three mini-cards */}
          <motion.div
            className="grid grid-cols-3 gap-3 max-w-sm w-full"
            variants={miniCardStagger}
          >
            {[
              { icon: BookOpen, step: "01", label: "Course Detail" },
              { icon: Users, step: "02", label: "Learners" },
              { icon: Zap, step: "03", label: "Course Plan" },
            ].map(({ icon: Icon, step, label }) => (
              <motion.div
                key={step}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center cursor-default"
                variants={scaleIn}
                whileHover={{
                  y: -3,
                  boxShadow: "0 8px 24px rgba(99,102,241,0.12)",
                }}
                style={{ willChange: "transform" }}
              >
                <Icon className="w-5 h-5 text-indigo-500" />
                <span className="font-mono text-xs text-slate-400">{step}</span>
                <span className="text-xs font-semibold text-slate-700">
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Time estimate */}
          <motion.div
            className="flex items-center gap-1.5 text-sm text-slate-400"
            variants={fadeIn}
            transition={{ delay: 0.28 }}
            style={{ willChange: "transform" }}
          >
            <Clock className="w-4 h-4" />A few minutes to set up{" "}
          </motion.div>

          {/* CTA button */}
          <motion.button
            onClick={() => setPhase("wizard-basics")}
            className="group relative overflow-hidden flex items-center gap-3 px-8 py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-300/40 hover:bg-indigo-700 active:translate-y-0 transition-colors duration-200"
            variants={scaleIn}
            transition={{ delay: 0.34 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{ willChange: "transform" }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
            Start Course Setup
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200 relative" />
          </motion.button>

          {/* Footnote */}
          <motion.p
            className="text-xs text-slate-400 text-center"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
          >
            Everything can be edited after setup
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
