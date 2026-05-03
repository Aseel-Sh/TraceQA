/**
 * Test Normalizer
 * Transforms IBM test plans into validated HTTP test configurations
 * Handles URL validation, route matching, and multi-step test support
 */

import {
  TestCase,
  TestContext,
  APITestConfig,
  APIRequest,
  APIAssertion,
  HTTPMethod,
  AssertionType,
  AuthType
} from '../types/index.js';
import { DiscoveredRoute } from '../discovery/route-discovery.js';
import { logger } from '../utils/logger.js';
import { validateAndCorrectBody } from '../validation/body-generator.js';
import { matchesPathTemplate } from '../validation/route-matcher.js';

/**
 * Normalization result with error classification
 */
export interface NormalizedTest {
  config: APITestConfig;
  isValid: boolean;
  errorType?: 'generation_error' | 'app_error' | 'uncertain';
  errorMessage?: string;
  originalTestCase: TestCase;
}

/**
 * Extended API Test Config with expected status
 */
interface ExtendedAPITestConfig extends APITestConfig {
  expectedStatus?: number;
}

/**
 * Normalization options
 */
export interface NormalizationOptions {
  baseUrl?: string;
  discoveredRoutes?: DiscoveredRoute[];
  strictValidation?: boolean;
  openApiSpec?: any;
}

/**
 * Test Normalizer Class
 * Transforms IBM TestCase objects into validated APITestConfig objects
 */
export class TestNormalizer {
  private baseUrl?: string;
  private discoveredRoutes: DiscoveredRoute[];
  private strictValidation: boolean;
  private openApiSpec?: any;

  constructor(options: NormalizationOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.discoveredRoutes = options.discoveredRoutes || [];
    this.strictValidation = options.strictValidation ?? true;
    this.openApiSpec = options.openApiSpec;

    logger.debug('TestNormalizer initialized', {
      baseUrl: this.baseUrl,
      routeCount: this.discoveredRoutes.length,
      strictValidation: this.strictValidation,
      hasOpenApiSpec: !!this.openApiSpec
    });
  }

  /**
   * Normalize a single test case
   */
  normalizeTestCase(testCase: TestCase, context: TestContext): NormalizedTest[] {
    logger.debug(`Normalizing test case: ${testCase.name}`);

    try {
      // Check if this is a multi-step test (e.g., duplicate registration)
      const isMultiStep = this.isMultiStepTest(testCase);

      if (isMultiStep) {
        return this.normalizeMultiStepTest(testCase, context);
      }

      // Single test normalization
      const normalized = this.normalizeSingleTest(testCase, context);
      return [normalized];
    } catch (error) {
      logger.error(`Failed to normalize test case: ${testCase.name}`, error);
      
      return [{
        config: this.createFallbackConfig(testCase),
        isValid: false,
        errorType: 'generation_error',
        errorMessage: `Normalization failed: ${error instanceof Error ? error.message : String(error)}`,
        originalTestCase: testCase
      }];
    }
  }

  /**
   * Normalize multiple test cases
   */
  normalizeTestCases(testCases: TestCase[], context: TestContext): NormalizedTest[] {
    const normalized: NormalizedTest[] = [];

    for (const testCase of testCases) {
      const results = this.normalizeTestCase(testCase, context);
      normalized.push(...results);
    }

    logger.info(`Normalized ${testCases.length} test cases into ${normalized.length} API tests`);
    logger.info(`Valid: ${normalized.filter(n => n.isValid).length}, Invalid: ${normalized.filter(n => !n.isValid).length}`);

    return normalized;
  }

  /**
   * Check if test case requires multiple API calls
   */
  private isMultiStepTest(testCase: TestCase): boolean {
    const description = testCase.description.toLowerCase();
    const name = testCase.name.toLowerCase();
    
    // Detect duplicate/conflict scenarios
    const isDuplicateTest = 
      description.includes('duplicate') ||
      description.includes('already exists') ||
      description.includes('conflict') ||
      name.includes('duplicate');

    // Detect sequential operations
    const hasSequentialSteps = testCase.steps.length > 1 && 
      testCase.steps.some(step => {
        const stepDesc = step.description.toLowerCase();
        return stepDesc.includes('first') || 
               stepDesc.includes('then') || 
               stepDesc.includes('second') ||
               stepDesc.includes('again');
      });

    return isDuplicateTest || hasSequentialSteps;
  }

