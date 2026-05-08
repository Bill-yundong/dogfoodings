import { SignalPhase, Direction } from '../types';

const CELL_SIZE = 5;
const MAX_SPEED = 5;
const RANDOM_SLOWDOWN_PROB = 0.2;

export class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vehicle = null;
    this.isIntersection = false;
    this.intersectionId = null;
  }
}

export class Vehicle {
  constructor(id, type, direction, speed = 0) {
    this.id = id;
    this.type = type;
    this.direction = direction;
    this.speed = speed;
    this.previousPosition = null;
    this.waitingTime = 0;
    this.travelTime = 0;
  }
}

export class Intersection {
  constructor(id, x, y, config = {}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.config = {
      greenTimeNS: 30,
      greenTimeEW: 25,
      yellowTime: 3,
      offset: 0,
      ...config
    };
    this.totalCycle = this.config.greenTimeNS + this.config.greenTimeEW + 2 * this.config.yellowTime;
    this.phaseTimer = this.config.offset;
    this._applyOffset();
  }

  _applyOffset() {
    let remainingOffset = this.config.offset % this.totalCycle;
    
    if (remainingOffset < this.config.greenTimeNS) {
      this.currentPhase = SignalPhase.GREEN;
      this.phaseDirection = Direction.NORTH;
      this.phaseTimer = remainingOffset;
    } else if (remainingOffset < this.config.greenTimeNS + this.config.yellowTime) {
      this.currentPhase = SignalPhase.YELLOW;
      this.phaseDirection = Direction.NORTH;
      this.phaseTimer = remainingOffset - this.config.greenTimeNS;
    } else if (remainingOffset < this.config.greenTimeNS + this.config.yellowTime + this.config.greenTimeEW) {
      this.currentPhase = SignalPhase.GREEN;
      this.phaseDirection = Direction.EAST;
      this.phaseTimer = remainingOffset - this.config.greenTimeNS - this.config.yellowTime;
    } else {
      this.currentPhase = SignalPhase.YELLOW;
      this.phaseDirection = Direction.EAST;
      this.phaseTimer = remainingOffset - this.config.greenTimeNS - this.config.yellowTime - this.config.greenTimeEW;
    }
  }

  setOffset(newOffset) {
    this.config.offset = newOffset;
    this._applyOffset();
  }

  update(timeStep) {
    this.phaseTimer += timeStep;

    if (this.phaseDirection === Direction.NORTH) {
      if (this.currentPhase === SignalPhase.GREEN) {
        if (this.phaseTimer >= this.config.greenTimeNS) {
          this.currentPhase = SignalPhase.YELLOW;
          this.phaseTimer = this.phaseTimer - this.config.greenTimeNS;
        }
      } else if (this.currentPhase === SignalPhase.YELLOW) {
        if (this.phaseTimer >= this.config.yellowTime) {
          this.phaseDirection = Direction.EAST;
          this.currentPhase = SignalPhase.GREEN;
          this.phaseTimer = this.phaseTimer - this.config.yellowTime;
        }
      }
    } else {
      if (this.currentPhase === SignalPhase.GREEN) {
        if (this.phaseTimer >= this.config.greenTimeEW) {
          this.currentPhase = SignalPhase.YELLOW;
          this.phaseTimer = this.phaseTimer - this.config.greenTimeEW;
        }
      } else if (this.currentPhase === SignalPhase.YELLOW) {
        if (this.phaseTimer >= this.config.yellowTime) {
          this.phaseDirection = Direction.NORTH;
          this.currentPhase = SignalPhase.GREEN;
          this.phaseTimer = this.phaseTimer - this.config.yellowTime;
        }
      }
    }

    if (this.phaseTimer >= this.totalCycle) {
      this.phaseTimer = this.phaseTimer % this.totalCycle;
      this._applyOffset();
    }

    return {
      phase: this.currentPhase,
      direction: this.phaseDirection,
      timer: this.phaseTimer
    };
  }

  canPass(direction) {
    const isNS = direction === Direction.NORTH || direction === Direction.SOUTH;
    const isEW = direction === Direction.EAST || direction === Direction.WEST;

    if (this.currentPhase === SignalPhase.GREEN) {
      return (isNS && this.phaseDirection === Direction.NORTH) || 
             (isEW && this.phaseDirection === Direction.EAST);
    }
    return false;
  }
}

