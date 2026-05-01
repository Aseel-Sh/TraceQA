/**
 * Test file for acceptance criteria parser
 * Validates parsing of acceptance.md files
 */

import { parseAcceptanceCriteria } from './src/parsers/acceptance-parser';

// Test 1: Basic AC-N format
console.log('=== Test 1: Basic AC-N format ===');
const markdown1 = `
# Acceptance Criteria

AC-1: A user can register with a valid email and strong password.
AC-2: Registration rejects invalid email formats.
AC-3: Registration rejects weak passwords.
AC-4: Duplicate email registration returns a clear conflict error.
AC-5: A registered user can log in with valid credentials.
AC-6: Invalid login credentials are rejected.
`;

const result1 = parseAcceptanceCriteria(markdown1);
console.log(JSON.stringify(result1, null, 2));
console.log(`\nParsed ${result1.criteria.length} criteria\n`);

// Test 2: Numbered list format
console.log('=== Test 2: Numbered list format ===');
const markdown2 = `
# Acceptance Criteria

1. User can create a new account
2. User can log in with credentials
3. User can reset password
`;

const result2 = parseAcceptanceCriteria(markdown2);
console.log(JSON.stringify(result2, null, 2));
console.log(`\nParsed ${result2.criteria.length} criteria\n`);

// Test 3: Bullet list format
console.log('=== Test 3: Bullet list format ===');
const markdown3 = `
# Acceptance Criteria

- System validates email format
- System enforces password strength
- System prevents duplicate registrations
`;

const result3 = parseAcceptanceCriteria(markdown3);
console.log(JSON.stringify(result3, null, 2));
console.log(`\nParsed ${result3.criteria.length} criteria\n`);

// Test 4: Multi-line criteria
console.log('=== Test 4: Multi-line criteria ===');
const markdown4 = `
# Acceptance Criteria

AC-1: A user can register with a valid email and strong password.
The password must be at least 8 characters long and contain uppercase, lowercase, and numbers.

AC-2: Registration rejects invalid email formats.
Invalid formats include missing @ symbol, missing domain, etc.
`;

const result4 = parseAcceptanceCriteria(markdown4);
console.log(JSON.stringify(result4, null, 2));
console.log(`\nParsed ${result4.criteria.length} criteria\n`);

// Test 5: Mixed format
console.log('=== Test 5: Mixed format ===');
const markdown5 = `
# User Authentication

## Acceptance Criteria

AC-1: User registration works correctly
AC-2: User login is secure

## Additional Requirements

- System logs all authentication attempts
- Failed login attempts are rate-limited
`;

const result5 = parseAcceptanceCriteria(markdown5);
console.log(JSON.stringify(result5, null, 2));
console.log(`\nParsed ${result5.criteria.length} criteria\n`);

console.log('=== All tests completed ===');

// Made with Bob
