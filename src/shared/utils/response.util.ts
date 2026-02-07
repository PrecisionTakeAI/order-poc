import { APIGatewayProxyResult } from 'aws-lambda';
import { SuccessResponse, ErrorResponse } from '../types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}

export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): APIGatewayProxyResult {
  const response: ErrorResponse = {
    message,
    code,
    details,
  };

  console.error('Error Response:', {
    statusCode,
    message,
    code,
    details,
  });

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}
