// Set environment variable before importing the handler
process.env.COGNITO_USER_POOL_ID = 'us-east-1_TEST123456';

import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

// Mock the aws-jwt-verify module with explicit factory
jest.mock('aws-jwt-verify', () => {
  // Create mock verify function inside the factory
  const mockVerifyFn = jest.fn();

  return {
    CognitoJwtVerifier: {
      create: jest.fn(() => ({
        verify: mockVerifyFn,
      })),
    },
    __getMockVerify: () => mockVerifyFn,
  };
});

// Import handler AFTER mock declaration
import { handler } from '../../src/functions/admin-authorizer/handler';

// Get reference to the actual mock verify function
const awsJwtVerify = require('aws-jwt-verify');
const actualMockVerify = awsJwtVerify.__getMockVerify();

// Helper to create a JWT token (for testing)
function createTestJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mocked-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('Admin Authorizer', () => {
  const mockMethodArn = 'arn:aws:execute-api:us-east-1:123456789012:abcdefg/dev/GET/admin/products';

  beforeEach(() => {
    // Mock console methods to reduce noise in test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Clear call history but preserve implementation
    actualMockVerify.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Allow Policy', () => {
    it('should return Allow policy for admin user with array groups', async () => {
      const payload = {
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin', 'user'],
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.principalId).toBe('user-123');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect((result.policyDocument.Statement[0] as { Action: string }).Action).toBe('execute-api:Invoke');
      expect(result.context?.userId).toBe('user-123');
      expect(result.context?.email).toBe('admin@example.com');
      expect(result.context?.groups).toBe('admin,user');
    });

    it('should return Allow policy for admin user with string groups', async () => {
      const payload = {
        sub: 'user-456',
        email: 'admin2@example.com',
        'cognito:groups': '[admin,user]',
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.principalId).toBe('user-456');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result.context?.userId).toBe('user-456');
      expect(result.context?.email).toBe('admin2@example.com');
      expect(result.context?.groups).toBe('admin,user');
    });

    it('should return Allow policy for admin user with only admin group', async () => {
      const payload = {
        sub: 'user-789',
        email: 'superadmin@example.com',
        'cognito:groups': ['admin'],
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.principalId).toBe('user-789');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result.context?.groups).toBe('admin');
    });

    it('should use wildcard resource for caching', async () => {
      const payload = {
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin'],
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdefg/dev/GET/admin/products',
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      // Wildcard resource should be: arn:aws:execute-api:us-east-1:123456789012:abcdefg/dev/*
      expect((result.policyDocument.Statement[0] as { Resource: string }).Resource).toContain('/*');
    });
  });

  describe('Deny Policy', () => {
    it('should return Deny policy for non-admin user', async () => {
      const payload = {
        sub: 'user-999',
        email: 'user@example.com',
        'cognito:groups': ['user'],
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification (but user is not admin)
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.principalId).toBe('user-999');
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
      expect(result.context).toBeUndefined();
    });

    it('should return Deny policy for user with no groups', async () => {
      const payload = {
        sub: 'user-888',
        email: 'nogroups@example.com',
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification (but user has no groups)
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should return Deny policy for user with empty groups array', async () => {
      const payload = {
        sub: 'user-777',
        email: 'emptygroups@example.com',
        'cognito:groups': [],
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification (but user has empty groups)
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });
  });

  describe('Missing or Malformed Authorization', () => {
    it('should return Deny policy when Authorization header is missing', async () => {
      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {},
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.principalId).toBe('user');
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should return Deny policy when Authorization header is empty', async () => {
      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: '',
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should return Deny policy when JWT is malformed', async () => {
      // Mock JWT verification failure
      actualMockVerify.mockRejectedValueOnce(new Error('Malformed JWT'));

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: 'Bearer invalid.jwt',
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should return Deny policy when JWT payload is invalid JSON', async () => {
      // Mock JWT verification failure
      actualMockVerify.mockRejectedValueOnce(new Error('Invalid payload'));

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: 'Bearer header.invalidpayload.signature',
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should handle lowercase authorization header', async () => {
      const payload = {
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin'],
      };
      const jwt = createTestJWT(payload);

      // Mock successful JWT verification
      actualMockVerify.mockResolvedValueOnce(payload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });
  });

  describe('Error Handling', () => {
    it('should return Deny policy on unexpected errors', async () => {
      // Mock unexpected error during verification
      actualMockVerify.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: 'Bearer causes.error.somehow',
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should return Deny policy for forged JWT with invalid signature', async () => {
      // Mock signature verification failure
      actualMockVerify.mockRejectedValueOnce(new Error('Invalid signature'));

      const forgedPayload = {
        sub: 'attacker-123',
        email: 'attacker@example.com',
        'cognito:groups': ['admin'], // Attacker tries to claim admin rights
      };
      const forgedJWT = createTestJWT(forgedPayload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${forgedJWT}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.principalId).toBe('user');
      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
      // Verify the mock was called with the forged JWT
      // Note: The actual aws-jwt-verify library would reject this in production
    });

    it('should return Deny policy for expired JWT', async () => {
      // Mock token expiration error
      actualMockVerify.mockRejectedValueOnce(new Error('Token expired'));

      const expiredPayload = {
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin'],
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };
      const expiredJWT = createTestJWT(expiredPayload);

      const event = {
        type: 'REQUEST',
        methodArn: mockMethodArn,
        headers: {
          Authorization: `Bearer ${expiredJWT}`,
        },
      } as unknown as APIGatewayRequestAuthorizerEvent;

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });
  });
});
