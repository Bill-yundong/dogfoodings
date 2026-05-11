export interface AudioAnalysisWorkerMessage {
  type: 'init' | 'analyse' | 'stop';
  payload?: {
    buffer?: ArrayBuffer;
    sampleRate?: number;
    fftSize?: number;
  };
}

export interface AudioAnalysisWorkerResult {
  type: 'analysisComplete' | 'error';
  payload: {
    timestamp: number;
    frequencyData?: number[];
    timeDomainData?: number[];
    rms?: number;
    peak?: number;
    estimatedDecibels?: number;
    error?: string;
  };
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;

const calculateRMS = (data: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
};

const calculatePeak = (data: Float32Array): number => {
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
};

const estimateDecibels = (rms: number, reference: number = 1): number => {
  if (rms <= 0) return 0;
  return 20 * Math.log10(rms / reference) + 94;
};

const analyseAudio = (
  audioBuffer: AudioBuffer,
  fftSize: number = 2048
): Omit<AudioAnalysisWorkerResult['payload'], 'timestamp' | 'error'> => {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const offlineAnalyser = offlineContext.createAnalyser();
  offlineAnalyser.fftSize = fftSize;
  offlineAnalyser.smoothingTimeConstant = 0.8;

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineAnalyser);
  source.start(0);

  const frequencyData = new Uint8Array(offlineAnalyser.frequencyBinCount);
  const timeDomainData = new Float32Array(offlineAnalyser.fftSize);

  offlineAnalyser.getByteFrequencyData(frequencyData);
  offlineAnalyser.getFloatTimeDomainData(timeDomainData);

  const rms = calculateRMS(timeDomainData);
  const peak = calculatePeak(timeDomainData);
  const estimatedDecibels = estimateDecibels(rms);

  return {
    frequencyData: Array.from(frequencyData),
    timeDomainData: Array.from(timeDomainData),
    rms,
    peak,
    estimatedDecibels
  };
};

self.onmessage = async (e: MessageEvent<AudioAnalysisWorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'init': {
        if (!audioContext) {
          audioContext = new AudioContext({ sampleRate: payload?.sampleRate || 44100 });
          analyser = audioContext.createAnalyser();
          analyser.fftSize = payload?.fftSize || 2048;
          analyser.smoothingTimeConstant = 0.8;
        }
        break;
      }

      case 'analyse': {
        if (payload?.buffer) {
          const audioBuffer = await new AudioContext().decodeAudioData(payload.buffer);
          const result = analyseAudio(audioBuffer, payload?.fftSize || 2048);
          
          const response: AudioAnalysisWorkerResult = {
            type: 'analysisComplete',
            payload: {
              ...result,
              timestamp: Date.now()
            }
          };
          self.postMessage(response);
        }
        break;
      }

      case 'stop': {
        if (sourceNode) {
          sourceNode.stop();
          sourceNode.disconnect();
          sourceNode = null;
        }
        if (analyser) {
          analyser.disconnect();
          analyser = null;
        }
        if (audioContext) {
          audioContext.close();
          audioContext = null;
        }
        break;
      }
    }
  } catch (error) {
    const response: AudioAnalysisWorkerResult = {
      type: 'error',
      payload: {
        timestamp: Date.now(),
        error: (error as Error).message
      }
    };
    self.postMessage(response);
  }
};

export {};
