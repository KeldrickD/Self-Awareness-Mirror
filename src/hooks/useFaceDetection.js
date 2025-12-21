import { useState, useEffect, useRef, useCallback } from 'react'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'
import { 
  processFrame,
  processSecond,
  resetAnalysis, 
  startCalibration, 
  skipCalibration,
  getEvents,
  getCalibrationStatus,
  getCalibrationProgress,
  getSecondMetrics,
  getSignalQuality,
  getDriverStats,
  getContextMode,
  setContextMode
} from '../lib/faceAnalysis'

export function useFaceDetection(videoRef, isActive) {
  const [analysis, setAnalysis] = useState({
    faceDetected: false,
    confidence: 75,
    focus: 75,
    energy: 75,
    observedMode: { mode: 'neutral', label: 'Neutral', description: 'Waiting...', confidence: 0 },
    signalQuality: { Q_face: 1, Q_light: 1, Q_stability: 1, Q_total: 100 },
    contextMode: { mode: 'coding', label: 'Coding', emoji: '💻' },
    events: [],
    isCalibrated: false,
    isCalibrating: false,
    calibrationProgress: 0,
    calibrationPhase: null,
    metrics: {}
  })
  const [landmarks, setLandmarks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [modelError, setModelError] = useState(null)

  const faceMeshRef = useRef(null)
  const cameraRef = useRef(null)
  const analysisHistory = useRef([])
  const lastSecondTick = useRef(null)
  const frameCount = useRef(0)

  // Initialize FaceMesh
  useEffect(() => {
    if (!isActive || !videoRef.current) return

    setIsLoading(true)
    resetAnalysis()
    lastSecondTick.current = null
    frameCount.current = 0

    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      }
    })

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    faceMesh.onResults((results) => {
      const now = Date.now()
      frameCount.current++
      
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0]
        setLandmarks(faceLandmarks)
        
        // Process frame (accumulates in buffer)
        processFrame(faceLandmarks, now)
      } else {
        // No face - still process frame for tracking
        processFrame(null, now)
        setLandmarks([])
      }
      
      // Every ~1 second, compute scores
      if (!lastSecondTick.current || now - lastSecondTick.current >= 1000) {
        lastSecondTick.current = now
        
        const result = processSecond(now)
        
        if (result) {
          setAnalysis(result)
          
          // Store in history
          analysisHistory.current.push({
            ...result,
            timestamp: now
          })
          
          // Keep last 5 minutes
          if (analysisHistory.current.length > 300) {
            analysisHistory.current = analysisHistory.current.slice(-300)
          }
        }
      } else {
        // Update calibration progress in between ticks
        const calibProgress = getCalibrationProgress()
        if (calibProgress.progress > 0) {
          setAnalysis(prev => ({
            ...prev,
            isCalibrating: true,
            calibrationProgress: calibProgress.progress,
            calibrationPhase: calibProgress.phase,
          }))
        }
      }
    })

    faceMeshRef.current = faceMesh

    // Start camera processing
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (faceMeshRef.current && videoRef.current) {
          await faceMeshRef.current.send({ image: videoRef.current })
        }
      },
      width: 1280,
      height: 720
    })

    camera.start()
      .then(() => {
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Camera start error:', err)
        setModelError('Failed to initialize face detection')
        setIsLoading(false)
      })

    cameraRef.current = camera

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close()
      }
    }
  }, [isActive, videoRef])

  const getAnalysisHistory = useCallback(() => {
    return [...analysisHistory.current]
  }, [])

  const clearHistory = useCallback(() => {
    analysisHistory.current = []
    resetAnalysis()
    lastSecondTick.current = null
    frameCount.current = 0
  }, [])

  const beginCalibration = useCallback(() => {
    const calibInfo = startCalibration()
    setAnalysis(prev => ({
      ...prev,
      isCalibrating: true,
      calibrationProgress: 0,
      calibrationPhase: 'A',
    }))
    return calibInfo
  }, [])

  const cancelCalibration = useCallback(() => {
    skipCalibration()
    setAnalysis(prev => ({
      ...prev,
      isCalibrating: false,
      isCalibrated: true,
      calibrationProgress: 0,
    }))
  }, [])

  const getAllEvents = useCallback(() => {
    return getEvents()
  }, [])

  const getMetricsHistory = useCallback(() => {
    return getSecondMetrics()
  }, [])

  return {
    analysis,
    landmarks,
    isLoading,
    modelError,
    getAnalysisHistory,
    clearHistory,
    beginCalibration,
    cancelCalibration,
    getAllEvents,
    getMetricsHistory,
    frameCount: frameCount.current,
  }
}
