import React, { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, 
  BarChart3, 
  History, 
  Info,
  X,
  Shield,
  Cpu
} from 'lucide-react'

import { useWebcam } from './hooks/useWebcam'
import { useFaceDetection } from './hooks/useFaceDetection'
import { useSession } from './hooks/useSession'

import { WebcamFeed } from './components/WebcamFeed'
import { MetricRing } from './components/MetricRing'
import { ObservedMode } from './components/ObservedMode'
import { RealtimeChart } from './components/RealtimeChart'
import { SessionStats, SessionSummary } from './components/SessionStats'
import { DailyReport } from './components/DailyReport'
import { CalibrationOverlay, CalibrationPrompt } from './components/Calibration'
import { EventsTimeline, EventsCompact } from './components/EventsTimeline'
import { RoastMode, RoastToggle } from './components/RoastMode'
import { ContextModeSelector, ContextModeDisplay } from './components/ContextMode'

function App() {
  const [activeTab, setActiveTab] = useState('mirror')
  const [showInfo, setShowInfo] = useState(false)
  const [completedSession, setCompletedSession] = useState(null)
  const [showCalibrationPrompt, setShowCalibrationPrompt] = useState(false)
  const [roastModeEnabled, setRoastModeEnabled] = useState(false)

  // Webcam hook
  const { 
    videoRef, 
    isActive: isWebcamActive, 
    error: webcamError,
    startWebcam, 
    stopWebcam 
  } = useWebcam()

  // Face detection hook
  const {
    analysis,
    landmarks,
    isLoading: isModelLoading,
    clearHistory,
    beginCalibration,
    cancelCalibration,
    getAllEvents
  } = useFaceDetection(videoRef, isWebcamActive)

  // Session management hook
  const {
    session,
    isRecording,
    sessionHistory,
    readings,
    duration,
    startSession,
    stopSession,
    recordReading
  } = useSession()

  // Record readings when analysis updates
  useEffect(() => {
    if (isRecording && analysis.faceDetected) {
      recordReading({
        ...analysis,
        confidence: analysis.confidence / 100,
        focus: analysis.focus / 100,
        energy: analysis.energy / 100,
      })
    }
  }, [analysis, isRecording, recordReading])

  // Show calibration prompt when session starts and not calibrated
  useEffect(() => {
    if (isWebcamActive && !analysis.isCalibrated && !analysis.isCalibrating) {
      setShowCalibrationPrompt(true)
    }
  }, [isWebcamActive, analysis.isCalibrated, analysis.isCalibrating])

  // Handle session start
  const handleStart = useCallback(async () => {
    await startWebcam()
    await startSession()
    setCompletedSession(null)
    clearHistory()
  }, [startWebcam, startSession, clearHistory])

  // Handle session end
  const handleStop = useCallback(async () => {
    const completed = await stopSession()
    stopWebcam()
    setCompletedSession(completed)
  }, [stopSession, stopWebcam])

  // Handle calibration
  const handleStartCalibration = useCallback(() => {
    setShowCalibrationPrompt(false)
    beginCalibration()
  }, [beginCalibration])

  const handleSkipCalibration = useCallback(() => {
    setShowCalibrationPrompt(false)
    cancelCalibration()
  }, [cancelCalibration])

  const tabs = [
    { id: 'mirror', label: 'Live Mirror', icon: Eye },
    { id: 'report', label: 'Daily Report', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
  ]

  return (
    <div className="min-h-screen bg-mirror-bg">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-mirror-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-mirror-border bg-mirror-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mirror-accent to-blue-500 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-mirror-text flex items-center gap-2">
                  Self-Awareness Mirror
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-mirror-accent/20 text-mirror-accent rounded-full uppercase">
                    v5
                  </span>
                </h1>
                <p className="text-xs text-mirror-muted">Personal OS Sensor</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1 bg-mirror-bg/50 p-1 rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activeTab === tab.id 
                      ? 'bg-mirror-accent text-mirror-bg' 
                      : 'text-mirror-muted hover:text-mirror-text hover:bg-mirror-border/50'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isWebcamActive && (
                <ContextModeSelector />
              )}
              <RoastToggle 
                isEnabled={roastModeEnabled} 
                onToggle={() => setRoastModeEnabled(!roastModeEnabled)} 
              />
              <button
                onClick={() => setShowInfo(true)}
                className="p-2 rounded-lg text-mirror-muted hover:text-mirror-text hover:bg-mirror-border/50 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'mirror' && (
            <motion.div
              key="mirror"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left column - Webcam */}
              <div className="lg:col-span-2 space-y-6">
                {/* Webcam with calibration overlay */}
                <div className="relative">
                  <WebcamFeed
                    videoRef={videoRef}
                    isActive={isWebcamActive}
                    isLoading={isModelLoading}
                    error={webcamError}
                    landmarks={landmarks}
                    faceDetected={analysis.faceDetected}
                    onStart={handleStart}
                    onStop={handleStop}
                  />
                  
                  {/* Calibration overlay */}
                  <CalibrationOverlay
                    isOpen={analysis.isCalibrating}
                    progress={analysis.calibrationProgress || 0}
                    onSkip={handleSkipCalibration}
                    onComplete={() => {}}
                  />
                </div>

                {/* Calibration prompt */}
                {showCalibrationPrompt && isWebcamActive && !analysis.isCalibrated && (
                  <CalibrationPrompt
                    onStart={handleStartCalibration}
                    onSkip={handleSkipCalibration}
                  />
                )}

                {/* Roast Mode */}
                {roastModeEnabled && isWebcamActive && (
                  <div className="bg-mirror-card rounded-xl border border-mirror-danger/30 p-5">
                    <RoastMode
                      isEnabled={roastModeEnabled}
                      analysis={analysis}
                      events={analysis.events || []}
                      onToggle={() => setRoastModeEnabled(false)}
                    />
                  </div>
                )}

                {/* Realtime chart */}
                {isRecording && readings.length > 5 && (
                  <RealtimeChart readings={readings.map(r => ({
                    ...r,
                    confidence: r.confidence * 100,
                    focus: r.focus * 100,
                    energy: r.energy * 100,
                  }))} />
                )}

                {/* Session stats */}
                {(isRecording || readings.length > 0) && (
                  <SessionStats 
                    duration={duration} 
                    readings={readings}
                    isRecording={isRecording}
                  />
                )}

                {/* Completed session summary */}
                {completedSession && (
                  <SessionSummary session={completedSession} />
                )}
              </div>

              {/* Right column - Metrics */}
              <div className="space-y-6">
                {/* Live metrics */}
                <div className="bg-mirror-card rounded-xl border border-mirror-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-mirror-muted uppercase tracking-wider">
                      Live Scores
                    </h3>
                    <div className="flex items-center gap-2">
                      {analysis.contextMode && (
                        <ContextModeDisplay contextMode={analysis.contextMode} />
                      )}
                      {analysis.isCalibrated && (
                        <span className="text-xs text-mirror-accent flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-mirror-accent" />
                          Calibrated
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-around mb-4">
                    <MetricRing
                      value={analysis.focus / 100}
                      label="Focus"
                      color="#8b5cf6"
                      size={100}
                    />
                    <MetricRing
                      value={analysis.energy / 100}
                      label="Energy"
                      color="#ffb84d"
                      size={100}
                    />
                    <MetricRing
                      value={analysis.confidence / 100}
                      label="Presence"
                      color="dynamic"
                      size={100}
                    />
                  </div>
                  
                  {/* Recent events compact */}
                  <EventsCompact events={analysis.events || []} maxEvents={3} />
                </div>

                {/* Observed Mode */}
                <ObservedMode 
                  observedMode={analysis.observedMode}
                  metrics={analysis.metrics}
                  signalQuality={analysis.signalQuality}
                />

                {/* Events Timeline */}
                <EventsTimeline events={analysis.events || []} maxEvents={8} />

                {/* Privacy badge */}
                <div className="bg-mirror-accent/5 border border-mirror-accent/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-mirror-accent/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-mirror-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-mirror-text">Local Processing</p>
                      <p className="text-xs text-mirror-muted">No video stored or transmitted</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DailyReport 
                readings={readings}
                sessionHistory={sessionHistory}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-mirror-card rounded-xl border border-mirror-border p-6"
            >
              <h2 className="text-lg font-semibold text-mirror-text mb-6">Session History</h2>
              
              {sessionHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-mirror-muted mx-auto mb-4 opacity-50" />
                  <p className="text-mirror-muted">No sessions recorded yet</p>
                  <p className="text-sm text-mirror-muted/70 mt-1">
                    Start a session to begin tracking your self-awareness
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionHistory.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 bg-mirror-bg/50 rounded-xl border border-mirror-border/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-mirror-accent/20 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-mirror-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-mirror-text">
                          {new Date(session.started_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-mirror-muted">
                          {session.summary 
                            ? `${Math.round(session.summary.avgFocus * 100)}% focus • ${session.summary.duration}s duration`
                            : session.status
                          }
                        </p>
                      </div>
                      {session.summary && (
                        <div className="flex gap-4 text-center">
                          <div>
                            <p className="text-lg font-bold text-mirror-accent font-mono">
                              {Math.round(session.summary.avgConfidence * 100)}%
                            </p>
                            <p className="text-xs text-mirror-muted">Presence</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-[#8b5cf6] font-mono">
                              {Math.round(session.summary.avgFocus * 100)}%
                            </p>
                            <p className="text-xs text-mirror-muted">Focus</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-mirror-warning font-mono">
                              {Math.round(session.summary.avgEnergy * 100)}%
                            </p>
                            <p className="text-xs text-mirror-muted">Energy</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Info modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-mirror-card rounded-2xl border border-mirror-border max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mirror-accent to-blue-500 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-mirror-text">
                      AI Self-Awareness Mirror
                    </h2>
                    <p className="text-sm text-mirror-muted">v5.0 — Personal OS Sensor</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-2 rounded-lg hover:bg-mirror-border/50 transition-colors"
                >
                  <X className="w-5 h-5 text-mirror-muted" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-mirror-text">
                <p>
                  Real-time self-awareness feedback based on <strong>measurable signals</strong>, 
                  not guesswork.
                </p>
                
                <div className="bg-mirror-bg/50 rounded-xl p-4 border border-mirror-border/50">
                  <h3 className="font-semibold text-mirror-accent mb-3">How Scores Work</h3>
                  <div className="space-y-3 text-mirror-muted text-xs">
                    <div>
                      <strong className="text-mirror-text">Focus (0-100)</strong>
                      <p>Face presence %, gaze stability, head pose stability, looking-away events</p>
                    </div>
                    <div>
                      <strong className="text-mirror-text">Energy (0-100)</strong>
                      <p>Blink rate trends, eye openness (EAR), micro-movement, yawn detection</p>
                    </div>
                    <div>
                      <strong className="text-mirror-text">Presence (0-100)</strong>
                      <p>Camera engagement, head position, face visibility, posture indicators</p>
                    </div>
                  </div>
                </div>

                <div className="bg-mirror-bg/50 rounded-xl p-4 border border-mirror-border/50">
                  <h3 className="font-semibold text-purple-400 mb-3">Observed Modes</h3>
                  <p className="text-mirror-muted text-xs mb-2">
                    Not "mind reading" — behavioral states based on observable signals:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Deep Focus', 'Distracted', 'Fatigued', 'High Energy', 'Animated', 'Neutral'].map(mode => (
                      <span key={mode} className="px-2 py-1 bg-mirror-border/50 rounded text-xs text-mirror-muted">
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-mirror-accent/10 border border-mirror-accent/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-mirror-accent" />
                    <h3 className="font-semibold text-mirror-accent">Privacy First</h3>
                  </div>
                  <p className="text-mirror-muted text-xs">
                    All processing happens locally in your browser using MediaPipe.
                    No video is stored or transmitted. Only aggregated metrics are 
                    optionally saved to your database.
                  </p>
                </div>

                <div className="bg-mirror-bg/50 rounded-xl p-4 border border-mirror-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-mirror-muted" />
                    <h3 className="font-semibold text-mirror-text">v5 Features</h3>
                  </div>
                  <div className="text-mirror-muted text-xs space-y-2">
                    <p><strong className="text-mirror-text">Context Modes:</strong> Coding, Reading, Meeting, Brainstorm — each has different thresholds.</p>
                    <p><strong className="text-mirror-text">Auto-Tuning:</strong> Thresholds learn from YOUR history (P10-P90 percentiles).</p>
                    <p><strong className="text-mirror-text">Event De-dup:</strong> Cooldowns + merge logic prevent timeline spam.</p>
                    <p><strong className="text-mirror-text">Session Archetypes:</strong> "Locked In", "Fatigue Drift", "Distracted Spiral", etc.</p>
                    <p><strong className="text-mirror-text">Report Memory:</strong> Tracks last 10 reports. Varies wording if repeating same issues.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-mirror-border flex items-center justify-between">
                <p className="text-xs text-mirror-muted">
                  Built with MediaPipe, React, TailwindCSS
                </p>
                <button
                  onClick={() => setShowInfo(false)}
                  className="px-4 py-2 bg-mirror-accent text-mirror-bg rounded-lg text-sm font-medium hover:bg-mirror-accent/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
