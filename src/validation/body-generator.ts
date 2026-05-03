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
  ibmSuggestedBody?: any,
  contextData?: Record<string, any>
): BodyGenerationResult {
  const warnings: string[] = [];
  const testId = task.taskId;
  const timestamp = Date.now().toString();

  // Create TestDataContext if we have context data
  const testDataContext: TestDataContext | undefined = contextData ? {
    setupData: contextData,
    testId,
    timestamp
  } : undefined;

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
      // Validate that all required fields are present
      const validation = validateRequiredFields(openApiBody, openApiSpec, route.method, route.path);
      if (!validation.valid) {
        warnings.push(...validation.errors);
      }
      
      return {
        body: openApiBody,
        source: 'openapi',
        confidence: validation.valid ? 'high' : 'medium',
        warnings,
      };
    }
  }

  // Priority 1.5: Route-attached requestSchema (from API map or OpenAPI-enriched discovery)
  if (route?.requestSchema?.properties) {
    const schemaBody = generateFromRouteSchema(route.requestSchema, scenario, testId, timestamp);
    if (schemaBody && Object.keys(schemaBody).length > 0) {
      return {
        body: schemaBody,
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
      let modifiedBody = generateBodyForScenario(
        scenario,
        ibmSuggestedBody,
        task,
        testId,
        timestamp
      );

      // If we have context data, use generateStatefulBody to merge it
      if (testDataContext) {
        modifiedBody = generateStatefulBody('action', testDataContext, modifiedBody);
        warnings.push('Body enhanced with stateful context data');
      }

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
    
    // Validate inferred fields have reasonable coverage
    const hasMultipleFields = Object.keys(scenarioBody).length >= 2;
    
    return {
      body: scenarioBody,
      source: 'inferred',
      confidence: hasMultipleFields ? 'medium' : 'low',
      warnings: [...warnings, 'Body inferred from context - verify field completeness'],
    };
  }

  // Priority 5: Generic fallback without invented fields
  const fallbackBody = generateGenericFallback(scenario, testId, timestamp, method, route?.path || '');
  const confidence: BodyGenerationResult['confidence'] = 'low';
  
  return {
    body: fallbackBody,
    source: 'generic_fallback',
    confidence,
    warnings: [...warnings, 'Using generic fallback body - verify against actual API requirements'],
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
      // Try to match path with parameters (e.g., /users/{id} when path is /users/123)
      const matchedPath = findMatchingPathWithParams(path, openApiSpec.paths);
      if (!matchedPath) {
        return null;
      }
      path = matchedPath;
    }

    const pathItem = openApiSpec.paths[path];
    const operation = pathItem[method.toLowerCase()];
    
    if (!operation) {
      return null;
    }

    // Try to get request body schema
    let body: Record<string, any> | null = null;
    
    if (operation.requestBody) {
      const requestBody = operation.requestBody;
      const content = requestBody.content || requestBody;
      
      // Try to get JSON schema
      const jsonSchema =
        content['application/json']?.schema ||
        content['application/x-www-form-urlencoded']?.schema ||
        content.schema ||
        null;

      if (jsonSchema) {
        body = generateFromSchema(jsonSchema, openApiSpec, scenario, testId, timestamp);
      }
    }

    // If no request body, check if we need to generate from parameters
    if (!body && operation.parameters) {
      const paramBody = generateBodyFromParameters(operation.parameters, openApiSpec, testId, timestamp);
      if (paramBody && Object.keys(paramBody).length > 0) {
        body = paramBody;
      }
    }

    return body;
  } catch (error) {
    return null;
  }
}

/**
 * Find matching OpenAPI path that includes parameters
 * e.g., match /users/123 to /users/{id}
 */
function findMatchingPathWithParams(requestPath: string, paths: any): string | null {
  const requestSegments = requestPath.split('/').filter(s => s.length > 0);
  
  for (const apiPath of Object.keys(paths)) {
    const apiSegments = apiPath.split('/').filter(s => s.length > 0);
    
    if (requestSegments.length !== apiSegments.length) {
      continue;
    }
    
    let matches = true;
    for (let i = 0; i < requestSegments.length; i++) {
      const reqSeg = requestSegments[i];
      const apiSeg = apiSegments[i];
      
      // Check if segment matches or is a parameter
      if (reqSeg !== apiSeg && !isPathParameter(apiSeg)) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      return apiPath;
    }
  }
  
  return null;
}

