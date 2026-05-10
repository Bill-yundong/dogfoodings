import { TrajectoryOffset, PunctualityMetrics, ScheduleAdjustment, BusStatus } from '../models/dataModels';
import { 
  saveTrajectoryOffset, 
  savePunctualityMetrics, 
  saveScheduleAdjustment,
  getTrajectoryOffsetsByRoute,
  getSchedulesByRoute
} from '../storage/indexedDB';

const DELAY_THRESHOLD_SECONDS = 180;
const CONSECUTIVE_OFFSETS_THRESHOLD = 3;
const ADJUSTMENT_COOLDOWN_MS = 10 * 60 * 1000;

class DataIntegrationService {
  constructor() {
    this.busOffsetHistory = new Map();
    this.lastAdjustments = new Map();
    this.listeners = {
      onPunctualityUpdate: [],
      onScheduleAdjustment: [],
      onOffsetUpdate: []
    };
  }
  
  subscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
      return () => {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      };
    }
  }
  
  async processTrajectoryOffset(offset, fittingResult) {
    await this.saveOffset(offset);
    this.notifyListeners('onOffsetUpdate', { offset, fittingResult });
    await this.updatePunctualityMetrics(offset);
    await this.checkAndAdjustSchedule(offset, fittingResult);
  }
  
  async saveOffset(offset) {
    try {
      await saveTrajectoryOffset(offset);
      
      if (!this.busOffsetHistory.has(offset.busId)) {
        this.busOffsetHistory.set(offset.busId, []);
      }
      
      const history = this.busOffsetHistory.get(offset.busId);
      history.push(offset);
      
      if (history.length > 50) {
        history.shift();
      }
    } catch (error) {
      console.error('Failed to save trajectory offset:', error);
    }
  }
  
  async updatePunctualityMetrics(offset) {
    const now = Date.now();
    const hourStart = now - (now % 3600000);
    
    const startTime = hourStart - 3600000;
    const recentOffsets = await getTrajectoryOffsetsByRoute(
      offset.routeId, 
      startTime, 
      now
    );
    
    if (recentOffsets.length === 0) return;
    
    const groupedByBus = new Map();
    
    for (const off of recentOffsets) {
      if (!groupedByBus.has(off.busId)) {
        groupedByBus.set(off.busId, []);
      }
      groupedByBus.get(off.busId).push(off);
    }
    
    let onTimeCount = 0;
    let earlyCount = 0;
    let delayedCount = 0;
    let totalDelay = 0;
    
    for (const [, busOffsets] of groupedByBus) {
      const latest = busOffsets[busOffsets.length - 1];
      
      switch (latest.status) {
        case BusStatus.ON_TIME:
          onTimeCount++;
          break;
        case BusStatus.EARLY:
          earlyCount++;
          totalDelay += latest.delaySeconds;
          break;
        case BusStatus.DELAYED:
          delayedCount++;
          totalDelay += latest.delaySeconds;
          break;
      }
    }
    
    const totalBuses = onTimeCount + earlyCount + delayedCount;
    const onTimeRate = totalBuses > 0 ? onTimeCount / totalBuses : 0;
    const avgDelay = (earlyCount + delayedCount) > 0 ? totalDelay / (earlyCount + delayedCount) : 0;
    
    const metrics = new PunctualityMetrics(
      offset.routeId,
      now,
      onTimeCount,
      earlyCount,
      delayedCount,
      avgDelay,
      onTimeRate
    );
    
    await savePunctualityMetrics(metrics);
    this.notifyListeners('onPunctualityUpdate', metrics);
  }
  
  async checkAndAdjustSchedule(offset, fittingResult) {
    const now = Date.now();
    const lastAdjustment = this.lastAdjustments.get(offset.busId);
    
    if (lastAdjustment && (now - lastAdjustment < ADJUSTMENT_COOLDOWN_MS)) {
      return;
    }
    
    const history = this.busOffsetHistory.get(offset.busId) || [];
    const recentOffsets = history.slice(-CONSECUTIVE_OFFSETS_THRESHOLD);
    
    if (recentOffsets.length < CONSECUTIVE_OFFSETS_THRESHOLD) {
      return;
    }
    
    const allDelayed = recentOffsets.every(o => 
      Math.abs(o.delaySeconds) > DELAY_THRESHOLD_SECONDS
    );
    
    if (!allDelayed) {
      return;
    }
    
    const avgDelay = recentOffsets.reduce((sum, o) => sum + o.delaySeconds, 0) / recentOffsets.length;
    const schedules = await getSchedulesByRoute(offset.routeId);
    const currentSchedule = schedules.find(s => s.busId === offset.busId && s.status === 'active');
    
    if (!currentSchedule) {
      return;
    }
    
    const adjustmentSeconds = Math.round(avgDelay);
    const newStopTimes = currentSchedule.stopTimes.map(st => ({
      ...st,
      arrivalTime: st.arrivalTime + adjustmentSeconds * 1000,
      departureTime: st.departureTime + adjustmentSeconds * 1000
    }));
    
    const adjustment = new ScheduleAdjustment(
      currentSchedule.id,
      avgDelay > 0 ? 'significant_delay' : 'early_arrival',
      currentSchedule.startTime + adjustmentSeconds * 1000,
      currentSchedule.endTime + adjustmentSeconds * 1000,
      newStopTimes,
      now
    );
    
    await saveScheduleAdjustment(adjustment);
    this.lastAdjustments.set(offset.busId, now);
    this.notifyListeners('onScheduleAdjustment', {
      schedule: currentSchedule,
      adjustment,
      reason: avgDelay > 0 
        ? `连续 ${CONSECUTIVE_OFFSETS_THRESHOLD} 次检测到延误，平均延误 ${Math.abs(adjustmentSeconds)} 秒`
        : `连续 ${CONSECUTIVE_OFFSETS_THRESHOLD} 次检测到早到，平均早到 ${Math.abs(adjustmentSeconds)} 秒`
    });
  }
  
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  async getBusStatus(busId) {
    const history = this.busOffsetHistory.get(busId) || [];
    if (history.length === 0) return null;
    
    const latest = history[history.length - 1];
    const avgDelay = history.length > 0 
      ? history.reduce((sum, o) => sum + o.delaySeconds, 0) / history.length 
      : 0;
    
    return {
      busId,
      latestOffset: latest,
      averageDelay: avgDelay,
      historyLength: history.length
    };
  }
  
  clearBusData(busId) {
    this.busOffsetHistory.delete(busId);
    this.lastAdjustments.delete(busId);
  }
}

const integrationService = new DataIntegrationService();

export { DataIntegrationService, integrationService };
