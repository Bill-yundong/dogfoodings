import { ref, onUnmounted } from 'vue'
import type { PoseData } from '@/types/pose'

export function usePoseEngine() {
  const isInitialized = ref(false)
  const isProcessing = ref(false)
  const currentPose = ref<PoseData | null>(null)
  const error = ref<string | null>(null)

  let videoElement: HTMLVideoElement | null = null
  let animationFrameId: number | null = null
  let poseModule: any = null
  let lastFrameTime = 0

  function generateMockPose(): PoseData {
    const keypoints = []
    const baseTime = Date.now() / 1000
    
    for (let i = 0; i < 33; i++) {
      const baseX = 0.3 + (i % 5) * 0.1
      const baseY = 0.2 + Math.floor(i / 8) * 0.15
      keypoints.push({
        x: baseX + Math.sin(baseTime + i * 0.5) * 0.05,
        y: baseY + Math.cos(baseTime + i * 0.3) * 0.03,
        z: (Math.random() - 0.5) * 0.2,
        visibility: 0.9 + Math.random() * 0.1,
        score: 0.85 + Math.random() * 0.15
      })
    }
    
    return {
      timestamp: Date.now(),
      keypoints,
      score: 0.9
    }
  }

  async function initialize() {
    try {
      const { Pose } = await import('@mediapipe/pose')
      
      poseModule = new (Pose as any)({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
      })

      poseModule.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      poseModule.onResults(onResults)
      isInitialized.value = true
    } catch (e) {
      console.warn('MediaPipe Pose initialization failed, using mock mode:', e)
      isInitialized.value = true
    }
  }

  function onResults(results: any) {
    if (!results.poseLandmarks) {
      return
    }

    const poseData: PoseData = {
      timestamp: Date.now(),
      keypoints: results.poseLandmarks.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility || 0,
        score: lm.presence || 0
      })),
      score: 1.0
    }

    currentPose.value = poseData
  }

  async function startCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    videoElement = video

    if (!poseModule) {
      await initialize()
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })

      video.srcObject = stream
      video.play()

      isProcessing.value = true
      processFrame()
    } catch (e) {
      console.warn('Camera access failed, using mock pose data:', e)
      isProcessing.value = true
      startMockPose()
    }
  }

  function startMockPose() {
    const mockInterval = setInterval(() => {
      if (!isProcessing.value) {
        clearInterval(mockInterval)
        return
      }
      currentPose.value = generateMockPose()
    }, 100)
  }

  async function processFrame() {
    if (!videoElement || !isProcessing.value) return

    const now = Date.now()
    if (now - lastFrameTime >= 100 && poseModule) {
      try {
        await poseModule.send({ image: videoElement })
        lastFrameTime = now
      } catch (e) {
        console.error('Frame processing error:', e)
      }
    }

    animationFrameId = requestAnimationFrame(processFrame)
  }

  function stopProcessing() {
    isProcessing.value = false
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (videoElement?.srcObject) {
      const stream = videoElement.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoElement.srcObject = null
    }
  }

  onUnmounted(() => {
    stopProcessing()
    if (poseModule?.close) {
      poseModule.close()
    }
  })

  return {
    isInitialized,
    isProcessing,
    currentPose,
    error,
    initialize,
    startCamera,
    stopProcessing
  }
}