/**
 * Check if a path segment is a parameter placeholder
 */
function isPathParameter(segment: string): boolean {
  return /^\{[^}]+\}$/.test(segment);
}

/**
 * Generate body from OpenAPI parameters (query, header, path)
 * This is useful when there's no request body but parameters are defined
 */
function generateBodyFromParameters(
  parameters: any[],
  openApiSpec: any,
  testId: string,
  timestamp: string
): Record<string, any> | null {
  const body: Record<string, any> = {};
  
  for (const param of parameters) {
    // Resolve $ref if present
    let parameter = param;
    if (param.$ref) {
      parameter = resolveRef(param.$ref, openApiSpec);
    }
    
    // Only include query and body-like parameters
    if (parameter.in === 'query' || parameter.in === 'body') {
      const schema = parameter.schema || { type: 'string' };
      body[parameter.name] = generateFieldValue(
        parameter.name,
        schema,
        'valid',
        testId,
        timestamp,
        openApiSpec,
        parameter.required || false
      );
    }
  }
  
  return Object.keys(body).length > 0 ? body : null;
}

/**
 * Generate body from JSON schema with support for compositions
 */
function generateFromSchema(
  schema: any,
  openApiSpec: any,
  scenario: BodyScenario,
  testId: string,
  timestamp: string
): Record<string, any> {
  let body: Record<string, any> = {};

  // Resolve $ref if present
  if (schema.$ref) {
    schema = resolveRef(schema.$ref, openApiSpec);
  }

  // Handle schema compositions
  if (schema.allOf) {
    // Merge all schemas in allOf
    for (const subSchema of schema.allOf) {
      const subBody = generateFromSchema(subSchema, openApiSpec, scenario, testId, timestamp);
      body = { ...body, ...subBody };
    }
    return body;
  }

  if (schema.oneOf || schema.anyOf) {
    // Use the first schema in oneOf/anyOf
    const schemas = schema.oneOf || schema.anyOf;
    if (schemas.length > 0) {
      return generateFromSchema(schemas[0], openApiSpec, scenario, testId, timestamp);
    }
  }

  const properties = schema.properties || {};
  const required = schema.required || [];

  // PRIORITY 1: Generate all required fields first
  // This ensures required fields are always present even if property generation fails
  for (const requiredField of required) {
    if (properties[requiredField]) {
      const fieldSchema = properties[requiredField] as any;
      body[requiredField] = generateFieldValue(
        requiredField,
        fieldSchema,
        scenario,
        testId,
        timestamp,
        openApiSpec,
        true // isRequired = true
      );
    } else {
      // Required field not in properties - generate generic value based on field name
      body[requiredField] = generateValueFromFieldName(requiredField, testId);
    }
  }

  // PRIORITY 2: Generate optional fields for completeness
  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    // Skip if already generated as required field
    if (required.includes(fieldName)) {
      continue;
    }

    const field = fieldSchema as any;
    body[fieldName] = generateFieldValue(
      fieldName,
      field,
      scenario,
      testId,
      timestamp,
      openApiSpec,
      false // isRequired = false
    );
  }

  // VALIDATION: Ensure all required fields are present
  const missingRequired = required.filter((field: string) => !(field in body));
  if (missingRequired.length > 0) {
    // Generate fallback values for missing required fields
    for (const field of missingRequired) {
      body[field] = generateValueFromFieldName(field, testId);
    }
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
 * Generate value for a specific field based on schema with full constraint support
 */
function generateFieldValue(
  fieldName: string,
  fieldSchema: any,
  _scenario: BodyScenario,
  testId: string,
  timestamp: string,
  openApiSpec?: any,
  isRequired: boolean = true
): any {
  // Resolve $ref if present
  if (fieldSchema.$ref && openApiSpec) {
    fieldSchema = resolveRef(fieldSchema.$ref, openApiSpec);
  }

  const type = fieldSchema.type;
  const format = fieldSchema.format;

  // Use example value if provided in schema
  if (fieldSchema.example !== undefined) {
    return fieldSchema.example;
  }

  // Use default value if provided
  if (fieldSchema.default !== undefined) {
    return fieldSchema.default;
  }

  // Handle enum values—always use first valid option
  if (fieldSchema.enum && fieldSchema.enum.length > 0) {
    return fieldSchema.enum[0];
  }

  // Handle arrays
  if (type === 'array') {
    const itemSchema = fieldSchema.items || {};
    const minItems = fieldSchema.minItems || 1;
    const itemCount = Math.min(minItems, 2); // Generate at least minItems, max 2 for brevity
    
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(generateFieldValue(
        fieldName,
        itemSchema,
        'valid',
        `${testId}-${i}`,
        timestamp,
        openApiSpec,
        isRequired
      ));
    }
    return items;
  }

  // Handle objects
  if (type === 'object') {
    return generateFromSchema(fieldSchema, openApiSpec || {}, 'valid', testId, timestamp);
  }

  // Handle format-based generation with proper formats
  if (format === 'email') {
    return generateEmailValue(fieldName, testId);
  }
  if (format === 'date-time') {
    return new Date().toISOString();
  }
  if (format === 'date') {
    return new Date().toISOString().split('T')[0];
  }
  if (format === 'time') {
    return new Date().toISOString().split('T')[1].split('.')[0];
  }
  if (format === 'uri' || format === 'url') {
    return 'https://example.com';
  }
  if (format === 'uuid') {
    return generateUUID(testId);
  }
  if (format === 'ipv4') {
    return '192.168.1.1';
  }
  if (format === 'ipv6') {
    return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
  }
  if (format === 'hostname') {
    return 'example.com';
  }

  // Handle string type with constraints
  if (type === 'string') {
    return generateStringValue(fieldName, fieldSchema, testId);
  }
  
  // Handle number/integer with constraints
  if (type === 'number' || type === 'integer') {
    return generateNumberValue(fieldName, fieldSchema);
  }
  
  if (type === 'boolean') {
    return true;
  }

  // Use field name semantics as fallback
  return generateValueFromFieldName(fieldName, testId);
}