export class CellularAutomata {
  constructor(width, height, cellSize = CELL_SIZE) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.gridWidth = Math.floor(width / cellSize);
    this.gridHeight = Math.floor(height / cellSize);
    this.grid = this.initializeGrid();
    this.intersections = new Map();
    this.vehicles = [];
    this.vehicleIdCounter = 0;
    this.timeStep = 0;
    this.stats = {
      totalVehicles: 0,
      averageSpeed: 0,
      waitingVehicles: 0,
      throughput: 0
    };
  }

  initializeGrid() {
    const grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row = [];
      for (let x = 0; x < this.gridWidth; x++) {
        row.push(new Cell(x, y));
      }
      grid.push(row);
    }
    return grid;
  }

  addIntersection(id, gridX, gridY, config = {}) {
    const intersection = new Intersection(id, gridX, gridY, config);
    this.intersections.set(id, intersection);
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = gridX + dx;
        const y = gridY + dy;
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          this.grid[y][x].isIntersection = true;
          this.grid[y][x].intersectionId = id;
        }
      }
    }

    return intersection;
  }

  addVehicle(gridX, gridY, direction, type = 'car') {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return null;
    }

    const cell = this.grid[gridY][gridX];
    if (cell.vehicle) {
      return null;
    }

    const vehicle = new Vehicle(this.vehicleIdCounter++, type, direction);
    cell.vehicle = vehicle;
    this.vehicles.push(vehicle);
    this.stats.totalVehicles++;

    return vehicle;
  }

  getNextPosition(vehicle, currentX, currentY, speed) {
    switch (vehicle.direction) {
      case Direction.NORTH:
        return { x: currentX, y: currentY - speed };
      case Direction.SOUTH:
        return { x: currentX, y: currentY + speed };
      case Direction.EAST:
        return { x: currentX + speed, y: currentY };
      case Direction.WEST:
        return { x: currentX - speed, y: currentY };
      default:
        return { x: currentX, y: currentY };
    }
  }

  isPositionValid(x, y) {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  canMoveTo(vehicle, fromX, fromY, toX, toY) {
    if (!this.isPositionValid(toX, toY)) {
      return false;
    }

    const targetCell = this.grid[toY][toX];
    if (targetCell.vehicle) {
      return false;
    }

    if (targetCell.isIntersection) {
      const intersection = this.intersections.get(targetCell.intersectionId);
      if (intersection) {
        return intersection.canPass(vehicle.direction);
      }
    }

    return true;
  }

  updateVehicle(vehicle) {
    let currentX = -1, currentY = -1;
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x].vehicle === vehicle) {
          currentX = x;
          currentY = y;
          break;
        }
      }
      if (currentX >= 0) break;
    }

    if (currentX < 0) {
      return;
    }

    let newSpeed = Math.min(vehicle.speed + 1, MAX_SPEED);

    const nextPos = this.getNextPosition(vehicle, currentX, currentY, newSpeed);
    if (!this.canMoveTo(vehicle, currentX, currentY, nextPos.x, nextPos.y)) {
      for (let s = newSpeed - 1; s >= 0; s--) {
        const testPos = this.getNextPosition(vehicle, currentX, currentY, s);
        if (this.canMoveTo(vehicle, currentX, currentY, testPos.x, testPos.y)) {
          newSpeed = s;
          break;
        }
        newSpeed = 0;
      }
    }

    if (newSpeed > 0 && Math.random() < RANDOM_SLOWDOWN_PROB) {
      newSpeed = Math.max(0, newSpeed - 1);
    }

    vehicle.speed = newSpeed;
    vehicle.travelTime++;

    if (newSpeed === 0) {
      vehicle.waitingTime++;
    }

    if (newSpeed > 0) {
      const finalPos = this.getNextPosition(vehicle, currentX, currentY, newSpeed);
      if (this.isPositionValid(finalPos.x, finalPos.y) && this.canMoveTo(vehicle, currentX, currentY, finalPos.x, finalPos.y)) {
        this.grid[currentY][currentX].vehicle = null;
        this.grid[finalPos.y][finalPos.x].vehicle = vehicle;
      }
    }
  }

  removeOutOfBoundsVehicles() {
    const vehiclesToRemove = [];
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const vehicle = this.grid[y][x].vehicle;
        if (vehicle) {
          let shouldRemove = false;
          
          switch (vehicle.direction) {
            case Direction.NORTH:
              shouldRemove = y <= 0;
              break;
            case Direction.SOUTH:
              shouldRemove = y >= this.gridHeight - 1;
              break;
            case Direction.EAST:
              shouldRemove = x >= this.gridWidth - 1;
              break;
            case Direction.WEST:
              shouldRemove = x <= 0;
              break;
          }

          if (shouldRemove) {
            vehiclesToRemove.push(vehicle);
            this.grid[y][x].vehicle = null;
          }
        }
      }
    }

    for (const vehicle of vehiclesToRemove) {
      const index = this.vehicles.indexOf(vehicle);
      if (index > -1) {
        this.vehicles.splice(index, 1);
        this.stats.throughput++;
      }
    }
  }

  step() {
    this.timeStep++;

    for (const intersection of this.intersections.values()) {
      intersection.update(1);
    }

    for (const vehicle of [...this.vehicles]) {
      this.updateVehicle(vehicle);
    }

    this.removeOutOfBoundsVehicles();
    this.updateStats();

    return this.stats;
  }

  updateStats() {
    let totalSpeed = 0;
    let waitingVehicles = 0;

    for (const vehicle of this.vehicles) {
      totalSpeed += vehicle.speed;
      if (vehicle.speed === 0) {
        waitingVehicles++;
      }
    }

    this.stats.averageSpeed = this.vehicles.length > 0 ? totalSpeed / this.vehicles.length : 0;
    this.stats.waitingVehicles = waitingVehicles;
  }

  getGridState() {
    const state = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row = [];
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.grid[y][x];
        row.push({
          x: cell.x,
          y: cell.y,
          hasVehicle: cell.vehicle !== null,
          isIntersection: cell.isIntersection,
          intersectionId: cell.intersectionId,
          vehicleId: cell.vehicle?.id || null
        });
      }
      state.push(row);
    }
    return state;
  }

  getIntersectionStates() {
    const states = {};
    for (const [id, intersection] of this.intersections) {
      states[id] = {
        id: intersection.id,
        x: intersection.x,
        y: intersection.y,
        phase: intersection.currentPhase,
        direction: intersection.phaseDirection,
        timer: intersection.phaseTimer,
        config: intersection.config
      };
    }
    return states;
  }

  reset() {
    this.grid = this.initializeGrid();
    for (const intersection of this.intersections.values()) {
      intersection.phaseTimer = 0;
      intersection.currentPhase = SignalPhase.GREEN;
      intersection.phaseDirection = Direction.NORTH;
    }
    this.vehicles = [];
    this.vehicleIdCounter = 0;
    this.timeStep = 0;
    this.stats = {
      totalVehicles: 0,
      averageSpeed: 0,
      waitingVehicles: 0,
      throughput: 0
    };
  }
}
