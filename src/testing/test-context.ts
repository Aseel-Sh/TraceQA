/**
 * Test Context
 * Manages variables and state across multi-step test sequences
 */

import { logger } from '../utils/logger.js';

/**
 * Variable extraction configuration
 */
export interface VariableExtraction {
  /** Name to store the extracted value under */
  name: string;
  /** JSONPath expression to extract value from response */
  path: string;
  /** Source of extraction (body, headers, status) */
  source?: 'body' | 'headers' | 'status';
}

/**
 * Variable substitution result
 */
export interface SubstitutionResult {
  /** The substituted value */
  value: string;
  /** Whether substitution was successful */
  success: boolean;
  /** Any warnings or errors */
  message?: string;
}

/**
 * Test Context class for managing variables between test steps
 */
export class TestContext {
  private variables: Map<string, any> = new Map();
  private metadata: {
    testId: string;
    timestamp: string;
    stepNumber: number;
  };

  constructor(testId: string = 'default') {
    this.metadata = {
      testId,
      timestamp: new Date().toISOString(),
      stepNumber: 0
    };
    
    logger.debug('Test context initialized', { testId });
  }

  /**
   * Set a variable in the context
   */
  set(name: string, value: any): void {
    this.variables.set(name, value);
    logger.debug(`Variable set: ${name}`, { value });
  }

  /**
   * Get a variable from the context
   */
  get(name: string): any {
    const value = this.variables.get(name);
    if (value === undefined) {
      logger.warn(`Variable not found: ${name}`);
    }
    return value;
  }