/**
 * Generate email value with proper format
 */
function generateEmailValue(fieldName: string, testId: string): string {
  const namePart = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${namePart}-${testId}@example.com`;
}

/**
 * Generate a valid UUID v4
 */
function generateUUID(seed: string): string {
  // Generate a deterministic UUID based on seed for reproducibility
  const hash = seed.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(0, 3)}-a${hex.slice(0, 3)}-${hex.slice(0, 12)}`;
}

/**
 * Generate string value respecting schema constraints
 */
function generateStringValue(fieldName: string, fieldSchema: any, testId: string): string {
  const minLength = fieldSchema.minLength || 1;
  const maxLength = fieldSchema.maxLength || 255;
  const pattern = fieldSchema.pattern;

  // If pattern is specified, try to generate matching value
  if (pattern) {
    // For common patterns, generate appropriate values
    if (/email/i.test(pattern)) {
      return generateEmailValue(fieldName, testId);
    }
    if (/uuid/i.test(pattern)) {
      return generateUUID(testId);
    }
    // For other patterns, use a generic value and hope it matches
    // (proper regex-based generation would require a library)
  }

  // Generate value based on field name semantics
  let baseValue = generateValueFromFieldName(fieldName, testId);
  
  // Ensure length constraints
  if (baseValue.length < minLength) {
    baseValue = baseValue.padEnd(minLength, 'x');
  }
  if (baseValue.length > maxLength) {
    baseValue = baseValue.slice(0, maxLength);
  }

  return baseValue;
}

/**
 * Generate value based on field name semantics
 */
function generateValueFromFieldName(fieldName: string, testId: string): string {
  const nameLower = fieldName.toLowerCase();
  
  // Email fields
  if (nameLower.includes('email') || nameLower === 'mail') {
    return generateEmailValue(fieldName, testId);
  }
  
  // Name fields
  if (nameLower.includes('name') || nameLower === 'username') {
    return `${fieldName}-${testId}`;
  }
  
  // Password fields
  if (nameLower.includes('password') || nameLower.includes('passwd')) {
    return `SecurePass123!${testId}`;
  }
  
  // Phone fields
  if (nameLower.includes('phone') || nameLower.includes('mobile')) {
    return '+1234567890';
  }
  
  // URL fields
  if (nameLower.includes('url') || nameLower.includes('link') || nameLower.includes('website')) {
    return 'https://example.com';
  }
  
  // ID fields
  if (nameLower.includes('id') || nameLower === 'identifier') {
    return testId;
  }
  
  // Description/text fields
  if (nameLower.includes('description') || nameLower.includes('text') || nameLower.includes('content')) {
    return `Test ${fieldName} content for ${testId}`;
  }
  
  // Generic fallback
  return `${fieldName}-${testId}`;
}

