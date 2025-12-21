import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, X, Volume2, VolumeX } from 'lucide-react'

// Roast templates based on conditions
const ROASTS = {
  look_away_frequent: [
    "You've looked away {count} times in {minutes} minutes. Be honest — YouTube or Twitter?",
    "Your eyes keep wandering. Is the screen that boring or are you?",
    "The camera can't track what it can't see. Stop dodging.",
    "If you looked at your work as much as you look away, you'd be done by now.",
  ],
  low_focus: [
    "Focus score: {score}%. Your attention span rivals a goldfish.",
    "That focus dip was visible from space. What happened?",
    "Your brain seems to be on vacation. Did it leave a forwarding address?",
    "Focus dropped to {score}%. Whatever you're thinking about better be important.",
  ],
  high_focus: [
    "Focus is elite right now. Don't break the streak.",
    "You're locked in. This is what peak performance looks like.",
    "{minutes} minutes of deep focus. Respect.",
    "Your concentration is actually impressive right now. Suspicious.",
  ],
  low_energy: [
    "Energy at {score}%. Coffee or a nap — pick one.",
    "You look like you're running on 3 hours of sleep. Are you?",
    "Those droopy eyes aren't fooling anyone. Take a break.",
    "Energy tanking. Your body is literally telling you something.",
  ],
  yawn_detected: [
    "Yawn detected. The camera saw that. We all saw that.",
    "Big yawn energy. Maybe this task isn't that urgent after all.",
    "That yawn was so wide I could count your teeth.",
  ],
  low_confidence: [
    "Confidence at {score}%. Sit up, you're better than this posture suggests.",
    "You're hiding from the camera. The camera knows.",
    "Head down, eyes avoiding — this isn't your best look.",
    "Camera presence could use work. Pretend someone important is watching.",
  ],
  focus_streak: [
    "{minutes} minute focus streak! You're actually doing it.",
    "Streak intact. Don't you dare look at your phone.",
    "This is the longest you've focused today. Keep going.",
  ],
  distracted_mode: [
    "Mode: Distracted. At least the algorithm is honest.",
    "You've entered 'Distracted' mode. Own it or fix it.",
    "The system classified you as distracted. Fight back.",
  ],
  comeback: [
    "Welcome back. The camera missed you. (Not really.)",
    "Face detected again. Let's pretend that break was intentional.",
    "Oh, you're back? Thought you left for good.",
  ]
}

function getRandomRoast(category, params = {}) {
  const templates = ROASTS[category]
  if (!templates || templates.length === 0) return null
  
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  // Replace placeholders with actual values
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match
  })
}

export function RoastMode({ 
  isEnabled, 
  analysis, 
  events,
  onToggle 
}) {
  const [currentRoast, setCurrentRoast] = useState(null)
  const [roastHistory, setRoastHistory] = useState([])
  const [lastRoastTime, setLastRoastTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  
  const ROAST_COOLDOWN = 15000 // 15 seconds between roasts
  
  useEffect(() => {
    if (!isEnabled || !analysis) return
    
    const now = Date.now()
    if (now - lastRoastTime < ROAST_COOLDOWN) return
    
    let newRoast = null
    
    // Check conditions and generate appropriate roast
    if (analysis.focus < 50 && analysis.observedMode?.mode === 'distracted') {
      newRoast = getRandomRoast('low_focus', { score: analysis.focus })
    } else if (analysis.focus >= 85 && analysis.metrics?.focusStreakMs > 300000) {
      // 5+ minute focus streak
      const minutes = Math.round(analysis.metrics.focusStreakMs / 60000)
      newRoast = getRandomRoast('high_focus', { minutes })
    } else if (analysis.energy < 45) {
      newRoast = getRandomRoast('low_energy', { score: analysis.energy })
    } else if (analysis.confidence < 45) {
      newRoast = getRandomRoast('low_confidence', { score: analysis.confidence })
    }
    
    // Check events for specific triggers
    const recentEvents = events.filter(e => now - e.timestamp < 30000)
    const lookAwayCount = recentEvents.filter(e => e.type === 'look_away').length
    
    if (lookAwayCount >= 3) {
      newRoast = getRandomRoast('look_away_frequent', { 
        count: lookAwayCount, 
        minutes: 2 
      })
    }
    
    const yawnEvent = recentEvents.find(e => e.type === 'yawn')
    if (yawnEvent) {
      newRoast = getRandomRoast('yawn_detected', {})
    }
    
    if (newRoast && newRoast !== currentRoast) {
      setCurrentRoast(newRoast)
      setLastRoastTime(now)
      setRoastHistory(prev => [...prev.slice(-9), { 
        text: newRoast, 
        timestamp: now 
      }])
    }
  }, [analysis, events, isEnabled, lastRoastTime, currentRoast])
  
  if (!isEnabled) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 bg-mirror-danger/10 border border-mirror-danger/30 rounded-lg text-sm text-mirror-danger hover:bg-mirror-danger/20 transition-colors"
      >
        <Flame className="w-4 h-4" />
        Enable Roast Mode
      </button>
    )
  }
  
  return (
    <div className="space-y-3">
      {/* Roast Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-mirror-danger animate-pulse" />
          <span className="text-sm font-medium text-mirror-danger">Roast Mode Active</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg hover:bg-mirror-border/50 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-mirror-muted" />
            ) : (
              <Volume2 className="w-4 h-4 text-mirror-muted" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-mirror-border/50 transition-colors"
          >
            <X className="w-4 h-4 text-mirror-muted" />
          </button>
        </div>
      </div>
      
      {/* Current Roast */}
      <AnimatePresence mode="wait">
        {currentRoast && (
          <motion.div
            key={currentRoast}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-gradient-to-r from-mirror-danger/20 to-orange-500/10 border border-mirror-danger/40 rounded-xl p-4"
          >
            <p className="text-sm text-mirror-text font-medium leading-relaxed">
              "{currentRoast}"
            </p>
            <p className="text-xs text-mirror-danger/70 mt-2 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Roast Mode
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Roast History (collapsed) */}
      {roastHistory.length > 1 && (
        <details className="group">
          <summary className="text-xs text-mirror-muted cursor-pointer hover:text-mirror-text">
            Previous roasts ({roastHistory.length - 1})
          </summary>
          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
            {roastHistory.slice(0, -1).reverse().map((roast, i) => (
              <p key={i} className="text-xs text-mirror-muted/70 italic pl-3 border-l border-mirror-border">
                "{roast.text}"
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export function RoastToggle({ isEnabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${isEnabled 
          ? 'bg-mirror-danger/20 text-mirror-danger border border-mirror-danger/40' 
          : 'bg-mirror-border/50 text-mirror-muted hover:text-mirror-text border border-transparent'
        }
      `}
    >
      <Flame className={`w-4 h-4 ${isEnabled ? 'animate-pulse' : ''}`} />
      {isEnabled ? 'Roast Mode ON' : 'Roast Mode'}
    </button>
  )
}

