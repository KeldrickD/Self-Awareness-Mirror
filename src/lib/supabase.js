import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Only create client if credentials are provided
const isConfigured = supabaseUrl && supabaseAnonKey
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Check if Supabase is available
export const isSupabaseConfigured = () => isConfigured

// Session management
export async function createSession() {
  if (!supabase) {
    console.log('Supabase not configured - using local-only mode')
    return null
  }

  const { data, error } = await supabase
    .from('mirror_sessions')
    .insert({
      started_at: new Date().toISOString(),
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating session:', error)
    return null
  }
  return data
}

export async function endSession(sessionId, summary) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('mirror_sessions')
    .update({
      ended_at: new Date().toISOString(),
      status: 'completed',
      summary
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error ending session:', error)
    return null
  }
  return data
}

// Readings management
export async function saveReading(sessionId, reading) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('mirror_readings')
    .insert({
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      confidence: reading.confidence,
      focus: reading.focus,
      energy: reading.energy,
      emotion: reading.emotion,
      emotion_scores: reading.emotionScores,
      face_detected: reading.faceDetected,
      raw_data: reading.rawData
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving reading:', error)
    return null
  }
  return data
}

// Get session history
export async function getSessionHistory(limit = 10) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('mirror_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching sessions:', error)
    return []
  }
  return data
}

// Get readings for a session
export async function getSessionReadings(sessionId) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('mirror_readings')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true })

  if (error) {
    console.error('Error fetching readings:', error)
    return []
  }
  return data
}

// Get daily summary
export async function getDailySummary(date) {
  if (!supabase) return null

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('mirror_sessions')
    .select(`
      *,
      mirror_readings (*)
    `)
    .gte('started_at', startOfDay.toISOString())
    .lte('started_at', endOfDay.toISOString())

  if (error) {
    console.error('Error fetching daily summary:', error)
    return null
  }
  return data
}

// Save daily report
export async function saveDailyReport(report) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('mirror_daily_reports')
    .upsert({
      date: report.date,
      peak_hours: report.peakHours,
      low_hours: report.lowHours,
      avg_confidence: report.avgConfidence,
      avg_focus: report.avgFocus,
      avg_energy: report.avgEnergy,
      dominant_emotion: report.dominantEmotion,
      insights: report.insights,
      total_sessions: report.totalSessions,
      total_duration_minutes: report.totalDurationMinutes
    }, { onConflict: 'date' })
    .select()
    .single()

  if (error) {
    console.error('Error saving daily report:', error)
    return null
  }
  return data
}

export async function getDailyReports(days = 7) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('mirror_daily_reports')
    .select('*')
    .order('date', { ascending: false })
    .limit(days)

  if (error) {
    console.error('Error fetching daily reports:', error)
    return []
  }
  return data
}