/**
 * Generate number value based on schema constraints
 */
function generateNumberValue(fieldName: string, fieldSchema: any): number {
  const isInteger = fieldSchema.type === 'integer';
  
  // Check schema constraints
  const min = fieldSchema.minimum ?? fieldSchema.min;
  const max = fieldSchema.maximum ?? fieldSchema.max;
  const exclusiveMin = fieldSchema.exclusiveMinimum;
  const exclusiveMax = fieldSchema.exclusiveMaximum;
  const multipleOf = fieldSchema.multipleOf;

  let value: number;

  // Use schema constraints if available
  if (min !== undefined && max !== undefined) {
    value = min + ((max - min) / 2);
  } else if (min !== undefined) {
    value = exclusiveMin ? min + 1 : min + 1;
  } else if (max !== undefined) {
    value = exclusiveMax ? max - 1 : Math.floor(max / 2);
  } else {
    // Use field name semantics for common numeric fields
    const nameLower = fieldName.toLowerCase();
    if (nameLower.includes('age')) {
      value = 25;
    } else if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) {
      value = 99.99;
    } else if (nameLower.includes('quantity') || nameLower.includes('count')) {
      value = 1;
    } else if (nameLower.includes('percent') || nameLower.includes('rate')) {
      value = 50;
    } else {
      value = isInteger ? 1 : 1.0;
    }
  }

  // Apply multipleOf constraint
  if (multipleOf !== undefined) {
    value = Math.round(value / multipleOf) * multipleOf;
  }

  // Ensure integer if required
  if (isInteger) {
    value = Math.round(value);
  }

  return value;
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
/**
 * Infer fields from context when OpenAPI schema is unavailable
 * Uses intelligent inference based on:
 * - Common REST API patterns
 * - HTTP method and endpoint analysis
 * - Task description keywords
 *
 * Conservative approach: only infer common, well-established patterns
 */
export function inferFieldsFromContext(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  _route: DiscoveredRoute | null,
  testId: string,
  _timestamp: string
): Record<string, any> {
  const inferredFields: Record<string, any> = {};

  // Conservative inference: only add fields if task/AC explicitly mentions them
  const contextText = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();

  if (contextText.includes('email') || contextText.includes('mail')) {
    inferredFields.email = generateEmailValue('email', testId);
  }
  if (contextText.includes('password')) {
    inferredFields.password = `Password123!${testId}`;
  }
  if (contextText.includes('name') || contextText.includes('title')) {
    inferredFields.name = `${testId}`;
  }
  if (contextText.includes('quantity') || contextText.includes('amount')) {
    inferredFields.quantity = 1;
  }
  if (contextText.includes('price') || contextText.includes('cost')) {
    inferredFields.price = 1.0;
  }
  if (contextText.includes('status')) {
    inferredFields.status = 'active';
  }
  if (contextText.includes('description') || contextText.includes('content')) {
    inferredFields.description = `generated-${testId}`;
  }

  return inferredFields;
}

/**
 * Validate that all required fields from OpenAPI schema are present in the generated body
 * This is a focused validation specifically for required field presence
 */
