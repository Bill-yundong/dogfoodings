import { boilerState, mpcParams } from '../stores/boilerStore.js';
import { BOILER_CONSTANTS } from '../constants/boilerConstants.js';

export class ModelPredictiveControl {
  constructor() {
    this.predictionHorizon = 20;
    this.controlHorizon = 5;
    this.weights = {
      oxygen: 1.0,
      temperature: 0.8,
      efficiency: 1.2,
      emissions: 0.9
    };
    this.history = [];
    this.predictions = [];
    this.controlActions = [];
  }

  predict(state, controlInputs, horizon) {
    const predictions = [];
    let currentState = { ...state };
    for (let i = 0; i < horizon; i++) {
      const controlAction = controlInputs[i] || controlInputs[controlInputs.length - 1];
      const predictedState = this.stateTransition(currentState, controlAction);
      predictions.push({
        step: i + 1,
        state: predictedState,
        control: controlAction,
        timestamp: Date.now() + i * 1000
      });
      currentState = predictedState;
    }
    return predictions;
  }

  stateTransition(state, control) {
    const { fuelFlow, primaryAir, secondaryAir, inducedDraft, forcedDraft } = control;
    const excessAir = (primaryAir + secondaryAir) / (fuelFlow * 1.5);
    const oxygen = 21 * (1 - 1 / excessAir) + (Math.random() - 0.5) * 0.3;
    const temperature = 800 + fuelFlow * 2.5 - (inducedDraft - 60) * 1.5 + (Math.random() - 0.5) * 10;
    const pressure = 10 + (forcedDraft - inducedDraft) * 0.2 + (Math.random() - 0.5) * 0.5;
    const co = Math.max(0, 50 - excessAir * 30 + (Math.random() - 0.5) * 5);
    const nox = Math.max(0, 80 - excessAir * 20 + temperature * 0.05 + (Math.random() - 0.5) * 10);
    const efficiency = 95 - Math.abs(oxygen - 4.2) * 1.5 - co * 0.1 - nox * 0.05;
    return {
      oxygen: Math.max(0, Math.min(10, oxygen)),
      temperature: Math.max(700, Math.min(1100, temperature)),
      pressure: Math.max(5, Math.min(25, pressure)),
      co,
      nox,
      efficiency: Math.max(70, Math.min(98, efficiency)),
      excessAir
    };
  }

  calculateCost(predictions, targets) {
    let totalCost = 0;
    for (const pred of predictions) {
      const { state } = pred;
      const oxyDeviation = Math.pow(state.oxygen - targets.oxygen, 2);
      const tempDeviation = Math.pow(state.temperature - targets.temperature, 2) / 1000;
      const effDeviation = Math.pow(BOILER_CONSTANTS.EFFICIENCY_MAX - state.efficiency, 2);
      const emissionCost = state.co * 0.1 + state.nox * 0.05;
      totalCost += oxyDeviation * this.weights.oxygen + tempDeviation * this.weights.temperature + effDeviation * this.weights.efficiency + emissionCost * this.weights.emissions;
    }
    return totalCost;
  }

  optimize(currentState) {
    const targets = {
      oxygen: BOILER_CONSTANTS.OXYGEN_OPTIMAL_RANGE.target,
      temperature: BOILER_CONSTANTS.TEMPERATURE_OPTIMAL_RANGE.target,
      efficiency: BOILER_CONSTANTS.EFFICIENCY_MAX
    };
    const controlOptions = this.generateControlOptions(currentState);
    let bestCost = Infinity;
    let bestControls = null;
    for (const controls of controlOptions) {
      const predictions = this.predict(currentState, controls, this.predictionHorizon);
      const cost = this.calculateCost(predictions, targets);
      if (cost < bestCost) {
        bestCost = cost;
        bestControls = controls;
        this.predictions = predictions;
      }
    }
    this.controlActions = bestControls;
    return {
      optimalControls: bestControls[0],
      predictions: this.predictions,
      cost: bestCost
    };
  }

  generateControlOptions(state) {
    const options = [];
    const baseControls = {
      fuelFlow: state.fuelFlow,
      primaryAir: state.primaryAir,
      secondaryAir: state.secondaryAir,
      inducedDraft: state.inducedDraft,
      forcedDraft: state.forcedDraft
    };
    const variations = [-3, -1.5, 0, 1.5, 3];
    for (const fuelDelta of variations) {
      for (const airDelta of variations) {
        for (const draftDelta of variations) {
          const controls = [];
          for (let i = 0; i < this.controlHorizon; i++) {
            controls.push({
              fuelFlow: Math.max(50, Math.min(100, baseControls.fuelFlow + fuelDelta * (i + 1) / this.controlHorizon)),
              primaryAir: Math.max(60, Math.min(120, baseControls.primaryAir + airDelta * (i + 1) / this.controlHorizon)),
              secondaryAir: Math.max(40, Math.min(80, baseControls.secondaryAir + airDelta * 0.6 * (i + 1) / this.controlHorizon)),
              inducedDraft: Math.max(30, Math.min(90, baseControls.inducedDraft + draftDelta * (i + 1) / this.controlHorizon)),
              forcedDraft: Math.max(40, Math.min(100, baseControls.forcedDraft + draftDelta * 1.2 * (i + 1) / this.controlHorizon))
            });
          }
          options.push(controls);
        }
      }
    }
    return options;
  }

  async optimizeAsync(currentState) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.optimize(currentState);
        resolve(result);
      }, 100);
    });
  }

  generateOptimizationSuggestions(currentState) {
    const suggestions = [];
    const { oxygen, temperature, co, nox, efficiency } = currentState;
    if (oxygen < 3.5) {
      suggestions.push({
        type: 'air',
        priority: 'high',
        message: '氧含量偏低，建议增加送风量',
        action: { primaryAir: +5, secondaryAir: +3 }
      });
    } else if (oxygen > 5.5) {
      suggestions.push({
        type: 'air',
        priority: 'medium',
        message: '氧含量偏高，建议减少送风量',
        action: { primaryAir: -3, secondaryAir: -2 }
      });
    }
    if (temperature < 850) {
      suggestions.push({
        type: 'fuel',
        priority: 'high',
        message: '炉膛温度偏低，建议增加燃料流量',
        action: { fuelFlow: +3 }
      });
    } else if (temperature > 950) {
      suggestions.push({
        type: 'fuel',
        priority: 'high',
        message: '炉膛温度偏高，建议减少燃料流量',
        action: { fuelFlow: -3 }
      });
    }
    if (co > 50) {
      suggestions.push({
        type: 'emission',
        priority: 'high',
        message: 'CO排放超标，建议优化配风',
        action: { primaryAir: +2, forcedDraft: +3 }
      });
    }
    if (nox > 100) {
      suggestions.push({
        type: 'emission',
        priority: 'medium',
        message: 'NOx排放偏高，建议降低燃烧温度',
        action: { secondaryAir: +4, inducedDraft: +2 }
      });
    }
    return suggestions;
  }
}

export const mpcEngine = new ModelPredictiveControl();
