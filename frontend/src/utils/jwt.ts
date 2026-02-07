export interface CognitoJWTPayload {
  sub: string;
  'cognito:groups'?: string[];
  email?: string;
  exp: number;
  iat: number;
  token_use: string;
}

export const decodeToken = (token: string): CognitoJWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as CognitoJWTPayload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const getTokenExpiration = (token: string): number | null => {
  const payload = decodeToken(token);
  return payload?.exp || null;
};

// SECURITY: Decodes JWT for display purposes only. No signature validation is
// performed client-side. Backend must validate JWT signatures before trusting claims.
export const getUserGroups = (token: string): string[] => {
  const payload = decodeToken(token);
  return payload?.['cognito:groups'] || [];
};

export const isTokenExpired = (token: string): boolean => {
  const exp = getTokenExpiration(token);
  if (!exp) {
    return true;
  }
  return Date.now() >= exp * 1000;
};
