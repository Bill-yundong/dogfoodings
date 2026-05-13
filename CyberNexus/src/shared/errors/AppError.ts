export type ErrorCode =
  | 'UNKNOWN_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'VALIDATION_ERROR'
  | 'BUSINESS_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: ErrorCode = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  static fromError(error: Error, code: ErrorCode = 'UNKNOWN_ERROR'): AppError {
    if (error instanceof AppError) return error;
    return new AppError(error.message, code, {
      originalError: error.name,
      stack: error.stack,
    });
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', { field, ...details });
    this.field = field;
    this.name = 'ValidationError';
  }
}
