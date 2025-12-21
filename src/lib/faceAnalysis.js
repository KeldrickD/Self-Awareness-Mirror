/**
 * Face Analysis Engine v5.0
 * Personal Reliability: Auto-tuning + Event De-dup + Context Modes + Session Archetypes
 * 
 * Key v5 features:
 * - Event merge + cooldowns (no spam)
 * - Context modes (Coding, Reading, Meeting, Brainstorming)
 * - Auto-threshold tuning from your history
 * - Session archetype classification
 * - Non-repetitive reports with memory
 */

// ============================================================
// CONSTANTS & LANDMARK INDICES
// ============================================================

const LANDMARKS = {
  LEFT_EYE: { inner: 133, outer: 33, upper: 159, lower: 145 },
  RIGHT_EYE: { inner: 362, outer: 263, upper: 386, lower: 374 },
  LEFT_IRIS: { center: 468, right: 469, top: 470, left: 471, bottom: 472 },
  RIGHT_IRIS: { center: 473, right: 474, top: 475, left: 476, bottom: 477 },
  MOUTH: { upper: 13, lower: 14, left: 78, right: 308 },
  NOSE_TIP: 1,
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
}

// v5: Context-aware weight adjustments
const CONTEXT_MODES = {
  coding: {
    label: 'Coding',
    emoji: '💻',
    weights: {
      // Focus: stability matters more, away-thinking tolerated
      focus: { face: 0.30, away: 0.25, head: 0.25, gaze: 0.20 },
      // Energy: normal
      energy: { ear: 0.40, blink: 0.25, motion: 0.20, yawn: 0.15 },
      // Confidence: less important
      confidence: { face: 0.20, engage: 0.20, down: 0.25, far: 0.20, voice: 0.15 },
    },
    thresholdMods: {
      lookAwayThinkingTrigger: 5, // Longer tolerance (5s instead of 3s)
      distractionTrigger: 45, // Longer before distraction block
      restlessnessMultiplier: 0.7, // Less penalty for fidgeting
    }
  },
  reading: {
    label: 'Reading',
    emoji: '📖',
    weights: {
      focus: { face: 0.35, away: 0.35, head: 0.15, gaze: 0.15 },
      energy: { ear: 0.45, blink: 0.20, motion: 0.20, yawn: 0.15 },
      confidence: { face: 0.25, engage: 0.25, down: 0.20, far: 0.15, voice: 0.15 },
    },
    thresholdMods: {
      lookAwayThinkingTrigger: 4,
      distractionTrigger: 30,
      restlessnessMultiplier: 1.0,
    }
  },
  meeting: {
    label: 'Meeting',
    emoji: '🎙️',
    weights: {
      // Confidence matters most
      focus: { face: 0.40, away: 0.40, head: 0.10, gaze: 0.10 },
      energy: { ear: 0.35, blink: 0.25, motion: 0.25, yawn: 0.15 },
      confidence: { face: 0.30, engage: 0.30, down: 0.15, far: 0.10, voice: 0.15 },
    },
    thresholdMods: {
      lookAwayThinkingTrigger: 2, // Shorter tolerance
      distractionTrigger: 20, // Stricter
      restlessnessMultiplier: 1.2, // More penalty
    }
  },
  brainstorm: {
    label: 'Brainstorm',
    emoji: '🧠',
    weights: {
      // Very relaxed - movement and looking away is fine
      focus: { face: 0.25, away: 0.20, head: 0.30, gaze: 0.25 },
      energy: { ear: 0.40, blink: 0.25, motion: 0.15, yawn: 0.20 },
      confidence: { face: 0.20, engage: 0.15, down: 0.25, far: 0.25, voice: 0.15 },
    },
    thresholdMods: {
      lookAwayThinkingTrigger: 8, // Very tolerant
      distractionTrigger: 60, // Very relaxed
      restlessnessMultiplier: 0.5, // Movement is fine
    }
  }
}

// v5: Event cooldowns (seconds)
const EVENT_COOLDOWNS = {
  LOOK_AWAY_THINKING: 5,
  LOOK_AWAY_DISTRACTED: 5,
  YAWN: 20,
  LOW_SIGNAL: 10,
  ENERGY_DIP: 60,
  FACE_LOST: 3,
}

// v5: Session archetypes
const SESSION_ARCHETYPES = {
  locked_in: { label: 'Locked In', emoji: '🎯', description: 'Deep work achieved' },
  choppy_focus: { label: 'Choppy Focus', emoji: '📊', description: 'Good periods, but fragmented' },
  fatigue_drift: { label: 'Fatigue Drift', emoji: '😴', description: 'Started strong, faded' },
  restless_sprint: { label: 'Restless Sprint', emoji: '⚡', description: 'High energy but fidgety' },
  distracted_spiral: { label: 'Distracted Spiral', emoji: '🌀', description: 'Attention pulled away' },
  low_signal: { label: 'Low Signal', emoji: '📡', description: 'Tracking unreliable' },
  steady_state: { label: 'Steady State', emoji: '⚖️', description: 'Consistent baseline' },
}

const CONFIG = {
  BLINK_MIN_FRAMES: 2,
  YAWN_DURATION_MS: 1000,
  EAR_THRESH_DEFAULT: 0.18,
  MAR_THRESH_DEFAULT: 0.40,
  GAZE_OFF_THRESH_DEFAULT: 0.08,
  EMA_ALPHA_NORMAL: 0.2,
  EMA_ALPHA_LOW_SIGNAL: 0.05,
  DRIFT_ALPHA: 0.005,
  SIGNAL_QUALITY_MIN: 50,
  
  // v5: Event merge window (seconds)
  EVENT_MERGE_WINDOW: 1.5,
  TOGGLE_SPAM_THRESHOLD: 3, // Must toggle 3+ times in 30s to count
  TOGGLE_SPAM_WINDOW: 30,
  
  EVENTS: {
    FACE_LOST_TRIGGER: 2,
    FACE_LOST_RECOVER: 1,
    LOOK_AWAY_TRIGGER: 1,
    LOOK_AWAY_THINKING_TRIGGER: 3,
    LOOK_AWAY_RECOVER: 1,
    LOOK_AWAY_RATIO_HIGH: 0.60,
    LOOK_AWAY_RATIO_LOW: 0.25,
    FOCUS_STREAK_TRIGGER: 120,
    FOCUS_STREAK_THRESHOLD: 85,
    FOCUS_STREAK_BREAK_THRESHOLD: 70,
    FOCUS_STREAK_BREAK_DURATION: 10,
    DISTRACTION_TRIGGER: 30,
    DISTRACTION_THRESHOLD: 55,
    DISTRACTION_RECOVER_THRESHOLD: 70,
    DISTRACTION_RECOVER_DURATION: 15,
    ENERGY_DIP_TRIGGER: 120,
    ENERGY_DIP_DELTA: 15,
    CONF_DROP_THRESHOLD: 12,
    CONF_DROP_DURATION: 20,
  }
}

// ============================================================
// STATE
// ============================================================

// v5: Current context mode
let currentContextMode = 'coding' // Default

// v5: Auto-tuned thresholds (learned from history)
let autoTunedThresholds = {
  blinkRate: { low: 10, high: 25, normal: 15 },
  gazeTolerance: { normal: 0.08, extended: 0.12 },
  headJitter: { normal: 0.02, high: 0.05 },
  earDrop: { mild: 0.08, fatigue: 0.20 },
}

// v5: Historical data for auto-tuning
let historyBuffer = {
  blinkRates: [],
  gazeMotions: [],
  headMotions: [],
  earValues: [],
  maxSamples: 3600, // ~1 hour at 1Hz
}

// v5: Event cooldown tracking
let eventCooldowns = {}

// v5: Toggle tracking for spam detection
let awayToggleBuffer = [] // timestamps of toggles

// v5: Report memory (last N reports)
let reportMemory = []
const REPORT_MEMORY_MAX = 10

