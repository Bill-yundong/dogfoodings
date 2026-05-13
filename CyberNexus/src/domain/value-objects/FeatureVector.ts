import { VECTOR_DIMENSIONS } from '../../shared/constants/app.constants';

export class FeatureVector {
  private readonly _features: readonly number[];

  constructor(features: number[]) {
    if (features.length !== VECTOR_DIMENSIONS) {
      throw new Error(
        `Feature vector must have exactly ${VECTOR_DIMENSIONS} dimensions, got ${features.length}`
      );
    }
    this._features = Object.freeze([...features]);
  }

  get features(): readonly number[] {
    return this._features;
  }

  get dimension(): number {
    return this._features.length;
  }

  euclideanDistance(other: FeatureVector): number {
    if (this._features.length !== other._features.length) {
      throw new Error('Feature vectors must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < this._features.length; i++) {
      const diff = this._features[i] - other._features[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  cosineSimilarity(other: FeatureVector): number {
    if (this._features.length !== other._features.length) {
      throw new Error('Feature vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < this._features.length; i++) {
      dotProduct += this._features[i] * other._features[i];
      normA += this._features[i] * this._features[i];
      normB += other._features[i] * other._features[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  normalize(): FeatureVector {
    const norm = Math.sqrt(this._features.reduce((sum, f) => sum + f * f, 0));
    if (norm === 0) return new FeatureVector(this._features.map(() => 0));
    return new FeatureVector(this._features.map(f => f / norm));
  }

  add(other: FeatureVector): FeatureVector {
    return new FeatureVector(
      this._features.map((f, i) => f + other._features[i])
    );
  }

  scale(factor: number): FeatureVector {
    return new FeatureVector(this._features.map(f => f * factor));
  }

  equals(other: FeatureVector): boolean {
    return this._features.every((f, i) => f === other._features[i]);
  }

  toArray(): number[] {
    return [...this._features];
  }

  toJSON(): number[] {
    return this.toArray();
  }
}
