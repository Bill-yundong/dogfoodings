import { Component, createEffect, createSignal, onMount, For } from 'solid-js'
import { waveformManager } from '@/db/timeSeries'
import { TrendChart } from '@/components/TrendChart'
import { formatTimestamp, formatPercent, formatFlowRate } from '@/utils/format'
import { FILLING_PHASE_CONFIG } from '@/types'
import { History, Play, Pause, SkipBack, SkipForward, Download, Search, Calendar, BarChart3, RefreshCw } from 'lucide-solid'

interface ReplayState {
  isPlaying: boolean
  currentTime: number
  startTime: number
  endTime: number
  speed: number
}

interface SelectedChannel {
  name: string
  color: string
  enabled: boolean
}

export const DataReplay: Component = () => {
  const [replayState, setReplayState] = createSignal<ReplayState>({
    isPlaying: false,
    currentTime: 0,
    startTime: 0,
    endTime: 0,
    speed: 1
  })
  
  const [sessions, setSessions] = createSignal<any[]>([])
  const [selectedSession, setSelectedSession] = createSignal<any>(null)
  const [replayData, setReplayData] = createSignal<any[]>([])
  const [replayIndex, setReplayIndex] = createSignal(0)
  const [searchTerm, setSearchTerm] = createSignal('')
  
  const [selectedChannels, setSelectedChannels] = createSignal<SelectedChannel[]>([
    { name: 'oxygenFillLevel', color: '#00d4ff', enabled: true },
    { name: 'hydrogenFillLevel', color: '#00ffc8', enabled: true },
    { name: 'oxygenFlowRate', color: '#00d4ff', enabled: false },
    { name: 'hydrogenFlowRate', color: '#00ffc8', enabled: false },
    { name: 'oxygenLinePressure', color: '#00d4ff', enabled: false },
    { name: 'hydrogenLinePressure', color: '#00ffc8', enabled: false },
    { name: 'waterHammerRisk', color: '#ff2d55', enabled: true },
    { name: 'temperatureGradient', color: '#ff6b35', enabled: true },
  ])
  
  const [comparisonData, setComparisonData] = createSignal<Record<string, { x: number[], y: number[] }>>({})
  const [events, setEvents] = createSignal<any[]>([])
  
  let playInterval: number | undefined
  
  onMount(async () => {
    loadSessions()
    loadCurrentSessionData()
  })
  
  const loadSessions = async () => {
    const sessionList = await waveformManager.getSessions()
    setSessions(sessionList)
    
    if (sessionList.length > 0 && !selectedSession()) {
      setSelectedSession(sessionList[0])
    }
  }
  
  const loadCurrentSessionData = async () => {
    const now = Date.now()
    const oneHourAgo = now - 3600000
    
    const data = await waveformManager.getHistoricalData(oneHourAgo, now)
    setReplayData(data)
    
    if (data.length > 0) {
      setReplayState({
        isPlaying: false,
        currentTime: data[0].timestamp,
        startTime: data[0].timestamp,
        endTime: data[data.length - 1].timestamp,
        speed: 1
      })
      setReplayIndex(0)
    }
    
    const eventList = await waveformManager.getEvents(oneHourAgo, now)
    setEvents(eventList)
    
    updateComparisonData()
  }
  
  const updateComparisonData = () => {
    const data = replayData()
    const result: Record<string, { x: number[], y: number[] }> = {}
    
    for (const channel of selectedChannels().filter(c => c.enabled)) {
      result[channel.name] = {
        x: data.map(d => d.timestamp),
        y: data.map(d => d[channel.name as keyof typeof d] as number)
      }
    }
    
    setComparisonData(result)
  }
  
  createEffect(() => {
    updateComparisonData()
  })
  
  const toggleChannel = (name: string) => {
    setSelectedChannels(channels => 
      channels.map(c => 
        c.name === name ? { ...c, enabled: !c.enabled } : c
      )
    )
  }
  
  const handlePlayPause = () => {
    if (replayState().isPlaying) {
      stopReplay()
    } else {
      startReplay()
    }
  }
  
  const startReplay = () => {
    setReplayState(s => ({ ...s, isPlaying: true }))
    
    playInterval = window.setInterval(() => {
      setReplayIndex(idx => {
        const newIdx = Math.min(idx + replayState().speed, replayData().length - 1)
        
        if (newIdx >= replayData().length - 1) {
          stopReplay()
          return idx
        }
        
        const data = replayData()[newIdx]
        if (data) {
          setReplayState(s => ({ ...s, currentTime: data.timestamp }))
        }
        
        return newIdx
      })
    }, 100)
  }
  
  const stopReplay = () => {
    setReplayState(s => ({ ...s, isPlaying: false }))
    if (playInterval) {
      clearInterval(playInterval)
      playInterval = undefined
    }
  }
  
  const handleSeek = (e: Event) => {
    const target = e.target as HTMLInputElement
    const value = parseInt(target.value)
    const data = replayData()
    
    if (data.length > 0) {
      const idx = Math.floor((value / 100) * (data.length - 1))
      setReplayIndex(idx)
      if (data[idx]) {
        setReplayState(s => ({ ...s, currentTime: data[idx].timestamp }))
      }
    }
  }
  
  const handleSpeedChange = (speed: number) => {
    setReplayState(s => ({ ...s, speed }))
  }
  
  const handleSkipBack = () => {
    const newIdx = Math.max(0, replayIndex() - 50)
    setReplayIndex(newIdx)
    const data = replayData()[newIdx]
    if (data) {
      setReplayState(s => ({ ...s, currentTime: data.timestamp }))
    }
  }
  
  const handleSkipForward = () => {
    const newIdx = Math.min(replayData().length - 1, replayIndex() + 50)
    setReplayIndex(newIdx)
    const data = replayData()[newIdx]
    if (data) {
      setReplayState(s => ({ ...s, currentTime: data.timestamp }))
    }
  }
  
  const handleExport = async () => {
    const json = await waveformManager.exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rocketflow-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleRefresh = async () => {
    await loadCurrentSessionData()
  }
  
  const currentReplayData = () => replayData()[replayIndex()]
  
  const progressPercent = () => {
    const data = replayData()
    if (data.length < 2) return 0
    return (replayIndex() / (data.length - 1)) * 100
  }
  
  const filteredEvents = () => events().filter(e => 
    e.eventDescription.toLowerCase().includes(searchTerm().toLowerCase()) ||
    e.eventType.toLowerCase().includes(searchTerm().toLowerCase())
  )
  
  const getPhaseAtTime = () => {
    const data = currentReplayData()
    return data ? FILLING_PHASE_CONFIG[data.phase as keyof typeof FILLING_PHASE_CONFIG]?.name || '未知' : '待机'
  }
  
  return (
    <div class="h-full flex flex-col bg-space-deep text-white overflow-hidden">
      <div class="absolute inset-0 noise pointer-events-none opacity-30" />
      <div class="absolute inset-0 grid-bg pointer-events-none" />
      
      <header class="relative z-10 px-6 py-3 bg-space-blue/50 backdrop-blur-sm border-b border-space-blue">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <History class="w-6 h-6 text-lox-blue" />
            <h1 class="text-xl font-bold font-orbitron tracking-wider text-lox-blue">
              数据复盘中心
            </h1>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-jetbrains text-gray-400">
                {replayData().length > 0 ? (
                  `${new Date(replayState().startTime).toLocaleDateString('zh-CN')}`
                ) : '暂无数据'}
              </span>
            </div>
            
            <button
              onClick={handleRefresh}
              class="flex items-center gap-2 px-3 py-1.5 bg-space-deep hover:bg-lox-blue/20 text-lox-blue rounded text-sm transition-all"
            >
              <RefreshCw class="w-4 h-4" /> 刷新
            </button>
            
            <button
              onClick={handleExport}
              class="flex items-center gap-2 px-3 py-1.5 bg-lox-blue/20 hover:bg-lox-blue/30 text-lox-blue rounded text-sm transition-all"
            >
              <Download class="w-4 h-4" /> 导出数据
            </button>
          </div>
        </div>
      </header>
      
      <main class="flex-1 relative z-10 p-4 overflow-auto">
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-3 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-lox-blue mb-3">选择通道</h3>
              
              <div class="space-y-2">
                <For each={selectedChannels()}>
                  {(channel) => (
                    <label 
                      class="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-space-deep transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={channel.enabled}
                        onChange={() => toggleChannel(channel.name)}
                        class="w-4 h-4 rounded border-gray-600"
                        style={{ 'accent-color': channel.color }}
                      />
                      <div 
                        class="w-3 h-3 rounded-full"
                        style={{ 'background-color': channel.color }}
                      />
                      <span class="text-xs font-jetbrains text-gray-300">{channel.name}</span>
                    </label>
                  )}
                </For>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-lox-blue mb-3">同步参数</h3>
              
              {currentReplayData() && (
                <div class="space-y-2 text-xs font-jetbrains">
                  <div class="flex justify-between">
                    <span class="text-gray-400">时间戳</span>
                    <span class="text-white">{formatTimestamp(currentReplayData().timestamp)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">阶段</span>
                    <span class="text-lox-blue">{getPhaseAtTime()}</span>
                  </div>
                  <div class="border-t border-space-deep pt-2 mt-2">
                    <div class="flex justify-between">
                      <span class="text-gray-400">氧液位</span>
                      <span class="text-lox-blue">{formatPercent(currentReplayData().oxygenFillLevel)}%</span>
                    </div>
                    <div class="flex justify-between mt-1">
                      <span class="text-gray-400">氢液位</span>
                      <span class="text-lh2-cyan">{formatPercent(currentReplayData().hydrogenFillLevel)}%</span>
                    </div>
                  </div>
                  <div class="border-t border-space-deep pt-2 mt-2">
                    <div class="flex justify-between">
                      <span class="text-gray-400">氧流量</span>
                      <span class="text-lox-blue">{formatFlowRate(currentReplayData().oxygenFlowRate)} kg/s</span>
                    </div>
                    <div class="flex justify-between mt-1">
                      <span class="text-gray-400">氢流量</span>
                      <span class="text-lh2-cyan">{formatFlowRate(currentReplayData().hydrogenFlowRate)} kg/s</span>
                    </div>
                  </div>
                  <div class="border-t border-space-deep pt-2 mt-2">
                    <div class="flex justify-between">
                      <span class="text-gray-400">水锤风险</span>
                      <span class={currentReplayData().waterHammerRisk > 50 ? 'text-danger-red' : 'text-success-green'}>
                        {currentReplayData().waterHammerRisk.toFixed(1)}%
                      </span>
                    </div>
                    <div class="flex justify-between mt-1">
                      <span class="text-gray-400">温度梯度</span>
                      <span class="text-warning-orange">{currentReplayData().temperatureGradient.toFixed(2)} K/m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-lox-blue mb-3">会话列表</h3>
              
              <div class="space-y-2 max-h-40 overflow-y-auto">
                {sessions().length > 0 ? (
                  <For each={sessions().map((session) => ({ session }))}>
                    {({ session }) => (
                      <div
                        class={`p-2 rounded cursor-pointer transition-all ${
                          selectedSession()?.id === session.id
                            ? 'bg-lox-blue/20 border border-lox-blue'
                            : 'bg-space-deep hover:bg-lox-blue/10 border border-transparent'
                        }`}
                        onClick={() => setSelectedSession(session)}
                      >
                        <div class="text-xs font-jetbrains text-white">{session.sessionName}</div>
                        <div class="text-xs text-gray-500 font-jetbrains mt-1">
                          {new Date(session.startTime).toLocaleString('zh-CN')}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                          <span class={`text-xs px-1.5 py-0.5 rounded ${
                            session.status === 'COMPLETED' ? 'bg-success-green/20 text-success-green' :
                            session.status === 'RUNNING' ? 'bg-lox-blue/20 text-lox-blue' :
                            'bg-warning-yellow/20 text-warning-yellow'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </For>
                ) : (
                  <div class="text-center text-gray-600 text-xs py-4">暂无历史会话</div>
                )}
              </div>
            </div>
          </div>
          
          <div class="col-span-6 flex flex-col gap-4">
            <div class="panel p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-orbitron text-white flex items-center gap-2">
                  <BarChart3 class="w-4 h-4" /> 多通道波形对比
                </h3>
                <span class="text-xs text-gray-500 font-jetbrains">
                  数据点: {replayData().length}
                </span>
              </div>
              
              <div class="space-y-4">
                <For each={selectedChannels().filter(c => c.enabled)}>
                  {(channel) => {
                    const data = comparisonData()[channel.name]
                    if (!data || data.x.length < 2) return null
                    
                    return (
                      <div class="bg-space-deep p-3 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <div 
                              class="w-3 h-3 rounded-full"
                              style={{ 'background-color': channel.color }}
                            />
                            <span class="text-xs font-jetbrains text-gray-300">{channel.name}</span>
                          </div>
                          <span class="text-xs font-jetbrains" style={{ color: channel.color }}>
                            {data.y[data.y.length - 1]?.toFixed(2) || '-'}
                          </span>
                        </div>
                        <TrendChart
                          data={data}
                          label=""
                          color={channel.color}
                          height={80}
                          showGrid={false}
                          showYAxis={false}
                        />
                      </div>
                    )
                  }}
                </For>
                
                {selectedChannels().filter(c => c.enabled).length === 0 && (
                  <div class="text-center text-gray-600 text-sm py-8">
                    请从左侧选择要显示的通道
                  </div>
                )}
              </div>
            </div>
            
            <div class="panel p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-orbitron text-white">回放控制</h3>
                <span class="text-sm font-jetbrains text-lox-blue">
                  {formatTimestamp(replayState().currentTime)}
                </span>
              </div>
              
              <div class="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercent()}
                  onInput={handleSeek}
                  class="w-full h-2 bg-space-deep rounded-lg appearance-none cursor-pointer accent-lox-blue"
                />
                <div class="flex justify-between text-xs text-gray-500 font-jetbrains mt-1">
                  <span>{formatTimestamp(replayState().startTime)}</span>
                  <span>{formatTimestamp(replayState().endTime)}</span>
                </div>
              </div>
              
              <div class="flex items-center justify-center gap-4">
                <button
                  onClick={handleSkipBack}
                  class="p-2 bg-space-deep hover:bg-lox-blue/20 text-white rounded-lg transition-all"
                >
                  <SkipBack class="w-5 h-5" />
                </button>
                
                <button
                  onClick={handlePlayPause}
                  class="p-4 bg-lox-blue/20 hover:bg-lox-blue/30 text-lox-blue rounded-full transition-all hover:scale-110"
                >
                  {replayState().isPlaying ? (
                    <Pause class="w-6 h-6" />
                  ) : (
                    <Play class="w-6 h-6 ml-1" />
                  )}
                </button>
                
                <button
                  onClick={handleSkipForward}
                  class="p-2 bg-space-deep hover:bg-lox-blue/20 text-white rounded-lg transition-all"
                >
                  <SkipForward class="w-5 h-5" />
                </button>
              </div>
              
              <div class="flex items-center justify-center gap-2 mt-4">
                <span class="text-xs text-gray-500 font-jetbrains">速度:</span>
                <For each={[0.5, 1, 2, 5, 10]}>
                  {(speed) => (
                    <button
                      onClick={() => handleSpeedChange(speed)}
                      class={`px-2 py-1 text-xs font-jetbrains rounded transition-all ${
                        replayState().speed === speed
                          ? 'bg-lox-blue text-space-deep font-bold'
                          : 'bg-space-deep text-gray-400 hover:bg-lox-blue/20 hover:text-lox-blue'
                      }`}
                    >
                      {speed}x
                    </button>
                  )}
                </For>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">加注阶段时间轴</h3>
              
              <div class="relative">
                <div class="absolute left-0 right-0 top-4 h-1 bg-space-deep rounded-full" />
                
                <div class="flex justify-between relative">
                  <For each={(['IDLE', 'PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING', 'READY'] as const)}>
                    {(phase, idx) => {
                      const phases = ['IDLE', 'PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING', 'READY'] as const
                      const currentPhaseIdx = phases.indexOf(currentReplayData()?.phase || 'IDLE')
                      const isActive = idx() <= currentPhaseIdx
                      const isCurrent = phase === currentReplayData()?.phase
                      
                      return (
                        <div class="flex flex-col items-center">
                        <div 
                          class={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isCurrent 
                              ? 'bg-lox-blue text-space-deep scale-125' 
                              : isActive 
                                ? 'bg-success-green text-space-deep' 
                                : 'bg-space-deep text-gray-600 border border-gray-600'
                          }`}
                        >
                          {idx() + 1}
                        </div>
                        <div class={`text-xs font-jetbrains mt-2 text-center ${
                          isActive ? 'text-white' : 'text-gray-600'
                        }`}>
                          {FILLING_PHASE_CONFIG[phase].name}
                        </div>
                      </div>
                    )
                  }}
                  </For>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-span-3 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3 flex items-center gap-2">
                <Search class="w-4 h-4" /> 事件搜索
              </h3>
              
              <input
                type="text"
                placeholder="搜索事件..."
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.target.value)}
                class="w-full px-3 py-2 bg-space-deep border border-space-blue rounded-lg text-white text-sm font-jetbrains focus:outline-none focus:border-lox-blue transition-all"
              />
            </div>
            
            <div class="panel p-4 flex-1">
              <h3 class="text-sm font-orbitron text-white mb-3">事件时间线</h3>
              
              <div class="relative">
                <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-space-blue" />
                
                <div class="space-y-4 max-h-96 overflow-y-auto">
                  <For each={filteredEvents().slice(0, 20).map((event) => ({ event }))}>
                    {({ event }) => (
                      <div class="relative pl-8">
                      <div 
                        class={`absolute left-1.5 w-4 h-4 rounded-full border-2 ${
                          event.eventSeverity === 'CRITICAL' ? 'border-danger-red bg-danger-red' :
                          event.eventSeverity === 'ERROR' ? 'border-warning-orange bg-warning-orange' :
                          event.eventSeverity === 'WARNING' ? 'border-warning-yellow bg-warning-yellow' :
                          'border-success-green bg-success-green'
                        }`}
                      />
                      
                      <div class="bg-space-deep p-3 rounded-lg">
                        <div class="flex items-center justify-between mb-1">
                          <span class={`text-xs font-bold font-jetbrains ${
                            event.eventSeverity === 'CRITICAL' ? 'text-danger-red' :
                            event.eventSeverity === 'ERROR' ? 'text-warning-orange' :
                            event.eventSeverity === 'WARNING' ? 'text-warning-yellow' :
                            'text-success-green'
                          }`}>
                            {event.eventType}
                          </span>
                          <span class="text-xs text-gray-500 font-jetbrains">
                            {new Date(event.eventTimestamp).toLocaleTimeString('zh-CN')}
                          </span>
                        </div>
                        <p class="text-xs text-gray-400 font-jetbrains">
                          {event.eventDescription}
                        </p>
                      </div>
                    </div>
                    )}
                  </For>
                  
                  {filteredEvents().length === 0 && (
                    <div class="text-center text-gray-600 text-sm py-8">暂无事件</div>
                  )}
                </div>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">数据统计</h3>
              
              <div class="space-y-2 text-xs font-jetbrains">
                <div class="flex justify-between">
                  <span class="text-gray-400">总数据点</span>
                  <span class="text-white">{replayData().length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">时间跨度</span>
                  <span class="text-white">
                    {replayData().length > 0 
                      ? Math.round((replayState().endTime - replayState().startTime) / 60000) + ' 分钟'
                      : '-'}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">事件总数</span>
                  <span class="text-white">{events().length}</span>
                </div>
                <div class="border-t border-space-deep pt-2 mt-2">
                  <div class="flex justify-between">
                    <span class="text-gray-400">平均水锤风险</span>
                    <span class="text-warning-yellow">
                      {replayData().length > 0 
                        ? (replayData().reduce((sum, d) => sum + d.waterHammerRisk, 0) / replayData().length).toFixed(1) + '%'
                        : '-'}
                    </span>
                  </div>
                  <div class="flex justify-between mt-1">
                    <span class="text-gray-400">最大温度梯度</span>
                    <span class="text-warning-orange">
                      {replayData().length > 0 
                        ? Math.max(...replayData().map(d => d.temperatureGradient)).toFixed(2) + ' K/m'
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
