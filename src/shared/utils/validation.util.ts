import { ValidationError } from './error.util';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
  customMessage?: string;
}

export function validateRequestBody(
  body: unknown,
  rules: ValidationRule[]
): void {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];

    if (rule.required && (value === undefined || value === null)) {
      errors.push(`Field '${rule.field}' is required`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (rule.type && typeof value !== rule.type) {
      errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
      continue;
    }

    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(
          `Field '${rule.field}' must be at least ${rule.minLength} characters long`
        );
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(
          `Field '${rule.field}' must be at most ${rule.maxLength} characters long`
        );
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(
          rule.customMessage || `Field '${rule.field}' has invalid format`
        );
      }
    }

    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push(`Field '${rule.field}' must be at most ${rule.max}`);
      }
    }

    if (rule.custom && !rule.custom(value)) {
      errors.push(
        rule.customMessage || `Field '${rule.field}' failed custom validation`
      );
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', { errors });
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
