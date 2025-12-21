import React from 'react'
import { motion } from 'framer-motion'

export function MetricRing({ 
  value, 
  label, 
  icon: Icon, 
  color = '#00d4aa',
  size = 120,
  strokeWidth = 8 
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (value * circumference)

  const getValueColor = (val) => {
    if (val >= 0.7) return '#00d4aa' // Good - accent
    if (val >= 0.4) return '#ffb84d' // Medium - warning
    return '#ff5c5c' // Low - danger
  }

  const actualColor = color === 'dynamic' ? getValueColor(value) : color

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={actualColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 10px ${actualColor})`
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && <Icon className="w-5 h-5 mb-1" style={{ color: actualColor }} />}
          <span 
            className="text-2xl font-bold font-mono"
            style={{ color: actualColor }}
          >
            {Math.round(value * 100)}
          </span>
        </div>
      </div>
      
      <span className="mt-2 text-sm font-medium text-mirror-muted uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

export function MetricBar({ value, label, icon: Icon, showValue = true }) {
  const getValueColor = (val) => {
    if (val >= 0.7) return 'bg-mirror-accent'
    if (val >= 0.4) return 'bg-mirror-warning'
    return 'bg-mirror-danger'
  }

  const getGlowClass = (val) => {
    if (val >= 0.7) return 'glow-accent'
    if (val >= 0.4) return 'glow-warning'
    return 'glow-danger'
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-mirror-muted" />}
          <span className="text-sm font-medium text-mirror-text">{label}</span>
        </div>
        {showValue && (
          <span className="text-sm font-mono text-mirror-muted">
            {Math.round(value * 100)}%
          </span>
        )}
      </div>
      <div className="h-2 bg-mirror-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getValueColor(value)} ${getGlowClass(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

