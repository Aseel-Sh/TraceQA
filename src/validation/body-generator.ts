/**
 * Generic Request Body Generator
 * 
 * Implements intelligent request body generation with fallback logic for REST APIs.
 * Supports OpenAPI schemas, config sample data, field inference, and generic fallbacks.
 * 
 * @module body-generator
 */

import type {
  QATask,
  AcceptanceCriterion,
  TraceQAConfig,
  DiscoveredRoute,
} from '../types/index.js';

/**
 * Result of body generation with metadata
 */
export interface BodyGenerationResult {
  /** Generated request body or null if generation failed */
  body: Record<string, any> | null;
  /** Source of the generated body */
  source: 'openapi' | 'ibm' | 'config' | 'inferred' | 'generic_fallback';
  /** Confidence level in the generated body */
  confidence: 'high' | 'medium' | 'low';
  /** Warnings about potential issues */
  warnings: string[];
}

/**
 * Context for stateful test data management
 */
export interface TestDataContext {
  /** Data from setup step */
  setupData: Record<string, any>;
  /** Unique test identifier */
  testId: string;
  /** Timestamp for unique data generation */
  timestamp: string;
}

/**
 * Scenario types for body generation
 * Generic scenarios only—no business-specific concepts
 * Concrete scenarios like 'weak_password', 'invalid_email' are not universal
 * Those are inferred by IBM based on actual validation rules in the codebase
 */
export type BodyScenario =
  | 'valid'
  | 'invalid';

/**
 * Main function to generate request body with intelligent fallback logic
 * 
 * Priority order:
 * 1. OpenAPI request schema
 * 2. IBM suggested body (if valid)
 * 3. Config sample data
 * 4. Inferred fields from context
 * 5. Generic fallback
 * 
 * @param method - HTTP method (POST, PUT, PATCH, etc.)
 * @param route - Discovered route information
 * @param task - QA task being executed
 * @param acceptanceCriterion - Acceptance criterion being tested
 * @param config - TraceQA configuration
 * @param openApiSpec - Optional OpenAPI specification
 * @param ibmSuggestedBody - Optional IBM-suggested body
 * @returns Body generation result with metadata
 */
export function generateRequestBody(
  method: string,
  route: DiscoveredRoute | null,
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  config: TraceQAConfig,
  openApiSpec?: any,
  ibmSuggestedBody?: any
): BodyGenerationResult {
  const warnings: string[] = [];
  const testId = task.taskId;
  const timestamp = Date.now().toString();

  // Methods that typically don't need a body
  const noBodyMethods = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];
  if (noBodyMethods.includes(method.toUpperCase())) {
    return {
      body: null,
      source: 'generic_fallback',
      confidence: 'high',
      warnings: [],
    };
  }

  // Determine scenario from task and acceptance criterion
  const scenario = inferScenario(task, acceptanceCriterion);

  // Priority 1: OpenAPI schema
  if (openApiSpec && route) {
    const openApiBody = generateBodyFromOpenAPISchema(
      openApiSpec,
      route.method,
      route.path,
      scenario,
      testId,
      timestamp
    );
    if (openApiBody && Object.keys(openApiBody).length > 0) {
      return {
        body: openApiBody,
        source: 'openapi',
        confidence: 'high',
        warnings,
      };
    }
  }

  // Priority 2: IBM suggested body (if valid)
  if (ibmSuggestedBody && typeof ibmSuggestedBody === 'object') {
    const keys = Object.keys(ibmSuggestedBody);
    if (keys.length > 0) {
      // Apply scenario modifications to IBM body
      const modifiedBody = generateBodyForScenario(
        scenario,
        ibmSuggestedBody,
        task,
        testId,
        timestamp
      );
      return {
        body: modifiedBody,
        source: 'ibm',
        confidence: 'high',
        warnings,
      };
    }
  }

  // Priority 3: Config sample data
  if (config.sampleData) {
    const configBody = generateBodyFromConfig(
      config,
      scenario,
      task,
      testId,
      timestamp
    );
    if (configBody && Object.keys(configBody).length > 0) {
      return {
        body: configBody,
        source: 'config',
        confidence: 'medium',
        warnings,
      };
    }
  }

  // Priority 4: Inferred fields from context
  const inferredFields = inferFieldsFromContext(
    task,
    acceptanceCriterion,
    route,
    testId,
    timestamp
  );
  if (inferredFields && Object.keys(inferredFields).length > 0) {
    const scenarioBody = generateBodyForScenario(
      scenario,
      inferredFields,
      task,
      testId,
      timestamp
    );
    
    warnings.push(
      'Body generated from context inference - may not match actual API requirements'
    );
    
    return {
      body: scenarioBody,
      source: 'inferred',
      confidence: 'medium',
      warnings,
    };
  }

  // Priority 5: Generic fallback
  warnings.push('Using generic fallback body - likely insufficient for actual API');
  warnings.push('Consider adding OpenAPI spec or sample data to config');
  
  const fallbackBody = generateGenericFallback(scenario, testId, timestamp);
  
  return {
    body: fallbackBody,
    source: 'generic_fallback',
    confidence: 'low',
    warnings,
  };
}

