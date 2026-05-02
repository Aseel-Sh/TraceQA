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
 * Extended API Test Config with acceptable statuses
 */
interface ExtendedAPITestConfig extends APITestConfig {
  acceptableStatuses?: number[];
}

/**
 * Normalization options
 */
export interface NormalizationOptions {
  baseUrl?: string;
  discoveredRoutes?: DiscoveredRoute[];
  strictValidation?: boolean;
}

/**
 * Test Normalizer Class
 * Transforms IBM TestCase objects into validated APITestConfig objects
 */
export class TestNormalizer {
  private baseUrl?: string;
  private discoveredRoutes: DiscoveredRoute[];
  private strictValidation: boolean;

  constructor(options: NormalizationOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.discoveredRoutes = options.discoveredRoutes || [];
    this.strictValidation = options.strictValidation ?? true;

    logger.debug('TestNormalizer initialized', {
      baseUrl: this.baseUrl,
      routeCount: this.discoveredRoutes.length,
      strictValidation: this.strictValidation
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
   * Infer expected status code using generic HTTP semantics
   * Priority: explicit status > HTTP semantics > undefined
   */
  private inferExpectedStatus(testCase: TestCase, endpoint: string, method: HTTPMethod): number | undefined {
    const expectedResult = String(testCase.expectedResult || '').toLowerCase();
    
    // Priority 1: Check for explicit status codes in expectedResult
    const statusMatch = expectedResult.match(/(\d{3})/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }

    // Priority 2: Apply generic HTTP semantics
    return this.inferExpectedStatusFromSemantics(method, testCase, endpoint);
  }

  /**
   * Infer status code from generic HTTP semantics (no route-specific keywords)
   */
  private inferExpectedStatusFromSemantics(
    method: string,
    testCase: any,
    endpoint?: string
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

    // Extract request body
    const body = this.extractBody(step, method);

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
    testCase: TestCase,
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

      // Generate a default URL
      url = this.generateDefaultURL(testCase, context);
      
      return {
        url,
        isValid: false,
        errorType: 'uncertain',
        errorMessage: `UNCERTAIN: No URL found in test case, using generated default: ${url}`
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

    // Validate against discovered routes
    if (this.strictValidation && this.discoveredRoutes.length > 0) {
      const routeMatch = this.matchRoute(normalizedURL, method);
      if (!routeMatch) {
        logger.warn(`URL ${normalizedURL} with method ${method} does not match any discovered routes`);
        // This is not necessarily an error - the route might be valid but not discovered
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
   * Generate a default URL when none is found (generic approach)
   */
  private generateDefaultURL(testCase: TestCase, context: TestContext): string {
    const basePath = this.baseUrl ||
                     (context.buildInfo.port ? `http://localhost:${context.buildInfo.port}` : 'http://localhost:3000');
    
    // Try to infer resource from test name (generic patterns)
    const name = testCase.name.toLowerCase();
    const description = testCase.description.toLowerCase();
    const combined = `${name} ${description}`;
    
    // Extract potential resource names (plural nouns)
    const resourcePatterns = [
      /\b(users?|accounts?|profiles?)\b/,
      /\b(orders?|purchases?|transactions?)\b/,
      /\b(products?|items?|goods?)\b/,
      /\b(posts?|articles?|blogs?)\b/,
      /\b(comments?|reviews?|ratings?)\b/,
      /\b(tasks?|todos?|activities?)\b/,
      /\b(messages?|notifications?|alerts?)\b/,
      /\b(files?|documents?|uploads?)\b/,
      /\b(categories?|tags?|labels?)\b/,
      /\b(settings?|configs?|preferences?)\b/
    ];
    
    for (const pattern of resourcePatterns) {
      const match = combined.match(pattern);
      if (match) {
        const resource = match[1];
        // Pluralize if singular
        const pluralResource = resource.endsWith('s') ? resource : `${resource}s`;
        return `${basePath}/api/${pluralResource}`;
      }
    }

    // Fallback to generic test endpoint
    return `${basePath}/api/test`;
  }

  /**
   * Extract request body from test step
   */
  private extractBody(step: any, method: HTTPMethod): any {
    // Only extract body for methods that support it
    if (![HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(method)) {
      return undefined;
    }

    // Check step.body first (IBM provides this)
    if (step.body) {
      return step.body;
    }

    // Fallback to step.value
    if (step.value) {
      try {
        return JSON.parse(step.value);
      } catch {
        return step.value;
      }
    }

    return undefined;
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
}

/**
 * Create a test normalizer instance
 */
export function createTestNormalizer(options: NormalizationOptions = {}): TestNormalizer {
  return new TestNormalizer(options);
}

// Made with Bob