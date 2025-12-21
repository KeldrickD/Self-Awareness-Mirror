import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Zap, 
  Moon, 
  Sparkles, 
  Meh, 
  Radio,
  Eye,
  Info,
  AlertTriangle,
  Lightbulb,
  Signal
} from 'lucide-react'

const MODE_CONFIG = {
  deep_focus: {
    icon: Brain,
    color: '#8b5cf6',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    label: 'Deep Focus',
    tip: 'Maintain this state as long as possible'
  },
  thinking: {
    icon: Lightbulb,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-yellow-500/10',
    label: 'Thinking',
    tip: 'Processing — this is productive look-away'
  },
  distracted: {
    icon: Radio,
    color: '#ffb84d',
    gradient: 'from-amber-500/20 to-orange-500/10',
    label: 'Distracted',
    tip: 'Try to refocus on your primary task'
  },
  fatigued: {
    icon: Moon,
    color: '#6366f1',
    gradient: 'from-indigo-500/20 to-blue-500/10',
    label: 'Fatigued',
    tip: 'Consider taking a short break'
  },
  high_energy: {
    icon: Zap,
    color: '#00d4aa',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    label: 'High Energy',
    tip: 'Great time for challenging tasks'
  },
  animated: {
    icon: Sparkles,
    color: '#f472b6',
    gradient: 'from-pink-500/20 to-rose-500/10',
    label: 'Animated',
    tip: 'Expressive communication mode'
  },
  neutral: {
    icon: Meh,
    color: '#6b7280',
    gradient: 'from-gray-500/20 to-slate-500/10',
    label: 'Neutral',
    tip: 'Stable baseline state'
  },
  away: {
    icon: Eye,
    color: '#ef4444',
    gradient: 'from-red-500/20 to-rose-500/10',
    label: 'Away',
    tip: 'Return to frame for tracking'
  },
  low_signal: {
    icon: AlertTriangle,
    color: '#f97316',
    gradient: 'from-orange-500/20 to-amber-500/10',
    label: 'Low Signal',
    tip: 'Adjust lighting or camera position'
  }
}

export function ObservedMode({ observedMode, metrics, signalQuality }) {
  const config = MODE_CONFIG[observedMode?.mode] || MODE_CONFIG.neutral
  const Icon = config.icon
  
  const sigQ = signalQuality?.Q_total || 100
  const sigColor = sigQ >= 70 ? '#00d4aa' : sigQ >= 50 ? '#ffb84d' : '#ff5c5c'
  
  return (
    <div className="bg-mirror-card rounded-xl border border-mirror-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-mirror-muted uppercase tracking-wider">
          Observed Mode
        </h3>
        <div className="group relative">
          <Info className="w-4 h-4 text-mirror-muted/50 cursor-help" />
          <div className="absolute right-0 top-6 w-64 p-3 bg-mirror-bg border border-mirror-border rounded-lg text-xs text-mirror-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Based on gaze stability, blink patterns, head movement, and face presence. 
            v4: Now distinguishes "thinking" from "distracted" look-aways.
          </div>
        </div>
      </div>

      {/* Signal Quality Badge */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-mirror-bg/50 rounded-lg border border-mirror-border/50">
        <Signal className="w-4 h-4" style={{ color: sigColor }} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-mirror-muted">Signal Quality</span>
            <span className="text-xs font-mono" style={{ color: sigColor }}>
              {Math.round(sigQ)}%
            </span>
          </div>
          <div className="h-1 bg-mirror-border rounded-full mt-1 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: sigColor }}
              initial={{ width: 0 }}
              animate={{ width: `${sigQ}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Primary mode display */}
      <motion.div
        key={observedMode?.mode}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${config.gradient} p-5 mb-4`}
      >
        <div className="flex items-center gap-4">
          <motion.div
            key={observedMode?.mode}
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ 
              backgroundColor: `${config.color}30`,
              boxShadow: `0 0 30px ${config.color}40`
            }}
          >
            <Icon className="w-7 h-7" style={{ color: config.color }} />
          </motion.div>
          
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.h4
                key={observedMode?.mode}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="text-xl font-semibold text-mirror-text"
              >
                {config.label}
              </motion.h4>
            </AnimatePresence>
            <p className="text-sm text-mirror-muted mt-0.5">
              {observedMode?.description || 'Analyzing...'}
            </p>
          </div>
          
          <div className="text-right">
            <span 
              className="text-2xl font-bold font-mono"
              style={{ color: config.color }}
            >
              {observedMode?.confidence || 0}%
            </span>
            <p className="text-xs text-mirror-muted">confidence</p>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-xs text-mirror-muted">
            💡 {config.tip}
          </p>
        </div>
      </motion.div>

      {/* Supporting metrics */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          <MetricPill 
            label="Blink Rate" 
            value={`${metrics.blinkRate || 0}/min`}
            normal="15-20"
            isGood={metrics.blinkRate >= 10 && metrics.blinkRate <= 25}
          />
          <MetricPill 
            label="Eye Openness" 
            value={`${Math.round((metrics.EAR || 0.25) * 100)}%`}
            normal=">22%"
            isGood={(metrics.EAR || 0.25) > 0.20}
          />
          <MetricPill 
            label="Head Stability" 
            value={metrics.headMotion < 0.02 ? 'Stable' : metrics.headMotion < 0.05 ? 'Moving' : 'Jittery'}
            isGood={metrics.headMotion < 0.02}
          />
          <MetricPill 
            label="Gaze" 
            value={metrics.awayRatio < 0.3 ? 'On screen' : 'Looking away'}
            isGood={metrics.awayRatio < 0.3}
          />
          {metrics.irisAvailable && (
            <div className="col-span-2 flex items-center gap-2 text-xs text-mirror-accent">
              <Eye className="w-3 h-3" />
              <span>Iris tracking active (enhanced accuracy)</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricPill({ label, value, normal, isGood }) {
  const showGood = isGood !== undefined
  
  return (
    <div className="bg-mirror-bg/50 rounded-lg p-2.5 border border-mirror-border/50">
      <p className="text-xs text-mirror-muted mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${
          showGood 
            ? (isGood ? 'text-mirror-accent' : 'text-mirror-warning')
            : 'text-mirror-text'
        }`}>
          {value}
        </span>
        {normal && (
          <span className="text-xs text-mirror-muted/50">
            ({normal})
          </span>
        )}
      </div>
    </div>
  )
}
