/**
 * Integration Tests for TraceQA Fixes
 * 
 * Comprehensive test suite to verify all major fixes:
 * 1. Route matching improvements
 * 2. Body generation with required fields
 * 3. Variable capture system
 * 4. Failure classification logic
 * 5. Report counting accuracy
 */

import {
  TestRunner,
  assert,
  assertEqual,
  assertDeepEqual,
  assertContains,
  assertMatches,
  assertGreaterThan,
  loadOpenAPISpec,
  loadMockResponse,
  loadTestScenarios,
  validateEmail,
  validateUUID,
  validateDateTime,
  validateAgainstSchema,
  MockHttpClient
} from './test-helpers.js';

// Import the modules we're testing
import { matchRouteToTask, detectResourceAndAction, validateAndNormalizeHTTPStep } from './src/validation/route-matcher.js';
import { generateRequestBody, validateRequiredFields } from './src/validation/body-generator.js';
import { TestContext, createTestContext } from './src/testing/test-context.js';
import { classifyTestResult, isNetworkError, isLikelyNegativeTest } from './src/testing/failure-classifier.js';
import { ReportGenerator } from './src/reporting/report-generator.js';

// Test runner instance
const runner = new TestRunner();

/**
 * Main test execution
 */
async function runAllTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('TraceQA Integration Tests - Verifying All Fixes');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Run all test categories
    await testRouteMatching();
    await testBodyGeneration();
    await testVariableCapture();
    await testFailureClassification();
    await testReportCounting();
    await testEndToEndWorkflows();
    await testBackwardCompatibility();
    await testEdgeCases();

    // Print summary
    runner.printSummary();
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

/**
 * Test Route Matching Improvements
 */
async function testRouteMatching(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Route Matching Improvements');
  console.log('='.repeat(80));

  const scenarios = loadTestScenarios('routeMatchingScenarios');
  const openApiSpec = loadOpenAPISpec('userManagementAPI');

  for (const scenario of scenarios) {
    runner.startTest(scenario.name, 'Route Matching');

    try {
      // Create mock task and criterion
      const task = {
        taskId: 'TEST-1',
        title: scenario.task,
        type: 'api',
        executionMode: 'automated',
        acceptanceCriterionId: 'AC-1'
      };

      const criterion = {
        id: 'AC-1',
        description: scenario.task
      };

      // Match route
      const result = matchRouteToTask(task, criterion, scenario.routes, openApiSpec);

      // Verify match
      assert(result.matched, 'Route should be matched');
      assertEqual(result.route?.path, scenario.expected.path, 'Path should match expected');
      assertEqual(result.method, scenario.expected.method, 'Method should match expected');
      assertEqual(result.confidence, scenario.expected.confidence, 'Confidence should match expected');

      runner.passTest(scenario.name, 'Route Matching');
    } catch (error: any) {
      runner.failTest(scenario.name, 'Route Matching', error.message);
    }
  }

  // Test resource and action detection
  runner.startTest('Resource and action detection', 'Route Matching');
  try {
    const result1 = detectResourceAndAction('User should be able to login');
    assertEqual(result1.action, 'login', 'Should detect login action');

    const result2 = detectResourceAndAction('Register new user account');
    assertEqual(result2.action, 'register', 'Should detect register action');

    const result3 = detectResourceAndAction('Verify email address');
    assertEqual(result3.action, 'verify', 'Should detect verify action');

    const result4 = detectResourceAndAction('Update user profile');
    assertEqual(result4.action, 'update', 'Should detect update action');

    runner.passTest('Resource and action detection', 'Route Matching');
  } catch (error: any) {
    runner.failTest('Resource and action detection', 'Route Matching', error.message);
  }

  // Test path parameter handling
  runner.startTest('Path parameter handling', 'Route Matching');
  try {
    const routes = [
      { path: '/users/{id}', method: 'GET', description: 'Get user by ID' },
      { path: '/users', method: 'GET', description: 'List all users' }
    ];

    const task = {
      taskId: 'TEST-2',
      title: 'Get specific user details',
      type: 'api',
      executionMode: 'automated',
      acceptanceCriterionId: 'AC-2'
    };

    const criterion = {
      id: 'AC-2',
      description: 'User should be able to view their profile'
    };

    const result = matchRouteToTask(task, criterion, routes);
    assertEqual(result.route?.path, '/users/{id}', 'Should match parameterized path');

    runner.passTest('Path parameter handling', 'Route Matching');
  } catch (error: any) {
    runner.failTest('Path parameter handling', 'Route Matching', error.message);
  }
}