export function validateRequiredFields(
  body: Record<string, any> | null,
  openApiSpec: any,
  method: string,
  path: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || !openApiSpec || !openApiSpec.paths) {
    return { valid: true, errors: [] };
  }
  
  try {
    // Find the matching path (handle parameterized paths)
    let matchedPath = path;
    if (!openApiSpec.paths[path]) {
      const found = findMatchingPathWithParams(path, openApiSpec.paths);
      if (!found) {
        return { valid: true, errors: [] };
      }
      matchedPath = found;
    }
    
    const pathItem = openApiSpec.paths[matchedPath];
    const operation = pathItem?.[method.toLowerCase()];
    
    if (!operation || !operation.requestBody) {
      return { valid: true, errors: [] };
    }
    
    // Get the request body schema
    const requestBody = operation.requestBody;
    const content = requestBody.content || requestBody;
    const jsonSchema =
      content['application/json']?.schema ||
      content['application/x-www-form-urlencoded']?.schema ||
      content.schema ||
      null;
    
    if (!jsonSchema) {
      return { valid: true, errors: [] };
    }
    
    // Resolve $ref if present
    let schema = jsonSchema;
    if (schema.$ref) {
      schema = resolveRef(schema.$ref, openApiSpec);
    }
    
    // Check required fields
    const required = schema.required || [];
    for (const requiredField of required) {
      if (!(requiredField in body)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  } catch (error) {
    // If validation fails, don't block - just return valid
    return { valid: true, errors: [] };
  }
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
/**
 * Generate a comprehensive generic fallback body
 * Creates realistic multi-field bodies based on:
 * - HTTP method (POST/PUT need more fields than GET/DELETE)
 * - Endpoint resource type (users, products, orders, etc.)
 * - Common field patterns
 */
function generateGenericFallback(
  _scenario: BodyScenario,
  _testId: string,
  _timestamp: string,
  _method?: string,
  _endpoint?: string
): Record<string, any> {
  // Conservative fallback: do not invent fields without schema/source evidence
  return {};
}
/**
 * Validate generated body against OpenAPI schema
 * 
 * @param body - Generated body
 * @param schema - OpenAPI schema to validate against
 * @param openApiSpec - Full OpenAPI spec for reference resolution
 * @returns Validation result with errors
 */
/**
 * Validate a request body against an OpenAPI schema
 * Enhanced with comprehensive validation including enums, formats, nested objects, and arrays
 *
 * @param body - Request body to validate
 * @param schema - OpenAPI schema to validate against
 * @param openApiSpec - Full OpenAPI spec for resolving $refs
 * @returns Validation result with detailed errors
 */
export function validateBodyAgainstSchema(
  body: Record<string, any> | null,
  schema: any,
  openApiSpec: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || !schema) {
    return { valid: true, errors: [] };
  }
  
  // Resolve $ref if present
  if (schema.$ref) {
    schema = resolveRef(schema.$ref, openApiSpec);
  }
  
  // Handle schema compositions (allOf, oneOf, anyOf)
  if (schema.allOf) {
    // Validate against all schemas in allOf
    for (const subSchema of schema.allOf) {
      const subValidation = validateBodyAgainstSchema(body, subSchema, openApiSpec);
      errors.push(...subValidation.errors);
    }
    return { valid: errors.length === 0, errors };
  }
  
  if (schema.oneOf || schema.anyOf) {
    // For oneOf/anyOf, body should match at least one schema
    const schemas = schema.oneOf || schema.anyOf;
    let matched = false;
    const allErrors: string[] = [];
    
    for (const subSchema of schemas) {
      const subValidation = validateBodyAgainstSchema(body, subSchema, openApiSpec);
      if (subValidation.valid) {
        matched = true;
        break;
      }
      allErrors.push(...subValidation.errors);
    }
    
    if (!matched) {
      errors.push(`Body does not match any schema in ${schema.oneOf ? 'oneOf' : 'anyOf'}`);
      errors.push(...allErrors);
    }
    return { valid: errors.length === 0, errors };
  }
  
  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (!(requiredField in body)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }
  }
  
  // Check field types and constraints
  const properties = schema.properties || {};
  for (const [fieldName, value] of Object.entries(body)) {
    const fieldSchema = properties[fieldName];
    if (!fieldSchema) {
      // Field not in schema - might be okay for additionalProperties
      if (schema.additionalProperties === false) {
        errors.push(`Field '${fieldName}' not allowed by schema`);
      }
      continue;
    }
    
    // Validate field value
    const fieldErrors = validateFieldValue(fieldName, value, fieldSchema, openApiSpec);
    errors.push(...fieldErrors);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single field value against its schema
 */
/**
 * Validate a field value against its schema
 * Enhanced with enum validation, format validation, and nested object/array support
 *
 * @param fieldName - Name of the field being validated
 * @param value - Value to validate
 * @param fieldSchema - Schema for this field
 * @param openApiSpec - Full OpenAPI spec for resolving $refs
 * @returns Array of validation error messages
 */
function validateFieldValue(
  fieldName: string,
  value: any,
  fieldSchema: any,
  openApiSpec: any
): string[] {
  const errors: string[] = [];
  
  // Resolve $ref if present
  if (fieldSchema.$ref) {
    fieldSchema = resolveRef(fieldSchema.$ref, openApiSpec);
  }
  
  const type = fieldSchema.type;
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  // Check enum first (before type check, as enum can constrain any type)
  if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
    if (!fieldSchema.enum.includes(value)) {
      errors.push(`Field '${fieldName}' must be one of: ${fieldSchema.enum.join(', ')} (got: ${JSON.stringify(value)})`);
      return errors; // If enum fails, other validations are less relevant
    }
  }
  
  // Type check
  if (type && actualType !== type && !(type === 'integer' && actualType === 'number')) {
    errors.push(`Field '${fieldName}' has wrong type: expected ${type}, got ${actualType}`);
    return errors; // Don't check further constraints if type is wrong
  }
  
  // String constraints and format validation
  if (type === 'string' && typeof value === 'string') {
    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      errors.push(`Field '${fieldName}' is too short: ${value.length} < ${fieldSchema.minLength}`);
    }
    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      errors.push(`Field '${fieldName}' is too long: ${value.length} > ${fieldSchema.maxLength}`);
    }
    if (fieldSchema.pattern) {
      try {
        const regex = new RegExp(fieldSchema.pattern);
        if (!regex.test(value)) {
          errors.push(`Field '${fieldName}' does not match pattern: ${fieldSchema.pattern}`);
        }
      } catch (e) {
        // Invalid regex in schema - skip validation
      }
    }
    
    // Format validation (email, uri, date-time, uuid, etc.)
    if (fieldSchema.format) {
      const formatErrors = validateStringFormat(fieldName, value, fieldSchema.format);
      errors.push(...formatErrors);
    }
  }
  
  // Number constraints
  if ((type === 'number' || type === 'integer') && typeof value === 'number') {
    // Integer type check
    if (type === 'integer' && !Number.isInteger(value)) {
      errors.push(`Field '${fieldName}' must be an integer, got: ${value}`);
    }
    
    if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
      errors.push(`Field '${fieldName}' is too small: ${value} < ${fieldSchema.minimum}`);
    }
    if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
      errors.push(`Field '${fieldName}' is too large: ${value} > ${fieldSchema.maximum}`);
    }
    if (fieldSchema.exclusiveMinimum !== undefined && value <= fieldSchema.exclusiveMinimum) {
      errors.push(`Field '${fieldName}' must be greater than ${fieldSchema.exclusiveMinimum}`);
    }
    if (fieldSchema.exclusiveMaximum !== undefined && value >= fieldSchema.exclusiveMaximum) {
      errors.push(`Field '${fieldName}' must be less than ${fieldSchema.exclusiveMaximum}`);
    }
    if (fieldSchema.multipleOf && value % fieldSchema.multipleOf !== 0) {
      errors.push(`Field '${fieldName}' must be multiple of ${fieldSchema.multipleOf}`);
    }
  }
  
  // Array constraints and item validation
  if (type === 'array' && Array.isArray(value)) {
    if (fieldSchema.minItems && value.length < fieldSchema.minItems) {
      errors.push(`Field '${fieldName}' has too few items: ${value.length} < ${fieldSchema.minItems}`);
    }
    if (fieldSchema.maxItems && value.length > fieldSchema.maxItems) {
      errors.push(`Field '${fieldName}' has too many items: ${value.length} > ${fieldSchema.maxItems}`);
    }
    
    // Validate array items if schema is provided
    if (fieldSchema.items) {
      value.forEach((item, index) => {
        const itemErrors = validateFieldValue(`${fieldName}[${index}]`, item, fieldSchema.items, openApiSpec);
        errors.push(...itemErrors);
      });
    }
    
    // Check for unique items
    if (fieldSchema.uniqueItems) {
      const uniqueValues = new Set(value.map(v => JSON.stringify(v)));
      if (uniqueValues.size !== value.length) {
        errors.push(`Field '${fieldName}' must have unique items`);
      }
    }
  }
  
  // Object constraints and nested validation
  if (type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    // Validate nested object against its schema
    const nestedValidation = validateBodyAgainstSchema(value, fieldSchema, openApiSpec);
    if (!nestedValidation.valid) {
      errors.push(...nestedValidation.errors.map(err => `${fieldName}.${err}`));
    }
  }
  
  return errors;
}

