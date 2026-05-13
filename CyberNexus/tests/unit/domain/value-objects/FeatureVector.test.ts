import { describe, it, expect } from 'vitest';
import { FeatureVector } from '../../../../src/domain/value-objects/FeatureVector';
import { InvalidFeatureVectorException } from '../../../../src/domain/exceptions/DomainException';
import { VECTOR_DIMENSIONS } from '../../../../src/shared/constants/app.constants';

describe('FeatureVector', () => {
  const createValidFeatures = (): number[] => {
    return Array.from({ length: VECTOR_DIMENSIONS }, (_, i) => i);
  };

  describe('constructor', () => {
    it('should create a valid feature vector', () => {
      const features = createValidFeatures();
      const vector = new FeatureVector(features);
      expect(vector.features).toHaveLength(VECTOR_DIMENSIONS);
    });

    it('should throw error for invalid dimension', () => {
      const features = [1, 2, 3];
      expect(() => new FeatureVector(features)).toThrow(InvalidFeatureVectorException);
    });

    it('should freeze the features array', () => {
      const features = createValidFeatures();
      const vector = new FeatureVector(features);
      expect(() => {
        (vector.features as number[])[0] = 999;
      }).toThrow();
    });
  });

  describe('dimension', () => {
    it('should return correct dimension', () => {
      const vector = new FeatureVector(createValidFeatures());
      expect(vector.dimension).toBe(VECTOR_DIMENSIONS);
    });
  });

  describe('euclideanDistance', () => {
    it('should calculate correct euclidean distance', () => {
      const features1 = Array(VECTOR_DIMENSIONS).fill(0);
      const features2 = Array(VECTOR_DIMENSIONS).fill(0);
      features2[0] = 3;
      features2[1] = 4;

      const vector1 = new FeatureVector(features1);
      const vector2 = new FeatureVector(features2);

      const distance = vector1.euclideanDistance(vector2);
      expect(distance).toBe(5);
    });

    it('should return 0 for identical vectors', () => {
      const features = createValidFeatures();
      const vector1 = new FeatureVector(features);
      const vector2 = new FeatureVector(features);
      expect(vector1.euclideanDistance(vector2)).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate correct cosine similarity', () => {
      const features1 = Array(VECTOR_DIMENSIONS).fill(0);
      const features2 = Array(VECTOR_DIMENSIONS).fill(0);
      features1[0] = 1;
      features2[0] = 1;

      const vector1 = new FeatureVector(features1);
      const vector2 = new FeatureVector(features2);

      const similarity = vector1.cosineSimilarity(vector2);
      expect(similarity).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const features1 = Array(VECTOR_DIMENSIONS).fill(0);
      const features2 = Array(VECTOR_DIMENSIONS).fill(0);
      features1[0] = 1;
      features2[1] = 1;

      const vector1 = new FeatureVector(features1);
      const vector2 = new FeatureVector(features2);

      const similarity = vector1.cosineSimilarity(vector2);
      expect(similarity).toBe(0);
    });
  });

  describe('normalize', () => {
    it('should normalize vector to unit length', () => {
      const features = Array(VECTOR_DIMENSIONS).fill(0);
      features[0] = 3;
      features[1] = 4;

      const vector = new FeatureVector(features);
      const normalized = vector.normalize();

      const norm = Math.sqrt(
        normalized.features.reduce((sum, f) => sum + f * f, 0)
      );
      expect(norm).toBeCloseTo(1);
    });
  });

  describe('add', () => {
    it('should add two vectors correctly', () => {
      const features1 = Array(VECTOR_DIMENSIONS).fill(1);
      const features2 = Array(VECTOR_DIMENSIONS).fill(2);

      const vector1 = new FeatureVector(features1);
      const vector2 = new FeatureVector(features2);
      const result = vector1.add(vector2);

      expect(result.features[0]).toBe(3);
    });
  });

  describe('scale', () => {
    it('should scale vector correctly', () => {
      const features = Array(VECTOR_DIMENSIONS).fill(2);
      const vector = new FeatureVector(features);
      const result = vector.scale(3);

      expect(result.features[0]).toBe(6);
    });
  });

  describe('equals', () => {
    it('should return true for identical vectors', () => {
      const features = createValidFeatures();
      const vector1 = new FeatureVector(features);
      const vector2 = new FeatureVector([...features]);

      expect(vector1.equals(vector2)).toBe(true);
    });

    it('should return false for different vectors', () => {
      const features1 = createValidFeatures();
      const features2 = createValidFeatures();
      features2[0] = 999;

      const vector1 = new FeatureVector(features1);
      const vector2 = new FeatureVector(features2);

      expect(vector1.equals(vector2)).toBe(false);
    });
  });

  describe('toArray', () => {
    it('should return array copy', () => {
      const features = createValidFeatures();
      const vector = new FeatureVector(features);
      const array = vector.toArray();

      expect(array).toEqual(features);
      expect(array).not.toBe(features);
    });
  });
});
