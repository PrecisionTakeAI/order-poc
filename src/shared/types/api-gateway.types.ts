import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export type { APIGatewayProxyEvent, APIGatewayProxyResult, Context };

export interface AuthorizedAPIGatewayProxyEvent extends APIGatewayProxyEvent {
  requestContext: APIGatewayProxyEvent['requestContext'] & {
    authorizer?: {
      claims?: {
        sub: string;
        email: string;
        'cognito:username': string;
        [key: string]: string;
      };
    };
  };
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}
