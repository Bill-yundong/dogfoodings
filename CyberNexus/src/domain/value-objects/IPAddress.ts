export class IPAddress {
  private readonly _value: string;
  private readonly _numeric: number;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid IP address: ${value}`);
    }
    this._value = value;
    this._numeric = this.toNumeric(value);
  }

  private isValid(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  private toNumeric(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  get value(): string {
    return this._value;
  }

  get numeric(): number {
    return this._numeric;
  }

  isPrivate(): boolean {
    const parts = this._value.split('.').map(Number);
    return (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    );
  }

  isLoopback(): boolean {
    return this._value.startsWith('127.');
  }

  equals(other: IPAddress): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