  /**
   * Infer expected status code using schema and generic HTTP semantics
   * Priority: explicit status > schema-based > HTTP semantics > undefined
   */
  private inferExpectedStatus(testCase: TestCase, endpoint: string, method: HTTPMethod): number | undefined {
    const expectedResult = String(testCase.expectedResult || '').toLowerCase();
    
    // Priority 1: Check for explicit status codes in expectedResult
    const statusMatch = expectedResult.match(/(\d{3})/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }

    // Priority 2: Use schema information if available (Issue #2)
    const matchedRoute = this.matchRoute(endpoint, method);
    if (matchedRoute?.responseSchema) {
      const schemaStatus = this.inferStatusFromSchema(matchedRoute, testCase);
      if (schemaStatus) {
        return schemaStatus;
      }
    }

    // Priority 3: Apply generic HTTP semantics
    return this.inferExpectedStatusFromSemantics(method, testCase, endpoint);
  }

  /**
   * Infer expected status code from OpenAPI response schema (Issue #2)
   * Uses schema to determine likely success/error status codes
   */
  private inferStatusFromSchema(route: DiscoveredRoute, testCase: TestCase): number | undefined {
    if (!route.responseSchema) {
      return undefined;
    }

    const description = `${testCase.name || ''} ${testCase.description || ''} ${testCase.expectedResult || ''}`.toLowerCase();
    const isFailureScenario = description.includes('invalid') ||
                             description.includes('error') ||
                             description.includes('fail');

    // Get available status codes from schema
    const statusCodes = Object.keys(route.responseSchema).map(code => parseInt(code, 10));
    
    if (isFailureScenario) {
      // Look for error status codes (4xx, 5xx)
      const errorStatuses = statusCodes.filter(code => code >= 400);
      if (errorStatuses.length > 0) {
        // Prefer specific error codes based on description
        if (description.includes('not found')) {
          return errorStatuses.find(code => code === 404) || errorStatuses[0];
        }
        if (description.includes('unauthorized')) {
          return errorStatuses.find(code => code === 401) || errorStatuses[0];
        }
        if (description.includes('forbidden')) {
          return errorStatuses.find(code => code === 403) || errorStatuses[0];
        }
        if (description.includes('conflict') || description.includes('duplicate')) {
          return errorStatuses.find(code => code === 409) || errorStatuses[0];
        }
        if (description.includes('validation')) {
          return errorStatuses.find(code => code === 422 || code === 400) || errorStatuses[0];
        }
        return errorStatuses[0];
      }
    } else {
      // Look for success status codes (2xx)
      const successStatuses = statusCodes.filter(code => code >= 200 && code < 300);
      if (successStatuses.length > 0) {
        return successStatuses[0];
      }
    }

    return undefined;
  }

  /**
   * Infer status code from generic HTTP semantics (no route-specific keywords)
   */
  private inferExpectedStatusFromSemantics(
    method: string,
    testCase: any,
    _endpoint?: string
  ): number | undefined {
    const methodUpper = method.toUpperCase();
    const description = `${testCase.name || ''} ${testCase.description || ''} ${testCase.expectedResult || ''}`.toLowerCase();
    
    // Check for explicit success/failure indicators in description
    const isSuccessScenario = description.includes('success') ||
                             description.includes('valid') ||
                             description.includes('correct') ||
                             description.includes('created') ||
                             description.includes('updated') ||
                             description.includes('deleted');
    
    const isFailureScenario = description.includes('invalid') ||
                             description.includes('error') ||
                             description.includes('fail') ||
                             description.includes('reject') ||
                             description.includes('incorrect') ||
                             description.includes('wrong');
    
    // Apply generic HTTP semantics for success scenarios
    if (isSuccessScenario && !isFailureScenario) {
      switch (methodUpper) {
        case 'GET': return 200;
        case 'POST': return 201; // Resource creation
        case 'PUT': return 200;
        case 'PATCH': return 200;
        case 'DELETE': return 200; // or 204, handled by acceptableStatuses
      }
    }
    
    // Apply generic HTTP semantics for failure scenarios
    if (isFailureScenario) {
      // Check for specific failure types (generic patterns, not route-specific)
      if (description.includes('not found') || description.includes('missing') || description.includes('does not exist')) {
        return 404;
      }
      if (description.includes('unauthorized') || description.includes('not authorized') || description.includes('authentication')) {
        return 401;
      }
      if (description.includes('forbidden') || description.includes('permission') || description.includes('not allowed')) {
        return 403;
      }
      if (description.includes('conflict') || description.includes('duplicate') || description.includes('already exists')) {
        return 409;
      }
      if (description.includes('unprocessable') || description.includes('validation')) {
        return 422;
      }
      // Generic validation/input error
      return 400;
    }
    
    // Default success statuses if no clear indicator
    switch (methodUpper) {
      case 'GET': return 200;
      case 'POST': return 201;
      case 'PUT': return 200;
      case 'PATCH': return 200;
      case 'DELETE': return 204;
      default: return undefined;
    }
  }

