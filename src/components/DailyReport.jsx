import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Sun,
  Moon,
  Coffee,
  Target,
  ChevronLeft,
  ChevronRight,
  FileText,
  Zap,
  Eye,
  AlertTriangle,
  Lightbulb,
  Brain,
  Activity,
  Signal,
  Award,
  Repeat
} from 'lucide-react'
import { format, subDays, addDays, isToday } from 'date-fns'
import { generateDailyReport, getEvents, getReportMemory } from '../lib/faceAnalysis'

// Archetype icons
const ARCHETYPE_ICONS = {
  locked_in: Target,
  choppy_focus: Activity,
  fatigue_drift: Moon,
  restless_sprint: Zap,
  distracted_spiral: AlertTriangle,
  low_signal: Signal,
  steady_state: Sun,
}

export function DailyReport({ readings, sessionHistory }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  const report = useMemo(() => generateDailyReport(), [readings])
  const reportMemory = getReportMemory()
  const isSelectedToday = isToday(selectedDate)

  // Check if repeating pattern
  const isRepeatPattern = reportMemory.length > 1 && 
    reportMemory[reportMemory.length - 2]?.highestDriver === report?.highestDriver

  // Blunt feedback generator
  const generateBluntFeedback = () => {
    if (!report.stats || report.stats.totalMinutes < 1) return []
    
    const feedback = []
    const { avgFocus, avgEnergy, avgConfidence, focusStreaks, distractionBlocks, 
            thinkingLookAways, distractedLookAways, yawns, avgSignalQuality, contextMode } = report.stats
    
    // Context mode mention
    if (contextMode) {
      feedback.push({
        type: 'info',
        icon: Brain,
        message: `Scored in "${contextMode}" mode. Thresholds adjusted accordingly.`
      })
    }
    
    // Focus feedback
    if (avgFocus >= 80) {
      feedback.push({
        type: 'positive',
        icon: Target,
        message: "Laser focus. You were locked in."
      })
    } else if (avgFocus >= 60) {
      feedback.push({
        type: 'neutral',
        icon: Eye,
        message: `Focus at ${avgFocus}%. ${distractionBlocks || 0} distraction block(s) detected.`
      })
    } else {
      feedback.push({
        type: 'negative',
        icon: AlertTriangle,
        message: `Focus struggled at ${avgFocus}%. What kept pulling your attention?`
      })
    }
    
    // Thinking vs distracted
    if (thinkingLookAways > 0 || distractedLookAways > 0) {
      if (thinkingLookAways > distractedLookAways) {
        feedback.push({
          type: 'positive',
          icon: Lightbulb,
          message: `${thinkingLookAways} thinking look-away(s) vs ${distractedLookAways} distracted. Mind working, not wandering.`
        })
      } else if (distractedLookAways > 2) {
        feedback.push({
          type: 'negative',
          icon: Activity,
          message: `${distractedLookAways} distracted look-away(s). Quick glances = notifications pulling you.`
        })
      }
    }
    
    // Energy
    if (avgEnergy >= 75) {
      feedback.push({
        type: 'positive',
        icon: Zap,
        message: "High energy throughout. Well rested."
      })
    } else if (avgEnergy >= 55) {
      feedback.push({
        type: 'neutral',
        icon: Coffee,
        message: `Energy at ${avgEnergy}%. ${yawns > 0 ? `${yawns} yawn(s).` : 'Steady but not peak.'}`
      })
    } else {
      feedback.push({
        type: 'negative',
        icon: Moon,
        message: `Running on empty (${avgEnergy}%). Prioritize rest.`
      })
    }
    
    // Repeat pattern warning
    if (isRepeatPattern) {
      feedback.push({
        type: 'warning',
        icon: Repeat,
        message: `Same issue as last session. This is becoming a pattern.`
      })
    }
    
    return feedback
  }
  
  const feedback = generateBluntFeedback()

  return (
    <div className="bg-mirror-card rounded-xl border border-mirror-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-mirror-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mirror-accent/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-mirror-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-mirror-text">Daily Report</h2>
              <p className="text-sm text-mirror-muted">v5 with archetypes + memory</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="p-2 rounded-lg hover:bg-mirror-border/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-mirror-muted" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-mirror-bg/50 rounded-lg">
              <Calendar className="w-4 h-4 text-mirror-muted" />
              <span className="text-sm font-medium text-mirror-text">
                {isSelectedToday ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              disabled={isSelectedToday}
              className="p-2 rounded-lg hover:bg-mirror-border/50 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-mirror-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {!report.stats || report.stats.totalMinutes < 1 ? (
          <div className="text-center py-12">
            <Moon className="w-12 h-12 text-mirror-muted mx-auto mb-4 opacity-50" />
            <p className="text-mirror-muted">No data for this day</p>
            <p className="text-sm text-mirror-muted/70 mt-1">
              Start a session to begin tracking
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* v5: Session Archetype Card */}
            {report.archetype && (
              <SessionArchetypeCard archetype={report.archetype} />
            )}

            {/* Overview stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard 
                label="Focus" 
                value={report.stats.avgFocus} 
                unit="%" 
                color={report.stats.avgFocus >= 70 ? '#00d4aa' : report.stats.avgFocus >= 50 ? '#ffb84d' : '#ff5c5c'}
              />
              <StatCard 
                label="Energy" 
                value={report.stats.avgEnergy} 
                unit="%" 
                color={report.stats.avgEnergy >= 70 ? '#00d4aa' : report.stats.avgEnergy >= 50 ? '#ffb84d' : '#ff5c5c'}
              />
              <StatCard 
                label="Presence" 
                value={report.stats.avgConfidence} 
                unit="%" 
                color={report.stats.avgConfidence >= 70 ? '#00d4aa' : report.stats.avgConfidence >= 50 ? '#ffb84d' : '#ff5c5c'}
              />
              <StatCard 
                label="Duration" 
                value={report.stats.totalMinutes} 
                unit="min" 
                color="#8b5cf6"
              />
            </div>

            {/* Driver Analysis */}
            {report.drivers && (
              <div className="bg-mirror-bg/50 rounded-xl border border-mirror-border/50 p-4">
                <h4 className="text-xs font-medium text-mirror-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Brain className="w-3 h-3" />
                  Driver Analysis
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <DriverBar 
                    label="Distraction" 
                    value={report.drivers.distraction} 
                    color="#ffb84d"
                    icon={Activity}
                  />
                  <DriverBar 
                    label="Fatigue" 
                    value={report.drivers.fatigue} 
                    color="#6366f1"
                    icon={Moon}
                  />
                  <DriverBar 
                    label="Restlessness" 
                    value={report.drivers.restlessness} 
                    color="#f472b6"
                    icon={Zap}
                  />
                </div>
                {report.driverExplanation && (
                  <p className="text-xs text-mirror-muted mt-3 pt-3 border-t border-mirror-border/50">
                    {report.driverExplanation}
                  </p>
                )}
              </div>
            )}

            {/* Summary insights */}
            {report.summary && report.summary.length > 0 && (
              <div className="bg-mirror-bg/50 rounded-xl border border-mirror-border/50 p-4">
                <h4 className="text-xs font-medium text-mirror-muted uppercase tracking-wider mb-3">
                  Key Findings
                </h4>
                <ul className="space-y-2">
                  {report.summary.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-mirror-text">
                      <span className="text-mirror-accent mt-0.5">•</span>
                      <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Blunt feedback */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-mirror-muted uppercase tracking-wider">
                Honest Assessment
              </h4>
              <AnimatePresence>
                {feedback.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      flex items-start gap-3 p-4 rounded-xl border
                      ${item.type === 'positive' 
                        ? 'bg-mirror-accent/10 border-mirror-accent/30' 
                        : item.type === 'negative'
                        ? 'bg-mirror-danger/10 border-mirror-danger/30'
                        : item.type === 'warning'
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-mirror-warning/10 border-mirror-warning/30'
                      }
                    `}
                  >
                    <item.icon className={`
                      w-5 h-5 mt-0.5 flex-shrink-0
                      ${item.type === 'positive' 
                        ? 'text-mirror-accent' 
                        : item.type === 'negative'
                        ? 'text-mirror-danger'
                        : item.type === 'warning'
                        ? 'text-orange-400'
                        : 'text-mirror-warning'
                      }
                    `} />
                    <p className="text-sm text-mirror-text leading-relaxed">
                      {item.message}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Recommendation */}
            {report.recommendation && (
              <div className="bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-purple-500 p-4 rounded-r-xl">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-1">
                      One Action
                    </p>
                    <p className="text-sm text-mirror-text">
                      {report.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quote */}
            <div className="bg-gradient-to-r from-mirror-accent/5 to-transparent border-l-2 border-mirror-accent p-4 rounded-r-xl">
              <p className="text-sm text-mirror-text italic">
                {generateSummaryQuote(report.stats, report.drivers, report.archetype, isRepeatPattern)}
              </p>
              <p className="text-xs text-mirror-muted mt-2">— Your AI Mirror (v5)</p>
            </div>

            {/* Report history count */}
            {reportMemory.length > 1 && (
              <div className="text-center text-xs text-mirror-muted">
                Report #{reportMemory.length} • {reportMemory.length} sessions in memory
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionArchetypeCard({ archetype }) {
  const Icon = ARCHETYPE_ICONS[archetype.label?.toLowerCase().replace(/ /g, '_')] || Award
  
  const colorMap = {
    'Locked In': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    'Choppy Focus': 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    'Fatigue Drift': 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30',
    'Restless Sprint': 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    'Distracted Spiral': 'from-red-500/20 to-red-500/5 border-red-500/30',
    'Low Signal': 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
    'Steady State': 'from-gray-500/20 to-gray-500/5 border-gray-500/30',
  }
  
  const colors = colorMap[archetype.label] || colorMap['Steady State']
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${colors} border rounded-xl p-5`}
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl">{archetype.emoji}</div>
        <div>
          <h3 className="text-lg font-bold text-mirror-text">{archetype.label}</h3>
          <p className="text-sm text-mirror-muted">{archetype.description}</p>
        </div>
        <div className="ml-auto">
          <Award className="w-8 h-8 text-mirror-muted/30" />
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="bg-mirror-bg/50 rounded-xl p-3 text-center border border-mirror-border/50">
      <p 
        className="text-2xl font-bold font-mono"
        style={{ color }}
      >
        {value}<span className="text-sm font-normal text-mirror-muted">{unit}</span>
      </p>
      <p className="text-xs text-mirror-muted mt-1 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function DriverBar({ label, value, color, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-xs text-mirror-muted">{label}</span>
        <span className="text-xs font-mono ml-auto" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-mirror-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}

function generateSummaryQuote(stats, drivers, archetype, isRepeat) {
  if (!stats) return "Start a session to get your personalized assessment."
  
  const { avgFocus, avgEnergy, totalMinutes } = stats
  
  // Use archetype for the main quote
  if (archetype) {
    if (archetype.label === 'Locked In') {
      return `${totalMinutes} minutes of deep work. This is your A-game.`
    }
    if (archetype.label === 'Fatigue Drift') {
      return `Started strong, faded after ${Math.round(totalMinutes/2)} minutes. Next time, break earlier.`
    }
    if (archetype.label === 'Distracted Spiral') {
      if (isRepeat) {
        return `Distraction again. What's different about your focused days?`
      }
      return `${totalMinutes} minutes, but attention kept slipping. Environment check needed.`
    }
    if (archetype.label === 'Restless Sprint') {
      return `High energy, lots of movement. Channel that into a standing session next time.`
    }
    if (archetype.label === 'Choppy Focus') {
      return `Good moments mixed with dips. Try longer uninterrupted blocks.`
    }
  }
  
  // Fallback to driver-based
  if (drivers) {
    const highestDriver = Object.entries(drivers).sort((a, b) => b[1] - a[1])[0]
    if (highestDriver[1] > 30) {
      const [name, score] = highestDriver
      if (name === 'fatigue') {
        return `Fatigue at ${score}%. Your body is telling you something.`
      } else if (name === 'distraction') {
        return `Distraction at ${score}%. The environment wins if you don't control it.`
      }
    }
  }
  
  return `${totalMinutes} minutes tracked. Focus ${avgFocus}%, Energy ${avgEnergy}%. Steady progress.`
}
