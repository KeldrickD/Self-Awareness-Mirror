import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  createSession, 
  endSession, 
  saveReading, 
  getSessionHistory,
  saveDailyReport 
} from '../lib/supabase'
import { generateInsights } from '../lib/faceAnalysis'

export function useSession() {
  const [session, setSession] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionHistory, setSessionHistory] = useState([])
  const [readings, setReadings] = useState([])
  const [duration, setDuration] = useState(0)
  
  const saveIntervalRef = useRef(null)
  const durationIntervalRef = useRef(null)
  const pendingReadings = useRef([])
  const startTimeRef = useRef(null)

  // Load session history on mount
  useEffect(() => {
    loadSessionHistory()
  }, [])

  const loadSessionHistory = async () => {
    const history = await getSessionHistory(20)
    setSessionHistory(history || [])
  }

  const startSession = useCallback(async () => {
    // Create session in Supabase (or local if no connection)
    const newSession = await createSession()
    
    if (newSession) {
      setSession(newSession)
    } else {
      // Fallback to local session
      setSession({
        id: `local-${Date.now()}`,
        started_at: new Date().toISOString(),
        status: 'active'
      })
    }

    setIsRecording(true)
    setReadings([])
    setDuration(0)
    startTimeRef.current = Date.now()
    pendingReadings.current = []

    // Start duration counter
    durationIntervalRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Start periodic save (every 5 seconds)
    saveIntervalRef.current = setInterval(async () => {
      if (pendingReadings.current.length > 0 && session?.id) {
        const toSave = [...pendingReadings.current]
        pendingReadings.current = []

        // Batch save readings (average them to reduce storage)
        const averaged = {
          confidence: toSave.reduce((a, r) => a + r.confidence, 0) / toSave.length,
          focus: toSave.reduce((a, r) => a + r.focus, 0) / toSave.length,
          energy: toSave.reduce((a, r) => a + r.energy, 0) / toSave.length,
          emotion: toSave[Math.floor(toSave.length / 2)]?.emotion || 'neutral',
          emotionScores: toSave[Math.floor(toSave.length / 2)]?.emotionScores || {},
          faceDetected: toSave.some(r => r.faceDetected)
        }

        await saveReading(session.id, averaged)
      }
    }, 5000)
  }, [session])

  const recordReading = useCallback((analysis) => {
    if (!isRecording) return

    const reading = {
      ...analysis,
      timestamp: Date.now()
    }

    // Add to local state
    setReadings(prev => {
      const updated = [...prev, reading]
      // Keep last 1000 readings in memory
      return updated.slice(-1000)
    })

    // Queue for database save
    pendingReadings.current.push(reading)
  }, [isRecording])

  const stopSession = useCallback(async () => {
    // Clear intervals
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current)
      saveIntervalRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    setIsRecording(false)

    if (!session) return null

    // Generate summary
    const insights = generateInsights(readings)
    const avgConfidence = readings.length > 0 
      ? readings.reduce((a, r) => a + r.confidence, 0) / readings.length 
      : 0
    const avgFocus = readings.length > 0 
      ? readings.reduce((a, r) => a + r.focus, 0) / readings.length 
      : 0
    const avgEnergy = readings.length > 0 
      ? readings.reduce((a, r) => a + r.energy, 0) / readings.length 
      : 0

    const summary = {
      duration: duration,
      totalReadings: readings.length,
      avgConfidence,
      avgFocus,
      avgEnergy,
      insights
    }

    // Save to Supabase
    if (session.id && !session.id.startsWith('local-')) {
      await endSession(session.id, summary)
      
      // Save pending readings
      if (pendingReadings.current.length > 0) {
        const averaged = {
          confidence: pendingReadings.current.reduce((a, r) => a + r.confidence, 0) / pendingReadings.current.length,
          focus: pendingReadings.current.reduce((a, r) => a + r.focus, 0) / pendingReadings.current.length,
          energy: pendingReadings.current.reduce((a, r) => a + r.energy, 0) / pendingReadings.current.length,
          emotion: pendingReadings.current[Math.floor(pendingReadings.current.length / 2)]?.emotion || 'neutral',
          emotionScores: {},
          faceDetected: true
        }
        await saveReading(session.id, averaged)
      }
    }

    pendingReadings.current = []

    // Reload history
    await loadSessionHistory()

    const completedSession = {
      ...session,
      summary,
      ended_at: new Date().toISOString()
    }

    setSession(null)
    
    return completedSession
  }, [session, duration, readings])

  const generateDailyReport = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's readings from all sessions
    const todaysSessions = sessionHistory.filter(s => 
      s.started_at?.startsWith(today)
    )

    if (todaysSessions.length === 0) {
      return null
    }

    // Aggregate data
    const allReadings = readings // Current session + would need to fetch from DB
    
    const report = {
      date: today,
      peakHours: [], // Would calculate from readings timestamps
      lowHours: [],
      avgConfidence: readings.length > 0 
        ? readings.reduce((a, r) => a + r.confidence, 0) / readings.length 
        : 0,
      avgFocus: readings.length > 0 
        ? readings.reduce((a, r) => a + r.focus, 0) / readings.length 
        : 0,
      avgEnergy: readings.length > 0 
        ? readings.reduce((a, r) => a + r.energy, 0) / readings.length 
        : 0,
      dominantEmotion: 'neutral',
      insights: generateInsights(readings),
      totalSessions: todaysSessions.length + (session ? 1 : 0),
      totalDurationMinutes: Math.floor(duration / 60)
    }

    await saveDailyReport(report)
    return report
  }, [readings, sessionHistory, session, duration])

  return {
    session,
    isRecording,
    sessionHistory,
    readings,
    duration,
    startSession,
    stopSession,
    recordReading,
    generateDailyReport
  }
}

