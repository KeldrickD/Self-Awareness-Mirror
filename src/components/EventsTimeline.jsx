import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, 
  EyeOff, 
  Brain, 
  AlertTriangle, 
  Zap, 
  Moon,
  Clock,
  Activity,
  Lightbulb,
  Target,
  Signal
} from 'lucide-react'
import { getEvents } from '../lib/faceAnalysis'

const EVENT_CONFIG = {
  FACE_LOST_START: { 
    icon: EyeOff, 
    color: '#ff5c5c', 
    label: 'Face Lost',
    description: 'Left camera view'
  },
  FACE_LOST_END: { 
    icon: Eye, 
    color: '#00d4aa', 
    label: 'Face Returned',
    description: 'Back in frame'
  },
  
  // v4: Separate thinking vs distracted look-aways
  LOOK_AWAY_THINKING_START: { 
    icon: Lightbulb, 
    color: '#f59e0b', 
    label: 'Thinking',
    description: 'Processing look-away'
  },
  LOOK_AWAY_THINKING_END: { 
    icon: Target, 
    color: '#00d4aa', 
    label: 'Back to Work',
    description: 'Done thinking'
  },
  LOOK_AWAY_DISTRACTED_START: { 
    icon: AlertTriangle, 
    color: '#ff5c5c', 
    label: 'Distracted',
    description: 'Quick glance away'
  },
  LOOK_AWAY_DISTRACTED_END: { 
    icon: Eye, 
    color: '#00d4aa', 
    label: 'Refocused',
    description: 'Attention returned'
  },
  
  // Legacy fallbacks
  LOOK_AWAY_START: { 
    icon: Eye, 
    color: '#ffb84d', 
    label: 'Look Away',
    description: 'Diverted attention'
  },
  LOOK_AWAY_END: { 
    icon: Target, 
    color: '#00d4aa', 
    label: 'Returned Focus',
    description: 'Looking at screen'
  },
  
  FOCUS_STREAK_START: { 
    icon: Brain, 
    color: '#8b5cf6', 
    label: 'Deep Focus Started',
    description: 'Entered flow state'
  },
  FOCUS_STREAK_END: { 
    icon: Brain, 
    color: '#6b7280', 
    label: 'Focus Streak Ended',
    description: 'Flow interrupted'
  },
  DISTRACTION_START: { 
    icon: Activity, 
    color: '#ff5c5c', 
    label: 'Distraction Block',
    description: 'Sustained low focus'
  },
  DISTRACTION_END: { 
    icon: Target, 
    color: '#00d4aa', 
    label: 'Back on Track',
    description: 'Focus recovered'
  },
  ENERGY_DIP_START: { 
    icon: Moon, 
    color: '#6366f1', 
    label: 'Energy Dip',
    description: 'Fatigue detected'
  },
  ENERGY_DIP_END: { 
    icon: Zap, 
    color: '#00d4aa', 
    label: 'Energy Recovered',
    description: 'Feeling better'
  },
  YAWN: { 
    icon: Moon, 
    color: '#a855f7', 
    label: 'Yawn Detected',
    description: 'Fatigue signal'
  },
  CALIBRATION_START: { 
    icon: Activity, 
    color: '#3b82f6', 
    label: 'Calibration Started',
    description: 'Learning your baseline'
  },
  CALIBRATION_COMPLETE: { 
    icon: Target, 
    color: '#00d4aa', 
    label: 'Calibration Complete',
    description: 'Personal baseline set'
  },
  CALIBRATION_SKIPPED: { 
    icon: Activity, 
    color: '#ffb84d', 
    label: 'Calibration Skipped',
    description: 'Using defaults'
  },
  LOW_SIGNAL_START: {
    icon: Signal,
    color: '#f97316',
    label: 'Low Signal',
    description: 'Tracking quality dropped'
  },
  LOW_SIGNAL_END: {
    icon: Signal,
    color: '#00d4aa',
    label: 'Signal Restored',
    description: 'Tracking quality improved'
  }
}

