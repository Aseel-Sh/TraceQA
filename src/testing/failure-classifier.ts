/**
 * Failure Classifier
 * Provides intelligent classification of test failures to distinguish between
 * application bugs, test generation issues, infrastructure problems, and uncertain results
 */

import {
  TestFailureClassification,
  ClassificationResult,
  APITestResult,
  APIResponse
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Schema validation result interface
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Network error codes that indicate infrastructure failures
 */
const NETWORK_ERROR_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ECONNABORTED',
  'EPIPE',
  'EAI_AGAIN'
];

/**
 * HTTP status codes that typically indicate application failures
 */
const APPLICATION_ERROR_STATUSES = [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511];

/**
 * HTTP status codes that are typically expected in negative tests
 */
const EXPECTED_ERROR_STATUSES = [400, 401, 403, 404, 405, 406, 409, 410, 422, 429];

/**
 * Validation error patterns that indicate bad generated data
 * These patterns are commonly found in API validation error responses
 */
const VALIDATION_ERROR_PATTERNS = [
  'required field',
  'missing required',
  'invalid enum',
  'must be one of',
  'validation error',
  'validation failed',
  'invalid value for',
  'field is required',
  'not a valid',
  'does not match pattern',
  'is required',
  'not allowed',
  'invalid type',
  'expected type',
  'must match',
  'should be',
  'cannot be empty',
  'must not be empty',
  'invalid format',
  'bad request'
];

/**
 * Detect if a test failure is due to TraceQA generation issues
 * Checks schema validation results and response validation error patterns
 *
 * Integration with schema validation:
 * - Import validateBodyAgainstSchema from '../validation/body-generator.js'
 * - Before making request, validate the generated body:
 *   const schemaValidation = validateBodyAgainstSchema(requestBody, route.requestSchema, openApiSpec);
 * - Pass schemaValidation to classifyTestResult in the context parameter
 *
 * @param response - API response to check for validation errors
 * @param schemaValidation - Optional schema validation result from body-generator
 * @param requestBody - Optional request body that was sent
 * @returns Object with isGenerationIssue flag and evidence array
 */
export function detectGenerationIssue(
  response?: APIResponse,
  schemaValidation?: SchemaValidationResult,
  requestBody?: unknown
): { isGenerationIssue: boolean; evidence: string[] } {
  const evidence: string[] = [];

  // Check if schema validation failed before execution
  if (schemaValidation && !schemaValidation.valid) {
    evidence.push('Schema validation failed before request execution');
    schemaValidation.errors.forEach(error => {
      evidence.push(`  - ${error}`);
    });
    return { isGenerationIssue: true, evidence };
  }

  // Check response for validation error indicators
  if (response && (response.status === 400 || response.status === 422)) {
    const hasEmptyRequestBody = requestBody === null || requestBody === undefined || (typeof requestBody === 'object' && !Array.isArray(requestBody) && Object.keys(requestBody).length === 0);

    const responseText = JSON.stringify(response.body || response.statusText || '').toLowerCase();
    
    // Check for validation error patterns
    const foundPatterns: string[] = [];
    for (const pattern of VALIDATION_ERROR_PATTERNS) {
      if (responseText.includes(pattern)) {
        foundPatterns.push(pattern);
      }
    }

    if (foundPatterns.length > 0) {
      evidence.push(`Response contains validation error patterns: ${foundPatterns.join(', ')}`);
      
      // Extract specific validation messages from response body
      if (response.body && typeof response.body === 'object') {
        const bodyStr = JSON.stringify(response.body, null, 2);
        evidence.push('Response body validation errors:');
        evidence.push(bodyStr.substring(0, 500)); // First 500 chars
      }
      
      return { isGenerationIssue: true, evidence };
    }

    if (hasEmptyRequestBody) {
      evidence.push('Request body was missing or empty when client error was returned');
      return { isGenerationIssue: true, evidence };
    }
  }

  return { isGenerationIssue: false, evidence: [] };
}

/**
 * Classify a test result based on error, response, and context
 * Enhanced to detect TraceQA generation issues using schema validation
 */
