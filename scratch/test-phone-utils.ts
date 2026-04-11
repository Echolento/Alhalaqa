import { formatPhoneNumber, isValidPhoneNumber } from '../lib/phone-utils';

const testCases = [
  { input: '01012345678', expected: '+201012345678', valid: true },
  { input: '201112223333', expected: '+201112223333', valid: true },
  { input: '+201234567890', expected: '+201234567890', valid: true },
  { input: '12345', expected: '12345', valid: false }, // Too short
  { input: '+966500000000', expected: '+966500000000', valid: false }, // Wrong country
  { input: '010 1234 5678', expected: '+201012345678', valid: true }, // With spaces
  { input: '1012345678', expected: '+201012345678', valid: true }, // 10 digits from frontend
];

console.log('--- Testing Phone Utilities ---');

testCases.forEach(({ input, expected, valid }) => {
  const formatted = formatPhoneNumber(input);
  const isValid = isValidPhoneNumber(formatted);
  
  console.log(`Input: "${input}"`);
  console.log(`Formatted: "${formatted}" (Expected: "${expected}")`);
  console.log(`Is Valid: ${isValid} (Expected: ${valid})`);
  console.log(formatted === expected && isValid === valid ? '✅ PASS' : '❌ FAIL');
  console.log('---------------------------');
});
