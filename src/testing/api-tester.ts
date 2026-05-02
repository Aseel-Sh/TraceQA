/**
 * API Tester
 * Comprehensive API testing implementation with support for various HTTP methods,
 * authentication, assertions, and retry logic
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  APITestConfig,
  APIRequest,
  APIResponse,
  APITestResult,
  APIAssertion,
  AssertionType,
  HTTPMethod,
  AuthType,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * API Tester class for testing REST APIs
 */
export class APITester {
  private axiosInstance: AxiosInstance;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;

  constructor(options: {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    headers?: Record<string, string>;
  } = {}) {
    this.defaultTimeout = options.timeout || 30000;
    this.defaultRetries = options.retries || 3;
    this.defaultRetryDelay = options.retryDelay || 1000;

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      timeout: this.defaultTimeout,
      headers: options.headers || {},
      validateStatus: () => true // Don't throw on any status code
    });

    logger.debug('API Tester initialized', {
      baseURL: options.baseURL,
      timeout: this.defaultTimeout
    });
  }

  /**
   * Execute a single API test
   */
  async executeTest(config: APITestConfig): Promise<APITestResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = config.retries ?? this.defaultRetries;

    // Identify non-idempotent HTTP methods that should not be retried after receiving a valid response
    const nonIdempotentMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const isNonIdempotent = nonIdempotentMethods.includes(config.request.method.toUpperCase());

    logger.info(`Executing API test: ${config.name}`);

    // Validate URL before attempting request
    if (!config.request.url || config.request.url.trim() === '') {
      const duration = Date.now() - startTime;
      logger.warn(`API test marked as UNCERTAIN due to missing URL: ${config.name}`);
      
      return {
        testName: config.name,
        passed: false,
        request: config.request,
        assertions: [{
          assertion: {
            type: AssertionType.CUSTOM,
            expected: 'valid URL',
            operator: 'equals',
            message: 'Could not execute API test because no endpoint or base URL was available.'
          },
          passed: false,
          message: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available.'
        }],
        error: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available.',
        duration,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };
    }

    while (retryCount <= maxRetries) {
      try {
        // Make the API request
        const response = await this.makeRequest(config.request);

        // Run assertions
        const assertionResults = await this.runAssertions(
          config.assertions,
          response,
          config.request,
          config.acceptableStatuses
        );

        const allPassed = assertionResults.every(r => r.passed);
        const duration = Date.now() - startTime;

        const result: APITestResult = {
          testName: config.name,
          passed: allPassed,
          request: config.request,
          response,
          assertions: assertionResults,
          duration,
          timestamp: new Date().toISOString(),
          retryCount
        };

        if (allPassed) {
          logger.success(`API test passed: ${config.name} (${duration}ms)`);
          return result;
        }

        // Don't retry non-idempotent methods if we got a valid HTTP response
        // Only retry on network errors or for idempotent methods (GET, HEAD, OPTIONS)
        if (isNonIdempotent && response?.status) {
          logger.warn(
            `Not retrying ${config.request.method} ${config.request.url} - non-idempotent method received status ${response.status}`
          );
          logger.error(`API test failed: ${config.name}`);
          return result;
        }

        // If not all passed and we have retries left
        if (retryCount < maxRetries) {
          logger.info(
            `Retrying ${config.request.method} request due to assertion failure (attempt ${retryCount + 1}/${maxRetries}): ${config.name}`
          );
          retryCount++;
          await this.sleep(config.retryDelay || this.defaultRetryDelay);
          continue;
        }

        logger.error(`API test failed: ${config.name}`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Network errors should be retried even for non-idempotent methods
        // since the request may not have reached the server
        if (retryCount < maxRetries) {
          logger.warn(
            `Retrying ${config.request.method} request due to network error (attempt ${retryCount + 1}/${maxRetries}): ${config.name}: ${error instanceof Error ? error.message : String(error)}`
          );
          retryCount++;
          await this.sleep(config.retryDelay || this.defaultRetryDelay);
          continue;
        }

        logger.error(`API test error: ${config.name}`, error);

        return {
          testName: config.name,
          passed: false,
          request: config.request,
          assertions: [],
          error: error instanceof Error ? error.message : String(error),
          duration,
          timestamp: new Date().toISOString(),
          retryCount
        };
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new TraceQAError(
      'Unexpected error in API test execution',
      ErrorCategory.TEST_EXECUTION
    );
  }

  /**
   * Make an API request
   */
  async makeRequest(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();

    // Validate URL before making request
    if (!request.url || request.url.trim() === '') {
      throw new TraceQAError(
        'Invalid or missing URL',
        ErrorCategory.CONFIGURATION
      );
    }

    try {
      // Build axios config
      const config: AxiosRequestConfig = {
        method: request.method,
        url: request.url,
        headers: { ...request.headers },
        params: request.params,
        timeout: request.timeout || this.defaultTimeout,
        validateStatus: () => true
      };

      // Add authentication
      if (request.auth) {
        this.addAuthentication(config, request.auth);
      }

      // Add body for methods that support it
      if (
        request.body &&
        [HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(request.method)
      ) {
        config.data = request.body;
        
        // CRITICAL FIX: Add Content-Type header for JSON bodies
        if (!config.headers) {
          config.headers = {};
        }
        if (!config.headers['Content-Type'] && !config.headers['content-type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }

      // SSL validation
      if (request.validateSSL === false) {
        config.httpsAgent = new (await import('https')).Agent({
          rejectUnauthorized: false
        });
      }

      logger.debug(`Making ${request.method} request to ${request.url}`);

      // Make the request
      const response: AxiosResponse = await this.axiosInstance.request(config);

      const duration = Date.now() - startTime;

      logger.debug(
        `Request completed: ${response.status} ${response.statusText} (${duration}ms)`
      );

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: response.data,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Request failed', error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with error status
          return {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers as Record<string, string>,
            body: error.response.data,
            duration,
            timestamp: new Date().toISOString()
          };
        }
      }

      throw new TraceQAError(
        `API request failed: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCategory.NETWORK,
        error
      );
    }
  }

  /**
   * Add authentication to request config
   */
  private addAuthentication(
    config: AxiosRequestConfig,
    auth: APIRequest['auth']
  ): void {
    if (!auth || auth.type === AuthType.NONE) {
      return;
    }

    switch (auth.type) {
      case AuthType.BEARER:
        if (auth.token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${auth.token}`
          };
        }
        break;

      case AuthType.BASIC:
        if (auth.username && auth.password) {
          config.auth = {
            username: auth.username,
            password: auth.password
          };
        }
        break;

      case AuthType.API_KEY:
        if (auth.apiKey && auth.apiKeyHeader) {
          config.headers = {
            ...config.headers,
            [auth.apiKeyHeader]: auth.apiKey
          };
        }
        break;

      case AuthType.CUSTOM:
        if (auth.customHeaders) {
          config.headers = {
            ...config.headers,
            ...auth.customHeaders
          };
        }
        break;
    }
  }

  /**
   * Run all assertions on a response
   */
  private async runAssertions(
    assertions: APIAssertion[],
    response: APIResponse,
    request: APIRequest,
    acceptableStatuses?: number[]
  ): Promise<Array<{ assertion: APIAssertion; passed: boolean; message: string }>> {
    const results: Array<{ assertion: APIAssertion; passed: boolean; message: string }> = [];

    for (const assertion of assertions) {
      try {
        const result = await this.runAssertion(assertion, response, request, acceptableStatuses);
        results.push(result);

        if (result.passed) {
          logger.debug(`Assertion passed: ${assertion.type}`);
        } else {
          logger.warn(`Assertion failed: ${result.message}`);
        }
      } catch (error) {
        logger.error(`Assertion error: ${assertion.type}`, error);
        results.push({
          assertion,
          passed: false,
          message: `Assertion error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return results;
  }

  /**
   * Run a single assertion
   */
  private async runAssertion(
    assertion: APIAssertion,
    response: APIResponse,
    _request: APIRequest,
    acceptableStatuses?: number[]
  ): Promise<{ assertion: APIAssertion; passed: boolean; message: string }> {
    let passed = false;
    let message = '';

    switch (assertion.type) {
      case AssertionType.STATUS_CODE:
        // Use acceptableStatuses if provided, otherwise fall back to assertion.expected
        const statusesToCheck = acceptableStatuses && acceptableStatuses.length > 0
          ? acceptableStatuses
          : (assertion.expected ? [assertion.expected as number] : [200]);
        
        passed = statusesToCheck.includes(response.status);
        message = passed
          ? `Status ${response.status} is acceptable (expected one of: ${statusesToCheck.join(', ')})`
          : `Expected status to be one of [${statusesToCheck.join(', ')}], but got ${response.status}`;
        break;

      case AssertionType.HEADER:
        if (assertion.path) {
          const headerValue = response.headers[assertion.path.toLowerCase()];
          passed = this.compareValues(headerValue, assertion.expected, assertion.operator);
          message = passed
            ? `Header ${assertion.path} matches expected value`
            : `Header ${assertion.path} does not match: expected ${assertion.expected}, got ${headerValue}`;
        }
        break;

      case AssertionType.BODY_CONTAINS:
        const bodyStr = JSON.stringify(response.body);
        const expectedStr = String(assertion.expected);
        passed = bodyStr.includes(expectedStr);
        message = passed
          ? `Body contains "${expectedStr}"`
          : `Body does not contain "${expectedStr}"`;
        break;

      case AssertionType.BODY_EQUALS:
        passed = JSON.stringify(response.body) === JSON.stringify(assertion.expected);
        message = passed
          ? 'Body equals expected value'
          : 'Body does not equal expected value';
        break;

      case AssertionType.BODY_MATCHES:
        if (typeof assertion.expected === 'string') {
          const regex = new RegExp(assertion.expected);
          passed = regex.test(JSON.stringify(response.body));
          message = passed
            ? `Body matches pattern ${assertion.expected}`
            : `Body does not match pattern ${assertion.expected}`;
        }
        break;

      case AssertionType.JSON_PATH:
        if (assertion.path) {
          const value = this.getJsonPath(response.body, assertion.path);
          passed = this.compareValues(value, assertion.expected, assertion.operator);
          message = passed
            ? `JSON path ${assertion.path} matches expected value`
            : `JSON path ${assertion.path} does not match: expected ${assertion.expected}, got ${value}`;
        }
        break;

      case AssertionType.RESPONSE_TIME:
        if (typeof assertion.expected === 'number') {
          passed = response.duration < assertion.expected;
          message = passed
            ? `Response time ${response.duration}ms is within limit`
            : `Response time ${response.duration}ms exceeds limit of ${assertion.expected}ms`;
        }
        break;

      case AssertionType.CUSTOM:
        // Custom assertions would be handled by user-provided functions
        message = assertion.message || 'Custom assertion not implemented';
        break;

      default:
        message = `Unknown assertion type: ${assertion.type}`;
    }

    return { assertion, passed, message };
  }

  /**
   * Compare values based on operator
   */
  private compareValues(
    actual: unknown,
    expected: unknown,
    operator: APIAssertion['operator'] = 'equals'
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;

      case 'matches':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return new RegExp(expected).test(actual);
        }
        return false;

      case 'lessThan':
        if (typeof actual === 'number' && typeof expected === 'number') {
          return actual < expected;
        }
        return false;

      case 'greaterThan':
        if (typeof actual === 'number' && typeof expected === 'number') {
          return actual > expected;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get value from JSON path (simple implementation)
   */
  private getJsonPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Execute multiple API tests
   */
  async executeTests(configs: APITestConfig[]): Promise<APITestResult[]> {
    logger.info(`Executing ${configs.length} API tests...`);

    const results: APITestResult[] = [];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      logger.info(`[${i + 1}/${configs.length}] ${config.name}`);

      const result = await this.executeTest(config);
      results.push(result);

      // Check if we should continue on failure
      if (!result.passed && !config.continueOnFailure) {
        logger.warn('Stopping test execution due to failure');
        break;
      }
    }

    const passed = results.filter(r => r.passed).length;
    logger.success(
      `API tests completed: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`
    );

    return results;
  }

  /**
   * Set default headers for all requests
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.axiosInstance.defaults.headers.common = {
      ...this.axiosInstance.defaults.headers.common,
      ...headers
    };
    logger.debug('Default headers updated', headers);
  }

  /**
   * Set base URL for all requests
   */
  setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
    logger.debug('Base URL updated', baseURL);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create an API tester instance
 */
export function createAPITester(options?: {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}): APITester {
  return new APITester(options);
}

// Made with Bob