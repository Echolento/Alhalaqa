/**
 * Standardizes phone numbers to the format: +20 XXXXXXXXXX (10 digits after prefix)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Case 1: User provided 11 digits starting with 0 (e.g., 01012345678)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+20${digits.slice(1)}`; // Drop the '0' and add '+20'
  }

  // Case 2: User provided 12 digits starting with 20 (e.g., 201012345678)
  if (digits.length === 12 && digits.startsWith('20')) {
    return `+${digits}`;
  }

  // Case 3: Already has the + and is the right length (12 digits: 20 + 10)
  if (phone.startsWith('+20') && digits.length === 12) {
    return `+${digits}`;
  }

  // Return as is for other cases, validation will handle incorrect formats
  return phone;
}

/**
 * Validates that the phone number matches the format: +20 followed by exactly 10 digits
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return /^\+20\d{10}$/.test(phone);
}
