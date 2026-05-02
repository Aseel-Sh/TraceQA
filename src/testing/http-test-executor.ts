/**
 * HTTP Test Executor
 * 
 * Executes generated HTTP tests and produces detailed results with proper classification.
 * Handles retries, timeouts, assertions, and evidence collection.
 */

import {
  GeneratedHTTPTest,
  GeneratedHTTPTestSuite,
  HTTPTestStep,
  HTTPStepResult,
  HTTPTestResult,
  TraceQAConfig,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * HTTP test execution result with summary
 */
export interface HTTPTestExecutionResult {
  results: HTTPTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    uncertain: number;
    manual: number;
    skipped: number;
  };
  duration: number;
}

/**
 * HTTP client configuration
 */
interface HTTPClientConfig {
  timeout: number;
  headers: Record<string, string>;
  validateStatus: (status: number) => boolean;
}

/**
 * Status assertion result
 */
interface StatusAssertionResult {
  passed: boolean;
  message: string;
}

/**
 * Body assertion result
 */
interface BodyAssertionResult {
  passed: boolean;
  message: string;
  matchedPatterns: string[];
  missedPatterns: string[];
}

/**
 * Step skip decision
 */
interface StepSkipDecision {
  skip: boolean;
  reason: string | null;
}

// ============================================================================
// HTTP Client Configuration
// ============================================================================

/**
 * Create HTTP client configuration from TraceQA config
 * 
 * @param config - TraceQA configuration
 * @returns HTTP client configuration
 */