let calibration = {
  isCalibrated: false,
  isCalibrating: false,
  phase: null,
  phaseStart: null,
  rawData: {
    phaseA: { EAR: [], headMotion: [], gazeMotion: [], faceSize: [], headDown: [], gazeProxy: [], headYaw: [] },
    phaseB: { gazeProxy: [], headYaw: [] },
    phaseC: {},
  },
  baseline: {
    EAR_base: 0.25,
    EAR_sd: 0.03,
    blink_rate_base: 15,
    head_jitter_base: 0.02,
    gaze_jitter_base: 0.02,
    gaze_center: 0,
    gaze_off_threshold: CONFIG.GAZE_OFF_THRESH_DEFAULT,
    face_size_base: 0.25,
    down_head_base: 0,
    head_yaw_base: 0,
    head_yaw_off_threshold: 0.15,
    filler_rate_base: 0,
    EAR_thresh: CONFIG.EAR_THRESH_DEFAULT,
    MAR_thresh: CONFIG.MAR_THRESH_DEFAULT,
  }
}

let frameBuffer = {
  totalFrames: 0,
  awayFrames: 0,
  facePresentFrames: 0,
  EAR_values: [],
  headMotion_values: [],
  gazeMotion_values: [],
  yawnFrames: 0,
  MAR_values: [],
  faceSize_values: [],
  headDown_values: [],
  gazeProxy_values: [],
  headYaw_values: [],
  irisAvailable: false,
  awayToggleCount: 0,
  lastAwayState: false,
}

let secondMetrics = []
const SECOND_METRICS_MAX = 600

let blinkState = {
  timestamps: [],
  isInBlink: false,
  lowEARFrames: 0,
}

let yawnState = {
  highMARStart: null,
  isYawning: false,
}

let prevFrame = {
  noseTip: null,
  gazeProxy: null,
  timestamp: null,
  headYaw: null,
}

let scores = {
  focus: 75,
  energy: 75,
  confidence: 75,
}

let signalQuality = {
  Q_face: 1,
  Q_light: 1,
  Q_stability: 1,
  Q_total: 100,
}

let eventState = {
  faceLostSecs: 0,
  faceLostActive: false,
  facePresentRecoverSecs: 0,
  
  lookAwaySecs: 0,
  lookAwayActive: false,
  lookAwayType: null,
  lookAwayRecoverSecs: 0,
  lookAwayStart: null, // v5: for merging
  
  focusHiSecs: 0,
  focusStreakActive: false,
  focusBreakSecs: 0,
  focusStreakStart: null,
  
  focusLowSecs: 0,
  distractionActive: false,
  distractionRecoverSecs: 0,
  distractionStart: null,
  
  energyDipSecs: 0,
  energyDipActive: false,
  energyDipStart: null,
  
  confDropSecs: 0,
  confSpeechDropActive: false,
}

let driverStats = {
  totalSeconds: 0,
  lookAwayDistractedSecs: 0,
  lookAwayThinkingSecs: 0,
  awayToggleCount: 0,
  energyDipSecs: 0,
  yawnCount: 0,
  earDropSecs: 0,
  highJitterSecs: 0,
  // v5: Additional for archetype
  focusAbove80Secs: 0,
  focusBelow55Secs: 0,
  energyAbove70Secs: 0,
  energyBelow50Secs: 0,
  lowSignalSecs: 0,
}

let events = []
const EVENTS_MAX = 200

let lastSecondTick = null
let sessionStart = null

let headMotionEMA = 0
let gazeMotionEMA = 0

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function dist(p1, p2) {
  if (!p1 || !p2) return 0
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x))
}

function penalty(x, lo, hi) {
  if (hi <= lo) return 0
  return clamp((x - lo) / (hi - lo), 0, 1)
}

function ema(prev, curr, alpha) {
  return (1 - alpha) * prev + alpha * curr
}

function median(arr) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mean(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdDev(arr) {
  if (arr.length < 2) return 0
  const avg = mean(arr)
  return Math.sqrt(mean(arr.map(v => (v - avg) ** 2)))
}

function percentile(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * p / 100)
  return sorted[Math.min(idx, sorted.length - 1)]
}

// v5: Check if event is on cooldown
function isOnCooldown(eventType) {
  const cooldown = EVENT_COOLDOWNS[eventType.replace('_START', '').replace('_END', '')]
  if (!cooldown) return false
  
  const lastTime = eventCooldowns[eventType]
  if (!lastTime) return false
  
  return (Date.now() - lastTime) < cooldown * 1000
}

// v5: Set cooldown for event
function setCooldown(eventType) {
  eventCooldowns[eventType] = Date.now()
}