  /**
   * Get acceptable status codes when multiple are valid
   */
  private getAcceptableStatuses(
    method: string,
    expectedStatus: number
  ): number[] {
    const methodUpper = method.toUpperCase();
    
    // For successful operations, multiple statuses may be acceptable
    if (expectedStatus === 200 || expectedStatus === 201) {
      if (methodUpper === 'POST') return [200, 201];
      if (methodUpper === 'PUT' || methodUpper === 'PATCH') return [200, 204];
      if (methodUpper === 'DELETE') return [200, 204];
    }
    
    // For validation errors, both 400 and 422 are acceptable
    if (expectedStatus === 400) return [400, 422];
    if (expectedStatus === 422) return [400, 422];
    
    // For no content responses
    if (expectedStatus === 204) {
      if (methodUpper === 'DELETE' || methodUpper === 'PUT' || methodUpper === 'PATCH') {
        return [200, 204];
      }
    }
    
    // Otherwise, only the expected status
    return [expectedStatus];
  }

  /**
   * Generate unique test data with generic field detection
   */
  private generateUniqueTestData(
    body: any,
    testType: string,
    runId: string = Date.now().toString()
  ): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const uniqueBody = { ...body };
    
    // Identify fields that should be unique (generic patterns)
    for (const key of Object.keys(uniqueBody)) {
      const lowerKey = key.toLowerCase();
      const value = uniqueBody[key];
      
      // Skip if value is not a string or is empty
      if (typeof value !== 'string' || !value) {
        continue;
      }
      
      // Email fields (any field containing 'email')
      if (lowerKey.includes('email')) {
        uniqueBody[key] = `traceqa-${testType}-${runId}@example.com`;
      }
      // Username fields (username, user, login)
      else if (lowerKey.includes('username') || lowerKey === 'user' || lowerKey.includes('login')) {
        uniqueBody[key] = `traceqa_${testType}_${runId}`;
      }
      // ID fields (but not if it's a reference to another resource like userId, orderId)
      else if (lowerKey === 'id' && !lowerKey.includes('_id') && !lowerKey.endsWith('id')) {
        uniqueBody[key] = `${testType}-${runId}`;
      }
      // Name fields (name, title, label)
      else if ((lowerKey.includes('name') || lowerKey === 'title' || lowerKey === 'label') &&
               typeof uniqueBody[key] === 'string') {
        uniqueBody[key] = `TraceQA ${testType} ${runId}`;
      }
      // Slug fields (slug, handle, identifier)
      else if (lowerKey.includes('slug') || lowerKey === 'handle' || lowerKey === 'identifier') {
        uniqueBody[key] = `traceqa-${testType}-${runId}`;
      }
    }
    