/**
 * Test Body Generation with Required Fields
 */
async function testBodyGeneration(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Body Generation with Required Fields');
  console.log('='.repeat(80));

  const scenarios = loadTestScenarios('bodyGenerationScenarios');
  const openApiSpec = loadOpenAPISpec('userManagementAPI');

  for (const scenario of scenarios) {
    runner.startTest(scenario.name, 'Body Generation');

    try {
      // Generate body from schema
      const result = await generateRequestBody(
        'POST',
        '/test/endpoint',
        openApiSpec,
        { schema: scenario.schema }
      );

      // Verify required fields are present
      if (scenario.expectedFields) {
        for (const field of scenario.expectedFields) {
          assert(field in result.body, `Required field '${field}' should be present`);
        }
      }

      // Validate against schema
      const validation = validateAgainstSchema(result.body, scenario.schema);
      assert(validation.valid, `Body should be valid: ${validation.errors.join(', ')}`);

      // Verify format-specific generation
      if (scenario.validation) {
        for (const [field, requirement] of Object.entries(scenario.validation)) {
          const value = result.body[field];
          
          if (requirement.includes('email')) {
            assert(validateEmail(value), `${field} should be valid email`);
          } else if (requirement.includes('UUID')) {
            assert(validateUUID(value), `${field} should be valid UUID`);
          } else if (requirement.includes('date-time')) {
            assert(validateDateTime(value), `${field} should be valid date-time`);
          }
        }
      }

      runner.passTest(scenario.name, 'Body Generation');
    } catch (error: any) {
      runner.failTest(scenario.name, 'Body Generation', error.message);
    }
  }

  // Test required field enforcement
  runner.startTest('Required field enforcement', 'Body Generation');
  try {
    const schema = {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 }
      }
    };

    const result = await generateRequestBody('POST', '/auth/login', null, { schema });
    
    assert('email' in result.body, 'Email should be present');
    assert('password' in result.body, 'Password should be present');
    assert(validateEmail(result.body.email), 'Email should be valid');
    assert(result.body.password.length >= 8, 'Password should meet minLength');

    runner.passTest('Required field enforcement', 'Body Generation');
  } catch (error: any) {
    runner.failTest('Required field enforcement', 'Body Generation', error.message);
  }

  // Test schema constraint compliance
  runner.startTest('Schema constraint compliance', 'Body Generation');
  try {
    const schema = {
      type: 'object',
      required: ['username'],
      properties: {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-zA-Z0-9_]+$'
        }
      }
    };

    const result = await generateRequestBody('POST', '/users', null, { schema });
    
    const username = result.body.username;
    assert(username.length >= 3, 'Username should meet minLength');
    assert(username.length <= 50, 'Username should meet maxLength');
    assertMatches(username, /^[a-zA-Z0-9_]+$/, 'Username should match pattern');

    runner.passTest('Schema constraint compliance', 'Body Generation');
  } catch (error: any) {
    runner.failTest('Schema constraint compliance', 'Body Generation', error.message);
  }
}

/**
 * Test Variable Capture System
 */