// v5: Add event with de-dup logic
function addEvent(type, timestamp, meta = {}) {
  // Check cooldown
  if (isOnCooldown(type)) {
    return null
  }
  
  // Check for merge with recent event
  const recentEvents = events.slice(-5)
  const mergeCandidate = recentEvents.find(e => 
    e.type === type && 
    (timestamp - e.timestamp) < CONFIG.EVENT_MERGE_WINDOW * 1000
  )
  
  if (mergeCandidate && !type.includes('_END')) {
    // Extend the existing event instead of creating new
    mergeCandidate.extended = true
    return mergeCandidate
  }
  
  setCooldown(type)
  
  const event = {
    id: `${timestamp}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    timestamp,
    ...meta
  }
  events.push(event)
  if (events.length > EVENTS_MAX) events = events.slice(-EVENTS_MAX)
  return event
}

// v5: Check if toggle count is spam-worthy
function isToggleSpam() {
  const now = Date.now()
  const cutoff = now - CONFIG.TOGGLE_SPAM_WINDOW * 1000
  awayToggleBuffer = awayToggleBuffer.filter(t => t > cutoff)
  return awayToggleBuffer.length >= CONFIG.TOGGLE_SPAM_THRESHOLD
}

// ============================================================
// v5: CONTEXT MODE MANAGEMENT
// ============================================================

export function setContextMode(mode) {
  if (CONTEXT_MODES[mode]) {
    currentContextMode = mode
    return true
  }
  return false
}

export function getContextMode() {
  return {
    mode: currentContextMode,
    ...CONTEXT_MODES[currentContextMode]
  }
}

export function getAvailableContextModes() {
  return Object.entries(CONTEXT_MODES).map(([key, val]) => ({
    id: key,
    label: val.label,
    emoji: val.emoji
  }))
}

// Get current weights based on context
function getContextWeights() {
  return CONTEXT_MODES[currentContextMode]?.weights || CONTEXT_MODES.coding.weights
}

// Get threshold modifications based on context
function getThresholdMods() {
  return CONTEXT_MODES[currentContextMode]?.thresholdMods || CONTEXT_MODES.coding.thresholdMods
}

// ============================================================
// v5: AUTO-THRESHOLD TUNING
// ============================================================

function updateHistoryBuffer(blinkRate, gazeMotion, headMotion, ear) {
  historyBuffer.blinkRates.push(blinkRate)
  historyBuffer.gazeMotions.push(gazeMotion)
  historyBuffer.headMotions.push(headMotion)
  historyBuffer.earValues.push(ear)
  
  // Trim to max
  if (historyBuffer.blinkRates.length > historyBuffer.maxSamples) {
    historyBuffer.blinkRates = historyBuffer.blinkRates.slice(-historyBuffer.maxSamples)
    historyBuffer.gazeMotions = historyBuffer.gazeMotions.slice(-historyBuffer.maxSamples)
    historyBuffer.headMotions = historyBuffer.headMotions.slice(-historyBuffer.maxSamples)
    historyBuffer.earValues = historyBuffer.earValues.slice(-historyBuffer.maxSamples)
  }
}

function recomputeAutoThresholds() {
  // Need enough data
  if (historyBuffer.blinkRates.length < 300) return // At least 5 min
  
  // Blink rate: P10-P90 is normal band
  autoTunedThresholds.blinkRate = {
    low: percentile(historyBuffer.blinkRates, 10),
    high: percentile(historyBuffer.blinkRates, 90),
    normal: median(historyBuffer.blinkRates),
  }
  
  // Gaze motion: P50 is normal, P80 is extended
  autoTunedThresholds.gazeTolerance = {
    normal: Math.max(0.04, percentile(historyBuffer.gazeMotions, 50)),
    extended: percentile(historyBuffer.gazeMotions, 80),
  }
  
  // Head jitter: P50 is normal, P85 is high
  autoTunedThresholds.headJitter = {
    normal: Math.max(0.01, percentile(historyBuffer.headMotions, 50)),
    high: percentile(historyBuffer.headMotions, 85),
  }
  
  // EAR drop: relative to baseline
  const earMedian = median(historyBuffer.earValues)
  autoTunedThresholds.earDrop = {
    mild: earMedian * 0.92,
    fatigue: earMedian * 0.80,
  }
}

// ============================================================
// FEATURE EXTRACTION
// ============================================================

function computeEAR(landmarks) {
  const leftEye = LANDMARKS.LEFT_EYE
  const rightEye = LANDMARKS.RIGHT_EYE
  
  const leftH = dist(landmarks[leftEye.upper], landmarks[leftEye.lower])
  const leftW = dist(landmarks[leftEye.inner], landmarks[leftEye.outer])
  const leftEAR = leftW > 0.001 ? leftH / leftW : 0.25
  
  const rightH = dist(landmarks[rightEye.upper], landmarks[rightEye.lower])
  const rightW = dist(landmarks[rightEye.inner], landmarks[rightEye.outer])
  const rightEAR = rightW > 0.001 ? rightH / rightW : 0.25
  
  return (leftEAR + rightEAR) / 2
}

function computeMAR(landmarks) {
  const mouth = LANDMARKS.MOUTH
  const h = dist(landmarks[mouth.upper], landmarks[mouth.lower])
  const w = dist(landmarks[mouth.left], landmarks[mouth.right])
  return w > 0.001 ? h / w : 0.2
}

function computeFaceSize(landmarks) {
  return dist(landmarks[LANDMARKS.FOREHEAD], landmarks[LANDMARKS.CHIN])
}

function computeHeadDown(landmarks) {
  const nose = landmarks[LANDMARKS.NOSE_TIP]
  const forehead = landmarks[LANDMARKS.FOREHEAD]
  if (!nose || !forehead) return 0
  return nose.y - forehead.y
}

function computeHeadYaw(landmarks) {
  const nose = landmarks[LANDMARKS.NOSE_TIP]
  const leftCheek = landmarks[LANDMARKS.LEFT_CHEEK]
  const rightCheek = landmarks[LANDMARKS.RIGHT_CHEEK]
  
  if (!nose || !leftCheek || !rightCheek) return 0
  
  const leftDist = dist(nose, leftCheek)
  const rightDist = dist(nose, rightCheek)
  const totalDist = leftDist + rightDist
  
  if (totalDist < 0.001) return 0
  return (rightDist - leftDist) / totalDist
}

function computeGazeProxy(landmarks) {
  const leftEye = LANDMARKS.LEFT_EYE
  const rightEye = LANDMARKS.RIGHT_EYE
  const leftIris = LANDMARKS.LEFT_IRIS
  const rightIris = LANDMARKS.RIGHT_IRIS
  const nose = landmarks[LANDMARKS.NOSE_TIP]
  
  if (!nose) return { gaze: 0, irisAvailable: false }
  
  const hasIris = landmarks[leftIris.center] && landmarks[rightIris.center]
  
  if (hasIris) {
    const leftEyeW = dist(landmarks[leftEye.inner], landmarks[leftEye.outer])
    const leftEyeCenter = {
      x: (landmarks[leftEye.inner].x + landmarks[leftEye.outer].x) / 2,
      y: (landmarks[leftEye.upper].y + landmarks[leftEye.lower].y) / 2,
    }
    
    const rightEyeW = dist(landmarks[rightEye.inner], landmarks[rightEye.outer])
    const rightEyeCenter = {
      x: (landmarks[rightEye.inner].x + landmarks[rightEye.outer].x) / 2,
      y: (landmarks[rightEye.upper].y + landmarks[rightEye.lower].y) / 2,
    }
    
    const leftGazeX = leftEyeW > 0.001 
      ? (landmarks[leftIris.center].x - leftEyeCenter.x) / leftEyeW 
      : 0
    const rightGazeX = rightEyeW > 0.001 
      ? (landmarks[rightIris.center].x - rightEyeCenter.x) / rightEyeW 
      : 0
    
    return { gaze: (leftGazeX + rightGazeX) / 2, irisAvailable: true }
  }
  
  const leftCenter = {
    x: (landmarks[leftEye.inner].x + landmarks[leftEye.outer].x + 
        landmarks[leftEye.upper].x + landmarks[leftEye.lower].x) / 4,
  }
  const rightCenter = {
    x: (landmarks[rightEye.inner].x + landmarks[rightEye.outer].x + 
        landmarks[rightEye.upper].x + landmarks[rightEye.lower].x) / 4,
  }
  
  const eyesCenterX = (leftCenter.x + rightCenter.x) / 2
  return { gaze: eyesCenterX - nose.x, irisAvailable: false }
}

// ============================================================
// BLINK DETECTION
// ============================================================

function updateBlinkDetection(EAR, timestamp) {
  const thresh = calibration.baseline.EAR_thresh
  
  if (EAR < thresh) {
    blinkState.lowEARFrames++
  } else {
    if (blinkState.lowEARFrames >= CONFIG.BLINK_MIN_FRAMES) {
      blinkState.timestamps.push(timestamp)
    }
    blinkState.lowEARFrames = 0
  }
  
  const cutoff = timestamp - 60000
  blinkState.timestamps = blinkState.timestamps.filter(t => t > cutoff)
}

function getBlinkRate() {
  return blinkState.timestamps.length
}

// ============================================================
// YAWN DETECTION
// ============================================================

function updateYawnDetection(MAR, timestamp) {
  const thresh = calibration.baseline.MAR_thresh
  
  if (MAR > thresh) {
    if (!yawnState.highMARStart) {
      yawnState.highMARStart = timestamp
    } else if (timestamp - yawnState.highMARStart >= CONFIG.YAWN_DURATION_MS) {
      if (!yawnState.isYawning) {
        yawnState.isYawning = true
        return true
      }
    }
  } else {
    yawnState.highMARStart = null
    yawnState.isYawning = false
  }
  return false
}

// ============================================================
// SIGNAL QUALITY
// ============================================================

function computeSignalQuality(facePresent, facePresentRatio, faceSize, headMotion) {
  const b = calibration.baseline
  
  const Q_face = clamp(facePresentRatio, 0, 1)
  const faceSizeDelta = Math.abs(faceSize - b.face_size_base)
  const Q_light = 1 - penalty(faceSizeDelta, 0.03, 0.12)
  const Q_stability = 1 - penalty(headMotion, b.head_jitter_base * 1.2, b.head_jitter_base * 4.0)
  const Q_total = 100 * (0.5 * Q_face + 0.3 * Q_stability + 0.2 * Q_light)
  
  return { Q_face, Q_light, Q_stability, Q_total: clamp(Q_total, 0, 100) }
}

// ============================================================
// BASELINE DRIFT
// ============================================================

function updateBaselineDrift(EAR_cur, gazeProxy, headMotion, faceSize, focus, awayRatio, facePresent) {
  const isStable = facePresent && 
                   awayRatio < 0.20 && 
                   focus > 80 && 
                   headMotion < calibration.baseline.head_jitter_base * 1.5
  
  if (!isStable) return
  
  const alpha = CONFIG.DRIFT_ALPHA
  const b = calibration.baseline
  
  b.EAR_base = (1 - alpha) * b.EAR_base + alpha * EAR_cur
  b.gaze_center = (1 - alpha) * b.gaze_center + alpha * gazeProxy
  b.head_jitter_base = (1 - alpha) * b.head_jitter_base + alpha * headMotion
  b.face_size_base = (1 - alpha) * b.face_size_base + alpha * faceSize
  b.EAR_thresh = Math.max(0.12, b.EAR_base - 2.0 * b.EAR_sd)
}

// ============================================================
// SCORE CALCULATIONS (v5: context-aware)
// ============================================================

function calculateFocusRaw(facePresent, awayRatio, headMotionEMA, gazeMotionEMA) {
  const b = calibration.baseline
  const w = getContextWeights().focus
  
  const P_face = facePresent ? 0 : 1
  const P_away = awayRatio
  
  // v5: Use auto-tuned thresholds if available
  const headJitterHigh = autoTunedThresholds.headJitter.high || b.head_jitter_base * 3.0
  const gazeJitterHigh = autoTunedThresholds.gazeTolerance.extended || b.gaze_jitter_base * 3.0
  
  const P_head = penalty(headMotionEMA, b.head_jitter_base * 1.2, headJitterHigh)
  const P_gaze = penalty(gazeMotionEMA, b.gaze_jitter_base * 1.2, gazeJitterHigh)
  
  const P_focus = w.face * P_face + w.away * P_away + w.head * P_head + w.gaze * P_gaze
  return clamp(100 * (1 - P_focus), 0, 100)
}

function calculateEnergyRaw(EAR_cur, blinkRate, yawnActive, headMotionEMA) {
  const b = calibration.baseline
  const w = getContextWeights().energy
  
  // v5: Use auto-tuned blink thresholds
  const blinkNormal = autoTunedThresholds.blinkRate.normal || b.blink_rate_base
  const blinkHigh = autoTunedThresholds.blinkRate.high || blinkNormal * 1.5
  
  const EAR_drop = (b.EAR_base - EAR_cur) / Math.max(0.01, b.EAR_base)
  const P_ear = penalty(EAR_drop, 0.08, 0.25)
  
  const blink_dev = Math.abs(blinkRate - blinkNormal) / Math.max(1, blinkNormal)
  const P_blink = penalty(blink_dev, 0.5, 1.5)
  
  const motionThreshold = b.head_jitter_base * 0.7
  const P_motion = penalty(motionThreshold - headMotionEMA, 0, motionThreshold)
  
  const P_yawn = yawnActive ? 1 : 0
  
  const P_energy = w.ear * P_ear + w.blink * P_blink + w.motion * P_motion + w.yawn * P_yawn
  return clamp(100 * (1 - P_energy), 0, 100)
}

function calculateConfidenceRaw(facePresent, awayRatio, headDown, faceSize, speaking = false, fillerRate = 0) {
  const b = calibration.baseline
  const w = getContextWeights().confidence
  
  const P_face = facePresent ? 0 : 1
  const P_engage = penalty(awayRatio, 0.15, 0.60)
  const P_down = penalty(headDown - b.down_head_base, 0.02, 0.10)
  const P_far = penalty(b.face_size_base - faceSize, 0.02, 0.10)
  
  let P_voice = 0
  if (speaking && b.filler_rate_base > 0) {
    const fillerDev = (fillerRate - b.filler_rate_base) / Math.max(1, b.filler_rate_base)
    P_voice = penalty(fillerDev, 0.5, 2.0)
  }
  
  const P_conf = w.face * P_face + w.engage * P_engage + w.down * P_down + w.far * P_far + w.voice * P_voice
  return clamp(100 * (1 - P_conf), 0, 100)
}

// ============================================================
// v5: SMART LOOK-AWAY (context-aware)
// ============================================================

function classifyLookAway(awayRatio, headMotion, gazeMotion, blinkRate, energy, awayToggleCount) {
  const b = calibration.baseline
  const threshMods = getThresholdMods()
  
  const highJitter = headMotion > b.head_jitter_base * 2.0 * threshMods.restlessnessMultiplier ||
                     gazeMotion > b.gaze_jitter_base * 2.0
  const frequentToggles = awayToggleCount > 3
  const abnormalBlinks = Math.abs(blinkRate - autoTunedThresholds.blinkRate.normal) > 
                         autoTunedThresholds.blinkRate.normal * 0.7
  const lowEnergy = energy < 60
  
  if (highJitter || frequentToggles || (abnormalBlinks && lowEnergy)) {
    return 'distracted'
  }
  return 'thinking'
}

// ============================================================
// EVENT DETECTION (v5: with cooldowns + merging)
// ============================================================

function detectEvents(current, timestamp) {
  const E = CONFIG.EVENTS
  const threshMods = getThresholdMods()
  const st = eventState
  
  // === FACE_LOST ===
  if (!current.facePresent) {
    st.faceLostSecs++
    st.facePresentRecoverSecs = 0
    if (!st.faceLostActive && st.faceLostSecs >= E.FACE_LOST_TRIGGER) {
      addEvent('FACE_LOST_START', timestamp)
      st.faceLostActive = true
    }
  } else {
    if (st.faceLostActive) {
      st.facePresentRecoverSecs++
      if (st.facePresentRecoverSecs >= E.FACE_LOST_RECOVER) {
        addEvent('FACE_LOST_END', timestamp, { duration: st.faceLostSecs })
        st.faceLostActive = false
      }
    }
    st.faceLostSecs = 0
  }
  
  // === v5: SMART LOOK_AWAY with context-aware thresholds ===
  const lookAwayThinkingTrigger = threshMods.lookAwayThinkingTrigger || E.LOOK_AWAY_THINKING_TRIGGER
  
  if (current.awayRatio > E.LOOK_AWAY_RATIO_HIGH) {
    st.lookAwaySecs++
    st.lookAwayRecoverSecs = 0
    
    if (!st.lookAwayActive) {
      const lookAwayType = classifyLookAway(
        current.awayRatio,
        current.headMotion,
        current.gazeMotion,
        current.blinkRate,
        current.energy,
        current.awayToggleCount
      )
      
      const triggerTime = lookAwayType === 'thinking' 
        ? lookAwayThinkingTrigger 
        : E.LOOK_AWAY_TRIGGER
      
      if (st.lookAwaySecs >= triggerTime) {
        // v5: Check if this is spam (too many toggles)
        if (lookAwayType === 'distracted' && !isToggleSpam()) {
          // Don't emit event if toggles aren't spam-worthy
          // Just track internally
        } else {
          st.lookAwayType = lookAwayType
          st.lookAwayStart = timestamp
          addEvent(`LOOK_AWAY_${lookAwayType.toUpperCase()}_START`, timestamp)
          st.lookAwayActive = true
        }
        
        if (lookAwayType === 'distracted') {
          driverStats.lookAwayDistractedSecs++
        } else {
          driverStats.lookAwayThinkingSecs++
        }
      }
    } else {
      if (st.lookAwayType === 'distracted') {
        driverStats.lookAwayDistractedSecs++
      } else {
        driverStats.lookAwayThinkingSecs++
      }
    }
  } else if (current.awayRatio < E.LOOK_AWAY_RATIO_LOW) {
    if (st.lookAwayActive) {
      st.lookAwayRecoverSecs++
      if (st.lookAwayRecoverSecs >= E.LOOK_AWAY_RECOVER) {
        addEvent(`LOOK_AWAY_${st.lookAwayType?.toUpperCase() || 'UNKNOWN'}_END`, timestamp, { 
          duration: st.lookAwaySecs,
          type: st.lookAwayType 
        })
        st.lookAwayActive = false
        st.lookAwayType = null
        st.lookAwayStart = null
      }
    }
    st.lookAwaySecs = 0
  }
  
  // === FOCUS_STREAK ===
  if (current.focus >= E.FOCUS_STREAK_THRESHOLD) {
    st.focusHiSecs++
    st.focusBreakSecs = 0
    driverStats.focusAbove80Secs++
    if (!st.focusStreakActive && st.focusHiSecs >= E.FOCUS_STREAK_TRIGGER) {
      addEvent('FOCUS_STREAK_START', timestamp)
      st.focusStreakActive = true
      st.focusStreakStart = timestamp
    }
  } else {
    st.focusHiSecs = 0
  }
  
  if (st.focusStreakActive && current.focus < E.FOCUS_STREAK_BREAK_THRESHOLD) {
    st.focusBreakSecs++
    if (st.focusBreakSecs >= E.FOCUS_STREAK_BREAK_DURATION) {
      const duration = st.focusStreakStart ? Math.round((timestamp - st.focusStreakStart) / 1000) : 0
      addEvent('FOCUS_STREAK_END', timestamp, { durationSecs: duration })
      st.focusStreakActive = false
      st.focusStreakStart = null
      st.focusBreakSecs = 0
    }
  } else if (st.focusStreakActive) {
    st.focusBreakSecs = 0
  }
  
  // === DISTRACTION_BLOCK (v5: context-aware threshold) ===
  const distractionTrigger = threshMods.distractionTrigger || E.DISTRACTION_TRIGGER
  
  if (current.focus <= E.DISTRACTION_THRESHOLD) {
    st.focusLowSecs++
    st.distractionRecoverSecs = 0
    driverStats.focusBelow55Secs++
    if (!st.distractionActive && st.focusLowSecs >= distractionTrigger) {
      addEvent('DISTRACTION_START', timestamp)
      st.distractionActive = true
      st.distractionStart = timestamp
    }
  } else {
    st.focusLowSecs = 0
  }
  
  if (st.distractionActive && current.focus >= E.DISTRACTION_RECOVER_THRESHOLD) {
    st.distractionRecoverSecs++
    if (st.distractionRecoverSecs >= E.DISTRACTION_RECOVER_DURATION) {
      const duration = st.distractionStart ? Math.round((timestamp - st.distractionStart) / 1000) : 0
      addEvent('DISTRACTION_END', timestamp, { durationSecs: duration })
      st.distractionActive = false
      st.distractionStart = null
      st.distractionRecoverSecs = 0
    }
  } else if (st.distractionActive) {
    st.distractionRecoverSecs = 0
  }
  
  // === ENERGY_DIP ===
  const energyWindow = secondMetrics.slice(-600).map(m => m.energy)
  const energyMed10m = energyWindow.length > 60 ? median(energyWindow) : 75
  
  if (current.energy < energyMed10m - E.ENERGY_DIP_DELTA) {
    st.energyDipSecs++
    driverStats.energyDipSecs++
    if (!st.energyDipActive && st.energyDipSecs >= E.ENERGY_DIP_TRIGGER) {
      addEvent('ENERGY_DIP_START', timestamp, { baseline: energyMed10m, current: current.energy })
      st.energyDipActive = true
      st.energyDipStart = timestamp
    }
  } else {
    if (st.energyDipActive) {
      const duration = st.energyDipStart ? Math.round((timestamp - st.energyDipStart) / 1000) : 0
      addEvent('ENERGY_DIP_END', timestamp, { durationSecs: duration })
      st.energyDipActive = false
      st.energyDipStart = null
    }
    st.energyDipSecs = 0
  }
  
  // v5: Track energy levels
  if (current.energy >= 70) driverStats.energyAbove70Secs++
  if (current.energy < 50) driverStats.energyBelow50Secs++
  
  // === YAWN ===
  if (current.yawnActive) {
    addEvent('YAWN', timestamp)
    driverStats.yawnCount++
  }
  
  // === v5: LOW_SIGNAL tracking ===
  if (current.signalQuality < CONFIG.SIGNAL_QUALITY_MIN) {
    driverStats.lowSignalSecs++
  }
  
  // === Driver stats ===
  if (current.headMotion > calibration.baseline.head_jitter_base * 2.5 ||
      current.gazeMotion > calibration.baseline.gaze_jitter_base * 2.5) {
    driverStats.highJitterSecs++
  }
  
  const EAR_drop = (calibration.baseline.EAR_base - current.EAR) / calibration.baseline.EAR_base
  if (EAR_drop > 0.15) {
    driverStats.earDropSecs++
  }
  
  driverStats.totalSeconds++
}

// ============================================================
// OBSERVED MODE
// ============================================================

function determineObservedMode(focus, energy, confidence, awayRatio, signalQ) {
  if (signalQ < CONFIG.SIGNAL_QUALITY_MIN) {
    return { 
      mode: 'low_signal', 
      label: 'Low Signal', 
      description: 'Tracking quality degraded', 
      confidence: Math.round(signalQ) 
    }
  }
  
  if (!frameBuffer.facePresentFrames) {
    return { mode: 'away', label: 'Away', description: 'Face not in frame', confidence: 100 }
  }
  
  if (eventState.focusStreakActive) {
    return { 
      mode: 'deep_focus', 
      label: 'Deep Focus', 
      description: 'Sustained high attention', 
      confidence: Math.round(focus) 
    }
  }
  
  if (eventState.lookAwayActive && eventState.lookAwayType === 'thinking') {
    return {
      mode: 'thinking',
      label: 'Thinking',
      description: 'Processing — productive look-away',
      confidence: 75
    }
  }
  
  if (eventState.distractionActive || focus <= 55) {
    return { 
      mode: 'distracted', 
      label: 'Distracted', 
      description: 'Attention fragmented', 
      confidence: Math.round(100 - focus) 
    }
  }
  
  if (eventState.energyDipActive || energy <= 50) {
    return { 
      mode: 'fatigued', 
      label: 'Fatigued', 
      description: 'Energy indicators low', 
      confidence: Math.round(100 - energy) 
    }
  }
  
  if (energy >= 80 && focus >= 70) {
    return { 
      mode: 'high_energy', 
      label: 'High Energy', 
      description: 'Alert and engaged', 
      confidence: Math.round(energy) 
    }
  }
  
  return { mode: 'neutral', label: 'Neutral', description: 'Steady state', confidence: 70 }
}

// ============================================================
// v5: SESSION ARCHETYPE CLASSIFICATION
// ============================================================

export function classifySessionArchetype() {
  const d = driverStats
  const totalSecs = Math.max(1, d.totalSeconds)
  
  // Compute ratios
  const focusHighRatio = d.focusAbove80Secs / totalSecs
  const focusLowRatio = d.focusBelow55Secs / totalSecs
  const energyHighRatio = d.energyAbove70Secs / totalSecs
  const energyLowRatio = d.energyBelow50Secs / totalSecs
  const distractionRatio = d.lookAwayDistractedSecs / totalSecs
  const jitterRatio = d.highJitterSecs / totalSecs
  const lowSignalRatio = d.lowSignalSecs / totalSecs
  
  // Classification logic
  if (lowSignalRatio > 0.3) {
    return SESSION_ARCHETYPES.low_signal
  }
  
  if (focusHighRatio > 0.6 && distractionRatio < 0.1) {
    return SESSION_ARCHETYPES.locked_in
  }
  
  if (distractionRatio > 0.3 || focusLowRatio > 0.4) {
    return SESSION_ARCHETYPES.distracted_spiral
  }
  
  // Check for fatigue drift (started strong, faded)
  const firstHalfEnergy = secondMetrics.slice(0, Math.floor(secondMetrics.length / 2))
  const secondHalfEnergy = secondMetrics.slice(Math.floor(secondMetrics.length / 2))
  if (firstHalfEnergy.length > 30 && secondHalfEnergy.length > 30) {
    const firstAvg = mean(firstHalfEnergy.map(m => m.energy))
    const secondAvg = mean(secondHalfEnergy.map(m => m.energy))
    if (firstAvg > 70 && secondAvg < 55) {
      return SESSION_ARCHETYPES.fatigue_drift
    }
  }
  
  if (jitterRatio > 0.3 && energyHighRatio > 0.4) {
    return SESSION_ARCHETYPES.restless_sprint
  }
  
  if (focusHighRatio > 0.3 && focusLowRatio > 0.2) {
    return SESSION_ARCHETYPES.choppy_focus
  }
  
  return SESSION_ARCHETYPES.steady_state
}

// ============================================================
// PER-FRAME PROCESSING
// ============================================================

export function processFrame(landmarks, timestamp) {
  if (!sessionStart) sessionStart = timestamp
  
  if (!landmarks || landmarks.length < 400) {
    frameBuffer.totalFrames++
    frameBuffer.awayFrames++
    return
  }
  
  frameBuffer.totalFrames++
  frameBuffer.facePresentFrames++
  
  const EAR = computeEAR(landmarks)
  const MAR = computeMAR(landmarks)
  const faceSize = computeFaceSize(landmarks)
  const headDown = computeHeadDown(landmarks)
  const { gaze: gazeProxy, irisAvailable } = computeGazeProxy(landmarks)
  const headYaw = computeHeadYaw(landmarks)
  const noseTip = landmarks[LANDMARKS.NOSE_TIP]
  
  frameBuffer.EAR_values.push(EAR)
  frameBuffer.MAR_values.push(MAR)
  frameBuffer.faceSize_values.push(faceSize)
  frameBuffer.headDown_values.push(headDown)
  frameBuffer.gazeProxy_values.push(gazeProxy)
  frameBuffer.headYaw_values.push(headYaw)
  frameBuffer.irisAvailable = irisAvailable
  
  let headMotion = 0
  if (prevFrame.noseTip && prevFrame.timestamp) {
    const dt = (timestamp - prevFrame.timestamp) / 1000
    if (dt > 0 && dt < 1) {
      headMotion = dist(noseTip, prevFrame.noseTip) / dt
    }
  }
  frameBuffer.headMotion_values.push(headMotion)
  
  let gazeMotion = 0
  if (prevFrame.gazeProxy !== null && prevFrame.timestamp) {
    const dt = (timestamp - prevFrame.timestamp) / 1000
    if (dt > 0 && dt < 1) {
      gazeMotion = Math.abs(gazeProxy - prevFrame.gazeProxy) / dt
    }
  }
  frameBuffer.gazeMotion_values.push(gazeMotion)
  
  const gazeAway = Math.abs(gazeProxy - calibration.baseline.gaze_center) > calibration.baseline.gaze_off_threshold
  const yawAway = Math.abs(headYaw - calibration.baseline.head_yaw_base) > calibration.baseline.head_yaw_off_threshold
  const isAway = gazeAway || yawAway
  
  if (isAway) frameBuffer.awayFrames++
  
  // v5: Track toggles for spam detection
  if (isAway !== frameBuffer.lastAwayState) {
    frameBuffer.awayToggleCount++
    driverStats.awayToggleCount++
    awayToggleBuffer.push(timestamp)
  }
  frameBuffer.lastAwayState = isAway
  
  updateBlinkDetection(EAR, timestamp)
  const yawnDetected = updateYawnDetection(MAR, timestamp)
  if (yawnDetected) frameBuffer.yawnFrames++
  
  if (calibration.isCalibrating) {
    collectCalibrationData(EAR, headMotion, gazeMotion, faceSize, headDown, gazeProxy, headYaw)
  }
  
  prevFrame.noseTip = noseTip
  prevFrame.gazeProxy = gazeProxy
  prevFrame.headYaw = headYaw
  prevFrame.timestamp = timestamp
}

// ============================================================
// PER-SECOND TICK
// ============================================================

export function processSecond(timestamp, speaking = false, fillerRate = 0) {
  if (frameBuffer.totalFrames === 0) return null
  
  const facePresentRatio = frameBuffer.facePresentFrames / Math.max(1, frameBuffer.totalFrames)
  const awayRatio = frameBuffer.awayFrames / Math.max(1, frameBuffer.totalFrames)
  const facePresent = frameBuffer.facePresentFrames > 0
  
  const EAR_cur = median(frameBuffer.EAR_values) || calibration.baseline.EAR_base
  const blinkRate = getBlinkRate()
  const yawnActive = frameBuffer.yawnFrames > 0
  
  const headMotionMedian = median(frameBuffer.headMotion_values) || 0
  const gazeMotionMedian = median(frameBuffer.gazeMotion_values) || 0
  const faceSize = median(frameBuffer.faceSize_values) || calibration.baseline.face_size_base
  const headDown = median(frameBuffer.headDown_values) || calibration.baseline.down_head_base
  const gazeProxy = median(frameBuffer.gazeProxy_values) || calibration.baseline.gaze_center
  
  headMotionEMA = ema(headMotionEMA, headMotionMedian, CONFIG.EMA_ALPHA_NORMAL)
  gazeMotionEMA = ema(gazeMotionEMA, gazeMotionMedian, CONFIG.EMA_ALPHA_NORMAL)
  
  signalQuality = computeSignalQuality(facePresent, facePresentRatio, faceSize, headMotionEMA)
  
  const emaAlpha = signalQuality.Q_total >= CONFIG.SIGNAL_QUALITY_MIN 
    ? CONFIG.EMA_ALPHA_NORMAL 
    : CONFIG.EMA_ALPHA_LOW_SIGNAL
  
  const focusRaw = calculateFocusRaw(facePresent, awayRatio, headMotionEMA, gazeMotionEMA)
  const energyRaw = calculateEnergyRaw(EAR_cur, blinkRate, yawnActive, headMotionEMA)
  const confRaw = calculateConfidenceRaw(facePresent, awayRatio, headDown, faceSize, speaking, fillerRate)
  
  scores.focus = Math.round(ema(scores.focus, focusRaw, emaAlpha))
  scores.energy = Math.round(ema(scores.energy, energyRaw, emaAlpha))
  scores.confidence = Math.round(ema(scores.confidence, confRaw, emaAlpha))
  
  if (signalQuality.Q_total >= 70) {
    updateBaselineDrift(EAR_cur, gazeProxy, headMotionEMA, faceSize, scores.focus, awayRatio, facePresent)
  }
  
  // v5: Update history buffer for auto-tuning
  updateHistoryBuffer(blinkRate, gazeMotionEMA, headMotionEMA, EAR_cur)
  
  // v5: Periodically recompute auto thresholds (every 5 min)
  if (driverStats.totalSeconds % 300 === 0) {
    recomputeAutoThresholds()
  }
  
  const current = {
    t: timestamp,
    focus: scores.focus,
    energy: scores.energy,
    confidence: scores.confidence,
    awayRatio,
    facePresent,
    EAR: EAR_cur,
    blinkRate,
    yawnActive,
    speaking,
    headMotion: headMotionEMA,
    gazeMotion: gazeMotionEMA,
    signalQuality: signalQuality.Q_total,
    awayToggleCount: frameBuffer.awayToggleCount,
  }
  
  secondMetrics.push(current)
  if (secondMetrics.length > SECOND_METRICS_MAX) secondMetrics.shift()
  
  detectEvents(current, timestamp)
  
  const observedMode = determineObservedMode(
    scores.focus, scores.energy, scores.confidence, awayRatio, signalQuality.Q_total
  )
  
  frameBuffer = {
    totalFrames: 0,
    awayFrames: 0,
    facePresentFrames: 0,
    EAR_values: [],
    headMotion_values: [],
    gazeMotion_values: [],
    yawnFrames: 0,
    MAR_values: [],
    faceSize_values: [],
    headDown_values: [],
    gazeProxy_values: [],
    headYaw_values: [],
    irisAvailable: frameBuffer.irisAvailable,
    awayToggleCount: 0,
    lastAwayState: frameBuffer.lastAwayState,
  }
  
  return {
    focus: scores.focus,
    energy: scores.energy,
    confidence: scores.confidence,
    observedMode,
    signalQuality,
    contextMode: getContextMode(),
    metrics: {
      EAR: EAR_cur,
      blinkRate,
      awayRatio,
      headMotion: headMotionEMA,
      gazeMotion: gazeMotionEMA,
      faceSize,
      irisAvailable: frameBuffer.irisAvailable,
    },
    faceDetected: facePresent,
    isCalibrated: calibration.isCalibrated,
    isCalibrating: calibration.isCalibrating,
    calibrationPhase: calibration.phase,
    events: events.slice(-10),
  }
}

// ============================================================
// CALIBRATION
// ============================================================

export function startCalibration() {
  calibration.isCalibrating = true
  calibration.isCalibrated = false
  calibration.phase = 'A'
  calibration.phaseStart = Date.now()
  calibration.rawData = {
    phaseA: { EAR: [], headMotion: [], gazeMotion: [], faceSize: [], headDown: [], gazeProxy: [], headYaw: [] },
    phaseB: { gazeProxy: [], headYaw: [] },
    phaseC: {},
  }
  
  addEvent('CALIBRATION_START', Date.now())
  
  return {
    phases: [
      { phase: 'A', duration: 15000, instruction: 'Look at screen normally, neutral face' },
      { phase: 'B', duration: 10000, instruction: 'Look away left/right naturally a few times' },
      { phase: 'C', duration: 10000, instruction: 'Optional: Talk normally for 10 seconds' },
    ],
    totalDuration: 35000
  }
}

function collectCalibrationData(EAR, headMotion, gazeMotion, faceSize, headDown, gazeProxy, headYaw) {
  const elapsed = Date.now() - calibration.phaseStart
  
  if (calibration.phase === 'A') {
    calibration.rawData.phaseA.EAR.push(EAR)
    calibration.rawData.phaseA.headMotion.push(headMotion)
    calibration.rawData.phaseA.gazeMotion.push(gazeMotion)
    calibration.rawData.phaseA.faceSize.push(faceSize)
    calibration.rawData.phaseA.headDown.push(headDown)
    calibration.rawData.phaseA.gazeProxy.push(gazeProxy)
    calibration.rawData.phaseA.headYaw.push(headYaw)
    
    if (elapsed >= 15000) {
      calibration.phase = 'B'
      calibration.phaseStart = Date.now()
    }
  } else if (calibration.phase === 'B') {
    calibration.rawData.phaseB.gazeProxy.push(gazeProxy)
    calibration.rawData.phaseB.headYaw.push(headYaw)
    
    if (elapsed >= 10000) {
      calibration.phase = 'C'
      calibration.phaseStart = Date.now()
    }
  } else if (calibration.phase === 'C') {
    if (elapsed >= 10000) {
      finishCalibration()
    }
  }
}

function finishCalibration() {
  const phaseA = calibration.rawData.phaseA
  const phaseB = calibration.rawData.phaseB
  
  if (phaseA.EAR.length < 100) {
    console.warn('Not enough calibration data')
    calibration.isCalibrating = false
    calibration.isCalibrated = true
    addEvent('CALIBRATION_INCOMPLETE', Date.now())
    return
  }
  
  const EAR_base = median(phaseA.EAR)
  const EAR_sd = stdDev(phaseA.EAR)
  
  calibration.baseline = {
    EAR_base,
    EAR_sd,
    EAR_thresh: Math.max(0.12, EAR_base - 2.0 * EAR_sd),
    blink_rate_base: getBlinkRate() || 15,
    head_jitter_base: Math.max(0.005, median(phaseA.headMotion)),
    gaze_jitter_base: Math.max(0.005, median(phaseA.gazeMotion)),
    gaze_center: median(phaseA.gazeProxy),
    face_size_base: median(phaseA.faceSize),
    down_head_base: median(phaseA.headDown),
    head_yaw_base: median(phaseA.headYaw),
    MAR_thresh: CONFIG.MAR_THRESH_DEFAULT,
    filler_rate_base: 0,
    gaze_off_threshold: phaseB.gazeProxy.length > 50 
      ? stdDev(phaseB.gazeProxy) * 1.5 
      : CONFIG.GAZE_OFF_THRESH_DEFAULT,
    head_yaw_off_threshold: phaseB.headYaw.length > 50
      ? stdDev(phaseB.headYaw) * 1.5
      : 0.15,
  }
  
  calibration.isCalibrating = false
  calibration.isCalibrated = true
  calibration.phase = null
  
  addEvent('CALIBRATION_COMPLETE', Date.now(), { baseline: calibration.baseline })
}

export function skipCalibration() {
  calibration.isCalibrating = false
  calibration.isCalibrated = true
  addEvent('CALIBRATION_SKIPPED', Date.now())
}

export function getCalibrationProgress() {
  if (!calibration.isCalibrating) return { progress: 0, phase: null }
  
  const elapsed = Date.now() - calibration.phaseStart
  let totalElapsed = elapsed
  
  if (calibration.phase === 'B') totalElapsed += 15000
  else if (calibration.phase === 'C') totalElapsed += 25000
  
  return {
    progress: Math.min(100, (totalElapsed / 35000) * 100),
    phase: calibration.phase,
    instruction: calibration.phase === 'A' 
      ? 'Look at screen normally' 
      : calibration.phase === 'B'
      ? 'Look left and right naturally'
      : 'Speak normally (optional)'
  }
}

// ============================================================
// v5: DAILY REPORT WITH NON-REPETITIVE WORDING
// ============================================================

export function generateDailyReport() {
  if (secondMetrics.length < 60) {
    return { 
      summary: ['Not enough data for report. Record at least 1 minute.'],
      stats: {},
      segments: [],
      drivers: null,
      archetype: null,
      recommendation: null
    }
  }
  
  // Minute buckets
  const minutes = []
  for (let i = 0; i < secondMetrics.length; i += 60) {
    const chunk = secondMetrics.slice(i, i + 60)
    if (chunk.length === 0) continue
    
    minutes.push({
      startTime: chunk[0].t,
      focus_avg: mean(chunk.map(c => c.focus)),
      energy_avg: mean(chunk.map(c => c.energy)),
      conf_avg: mean(chunk.map(c => c.confidence)),
      signal_avg: mean(chunk.map(c => c.signalQuality || 100)),
      away_time: chunk.filter(c => c.awayRatio > 0.5).length,
      face_lost: chunk.filter(c => !c.facePresent).length,
    })
  }
  
  // Segments
  const focusStreaks = findEventPairs('FOCUS_STREAK_START', 'FOCUS_STREAK_END')
  const distractions = findEventPairs('DISTRACTION_START', 'DISTRACTION_END')
  const energyDips = findEventPairs('ENERGY_DIP_START', 'ENERGY_DIP_END')
  const lookAwayThinking = findEventPairs('LOOK_AWAY_THINKING_START', 'LOOK_AWAY_THINKING_END')
  const lookAwayDistracted = findEventPairs('LOOK_AWAY_DISTRACTED_START', 'LOOK_AWAY_DISTRACTED_END')
  
  const bestFocusBlock = focusStreaks.sort((a, b) => b.duration - a.duration)[0]
  const worstDistraction = distractions.sort((a, b) => b.duration - a.duration)[0]
  const biggestEnergyDip = energyDips.sort((a, b) => b.duration - a.duration)[0]
  
  // Drivers
  const totalSecs = Math.max(1, driverStats.totalSeconds)
  const drivers = {
    distraction: Math.round(100 * (
      (driverStats.lookAwayDistractedSecs / totalSecs) * 0.5 +
      (Math.min(driverStats.awayToggleCount, 100) / 100) * 0.5
    )),
    fatigue: Math.round(100 * (
      (driverStats.energyDipSecs / totalSecs) * 0.4 +
      (driverStats.earDropSecs / totalSecs) * 0.3 +
      (Math.min(driverStats.yawnCount, 10) / 10) * 0.3
    )),
    restlessness: Math.round(100 * (driverStats.highJitterSecs / totalSecs)),
  }
  
  const highestDriver = Object.entries(drivers).sort((a, b) => b[1] - a[1])[0]
  
  // v5: Session archetype
  const archetype = classifySessionArchetype()
  
  // v5: Check report memory for repetition
  const lastReport = reportMemory[reportMemory.length - 1]
  const isRepeatDriver = lastReport && lastReport.highestDriver === highestDriver[0]
  const isRepeatArchetype = lastReport && lastReport.archetype?.label === archetype.label
  
  // Generate insights
  const insights = []
  
  // v5: Lead with archetype
  insights.push(`${archetype.emoji} **${archetype.label}**: ${archetype.description}`)
  
  if (bestFocusBlock) {
    const durMin = Math.round(bestFocusBlock.duration / 60)
    insights.push(`Best focus: ${formatTime(bestFocusBlock.start)}–${formatTime(bestFocusBlock.end)} (${durMin}m)`)
  }
  
  if (worstDistraction) {
    const durMin = Math.round(worstDistraction.duration / 60)
    insights.push(`Distraction window: ${formatTime(worstDistraction.start)}–${formatTime(worstDistraction.end)} (${durMin}m)`)
  }
  
  if (biggestEnergyDip) {
    const durMin = Math.round(biggestEnergyDip.duration / 60)
    insights.push(`Energy dip: ${formatTime(biggestEnergyDip.start)} for ${durMin}m`)
  }
  
  // v5: Recommendation with non-repetitive wording
  let recommendation = null
  let driverExplanation = null
  
  if (highestDriver[1] > 20) {
    const [driverName, driverScore] = highestDriver
    
    // v5: Vary wording if repeating
    if (driverName === 'fatigue') {
      if (isRepeatDriver) {
        recommendation = 'Energy dips are becoming predictable — set a break trigger at -15 energy.'
        driverExplanation = `Fatigue again (${driverScore}%). This is a pattern now.`
      } else {
        recommendation = 'When energy drops 15+ points, take a 7–12 min walk or water break.'
        driverExplanation = `Fatigue was your main issue (${driverScore}%). EAR decline + ${driverStats.yawnCount} yawn(s).`
      }
    } else if (driverName === 'distraction') {
      if (isRepeatDriver) {
        recommendation = 'Same issue: attention leaks. Try airplane mode for the first hour.'
        driverExplanation = `Distraction repeating (${driverScore}%). Environment hasn\'t changed.`
      } else {
        recommendation = 'Put phone out of view + go full-screen. Quick look-aways signal notification pull.'
        driverExplanation = `Distraction drove this session (${driverScore}%). ${driverStats.awayToggleCount} quick toggles.`
      }
    } else if (driverName === 'restlessness') {
      if (isRepeatDriver) {
        recommendation = 'Restlessness persisting — try a standing desk or walk-talk meetings.'
        driverExplanation = `High jitter again (${driverScore}%). Your body is asking for movement.`
      } else {
        recommendation = 'Stand up for 2 minutes. High jitter = fighting your body.'
        driverExplanation = `Restlessness was high (${driverScore}%).`
      }
    }
  } else if (archetype.label === 'Locked In') {
    recommendation = 'Excellent session. Protect this time slot — it\'s clearly your focus window.'
    driverExplanation = 'No major issues detected.'
  } else if (isRepeatArchetype) {
    recommendation = `Another ${archetype.label} session. Consider what\'s different on your best days.`
  }
  
  const stats = {
    totalMinutes: minutes.length,
    avgFocus: Math.round(mean(minutes.map(m => m.focus_avg))),
    avgEnergy: Math.round(mean(minutes.map(m => m.energy_avg))),
    avgConfidence: Math.round(mean(minutes.map(m => m.conf_avg))),
    avgSignalQuality: Math.round(mean(minutes.map(m => m.signal_avg))),
    focusStreaks: focusStreaks.length,
    distractionBlocks: distractions.length,
    thinkingLookAways: lookAwayThinking.length,
    distractedLookAways: lookAwayDistracted.length,
    yawns: driverStats.yawnCount,
    contextMode: currentContextMode,
  }
  
  // v5: Store in report memory
  const report = {
    timestamp: Date.now(),
    summary: insights,
    stats,
    segments: { focusStreaks, distractions, energyDips, lookAwayThinking, lookAwayDistracted },
    drivers,
    highestDriver: highestDriver[0],
    archetype,
    driverExplanation,
    recommendation,
    minutes,
  }
  
  reportMemory.push(report)
  if (reportMemory.length > REPORT_MEMORY_MAX) {
    reportMemory = reportMemory.slice(-REPORT_MEMORY_MAX)
  }
  
  return report
}

