import { BiometricHash, BiometricType } from '@/types/security';

export class BiometricHasher {
  private static readonly HASH_LENGTH = 64;
  private static readonly SALT_ROUNDS = 10;

  static generateHash(
    biometricData: string,
    hashType: BiometricType,
    userId: string,
    nodeId: string
  ): BiometricHash {
    const timestamp = Date.now();
    const salt = this.generateSalt(userId, timestamp);
    const hashValue = this.computeHash(biometricData, salt);
    const confidence = this.calculateConfidence(biometricData);

    return {
      id: this.generateId(),
      userId,
      hashType,
      hashValue,
      timestamp,
      confidence,
      nodeId,
    };
  }

  private static generateSalt(userId: string, timestamp: number): string {
    return `${userId}-${timestamp}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private static computeHash(data: string, salt: string): string {
    const combined = `${data}:${salt}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hexHash = Math.abs(hash).toString(16).padStart(16, '0');
    return hexHash.repeat(4).substring(0, this.HASH_LENGTH);
  }

  private static calculateConfidence(biometricData: string): number {
    const dataLength = biometricData.length;
    const uniqueChars = new Set(biometricData).size;
    return Math.min(0.99, (uniqueChars / dataLength) * 1.2);
  }

  private static generateId(): string {
    return `bio-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  static verifyHash(hash1: BiometricHash, hash2: BiometricHash, tolerance: number = 0.85): boolean {
    if (hash1.hashType !== hash2.hashType) return false;
    if (hash1.userId !== hash2.userId) return false;

    const similarity = this.calculateSimilarity(hash1.hashValue, hash2.hashValue);
    return similarity >= tolerance;
  }

  static calculateSimilarity(str1: string, str2: string): number {
    if (str1.length !== str2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < str1.length; i++) {
      if (str1[i] === str2[i]) matches++;
    }
    
    return matches / str1.length;
  }

  static fastMatch(hash: BiometricHash, storedHashes: BiometricHash[]): { 
    match: BiometricHash | null; 
    latency: number;
    confidence: number;
  } {
    const startTime = performance.now();
    let bestMatch: BiometricHash | null = null;
    let highestConfidence = 0;

    for (const storedHash of storedHashes) {
      const similarity = this.calculateSimilarity(hash.hashValue, storedHash.hashValue);
      if (similarity > 0.85 && similarity > highestConfidence) {
        highestConfidence = similarity;
        bestMatch = storedHash;
      }
    }

    const latency = performance.now() - startTime;
    return { match: bestMatch, latency, confidence: highestConfidence };
  }
}
