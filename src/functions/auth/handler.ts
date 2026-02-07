import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError } from '../../shared/utils/error.util';
import { validateRequestBody, isValidEmail } from '../../shared/utils/validation.util';
import { AuthorizedAPIGatewayProxyEvent } from '../../shared/types';
import { CognitoService } from './services/cognito.service';
import { UserService } from './services/user.service';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
  LogoutResponse,
} from './types';

const cognitoService = new CognitoService();
const userService = new UserService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Auth Handler - Event:', JSON.stringify(event, null, 2));

  try {
    const path = event.path;
    const method = event.httpMethod;

    if (method === 'OPTIONS') {
      return successResponse({}, 200);
    }

    if (path === '/auth/register' && method === 'POST') {
      return await handleRegister(event);
    }

    if (path === '/auth/login' && method === 'POST') {
      return await handleLogin(event);
    }

    if (path === '/auth/forgot-password' && method === 'POST') {
      return await handleForgotPassword(event);
    }

    if (path === '/auth/reset-password' && method === 'POST') {
      return await handleResetPassword(event);
    }

    if (path === '/auth/refresh-token' && method === 'POST') {
      return await handleRefreshToken(event);
    }

    if (path === '/auth/profile' && method === 'GET') {
      return await handleGetProfile(event as AuthorizedAPIGatewayProxyEvent);
    }

    if (path === '/auth/logout' && method === 'POST') {
      return await handleLogout(event);
    }

    return errorResponse('Route not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('Auth Handler - Error:', error);

    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }

    if (error instanceof Error) {
      return errorResponse(error.message, 500, 'INTERNAL_SERVER_ERROR');
    }

    return errorResponse('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
  }
};

async function handleRegister(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as RegisterRequest;

  validateRequestBody(body, [
    { field: 'email', required: true, type: 'string', custom: isValidEmail, customMessage: 'Invalid email format' },
    { field: 'password', required: true, type: 'string', minLength: 8 },
  ]);

  const { email, password, fullName, phoneNumber } = body;

  const cognitoResult = await cognitoService.signUp(email, password, {
    name: fullName || '',
    phone_number: phoneNumber || '',
  });

  const userId = uuidv4();
  await userService.createUser(userId, email, cognitoResult.userSub, fullName, phoneNumber);

  const response: RegisterResponse = {
    userId,
    email,
    message: 'User registered successfully. Please check your email for verification.',
  };

  return successResponse(response, 201);
}

async function handleLogin(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as LoginRequest;

  validateRequestBody(body, [
    { field: 'email', required: true, type: 'string', custom: isValidEmail, customMessage: 'Invalid email format' },
    { field: 'password', required: true, type: 'string' },
  ]);

  const { email, password } = body;

  const authResult = await cognitoService.signIn(email, password);
  const cognitoUser = await cognitoService.getUserBySub(authResult.accessToken);

  const response: LoginResponse = {
    accessToken: authResult.accessToken,
    refreshToken: authResult.refreshToken,
    expiresIn: authResult.expiresIn,
    tokenType: 'Bearer',
    user: {
      userId: cognitoUser.sub as string,
      email: cognitoUser.email as string,
      fullName: cognitoUser.name as string | undefined,
    },
  };

  return successResponse(response, 200);
}

async function handleForgotPassword(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as ForgotPasswordRequest;

  validateRequestBody(body, [
    { field: 'email', required: true, type: 'string', custom: isValidEmail, customMessage: 'Invalid email format' },
  ]);

  const { email } = body;

  await cognitoService.forgotPassword(email);

  const response: ForgotPasswordResponse = {
    message: 'Password reset code sent to your email',
  };

  return successResponse(response, 200);
}

async function handleResetPassword(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as ResetPasswordRequest;

  validateRequestBody(body, [
    { field: 'email', required: true, type: 'string', custom: isValidEmail, customMessage: 'Invalid email format' },
    { field: 'code', required: true, type: 'string' },
    { field: 'newPassword', required: true, type: 'string', minLength: 8 },
  ]);

  const { email, code, newPassword } = body;

  await cognitoService.confirmForgotPassword(email, code, newPassword);

  const response: ResetPasswordResponse = {
    message: 'Password reset successfully',
  };

  return successResponse(response, 200);
}

async function handleRefreshToken(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as RefreshTokenRequest;

  validateRequestBody(body, [
    { field: 'refreshToken', required: true, type: 'string' },
  ]);

  const { refreshToken } = body;

  const authResult = await cognitoService.refreshToken(refreshToken);

  const response: RefreshTokenResponse = {
    accessToken: authResult.accessToken,
    expiresIn: authResult.expiresIn,
    tokenType: 'Bearer',
  };

  return successResponse(response, 200);
}

async function handleGetProfile(
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    return errorResponse('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const user = await userService.getUserById(userId);

  if (!user) {
    return errorResponse('User not found', 404, 'NOT_FOUND');
  }

  const response: UserProfile = {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return successResponse(response, 200);
}

async function handleLogout(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader) {
    return errorResponse('Authorization header is required', 401, 'UNAUTHORIZED');
  }

  const tokenMatch = authHeader.match(/^Bearer (.+)$/);

  if (!tokenMatch) {
    return errorResponse('Invalid authorization header format', 401, 'UNAUTHORIZED');
  }

  const accessToken = tokenMatch[1];

  await cognitoService.globalSignOut(accessToken);

  const response: LogoutResponse = {
    message: 'Logged out successfully',
  };

  return successResponse(response, 200);
}