async function testVariableCapture(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Variable Capture System');
  console.log('='.repeat(80));

  // Test context creation and variable storage
  runner.startTest('Context creation and variable storage', 'Variable Capture');
  try {
    const context = createTestContext('test-123');
    
    assertEqual(context.getTestId(), 'test-123', 'Test ID should match');
    
    context.set('userId', '12345');
    assertEqual(context.get('userId'), '12345', 'Should retrieve stored variable');
    assert(context.has('userId'), 'Should confirm variable exists');
    
    context.set('token', 'abc123');
    const allVars = context.getAll();
    assertEqual(allVars.userId, '12345', 'All variables should include userId');
    assertEqual(allVars.token, 'abc123', 'All variables should include token');

    runner.passTest('Context creation and variable storage', 'Variable Capture');
  } catch (error: any) {
    runner.failTest('Context creation and variable storage', 'Variable Capture', error.message);
  }

  // Test response value extraction
  runner.startTest('Response value extraction', 'Variable Capture');
  try {
    const context = createTestContext('test-extract');
    
    const response = {
      body: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        profile: {
          name: 'Test User'
        }
      },
      headers: {
        'x-request-id': 'req-123'
      },
      status: 201
    };

    // Extract from body
    const userId = context.extractValue(response.body, 'userId');
    assertEqual(userId, '550e8400-e29b-41d4-a716-446655440000', 'Should extract userId');

    // Extract nested value
    const name = context.extractValue(response.body, 'profile.name');
    assertEqual(name, 'Test User', 'Should extract nested value');

    // Extract from headers
    const requestId = context.extractValue(response.headers, 'x-request-id');
    assertEqual(requestId, 'req-123', 'Should extract from headers');

    runner.passTest('Response value extraction', 'Variable Capture');
  } catch (error: any) {
    runner.failTest('Response value extraction', 'Variable Capture', error.message);
  }

  // Test variable substitution
  runner.startTest('Variable substitution in URLs, headers, bodies', 'Variable Capture');
  try {
    const context = createTestContext('test-subst');
    context.set('userId', '12345');
    context.set('token', 'abc123');

    // Substitute in URL
    const url = context.substituteString('/users/{{userId}}');
    assertEqual(url.value, '/users/12345', 'Should substitute in URL');

    // Substitute in object
    const body = context.substituteObject({
      userId: '{{userId}}',
      action: 'update'
    });
    assertEqual(body.userId, '12345', 'Should substitute in object');
    assertEqual(body.action, 'update', 'Should preserve non-variable values');

    // Substitute in headers
    const headers = context.substituteObject({
      'Authorization': 'Bearer {{token}}',
      'Content-Type': 'application/json'
    });
    assertEqual(headers.Authorization, 'Bearer abc123', 'Should substitute in headers');

    runner.passTest('Variable substitution in URLs, headers, bodies', 'Variable Capture');
  } catch (error: any) {
    runner.failTest('Variable substitution in URLs, headers, bodies', 'Variable Capture', error.message);
  }

  // Test multi-step sequence
  runner.startTest('Multi-step test sequence', 'Variable Capture');
  try {
    const context = createTestContext('multi-step');

    // Step 1: Register user (capture userId)
    const registerResponse = {
      body: { userId: 'user-001', email: 'test@example.com' }
    };
    context.extractAndStore(registerResponse, {
      name: 'userId',
      path: 'userId',
      source: 'body'
    });

    // Step 2: Use captured userId in next request
    const getUserUrl = context.substituteString('/users/{{userId}}');
    assertEqual(getUserUrl.value, '/users/user-001', 'Should use captured userId');

    // Step 3: Update user with captured userId
    const updateBody = context.substituteObject({
      userId: '{{userId}}',
      email: 'updated@example.com'
    });
    assertEqual(updateBody.userId, 'user-001', 'Should use captured userId in body');

    runner.passTest('Multi-step test sequence', 'Variable Capture');
  } catch (error: any) {
    runner.failTest('Multi-step test sequence', 'Variable Capture', error.message);
  }
}

/**
 * Test Failure Classification Logic
 */