    return uniqueBody;
  }

  /**
   * Normalize a multi-step test into multiple API test configs
   */
  private normalizeMultiStepTest(testCase: TestCase, context: TestContext): NormalizedTest[] {
    const results: NormalizedTest[] = [];

    // For duplicate/conflict scenarios: create two separate tests
    if (testCase.description.toLowerCase().includes('duplicate') ||
        testCase.description.toLowerCase().includes('already exists') ||
        testCase.description.toLowerCase().includes('conflict')) {
      
      // Extract endpoint and method for status inference
      const step = testCase.steps[0] || testCase.steps[0];
      const method = this.extractMethod(step, testCase);
      const urlResult = this.extractAndValidateURL(step, testCase, context, method);
      const endpoint = urlResult.url || '';

      // Generate unique test data for this test run (run-scoped)
      const runId = Date.now().toString();
      const originalBody = this.extractBody(step, method);
      const uniqueBody = this.generateUniqueTestData(originalBody, 'step1', runId);

      // Infer expected status for first step (successful operation)
      const inferredFirstStatus = this.inferExpectedStatus(testCase, endpoint, method);
      const firstStatus = inferredFirstStatus || 201; // Default to 201 for POST
      const firstAcceptableStatuses = this.getAcceptableStatuses(method, firstStatus);

      // First request: successful operation
      const firstTest = this.normalizeSingleTest(testCase, context, {
        stepIndex: 0,
        expectedStatus: firstStatus,
        nameSuffix: ' - Initial Request'
      });
      
      // Add acceptableStatuses to config
      (firstTest.config as ExtendedAPITestConfig).acceptableStatuses = firstAcceptableStatuses;
      
      // Replace body with unique data
      if (uniqueBody) {
        firstTest.config.request.body = uniqueBody;
      }
      results.push(firstTest);

      // Second request: duplicate/conflict operation (should be 409)
      const secondStatus = 409; // Conflict for duplicate resources
      const secondAcceptableStatuses = this.getAcceptableStatuses(method, secondStatus);
      
      const secondTest = this.normalizeSingleTest(testCase, context, {
        stepIndex: 1,
        expectedStatus: secondStatus,
        nameSuffix: ' - Duplicate Request'
      });
      
      // Add acceptableStatuses to config
      (secondTest.config as ExtendedAPITestConfig).acceptableStatuses = secondAcceptableStatuses;
      
      // Use the SAME unique data for duplicate detection
      if (uniqueBody) {
        secondTest.config.request.body = uniqueBody;
      }
      results.push(secondTest);

      logger.debug(`Created multi-step test: ${testCase.name} -> ${results.length} API tests with unique data`);
    } else {
      // Generic multi-step: create test for each step
      const runId = Date.now().toString();
      
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i];
        const method = this.extractMethod(step, testCase);
        const urlResult = this.extractAndValidateURL(step, testCase, context, method);
        const endpoint = urlResult.url || '';
        
        // Generate unique data for each step
        const originalBody = this.extractBody(step, method);
        const uniqueBody = this.generateUniqueTestData(originalBody, `step${i + 1}`, runId);
        
        // Infer status and get acceptable statuses
        const inferredStatus = this.inferExpectedStatus(testCase, endpoint, method);
        const expectedStatus = inferredStatus || 200;
        const acceptableStatuses = this.getAcceptableStatuses(method, expectedStatus);
        
        const stepTest = this.normalizeSingleTest(testCase, context, {
          stepIndex: i,
          expectedStatus: expectedStatus,
          nameSuffix: ` - Step ${i + 1}`
        });
        
        // Add acceptableStatuses to config
        (stepTest.config as ExtendedAPITestConfig).acceptableStatuses = acceptableStatuses;
        
        // Replace body with unique data
        if (uniqueBody) {
          stepTest.config.request.body = uniqueBody;
        }
        
        results.push(stepTest);
      }
    }

    return results;
  }

  /**
   * Normalize a single test case into an API test config
   */
  private normalizeSingleTest(
    testCase: TestCase,
    context: TestContext,
    options?: {
      stepIndex?: number;
      expectedStatus?: number;
      nameSuffix?: string;
    }
  ): NormalizedTest {
    const stepIndex = options?.stepIndex ?? 0;
    const step = testCase.steps[stepIndex] || testCase.steps[0];

    // Extract HTTP method
    const method = this.extractMethod(step, testCase);

    // Extract and validate URL
    const urlResult = this.extractAndValidateURL(step, testCase, context, method);

    // Extract request body (with schema validation if available)
    const body = this.extractBody(step, method, urlResult.url);

    // Extract headers
    const headers = this.extractHeaders(step);

    // Extract assertions
    const assertions = this.extractAssertions(testCase, options?.expectedStatus);

    // Build API request
    const request: APIRequest = {
      method,
      url: urlResult.url || '',
      headers,
      body,
      timeout: 30000,
      validateSSL: true,
      auth: {
        type: AuthType.NONE
      }
    };

    // Build API test config
    const config: APITestConfig = {
      name: testCase.name + (options?.nameSuffix || ''),
      description: testCase.description,
      request,
      assertions,
      retries: 2,
      retryDelay: 1000,
      continueOnFailure: false
    };

    // Determine validity and error classification
    const result: NormalizedTest = {
      config,
      isValid: urlResult.isValid,
      originalTestCase: testCase
    };

    if (!urlResult.isValid) {
      result.errorType = urlResult.errorType;
      result.errorMessage = urlResult.errorMessage;
    }

    return result;
  }

  /**
   * Extract HTTP method from test step
   */
  private extractMethod(step: any, testCase: TestCase): HTTPMethod {
    // Check step.method first (IBM provides this explicitly)
    if (step.method) {
      const methodStr = String(step.method).toUpperCase();
      if (Object.values(HTTPMethod).includes(methodStr as HTTPMethod)) {
        return methodStr as HTTPMethod;
      }
    }

    // Fallback: extract from action or description
    const action = String(step.action || '').toLowerCase();
    const description = String(step.description || '').toLowerCase();
    const testName = testCase.name.toLowerCase();

    if (action.includes('post') || description.includes('post') || testName.includes('post')) {
      return HTTPMethod.POST;
    } else if (action.includes('put') || description.includes('put') || testName.includes('put')) {
      return HTTPMethod.PUT;
    } else if (action.includes('delete') || description.includes('delete') || testName.includes('delete')) {
      return HTTPMethod.DELETE;
    } else if (action.includes('patch') || description.includes('patch') || testName.includes('patch')) {
      return HTTPMethod.PATCH;
    }

    // Default to GET
    return HTTPMethod.GET;
  }

  /**
   * Extract and validate URL from test step
   */
  private extractAndValidateURL(
    step: any,
    _testCase: TestCase,
    context: TestContext,
    method: HTTPMethod
  ): {
    url: string | undefined;
    isValid: boolean;
    errorType?: 'generation_error' | 'app_error' | 'uncertain';
    errorMessage?: string;
  } {
    let url: string | undefined;

    // Extract URL from step.target or step.url
    if (step.target && typeof step.target === 'string') {
      url = step.target;
    } else if (step.url && typeof step.url === 'string') {
      url = step.url;
    }

    // Check if URL is actually an object (the bug we're fixing)
    if (step.target && typeof step.target === 'object') {
      logger.warn(`Invalid URL: step.target is an object, not a string`, step.target);
      return {
        url: undefined,
        isValid: false,
        errorType: 'generation_error',
        errorMessage: `TraceQA generation error: URL is an object (${JSON.stringify(step.target)}) instead of a string. This is a test generation issue, not an application bug.`
      };
    }

    if (step.url && typeof step.url === 'object') {
      logger.warn(`Invalid URL: step.url is an object, not a string`, step.url);
      return {
        url: undefined,
        isValid: false,
        errorType: 'generation_error',
        errorMessage: `TraceQA generation error: URL is an object (${JSON.stringify(step.url)}) instead of a string. This is a test generation issue, not an application bug.`
      };
    }

    // If no URL found, try to extract from description
    if (!url) {
      const description = String(step.description || '').toLowerCase();
      const urlMatch = description.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        url = urlMatch[1];
      } else {
        // Try to extract path from description
        const pathMatch = description.match(/\/(api\/[^\s]+)/);
        if (pathMatch) {
          url = '/' + pathMatch[1];
        }
      }
    }

    // Validate and normalize URL
    if (!url) {
      // No URL found - check if we have baseUrl or context
      if (!this.baseUrl && !context.buildInfo.port) {
        return {
          url: undefined,
          isValid: false,
          errorType: 'uncertain',
          errorMessage: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available. Cannot determine if this is a generation error or app error.'
        };
      }

      return {
        url: undefined,
        isValid: false,
        errorType: 'uncertain',
        errorMessage: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available. Cannot safely infer a URL.'
      };
    }

    // Normalize URL
    const normalizedURL = this.normalizeURL(url, context);

    // Validate URL format
    if (!this.isValidURL(normalizedURL)) {
      return {
        url: normalizedURL,
        isValid: false,
        errorType: 'generation_error',
        errorMessage: `TraceQA generation error: Invalid URL format: ${normalizedURL}`
      };
    }

    // Validate against discovered routes and schema (Issue #2)
    if (this.strictValidation && this.discoveredRoutes.length > 0) {
      const routeMatch = this.matchRoute(normalizedURL, method);
      if (!routeMatch) {
        logger.warn(`URL ${normalizedURL} with method ${method} does not match any discovered routes`);
        // This is not necessarily an error - the route might be valid but not discovered
      } else if (routeMatch.parameters) {
        // Log available schema information for debugging
        logger.debug(`Matched route with schema: ${routeMatch.path}`, {
          hasRequestSchema: !!routeMatch.requestSchema,
          hasResponseSchema: !!routeMatch.responseSchema,
          parameterCount: routeMatch.parameters.length
        });
      }
    }

    return {
      url: normalizedURL,
      isValid: true
    };
  }

  /**
   * Normalize URL (handle relative paths, combine with baseUrl)
   */
  private normalizeURL(url: string, context: TestContext): string {
    // If URL starts with http:// or https://, use as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If URL starts with /, combine with baseUrl
    if (url.startsWith('/')) {
      if (this.baseUrl) {
        return `${this.baseUrl}${url}`;
      } else if (context.buildInfo.port) {
        return `http://localhost:${context.buildInfo.port}${url}`;
      }
    }

    // If URL doesn't start with / or http, assume it's a path
    if (this.baseUrl) {
      return `${this.baseUrl}/${url}`;
    } else if (context.buildInfo.port) {
      return `http://localhost:${context.buildInfo.port}/${url}`;
    }

    return url;
  }

  /**
   * Validate URL format
   */
  private isValidURL(url: string): boolean {
    // Check if URL is empty or undefined
    if (!url || url.trim() === '') {
      return false;
    }

    // Check if URL starts with http://, https://, or /
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return true;
    }

    return false;
  }

  /**
   * Match URL against discovered routes
   */
  private matchRoute(url: string, method: HTTPMethod): DiscoveredRoute | undefined {
    // Extract path from URL (simple string parsing)
    let path = url;
    
    // Remove protocol and host if present
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const protocolEnd = url.indexOf('://') + 3;
      const pathStart = url.indexOf('/', protocolEnd);
      if (pathStart !== -1) {
        path = url.substring(pathStart);
      }
    }
    
    // Remove query string and hash
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      path = path.substring(0, queryIndex);
    }
    const hashIndex = path.indexOf('#');
    if (hashIndex !== -1) {
      path = path.substring(0, hashIndex);
    }

    // Find matching route
    return this.discoveredRoutes.find(route => {
      return route.method === method && this.pathsMatch(route.path, path);
    });
  }

  /**
   * Check if two paths match (handles path parameters)
   */
  private pathsMatch(routePath: string, requestPath: string): boolean {
    // Exact match
    if (routePath === requestPath) {
      return true;
    }

    // Handle path parameters like /api/users/:id
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');

    if (routeParts.length !== requestParts.length) {
      return false;
    }

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      // Skip parameter parts (start with : or {)
      if (routePart.startsWith(':') || routePart.startsWith('{')) {
        continue;
      }

      if (routePart !== requestPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract request body from test step with schema validation (Issue #3)
   * Validates body against OpenAPI schema and corrects if needed
   */
  private extractBody(step: any, method: HTTPMethod, url?: string): any {
    // Only extract body for methods that support it
    if (![HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(method)) {
      return undefined;
    }

    // Extract raw body from step
    let body: any;
    if (step.body) {
      body = step.body;
    } else if (step.value) {
      try {
        body = JSON.parse(step.value);
      } catch {
        body = step.value;
      }
    }

    // If no body and no schema available, return undefined
    if (!body && !this.openApiSpec) {
      return undefined;
    }

    // Try to get schema for validation (Issue #3)
    if (this.openApiSpec && url) {
      const route = this.matchRoute(url, method);
      if (route?.requestSchema) {
        logger.debug(`Validating body against schema for ${method} ${route.path}`);
        
        // Validate and potentially correct the body
        const validation = validateAndCorrectBody(
          body,
          route.requestSchema,
          this.openApiSpec,
          `test-${Date.now()}`,
          Date.now().toString()
        );
        
        if (!validation.valid) {
          logger.warn(`Body validation failed for ${method} ${route.path}: ${validation.errors.join(', ')}`);
          
          // If body was corrected, use the corrected version
          if (validation.corrected && validation.body) {
            logger.info(`Using corrected body for ${method} ${route.path}`);
            return validation.body;
          }
          
          // If validation failed and couldn't be corrected, log warning but use original
          logger.warn(`Using original body despite validation errors`);
        } else if (validation.corrected) {
          logger.info(`Body was corrected to match schema for ${method} ${route.path}`);
          return validation.body;
        }
      }
    }

    return body;
  }

  /**
   * Extract headers from test step
   */
  private extractHeaders(step: any): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (step.headers && typeof step.headers === 'object') {
      Object.assign(headers, step.headers);
    }

    return headers;
  }

  /**
   * Extract assertions from test case
   */
  private extractAssertions(testCase: TestCase, overrideStatus?: number): APIAssertion[] {
    const assertions: APIAssertion[] = [];

    // Parse expectedResult
    const expectedResult = String(testCase.expectedResult || '');

    // Check if expectedResult is an object (another bug to handle)
    if (typeof testCase.expectedResult === 'object' && testCase.expectedResult !== null) {
      const resultObj = testCase.expectedResult as any;
      
      // Extract status code from object
      if (resultObj.statusCode) {
        assertions.push({
          type: AssertionType.STATUS_CODE,
          expected: resultObj.statusCode,
          operator: 'equals'
        });
      }

      // Extract body assertions from object
      if (resultObj.body) {
        assertions.push({
          type: AssertionType.BODY_CONTAINS,
          expected: JSON.stringify(resultObj.body),
          operator: 'contains'
        });
      }

      return assertions;
    }

    // Extract status code from string
    let expectedStatus = overrideStatus || 200;

    const statusCodeMatch = expectedResult.match(/(\d{3})/);
    if (statusCodeMatch) {
      expectedStatus = parseInt(statusCodeMatch[1], 10);
    } else {
      // Infer from keywords
      const lower = expectedResult.toLowerCase();
      if (lower.includes('created')) {
        expectedStatus = 201;
      } else if (lower.includes('bad request') || lower.includes('invalid')) {
        expectedStatus = 400;
      } else if (lower.includes('unauthorized')) {
        expectedStatus = 401;
      } else if (lower.includes('forbidden')) {
        expectedStatus = 403;
      } else if (lower.includes('not found')) {
        expectedStatus = 404;
      } else if (lower.includes('conflict') || lower.includes('duplicate')) {
        expectedStatus = 409;
      } else if (lower.includes('error') || lower.includes('fail')) {
        expectedStatus = 500;
      }
    }

    assertions.push({
      type: AssertionType.STATUS_CODE,
      expected: expectedStatus,
      operator: 'equals'
    });

    return assertions;
  }

  /**
   * Create a fallback config for failed normalization
   */
  private createFallbackConfig(testCase: TestCase): APITestConfig {
    return {
      name: testCase.name,
      description: testCase.description,
      request: {
        method: HTTPMethod.GET,
        url: '',
        headers: {},
        timeout: 30000,
        validateSSL: true,
        auth: {
          type: AuthType.NONE
        }
      },
      assertions: [],
      retries: 0,
      retryDelay: 1000,
      continueOnFailure: false
    };
  }

  /**
   * Check if URL has unresolved placeholders
   * Detects patterns like {id}, :id, <id>, [id] that should be resolved before execution
   */
  private hasUnresolvedPlaceholders(url: string): boolean {
    // Check for common placeholder patterns
    // {id}, {userId}, {item_id} - OpenAPI/Swagger style
    // :id, :userId, :item_id - Express/Koa style
    // <id>, <userId>, <item_id> - Flask/Django style
    // [id], [userId], [item_id] - Alternative style
    const placeholderPattern = /\{[^}]+\}|:[a-zA-Z_][a-zA-Z0-9_]*|<[^>]+>|\[[^\]]+\]/;
    return placeholderPattern.test(url);
  }

  /**
   * Check if a test is ready to execute (Enhanced in Issue #4)
   *
   * Comprehensive validation checks:
   * 1. Basic validity (from normalization)
   * 2. URL presence and format
   * 3. No unresolved placeholders in URL
   * 4. Valid HTTP method
   * 5. Route matches discovered routes (using unified matcher from Issue #1)
   * 6. Valid expected status code
   * 7. Body present and valid when required
   * 8. No obvious schema violations
   *
   * @param normalized - Normalized test result
   * @returns Object indicating if test is ready and reason if not
   */
  /**
   * Detect guessed IDs in URLs for existing-resource tests
   * Gap 2: Flag suspicious concrete numeric IDs when no setup step exists
   */
  private detectGuessedID(url: string, method: string, test: any): {
    hasGuessedID: boolean;
    reason?: string;
  } {
    // Only check for methods that operate on existing resources
    const existingResourceMethods = ['PUT', 'PATCH', 'DELETE', 'GET'];
    if (!existingResourceMethods.includes(method.toUpperCase())) {
      return { hasGuessedID: false };
    }

    // Check if test has setup steps (variable capture)
    const hasSetup = test.steps?.some((step: any) =>
      step.captureVariables && Object.keys(step.captureVariables).length > 0
    );

    if (hasSetup) {
      // Setup exists, so concrete IDs are okay (will be replaced with captured values)
      return { hasGuessedID: false };
    }

    // Check if this is a 404 test (testing missing resources)
    const description = test.description?.toLowerCase() || '';
    const name = test.name?.toLowerCase() || '';
    const is404Test = description.includes('not found') ||
                      description.includes('missing') ||
                      description.includes('404') ||
                      name.includes('not found') ||
                      name.includes('missing') ||
                      name.includes('404');

    if (is404Test) {
      // 404 tests are expected to use non-existent IDs
      return { hasGuessedID: false };
    }

    // Patterns for suspicious guessed IDs
    const guessedIDPatterns = [
      { pattern: /\/\w+\/\d{1,2}(?=\/|$|\?)/, desc: 'single/double digit ID' },
      { pattern: /\/\w+\/123(?=\/|$|\?)/, desc: 'placeholder 123' },
      { pattern: /\/\w+\/999(?=\/|$|\?)/, desc: 'placeholder 999' },
      { pattern: /\/\w+\/test(?=\/|$|\?)/i, desc: 'test ID' },
    ];

    for (const { pattern, desc } of guessedIDPatterns) {
      if (pattern.test(url)) {
        return {
          hasGuessedID: true,
          reason: `URL contains suspicious ${desc} without setup step`
        };
      }
    }

    return { hasGuessedID: false };
  }

  isTestReady(normalized: NormalizedTest): { ready: boolean; reason?: string } {
    // Check 1: Basic validity first
    if (!normalized.isValid) {
      return {
        ready: false,
        reason: normalized.errorMessage || 'Test normalization failed'
      };
    }

    const { config } = normalized;
    const { method, url, body } = config.request;

    // Check 2: URL presence
    if (!url || url === '') {
      return {
        ready: false,
        reason: 'UNCERTAIN: No URL available for test execution'
      };
    }

    // Check 3: No unresolved placeholders in URL
    if (this.hasUnresolvedPlaceholders(url)) {
      return {
        ready: false,
        reason: `TRACEQA_GENERATION_ISSUE: URL contains unresolved placeholders: ${url}. Placeholders like {id}, :id, <id>, [id] must be resolved before execution.`
      };
    }

    // Check 4: Valid HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(method.toUpperCase())) {
      return {
        ready: false,
        reason: `TRACEQA_GENERATION_ISSUE: Invalid HTTP method: ${method}. Must be one of: ${validMethods.join(', ')}`
      };
    }

    // Check 5: Route matches discovered routes (using unified matcher from Issue #1)
    if (this.discoveredRoutes && this.discoveredRoutes.length > 0) {
      const urlPath = url.split('?')[0].split('#')[0]; // Remove query and fragment
      // Extract just the path portion (remove base URL)
      let pathOnly = urlPath;
      try {
        if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
          pathOnly = new URL(urlPath).pathname;
        }
      } catch { /* keep urlPath */ }

      const matchingRoute = this.discoveredRoutes.find(route => {
        const methodMatches = route.method.toUpperCase() === method.toUpperCase();
        // Use unified path matching - handles all parameter formats and concrete IDs
        return methodMatches && matchesPathTemplate(route.path, pathOnly);
      });

      if (!matchingRoute) {
        // SAFE REPAIR: Try suffix matching (e.g. /items matches discovered /api/items)
        const normalizedPath = pathOnly.replace(/\/$/, '');
        const suffixMatches = this.discoveredRoutes.filter(route => {
          if (route.method.toUpperCase() !== method.toUpperCase()) return false;
          const candidatePath = route.path.replace(/\/$/, '');
          return candidatePath.endsWith(normalizedPath) && candidatePath !== normalizedPath;
        });

        if (suffixMatches.length !== 1) {
          return {
            ready: false,
            reason: `UNCERTAIN: Route ${method.toUpperCase()} ${pathOnly} does not match any discovered route. This may indicate a typo, undiscovered endpoint, or incorrect test generation.`
          };
        }
        // Single unambiguous suffix match — accept it
        logger.debug(`Safe prefix repair in readiness check: ${pathOnly} accepted via ${suffixMatches[0].path}`);
      }
    }

    // Check 5.5: Guessed ID detection (Gap 2)
    const guessedIDCheck = this.detectGuessedID(url, method, normalized.originalTestCase);
    if (guessedIDCheck.hasGuessedID) {
      logger.warn(
        'Test has guessed ID',
        `Test: ${normalized.config.name}, URL: ${url}, Method: ${method}, Reason: ${guessedIDCheck.reason}`
      );
      return {
        ready: false,
        reason: `UNCERTAIN: ${guessedIDCheck.reason || 'URL contains guessed ID without setup'}`
      };
    }

    // Check 6: Valid expected status code
    const expectedStatus = (config as ExtendedAPITestConfig).expectedStatus ||
                          config.assertions?.find(a => a.type === AssertionType.STATUS_CODE)?.expected;
    
    if (expectedStatus !== undefined) {
      const statusNum = typeof expectedStatus === 'number' ? expectedStatus : parseInt(String(expectedStatus), 10);
      if (isNaN(statusNum) || statusNum < 100 || statusNum > 599) {
        return {
          ready: false,
          reason: `TRACEQA_GENERATION_ISSUE: Invalid expected status code: ${expectedStatus}. Must be a valid HTTP status code (100-599).`
        };
      }
    }

    // Check 7 & 8: Body validation for methods that require it
    if ([HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(method as HTTPMethod)) {
      // Try to get route and schema
      const route = this.matchRoute(url, method as HTTPMethod);
      
      if (route?.requestSchema && this.openApiSpec) {
        // Schema is available - validate body
        if (!body) {
          return {
            ready: false,
            reason: `UNCERTAIN: ${method} request requires a body but none was provided. Schema is available but body generation failed.`
          };
        }

        // Validate body against schema
        const validation = validateAndCorrectBody(
          body,
          route.requestSchema,
          this.openApiSpec
        );

        if (!validation.valid) {
          return {
            ready: false,
            reason: `UNCERTAIN: Request body does not match schema requirements: ${validation.errors.join(', ')}`
          };
        }
      } else if (!body) {
        // No schema available, but body is missing for a method that typically needs one
        logger.warn(`${method} request has no body and no schema available for validation`);
        // Don't mark as not ready - the API might accept empty body
      }
    }

    // All validation checks passed
    return { ready: true };
  }
}

/**
 * Create a test normalizer instance
 */
export function createTestNormalizer(options: NormalizationOptions = {}): TestNormalizer {
  return new TestNormalizer(options);
}

// Made with Bob