/**
 * Test Helpers for Integration Tests
 * Provides utility functions for testing TraceQA fixes
 */

import * as fs from 'fs';
import * as path from 'path';

// Test result tracking
export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  startTest(name: string, category: string): void {
    this.startTime = Date.now();
    console.log(`\n🧪 Testing: ${name}`);
  }

  passTest(name: string, category: string): void {
    const duration = Date.now() - this.startTime;
    this.results.push({ name, category, passed: true, duration });
    console.log(`✅ PASSED: ${name} (${duration}ms)`);
  }

  failTest(name: string, category: string, error: string): void {
    const duration = Date.now() - this.startTime;
    this.results.push({ name, category, passed: false, error, duration });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error}`);
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    categories: Record<string, { passed: number; failed: number }>;
  } {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      categories: {} as Record<string, { passed: number; failed: number }>
    };

    // Group by category
    for (const result of this.results) {
      if (!summary.categories[result.category]) {
        summary.categories[result.category] = { passed: 0, failed: 0 };
      }
      if (result.passed) {
        summary.categories[result.category].passed++;
      } else {
        summary.categories[result.category].failed++;
      }
    }

    return summary;
  }

  printSummary(): void {
    const summary = this.getSummary();
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    
    console.log('\nResults by Category:');
    for (const [category, stats] of Object.entries(summary.categories)) {
      console.log(`  ${category}:`);
      console.log(`    ✅ Passed: ${stats.passed}`);
      console.log(`    ❌ Failed: ${stats.failed}`);
    }

    if (summary.failed > 0) {
      console.log('\nFailed Tests:');
      for (const result of this.results.filter(r => !r.passed)) {
        console.log(`  ❌ ${result.name}`);
        console.log(`     ${result.error}`);
      }
    }
    console.log('='.repeat(60));
  }
}

// Assertion helpers
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    const msg = message || `Expected ${expected}, got ${actual}`;
    throw new Error(msg);
  }
}

export function assertDeepEqual(actual: any, expected: any, message?: string): void {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  if (actualStr !== expectedStr) {
    const msg = message || `Objects not equal:\nExpected: ${expectedStr}\nActual: ${actualStr}`;
    throw new Error(msg);
  }
}

export function assertContains(array: any[], item: any, message?: string): void {
  if (!array.includes(item)) {
    const msg = message || `Array does not contain ${item}`;
    throw new Error(msg);
  }
}

export function assertMatches(value: string, pattern: RegExp, message?: string): void {
  if (!pattern.test(value)) {
    const msg = message || `"${value}" does not match pattern ${pattern}`;
    throw new Error(msg);
  }
}

export function assertThrows(fn: () => void, message?: string): void {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    // Expected
  }
}

export function assertGreaterThan(actual: number, expected: number, message?: string): void {
  if (actual <= expected) {
    const msg = message || `Expected ${actual} to be greater than ${expected}`;
    throw new Error(msg);
  }
}

export function assertLessThan(actual: number, expected: number, message?: string): void {
  if (actual >= expected) {
    const msg = message || `Expected ${actual} to be less than ${expected}`;
    throw new Error(msg);
  }
}

// Fixture loading helpers
export function loadFixture(fixturePath: string): any {
  const fullPath = path.join(__dirname, 'test-fixtures', 'integration', fixturePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

export function loadOpenAPISpec(specName: string): any {
  const specs = loadFixture('openapi-samples.json');
  return specs[specName];
}

export function loadMockResponse(category: string, responseName: string): any {
  const responses = loadFixture('mock-responses.json');
  return responses[category][responseName];
}

export function loadTestScenarios(scenarioType: string): any[] {
  const scenarios = loadFixture('test-scenarios.json');
  return scenarios[scenarioType];
}

// Mock HTTP client for testing
export class MockHttpClient {
  private responses: Map<string, any> = new Map();
  private requestLog: Array<{ method: string; url: string; body?: any; headers?: any }> = [];

  setResponse(key: string, response: any): void {
    this.responses.set(key, response);
  }

  async request(method: string, url: string, options?: { body?: any; headers?: any }): Promise<any> {
    this.requestLog.push({ method, url, body: options?.body, headers: options?.headers });
    
    const key = `${method} ${url}`;
    const response = this.responses.get(key);
    
    if (!response) {
      throw new Error(`No mock response configured for ${key}`);
    }

    // Simulate network error
    if (response.error) {
      const error: any = new Error(response.message);
      error.code = response.code;
      throw error;
    }

    return response;
  }

  getRequestLog(): Array<{ method: string; url: string; body?: any; headers?: any }> {
    return this.requestLog;
  }

  clearRequestLog(): void {
    this.requestLog = [];
  }

  reset(): void {
    this.responses.clear();
    this.requestLog = [];
  }
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateDateTime(dateTime: string): boolean {
  try {
    const date = new Date(dateTime);
    return !isNaN(date.getTime()) && dateTime.includes('T');
  } catch {
    return false;
  }
}

export function validatePattern(value: string, pattern: string): boolean {
  const regex = new RegExp(pattern);
  return regex.test(value);
}

export function validateStringLength(value: string, minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && value.length < minLength) {
    return false;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return false;
  }
  return true;
}

// Schema validation helper
export function validateAgainstSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (schema.type === 'object') {
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties as any)) {
        if (key in data) {
          const value = data[key];
          const result = validateProperty(value, propSchema);
          errors.push(...result.errors);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateProperty(value: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`Type mismatch: expected ${schema.type}, got ${actualType}`);
    }
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`String too short: minimum length is ${schema.minLength}`);
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`String too long: maximum length is ${schema.maxLength}`);
    }
    if (schema.pattern && !validatePattern(value, schema.pattern)) {
      errors.push(`String does not match pattern: ${schema.pattern}`);
    }
    if (schema.format === 'email' && !validateEmail(value)) {
      errors.push('Invalid email format');
    }
    if (schema.format === 'uuid' && !validateUUID(value)) {
      errors.push('Invalid UUID format');
    }
    if (schema.format === 'date-time' && !validateDateTime(value)) {
      errors.push('Invalid date-time format');
    }
  }

  return { valid: errors.length === 0, errors };
}

// Test data generators
export function generateTestEmail(): string {
  return `test${Date.now()}@example.com`;
}

export function generateTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function generateTestString(minLength: number = 5, maxLength: number = 20): string {
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Timing helpers
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}

// Made with Bob
