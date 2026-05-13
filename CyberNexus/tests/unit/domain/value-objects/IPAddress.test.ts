import { describe, it, expect } from 'vitest';
import { IPAddress } from '../../../../src/domain/value-objects/IPAddress';
import { InvalidIPAddressException } from '../../../../src/domain/exceptions/DomainException';

describe('IPAddress', () => {
  describe('constructor', () => {
    it('should create a valid IP address', () => {
      const ip = new IPAddress('192.168.1.1');
      expect(ip.value).toBe('192.168.1.1');
    });

    it('should throw error for invalid IP address', () => {
      expect(() => new IPAddress('invalid-ip')).toThrow(InvalidIPAddressException);
      expect(() => new IPAddress('256.0.0.1')).toThrow(InvalidIPAddressException);
      expect(() => new IPAddress('192.168.1')).toThrow(InvalidIPAddressException);
    });
  });

  describe('numeric conversion', () => {
    it('should convert IP to numeric value correctly', () => {
      const ip = new IPAddress('0.0.0.1');
      expect(ip.numeric).toBe(1);

      const ip2 = new IPAddress('192.168.1.1');
      expect(ip2.numeric).toBe((192 << 24) + (168 << 16) + (1 << 8) + 1);
    });
  });

  describe('isPrivate', () => {
    it('should identify 192.168.x.x as private', () => {
      const ip = new IPAddress('192.168.1.100');
      expect(ip.isPrivate()).toBe(true);
    });

    it('should identify 10.x.x.x as private', () => {
      const ip = new IPAddress('10.0.0.1');
      expect(ip.isPrivate()).toBe(true);
    });

    it('should identify 172.16-31.x.x as private', () => {
      const ip = new IPAddress('172.16.0.1');
      expect(ip.isPrivate()).toBe(true);

      const ip2 = new IPAddress('172.31.255.255');
      expect(ip2.isPrivate()).toBe(true);
    });

    it('should identify public IP as not private', () => {
      const ip = new IPAddress('8.8.8.8');
      expect(ip.isPrivate()).toBe(false);
    });
  });

  describe('isLoopback', () => {
    it('should identify loopback address', () => {
      const ip = new IPAddress('127.0.0.1');
      expect(ip.isLoopback()).toBe(true);
    });

    it('should identify non-loopback address', () => {
      const ip = new IPAddress('192.168.1.1');
      expect(ip.isLoopback()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same IP addresses', () => {
      const ip1 = new IPAddress('192.168.1.1');
      const ip2 = new IPAddress('192.168.1.1');
      expect(ip1.equals(ip2)).toBe(true);
    });

    it('should return false for different IP addresses', () => {
      const ip1 = new IPAddress('192.168.1.1');
      const ip2 = new IPAddress('192.168.1.2');
      expect(ip1.equals(ip2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const ip = new IPAddress('192.168.1.1');
      expect(ip.toString()).toBe('192.168.1.1');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const ip = new IPAddress('192.168.1.1');
      expect(ip.toJSON()).toBe('192.168.1.1');
    });
  });
});
