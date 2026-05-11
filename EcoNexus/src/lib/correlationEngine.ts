import { EnvironmentalFactor, CorrelationResult } from "@/types";

export class AsyncCorrelationEngine {
  private dataCache: EnvironmentalFactor[] = [];
  private isProcessing: boolean = false;
  private processingQueue: (() => Promise<void>)[] = [];

  constructor(initialData?: EnvironmentalFactor[]) {
    if (initialData) {
      this.dataCache = initialData;
    }
  }

  addData(factors: EnvironmentalFactor | EnvironmentalFactor[]): void {
    const factorArray = Array.isArray(factors) ? factors : [factors];
    this.dataCache.push(...factorArray);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (task) await task();
    }

    this.isProcessing = false;
  }

  async calculateCorrelation(
    factorA: keyof EnvironmentalFactor,
    factorB: keyof EnvironmentalFactor,
    lag: number = 0
  ): Promise<CorrelationResult> {
    return new Promise((resolve) => {
      const task = async () => {
        await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

        const validData = this.dataCache.filter(
          (d) => typeof d[factorA] === "number" && typeof d[factorB] === "number"
        );

        const n = validData.length - lag;
        if (n < 10) {
          resolve({
            factorA: factorA as string,
            factorB: factorB as string,
            correlationCoefficient: 0,
            pValue: 1,
            sampleSize: n,
            significance: false,
            lag,
          });
          return;
        }

        let sumA = 0, sumB = 0, sumAB = 0;
        let sumASq = 0, sumBSq = 0;

        for (let i = lag; i < validData.length; i++) {
          const a = validData[i - lag][factorA] as number;
          const b = validData[i][factorB] as number;
          sumA += a;
          sumB += b;
          sumAB += a * b;
          sumASq += a * a;
          sumBSq += b * b;
        }

        const meanA = sumA / n;
        const meanB = sumB / n;

        const numerator = sumAB - sumA * meanB - sumB * meanA + n * meanA * meanB;
        const denominatorA = sumASq - 2 * meanA * sumA + n * meanA * meanA;
        const denominatorB = sumBSq - 2 * meanB * sumB + n * meanB * meanB;

        let correlation = 0;
        if (denominatorA > 0 && denominatorB > 0) {
          correlation = numerator / Math.sqrt(denominatorA * denominatorB);
        }

        const tStat = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
        const pValue = this.calculatePValue(Math.abs(tStat), n - 2);

        resolve({
          factorA: factorA as string,
          factorB: factorB as string,
          correlationCoefficient: Math.max(-1, Math.min(1, correlation)),
          pValue,
          sampleSize: n,
          significance: pValue < 0.05,
          lag,
        });
      };

      this.processingQueue.push(task);
      this.processQueue();
    });
  }

  private calculatePValue(t: number, df: number): number {
    const x = (t + Math.sqrt(t * t + df)) / (2 * Math.sqrt(t * t + df));
    return 2 * (1 - this.betaCDF(x, df / 2, df / 2));
  }

  private betaCDF(x: number, a: number, b: number): number {
    const bt =
      x === 0 || x === 1
        ? 0
        : Math.exp(
            this.gammaLn(a + b) -
              this.gammaLn(a) -
              this.gammaLn(b) +
              a * Math.log(x) +
              b * Math.log(1 - x)
          );

    if (x < (a + 1) / (a + b + 2)) {
      return (bt * this.betaCF(x, a, b)) / a;
    }
    return 1 - (bt * this.betaCF(1 - x, b, a)) / b;
  }

  private betaCF(x: number, a: number, b: number, maxIter: number = 200): number {
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIter; m++) {
      let m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-7) break;
    }
    return h;
  }

  private gammaLn(x: number): number {
    const cof = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / x);
  }

  async batchCorrelationAnalysis(
    factorPairs: [keyof EnvironmentalFactor, keyof EnvironmentalFactor][]
  ): Promise<CorrelationResult[]> {
    const results = await Promise.all(
      factorPairs.map(([a, b]) => this.calculateCorrelation(a, b))
    );
    return results;
  }

  getStats(): { totalRecords: number; processingQueueLength: number } {
    return {
      totalRecords: this.dataCache.length,
      processingQueueLength: this.processingQueue.length,
    };
  }
}

export function generateMockEnvironmentalData(count: number = 100): EnvironmentalFactor[] {
  const factors: EnvironmentalFactor[] = [];
  const baseLat = 35, baseLon = 110;

  for (let i = 0; i < count; i++) {
    const tempBase = 15 + Math.sin(i / 10) * 10;
    const humBase = 60 + Math.cos(i / 15) * 20;
    
    factors.push({
      id: `env-${i}`,
      location: {
        latitude: baseLat + (Math.random() - 0.5) * 20,
        longitude: baseLon + (Math.random() - 0.5) * 30,
        timestamp: new Date(Date.now() - (count - i) * 86400000),
      },
      temperature: tempBase + (Math.random() - 0.5) * 5,
      humidity: humBase + (Math.random() - 0.5) * 10,
      windSpeed: 5 + Math.random() * 15,
      precipitation: Math.random() * 50,
      vegetationIndex: 0.3 + Math.random() * 0.5,
      waterQuality: 70 + Math.random() * 30,
      timestamp: new Date(Date.now() - (count - i) * 86400000),
      source: ["satellite", "ground_station", "weather_api"][Math.floor(Math.random() * 3)] as any,
    });
  }

  return factors;
}
