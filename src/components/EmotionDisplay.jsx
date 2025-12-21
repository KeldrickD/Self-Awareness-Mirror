import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Smile, 
  Frown, 
  Meh, 
  Zap, 
  AlertCircle, 
  Brain,
  Moon,
  Eye
} from 'lucide-react'

const EMOTION_CONFIG = {
  neutral: {
    icon: Meh,
    color: '#6b7280',
    label: 'Neutral',
    description: 'Balanced state'
  },
  happy: {
    icon: Smile,
    color: '#00d4aa',
    label: 'Happy',
    description: 'Positive mood detected'
  },
  sad: {
    icon: Frown,
    color: '#3b82f6',
    label: 'Sad',
    description: 'Low mood indicators'
  },
  angry: {
    icon: Zap,
    color: '#ff5c5c',
    label: 'Frustrated',
    description: 'Tension detected'
  },
  surprised: {
    icon: AlertCircle,
    color: '#ffb84d',
    label: 'Surprised',
    description: 'Unexpected reaction'
  },
  contemplative: {
    icon: Brain,
    color: '#8b5cf6',
    label: 'Deep Focus',
    description: 'Concentrated thinking'
  },
  tired: {
    icon: Moon,
    color: '#6366f1',
    label: 'Tired',
    description: 'Fatigue indicators'
  },
  unknown: {
    icon: Eye,
    color: '#6b7280',
    label: 'Analyzing',
    description: 'Processing...'
  }
}

export function EmotionDisplay({ emotion, emotionScores = {} }) {
  const config = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.unknown
  const Icon = config.icon

  // Sort emotions by score
  const sortedEmotions = Object.entries(emotionScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="bg-mirror-card rounded-xl border border-mirror-border p-5">
      <h3 className="text-sm font-medium text-mirror-muted uppercase tracking-wider mb-4">
        Emotional State
      </h3>

      {/* Primary emotion */}
      <div className="flex items-center gap-4 mb-6">
        <motion.div
          key={emotion}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ 
            backgroundColor: `${config.color}20`,
            boxShadow: `0 0 30px ${config.color}30`
          }}
        >
          <Icon 
            className="w-8 h-8" 
            style={{ color: config.color }} 
          />
        </motion.div>
        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={emotion}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="text-xl font-semibold text-mirror-text"
            >
              {config.label}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-mirror-muted">{config.description}</p>
        </div>
      </div>

      {/* Emotion breakdown */}
      {sortedEmotions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-mirror-muted uppercase tracking-wider">
            Detection Confidence
          </p>
          {sortedEmotions.map(([emo, score]) => {
            const emoConfig = EMOTION_CONFIG[emo] || EMOTION_CONFIG.unknown
            return (
              <div key={emo} className="flex items-center gap-3">
                <span className="text-xs text-mirror-muted w-20 capitalize">
                  {emoConfig.label}
                </span>
                <div className="flex-1 h-1.5 bg-mirror-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: emoConfig.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs font-mono text-mirror-muted w-10 text-right">
                  {Math.round(score * 100)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

