import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Parses the cognito:groups claim which can be in two formats:
 * - String format: "[admin,user]" (from some Cognito configurations)
 * - Array format: ["admin", "user"] (from other Cognito configurations)
 *
 * @param groupsClaim - The raw groups claim value
 * @returns Array of group names
 */
export function parseGroupsClaim(groupsClaim: unknown): string[] {
  if (!groupsClaim) {
    return [];
  }

  // Handle array format
  if (Array.isArray(groupsClaim)) {
    return groupsClaim.filter((g) => typeof g === 'string');
  }

  // Handle string format like "[admin,user]"
  if (typeof groupsClaim === 'string') {
    const trimmed = groupsClaim.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const content = trimmed.slice(1, -1).trim();
      if (!content) {
        return [];
      }
      return content.split(',').map((g) => g.trim()).filter(Boolean);
    }
    // Single group as string
    return [trimmed];
  }

  return [];
}

/**
 * Extracts cognito:groups from API Gateway authorizer claims.
 *
 * @param claims - Claims object from event.requestContext.authorizer.claims
 * @returns Array of group names
 */
export function extractGroupsFromClaims(claims: Record<string, unknown>): string[] {
  if (!claims) {
    return [];
  }

  const groupsClaim = claims['cognito:groups'];
  return parseGroupsClaim(groupsClaim);
}

/**
 * Checks if the authenticated user has the admin role.
 *
 * @param event - API Gateway proxy event
 * @returns True if the user is an admin, false otherwise
 */
export function isAdminUser(event: APIGatewayProxyEvent): boolean {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) {
    return false;
  }

  const groups = extractGroupsFromClaims(claims as Record<string, unknown>);
  return groups.includes('admin');
}