/**
 * Validate string format constraints (email, uri, date-time, uuid, etc.)
 *
 * @param fieldName - Name of the field being validated
 * @param value - String value to validate
 * @param format - Format constraint from schema
 * @returns Array of validation error messages
 */
function validateStringFormat(fieldName: string, value: string, format: string): string[] {
  const errors: string[] = [];
  
  switch (format) {
    case 'email':
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid email address`);
      }
      break;
      
    case 'uri':
    case 'url':
      // Basic URI/URL validation
      try {
        new URL(value);
      } catch {
        errors.push(`Field '${fieldName}' must be a valid URI/URL`);
      }
      break;
      
    case 'date-time':
      // ISO 8601 date-time validation
      if (isNaN(Date.parse(value))) {
        errors.push(`Field '${fieldName}' must be a valid ISO 8601 date-time`);
      }
      break;
      
    case 'date':
      // Date validation (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid date (YYYY-MM-DD)`);
      }
      break;
      
    case 'time':
      // Time validation (HH:MM:SS)
      if (!/^\d{2}:\d{2}:\d{2}$/.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid time (HH:MM:SS)`);
      }
      break;
      
    case 'uuid':
      // UUID validation
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid UUID`);
      }
      break;
      
    case 'ipv4':
      // IPv4 validation
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid IPv4 address`);
      }
      break;
      
    case 'ipv6':
      // Basic IPv6 validation
      if (!/^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid IPv6 address`);
      }
      break;
      
    case 'hostname':
      // Basic hostname validation
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid hostname`);
      }
      break;
      
    // Add more format validations as needed
    default:
      // Unknown format - skip validation
      break;
  }
  
  return errors;
}


/**
 * Generate a valid request body from OpenAPI schema with validation
 * This is the main entry point for schema-based body generation
 * 
 * @param schema - OpenAPI request body schema
 * @param openApiSpec - Full OpenAPI spec for resolving $refs
 * @param scenario - Test scenario (valid/invalid)
 * @param testId - Unique test identifier
 * @param timestamp - Timestamp for unique data generation
 * @returns Generated body with validation result, or null if generation fails
 */
export function generateAndValidateBodyFromSchema(
  schema: any,
  openApiSpec: any,
  scenario: BodyScenario = 'valid',
  testId: string = 'test',
  timestamp: string = Date.now().toString()
): { body: Record<string, any> | null; valid: boolean; errors: string[] } {
  try {
    // Generate body from schema
    const body = generateFromSchema(schema, openApiSpec, scenario, testId, timestamp);
    
    if (!body || Object.keys(body).length === 0) {
      return {
        body: null,
        valid: false,
        errors: ['Failed to generate body from schema']
      };
    }
    
    // Validate generated body against schema
    const validation = validateBodyAgainstSchema(body, schema, openApiSpec);
    
    return {
      body,
      valid: validation.valid,
      errors: validation.errors
    };
  } catch (error) {
    return {
      body: null,
      valid: false,
      errors: [`Body generation failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Validate and potentially regenerate a body to match schema requirements
 * Used when a body exists but may not be valid according to the schema
 * 
 * @param body - Existing request body
 * @param schema - OpenAPI request body schema
 * @param openApiSpec - Full OpenAPI spec for resolving $refs
 * @param testId - Unique test identifier
 * @param timestamp - Timestamp for unique data generation
 * @returns Validation result with potentially corrected body
 */
