import { useState, useEffect, useRef, useCallback } from 'react'

export function useWebcam() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)

  // Get available video devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(d => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(videoDevices[0].deviceId)
        }
      } catch (err) {
        console.error('Error enumerating devices:', err)
      }
    }
    getDevices()
  }, [])

  const startWebcam = useCallback(async () => {
    try {
      setError(null)
      
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
          ...(selectedDevice && { deviceId: { exact: selectedDevice } })
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsActive(true)
    } catch (err) {
      console.error('Error starting webcam:', err)
      setError(err.message || 'Failed to access webcam')
      setIsActive(false)
    }
  }, [selectedDevice])

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  const switchDevice = useCallback(async (deviceId) => {
    setSelectedDevice(deviceId)
    if (isActive) {
      stopWebcam()
      // Small delay to ensure previous stream is fully stopped
      setTimeout(() => startWebcam(), 100)
    }
  }, [isActive, stopWebcam, startWebcam])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return {
    videoRef,
    isActive,
    error,
    devices,
    selectedDevice,
    startWebcam,
    stopWebcam,
    switchDevice
  }
}

