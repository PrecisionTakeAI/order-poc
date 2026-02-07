/**
 * Pagination utilities for DynamoDB LastEvaluatedKey encoding/decoding
 */

/**
 * Encode a DynamoDB LastEvaluatedKey as a Base64 pagination token
 */
export function encodePaginationToken(key: Record<string, unknown>): string {
  try {
    return Buffer.from(JSON.stringify(key)).toString('base64');
  } catch {
    throw new Error('Failed to encode pagination token');
  }
}

/**
 * Decode a Base64 pagination token back to a DynamoDB ExclusiveStartKey
 * Returns null for invalid or malformed tokens
 */
export function decodePaginationToken(token: string): Record<string, unknown> | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface PaginationParams {
  limit: number;
  lastKey?: string;
}

/**
 * Parse and validate pagination parameters from query string
 * Defaults: limit=50 (max 100)
 */
export function parsePaginationParams(
  queryParams: Record<string, string | undefined> | null
): PaginationParams {
  const DEFAULT_LIMIT = 50;
  const MAX_LIMIT = 100;
  const MIN_LIMIT = 1;

  let limit = DEFAULT_LIMIT;
  if (queryParams?.limit) {
    const parsed = parseInt(queryParams.limit, 10);
    if (!isNaN(parsed)) {
      limit = Math.max(MIN_LIMIT, Math.min(parsed, MAX_LIMIT));
    }
  }

  const lastKey = queryParams?.lastKey || undefined;

  return { limit, lastKey };
}