export function classifyTestResult(
  testResult: APITestResult,
  context?: {
    isNegativeTest?: boolean;
    expectedStatuses?: number[];
    testDescription?: string;
    schemaValidation?: SchemaValidationResult;
    discoveredRoutes?: Array<{ method: string; path: string }>;
  }
): ClassificationResult {
  const { error, response, passed, assertions, request } = testResult;

  // If test passed, return PASSED classification
  if (passed) {
    return {
      classification: TestFailureClassification.PASSED,
      reason: 'All assertions passed successfully',
      confidence: 1.0,
      isExpectedFailure: false
    };
  }

  // Check for missing URL (TraceQA generation issue)
  if (error && error.includes('no endpoint or base URL')) {
    return {
      classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
      reason: 'No URL provided for test - route matching or URL generation failed',
      confidence: 1.0,
      metadata: { errorType: 'missing_url' }
    };
  }

  // Check for network errors (infrastructure failure)
  if (error && isNetworkError(error)) {
    const errorCode = extractErrorCode(error);
    return {
      classification: TestFailureClassification.INFRASTRUCTURE_FAILURE,
      reason: `Network error: ${errorCode || 'connection failed'} - application may not be running or network is unavailable`,
      confidence: 0.95,
      metadata: { errorCode, errorType: 'network' }
    };
  }

  // Check for invalid configuration (TraceQA generation issue)
  if (error && isConfigurationError(error)) {
    return {
      classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
      reason: 'Invalid test configuration - test generation produced invalid parameters',
      confidence: 0.9,
      metadata: { errorType: 'configuration' }
    };
  }

  // Check for generation issues using schema validation and response patterns
  const generationCheck = detectGenerationIssue(
    response,
    context?.schemaValidation,
    request?.body
  );

  if (generationCheck.isGenerationIssue) {
    return {
      classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
      reason: 'Test failed due to invalid generated data - validation errors detected',
      confidence: 0.95,
      metadata: {
        errorType: 'validation',
        evidence: generationCheck.evidence
      }
    };
  }

  // If we have a response, classify based on status code
  if (response) {
    return classifyByResponse(response, context);
  }

  // If we have assertions but no response, it's uncertain
  if (assertions && assertions.length > 0) {
    return {
      classification: TestFailureClassification.UNCERTAIN,
      reason: 'Test failed with assertions but no response received',
      confidence: 0.5,
      metadata: { assertionCount: assertions.length }
    };
  }

  // No assertions defined - uncertain
  if (!assertions || assertions.length === 0) {
    return {
      classification: TestFailureClassification.UNCERTAIN,
      reason: 'No assertions defined - cannot determine success criteria',
      confidence: 0.7,
      metadata: { errorType: 'no_assertions' }
    };
  }

  // Default to uncertain for unknown cases
  return {
    classification: TestFailureClassification.UNCERTAIN,
    reason: 'Unable to determine failure cause - requires manual investigation',
    confidence: 0.3,
    metadata: { error }
  };
}

/**
 * Classify based on HTTP response
 * Enhanced with better generation issue detection
 */
