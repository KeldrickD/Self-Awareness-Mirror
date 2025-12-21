-- AI Self-Awareness Mirror Schema
-- Run this in the Supabase SQL Editor if auto-migration fails

-- Sessions table
CREATE TABLE IF NOT EXISTS mirror_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Readings table (individual data points)
CREATE TABLE IF NOT EXISTS mirror_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mirror_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  focus REAL NOT NULL CHECK (focus >= 0 AND focus <= 1),
  energy REAL NOT NULL CHECK (energy >= 0 AND energy <= 1),
  emotion TEXT NOT NULL DEFAULT 'neutral',
  emotion_scores JSONB,
  face_detected BOOLEAN NOT NULL DEFAULT true,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily reports table
CREATE TABLE IF NOT EXISTS mirror_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  peak_hours JSONB,
  low_hours JSONB,
  avg_confidence REAL,
  avg_focus REAL,
  avg_energy REAL,
  dominant_emotion TEXT,
  insights JSONB,
  total_sessions INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_readings_session_id ON mirror_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON mirror_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON mirror_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON mirror_daily_reports(date);

-- Enable Row Level Security
ALTER TABLE mirror_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirror_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mirror_daily_reports ENABLE ROW LEVEL SECURITY;

-- Policies for public access (since this is a personal tool)
-- In production, you'd want user authentication
CREATE POLICY "Allow public access to sessions" ON mirror_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to readings" ON mirror_readings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to daily reports" ON mirror_daily_reports
  FOR ALL USING (true) WITH CHECK (true);

