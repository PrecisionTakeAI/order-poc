import {
  parseGroupsClaim,
  extractGroupsFromClaims,
  isAdminUser,
} from '../../src/shared/middleware/auth.middleware';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('Auth Middleware', () => {
  describe('parseGroupsClaim', () => {
    it('should parse string format "[admin,user]"', () => {
      const result = parseGroupsClaim('[admin,user]');
      expect(result).toEqual(['admin', 'user']);
    });

    it('should parse string format with spaces "[admin, user]"', () => {
      const result = parseGroupsClaim('[admin, user]');
      expect(result).toEqual(['admin', 'user']);
    });

    it('should parse array format ["admin", "user"]', () => {
      const result = parseGroupsClaim(['admin', 'user']);
      expect(result).toEqual(['admin', 'user']);
    });

    it('should parse single group string "admin"', () => {
      const result = parseGroupsClaim('admin');
      expect(result).toEqual(['admin']);
    });

    it('should handle empty string bracket format "[]"', () => {
      const result = parseGroupsClaim('[]');
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = parseGroupsClaim([]);
      expect(result).toEqual([]);
    });

    it('should handle undefined', () => {
      const result = parseGroupsClaim(undefined);
      expect(result).toEqual([]);
    });

    it('should handle null', () => {
      const result = parseGroupsClaim(null);
      expect(result).toEqual([]);
    });

    it('should filter non-string values from array', () => {
      const result = parseGroupsClaim(['admin', 123, 'user', null]);
      expect(result).toEqual(['admin', 'user']);
    });
  });

  describe('extractGroupsFromClaims', () => {
    it('should extract cognito:groups from claims object', () => {
      const claims = {
        'cognito:groups': ['admin', 'user'],
        sub: '123',
        email: 'test@example.com',
      };
      const result = extractGroupsFromClaims(claims);
      expect(result).toEqual(['admin', 'user']);
    });

    it('should extract cognito:groups in string format', () => {
      const claims = {
        'cognito:groups': '[admin,user]',
        sub: '123',
        email: 'test@example.com',
      };
      const result = extractGroupsFromClaims(claims);
      expect(result).toEqual(['admin', 'user']);
    });

    it('should return empty array if cognito:groups is missing', () => {
      const claims = {
        sub: '123',
        email: 'test@example.com',
      };
      const result = extractGroupsFromClaims(claims);
      expect(result).toEqual([]);
    });

    it('should return empty array if claims is null', () => {
      const result = extractGroupsFromClaims(null as unknown as Record<string, unknown>);
      expect(result).toEqual([]);
    });

    it('should return empty array if claims is undefined', () => {
      const result = extractGroupsFromClaims(undefined as unknown as Record<string, unknown>);
      expect(result).toEqual([]);
    });
  });

  describe('isAdminUser', () => {
    it('should return true for admin user', () => {
      const event = {
        requestContext: {
          authorizer: {
            claims: {
              'cognito:groups': ['admin', 'user'],
              sub: '123',
            },
          },
        },
      } as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(true);
    });

    it('should return true for admin user with string format groups', () => {
      const event = {
        requestContext: {
          authorizer: {
            claims: {
              'cognito:groups': '[admin,user]',
              sub: '123',
            },
          },
        },
      } as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(true);
    });

    it('should return false for non-admin user', () => {
      const event = {
        requestContext: {
          authorizer: {
            claims: {
              'cognito:groups': ['user'],
              sub: '123',
            },
          },
        },
      } as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(false);
    });

    it('should return false when groups claim is missing', () => {
      const event = {
        requestContext: {
          authorizer: {
            claims: {
              sub: '123',
            },
          },
        },
      } as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(false);
    });

    it('should return false when claims are missing', () => {
      const event = {
        requestContext: {
          authorizer: {},
        },
      } as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(false);
    });

    it('should return false when authorizer context is missing', () => {
      const event = {
        requestContext: {},
      } as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(false);
    });

    it('should return false when requestContext is missing', () => {
      const event = {} as unknown as APIGatewayProxyEvent;

      const result = isAdminUser(event);
      expect(result).toBe(false);
    });
  });
});
