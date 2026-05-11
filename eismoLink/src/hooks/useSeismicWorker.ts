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
      const worker = new Worker(
        new URL('../workers/seismic.worker.ts', import.meta.url),
        { type: 'module' }
      );

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
