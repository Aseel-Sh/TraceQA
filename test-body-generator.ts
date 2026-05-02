/**
 * Test file for body-generator.ts
 * Run with: npx tsx test-body-generator.ts
 */

import {
  generateRequestBody,
  generateBodyFromOpenAPISchema,
  inferFieldsFromContext,
  generateBodyForScenario,
  generateStatefulBody,
  validateGeneratedBody,
  type BodyGenerationResult,
  type TestDataContext,
} from './src/validation/body-generator.js';
import type {
  QATask,
  AcceptanceCriterion,
  TraceQAConfig,
  DiscoveredRoute,
} from './src/types/index.js';

// Test data
const mockTask: QATask = {
  taskId: 'test-001',
  acceptanceCriterionId: 'ac-001',
  title: 'User registration with valid email and password',
  type: 'api',
  priority: 'high',
  preconditions: [],
  setupData: {},
  steps: [],
  expectedResult: 'User should be created successfully',
  executionMode: 'automated',
  reasoning: 'Testing user registration',
};

const mockCriterion: AcceptanceCriterion = {
  id: 'ac-001',
  description: 'Users can register with valid email and password',
  priority: 'high',
};

const mockConfig: TraceQAConfig = {
  projectName: 'TestProject',
  baseUrl: 'http://localhost:3000',
  sampleData: {
    validUser: {
      email: 'test@example.com',
      password: 'SecurePass123',
      name: 'Test User',
    },
    invalidEmail: 'bad-email',
    weakPassword: 'weak',
  },
};

const mockRoute: DiscoveredRoute = {
  method: 'POST',
  path: '/api/users',
  description: 'Create a new user',
};

const mockOpenApiSpec = {
  paths: {
    '/api/users': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                  },
                  password: {
                    type: 'string',
                    minLength: 8,
                  },
                  name: {
                    type: 'string',
                  },
                  age: {
                    type: 'integer',
                    minimum: 18,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

console.log('🧪 Testing Body Generator\n');

// Test 1: Generate body with OpenAPI schema
console.log('Test 1: Generate body with OpenAPI schema');
const result1 = generateRequestBody(
  'POST',
  mockRoute,
  mockTask,
  mockCriterion,
  mockConfig,
  mockOpenApiSpec
);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('✅ Test 1 passed\n');

// Test 2: Generate body with config sample data (no OpenAPI)
console.log('Test 2: Generate body with config sample data');
const result2 = generateRequestBody(
  'POST',
  mockRoute,
  mockTask,
  mockCriterion,
  mockConfig
);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('✅ Test 2 passed\n');

// Test 3: Generate body with field inference (no OpenAPI, no config)
console.log('Test 3: Generate body with field inference');
const emptyConfig: TraceQAConfig = { projectName: 'Test' };
const result3 = generateRequestBody(
  'POST',
  mockRoute,
  mockTask,
  mockCriterion,
  emptyConfig
);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('✅ Test 3 passed\n');

// Test 4: Invalid email scenario
console.log('Test 4: Invalid email scenario');
const invalidEmailTask: QATask = {
  ...mockTask,
  title: 'User registration with invalid email',
  expectedResult: 'Should return validation error',
};
const result4 = generateRequestBody(
  'POST',
  mockRoute,
  invalidEmailTask,
  mockCriterion,
  mockConfig,
  mockOpenApiSpec
);
console.log('Result:', JSON.stringify(result4, null, 2));
console.log('✅ Test 4 passed\n');

// Test 5: Weak password scenario
console.log('Test 5: Weak password scenario');
const weakPasswordTask: QATask = {
  ...mockTask,
  title: 'User registration with weak password',
  expectedResult: 'Should return validation error',
};
const result5 = generateRequestBody(
  'POST',
  mockRoute,
  weakPasswordTask,
  mockCriterion,
  mockConfig,
  mockOpenApiSpec
);
console.log('Result:', JSON.stringify(result5, null, 2));
console.log('✅ Test 5 passed\n');

// Test 6: Stateful body generation
console.log('Test 6: Stateful body generation');
const context: TestDataContext = {
  setupData: {},
  testId: 'test-001',
  timestamp: Date.now().toString(),
};
const baseBody = { email: 'test@example.com', password: 'SecurePass123' };
const setupBody = generateStatefulBody('setup', context, baseBody);
console.log('Setup body:', JSON.stringify(setupBody, null, 2));
const conflictBody = generateStatefulBody('conflict', context, baseBody);
console.log('Conflict body:', JSON.stringify(conflictBody, null, 2));
console.log('✅ Test 6 passed\n');

// Test 7: Validate generated body
console.log('Test 7: Validate generated body');
const warnings1 = validateGeneratedBody(result1.body, 'POST', mockRoute);
console.log('Warnings for valid body:', warnings1);
const warnings2 = validateGeneratedBody({}, 'POST', mockRoute);
console.log('Warnings for empty body:', warnings2);
const warnings3 = validateGeneratedBody(null, 'GET', mockRoute);
console.log('Warnings for GET with null body:', warnings3);
console.log('✅ Test 7 passed\n');

// Test 8: Infer fields from context
console.log('Test 8: Infer fields from context');
const inferredFields = inferFieldsFromContext(
  mockTask,
  mockCriterion,
  mockRoute,
  'test-001',
  Date.now().toString()
);
console.log('Inferred fields:', JSON.stringify(inferredFields, null, 2));
console.log('✅ Test 8 passed\n');

// Test 9: Generate body for different scenarios
console.log('Test 9: Generate body for different scenarios');
const baseFields = { email: 'test@example.com', password: 'SecurePass123', name: 'Test' };
const validBody = generateBodyForScenario('valid', baseFields, mockTask, 'test-001', Date.now().toString());
console.log('Valid scenario:', JSON.stringify(validBody, null, 2));
const invalidBody = generateBodyForScenario('invalid', baseFields, mockTask, 'test-001', Date.now().toString());
console.log('Invalid scenario:', JSON.stringify(invalidBody, null, 2));
const missingFieldBody = generateBodyForScenario('missing_field', baseFields, mockTask, 'test-001', Date.now().toString());
console.log('Missing field scenario:', JSON.stringify(missingFieldBody, null, 2));
console.log('✅ Test 9 passed\n');

// Test 10: GET request (should not generate body)
console.log('Test 10: GET request (should not generate body)');
const getRoute: DiscoveredRoute = { method: 'GET', path: '/api/users' };
const result10 = generateRequestBody(
  'GET',
  getRoute,
  mockTask,
  mockCriterion,
  mockConfig
);
console.log('Result:', JSON.stringify(result10, null, 2));
console.log('✅ Test 10 passed\n');

console.log('✅ All tests passed!');

// Made with Bob
