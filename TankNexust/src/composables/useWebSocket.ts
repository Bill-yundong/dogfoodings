import { ref, onUnmounted } from 'vue'
import type { DiffusionResult } from '@/types/simulation'
import type { EmergencyTerminal } from '@/types/terminal'

interface WebSocketMessage {
  type: 'diffusion_update' | 'terminal_alert' | 'evacuation_command' | 'status_update'
  payload: any
  timestamp: number
}

export function useWebSocket() {
  const isConnected = ref(false)
  const messages = ref<WebSocketMessage[]>([])
  const lastMessage = ref<WebSocketMessage | null>(null)
  const onMessageCallbacks = ref<Map<string, (data: any) => void>>(new Map())

  let simulationInterval: ReturnType<typeof setInterval> | null = null

  function connect() {
    isConnected.value = true
    console.log('[WebSocket] Connected (Simulated)')
  }

  function disconnect() {
    isConnected.value = false
    if (simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
    console.log('[WebSocket] Disconnected')
  }

  function send(type: WebSocketMessage['type'], payload: any) {
    if (!isConnected.value) {
      console.warn('[WebSocket] Not connected')
      return
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now()
    }

    messages.value.push(message)
    lastMessage.value = message

    const callback = onMessageCallbacks.value.get(type)
    if (callback) {
      callback(payload)
    }

    console.log(`[WebSocket] Sent: ${type}`, payload)
  }

  function broadcastDiffusionUpdate(result: DiffusionResult) {
    send('diffusion_update', result)
  }

  function broadcastTerminalAlert(terminal: EmergencyTerminal) {
    send('terminal_alert', terminal)
  }

  function sendEvacuationCommand(terminalId: string, command: string) {
    send('evacuation_command', { terminalId, command, timestamp: Date.now() })
  }

  function sendStatusUpdate(status: any) {
    send('status_update', status)
  }

  function onMessage(type: string, callback: (data: any) => void) {
    onMessageCallbacks.value.set(type, callback)
  }

  function offMessage(type: string) {
    onMessageCallbacks.value.delete(type)
  }

  function simulateRealTimeData(getDiffusion: () => DiffusionResult | null, interval: number = 1000) {
    if (simulationInterval) {
      clearInterval(simulationInterval)
    }

    simulationInterval = setInterval(() => {
      if (!isConnected.value) return

      const result = getDiffusion()
      if (result) {
        broadcastDiffusionUpdate(result)
      }
    }, interval)
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    messages,
    lastMessage,
    connect,
    disconnect,
    send,
    broadcastDiffusionUpdate,
    broadcastTerminalAlert,
    sendEvacuationCommand,
    sendStatusUpdate,
    onMessage,
    offMessage,
    simulateRealTimeData
  }
}
