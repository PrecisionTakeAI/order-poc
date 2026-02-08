import { Address } from '../types';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Validates an address object against defined rules
 * @param address - The address to validate
 * @returns Array of validation errors, empty if valid
 */
export function validateAddress(address: Address): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  // Full Name: 2-100 chars, letters/spaces/hyphens/apostrophes/periods
  const fullNameRegex = /^[a-zA-Z\s'.,-]{2,100}$/;
  if (!address.fullName || address.fullName.trim().length === 0) {
    errors.push({
      field: 'shippingAddress.fullName',
      message: 'Full name is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!fullNameRegex.test(address.fullName.trim())) {
    if (address.fullName.trim().length < 2) {
      errors.push({
        field: 'shippingAddress.fullName',
        message: 'Full name must be at least 2 characters',
        code: 'INVALID_LENGTH',
      });
    } else if (address.fullName.trim().length > 100) {
      errors.push({
        field: 'shippingAddress.fullName',
        message: 'Full name must not exceed 100 characters',
        code: 'INVALID_LENGTH',
      });
    } else {
      errors.push({
        field: 'shippingAddress.fullName',
        message: 'Full name can only contain letters, spaces, hyphens, apostrophes, and periods',
        code: 'INVALID_FORMAT',
      });
    }
  }

  // Street: 5-200 chars, alphanumeric + common punctuation
  const streetRegex = /^[a-zA-Z0-9\s,.#-]{5,200}$/;
  if (!address.street || address.street.trim().length === 0) {
    errors.push({
      field: 'shippingAddress.street',
      message: 'Street address is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!streetRegex.test(address.street.trim())) {
    if (address.street.trim().length < 5) {
      errors.push({
        field: 'shippingAddress.street',
        message: 'Street address must be at least 5 characters',
        code: 'INVALID_LENGTH',
      });
    } else if (address.street.trim().length > 200) {
      errors.push({
        field: 'shippingAddress.street',
        message: 'Street address must not exceed 200 characters',
        code: 'INVALID_LENGTH',
      });
    } else {
      errors.push({
        field: 'shippingAddress.street',
        message: 'Street address contains invalid characters',
        code: 'INVALID_FORMAT',
      });
    }
  }

  // City: 2-100 chars, letters/spaces/hyphens
  const cityRegex = /^[a-zA-Z\s-]{2,100}$/;
  if (!address.city || address.city.trim().length === 0) {
    errors.push({
      field: 'shippingAddress.city',
      message: 'City is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!cityRegex.test(address.city.trim())) {
    if (address.city.trim().length < 2) {
      errors.push({
        field: 'shippingAddress.city',
        message: 'City must be at least 2 characters',
        code: 'INVALID_LENGTH',
      });
    } else if (address.city.trim().length > 100) {
      errors.push({
        field: 'shippingAddress.city',
        message: 'City must not exceed 100 characters',
        code: 'INVALID_LENGTH',
      });
    } else {
      errors.push({
        field: 'shippingAddress.city',
        message: 'City can only contain letters, spaces, and hyphens',
        code: 'INVALID_FORMAT',
      });
    }
  }

  // State: 2-50 chars
  const stateRegex = /^[a-zA-Z\s-]{2,50}$/;
  if (!address.state || address.state.trim().length === 0) {
    errors.push({
      field: 'shippingAddress.state',
      message: 'State/Province is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!stateRegex.test(address.state.trim())) {
    if (address.state.trim().length < 2) {
      errors.push({
        field: 'shippingAddress.state',
        message: 'State/Province must be at least 2 characters',
        code: 'INVALID_LENGTH',
      });
    } else if (address.state.trim().length > 50) {
      errors.push({
        field: 'shippingAddress.state',
        message: 'State/Province must not exceed 50 characters',
        code: 'INVALID_LENGTH',
      });
    } else {
      errors.push({
        field: 'shippingAddress.state',
        message: 'State/Province can only contain letters, spaces, and hyphens',
        code: 'INVALID_FORMAT',
      });
    }
  }

  // Postal Code: 3-10 chars, alphanumeric
  const postalCodeRegex = /^[a-zA-Z0-9\s-]{3,10}$/;
  if (!address.postalCode || address.postalCode.trim().length === 0) {
    errors.push({
      field: 'shippingAddress.postalCode',
      message: 'Postal code is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!postalCodeRegex.test(address.postalCode.trim())) {
    if (address.postalCode.trim().length < 3) {
      errors.push({
        field: 'shippingAddress.postalCode',
        message: 'Postal code must be at least 3 characters',
        code: 'INVALID_LENGTH',
      });
    } else if (address.postalCode.trim().length > 10) {
      errors.push({
        field: 'shippingAddress.postalCode',
        message: 'Postal code must not exceed 10 characters',
        code: 'INVALID_LENGTH',
      });
    } else {
      errors.push({
        field: 'shippingAddress.postalCode',
        message: 'Postal code can only contain letters, numbers, spaces, and hyphens',
        code: 'INVALID_FORMAT',
      });
    }
  }

  // Country: 2-50 chars, letters/spaces
  const countryRegex = /^[a-zA-Z\s]{2,50}$/;
  if (!address.country || address.country.trim().length === 0) {
    errors.push({
      field: 'shippingAddress.country',
      message: 'Country is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!countryRegex.test(address.country.trim())) {
    if (address.country.trim().length < 2) {
      errors.push({
        field: 'shippingAddress.country',
        message: 'Country must be at least 2 characters',
        code: 'INVALID_LENGTH',
      });
    } else if (address.country.trim().length > 50) {
      errors.push({
        field: 'shippingAddress.country',
        message: 'Country must not exceed 50 characters',
        code: 'INVALID_LENGTH',
      });
    } else {
      errors.push({
        field: 'shippingAddress.country',
        message: 'Country can only contain letters and spaces',
        code: 'INVALID_FORMAT',
      });
    }
  }

  return errors;
}
