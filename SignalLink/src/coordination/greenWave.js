import { TimeSlot } from '../types';
import { database } from '../services/database';

const TIME_SLOT_CONFIGS = {
  [TimeSlot.MORNING_PEAK]: {
    startHour: 7,
    endHour: 9,
    targetSpeed: 40,
    cycleLength: 120,
    priorityDirection: 'east'
  },
  [TimeSlot.MIDDAY]: {
    startHour: 9,
    endHour: 17,
    targetSpeed: 50,
    cycleLength: 100,
    priorityDirection: 'balanced'
  },
  [TimeSlot.EVENING_PEAK]: {
    startHour: 17,
    endHour: 19,
    targetSpeed: 35,
    cycleLength: 130,
    priorityDirection: 'west'
  },
  [TimeSlot.NIGHT]: {
    startHour: 19,
    endHour: 7,
    targetSpeed: 45,
    cycleLength: 80,
    priorityDirection: 'balanced'
  }
};

export class RoadsideDevice {
  constructor(deviceId, intersectionId, location) {
    this.deviceId = deviceId;
    this.intersectionId = intersectionId;
    this.location = location;
    this.status = 'online';
    this.lastSync = null;
    this.actualTiming = null;
    this.commands = [];
  }

  updateStatus(status) {
    this.status = status;
  }

  receiveCommand(command) {
    this.commands.push({
      ...command,
      receivedAt: Date.now()
    });
    return true;
  }

  executeCommands() {
    const executed = [];
    for (const command of this.commands) {
      if (command.type === 'sync_timing') {
        this.actualTiming = command.payload;
        this.lastSync = Date.now();
        executed.push(command);
      }
    }
    this.commands = this.commands.filter(c => !executed.includes(c));
    return executed;
  }

  getStatus() {
    return {
      deviceId: this.deviceId,
      intersectionId: this.intersectionId,
      status: this.status,
      lastSync: this.lastSync,
      actualTiming: this.actualTiming
    };
  }
}

export class TrafficManagementSystem {
  constructor() {
    this.plans = new Map();
    this.devices = new Map();
    this.currentTimeSlot = TimeSlot.MIDDAY;
    this.syncInterval = 30000;
    this.syncTimer = null;
    this.listeners = [];
  }

  addRoadsideDevice(deviceId, intersectionId, location) {
    const device = new RoadsideDevice(deviceId, intersectionId, location);
    this.devices.set(deviceId, device);
    return device;
  }

  createGreenWavePlan(id, intersections, timeSlot = TimeSlot.MIDDAY) {
    const config = TIME_SLOT_CONFIGS[timeSlot];
    const plan = {
      id,
      timeSlot,
      intersections: intersections.map((int, index) => ({
        ...int,
        offset: this.calculateOffset(index, intersections.length, config)
      })),
      targetSpeed: config.targetSpeed,
      cycleLength: config.cycleLength,
      priorityDirection: config.priorityDirection,
      createdAt: Date.now(),
      status: 'draft'
    };
    this.plans.set(id, plan);
    return plan;
  }

  calculateOffset(index, totalIntersections, config) {
    const phaseDiff = (360 / totalIntersections) * index;
    return (phaseDiff * config.cycleLength) / 360;
  }

  getCurrentTimeSlot() {
    const hour = new Date().getHours();
    
    if (hour >= 7 && hour < 9) return TimeSlot.MORNING_PEAK;
    if (hour >= 9 && hour < 17) return TimeSlot.MIDDAY;
    if (hour >= 17 && hour < 19) return TimeSlot.EVENING_PEAK;
    return TimeSlot.NIGHT;
  }

  activatePlan(planId) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    plan.status = 'active';
    this.currentTimeSlot = plan.timeSlot;

    for (const device of this.devices.values()) {
      const intersectionConfig = plan.intersections.find(
        int => int.intersectionId === device.intersectionId
      );
      
      if (intersectionConfig) {
        const command = {
          type: 'sync_timing',
          payload: {
            greenTimeNS: intersectionConfig.greenTimeNS || 30,
            greenTimeEW: intersectionConfig.greenTimeEW || 25,
            yellowTime: 3,
            offset: intersectionConfig.offset,
            planId,
            timeSlot: plan.timeSlot
          }
        };
        device.receiveCommand(command);
      }
    }

    this.notifyListeners('plan_activated', plan);
    return plan;
  }

  syncDevices() {
    const results = [];
    
    for (const device of this.devices.values()) {
      if (device.status === 'online') {
        const executed = device.executeCommands();
        results.push({
          deviceId: device.deviceId,
          executedCommands: executed,
          status: device.getStatus()
        });
      }
    }

    this.notifyListeners('sync_complete', results);
    return results;
  }

  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncDevices();
      this.checkTimeSlotChange();
    }, this.syncInterval);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  checkTimeSlotChange() {
    const newTimeSlot = this.getCurrentTimeSlot();
    if (newTimeSlot !== this.currentTimeSlot) {
      this.currentTimeSlot = newTimeSlot;
      this.notifyListeners('timeslot_changed', newTimeSlot);
      return true;
    }
    return false;
  }

  getDeviceAlignment(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const activePlans = Array.from(this.plans.values()).filter(p => p.status === 'active');
    if (activePlans.length === 0 || !device.actualTiming) {
      return { isAligned: false, deviation: null };
    }

    const plan = activePlans[0];
    const expectedConfig = plan.intersections.find(
      int => int.intersectionId === device.intersectionId
    );

    if (!expectedConfig) {
      return { isAligned: false, deviation: null };
    }

    const deviation = {
      offsetDiff: Math.abs((device.actualTiming.offset || 0) - (expectedConfig.offset || 0)),
      cycleDiff: Math.abs(
        (device.actualTiming.greenTimeNS + device.actualTiming.greenTimeEW + 2 * device.actualTiming.yellowTime) -
        (expectedConfig.greenTimeNS + expectedConfig.greenTimeEW + 6)
      )
    };

    const isAligned = deviation.offsetDiff < 2 && deviation.cycleDiff < 5;

    return { isAligned, deviation, expectedConfig, actualConfig: device.actualTiming };
  }

  getAllAlignments() {
    const alignments = {};
    for (const deviceId of this.devices.keys()) {
      alignments[deviceId] = this.getDeviceAlignment(deviceId);
    }
    return alignments;
  }

  async saveAlignmentLog(deviceId, alignment) {
    return database.addSignalLog({
      intersectionId: this.devices.get(deviceId)?.intersectionId,
      deviceId,
      timeSlot: this.currentTimeSlot,
      isAligned: alignment.isAligned,
      deviation: alignment.deviation,
      expectedConfig: alignment.expectedConfig,
      actualConfig: alignment.actualConfig
    });
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Listener error:', e);
      }
    }
  }

  getPlans() {
    return Array.from(this.plans.values());
  }

  getDevices() {
    return Array.from(this.devices.values()).map(d => d.getStatus());
  }

  reset() {
    this.stopAutoSync();
    this.plans.clear();
    this.devices.clear();
    this.currentTimeSlot = TimeSlot.MIDDAY;
    this.listeners = [];
  }
}

export const trafficSystem = new TrafficManagementSystem();
