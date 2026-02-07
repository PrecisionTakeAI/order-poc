import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppError } from '../utils/error.util';
import { errorResponse } from '../utils/response.util';

export async function errorHandlerMiddleware(
  event: APIGatewayProxyEvent,
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> {
  try {
    return await handler(event);
  } catch (error) {
    console.error('Error caught by middleware:', error);

    if (error instanceof AppError) {
      return errorResponse(
        error.message,
        error.statusCode,
        error.code,
        error.details
      );
    }

    if (error instanceof Error) {
      return errorResponse(error.message, 500, 'INTERNAL_SERVER_ERROR');
    }

    return errorResponse(
      'An unexpected error occurred',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
}