export function EventsTimeline({ events: propEvents }) {
  const [events, setEvents] = useState([])
  const [newEventId, setNewEventId] = useState(null)
  const listRef = useRef(null)
  
  useEffect(() => {
    const latestEvents = propEvents || getEvents()
    
    // Find new events
    if (latestEvents.length > events.length) {
      const newest = latestEvents[latestEvents.length - 1]
      if (newest) setNewEventId(newest.id)
    }
    
    setEvents(latestEvents.slice(-50).reverse())
  }, [propEvents])
  
  useEffect(() => {
    if (newEventId && listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [newEventId])

  // Count event types for summary
  const summary = events.reduce((acc, e) => {
    if (e.type.includes('THINKING')) acc.thinking++
    else if (e.type.includes('DISTRACTED') || e.type.includes('DISTRACTION')) acc.distracted++
    else if (e.type.includes('FOCUS_STREAK')) acc.focusStreaks++
    else if (e.type.includes('ENERGY_DIP')) acc.energyDips++
    else if (e.type === 'YAWN') acc.yawns++
    return acc
  }, { thinking: 0, distracted: 0, focusStreaks: 0, energyDips: 0, yawns: 0 })

  return (
    <div className="bg-mirror-card rounded-xl border border-mirror-border overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-mirror-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-mirror-accent" />
            <h3 className="text-sm font-medium text-mirror-text">Live Events</h3>
            <span className="text-xs text-mirror-muted bg-mirror-bg px-2 py-0.5 rounded-full">
              {events.length}
            </span>
          </div>
          {newEventId && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-2 h-2 rounded-full bg-mirror-accent animate-pulse"
            />
          )}
        </div>
        
        {/* v4: Quick summary */}
        {events.length > 0 && (
          <div className="flex gap-3 mt-3 text-xs">
            {summary.focusStreaks > 0 && (
              <span className="flex items-center gap-1 text-purple-400">
                <Brain className="w-3 h-3" /> {summary.focusStreaks}
              </span>
            )}
            {summary.thinking > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Lightbulb className="w-3 h-3" /> {summary.thinking}
              </span>
            )}
            {summary.distracted > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" /> {summary.distracted}
              </span>
            )}
            {summary.energyDips > 0 && (
              <span className="flex items-center gap-1 text-indigo-400">
                <Moon className="w-3 h-3" /> {summary.energyDips}
              </span>
            )}
            {summary.yawns > 0 && (
              <span className="flex items-center gap-1 text-purple-400">
                😴 {summary.yawns}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Events list */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ maxHeight: '400px' }}
      >
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-mirror-muted text-sm"
            >
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Events will appear here</p>
              <p className="text-xs mt-1 opacity-70">
                Look-aways, focus streaks, energy dips...
              </p>
            </motion.div>
          ) : (
            events.map((event, index) => {
              const config = EVENT_CONFIG[event.type] || {
                icon: Activity,
                color: '#6b7280',
                label: event.type.replace(/_/g, ' '),
                description: ''
              }
              const Icon = config.icon
              const isNew = event.id === newEventId
              
              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    backgroundColor: isNew ? `${config.color}15` : 'transparent'
                  }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2,
                    layout: { duration: 0.2 }
                  }}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border border-transparent
                    hover:bg-mirror-bg/50 hover:border-mirror-border/50 transition-colors
                  `}
                >
                  <motion.div
                    initial={isNew ? { scale: 0.5, rotate: -10 } : { scale: 1 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: `${config.color}20`,
                      boxShadow: isNew ? `0 0 20px ${config.color}30` : 'none'
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-mirror-text truncate">
                        {config.label}
                      </p>
                      <span className="text-xs text-mirror-muted flex-shrink-0 font-mono">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-mirror-muted mt-0.5 truncate">
                      {config.description}
                      {event.duration && ` (${event.duration}s)`}
                      {event.durationSecs && ` (${formatDuration(event.durationSecs)})`}
                      {event.type && event.type.includes('LOOK_AWAY') && event.type_ && 
                        ` — ${event.type_}`
                      }
                    </p>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer hint */}
      {events.length > 0 && (
        <div className="p-3 border-t border-mirror-border text-center text-xs text-mirror-muted">
          <Lightbulb className="w-3 h-3 inline mr-1 text-amber-400" /> = thinking, 
          <AlertTriangle className="w-3 h-3 inline mx-1 text-red-400" /> = distracted
        </div>
      )}
    </div>
  )
}

function formatTime(timestamp) {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  })
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

// Compact events view for sidebar
export function EventsCompact({ events, maxEvents = 3 }) {
  const recentEvents = (events || []).slice(-maxEvents).reverse()
  
  if (recentEvents.length === 0) return null
  
  return (
    <div className="pt-3 border-t border-mirror-border/50 mt-4">
      <p className="text-xs text-mirror-muted mb-2">Recent Events</p>
      <div className="space-y-1">
        {recentEvents.map((event) => {
          const config = EVENT_CONFIG[event.type] || {
            icon: Activity,
            color: '#6b7280',
            label: event.type.replace(/_/g, ' ')
          }
          const Icon = config.icon
          
          return (
            <div key={event.id} className="flex items-center gap-2 text-xs">
              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: config.color }} />
              <span className="text-mirror-muted truncate">{config.label}</span>
              <span className="text-mirror-muted/50 ml-auto font-mono">
                {new Date(event.timestamp).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
