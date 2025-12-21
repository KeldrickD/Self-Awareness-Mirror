import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, AlertCircle, RefreshCw } from 'lucide-react'

export function WebcamFeed({ 
  videoRef, 
  isActive, 
  isLoading, 
  error, 
  landmarks,
  faceDetected,
  onStart, 
  onStop 
}) {
  const canvasRef = useRef(null)

  // Draw face mesh overlay
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !isActive) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const video = videoRef.current

    // Match canvas to video dimensions
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (landmarks.length > 0 && faceDetected) {
      // Draw face mesh points
      ctx.fillStyle = 'rgba(0, 212, 170, 0.6)'
      
      // Draw key facial landmarks (subset for performance)
      const keyPoints = [
        // Face contour
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
        // Eyes
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161,
        362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384,
        // Nose
        1, 2, 98, 327,
        // Mouth
        61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308
      ]

      keyPoints.forEach(idx => {
        if (landmarks[idx]) {
          const x = landmarks[idx].x * canvas.width
          const y = landmarks[idx].y * canvas.height
          
          ctx.beginPath()
          ctx.arc(x, y, 2, 0, 2 * Math.PI)
          ctx.fill()
        }
      })

      // Draw face bounding box
      const xs = landmarks.map(l => l.x * canvas.width)
      const ys = landmarks.map(l => l.y * canvas.height)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      
      const padding = 20
      ctx.strokeStyle = 'rgba(0, 212, 170, 0.8)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 5])
      ctx.strokeRect(
        minX - padding, 
        minY - padding, 
        maxX - minX + padding * 2, 
        maxY - minY + padding * 2
      )
      ctx.setLineDash([])

      // Draw corner brackets
      const bracketSize = 20
      ctx.lineWidth = 3
      ctx.strokeStyle = '#00d4aa'
      
      // Top-left
      ctx.beginPath()
      ctx.moveTo(minX - padding, minY - padding + bracketSize)
      ctx.lineTo(minX - padding, minY - padding)
      ctx.lineTo(minX - padding + bracketSize, minY - padding)
      ctx.stroke()
      
      // Top-right
      ctx.beginPath()
      ctx.moveTo(maxX + padding - bracketSize, minY - padding)
      ctx.lineTo(maxX + padding, minY - padding)
      ctx.lineTo(maxX + padding, minY - padding + bracketSize)
      ctx.stroke()
      
      // Bottom-left
      ctx.beginPath()
      ctx.moveTo(minX - padding, maxY + padding - bracketSize)
      ctx.lineTo(minX - padding, maxY + padding)
      ctx.lineTo(minX - padding + bracketSize, maxY + padding)
      ctx.stroke()
      
      // Bottom-right
      ctx.beginPath()
      ctx.moveTo(maxX + padding - bracketSize, maxY + padding)
      ctx.lineTo(maxX + padding, maxY + padding)
      ctx.lineTo(maxX + padding, maxY + padding - bracketSize)
      ctx.stroke()
    }
  }, [landmarks, faceDetected, isActive])

  return (
    <div className="relative rounded-2xl overflow-hidden bg-mirror-card border border-mirror-border">
      {/* Video container */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover video-mirror"
          autoPlay
          playsInline
          muted
        />
        
        {/* Face mesh overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full video-mirror pointer-events-none"
        />

        {/* Scan line effect */}
        {isActive && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="scan-line" />
          </div>
        )}

        {/* Loading state */}
        <AnimatePresence>
          {isLoading && isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center"
            >
              <RefreshCw className="w-12 h-12 text-mirror-accent animate-spin mb-4" />
              <p className="text-mirror-text font-medium">Initializing face detection...</p>
              <p className="text-mirror-muted text-sm mt-2">Loading MediaPipe models</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center"
            >
              <AlertCircle className="w-12 h-12 text-mirror-danger mb-4" />
              <p className="text-mirror-danger font-medium">Camera Error</p>
              <p className="text-mirror-muted text-sm mt-2 max-w-md text-center px-4">
                {error}
              </p>
              <button
                onClick={onStart}
                className="mt-4 px-4 py-2 bg-mirror-accent/20 text-mirror-accent rounded-lg hover:bg-mirror-accent/30 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inactive state */}
        {!isActive && !error && (
          <div className="absolute inset-0 bg-gradient-to-br from-mirror-card to-mirror-bg flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="w-24 h-24 rounded-full bg-mirror-accent/10 flex items-center justify-center mx-auto mb-6 glow-accent">
                <Camera className="w-12 h-12 text-mirror-accent" />
              </div>
              <h3 className="text-xl font-semibold text-mirror-text mb-2">
                Ready to Observe
              </h3>
              <p className="text-mirror-muted text-sm max-w-xs mx-auto mb-6">
                Start your session to begin real-time self-awareness analysis
              </p>
            </motion.div>
          </div>
        )}

        {/* Face detection status */}
        {isActive && !isLoading && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <div className={`status-dot ${faceDetected ? 'active' : 'inactive'}`} />
            <span className="text-sm font-medium text-mirror-text">
              {faceDetected ? 'Face Detected' : 'No Face Detected'}
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isActive && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-mirror-danger/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-mirror-danger animate-pulse" />
            <span className="text-sm font-medium text-mirror-danger">LIVE</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-mirror-border flex justify-between items-center">
        <div className="text-sm text-mirror-muted">
          {isActive ? 'Session active' : 'Camera inactive'}
        </div>
        <button
          onClick={isActive ? onStop : onStart}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${isActive 
              ? 'bg-mirror-danger/20 text-mirror-danger hover:bg-mirror-danger/30' 
              : 'bg-mirror-accent text-mirror-bg hover:bg-mirror-accent/90'
            }
          `}
        >
          {isActive ? (
            <>
              <CameraOff className="w-4 h-4" />
              End Session
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Start Session
            </>
          )}
        </button>
      </div>
    </div>
  )
}

