import { handler } from '../../src/functions/admin-authorizer/handler';
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

// Helper to create a JWT token (for testing, no signature needed)
function createTestJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = 'test-signature';
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Allow Policy', () => {
    it('should return Allow policy for admin user with array groups', async () => {
      const jwt = createTestJWT({
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin', 'user'],
      });

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
      const jwt = createTestJWT({
        sub: 'user-456',
        email: 'admin2@example.com',
        'cognito:groups': '[admin,user]',
      });

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
      const jwt = createTestJWT({
        sub: 'user-789',
        email: 'superadmin@example.com',
        'cognito:groups': ['admin'],
      });

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
      const jwt = createTestJWT({
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin'],
      });

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
      const jwt = createTestJWT({
        sub: 'user-999',
        email: 'user@example.com',
        'cognito:groups': ['user'],
      });

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
      const jwt = createTestJWT({
        sub: 'user-888',
        email: 'nogroups@example.com',
      });

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
      const jwt = createTestJWT({
        sub: 'user-777',
        email: 'emptygroups@example.com',
        'cognito:groups': [],
      });

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
      const jwt = createTestJWT({
        sub: 'user-123',
        email: 'admin@example.com',
        'cognito:groups': ['admin'],
      });

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
  });
});
