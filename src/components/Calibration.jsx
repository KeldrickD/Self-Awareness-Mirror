import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Eye, Mic, Check, SkipForward, Loader2 } from 'lucide-react'

const CALIBRATION_PHASES = [
  {
    phase: 'A',
    duration: 15000,
    icon: Target,
    title: 'Baseline',
    instruction: 'Look at the center dot',
    subtext: 'Keep a neutral expression and natural posture',
    guide: 'center',
  },
  {
    phase: 'B',
    duration: 10000,
    icon: Eye,
    title: 'Gaze Range',
    instruction: 'Follow the dot as it moves',
    subtext: 'This calibrates your "looking away" threshold',
    guide: 'moving',
  },
  {
    phase: 'C',
    duration: 10000,
    icon: Mic,
    title: 'Finish',
    instruction: 'Almost done! Stay relaxed',
    subtext: 'Optional: speak normally for a few seconds',
    guide: 'center',
  },
]

const TOTAL_DURATION = 35000

export function CalibrationOverlay({ 
  isOpen, 
  progress = 0,
  onSkip, 
  onComplete 
}) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(35)
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 })
  const startTimeRef = useRef(null)
  
  useEffect(() => {
    if (!isOpen) {
      setCurrentPhaseIndex(0)
      setSecondsLeft(35)
      setDotPosition({ x: 0, y: 0 })
      startTimeRef.current = null
      return
    }
    
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
    }
    
    // Update timer and phase
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, Math.ceil((TOTAL_DURATION - elapsed) / 1000))
      setSecondsLeft(remaining)
      
      // Update phase
      if (elapsed >= 25000) {
        setCurrentPhaseIndex(2)
        setDotPosition({ x: 0, y: 0 })
      } else if (elapsed >= 15000) {
        setCurrentPhaseIndex(1)
        // Moving dot for gaze range phase
        const phaseElapsed = elapsed - 15000
        const cycle = (phaseElapsed % 4000) / 4000 // 4 second cycle
        if (cycle < 0.25) {
          // Move left
          setDotPosition({ x: -80 * (cycle * 4), y: 0 })
        } else if (cycle < 0.5) {
          // Hold left, move to right
          setDotPosition({ x: -80 + 160 * ((cycle - 0.25) * 4), y: 0 })
        } else if (cycle < 0.75) {
          // Hold right
          setDotPosition({ x: 80, y: 0 })
        } else {
          // Return to center
          setDotPosition({ x: 80 - 80 * ((cycle - 0.75) * 4), y: 0 })
        }
      } else {
        setCurrentPhaseIndex(0)
        setDotPosition({ x: 0, y: 0 })
      }
      
      // Auto-complete
      if (remaining === 0) {
        clearInterval(timer)
        setTimeout(onComplete, 500)
      }
    }, 50)
    
    return () => clearInterval(timer)
  }, [isOpen, onComplete])
  
  if (!isOpen) return null
  
  const currentPhase = CALIBRATION_PHASES[currentPhaseIndex]
  const actualProgress = startTimeRef.current 
    ? Math.min(100, ((Date.now() - startTimeRef.current) / TOTAL_DURATION) * 100)
    : 0
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#0a0a12]/98 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-xl overflow-hidden"
      >
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,212,170,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,212,170,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Main calibration target */}
        <div className="relative w-72 h-72 mb-8">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-full h-full" viewBox="0 0 288 288">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00d4aa" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <circle
                cx="144"
                cy="144"
                r="140"
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="2"
                strokeDasharray="60 30"
              />
            </svg>
          </motion.div>
          
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            {/* Background track */}
            <circle
              cx="144"
              cy="144"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="3"
            />
            {/* Progress arc */}
            <motion.circle
              cx="144"
              cy="144"
              r="120"
              fill="none"
              stroke="#00d4aa"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={754}
              strokeDashoffset={754 - (actualProgress / 100) * 754}
              style={{ filter: 'drop-shadow(0 0 6px #00d4aa)' }}
            />
          </svg>
          
          {/* Inner circle background */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-b from-[#12121a] to-[#0a0a12] border border-[#1e1e2e]" />
          
          {/* Crosshairs */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="144" y1="60" x2="144" y2="100" stroke="#00d4aa" strokeWidth="1" />
            <line x1="144" y1="188" x2="144" y2="228" stroke="#00d4aa" strokeWidth="1" />
            <line x1="60" y1="144" x2="100" y2="144" stroke="#00d4aa" strokeWidth="1" />
            <line x1="188" y1="144" x2="228" y2="144" stroke="#00d4aa" strokeWidth="1" />
          </svg>
          
          {/* Moving target dot */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{ 
              x: dotPosition.x,
              y: dotPosition.y,
            }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
          >
            {/* Outer glow */}
            <motion.div
              className="absolute -inset-4 rounded-full bg-[#00d4aa]/20"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Middle ring */}
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-[#00d4aa]/40"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {/* Center dot */}
            <div 
              className="w-5 h-5 rounded-full bg-[#00d4aa]"
              style={{ boxShadow: '0 0 20px #00d4aa, 0 0 40px #00d4aa50' }}
            />
          </motion.div>
          
          {/* Corner brackets */}
          <svg className="absolute inset-0 w-full h-full opacity-40">
            {/* Top-left */}
            <path d="M 60 80 L 60 60 L 80 60" fill="none" stroke="#00d4aa" strokeWidth="2" />
            {/* Top-right */}
            <path d="M 228 60 L 208 60 L 208 60 M 228 60 L 228 80" fill="none" stroke="#00d4aa" strokeWidth="2" />
            {/* Bottom-left */}
            <path d="M 60 208 L 60 228 L 80 228" fill="none" stroke="#00d4aa" strokeWidth="2" />
            {/* Bottom-right */}
            <path d="M 228 228 L 208 228 M 228 208 L 228 228" fill="none" stroke="#00d4aa" strokeWidth="2" />
          </svg>
        </div>
        
        {/* Timer display */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <span className="text-6xl font-bold text-white font-mono tracking-tight">
              {secondsLeft}
            </span>
            <span className="text-xl text-[#00d4aa] ml-1">s</span>
          </div>
        </div>
        
        {/* Phase indicator pills */}
        <div className="flex items-center gap-2 mb-6">
          {CALIBRATION_PHASES.map((p, i) => (
            <motion.div 
              key={p.phase}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                i === currentPhaseIndex 
                  ? 'bg-[#00d4aa] text-[#0a0a12]' 
                  : i < currentPhaseIndex
                  ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                  : 'bg-white/5 text-white/30'
              }`}
              animate={i === currentPhaseIndex ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {i < currentPhaseIndex ? (
                <Check className="w-3.5 h-3.5" />
              ) : i === currentPhaseIndex ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              <span>{p.title}</span>
            </motion.div>
          ))}
        </div>
        
        {/* Instructions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhaseIndex}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="text-center mb-8 max-w-sm"
          >
            <h3 className="text-xl font-semibold text-white mb-2">
              {currentPhase.instruction}
            </h3>
            <p className="text-sm text-white/50">
              {currentPhase.subtext}
            </p>
          </motion.div>
        </AnimatePresence>
        
        {/* Progress bar */}
        <div className="w-80 mb-8">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ 
                width: `${actualProgress}%`,
                background: 'linear-gradient(90deg, #00d4aa, #00ffcc)'
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-2">
            <span>Phase {currentPhaseIndex + 1} of 3</span>
            <span>{Math.round(actualProgress)}%</span>
          </div>
        </div>
        
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
        >
          <SkipForward className="w-4 h-4" />
          Skip calibration
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

export function CalibrationPrompt({ onStart, onSkip }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#00d4aa]/10 via-[#00d4aa]/5 to-transparent border border-[#00d4aa]/30 rounded-xl p-5"
    >
      <div className="flex items-start gap-4">
        <motion.div 
          className="w-14 h-14 rounded-xl bg-[#00d4aa]/20 flex items-center justify-center flex-shrink-0"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Target className="w-7 h-7 text-[#00d4aa]" />
        </motion.div>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg mb-1">
            Quick Calibration (35s)
          </h3>
          <p className="text-sm text-white/50 mb-4">
            Personalizes scoring to YOUR baselines:
          </p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <Eye className="w-5 h-5 text-[#00d4aa] mx-auto mb-1" />
              <p className="text-xs text-white/50">Eye openness</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <Target className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-white/50">Gaze range</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <Mic className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs text-white/50">Head position</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00d4aa] text-[#0a0a12] rounded-lg text-sm font-semibold hover:bg-[#00d4aa]/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Target className="w-4 h-4" />
              Start Calibration
            </button>
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-4 py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
          <p className="text-xs text-white/30 mt-3">
            v5 auto-tunes thresholds over time even if you skip
          </p>
        </div>
      </div>
    </motion.div>
  )
}
