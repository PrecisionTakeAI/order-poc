import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
  PolicyDocument,
  Statement,
} from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Create JWT verifier instance (singleton pattern)
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  tokenUse: 'access',
  clientId: null, // Accept any client ID
});

/**
 * Lambda Authorizer for admin-only API endpoints.
 * Validates that the user has the 'admin' group in their JWT claims.
 *
 * @param event - API Gateway Request Authorizer event
 * @returns IAM policy allowing or denying access
 */
export async function handler(
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  console.log('Admin authorizer invoked', {
    methodArn: event.methodArn,
    headers: Object.keys(event.headers || {}),
  });

  try {
    // Extract JWT from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      console.warn('Authorization header missing');
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      console.warn('Bearer token missing');
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    // Verify JWT signature, expiration, and issuer using aws-jwt-verify
    const decoded = await verifier.verify(token);
    if (!decoded) {
      console.warn('Failed to verify JWT');
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    const userId = decoded.sub;
    const email = typeof decoded.email === 'string' ? decoded.email : 'unknown';

    // Extract groups from claims
    const groups = parseGroups(decoded['cognito:groups']);
    const isAdmin = groups.includes('admin');

    console.log('Authorization check', {
      userId,
      email,
      groups,
      isAdmin,
    });

    if (isAdmin) {
      console.info('Admin access granted', { userId, email });
      return generatePolicy(userId, 'Allow', event.methodArn, {
        userId,
        email,
        groups: groups.join(','),
      });
    } else {
      console.warn('Admin access denied - user is not in admin group', { userId, email, groups });
      return generatePolicy(userId, 'Deny', event.methodArn);
    }
  } catch (error) {
    console.error('Authorizer error', { error });
    return generatePolicy('user', 'Deny', event.methodArn);
  }
}


/**
 * Parses cognito:groups claim which can be array or string format.
 *
 * @param groupsClaim - Groups claim from JWT
 * @returns Array of group names
 */
function parseGroups(groupsClaim: unknown): string[] {
  if (!groupsClaim) {
    return [];
  }

  if (Array.isArray(groupsClaim)) {
    return groupsClaim.filter((g) => typeof g === 'string');
  }

  if (typeof groupsClaim === 'string') {
    const trimmed = groupsClaim.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const content = trimmed.slice(1, -1).trim();
      if (!content) {
        return [];
      }
      return content.split(',').map((g) => g.trim()).filter(Boolean);
    }
    return [trimmed];
  }

  return [];
}

/**
 * Generates an IAM policy document for API Gateway.
 *
 * @param principalId - User identifier
 * @param effect - Allow or Deny
 * @param resource - API Gateway method ARN (use wildcard for caching)
 * @param context - Optional context to pass to the backend
 * @returns IAM policy for API Gateway
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  // Use wildcard resource for better caching
  const wildcardResource = resource.split('/').slice(0, 2).join('/') + '/*';

  const statement: Statement = {
    Action: 'execute-api:Invoke',
    Effect: effect,
    Resource: wildcardResource,
  };

  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [statement],
  };

  const authorizerResult: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
  };

  if (context) {
    authorizerResult.context = context;
  }

  return authorizerResult;
}
