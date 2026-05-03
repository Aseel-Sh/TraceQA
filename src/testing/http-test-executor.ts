/**
 * HTTP Test Executor
 *
 * Executes generated HTTP tests and produces detailed results with proper classification.
 * Handles retries, timeouts, assertions, and evidence collection.
 * Supports variable capture and substitution for multi-step test sequences.
 */

import {
  GeneratedHTTPTest,
  GeneratedHTTPTestSuite,
  HTTPTestStep,
  HTTPStepResult,
  HTTPTestResult,
  TraceQAConfig,
  TestFailureClassification,
  VariableExtraction,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Reachability check result
 */
export interface ReachabilityCheckResult {
  reachable: boolean;
  reason?: string;
}

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
  /** Optional run-level failure (e.g., pre-run reachability/infrastructure failure) */
  runFailure?: HTTPTestResult | null;
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
 * Assert response body contains expected patterns (advisory by default)
 *
 * @param responseBody - Response body (any type)
 * @param expectedPatterns - Array of patterns that should exist in response
 * @param isCritical - Whether this assertion is critical (default: false for advisory)
 * @returns Assertion result with matched/missed patterns
 */
function assertBodyContains(
  responseBody: any,
  expectedPatterns: string[],
  isCritical: boolean = false
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
  const prefix = isCritical ? '' : '[ADVISORY] ';
  const message = passed
    ? `${prefix}All ${matchedPatterns.length} expected patterns found in response body`
    : `${prefix}Missing ${missedPatterns.length} of ${expectedPatterns.length} expected patterns: ${missedPatterns.join(', ')}`;

  return {
    passed,
    message,
    matchedPatterns,
    missedPatterns,
  };
}

/**
 * Validate response body against schema (structure validation, not exact values)
 *
 * @param responseBody - Response body to validate
 * @param schema - Expected schema (OpenAPI response schema)
 * @returns Validation result with errors if any
 */
function validateBodySchema(
  responseBody: any,
  schema: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!schema) {
    return { valid: true, errors: [] };
  }

  // Handle OpenAPI response schema format (e.g., { "200": { "content": { "application/json": { "schema": {...} } } } })
  let actualSchema = schema;
  if (typeof schema === 'object' && !Array.isArray(schema)) {
    // Extract schema from OpenAPI response format
    const statusKeys = Object.keys(schema).filter(k => /^\d{3}$/.test(k));
    if (statusKeys.length > 0) {
      const firstStatus = schema[statusKeys[0]];
      if (firstStatus?.content?.['application/json']?.schema) {
        actualSchema = firstStatus.content['application/json'].schema;
      } else if (firstStatus?.schema) {
        actualSchema = firstStatus.schema;
      }
    }
  }

  // Validate required fields
  if (actualSchema.required && Array.isArray(actualSchema.required)) {
    for (const field of actualSchema.required) {
      if (responseBody === null || responseBody === undefined || !(field in responseBody)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate field types (structure, not exact values)
  if (actualSchema.properties && typeof responseBody === 'object' && responseBody !== null) {
    for (const [fieldName, fieldSchema] of Object.entries(actualSchema.properties)) {
      if (fieldName in responseBody) {
        const fieldValue = responseBody[fieldName];
        const expectedType = (fieldSchema as any).type;
        
        if (expectedType) {
          const actualType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue;
          const typeMatches =
            (expectedType === 'integer' && typeof fieldValue === 'number') ||
            (expectedType === 'number' && typeof fieldValue === 'number') ||
            (expectedType === actualType);
          
          if (!typeMatches && fieldValue !== null) {
            errors.push(`Field '${fieldName}' has wrong type: expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Variable Capture and Resolution
// ============================================================================

/**
 * Extract value from response using JSON path notation
 * Supports simple paths like "$.id", "$.data.userId", "$.items[0].id"
 *
 * @param data - Response data (object or array)
 * @param path - JSON path expression
 * @returns Extracted value or undefined
 */
function extractValueByPath(data: any, path: string): any {
  if (!data || !path) {
    return undefined;
  }

  // Remove leading $. if present
  const cleanPath = path.startsWith('$.') ? path.substring(2) : path.startsWith('$') ? path.substring(1) : path;
  
  if (!cleanPath) {
    return data;
  }

  // Split path by dots and brackets
  const parts = cleanPath.split(/\.|\[|\]/).filter(p => p.length > 0);
  
  let current = data;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    // Handle array index
    if (/^\d+$/.test(part)) {
      const index = parseInt(part, 10);
      if (Array.isArray(current) && index < current.length) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      // Handle object property
      current = current[part];
    }
  }
  
  return current;
}

/**
 * Capture variables from response based on extraction configuration
 *
 * @param response - HTTP response object
 * @param responseBody - Parsed response body
 * @param captureConfig - Variable extraction configuration
 * @returns Captured variables as key-value pairs
 */
/**
 * Extract ID from Location header URL (Issue #7)
 * Handles formats like: /api/users/123, /users/abc-def-123, https://api.com/items/456
 */
function extractIdFromLocation(locationUrl: string): string | undefined {
  if (!locationUrl) return undefined;
  
  // Remove query string and hash
  const cleanUrl = locationUrl.split('?')[0].split('#')[0];
  
  // Extract last path segment
  const segments = cleanUrl.split('/').filter(s => s.length > 0);
  if (segments.length === 0) return undefined;
  
  const lastSegment = segments[segments.length - 1];
  
  // Return the last segment as the ID
  return lastSegment;
}

function captureVariables(
  response: Response,
  responseBody: any,
  captureConfig: VariableExtraction[]
): Record<string, any> {
  const captured: Record<string, any> = {};

  for (const config of captureConfig) {
    try {
      const source = config.source || 'body';
      let value: any;

      if (source === 'body') {
        value = extractValueByPath(responseBody, config.path);
      } else if (source === 'headers') {
        // Extract from headers - path is the header name
        const headerName = config.path.replace(/^\$\.?/, '');
        value = response.headers.get(headerName);
        
        // Special handling for Location header - extract ID from URL (Issue #7)
        if (headerName.toLowerCase() === 'location' && typeof value === 'string') {
          const extractedId = extractIdFromLocation(value);
          if (extractedId) {
            value = extractedId;
            logger.debug(`Extracted ID '${extractedId}' from Location header`);
          }
        }
      } else if (source === 'status') {
        value = response.status;
      }

      if (value !== undefined && value !== null) {
        captured[config.name] = value;
        logger.debug(`Captured variable "${config.name}" = ${JSON.stringify(value)}`);
      } else {
        logger.warn(`Failed to capture variable "${config.name}" from ${source} using path "${config.path}"`);
      }
    } catch (error) {
      logger.warn(`Error capturing variable "${config.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return captured;
}

/**
 * Resolve variables in a string using captured values
 * Supports both {variableName} and {{variableName}} syntax
 *
 * @param template - String with variable placeholders
 * @param variables - Captured variables from previous steps
 * @returns Object with resolved value and success status
 */
function resolveVariables(
  template: string,
  variables: Record<string, any>
): { value: string; success: boolean; unresolvedVars: string[] } {
  const unresolvedVars: string[] = [];
  
  // Match both {var} and {{var}} patterns
  const resolved = template.replace(/\{\{?(\w+)\}?\}/g, (match, varName) => {
    if (variables.hasOwnProperty(varName)) {
      const value = variables[varName];
      // Convert to string, handling different types
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    } else {
      unresolvedVars.push(varName);
      return match; // Keep original placeholder if not found
    }
  });

  const success = unresolvedVars.length === 0;
  
  if (!success) {
    logger.warn(`Unresolved variables in template: ${unresolvedVars.join(', ')}`);
  }

  return { value: resolved, success, unresolvedVars };
}

/**
 * Resolve variables in an object (recursively handles nested objects and arrays)
 *
 * @param obj - Object with potential variable placeholders
 * @param variables - Captured variables from previous steps
 * @returns Object with resolved values and success status
 */
function resolveObjectVariables(
  obj: any,
  variables: Record<string, any>
): { value: any; success: boolean; unresolvedVars: string[] } {
  if (obj === null || obj === undefined) {
    return { value: obj, success: true, unresolvedVars: [] };
  }

  const allUnresolvedVars: string[] = [];
  
  if (typeof obj === 'string') {
    const result = resolveVariables(obj, variables);
    return result;
  }

  if (Array.isArray(obj)) {
    const resolvedArray = obj.map(item => {
      const result = resolveObjectVariables(item, variables);
      allUnresolvedVars.push(...result.unresolvedVars);
      return result.value;
    });
    return { value: resolvedArray, success: allUnresolvedVars.length === 0, unresolvedVars: allUnresolvedVars };
  }

  if (typeof obj === 'object') {
    const resolvedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const result = resolveObjectVariables(value, variables);
      allUnresolvedVars.push(...result.unresolvedVars);
      resolvedObj[key] = result.value;
    }
    return { value: resolvedObj, success: allUnresolvedVars.length === 0, unresolvedVars: allUnresolvedVars };
  }

  return { value: obj, success: true, unresolvedVars: [] };
}

/**
 * Prepare a test step by resolving variables in URL, headers, and body
 *
 * @param step - Original test step
 * @param variables - Captured variables from previous steps
 * @returns Resolved step and resolution status
 */
function prepareStepWithVariables(
  step: HTTPTestStep,
  variables: Record<string, any>
): { step: HTTPTestStep; success: boolean; unresolvedVars: string[] } {
  const allUnresolvedVars: string[] = [];

  // Resolve URL
  const urlResult = resolveVariables(step.url, variables);
  allUnresolvedVars.push(...urlResult.unresolvedVars);

  // Resolve headers
  const headersResult = resolveObjectVariables(step.headers, variables);
  allUnresolvedVars.push(...headersResult.unresolvedVars);

  // Resolve body
  const bodyResult = step.body ? resolveObjectVariables(step.body, variables) : { value: null, success: true, unresolvedVars: [] };
  allUnresolvedVars.push(...bodyResult.unresolvedVars);

  const resolvedStep: HTTPTestStep = {
    ...step,
    url: urlResult.value,
    headers: headersResult.value,
    body: bodyResult.value,
  };

  const success = allUnresolvedVars.length === 0;

  if (!success) {
    logger.warn(`Step ${step.stepId} has unresolved variables: ${[...new Set(allUnresolvedVars)].join(', ')}`);
  }

  return { step: resolvedStep, success, unresolvedVars: [...new Set(allUnresolvedVars)] };
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

    // If server returned 422, attempt to detect allowed enum/validation hints and retry with safe value
    if (response.status === 422 && step.body && typeof step.body === 'object' && retryCount < maxRetries) {
      try {
        const hints = extractAllowedValuesFromResponse(responseBody);
        if (hints && Object.keys(hints).length > 0) {
          // Apply the first hint to the request body (conservative, one-field repair)
          const repairedBody = { ...(step.body as Record<string, any>) };
          for (const [field, values] of Object.entries(hints)) {
            if (values && values.length > 0) {
              // Only repair top-level fields
              repairedBody[field] = values[0];
              logger.info(`Attempting one-time repair for field '${field}' using suggested value '${values[0]}'`);
              break;
            }
          }

          // Mutate step body and retry once
          const repairedStep: HTTPTestStep = { ...step, body: repairedBody };
          return executeWithRetry(repairedStep, config, retryCount + 1);
        }
      } catch (err) {
        logger.debug('Repair attempt failed to parse hints', err);
      }
    }

    // Assert status (always critical)
    const statusAssertion = assertStatus(
      response.status,
      step.expectedStatus,
      step.acceptableStatuses
    );

    // Assert body contains (advisory by default unless explicitly marked critical)
    let bodyAssertion: BodyAssertionResult | null = null;
    const advisoryWarnings: string[] = [];
    const isCritical = step.bodyAssertionsCritical ?? false;
    
    if (step.expectedBodyContains && step.expectedBodyContains.length > 0) {
      bodyAssertion = assertBodyContains(responseBody, step.expectedBodyContains, isCritical);
      
      // If body assertion failed but is advisory, add to warnings instead of failing test
      if (!bodyAssertion.passed && !isCritical) {
        advisoryWarnings.push(bodyAssertion.message);
        logger.info(`Advisory body assertion warning: ${bodyAssertion.message}`);
      }
    }

    // Validate response schema if provided (critical validation)
    let schemaValidation: { valid: boolean; errors: string[] } | null = null;
    if (step.expectedBodySchema) {
      schemaValidation = validateBodySchema(responseBody, step.expectedBodySchema);
      if (!schemaValidation.valid) {
        logger.warn(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
      }
    }

    // Determine if step passed (only fail on critical assertions and schema validation)
    const passed = statusAssertion.passed &&
                   (bodyAssertion && isCritical ? bodyAssertion.passed : true) &&
                   (schemaValidation ? schemaValidation.valid : true);

    // Build error message if failed (only include critical failures)
    let errorMessage: string | null = null;
    if (!passed) {
      const errors: string[] = [];
      if (!statusAssertion.passed) {
        errors.push(statusAssertion.message);
      }
      if (bodyAssertion && !bodyAssertion.passed && isCritical) {
        errors.push(bodyAssertion.message);
      }
      if (schemaValidation && !schemaValidation.valid) {
        errors.push(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
      }
      errorMessage = errors.join('; ');
    }

    // Capture variables if configured
    let capturedVariables: Record<string, any> | undefined;
    if (step.captureVariables && step.captureVariables.length > 0) {
      capturedVariables = captureVariables(response, responseBody, step.captureVariables);
    }

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

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
      advisoryWarnings: advisoryWarnings.length > 0 ? advisoryWarnings : undefined,
      capturedVariables,
      responseHeaders,
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
 * Heuristic parser to extract allowed enum/validation hints from a 422 response body
 * Returns a mapping of fieldName -> array of allowed values
 */
function extractAllowedValuesFromResponse(body: any): Record<string, any[]> | null {
  if (!body) return null;

  // If body has explicit allowed values structure
  try {
    // Common pattern: { errors: [{ field: 'status', message: 'must be one of [a,b]', allowed: ['a','b'] }, ...] }
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const hints: Record<string, any[]> = {};
      for (const err of body.errors) {
        const field = err.field || err.property || null;
        if (field) {
          if (Array.isArray(err.allowed) && err.allowed.length > 0) {
            hints[field] = err.allowed;
            continue;
          }
          // Try to parse message for "one of" lists
          const msg = String(err.message || '');
          const m = msg.match(/one of[:]?\s*\[?([^\]]+)\]?/i);
          if (m && m[1]) {
            const vals = m[1].split(/,\s*/).map(s => s.replace(/^\s*['"]?|['"]?\s*$/g, ''));
            hints[field] = vals;
            continue;
          }
        }
      }
      if (Object.keys(hints).length > 0) return hints;
    }

    // Another common pattern: { message: 'status must be one of: A,B,C' }
    if (typeof body.message === 'string') {
      const m = body.message.match(/one of[:]?\s*([^\n]+)/i);
      if (m && m[1]) {
        const vals = m[1].split(/,\s*/).map(s => s.replace(/^['"]|['"]$/g, ''));
        // No field name — return a generic hint for top-level
        return { '': vals };
      }
    }

    // If body itself looks like { field: { allowed: [...] } }
    if (typeof body === 'object' && !Array.isArray(body)) {
      const hints: Record<string, any[]> = {};
      for (const [k, v] of Object.entries(body)) {
        if (v && typeof v === 'object') {
          if (Array.isArray((v as any).allowed) && (v as any).allowed.length > 0) {
            hints[k] = (v as any).allowed;
          } else if (Array.isArray((v as any).enum) && (v as any).enum.length > 0) {
            hints[k] = (v as any).enum;
          }
        }
      }
      if (Object.keys(hints).length > 0) return hints;
    }
  } catch (e) {
    return null;
  }

  return null;
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
  
  // Collect all captured variables from previous steps
  const capturedVariables: Record<string, any> = {};
  for (const prevResult of previousStepResults) {
    if (prevResult.capturedVariables) {
      Object.assign(capturedVariables, prevResult.capturedVariables);
    }
  }

  // Resolve variables in the step if any were captured
  let resolvedStep = step;
  if (Object.keys(capturedVariables).length > 0) {
    const resolution = prepareStepWithVariables(step, capturedVariables);
    resolvedStep = resolution.step;
    
    // If variables couldn't be resolved, mark step as failed with uncertain classification
    if (!resolution.success) {
      logger.error(`Step ${step.stepId} has unresolved variables: ${resolution.unresolvedVars.join(', ')}`);
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
        duration: 0,
        error: `Unresolved variables: ${resolution.unresolvedVars.join(', ')}. These variables were not captured from previous steps.`,
      };
    }
  }
  
  // Execute with retry logic (starting at retry count 0)
  return executeWithRetry(resolvedStep, config, 0);
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
 * @returns Classification result with reasoning
 */
function classifyTestResult(
  test: GeneratedHTTPTest,
  stepResults: HTTPStepResult[]
): import('../types/index.js').ClassificationResult {
  // Check test status first
  if (test.status === 'uncertain') {
    return {
      classification: TestFailureClassification.UNCERTAIN,
      reason: test.uncertainReason || 'Test marked as uncertain',
      confidence: 1.0
    };
  }
  if (test.status === 'manual') {
    return {
      classification: TestFailureClassification.MANUAL,
      reason: 'Test requires manual execution',
      confidence: 1.0
    };
  }

  // If all steps passed, it's passed
  const allPassed = stepResults.every(result => result.passed);
  if (allPassed) {
    return {
      classification: TestFailureClassification.PASSED,
      reason: 'All test steps passed successfully',
      confidence: 1.0
    };
  }

  // Check for generation issues (invalid URLs, network errors indicating bad test data)
  const generationIssues = stepResults.filter(result => {
    // If there was an explicit error string, check it
    if (result.error) {
      const error = result.error.toLowerCase();
      // Invalid URL or malformed request indicates generation issue
      if (error.includes('invalid url') ||
          error.includes('malformed') ||
          error.includes('typeerror') ||
          error.includes('failed to parse')) {
        return true;
      }

      // Connection refused to localhost without proper setup
      if (error.includes('econnrefused') && result.url && result.url.includes('localhost')) {
        return true;
      }
    }

    // If server returned 422 and response body hints at enum/validation, treat as generation issue
    if (result.actualStatus === 422 && result.responseBody) {
      const hints = extractAllowedValuesFromResponse(result.responseBody as any);
      if (hints && Object.keys(hints).length > 0) {
        return true;
      }
      // Also inspect response body strings for "one of" patterns
      if (typeof result.responseBody === 'string' && /one of/i.test(result.responseBody)) {
        return true;
      }
    }

    return false;
  });

  if (generationIssues.length > 0) {
    const reasons = generationIssues.map(r => r.error).join('; ');
    return {
      classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
      reason: `Test generation issues detected: ${reasons}`,
      confidence: 0.9,
      metadata: { failedSteps: generationIssues.length, totalSteps: stepResults.length }
    };
  }

  // Check for infrastructure failures (network errors)
  const infrastructureIssues = stepResults.filter(result => {
    if (!result.error) return false;
    const error = result.error.toLowerCase();
    return error.includes('econnrefused') ||
           error.includes('etimedout') ||
           error.includes('enotfound') ||
           error.includes('network');
  });

  if (infrastructureIssues.length > 0) {
    return {
      classification: TestFailureClassification.INFRASTRUCTURE_FAILURE,
      reason: 'Network or infrastructure errors detected',
      confidence: 0.85,
      metadata: { failedSteps: infrastructureIssues.length, totalSteps: stepResults.length }
    };
  }

  // Otherwise, it's an application failure
  // The app returned a response, but it didn't match expectations
  const failedSteps = stepResults.filter(r => !r.passed);
  return {
    classification: TestFailureClassification.APPLICATION_FAILURE,
    reason: `Application returned unexpected responses in ${failedSteps.length} step(s)`,
    confidence: 0.8,
    metadata: { failedSteps: failedSteps.length, totalSteps: stepResults.length }
  };
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
      classification: {
        classification: TestFailureClassification.UNCERTAIN,
        reason: test.uncertainReason || 'No reason provided',
        confidence: 1.0
      },
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
      classification: {
        classification: TestFailureClassification.MANUAL,
        reason: 'Test requires manual execution',
        confidence: 1.0
      },
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
// Reachability Check
// ============================================================================

/**
 * Extract first safe GET endpoint from OpenAPI spec
 *
 * @param openapiSpec - OpenAPI specification object
 * @returns First safe GET endpoint path, or null if none found
 */
function extractFirstSafeGetEndpoint(openapiSpec: any): string | null {
  if (!openapiSpec || !openapiSpec.paths) {
    return null;
  }

  // Iterate through paths to find first GET endpoint
  for (const [path, methods] of Object.entries(openapiSpec.paths)) {
    if (typeof methods !== 'object' || methods === null) continue;
    
    const pathMethods = methods as Record<string, any>;
    
    // Check if this path has a GET method
    if (pathMethods.get) {
      // Avoid endpoints that require path parameters
      if (!path.includes('{')) {
        return path;
      }
    }
  }

  return null;
}

/**
 * Load OpenAPI spec from config
 *
 * @param config - TraceQA configuration
 * @returns OpenAPI spec object or null
 */
async function loadOpenAPISpec(config: TraceQAConfig): Promise<any | null> {
  // Check if openapi is configured in the config
  const openapiPath = (config as any).openapi;
  
  if (!openapiPath) {
    return null;
  }

  try {
    // Try to load as JSON file
    const fs = await import('fs/promises');
    const content = await fs.readFile(openapiPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.debug(`Could not load OpenAPI spec from ${openapiPath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Check if the application is reachable before running tests
 *
 * Priority order:
 * 1. If config.healthUrl is configured, try GET request to that URL
 * 2. Else if OpenAPI spec is available, try GET request to baseUrl + first safe GET endpoint
 * 3. Else try GET request to baseUrl directly
 *
 * @param config - TraceQA configuration
 * @returns Reachability check result
 */
async function checkReachability(config: TraceQAConfig): Promise<ReachabilityCheckResult> {
  const timeout = 5000; // 5 second timeout for reachability checks
  let checkUrl: string | null = null;
  let checkMethod = 'unknown';

  try {
    // Priority 1: Check healthUrl if configured
    if (config.healthUrl) {
      checkUrl = config.healthUrl;
      checkMethod = 'healthUrl';
      logger.debug(`Checking reachability via healthUrl: ${checkUrl}`);
    }
    // Priority 2: Check OpenAPI spec for first safe GET endpoint
    else if (config.baseUrl) {
      const openapiSpec = await loadOpenAPISpec(config);
      
      if (openapiSpec) {
        const firstEndpoint = extractFirstSafeGetEndpoint(openapiSpec);
        
        if (firstEndpoint) {
          // Ensure baseUrl doesn't end with / and endpoint starts with /
          const baseUrl = config.baseUrl.replace(/\/$/, '');
          const endpoint = firstEndpoint.startsWith('/') ? firstEndpoint : `/${firstEndpoint}`;
          checkUrl = `${baseUrl}${endpoint}`;
          checkMethod = 'openapi-endpoint';
          logger.debug(`Checking reachability via OpenAPI endpoint: ${checkUrl}`);
        } else {
          // No safe endpoint found, fall back to baseUrl
          checkUrl = config.baseUrl;
          checkMethod = 'baseUrl';
          logger.debug(`No safe OpenAPI endpoint found, checking baseUrl: ${checkUrl}`);
        }
      } else {
        // No OpenAPI spec, use baseUrl
        checkUrl = config.baseUrl;
        checkMethod = 'baseUrl';
        logger.debug(`Checking reachability via baseUrl: ${checkUrl}`);
      }
    }

    // If no URL to check, return reachable (no way to verify)
    if (!checkUrl) {
      logger.warn('No URL configured for reachability check (no baseUrl or healthUrl)');
      return {
        reachable: true,
        reason: 'No URL configured for reachability check',
      };
    }

    // Perform the reachability check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(checkUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });

      clearTimeout(timeoutId);

      // Consider any response (even errors like 404, 500) as "reachable"
      // We just want to know if the server is responding
      logger.debug(`Reachability check successful (status: ${response.status})`);
      
      return {
        reachable: true,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Check error type
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = (error as any).name;

      if (errorName === 'AbortError') {
        return {
          reachable: false,
          reason: `Timeout: Application did not respond within ${timeout}ms (checked via ${checkMethod})`,
        };
      }

      // Network errors indicate unreachable
      if (error instanceof TypeError ||
          (error as any).code === 'ECONNREFUSED' ||
          (error as any).code === 'ENOTFOUND' ||
          (error as any).code === 'ETIMEDOUT') {
        return {
          reachable: false,
          reason: `Network error: ${errorMessage} (checked via ${checkMethod})`,
        };
      }

      // Other errors - consider reachable but log warning
      logger.warn(`Reachability check encountered unexpected error: ${errorMessage}`);
      return {
        reachable: true,
        reason: `Reachability check completed with warning: ${errorMessage}`,
      };
    }
  } catch (error) {
    // Unexpected error in reachability check logic itself
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Reachability check failed with unexpected error: ${errorMessage}`);
    
    // Return reachable to avoid blocking tests due to check logic errors
    return {
      reachable: true,
      reason: `Reachability check error: ${errorMessage}`,
    };
  }
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
  const readyTests = testSuite.tests.filter(t => t.status === 'ready');
  logger.info(`Total tests: ${testSuite.tests.length}`);
  logger.info(`Ready tests: ${readyTests.length}`);
  logger.info(`Uncertain tests: ${testSuite.summary.uncertainTests}`);
  logger.info(`Manual tests: ${testSuite.summary.manualTests}`);
  logger.newLine();

  // Perform reachability check before running tests
  logger.info('Performing reachability check...');
  const reachabilityResult = await checkReachability(config);
  
  if (!reachabilityResult.reachable) {
    logger.error('Application is not reachable', new Error(reachabilityResult.reason || 'Unknown reason'));
    logger.warn('Pre-run reachability failed - aborting execution and recording run-level failure');
    logger.newLine();

    // Create a single run-level failure result (do not fabricate per-test failures)
    const runFailure: HTTPTestResult = {
      testId: 'run-infrastructure-failure',
      acceptanceCriterionId: '',
      qaTaskId: '',
      title: 'Run-level infrastructure failure',
      status: 'failed',
      executor: 'runner',
      stepResults: [],
      evidence: [
        'Pre-run reachability check failed',
        `Reason: ${reachabilityResult.reason || 'Application not reachable'}`,
      ],
      classification: {
        classification: TestFailureClassification.INFRASTRUCTURE_FAILURE,
        reason: reachabilityResult.reason || 'Application not reachable',
        confidence: 1.0,
      },
      duration: 0,
      timestamp: new Date().toISOString(),
    };

    const duration = Date.now() - startTime;
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      uncertain: 0,
      manual: 0,
      skipped: 0,
    };

    // Log summary (no executed tests)
    logger.section('Execution Summary');
    logger.keyValue('Total Tests', String(0));
    logger.keyValue('Passed', String(0), 1);
    logger.keyValue('Failed', String(0), 1);
    logger.keyValue('Uncertain', String(0), 1);
    logger.keyValue('Manual', String(0), 1);
    logger.keyValue('Skipped', String(0), 1);
    logger.keyValue('Duration', logger.formatDuration(duration));
    logger.newLine();

    return {
      results: [],
      summary,
      duration,
      runFailure,
    };
  }

  logger.success('Application is reachable');
  logger.newLine();

  const results: HTTPTestResult[] = [];

  // Execute only ready tests (uncertain/manual are reported by coordinator)
  for (let i = 0; i < readyTests.length; i++) {
    const test = readyTests[i];
    
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
        logger.error(`✗ Test failed (${result.duration}ms): ${result.classification.reason}`);
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
        classification: {
          classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
          reason: `Test execution error: ${error instanceof Error ? error.message : String(error)}`,
          confidence: 0.9
        },
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
