import { writable, derived } from 'svelte/store';

export const iceConcentrationData = writable([]);
export const currentYear = writable(2024);
export const selectedRegion = writable('arctic');
export const isPlaying = writable(false);
export const playbackSpeed = writable(1);

export const seaLevelTrend = writable({
  years: [],
  levels: [],
  rate: 3.2
});

export const albedoData = writable({
  current: 0.35,
  historical: [],
  feedbackStrength: 0.4
});

export const stats = derived(
  [iceConcentrationData, currentYear],
  ([iceData, year]) => {
    const yearData = iceData.filter(d => Math.floor(d.year) === Math.floor(year));
    if (yearData.length === 0) return { avgConcentration: 0, totalArea: 0, minConcentration: 0, maxConcentration: 0 };
    
    const concentrations = yearData.map(d => d.concentration);
    return {
      avgConcentration: concentrations.reduce((a, b) => a + b, 0) / concentrations.length,
      totalArea: yearData.reduce((a, b) => a + b.area, 0),
      minConcentration: Math.min(...concentrations),
      maxConcentration: Math.max(...concentrations)
    };
  }
);