  /**
   * Check if a variable exists
   */
  has(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Delete a variable from the context
   */
  delete(name: string): boolean {
    const deleted = this.variables.delete(name);
    if (deleted) {
      logger.debug(`Variable deleted: ${name}`);
    }
    return deleted;
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.variables.clear();
    logger.debug('All variables cleared');
  }

  /**
   * Get all variables as an object
   */
  getAll(): Record<string, any> {
    const obj: Record<string, any> = {};
    this.variables.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Get all variable names
   */
  getVariableNames(): string[] {
    return Array.from(this.variables.keys());
  }

  /**
   * Extract value from response using JSONPath-like syntax
   */
  extractValue(obj: any, path: string): any {
    if (!path || path.trim() === '') {
      return obj;
    }

    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        logger.warn(`Cannot extract value: path '${path}' led to null/undefined at '${part}'`);
        return undefined;
      }

      // Handle array indices: field[0] or field[*]
      const arrayMatch = part.match(/^(.+?)\[(\d+|\*)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key];
        
        if (!Array.isArray(current)) {
          logger.warn(`Cannot extract value: '${key}' is not an array`);
          return undefined;
        }

        if (index === '*') {
          // Return entire array for wildcard
          return current;
        } else {
          const idx = parseInt(index, 10);
          if (idx >= current.length) {
            logger.warn(`Array index ${idx} out of bounds for '${key}' (length: ${current.length})`);
            return undefined;
          }
          current = current[idx];
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Extract ID from Location header URL
   * Handles formats like: /api/users/123, /users/abc-def-123, https://api.com/items/456
   */
  private extractIdFromLocation(locationUrl: string): string | undefined {
    if (!locationUrl) return undefined;
    
    // Try to extract the last segment of the URL path
    // Remove query string and hash
    const cleanUrl = locationUrl.split('?')[0].split('#')[0];
    
    // Extract last path segment
    const segments = cleanUrl.split('/').filter(s => s.length > 0);
    if (segments.length === 0) return undefined;
    
    const lastSegment = segments[segments.length - 1];
    
    // Return the last segment as the ID
    return lastSegment;
  }

  /**
   * Extract and store value from response
   */
  extractAndStore(response: any, extraction: VariableExtraction): boolean {
    try {
      let source: any;
      
      // Determine source
      switch (extraction.source) {
        case 'headers':
          source = response.headers || {};
          break;
        case 'status':
          source = { status: response.status };
          break;
        case 'body':
        default:
          source = response.body || response;
          break;
      }

      let value = this.extractValue(source, extraction.path);
      
      // Special handling for Location header - extract ID from URL
      if (extraction.source === 'headers' &&
          extraction.path.toLowerCase() === 'location' &&
          typeof value === 'string') {
        const extractedId = this.extractIdFromLocation(value);
        if (extractedId) {
          value = extractedId;
          logger.debug(`Extracted ID '${extractedId}' from Location header: ${value}`);
        }
      }
      
      if (value === undefined) {
        logger.warn(`Failed to extract value for '${extraction.name}' from path '${extraction.path}'`);
        return false;
      }

      this.set(extraction.name, value);
      logger.info(`Extracted variable '${extraction.name}' = ${JSON.stringify(value)}`);
      return true;
    } catch (error) {
      logger.error(`Error extracting variable '${extraction.name}'`, error);
      return false;
    }
  }

  /**
   * Substitute variables in a string using {{variableName}} syntax
   */
  substituteString(template: string): SubstitutionResult {
    if (!template || typeof template !== 'string') {
      return { value: template, success: true };
    }

    // Find all variable references: {{variableName}} or ${variableName}
    const variablePattern = /\{\{([^}]+)\}\}|\$\{([^}]+)\}/g;
    const matches = Array.from(template.matchAll(variablePattern));

    if (matches.length === 0) {
      return { value: template, success: true };
    }

    let result = template;
    const missingVars: string[] = [];

    for (const match of matches) {
      const varName = (match[1] || match[2]).trim();
      const fullMatch = match[0];

      if (!this.has(varName)) {
        missingVars.push(varName);
        logger.warn(`Variable '${varName}' not found in context`);
        continue;
      }

      const value = this.get(varName);
      const stringValue = value === null || value === undefined ? '' : String(value);
      result = result.replace(fullMatch, stringValue);
    }

    if (missingVars.length > 0) {
      return {
        value: result,
        success: false,
        message: `Missing variables: ${missingVars.join(', ')}`
      };
    }

    return { value: result, success: true };
  }

  /**
   * Substitute variables in an object (recursively)
   */
  substituteObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      const result = this.substituteString(obj);
      return result.value;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteObject(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteObject(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Increment step number
   */
  incrementStep(): void {
    this.metadata.stepNumber++;
  }

  /**
   * Get current step number
   */
  getStepNumber(): number {
    return this.metadata.stepNumber;
  }

  /**
   * Get test ID
   */
  getTestId(): string {
    return this.metadata.testId;
  }

  /**
   * Get timestamp
   */
  getTimestamp(): string {
    return this.metadata.timestamp;
  }

  /**
   * Get metadata
   */
  getMetadata(): { testId: string; timestamp: string; stepNumber: number } {
    return { ...this.metadata };
  }

  /**
   * Export context state for debugging
   */
  export(): {
    variables: Record<string, any>;
    metadata: { testId: string; timestamp: string; stepNumber: number };
  } {
    return {
      variables: this.getAll(),
      metadata: this.getMetadata()
    };
  }

  /**
   * Import context state
   */
  import(state: {
    variables?: Record<string, any>;
    metadata?: Partial<{ testId: string; timestamp: string; stepNumber: number }>;
  }): void {
    if (state.variables) {
      this.clear();
      Object.entries(state.variables).forEach(([key, value]) => {
        this.set(key, value);
      });
    }

    if (state.metadata) {
      if (state.metadata.testId) this.metadata.testId = state.metadata.testId;
      if (state.metadata.timestamp) this.metadata.timestamp = state.metadata.timestamp;
      if (state.metadata.stepNumber !== undefined) this.metadata.stepNumber = state.metadata.stepNumber;
    }
  }
}

/**
 * Create a new test context
 */
export function createTestContext(testId?: string): TestContext {
  return new TestContext(testId);
}

// Made with Bob