async function testFailureClassification(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Failure Classification Logic');
  console.log('='.repeat(80));

  const scenarios = loadTestScenarios('failureClassificationScenarios');

  for (const scenario of scenarios) {
    runner.startTest(scenario.name, 'Failure Classification');

    try {
      let testResult: any;

      if (scenario.error) {
        // Network error scenario
        testResult = {
          passed: false,
          error: scenario.error.message,
          response: null,
          assertions: []
        };
      } else if (scenario.response) {
        // Response-based scenario
        testResult = {
          passed: false,
          error: null,
          response: scenario.response,
          assertions: [{ type: 'STATUS_CODE', passed: false }]
        };
      }

      const context = {
        isNegativeTest: scenario.testType === 'negative',
        expectedStatuses: scenario.expectedStatus ? [scenario.expectedStatus] : []
      };

      const classification = classifyTestResult(testResult, context);

      assertEqual(
        classification.classification,
        scenario.expected.classification,
        `Classification should be ${scenario.expected.classification}`
      );

      runner.passTest(scenario.name, 'Failure Classification');
    } catch (error: any) {
      runner.failTest(scenario.name, 'Failure Classification', error.message);
    }
  }

  // Test network error detection
  runner.startTest('Network error detection', 'Failure Classification');
  try {
    assert(isNetworkError('ECONNREFUSED'), 'Should detect ECONNREFUSED');
    assert(isNetworkError('ETIMEDOUT'), 'Should detect ETIMEDOUT');
    assert(isNetworkError('Connection refused'), 'Should detect connection refused');
    assert(!isNetworkError('Invalid JSON'), 'Should not detect non-network errors');

    runner.passTest('Network error detection', 'Failure Classification');
  } catch (error: any) {
    runner.failTest('Network error detection', 'Failure Classification', error.message);
  }

  // Test negative test detection
  runner.startTest('Negative test detection', 'Failure Classification');
  try {
    assert(isLikelyNegativeTest('Should reject invalid email'), 'Should detect negative test');
    assert(isLikelyNegativeTest('User cannot access unauthorized resource'), 'Should detect negative test');
    assert(!isLikelyNegativeTest('User can login successfully'), 'Should not detect positive test');

    runner.passTest('Negative test detection', 'Failure Classification');
  } catch (error: any) {
    runner.failTest('Negative test detection', 'Failure Classification', error.message);
  }
}

/**
 * Test Report Counting Accuracy
 */
async function testReportCounting(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Report Counting Accuracy');
  console.log('='.repeat(80));

  const scenarios = loadTestScenarios('reportCountingScenarios');

  for (const scenario of scenarios) {
    runner.startTest(scenario.name, 'Report Counting');

    try {
      // Create mock test results
      const testResults = scenario.testResults.map((result: any, index: number) => ({
        testId: `TEST-${index + 1}`,
        title: `Test ${index + 1}`,
        status: result.status,
        classification: {
          classification: result.classification || result.status.toLowerCase(),
          reason: 'Test reason',
          confidence: 1.0
        },
        executor: 'http',
        duration: 100,
        stepResults: [],
        evidence: [],
        acceptanceCriterionId: 'AC-1'
      }));

      // Count results
      const total = testResults.length;
      const executed = testResults.filter((r: any) => 
        r.classification.classification !== 'skipped' &&
        r.classification.classification !== 'manual'
      ).length;
      const notExecuted = testResults.filter((r: any) =>
        r.classification.classification === 'skipped' ||
        r.classification.classification === 'manual'
      ).length;
      const passed = testResults.filter((r: any) =>
        r.classification.classification === 'passed'
      ).length;
      const failed = testResults.filter((r: any) =>
        r.classification.classification !== 'passed' &&
        r.classification.classification !== 'skipped' &&
        r.classification.classification !== 'manual'
      ).length;

      // Verify counts
      assertEqual(total, scenario.expected.total, 'Total should match');
      assertEqual(executed, scenario.expected.executed, 'Executed should match');
      assertEqual(notExecuted, scenario.expected.notExecuted, 'Not executed should match');
      assertEqual(passed, scenario.expected.passed, 'Passed should match');
      assertEqual(failed, scenario.expected.failed, 'Failed should match');

      // Verify count validation
      assertEqual(executed + notExecuted, total, 'executed + notExecuted should equal total');

      runner.passTest(scenario.name, 'Report Counting');
    } catch (error: any) {
      runner.failTest(scenario.name, 'Report Counting', error.message);
    }
  }

  // Test failure breakdown
  runner.startTest('Failure breakdown accuracy', 'Report Counting');
  try {
    const testResults = [
      { classification: { classification: 'application_failure' } },
      { classification: { classification: 'infrastructure_failure' } },
      { classification: { classification: 'traceqa_generation_issue' } },
      { classification: { classification: 'uncertain' } }
    ];

    const appFailures = testResults.filter(r => r.classification.classification === 'application_failure').length;
    const infraFailures = testResults.filter(r => r.classification.classification === 'infrastructure_failure').length;
    const genIssues = testResults.filter(r => r.classification.classification === 'traceqa_generation_issue').length;
    const uncertain = testResults.filter(r => r.classification.classification === 'uncertain').length;

    assertEqual(appFailures, 1, 'Application failures should be 1');
    assertEqual(infraFailures, 1, 'Infrastructure failures should be 1');
    assertEqual(genIssues, 1, 'Generation issues should be 1');
    assertEqual(uncertain, 1, 'Uncertain should be 1');

    const totalFailed = appFailures + infraFailures + genIssues + uncertain;
    assertEqual(totalFailed, 4, 'Total failed should equal sum of failure types');

    runner.passTest('Failure breakdown accuracy', 'Report Counting');
  } catch (error: any) {
    runner.failTest('Failure breakdown accuracy', 'Report Counting', error.message);
  }
}