function classifyByResponse(
  response: APIResponse,
  context?: {
    isNegativeTest?: boolean;
    expectedStatuses?: number[];
    testDescription?: string;
    schemaValidation?: SchemaValidationResult;
    discoveredRoutes?: Array<{ method: string; path: string }>;
  }
): ClassificationResult {
  const { status } = response;
  const isNegativeTest = context?.isNegativeTest || false;
  const expectedStatuses = context?.expectedStatuses || [];

  // Check if status is in expected statuses
  if (expectedStatuses.length > 0 && expectedStatuses.includes(status)) {
    return {
      classification: TestFailureClassification.PASSED,
      reason: `Received expected status ${status}`,
      confidence: 1.0,
      isExpectedFailure: false
    };
  }

  // 5xx errors typically indicate application failures
  if (APPLICATION_ERROR_STATUSES.includes(status)) {
    // Unless it's expected in a negative test
    if (isNegativeTest && expectedStatuses.includes(status)) {
      return {
        classification: TestFailureClassification.PASSED,
        reason: `Received expected ${status} error for negative test`,
        confidence: 1.0,
        isExpectedFailure: true
      };
    }

    return {
      classification: TestFailureClassification.APPLICATION_FAILURE,
      reason: `Server returned ${status} error - indicates application bug or misconfiguration`,
      confidence: 0.9,
      metadata: { statusCode: status, statusType: '5xx' }
    };
  }

  // 4xx errors - could be expected or unexpected
  if (status >= 400 && status < 500) {
    // Check for validation errors that indicate generation issues (400/422)
    if (status === 400 || status === 422) {
      const generationCheck = detectGenerationIssue(response, context?.schemaValidation);
      
      if (generationCheck.isGenerationIssue) {
        return {
          classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
          reason: `Validation failure (${status}) indicates generated request data is invalid`,
          confidence: 0.95,
          metadata: {
            statusCode: status,
            evidence: generationCheck.evidence
          }
        };
      }
    }

    // Check if this is an expected error for a negative test
    if (isNegativeTest || EXPECTED_ERROR_STATUSES.includes(status)) {
      // If we expected this status, it might be a pass
      if (expectedStatuses.includes(status)) {
        return {
          classification: TestFailureClassification.PASSED,
          reason: `Received expected ${status} error`,
          confidence: 1.0,
          isExpectedFailure: true
        };
      }

      // If it's a negative test but wrong error code
      if (isNegativeTest) {
        return {
          classification: TestFailureClassification.UNCERTAIN,
          reason: `Negative test received ${status} but expected different error code`,
          confidence: 0.6,
          metadata: { statusCode: status, statusType: '4xx' }
        };
      }
    }

    // 404 might indicate route matching issue - check against discovered routes
    if (status === 404) {
      // If we have discovered routes, check if this is likely a route mismatch
      const confidence = context?.discoveredRoutes && context.discoveredRoutes.length > 0 ? 0.85 : 0.7;
      
      return {
        classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
        reason: 'Received 404 Not Found - route matching may have failed or URL is incorrect',
        confidence,
        metadata: {
          statusCode: 404,
          possibleCause: 'route_mismatch',
          hasDiscoveredRoutes: !!context?.discoveredRoutes
        }
      };
    }

    // For other 4xx errors, be conservative - classify as UNCERTAIN unless we have clear evidence
    // This prevents false positives where valid application validation is misclassified
    return {
      classification: TestFailureClassification.UNCERTAIN,
      reason: `Received ${status} client error - could be application validation or test data issue`,
      confidence: 0.5,
      metadata: { statusCode: status, statusType: '4xx' }
    };
  }

  // 2xx or 3xx but assertions failed
  if (status >= 200 && status < 400) {
    return {
      classification: TestFailureClassification.UNCERTAIN,
      reason: `Request succeeded with ${status} but assertions failed - may be incorrect expectations or response format changed`,
      confidence: 0.6,
      metadata: { statusCode: status, statusType: 'success' }
    };
  }

  // Unknown status code
  return {
    classification: TestFailureClassification.UNCERTAIN,
    reason: `Received unusual status code ${status}`,
    confidence: 0.4,
    metadata: { statusCode: status }
  };
}

/**
 * Check if error message indicates a network error
 */
export function isNetworkError(error: string): boolean {
  const errorUpper = error.toUpperCase();
  
  // Check for known error codes
  if (NETWORK_ERROR_CODES.some(code => errorUpper.includes(code))) {
    return true;
  }

  // Check for common network error phrases
  const networkPhrases = [
    'NETWORK',
    'CONNECTION',
    'TIMEOUT',
    'DNS',
    'SOCKET',
    'REFUSED',
    'UNREACHABLE',
    'ABORTED'
  ];

  return networkPhrases.some(phrase => errorUpper.includes(phrase));
}

/**
 * Check if error indicates a configuration issue
 */
export function isConfigurationError(error: string): boolean {
  const errorLower = error.toLowerCase();
  
  const configPhrases = [
    'invalid',
    'missing',
    'configuration',
    'malformed',
    'parse error',
    'invalid json',
    'invalid body',
    'invalid header'
  ];

  return configPhrases.some(phrase => errorLower.includes(phrase));
}

/**
 * Extract error code from error message
 */
export function extractErrorCode(error: string): string | null {
  for (const code of NETWORK_ERROR_CODES) {
    if (error.toUpperCase().includes(code)) {
      return code;
    }
  }
  return null;
}

/**
 * Determine if a test is likely a negative test based on description
 */
export function isLikelyNegativeTest(description?: string): boolean {
  if (!description) {
    return false;
  }

  const negativePhrases = [
    'invalid',
    'error',
    'fail',
    'reject',
    'unauthorized',
    'forbidden',
    'not found',
    'bad request',
    'should not',
    'must not',
    'cannot',
    'negative'
  ];

  const descLower = description.toLowerCase();
  return negativePhrases.some(phrase => descLower.includes(phrase));
}