/**
 * Infer test scenario from task and acceptance criterion
 * ONLY supports generic valid/invalid determination
 * Business-specific scenario logic (e.g., "what makes input invalid for this app?")
 * must come from IBM reasoning based on actual source code and validation rules
 */
function inferScenario(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion
): BodyScenario {
  const text = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();

  // Only check for explicit rejection/failure language
  if (text.includes('reject') || text.includes('invalid') || text.includes('fail') || 
      text.includes('error') || text.includes('cannot') || text.includes('should not')) {
    return 'invalid';
  }

  // Otherwise assume valid scenario
  return 'valid';
}

/**
 * Generate body from OpenAPI schema
 * 
 * @param openApiSpec - OpenAPI specification object
 * @param method - HTTP method
 * @param path - API path
 * @param scenario - Test scenario
 * @param testId - Test identifier
 * @param timestamp - Timestamp for unique values
 * @returns Generated body or null
 */
export function generateBodyFromOpenAPISchema(
  openApiSpec: any,
  method: string,
  path: string,
  scenario: BodyScenario,
  testId: string,
  timestamp: string
): Record<string, any> | null {
  try {
    if (!openApiSpec.paths || !openApiSpec.paths[path]) {
      return null;
    }

    const pathItem = openApiSpec.paths[path];
    const operation = pathItem[method.toLowerCase()];
    
    if (!operation || !operation.requestBody) {
      return null;
    }

    const requestBody = operation.requestBody;
    const content = requestBody.content || requestBody;
    
    // Try to get JSON schema
    const jsonSchema =
      content['application/json']?.schema ||
      content.schema ||
      null;

    if (!jsonSchema) {
      return null;
    }

    // Generate body from schema
    const body = generateFromSchema(jsonSchema, openApiSpec, scenario, testId, timestamp);
    return body;
  } catch (error) {
    return null;
  }
}

/**
 * Generate body from JSON schema
 */
function generateFromSchema(
  schema: any,
  openApiSpec: any,
  scenario: BodyScenario,
  testId: string,
  timestamp: string
): Record<string, any> {
  const body: Record<string, any> = {};

  // Resolve $ref if present
  if (schema.$ref) {
    schema = resolveRef(schema.$ref, openApiSpec);
  }

  const properties = schema.properties || {};

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const field = fieldSchema as any;

    // Generate value for all fields
    body[fieldName] = generateFieldValue(
      fieldName,
      field,
      scenario,
      testId,
      timestamp,
      openApiSpec
    );
  }

  return body;
}

/**
 * Resolve OpenAPI $ref
 */
function resolveRef(ref: string, openApiSpec: any): any {
  const parts = ref.split('/').slice(1); // Remove leading #
  let current = openApiSpec;
  
  for (const part of parts) {
    current = current[part];
    if (!current) return {};
  }
  
  return current;
}

/**
 * Generate value for a specific field based on schema
 * Schema-driven generation only—no hardcoded field name pattern matching
 */
function generateFieldValue(
  fieldName: string,
  fieldSchema: any,
  _scenario: BodyScenario,
  testId: string,
  _timestamp: string,
  openApiSpec?: any
): any {
  // Resolve $ref if present
  if (fieldSchema.$ref && openApiSpec) {
    fieldSchema = resolveRef(fieldSchema.$ref, openApiSpec);
  }

  const type = fieldSchema.type;
  const format = fieldSchema.format;

  // Handle enum values—always use first valid option
  if (fieldSchema.enum && fieldSchema.enum.length > 0) {
    return fieldSchema.enum[0];
  }

  // Handle arrays
  if (type === 'array') {
    const itemSchema = fieldSchema.items || {};
    const item = generateFieldValue(
      fieldName,
      itemSchema,
      'valid',
      testId,
      _timestamp,
      openApiSpec
    );
    return [item];
  }

  // Handle objects
  if (type === 'object') {
    return generateFromSchema(fieldSchema, openApiSpec || {}, 'valid', testId, _timestamp);
  }

  // Handle format-based generation
  if (format === 'email') {
    return `user-${testId}@example.com`;
  }
  if (format === 'date-time' || format === 'date') {
    return new Date().toISOString();
  }
  if (format === 'uri' || format === 'url') {
    return 'https://example.com';
  }
  if (format === 'uuid') {
    return `${testId}`;
  }

  // Handle by type only—no field name pattern matching
  if (type === 'string') {
    // Generic string—use field name as part of value for traceability
    return `${fieldName}-${testId}`;
  }
  if (type === 'number' || type === 'integer') {
    return generateNumberValue(fieldName, fieldSchema);
  }
  if (type === 'boolean') {
    return true;
  }

  // Default fallback
  return `${fieldName}-${testId}`;
}

