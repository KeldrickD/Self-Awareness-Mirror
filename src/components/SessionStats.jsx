import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Activity, Target, Zap, Brain, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

export function SessionStats({ duration, readings, isRecording }) {
  // Calculate stats
  const avgConfidence = readings.length > 0
    ? readings.reduce((a, r) => a + r.confidence, 0) / readings.length
    : 0

  const avgFocus = readings.length > 0
    ? readings.reduce((a, r) => a + r.focus, 0) / readings.length
    : 0

  const avgEnergy = readings.length > 0
    ? readings.reduce((a, r) => a + r.energy, 0) / readings.length
    : 0

  // Find peak focus period
  let peakFocus = 0
  let peakFocusIndex = 0
  readings.forEach((r, i) => {
    if (r.focus > peakFocus) {
      peakFocus = r.focus
      peakFocusIndex = i
    }
  })

  // Format duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`
    } else if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  const stats = [
    {
      icon: Clock,
      label: 'Duration',
      value: formatDuration(duration),
      color: '#00d4aa'
    },
    {
      icon: Activity,
      label: 'Readings',
      value: readings.length.toLocaleString(),
      color: '#8b5cf6'
    },
    {
      icon: Target,
      label: 'Avg Focus',
      value: `${Math.round(avgFocus * 100)}%`,
      color: avgFocus >= 0.7 ? '#00d4aa' : avgFocus >= 0.4 ? '#ffb84d' : '#ff5c5c'
    },
    {
      icon: Zap,
      label: 'Avg Energy',
      value: `${Math.round(avgEnergy * 100)}%`,
      color: avgEnergy >= 0.7 ? '#00d4aa' : avgEnergy >= 0.4 ? '#ffb84d' : '#ff5c5c'
    },
    {
      icon: Brain,
      label: 'Confidence',
      value: `${Math.round(avgConfidence * 100)}%`,
      color: avgConfidence >= 0.7 ? '#00d4aa' : avgConfidence >= 0.4 ? '#ffb84d' : '#ff5c5c'
    },
    {
      icon: TrendingUp,
      label: 'Peak Focus',
      value: `${Math.round(peakFocus * 100)}%`,
      color: '#00d4aa'
    }
  ]

  return (
    <div className="bg-mirror-card rounded-xl border border-mirror-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-mirror-muted uppercase tracking-wider">
          Session Statistics
        </h3>
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-mirror-accent">
            <div className="w-1.5 h-1.5 rounded-full bg-mirror-accent animate-pulse" />
            Recording
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-mirror-bg/50 rounded-lg p-3 border border-mirror-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon 
                className="w-4 h-4" 
                style={{ color: stat.color }} 
              />
              <span className="text-xs text-mirror-muted">{stat.label}</span>
            </div>
            <p 
              className="text-lg font-bold font-mono"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function SessionSummary({ session }) {
  if (!session?.summary) return null

  const { summary } = session

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-mirror-card rounded-xl border border-mirror-border p-6"
    >
      <h3 className="text-lg font-semibold text-mirror-text mb-4">
        Session Complete
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-mirror-accent font-mono">
            {Math.round(summary.avgConfidence * 100)}%
          </p>
          <p className="text-sm text-mirror-muted">Avg Confidence</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-[#8b5cf6] font-mono">
            {Math.round(summary.avgFocus * 100)}%
          </p>
          <p className="text-sm text-mirror-muted">Avg Focus</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-mirror-warning font-mono">
            {Math.round(summary.avgEnergy * 100)}%
          </p>
          <p className="text-sm text-mirror-muted">Avg Energy</p>
        </div>
      </div>

      {summary.insights && summary.insights.length > 0 && (
        <div className="border-t border-mirror-border pt-4">
          <h4 className="text-sm font-medium text-mirror-muted uppercase tracking-wider mb-3">
            Insights
          </h4>
          <ul className="space-y-2">
            {summary.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-mirror-accent mt-1">•</span>
                <span className="text-sm text-mirror-text">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

