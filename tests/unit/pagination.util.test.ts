import {
  encodePaginationToken,
  decodePaginationToken,
  parsePaginationParams,
} from '../../src/shared/utils/pagination.util';

describe('Pagination Utility', () => {
  describe('encodePaginationToken', () => {
    it('should encode a DynamoDB key as a base64 string', () => {
      const key = { PK: 'PRODUCT#123', SK: 'DETAILS' };
      const token = encodePaginationToken(key);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Verify it is valid base64
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      expect(JSON.parse(decoded)).toEqual(key);
    });

    it('should produce different tokens for different keys', () => {
      const key1 = { PK: 'PRODUCT#123', SK: 'DETAILS' };
      const key2 = { PK: 'PRODUCT#456', SK: 'DETAILS' };

      const token1 = encodePaginationToken(key1);
      const token2 = encodePaginationToken(key2);

      expect(token1).not.toEqual(token2);
    });
  });

  describe('decodePaginationToken', () => {
    it('should decode a valid base64 token back to the original key', () => {
      const key = { PK: 'PRODUCT#123', SK: 'DETAILS' };
      const token = encodePaginationToken(key);
      const decoded = decodePaginationToken(token);

      expect(decoded).toEqual(key);
    });

    it('should return null for an empty string', () => {
      expect(decodePaginationToken('')).toBeNull();
    });

    it('should return null for invalid base64', () => {
      expect(decodePaginationToken('not-valid-base64!!!')).toBeNull();
    });

    it('should return null for base64 that decodes to non-JSON', () => {
      const token = Buffer.from('this is not json').toString('base64');
      expect(decodePaginationToken(token)).toBeNull();
    });

    it('should return null for base64 that decodes to an array', () => {
      const token = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64');
      expect(decodePaginationToken(token)).toBeNull();
    });

    it('should return null for base64 that decodes to a string', () => {
      const token = Buffer.from(JSON.stringify('hello')).toString('base64');
      expect(decodePaginationToken(token)).toBeNull();
    });

    it('should return null for null-like inputs', () => {
      expect(decodePaginationToken(null as any)).toBeNull();
      expect(decodePaginationToken(undefined as any)).toBeNull();
    });

    it('should handle complex DynamoDB keys with nested attributes', () => {
      const key = {
        PK: { S: 'PRODUCT#123' },
        SK: { S: 'DETAILS' },
        category: { S: 'Bats' },
        price: { N: '150' },
      };
      const token = encodePaginationToken(key);
      const decoded = decodePaginationToken(token);
      expect(decoded).toEqual(key);
    });
  });

  describe('parsePaginationParams', () => {
    it('should return defaults when no params provided', () => {
      const result = parsePaginationParams(null);
      expect(result).toEqual({ limit: 50, lastKey: undefined });
    });

    it('should return defaults when empty params provided', () => {
      const result = parsePaginationParams({});
      expect(result).toEqual({ limit: 50, lastKey: undefined });
    });

    it('should parse a valid limit', () => {
      const result = parsePaginationParams({ limit: '25' });
      expect(result.limit).toBe(25);
    });

    it('should cap limit at 100', () => {
      const result = parsePaginationParams({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const result = parsePaginationParams({ limit: '0' });
      expect(result.limit).toBe(1);
    });

    it('should handle negative limit by clamping to 1', () => {
      const result = parsePaginationParams({ limit: '-5' });
      expect(result.limit).toBe(1);
    });

    it('should use default limit for non-numeric input', () => {
      const result = parsePaginationParams({ limit: 'abc' });
      expect(result.limit).toBe(50);
    });

    it('should pass through lastKey', () => {
      const result = parsePaginationParams({ lastKey: 'sometoken123' });
      expect(result.lastKey).toBe('sometoken123');
    });

    it('should parse both limit and lastKey together', () => {
      const result = parsePaginationParams({ limit: '10', lastKey: 'token' });
      expect(result.limit).toBe(10);
      expect(result.lastKey).toBe('token');
    });
  });
});