function findEventPairs(startType, endType) {
  const pairs = []
  let openStart = null
  
  for (const e of events) {
    if (e.type === startType) {
      openStart = e
    } else if (e.type === endType && openStart) {
      pairs.push({
        start: openStart.timestamp,
        end: e.timestamp,
        duration: (e.timestamp - openStart.timestamp) / 1000,
        ...e
      })
      openStart = null
    }
  }
  return pairs
}

function formatTime(timestamp) {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ============================================================
// EXPORTS
// ============================================================

export function getEvents() { return [...events] }
export function getSecondMetrics() { return [...secondMetrics] }
export function getSignalQuality() { return { ...signalQuality } }
export function getDriverStats() { return { ...driverStats } }
export function getAutoTunedThresholds() { return { ...autoTunedThresholds } }
export function getReportMemory() { return [...reportMemory] }

export function getCalibrationStatus() {
  return {
    isCalibrated: calibration.isCalibrated,
    isCalibrating: calibration.isCalibrating,
    baseline: calibration.baseline,
  }
}

export function resetAnalysis() {
  frameBuffer = {
    totalFrames: 0, awayFrames: 0, facePresentFrames: 0,
    EAR_values: [], headMotion_values: [], gazeMotion_values: [],
    yawnFrames: 0, MAR_values: [], faceSize_values: [],
    headDown_values: [], gazeProxy_values: [], headYaw_values: [],
    irisAvailable: false, awayToggleCount: 0, lastAwayState: false,
  }
  secondMetrics = []
  blinkState = { timestamps: [], isInBlink: false, lowEARFrames: 0 }
  yawnState = { highMARStart: null, isYawning: false }
  prevFrame = { noseTip: null, gazeProxy: null, timestamp: null, headYaw: null }
  scores = { focus: 75, energy: 75, confidence: 75 }
  signalQuality = { Q_face: 1, Q_light: 1, Q_stability: 1, Q_total: 100 }
  eventState = {
    faceLostSecs: 0, faceLostActive: false, facePresentRecoverSecs: 0,
    lookAwaySecs: 0, lookAwayActive: false, lookAwayType: null, lookAwayRecoverSecs: 0, lookAwayStart: null,
    focusHiSecs: 0, focusStreakActive: false, focusBreakSecs: 0, focusStreakStart: null,
    focusLowSecs: 0, distractionActive: false, distractionRecoverSecs: 0, distractionStart: null,
    energyDipSecs: 0, energyDipActive: false, energyDipStart: null,
    confDropSecs: 0, confSpeechDropActive: false,
  }
  driverStats = {
    totalSeconds: 0, lookAwayDistractedSecs: 0, lookAwayThinkingSecs: 0,
    awayToggleCount: 0, energyDipSecs: 0, yawnCount: 0, earDropSecs: 0, highJitterSecs: 0,
    focusAbove80Secs: 0, focusBelow55Secs: 0, energyAbove70Secs: 0, energyBelow50Secs: 0, lowSignalSecs: 0,
  }
  events = []
  eventCooldowns = {}
  awayToggleBuffer = []
  headMotionEMA = 0
  gazeMotionEMA = 0
  sessionStart = null
  // Note: Don't reset historyBuffer or reportMemory - those persist across sessions
}

// Legacy compatibility
export function analyzeFace(landmarks) {
  const now = Date.now()
  processFrame(landmarks, now)
  
  if (!lastSecondTick || now - lastSecondTick >= 1000) {
    lastSecondTick = now
    const result = processSecond(now)
    if (result) return result
  }
  
  return {
    faceDetected: frameBuffer.facePresentFrames > 0,
    focus: scores.focus,
    energy: scores.energy,
    confidence: scores.confidence,
    observedMode: determineObservedMode(scores.focus, scores.energy, scores.confidence, 
      frameBuffer.awayFrames / Math.max(1, frameBuffer.totalFrames), signalQuality.Q_total),
    signalQuality,
    contextMode: getContextMode(),
    events: events.slice(-10),
    isCalibrated: calibration.isCalibrated,
    isCalibrating: calibration.isCalibrating,
    calibrationProgress: getCalibrationProgress().progress,
    metrics: {
      blinkRate: getBlinkRate(),
      EAR: median(frameBuffer.EAR_values) || calibration.baseline.EAR_base,
    }
  }
}

export function generateInsights(readings) {
  if (!readings || readings.length < 10) return ['Not enough data for insights.']
  
  const insights = []
  const avgFocus = mean(readings.map(r => r.focus || r.focus * 100))
  const avgEnergy = mean(readings.map(r => r.energy || r.energy * 100))
  
  if (avgFocus >= 75) insights.push('Strong focus maintained throughout the session')
  else if (avgFocus < 55) insights.push('Focus was scattered — try minimizing distractions')
  
  if (avgEnergy >= 75) insights.push('High energy levels detected')
  else if (avgEnergy < 50) insights.push('Energy was low — consider taking breaks')
  
  return insights.length > 0 ? insights : ['Session recorded successfully']
}