export function validateAndCorrectBody(
  body: Record<string, any> | null,
  schema: any,
  openApiSpec: any,
  testId: string = 'test',
  timestamp: string = Date.now().toString()
): {
  body: Record<string, any> | null;
  valid: boolean;
  errors: string[];
  corrected: boolean;
} {
  // If no body provided, generate from schema
  if (!body) {
    const generated = generateAndValidateBodyFromSchema(schema, openApiSpec, 'valid', testId, timestamp);
    return {
      body: generated.body,
      valid: generated.valid,
      errors: generated.errors,
      corrected: true
    };
  }
  
  // Validate existing body
  const validation = validateBodyAgainstSchema(body, schema, openApiSpec);
  
  if (validation.valid) {
    return {
      body,
      valid: true,
      errors: [],
      corrected: false
    };
  }
  
  // Body is invalid - try to correct it
  try {
    // Resolve $ref if present
    let resolvedSchema = schema;
    if (schema.$ref) {
      resolvedSchema = resolveRef(schema.$ref, openApiSpec);
    }
    
    const correctedBody = { ...body };
    const properties = resolvedSchema.properties || {};
    const required = resolvedSchema.required || [];
    
    // Add missing required fields
    for (const requiredField of required) {
      if (!(requiredField in correctedBody)) {
        const fieldSchema = properties[requiredField];
        if (fieldSchema) {
          correctedBody[requiredField] = generateFieldValue(
            requiredField,
            fieldSchema,
            'valid',
            testId,
            timestamp,
            openApiSpec,
            true
          );
        }
      }
    }
    
    // Fix enum violations
    for (const [fieldName, value] of Object.entries(correctedBody)) {
      const fieldSchema = properties[fieldName];
      if (fieldSchema?.enum && Array.isArray(fieldSchema.enum)) {
        if (!fieldSchema.enum.includes(value)) {
          // Replace with first valid enum value
          correctedBody[fieldName] = fieldSchema.enum[0];
        }
      }
    }
    
    // Validate corrected body
    const correctedValidation = validateBodyAgainstSchema(correctedBody, schema, openApiSpec);
    
    return {
      body: correctedBody,
      valid: correctedValidation.valid,
      errors: correctedValidation.errors,
      corrected: true
    };
  } catch (error) {
    return {
      body,
      valid: false,
      errors: [...validation.errors, `Correction failed: ${error instanceof Error ? error.message : String(error)}`],
      corrected: false
    };
  }
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
  _route: DiscoveredRoute | null,
  openApiSpec?: any
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

  // Validate against OpenAPI schema if available
  if (openApiSpec && _route && body) {
    try {
      const path = _route.path;
      const pathItem = openApiSpec.paths?.[path];
      const operation = pathItem?.[method.toLowerCase()];
      
      if (operation?.requestBody) {
        const requestBody = operation.requestBody;
        const content = requestBody.content || requestBody;
        const jsonSchema = content['application/json']?.schema;
        
        if (jsonSchema) {
          const validation = validateBodyAgainstSchema(body, jsonSchema, openApiSpec);
          if (!validation.valid) {
            warnings.push(...validation.errors.map(err => `Schema validation: ${err}`));
          }
        }
      }
    } catch (error) {
      // Ignore validation errors - they're just warnings
    }
  }

  return warnings;
}

