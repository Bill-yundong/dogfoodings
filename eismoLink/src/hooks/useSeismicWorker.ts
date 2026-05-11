'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { SeismicDataPoint, WavePrediction } from '../types/seismic';

export function useSeismicWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [prediction, setPrediction] = useState<WavePrediction | null>(null);
  const [data, setData] = useState<SeismicDataPoint[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let worker: Worker;
      try {
        worker = new Worker(
          new URL('../workers/seismic.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (e) {
        const workerCode = `
import { SeismicDataPoint, WavePrediction } from '../types/seismic';

const P_WAVE_VELOCITY = 6.0;
const S_WAVE_VELOCITY = 3.5;

function calculateDistance(pWaveTime, sWaveTime) {
  const timeDiff = sWaveTime - pWaveTime;
  return (P_WAVE_VELOCITY * S_WAVE_VELOCITY * timeDiff) / (P_WAVE_VELOCITY - S_WAVE_VELOCITY);
}

function estimateMagnitude(amplitude, distance) {
  const logA = Math.log10(Math.abs(amplitude) + 1);
  const logDelta = Math.log10(distance + 1);
  return logA + 2.56 * logDelta - 1.67;
}

function detectWaves(data) {
  const threshold = 0.1;
  let pWaveIndex = -1;
  let sWaveIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    const prevMag = data[i - 1].magnitude;
    const currMag = data[i].magnitude;
    
    if (pWaveIndex === -1 && currMag > threshold && currMag > prevMag * 2) {
      pWaveIndex = i;
    }
    
    if (pWaveIndex !== -1 && sWaveIndex === -1 && currMag > threshold * 3 && currMag > data[i - 1].magnitude * 1.5) {
      sWaveIndex = i;
      break;
    }
  }
  
  return { pWaveIndex, sWaveIndex };
}

function calculateConfidence(data, pWaveIdx, sWaveIdx) {
  if (pWaveIdx === -1 || sWaveIdx === -1) return 0;
  
  const pWaveEnergy = data.slice(pWaveIdx, pWaveIdx + 10).reduce((sum, d) => sum + d.magnitude, 0);
  const sWaveEnergy = data.slice(sWaveIdx, sWaveIdx + 10).reduce((sum, d) => sum + d.magnitude, 0);
  
  const energyRatio = sWaveEnergy / (pWaveEnergy + 0.001);
  const timeRatio = (sWaveIdx - pWaveIdx) / data.length;
  
  return Math.min(1, (energyRatio * 0.5 + timeRatio * 0.5) * 2);
}

function predictWaveArrivals(
  data,
  stationLat,
  stationLon,
  epicenterLat,
  epicenterLon
) {
  const { pWaveIndex, sWaveIndex } = detectWaves(data);
  
  if (pWaveIndex === -1 || sWaveIndex === -1) {
    return {
      pWaveArrival: -1,
      sWaveArrival: -1,
      timeDiff: -1,
      estimatedMagnitude: 0,
      confidence: 0
    };
  }
  
  const pWaveTime = data[pWaveIndex].timestamp;
  const sWaveTime = data[sWaveIndex].timestamp;
  const timeDiff = (sWaveTime - pWaveTime) / 1000;
  
  const dLat = (epicenterLat - stationLat) * Math.PI / 180;
  const dLon = (epicenterLon - stationLon) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(stationLat * Math.PI / 180) *
    Math.cos(epicenterLat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const maxAmplitude = Math.max(...data.slice(pWaveIndex, sWaveIndex + 20).map(d => d.magnitude));
  const estimatedMagnitude = estimateMagnitude(maxAmplitude, distance);
  const confidence = calculateConfidence(data, pWaveIndex, sWaveIndex);
  
  return {
    pWaveArrival: pWaveTime,
    sWaveArrival: sWaveTime,
    timeDiff,
    estimatedMagnitude,
    confidence
  };
}

function generateSyntheticData(duration, sampleRate) {
  const data = [];
  const startTime = Date.now() - duration;
  const samples = Math.floor(duration / (1000 / sampleRate));
  
  for (let i = 0; i < samples; i++) {
    const timestamp = startTime + i * (1000 / sampleRate);
    const noise = (Math.random() - 0.5) * 0.02;
    
    let x = noise;
    let y = noise;
    let z = noise;
    
    const pWaveStart = Math.floor(samples * 0.3);
    const sWaveStart = Math.floor(samples * 0.5);
    
    if (i >= pWaveStart && i < pWaveStart + 50) {
      const factor = Math.sin((i - pWaveStart) / 50 * Math.PI) * 0.3;
      x += Math.sin(i * 0.5) * factor;
      y += Math.cos(i * 0.5) * factor * 0.8;
      z += Math.sin(i * 0.3) * factor * 0.5;
    }
    
    if (i >= sWaveStart && i < sWaveStart + 100) {
      const factor = Math.sin((i - sWaveStart) / 100 * Math.PI) * 0.8;
      x += Math.sin(i * 0.3) * factor;
      y += Math.cos(i * 0.3) * factor * 1.2;
      z += Math.sin(i * 0.2) * factor * 0.7;
    }
    
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    data.push({ timestamp, x, y, z, magnitude });
  }
  
  return data;
}

self.onmessage = (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'PREDICT_WAVES': {
      const { data, stationLat, stationLon, epicenterLat, epicenterLon } = payload;
      const prediction = predictWaveArrivals(data, stationLat, stationLon, epicenterLat, epicenterLon);
      self.postMessage({ type: 'PREDICTION_RESULT', payload: prediction });
      break;
    }
    
    case 'GENERATE_SYNTHETIC': {
      const { duration = 10000, sampleRate = 100 } = payload;
      const data = generateSyntheticData(duration, sampleRate);
      self.postMessage({ type: 'SYNTHETIC_DATA', payload: data });
      break;
    }
    
    case 'PROCESS_STREAM': {
      const { chunk, stationLat, stationLon, epicenterLat, epicenterLon } = payload;
      const prediction = predictWaveArrivals(chunk, stationLat, stationLon, epicenterLat, epicenterLon);
      self.postMessage({ type: 'STREAM_RESULT', payload: { prediction, chunk } });
      break;
    }
    
    default:
      break;
  }
};
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
      }

      worker.onmessage = (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'PREDICTION_RESULT':
          case 'STREAM_RESULT':
            setPrediction(payload.prediction || payload);
            break;
          case 'SYNTHETIC_DATA':
            setData(payload);
            break;
          default:
            break;
        }
      };

      workerRef.current = worker;
      setIsReady(true);

      return () => {
        worker.terminate();
      };
    }
  }, []);

  const generateSyntheticData = useCallback((duration: number = 10000, sampleRate: number = 100) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'GENERATE_SYNTHETIC',
        payload: { duration, sampleRate }
      });
    }
  }, []);

  const predictWaves = useCallback((
    data: SeismicDataPoint[],
    stationLat: number,
    stationLon: number,
    epicenterLat: number,
    epicenterLon: number
  ) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'PREDICT_WAVES',
        payload: { data, stationLat, stationLon, epicenterLat, epicenterLon }
      });
    }
  }, []);

  const processStream = useCallback((
    chunk: SeismicDataPoint[],
    stationLat: number,
    stationLon: number,
    epicenterLat: number,
    epicenterLon: number
  ) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'PROCESS_STREAM',
        payload: { chunk, stationLat, stationLon, epicenterLat, epicenterLon }
      });
    }
  }, []);

  return {
    isReady,
    prediction,
    data,
    generateSyntheticData,
    predictWaves,
    processStream,
    setData
  };
}
