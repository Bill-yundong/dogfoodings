import { createStore } from 'solid-js/store';
import type { BeltState, TensionAnalysisResult } from '@/types';

interface BeltStoreState {
  currentState: BeltState | null;
  tensionAnalysis: TensionAnalysisResult | null;
  isLoading: boolean;
  lastUpdate: number;
}

const initialState: BeltStoreState = {
  currentState: null,
  tensionAnalysis: null,
  isLoading: false,
  lastUpdate: 0,
};

export const [beltState, setBeltState] = createStore<BeltStoreState>(initialState);

export function updateBeltState(state: Partial<BeltState>) {
  setBeltState('currentState', (prev) => (prev ? { ...prev, ...state } : null));
  setBeltState('lastUpdate', Date.now());
}

export function setCurrentBeltState(state: BeltState) {
  setBeltState('currentState', state);
  setBeltState('lastUpdate', Date.now());
}

export function setTensionAnalysis(analysis: TensionAnalysisResult) {
  setBeltState('tensionAnalysis', analysis);
}

export function setBeltLoading(loading: boolean) {
  setBeltState('isLoading', loading);
}