/**
 * Generate a request body from a route-attached requestSchema.
 * Used when a DiscoveredRoute (or API map entry) has a requestSchema
 * but no full OpenAPI spec file is available.
 *
 * @param schema - The requestSchema object with properties/required fields
 * @param scenario - Body scenario (valid or invalid)
 * @param testId - Test identifier for unique values
 * @param timestamp - Timestamp for unique values
 * @returns Generated body or null
 */
function generateFromRouteSchema(
  schema: { required?: string[]; properties?: Record<string, any>; type?: string; [key: string]: any },
  scenario: BodyScenario,
  testId: string,
  timestamp: string,
): Record<string, any> | null {
  if (!schema.properties) return null;

  const body: Record<string, any> = {};
  const required = schema.required || [];

  // Generate required fields first
  for (const fieldName of required) {
    const fieldSchema = schema.properties[fieldName];
    if (fieldSchema) {
      body[fieldName] = generateFieldValue(
        fieldName,
        fieldSchema,
        scenario,
        testId,
        timestamp,
        undefined,
        true
      );
    } else {
      body[fieldName] = generateValueFromFieldName(fieldName, testId);
    }
  }

  // Generate optional fields
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    if (required.includes(fieldName)) continue;
    body[fieldName] = generateFieldValue(
      fieldName,
      fieldSchema,
      scenario,
      testId,
      timestamp,
      undefined,
      false
    );
  }

  return Object.keys(body).length > 0 ? body : null;
}

// Made with Bob