/**
 * Generate number value based on schema constraints only
 * No field name pattern matching
 */
function generateNumberValue(_fieldName: string, fieldSchema: any): number {
  // Check schema constraints
  const min = fieldSchema.minimum ?? fieldSchema.min;
  const max = fieldSchema.maximum ?? fieldSchema.max;

  // Use schema constraints if available
  if (min !== undefined && max !== undefined) {
    return min + ((max - min) / 2);
  }
  if (min !== undefined) {
    return min + 1;
  }
  if (max !== undefined) {
    return Math.floor(max / 2);
  }

  return fieldSchema.type === 'integer' ? 1 : 1.0;
}

/**
 * Generate body from config sample data
 * Generic approach: use any available sample data without business-specific field names
 */
function generateBodyFromConfig(
  config: TraceQAConfig,
  _scenario: BodyScenario,
  _task: QATask,
  _testId: string,
  _timestamp: string
): Record<string, any> | null {
  if (!config.sampleData || typeof config.sampleData !== 'object') {
    return null;
  }

  const sampleData = config.sampleData;
  
  // Try to find any sample object in config that can be used as-is
  for (const [_key, value] of Object.entries(sampleData)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Found a sample object—use it directly
      return { ...value };
    }
  }

  return null;
}

/**
 * Infer fields from task context, acceptance criteria, and route
 * VERY conservative—only use schema and setup data, not keyword matching
 */
export function inferFieldsFromContext(
  _task: QATask,
  _acceptanceCriterion: AcceptanceCriterion,
  _route: DiscoveredRoute | null,
  _testId: string,
  _timestamp: string
): Record<string, any> {
  // Conservative: do not invent fields based on keyword matching
  // Fields should come from OpenAPI/schema or setup data, not guessing
  return {};
}

/**
 * Generate body for specific test scenario
 * ONLY valid/invalid now—no business-specific scenarios
 */
export function generateBodyForScenario(
  scenario: BodyScenario,
  baseFields: Record<string, any>,
  _task: QATask,
  _testId: string,
  _timestamp: string
): Record<string, any> {
  const body = { ...baseFields };

  // Only handle generic valid/invalid determination
  // Business-specific invalid data generation (what makes this request invalid for THIS API?)
  // must come from IBM reasoning based on actual validation code
  if (scenario === 'valid') {
    // Use base fields as-is
    return body;
  }

  if (scenario === 'invalid') {
    // Very conservative: we cannot know what makes this invalid without understanding the app
    // Return a modified body with minimal changes (e.g., remove required-looking field)
    // But prefer to mark as uncertain and let IBM decide
    // For now, if scenario is invalid and we have nothing else, return original
    // The confidence scoring will catch this as uncertain
    return body;
  }

  return body;
}

/**
 * Generate stateful body for multi-step tests
 * SIMPLIFIED: no hardcoded business logic around email/password
 */
export function generateStatefulBody(
  _step: 'setup' | 'action' | 'conflict',
  context: TestDataContext,
  baseBody: Record<string, any>
): Record<string, any> {
  const body = { ...baseBody };

  // Store for later use by other steps
  Object.assign(context.setupData, body);

  return body;
}

/**
 * Generate generic fallback body when no other source is available
 */
function generateGenericFallback(
  _scenario: BodyScenario,
  testId: string,
  _timestamp: string
): Record<string, any> {
  // Minimal generic placeholder—makes clear this is a fallback
  return {
    data: `generated-test-${testId}`,
  };
}

/**
 * Validate generated body and add warnings
 * 
 * @param body - Generated body
 * @param method - HTTP method
 * @param route - Route information
 * @returns Array of validation warnings
 */
export function validateGeneratedBody(
  body: Record<string, any> | null,
  method: string,
  _route: DiscoveredRoute | null
): string[] {
  const warnings: string[] = [];

  // Check if body is needed but missing
  const bodyMethods = ['POST', 'PUT', 'PATCH'];
  if (bodyMethods.includes(method.toUpperCase())) {
    if (!body || Object.keys(body).length === 0) {
      warnings.push(`${method} request typically requires a body, but none was generated`);
    }
  }

  // Check for minimal fields
  if (body && Object.keys(body).length < 2) {
    warnings.push('Generated body has very few fields - may be insufficient');
  }

  // Check for generic values
  if (body) {
    const hasGenericValues = Object.values(body).some(
      (value) => typeof value === 'string' && value.includes('TraceQA')
    );
    if (hasGenericValues) {
      warnings.push('Body contains generic placeholder values');
    }
  }

  return warnings;
}

// Made with Bob
