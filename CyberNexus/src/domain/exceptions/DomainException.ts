export class DomainException extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string = 'DOMAIN_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'DomainException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class InvalidIPAddressException extends DomainException {
  constructor(ip: string) {
    super(`Invalid IP address: ${ip}`, 'INVALID_IP_ADDRESS', { ip });
    this.name = 'InvalidIPAddressException';
  }
}

export class InvalidRiskScoreException extends DomainException {
  constructor(score: number) {
    super(`Risk score must be between 0 and 100, got ${score}`, 'INVALID_RISK_SCORE', { score });
    this.name = 'InvalidRiskScoreException';
  }
}

export class InvalidFeatureVectorException extends DomainException {
  constructor(expected: number, actual: number) {
    super(
      `Feature vector must have exactly ${expected} dimensions, got ${actual}`,
      'INVALID_FEATURE_VECTOR',
      { expected, actual }
    );
    this.name = 'InvalidFeatureVectorException';
  }
}

export class ClusteringException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CLUSTERING_ERROR', details);
    this.name = 'ClusteringException';
  }
}

export class StorageException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageException';
  }
}
