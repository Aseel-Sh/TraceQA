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
 */
export type BodyScenario =
  | 'valid'
  | 'invalid'
  | 'duplicate'
  | 'missing_field'
  | 'weak_password'
  | 'invalid_email'
  | 'unauthorized'
  | 'conflict';

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
 */
function inferScenario(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion
): BodyScenario {
  const text = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();

  if (text.includes('invalid email') || text.includes('malformed email')) {
    return 'invalid_email';
  }
  if (text.includes('weak password') || text.includes('short password')) {
    return 'weak_password';
  }
  if (text.includes('duplicate') || text.includes('already exists')) {
    return 'duplicate';
  }
  if (text.includes('missing') || text.includes('required field')) {
    return 'missing_field';
  }
  if (text.includes('unauthorized') || text.includes('not authorized')) {
    return 'unauthorized';
  }
  if (text.includes('conflict')) {
    return 'conflict';
  }
  if (text.includes('invalid') || text.includes('error') || text.includes('fail')) {
    return 'invalid';
  }

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
  const required = schema.required || [];

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const field = fieldSchema as any;
    const isRequired = required.includes(fieldName);

    // Skip non-required fields for missing_field scenario
    if (scenario === 'missing_field' && isRequired) {
      continue;
    }

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
 */
function generateFieldValue(
  fieldName: string,
  fieldSchema: any,
  scenario: BodyScenario,
  testId: string,
  timestamp: string,
  openApiSpec?: any
): any {
  // Resolve $ref if present
  if (fieldSchema.$ref && openApiSpec) {
    fieldSchema = resolveRef(fieldSchema.$ref, openApiSpec);
  }

  const type = fieldSchema.type;
  const format = fieldSchema.format;
  const fieldLower = fieldName.toLowerCase();

  // Handle enum values
  if (fieldSchema.enum && fieldSchema.enum.length > 0) {
    return fieldSchema.enum[0];
  }

  // Handle arrays
  if (type === 'array') {
    const itemSchema = fieldSchema.items || {};
    const item = generateFieldValue(
      fieldName,
      itemSchema,
      scenario,
      testId,
      timestamp,
      openApiSpec
    );
    return [item];
  }

  // Handle objects
  if (type === 'object') {
    return generateFromSchema(fieldSchema, openApiSpec || {}, scenario, testId, timestamp);
  }

  // Handle specific formats
  if (format === 'email') {
    return generateEmailValue(fieldName, scenario, testId, timestamp);
  }
  if (format === 'date-time' || format === 'date') {
    return new Date().toISOString();
  }
  if (format === 'uri' || format === 'url') {
    return 'https://example.com';
  }
  if (format === 'uuid') {
    return `${testId}-${timestamp}`;
  }

  // Handle by field name patterns
  if (fieldLower.includes('email')) {
    return generateEmailValue(fieldName, scenario, testId, timestamp);
  }
  if (fieldLower.includes('password')) {
    return generatePasswordValue(fieldName, scenario);
  }

  // Handle by type
  if (type === 'string') {
    return generateStringValue(fieldName, scenario, testId, timestamp);
  }
  if (type === 'number' || type === 'integer') {
    return generateNumberValue(fieldName, fieldSchema);
  }
  if (type === 'boolean') {
    return scenario === 'valid';
  }

  // Default fallback
  return `${fieldName}_${testId}`;
}

/**
 * Generate email value based on scenario
 */
function generateEmailValue(
  fieldName: string,
  scenario: BodyScenario,
  testId: string,
  timestamp: string
): string {
  if (scenario === 'invalid_email' || scenario === 'invalid') {
    return 'invalid-email';
  }
  return `traceqa-${testId}-${timestamp}@example.com`;
}

/**
 * Generate password value based on scenario
 */
function generatePasswordValue(fieldName: string, scenario: BodyScenario): string {
  if (scenario === 'weak_password') {
    return 'weak';
  }
  if (scenario === 'invalid') {
    return '123';
  }
  return 'StrongPassword123!';
}

/**
 * Generate string value based on field name
 */
function generateStringValue(
  fieldName: string,
  scenario: BodyScenario,
  testId: string,
  timestamp: string
): string {
  const fieldLower = fieldName.toLowerCase();

  if (fieldLower.includes('name') || fieldLower.includes('title') || fieldLower.includes('label')) {
    return `TraceQA ${testId}`;
  }
  if (fieldLower.includes('bio') || fieldLower.includes('description') || fieldLower.includes('comment')) {
    return 'Generated by TraceQA for automated testing';
  }
  if (fieldLower.includes('phone')) {
    return '+1-555-0100';
  }
  if (fieldLower.includes('address')) {
    return '123 TraceQA Street';
  }
  if (fieldLower.includes('city')) {
    return 'TestCity';
  }
  if (fieldLower.includes('state') || fieldLower.includes('province')) {
    return 'TS';
  }
  if (fieldLower.includes('zip') || fieldLower.includes('postal')) {
    return '12345';
  }
  if (fieldLower.includes('country')) {
    return 'US';
  }
  if (fieldLower.includes('url') || fieldLower.includes('website')) {
    return 'https://example.com';
  }
  if (fieldLower.includes('date') || fieldLower.includes('time')) {
    return new Date().toISOString();
  }

  return `${fieldName}_${testId}`;
}

/**
 * Generate number value based on field name and constraints
 */
function generateNumberValue(fieldName: string, fieldSchema: any): number {
  const fieldLower = fieldName.toLowerCase();

  // Check schema constraints
  const min = fieldSchema.minimum ?? fieldSchema.min;
  const max = fieldSchema.maximum ?? fieldSchema.max;

  if (fieldLower.includes('amount') || fieldLower.includes('price') || fieldLower.includes('cost')) {
    if (min !== undefined && max !== undefined) {
      return Math.min(max, Math.max(min, 99.99));
    }
    return 99.99;
  }
  if (fieldLower.includes('count') || fieldLower.includes('quantity')) {
    if (min !== undefined && max !== undefined) {
      return Math.min(max, Math.max(min, 5));
    }
    return 5;
  }
  if (fieldLower.includes('age')) {
    return 25;
  }
  if (fieldLower.includes('percent') || fieldLower.includes('rate')) {
    return 50;
  }

  // Use schema constraints if available
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
 */
function generateBodyFromConfig(
  config: TraceQAConfig,
  scenario: BodyScenario,
  task: QATask,
  testId: string,
  timestamp: string
): Record<string, any> | null {
  if (!config.sampleData) {
    return null;
  }

  const sampleData = config.sampleData;
  let baseBody: Record<string, any> = {};

  // Try to find matching sample data
  if (scenario === 'valid' && sampleData.validUser) {
    baseBody = { ...sampleData.validUser };
  } else if (scenario === 'invalid_email' && sampleData.invalidEmail) {
    baseBody = { email: sampleData.invalidEmail };
  } else if (scenario === 'weak_password' && sampleData.weakPassword) {
    baseBody = { password: sampleData.weakPassword };
  } else {
    // Try to find any matching key in sample data
    const taskLower = task.title.toLowerCase();
    for (const [key, value] of Object.entries(sampleData)) {
      if (taskLower.includes(key.toLowerCase()) && typeof value === 'object') {
        baseBody = { ...value };
        break;
      }
    }
  }

  if (Object.keys(baseBody).length === 0) {
    return null;
  }

  // Apply scenario modifications
  return generateBodyForScenario(scenario, baseBody, task, testId, timestamp);
}

/**
 * Infer fields from task context, acceptance criteria, and route
 */
export function inferFieldsFromContext(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  route: DiscoveredRoute | null,
  testId: string,
  timestamp: string
): Record<string, any> {
  const fields: Record<string, any> = {};
  const text = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();

  // Infer common fields from context
  if (text.includes('email')) {
    fields.email = `traceqa-${testId}-${timestamp}@example.com`;
  }
  if (text.includes('password')) {
    fields.password = 'StrongPassword123!';
  }
  if (text.includes('username') || text.includes('user name')) {
    fields.username = `traceqa_${testId}`;
  }
  if (text.includes('name') && !text.includes('username')) {
    fields.name = `TraceQA ${testId}`;
  }
  if (text.includes('title')) {
    fields.title = `TraceQA Test ${testId}`;
  }
  if (text.includes('description')) {
    fields.description = 'Generated by TraceQA for automated testing';
  }
  if (text.includes('bio')) {
    fields.bio = 'TraceQA automated test user';
  }
  if (text.includes('phone')) {
    fields.phone = '+1-555-0100';
  }
  if (text.includes('address')) {
    fields.address = '123 TraceQA Street';
  }
  if (text.includes('city')) {
    fields.city = 'TestCity';
  }
  if (text.includes('amount') || text.includes('price')) {
    fields.amount = 99.99;
  }
  if (text.includes('quantity') || text.includes('count')) {
    fields.quantity = 5;
  }
  if (text.includes('product')) {
    fields.productId = `prod-${testId}`;
  }
  if (text.includes('order')) {
    fields.orderId = `order-${testId}`;
  }

  // Infer from route path
  if (route) {
    const pathLower = route.path.toLowerCase();
    
    if (pathLower.includes('user') && !fields.email) {
      fields.email = `traceqa-${testId}-${timestamp}@example.com`;
      fields.password = 'StrongPassword123!';
    }
    if (pathLower.includes('order') && !fields.productId) {
      fields.productId = `prod-${testId}`;
      fields.quantity = 1;
    }
    if (pathLower.includes('profile') && !fields.bio) {
      fields.bio = 'TraceQA automated test user';
    }
    if (pathLower.includes('post') || pathLower.includes('article')) {
      fields.title = fields.title || `TraceQA Test ${testId}`;
      fields.content = 'Generated by TraceQA for automated testing';
    }
    if (pathLower.includes('comment')) {
      fields.content = 'TraceQA test comment';
    }
  }

  // Use setup data if available
  if (task.setupData && Object.keys(task.setupData).length > 0) {
    Object.assign(fields, task.setupData);
  }

  return fields;
}

/**
 * Generate body for specific test scenario
 */
export function generateBodyForScenario(
  scenario: BodyScenario,
  baseFields: Record<string, any>,
  task: QATask,
  testId: string,
  timestamp: string
): Record<string, any> {
  const body = { ...baseFields };

  switch (scenario) {
    case 'valid':
      // Use base fields as-is, ensure unique values
      if (body.email && !body.email.includes(timestamp)) {
        body.email = `traceqa-${testId}-${timestamp}@example.com`;
      }
      break;

    case 'invalid_email':
      if (body.email) {
        body.email = 'invalid-email';
      }
      break;

    case 'weak_password':
      if (body.password) {
        body.password = 'weak';
      }
      break;

    case 'invalid':
      // Make various fields invalid
      if (body.email) {
        body.email = 'invalid-email';
      }
      if (body.password) {
        body.password = '123';
      }
      if (body.amount) {
        body.amount = -1;
      }
      break;

    case 'duplicate':
    case 'conflict':
      // Use setup data to create duplicate
      if (task.setupData && Object.keys(task.setupData).length > 0) {
        Object.assign(body, task.setupData);
      }
      break;

    case 'missing_field':
      // Remove a required field (try to identify one)
      const requiredFields = ['email', 'password', 'name', 'title', 'productId'];
      for (const field of requiredFields) {
        if (body[field]) {
          delete body[field];
          break;
        }
      }
      break;

    case 'unauthorized':
      // Keep body but it will be used without proper auth
      break;
  }

  return body;
}

/**
 * Generate stateful body for multi-step tests
 * 
 * @param step - Test step type (setup, action, conflict)
 * @param context - Test data context
 * @param baseBody - Base body to modify
 * @returns Modified body for the step
 */
export function generateStatefulBody(
  step: 'setup' | 'action' | 'conflict',
  context: TestDataContext,
  baseBody: Record<string, any>
): Record<string, any> {
  const body = { ...baseBody };

  switch (step) {
    case 'setup':
      // Generate unique data for setup
      if (body.email && !body.email.includes(context.timestamp)) {
        body.email = `traceqa-${context.testId}-${context.timestamp}@example.com`;
      }
      if (body.username && !body.username.includes(context.testId)) {
        body.username = `traceqa_${context.testId}`;
      }
      // Store for later use
      Object.assign(context.setupData, body);
      break;

    case 'action':
      // Use different data from setup
      if (body.email) {
        body.email = `traceqa-${context.testId}-action-${context.timestamp}@example.com`;
      }
      break;

    case 'conflict':
      // Reuse exact same data from setup to trigger conflict
      if (context.setupData && Object.keys(context.setupData).length > 0) {
        Object.assign(body, context.setupData);
      }
      break;
  }

  return body;
}

/**
 * Generate generic fallback body when no other source is available
 */
function generateGenericFallback(
  scenario: BodyScenario,
  testId: string,
  timestamp: string
): Record<string, any> {
  const body: Record<string, any> = {
    name: `TraceQA ${testId}`,
    description: 'Generated by TraceQA for automated testing',
  };

  // Add common fields based on scenario
  if (scenario === 'valid') {
    body.email = `traceqa-${testId}-${timestamp}@example.com`;
    body.value = 'test-value';
  } else if (scenario === 'invalid_email') {
    body.email = 'invalid-email';
  } else if (scenario === 'weak_password') {
    body.password = 'weak';
  } else if (scenario === 'invalid') {
    body.email = 'invalid-email';
    body.value = '';
  }

  return body;
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
  route: DiscoveredRoute | null
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