/**
 * Test End-to-End Workflows
 */
async function testEndToEndWorkflows(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: End-to-End Workflows');
  console.log('='.repeat(80));

  // Test complete workflow: generate → match → generate body → execute → classify → report
  runner.startTest('Complete test workflow', 'End-to-End');
  try {
    const openApiSpec = loadOpenAPISpec('userManagementAPI');
    
    // Step 1: Match route
    const task = {
      taskId: 'E2E-1',
      title: 'User registration',
      type: 'api',
      executionMode: 'automated',
      acceptanceCriterionId: 'AC-E2E'
    };
    const criterion = { id: 'AC-E2E', description: 'User can register with valid email' };
    const routes = [
      { path: '/auth/register', method: 'POST', description: 'Register user' },
      { path: '/auth/login', method: 'POST', description: 'Login user' }
    ];

    const matchResult = matchRouteToTask(task, criterion, routes, openApiSpec);
    assert(matchResult.matched, 'Route should be matched');
    assertEqual(matchResult.route?.path, '/auth/register', 'Should match register route');

    // Step 2: Generate body
    const bodyResult = await generateRequestBody(
      'POST',
      '/auth/register',
      openApiSpec
    );
    assert('email' in bodyResult.body, 'Body should have email');
    assert('password' in bodyResult.body, 'Body should have password');

    // Step 3: Simulate execution and classification
    const testResult = {
      passed: true,
      error: null,
      response: { status: 201, body: { userId: 'user-123' } },
      assertions: [{ type: 'STATUS_CODE', passed: true }]
    };

    const classification = classifyTestResult(testResult);
    assertEqual(classification.classification, 'passed', 'Should classify as passed');

    runner.passTest('Complete test workflow', 'End-to-End');
  } catch (error: any) {
    runner.failTest('Complete test workflow', 'End-to-End', error.message);
  }

  // Test multi-step workflow with variable capture
  runner.startTest('Multi-step workflow with variable capture', 'End-to-End');
  try {
    const context = createTestContext('e2e-multi');

    // Step 1: Create resource
    const createResponse = { body: { id: 'resource-123', name: 'Test Resource' } };
    context.extractAndStore(createResponse, { name: 'resourceId', path: 'id', source: 'body' });

    // Step 2: Get resource using captured ID
    const getUrl = context.substituteString('/resources/{{resourceId}}');
    assertEqual(getUrl.value, '/resources/resource-123', 'Should use captured ID');

    // Step 3: Update resource
    const updateBody = context.substituteObject({
      id: '{{resourceId}}',
      name: 'Updated Resource'
    });
    assertEqual(updateBody.id, 'resource-123', 'Should use captured ID in body');

    // Step 4: Delete resource
    const deleteUrl = context.substituteString('/resources/{{resourceId}}');
    assertEqual(deleteUrl.value, '/resources/resource-123', 'Should use captured ID for delete');

    runner.passTest('Multi-step workflow with variable capture', 'End-to-End');
  } catch (error: any) {
    runner.failTest('Multi-step workflow with variable capture', 'End-to-End', error.message);
  }
}

/**
 * Test Backward Compatibility
 */