function createHTTPClient(config: TraceQAConfig): HTTPClientConfig {
  return {
    timeout: config.testTimeout || config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    // Accept all status codes - we'll validate them ourselves
    validateStatus: () => true,
  };
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Assert HTTP status code
 * 
 * Rules:
 * - Pass if actualStatus is in acceptableStatuses array
 * - Pass if actualStatus === expectedStatus (even if not in acceptableStatuses)
 * - Fail otherwise
 * 
 * @param actualStatus - Actual HTTP status code received
 * @param expectedStatus - Expected HTTP status code
 * @param acceptableStatuses - Array of acceptable status codes
 * @returns Assertion result with pass/fail and message
 */
function assertStatus(
  actualStatus: number,
  expectedStatus: number,
  acceptableStatuses: number[]
): StatusAssertionResult {
  // Check if actual status is in acceptable statuses
  if (acceptableStatuses.includes(actualStatus)) {
    return {
      passed: true,
      message: `Status ${actualStatus} is in acceptable statuses [${acceptableStatuses.join(', ')}]`,
    };
  }

  // Check if actual status matches expected status
  if (actualStatus === expectedStatus) {
    return {
      passed: true,
      message: `Status ${actualStatus} matches expected status ${expectedStatus}`,
    };
  }

  // Failed - status not acceptable
  return {
    passed: false,
    message: `Status ${actualStatus} not in acceptable statuses [${acceptableStatuses.join(', ')}] and does not match expected ${expectedStatus}`,
  };
}

/**
 * Assert response body contains expected patterns
 * 
 * @param responseBody - Response body (any type)
 * @param expectedPatterns - Array of patterns that should exist in response
 * @returns Assertion result with matched/missed patterns
 */
function assertBodyContains(
  responseBody: any,
  expectedPatterns: string[]
): BodyAssertionResult {
  // Convert response body to string for pattern matching
  let bodyString: string;
  if (typeof responseBody === 'string') {
    bodyString = responseBody;
  } else if (responseBody === null || responseBody === undefined) {
    bodyString = '';
  } else {
    try {
      bodyString = JSON.stringify(responseBody);
    } catch {
      bodyString = String(responseBody);
    }
  }

  const matchedPatterns: string[] = [];
  const missedPatterns: string[] = [];

  // Check each pattern
  for (const pattern of expectedPatterns) {
    if (bodyString.includes(pattern)) {
      matchedPatterns.push(pattern);
    } else {
      missedPatterns.push(pattern);
    }
  }

  const passed = missedPatterns.length === 0;
  const message = passed
    ? `All ${matchedPatterns.length} expected patterns found in response body`
    : `Missing ${missedPatterns.length} of ${expectedPatterns.length} expected patterns: ${missedPatterns.join(', ')}`;

  return {
    passed,
    message,
    matchedPatterns,
    missedPatterns,
  };
}

// ============================================================================
// Step Execution
// ============================================================================

/**
 * Execute a single HTTP step with retry logic
 * 
 * @param step - HTTP test step to execute
 * @param config - TraceQA configuration
 * @param retryCount - Current retry attempt (0 = first attempt)
 * @returns Step execution result
 */
async function executeWithRetry(
  step: HTTPTestStep,
  config: TraceQAConfig,
  retryCount: number
): Promise<HTTPStepResult> {
  const maxRetries = config.maxRetries || config.retries || 2;
  const clientConfig = createHTTPClient(config);

  try {
    const startTime = Date.now();

    // Prepare request options
    const requestOptions: RequestInit = {
      method: step.method,
      headers: {
        ...clientConfig.headers,
        ...step.headers,
      },
      signal: AbortSignal.timeout(clientConfig.timeout),
    };

    // Add body for non-GET requests
    if (step.body && step.method !== 'GET' && step.method !== 'HEAD') {
      requestOptions.body = JSON.stringify(step.body);
    }

    // Make HTTP request
    const response = await fetch(step.url, requestOptions);
    const duration = Date.now() - startTime;

    // Parse response body
    let responseBody: any;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
    } catch {
      // If parsing fails, get raw text
      responseBody = await response.text();
    }

    // Assert status
    const statusAssertion = assertStatus(
      response.status,
      step.expectedStatus,
      step.acceptableStatuses
    );

    // Assert body contains (if specified)
    let bodyAssertion: BodyAssertionResult | null = null;
    if (step.expectedBodyContains && step.expectedBodyContains.length > 0) {
      bodyAssertion = assertBodyContains(responseBody, step.expectedBodyContains);
    }

    // Determine if step passed
    const passed = statusAssertion.passed && (bodyAssertion ? bodyAssertion.passed : true);

    // Build error message if failed
    let errorMessage: string | null = null;
    if (!passed) {
      const errors: string[] = [];
      if (!statusAssertion.passed) {
        errors.push(statusAssertion.message);
      }
      if (bodyAssertion && !bodyAssertion.passed) {
        errors.push(bodyAssertion.message);
      }
      errorMessage = errors.join('; ');
    }

    return {
      stepId: step.stepId,
      description: step.description,
      method: step.method,
      url: step.url,
      requestBody: step.body,
      expectedStatus: step.expectedStatus,
      acceptableStatuses: step.acceptableStatuses,
      actualStatus: response.status,
      responseBody,
      passed,
      duration,
      error: errorMessage,
    };
  } catch (error) {
    const duration = Date.now();

    // Check if this is a network/timeout error that should be retried
    const isNetworkError = error instanceof TypeError || 
                          (error as any).name === 'AbortError' ||
                          (error as any).code === 'ECONNREFUSED' ||
                          (error as any).code === 'ETIMEDOUT';

    // Retry logic
    if (isNetworkError && retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, retryCount) * 1000;
      logger.debug(`Retrying step ${step.stepId} after ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return executeWithRetry(step, config, retryCount + 1);
    }

    // Failed - return error result
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      stepId: step.stepId,
      description: step.description,
      method: step.method,
      url: step.url,
      requestBody: step.body,
      expectedStatus: step.expectedStatus,
      acceptableStatuses: step.acceptableStatuses,
      actualStatus: 0,
      responseBody: null,
      passed: false,
      duration,
      error: `Network error: ${errorMessage}`,
    };
  }
}

/**
 * Execute a single HTTP test step
 * 
 * @param step - HTTP test step to execute
 * @param config - TraceQA configuration
 * @param previousStepResults - Results from previous steps
 * @returns Step execution result
 */
async function executeHTTPStep(
  step: HTTPTestStep,
  config: TraceQAConfig,
  previousStepResults: HTTPStepResult[]
): Promise<HTTPStepResult> {
  logger.debug(`Executing step: ${step.description}`);
  
  // Execute with retry logic (starting at retry count 0)
  return executeWithRetry(step, config, 0);
}

// ============================================================================
// Step Skip Logic
// ============================================================================

/**
 * Determine if a step should be skipped based on previous step results
 * 
 * Rules:
 * - If setup step failed, skip dependent steps
 * - If test requires auth and auth step failed, skip remaining steps
 * 
 * @param step - Current step to check
 * @param previousStepResults - Results from previous steps
 * @param test - The test containing this step
 * @returns Skip decision with reason
 */
function shouldSkipStep(
  step: HTTPTestStep,
  previousStepResults: HTTPStepResult[],
  test: GeneratedHTTPTest
): StepSkipDecision {
  // If no previous steps, don't skip
  if (previousStepResults.length === 0) {
    return { skip: false, reason: null };
  }

  // Check if this is the first step (setup step)
  const isFirstStep = test.steps[0]?.stepId === step.stepId;
  if (isFirstStep) {
    return { skip: false, reason: null };
  }

  // Check if first step (setup) failed
  const firstStepResult = previousStepResults[0];
  if (firstStepResult && !firstStepResult.passed) {
    return {
      skip: true,
      reason: `Setup step failed: ${firstStepResult.error || 'Unknown error'}`,
    };
  }

  // Check for auth-related failures
  const hasAuthFailure = previousStepResults.some(result => {
    const isAuthStep = result.description.toLowerCase().includes('auth') ||
                      result.description.toLowerCase().includes('login') ||
                      result.url.toLowerCase().includes('auth') ||
                      result.url.toLowerCase().includes('login');
    return isAuthStep && !result.passed;
  });

  if (hasAuthFailure) {
    return {
      skip: true,
      reason: 'Authentication step failed',
    };
  }

  return { skip: false, reason: null };
}

// ============================================================================
// Result Classification
// ============================================================================

/**
 * Classify test result based on step results
 * 
 * Classification rules:
 * - passed: All steps passed, app behaved as expected
 * - application_failure: App returned status/body outside acceptable expectations
 * - traceqa_generation_issue: Test had invalid URL, method, or body (generation problem)
 * - uncertain: Test was marked uncertain, not executed
 * - manual: Test was marked manual, not executed
 * 
 * Note: Do not classify app rejection of invalid input as application_failure.
 * If test expects 400 for invalid email and gets 400, that's passed, not failed.
 * 
 * @param test - The test that was executed
 * @param stepResults - Results from all steps
 * @returns Classification string
 */
function classifyTestResult(
  test: GeneratedHTTPTest,
  stepResults: HTTPStepResult[]
): 'application_failure' | 'traceqa_generation_issue' | 'uncertain' | 'manual' | 'passed' {
  // Check test status first
  if (test.status === 'uncertain') {
    return 'uncertain';
  }
  if (test.status === 'manual') {
    return 'manual';
  }

  // If all steps passed, it's passed
  const allPassed = stepResults.every(result => result.passed);
  if (allPassed) {
    return 'passed';
  }

  // Check for generation issues (invalid URLs, network errors indicating bad test data)
  const hasGenerationIssue = stepResults.some(result => {
    if (!result.error) return false;

    const error = result.error.toLowerCase();
    
    // Invalid URL or malformed request indicates generation issue
    if (error.includes('invalid url') ||
        error.includes('malformed') ||
        error.includes('typeerror') ||
        error.includes('failed to parse')) {
      return true;
    }

    // Connection refused to localhost without proper setup
    if (error.includes('econnrefused') && result.url.includes('localhost')) {
      return true;
    }

    return false;
  });

  if (hasGenerationIssue) {
    return 'traceqa_generation_issue';
  }

  // Otherwise, it's an application failure
  // The app returned a response, but it didn't match expectations
  return 'application_failure';
}

// ============================================================================
// Evidence Collection
// ============================================================================

/**
 * Collect evidence from test execution
 * 
 * @param test - The test that was executed
 * @param stepResults - Results from all steps
 * @returns Array of evidence strings
 */
function collectEvidence(
  test: GeneratedHTTPTest,
  stepResults: HTTPStepResult[]
): string[] {
  const evidence: string[] = [];

  // Add test metadata
  evidence.push(`Test: ${test.title}`);
  evidence.push(`Test ID: ${test.id}`);
  evidence.push(`QA Task ID: ${test.qaTaskId}`);
  evidence.push(`Acceptance Criterion ID: ${test.acceptanceCriterionId}`);
  evidence.push('');

  // Add step results
  stepResults.forEach((result, index) => {
    evidence.push(`Step ${index + 1}: ${result.description}`);
    evidence.push(`  Method: ${result.method}`);
    evidence.push(`  URL: ${result.url}`);
    
    if (result.requestBody) {
      evidence.push(`  Request Body: ${JSON.stringify(result.requestBody, null, 2)}`);
    }
    
    evidence.push(`  Expected Status: ${result.expectedStatus}`);
    evidence.push(`  Acceptable Statuses: [${result.acceptableStatuses.join(', ')}]`);
    evidence.push(`  Actual Status: ${result.actualStatus}`);
    
    if (result.responseBody) {
      const bodyStr = typeof result.responseBody === 'string' 
        ? result.responseBody 
        : JSON.stringify(result.responseBody, null, 2);
      evidence.push(`  Response Body: ${bodyStr.substring(0, 500)}${bodyStr.length > 500 ? '...' : ''}`);
    }
    
    evidence.push(`  Duration: ${result.duration}ms`);
    evidence.push(`  Passed: ${result.passed}`);
    
    if (result.error) {
      evidence.push(`  Error: ${result.error}`);
    }
    
    evidence.push('');
  });

  // Add summary
  const totalDuration = stepResults.reduce((sum, r) => sum + r.duration, 0);
  const passedSteps = stepResults.filter(r => r.passed).length;
  evidence.push(`Total Steps: ${stepResults.length}`);
  evidence.push(`Passed Steps: ${passedSteps}`);
  evidence.push(`Failed Steps: ${stepResults.length - passedSteps}`);
  evidence.push(`Total Duration: ${totalDuration}ms`);

  return evidence;
}

// ============================================================================
// Test Execution
// ============================================================================

/**
 * Execute a single HTTP test
 * 
 * @param test - HTTP test to execute
 * @param config - TraceQA configuration
 * @returns Test execution result
 */
export async function executeHTTPTest(
  test: GeneratedHTTPTest,
  config: TraceQAConfig
): Promise<HTTPTestResult> {
  const startTime = Date.now();
  const stepResults: HTTPStepResult[] = [];

  logger.info(`Executing test: ${test.title}`);

  // Handle uncertain tests
  if (test.status === 'uncertain') {
    const duration = Date.now() - startTime;
    return {
      testId: test.id,
      acceptanceCriterionId: test.acceptanceCriterionId,
      qaTaskId: test.qaTaskId,
      title: test.title,
      status: 'uncertain',
      executor: 'uncertain',
      stepResults: [],
      evidence: [
        `Test marked as uncertain: ${test.uncertainReason || 'No reason provided'}`,
      ],
      classification: 'uncertain',
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle manual tests
  if (test.status === 'manual') {
    const duration = Date.now() - startTime;
    return {
      testId: test.id,
      acceptanceCriterionId: test.acceptanceCriterionId,
      qaTaskId: test.qaTaskId,
      title: test.title,
      status: 'manual',
      executor: 'manual',
      stepResults: [],
      evidence: [
        'Test requires manual execution',
      ],
      classification: 'manual',
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  // Execute each step
  for (const step of test.steps) {
    // Check if step should be skipped
    const skipDecision = shouldSkipStep(step, stepResults, test);
    
    if (skipDecision.skip) {
      logger.warn(`Skipping step: ${step.description}`, skipDecision.reason || undefined);
      
      // Add skipped step result
      stepResults.push({
        stepId: step.stepId,
        description: step.description,
        method: step.method,
        url: step.url,
        requestBody: step.body,
        expectedStatus: step.expectedStatus,
        acceptableStatuses: step.acceptableStatuses,
        actualStatus: 0,
        responseBody: null,
        passed: false,
        duration: 0,
        error: `Skipped: ${skipDecision.reason}`,
      });
      
      continue;
    }

    // Execute step
    const stepResult = await executeHTTPStep(step, config, stepResults);
    stepResults.push(stepResult);

    // Log step result
    if (stepResult.passed) {
      logger.success(`Step passed: ${step.description}`);
    } else {
      logger.error(`Step failed: ${step.description}`, new Error(stepResult.error || 'Unknown error'));
    }
  }

  // Calculate duration
  const duration = Date.now() - startTime;

  // Classify result
  const classification = classifyTestResult(test, stepResults);

  // Determine status
  const allPassed = stepResults.every(r => r.passed);
  const status: HTTPTestResult['status'] = allPassed ? 'passed' : 'failed';

  // Collect evidence
  const evidence = collectEvidence(test, stepResults);

  return {
    testId: test.id,
    acceptanceCriterionId: test.acceptanceCriterionId,
    qaTaskId: test.qaTaskId,
    title: test.title,
    status,
    executor: 'http',
    stepResults,
    evidence,
    classification,
    duration,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Summary Generation
// ============================================================================

/**
 * Generate execution summary from test results
 * 
 * @param results - Array of test results
 * @returns Summary with counts
 */
function generateExecutionSummary(
  results: HTTPTestResult[]
): {
  total: number;
  passed: number;
  failed: number;
  uncertain: number;
  manual: number;
  skipped: number;
} {
  return {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    uncertain: results.filter(r => r.status === 'uncertain').length,
    manual: results.filter(r => r.status === 'manual').length,
    skipped: results.filter(r => r.status === 'skipped').length,
  };
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute all HTTP tests in a test suite
 * 
 * @param testSuite - Generated HTTP test suite
 * @param config - TraceQA configuration
 * @returns Execution result with all test results and summary
 */
export async function executeHTTPTests(
  testSuite: GeneratedHTTPTestSuite,
  config: TraceQAConfig
): Promise<HTTPTestExecutionResult> {
  const startTime = Date.now();
  
  logger.section('Executing HTTP Tests');
  logger.info(`Total tests: ${testSuite.tests.length}`);
  logger.info(`Ready tests: ${testSuite.summary.readyTests}`);
  logger.info(`Uncertain tests: ${testSuite.summary.uncertainTests}`);
  logger.info(`Manual tests: ${testSuite.summary.manualTests}`);
  logger.newLine();

  const results: HTTPTestResult[] = [];

  // Execute each test
  for (let i = 0; i < testSuite.tests.length; i++) {
    const test = testSuite.tests[i];
    
    logger.info(`[${i + 1}/${testSuite.tests.length}] ${test.title}`);
    
    try {
      const result = await executeHTTPTest(test, config);
      results.push(result);
      
      // Log result
      if (result.status === 'passed') {
        logger.success(`✓ Test passed (${result.duration}ms)`);
      } else if (result.status === 'uncertain') {
        logger.warn(`⚠ Test uncertain: ${test.uncertainReason || 'No reason'}`);
      } else if (result.status === 'manual') {
        logger.info(`ℹ Test requires manual execution`);
      } else {
        logger.error(`✗ Test failed (${result.duration}ms)`, new Error(result.classification));
      }
    } catch (error) {
      logger.error(`Failed to execute test: ${test.title}`, error);
      
      // Add error result
      results.push({
        testId: test.id,
        acceptanceCriterionId: test.acceptanceCriterionId,
        qaTaskId: test.qaTaskId,
        title: test.title,
        status: 'failed',
        executor: 'http',
        stepResults: [],
        evidence: [
          `Test execution error: ${error instanceof Error ? error.message : String(error)}`,
        ],
        classification: 'traceqa_generation_issue',
        duration: 0,
        timestamp: new Date().toISOString(),
      });
    }
    
    logger.newLine();
  }

  const duration = Date.now() - startTime;
  const summary = generateExecutionSummary(results);

  // Log summary
  logger.section('Execution Summary');
  logger.keyValue('Total Tests', String(summary.total));
  logger.keyValue('Passed', String(summary.passed), 1);
  logger.keyValue('Failed', String(summary.failed), 1);
  logger.keyValue('Uncertain', String(summary.uncertain), 1);
  logger.keyValue('Manual', String(summary.manual), 1);
  logger.keyValue('Skipped', String(summary.skipped), 1);
  logger.keyValue('Duration', logger.formatDuration(duration));
  logger.newLine();

  return {
    results,
    summary,
    duration,
  };
}

// Made with Bob
