import { handler } from '../../src/functions/auth/handler';
import { CognitoService } from '../../src/functions/auth/services/cognito.service';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the CognitoService
jest.mock('../../src/functions/auth/services/cognito.service');

describe('Auth Logout Handler', () => {
  let mockGlobalSignOut: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalSignOut = jest.spyOn(CognitoService.prototype, 'globalSignOut').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockEvent = (headers: Record<string, string> = {}): APIGatewayProxyEvent => {
    return {
      path: '/auth/logout',
      httpMethod: 'POST',
      headers,
      body: null,
      isBase64Encoded: false,
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };
  };

  it('should successfully logout with valid Authorization header', async () => {
    const event = createMockEvent({
      Authorization: 'Bearer valid-access-token-123',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGlobalSignOut).toHaveBeenCalledWith('valid-access-token-123');

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Logged out successfully');
  });

  it('should successfully logout with lowercase authorization header', async () => {
    const event = createMockEvent({
      authorization: 'Bearer valid-access-token-456',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGlobalSignOut).toHaveBeenCalledWith('valid-access-token-456');

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Logged out successfully');
  });

  it('should return 401 when Authorization header is missing', async () => {
    const event = createMockEvent({});

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(mockGlobalSignOut).not.toHaveBeenCalled();

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Authorization header is required');
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Authorization header is not in Bearer format', async () => {
    const event = createMockEvent({
      Authorization: 'InvalidFormat token',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(mockGlobalSignOut).not.toHaveBeenCalled();

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Invalid authorization header format');
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Authorization header has Bearer but no token', async () => {
    const event = createMockEvent({
      Authorization: 'Bearer ',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(mockGlobalSignOut).not.toHaveBeenCalled();

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Invalid authorization header format');
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should handle Cognito errors gracefully', async () => {
    mockGlobalSignOut.mockRejectedValueOnce(new Error('Token expired'));

    const event = createMockEvent({
      Authorization: 'Bearer expired-token',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(mockGlobalSignOut).toHaveBeenCalledWith('expired-token');

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Token expired');
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