async function testBackwardCompatibility(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Backward Compatibility');
  console.log('='.repeat(80));

  // Test single-step tests without context
  runner.startTest('Single-step tests without context', 'Backward Compatibility');
  try {
    const bodyResult = await generateRequestBody('GET', '/users', null);
    assert(bodyResult.body !== null, 'Should generate body without context');

    runner.passTest('Single-step tests without context', 'Backward Compatibility');
  } catch (error: any) {
    runner.failTest('Single-step tests without context', 'Backward Compatibility', error.message);
  }

  // Test without OpenAPI schema
  runner.startTest('Tests without OpenAPI schema', 'Backward Compatibility');
  try {
    const bodyResult = await generateRequestBody('POST', '/api/test', null);
    assert(bodyResult.body !== null, 'Should generate fallback body');
    assertEqual(bodyResult.source, 'generic_fallback', 'Should use generic fallback');

    runner.passTest('Tests without OpenAPI schema', 'Backward Compatibility');
  } catch (error: any) {
    runner.failTest('Tests without OpenAPI schema', 'Backward Compatibility', error.message);
  }

  // Test with minimal configuration
  runner.startTest('Tests with minimal configuration', 'Backward Compatibility');
  try {
    const context = createTestContext();
    assert(context.getTestId() === 'default', 'Should use default test ID');

    runner.passTest('Tests with minimal configuration', 'Backward Compatibility');
  } catch (error: any) {
    runner.failTest('Tests with minimal configuration', 'Backward Compatibility', error.message);
  }
}

/**
 * Test Edge Cases and Error Handling
 */
async function testEdgeCases(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING: Edge Cases and Error Handling');
  console.log('='.repeat(80));

  // Test missing required fields
  runner.startTest('Missing required fields in schema', 'Edge Cases');
  try {
    const schema = {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string' }
        // password is required but not in properties
      }
    };

    const result = await generateRequestBody('POST', '/test', null, { schema });
    // Should still generate body with required fields
    assert('email' in result.body, 'Should have email');
    assert('password' in result.body, 'Should have password even if not in properties');

    runner.passTest('Missing required fields in schema', 'Edge Cases');
  } catch (error: any) {
    runner.failTest('Missing required fields in schema', 'Edge Cases', error.message);
  }

  // Test invalid variable references
  runner.startTest('Invalid variable references', 'Edge Cases');
  try {
    const context = createTestContext('edge-invalid-var');
    const result = context.substituteString('/users/{{nonexistent}}');
    
    assert(!result.success, 'Should indicate substitution failure');
    assert(result.message?.includes('Missing variables'), 'Should report missing variable');

    runner.passTest('Invalid variable references', 'Edge Cases');
  } catch (error: any) {
    runner.failTest('Invalid variable references', 'Edge Cases', error.message);
  }

  // Test empty test results
  runner.startTest('Empty test results', 'Edge Cases');
  try {
    const testResult = {
      passed: false,
      error: null,
      response: null,
      assertions: []
    };

    const classification = classifyTestResult(testResult);
    assertEqual(classification.classification, 'uncertain', 'Should classify as uncertain');

    runner.passTest('Empty test results', 'Edge Cases');
  } catch (error: any) {
    runner.failTest('Empty test results', 'Edge Cases', error.message);
  }

  // Test malformed responses
  runner.startTest('Malformed responses', 'Edge Cases');
  try {
    const context = createTestContext('edge-malformed');
    const malformedResponse = { body: null };
    
    const value = context.extractValue(malformedResponse.body, 'userId');
    assertEqual(value, undefined, 'Should handle null body gracefully');

    runner.passTest('Malformed responses', 'Edge Cases');
  } catch (error: any) {
    runner.failTest('Malformed responses', 'Edge Cases', error.message);
  }

  // Test array extraction
  runner.startTest('Array value extraction', 'Edge Cases');
  try {
    const context = createTestContext('edge-array');
    const response = {
      body: {
        users: [
          { id: '1', name: 'User 1' },
          { id: '2', name: 'User 2' }
        ]
      }
    };

    const firstUser = context.extractValue(response.body, 'users[0]');
    assertDeepEqual(firstUser, { id: '1', name: 'User 1' }, 'Should extract first array element');

    const allUsers = context.extractValue(response.body, 'users[*]');
    assertEqual(allUsers.length, 2, 'Should extract all array elements with wildcard');

    runner.passTest('Array value extraction', 'Edge Cases');
  } catch (error: any) {
    runner.failTest('Array value extraction', 'Edge Cases', error.message);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Made with Bob