/**
 * Create a classification result for a specific scenario
 */
export function createClassification(
  classification: TestFailureClassification,
  reason: string,
  confidence: number = 0.8,
  metadata?: Record<string, any>
): ClassificationResult {
  return {
    classification,
    reason,
    confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0 and 1
    metadata
  };
}

/**
 * Classify assertion failures
 */
export function classifyAssertionFailure(
  assertionType: string,
  expected: any,
  actual: any,
  response?: APIResponse
): ClassificationResult {
  // Status code mismatch
  if (assertionType === 'STATUS_CODE') {
    if (response && APPLICATION_ERROR_STATUSES.includes(response.status)) {
      return createClassification(
        TestFailureClassification.APPLICATION_FAILURE,
        `Expected status ${expected} but got ${actual} - server error indicates application bug`,
        0.85,
        { assertionType, expected, actual }
      );
    }

    if (response && response.status === 404) {
      return createClassification(
        TestFailureClassification.TRACEQA_GENERATION_ISSUE,
        `Expected status ${expected} but got 404 - route matching may have failed`,
        0.75,
        { assertionType, expected, actual }
      );
    }

    return createClassification(
      TestFailureClassification.UNCERTAIN,
      `Expected status ${expected} but got ${actual}`,
      0.6,
      { assertionType, expected, actual }
    );
  }

  // Body/content assertions
  if (assertionType.includes('BODY') || assertionType.includes('JSON')) {
    return createClassification(
      TestFailureClassification.UNCERTAIN,
      `Response content does not match expectations - could be application change or incorrect test expectations`,
      0.5,
      { assertionType, expected, actual }
    );
  }

  // Default uncertain classification
  return createClassification(
    TestFailureClassification.UNCERTAIN,
    `Assertion failed: ${assertionType}`,
    0.5,
    { assertionType, expected, actual }
  );
}

/**
 * Merge multiple classification results (for multi-step tests)
 */
export function mergeClassifications(
  classifications: ClassificationResult[]
): ClassificationResult {
  if (classifications.length === 0) {
    return createClassification(
      TestFailureClassification.UNCERTAIN,
      'No classifications to merge',
      0.0
    );
  }

  if (classifications.length === 1) {
    return classifications[0];
  }

  // Count classifications by type
  const counts = new Map<TestFailureClassification, number>();
  let totalConfidence = 0;

  for (const result of classifications) {
    counts.set(result.classification, (counts.get(result.classification) || 0) + 1);
    totalConfidence += result.confidence;
  }

  // Find most common classification
  let maxCount = 0;
  let mostCommon = TestFailureClassification.UNCERTAIN;

  for (const [classification, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = classification;
    }
  }

  const avgConfidence = totalConfidence / classifications.length;
  const reasons = classifications.map(c => c.reason).join('; ');

  return createClassification(
    mostCommon,
    `Multiple failures: ${reasons}`,
    avgConfidence * 0.8, // Reduce confidence for merged results
    { mergedCount: classifications.length, classifications }
  );
}

/**
 * Log classification result
 */
export function logClassification(
  testName: string,
  classification: ClassificationResult
): void {
  const emoji = getClassificationEmoji(classification.classification);
  const confidencePercent = (classification.confidence * 100).toFixed(0);

  logger.info(
    `${emoji} Test "${testName}" classified as ${classification.classification} (${confidencePercent}% confidence)`
  );
  logger.debug(`Classification reason: ${classification.reason}`);

  if (classification.metadata) {
    logger.debug('Classification metadata:', classification.metadata);
  }
}

/**
 * Get emoji for classification type
 */
function getClassificationEmoji(classification: TestFailureClassification): string {
  switch (classification) {
    case TestFailureClassification.PASSED:
      return '✅';
    case TestFailureClassification.APPLICATION_FAILURE:
      return '🐛';
    case TestFailureClassification.TRACEQA_GENERATION_ISSUE:
      return '🔧';
    case TestFailureClassification.INFRASTRUCTURE_FAILURE:
      return '🌐';
    case TestFailureClassification.UNCERTAIN:
      return '❓';
    case TestFailureClassification.MANUAL:
      return '👤';
    case TestFailureClassification.SKIPPED:
      return '⏭️';
    default:
      return '❔';
  }
}

// Made with Bob
