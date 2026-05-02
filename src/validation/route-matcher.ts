/**
 * Route Matcher - Generic semantic route matching and validation
 * 
 * This module provides intelligent route matching and HTTP test validation
 * without hardcoding specific endpoints. It uses generic keyword extraction
 * and semantic analysis to match acceptance criteria to discovered routes.
 */

import type {
  QATask,
  AcceptanceCriterion,
  DiscoveredRoute,
  HTTPTestStep,
} from '../types/index.js';

/**
 * Result of matching a route to a task
 */
export interface RouteMatchResult {
  matched: boolean;
  confidence: 'high' | 'medium' | 'low';
  route: DiscoveredRoute | null;
  method: string | null;
  reasoning: string;
}

/**
 * Result of validating and normalizing an HTTP test step
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized: {
    method?: string;
    url?: string;
    body?: Record<string, any>;
    expectedStatus?: number;
    acceptableStatuses?: number[];
  };
}

/**
 * Detected resource and action from text analysis
 */
export interface ResourceAction {
  resource: string | null;
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'health' | 'auth' | null;
  keywords: string[];
}

/**
 * HTTP method mapping for different action types
 */
const ACTION_TO_METHOD_MAP: Record<string, string[]> = {
  create: ['POST'],
  read: ['GET'],
  update: ['PUT', 'PATCH'],
  delete: ['DELETE'],
  list: ['GET'],
  health: ['GET'],
  auth: ['POST'],
};

/**
 * Action verb patterns for detecting CRUD operations
 */
const ACTION_PATTERNS = {
  create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
  read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
  update: /\b(update|edit|modify|change|patch|put)\b/i,
  delete: /\b(delete|remove|destroy)\b/i,
  list: /\b(list|all|index|collection)\b/i,
  health: /\b(health|status|ping|alive|ready|liveness|readiness)\b/i,
  auth: /\b(login|authenticate|sign\s*in|auth|token|session)\b/i,
};

/**
 * Common REST resource patterns
 */
const RESOURCE_PATTERNS = [
  /\b(user|account|profile|member)s?\b/i,
  /\b(order|purchase|transaction)s?\b/i,
  /\b(product|item|article)s?\b/i,
  /\b(invoice|bill|receipt)s?\b/i,
  /\b(appointment|booking|reservation)s?\b/i,
  /\b(task|todo|job)s?\b/i,
  /\b(payment|charge|refund)s?\b/i,
  /\b(comment|review|feedback)s?\b/i,
  /\b(post|article|blog)s?\b/i,
  /\b(message|notification|alert)s?\b/i,
  /\b(file|document|attachment)s?\b/i,
  /\b(category|tag|label)s?\b/i,
  /\b(customer|client|contact)s?\b/i,
  /\b(employee|staff|worker)s?\b/i,
  /\b(report|analytics|metric)s?\b/i,
];

/**
 * Extract keywords from text by tokenizing and filtering
 */
function extractKeywords(text: string): string[] {
  // Convert to lowercase and split on non-alphanumeric characters
  const tokens = text.toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 2); // Filter out very short tokens
  
  // Remove common stop words
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'should',
    'must', 'can', 'will', 'are', 'was', 'were', 'been', 'have',
    'has', 'had', 'does', 'did', 'but', 'not', 'when', 'where',
  ]);
  
  return tokens.filter(token => !stopWords.has(token));
}

/**
 * Detect resource and action from text using generic patterns
 * 
 * @param text - Text to analyze (acceptance criterion, task title, etc.)
 * @returns Detected resource, action, and extracted keywords
 * 
 * @example
 * ```typescript
 * detectResourceAndAction("User should be able to register")
 * // Returns: { resource: "user", action: "create", keywords: [...] }
 * 
 * detectResourceAndAction("System health check endpoint")
 * // Returns: { resource: null, action: "health", keywords: [...] }
 * ```
 */
export function detectResourceAndAction(text: string): ResourceAction {
  const keywords = extractKeywords(text);
  
  // Detect action
  let action: ResourceAction['action'] = null;
  for (const [actionType, pattern] of Object.entries(ACTION_PATTERNS)) {
    if (pattern.test(text)) {
      action = actionType as ResourceAction['action'];
      break;
    }
  }
  
  // Detect resource
  let resource: string | null = null;
  for (const pattern of RESOURCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      resource = match[1].toLowerCase();
      break;
    }
  }
  
  return { resource, action, keywords };
}

/**
 * Calculate similarity score between two sets of keywords
 */
function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0;
  }
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let matches = 0;
  for (const keyword of set1) {
    if (set2.has(keyword)) {
      matches++;
    }
  }
  
  // Jaccard similarity
  const union = new Set([...set1, ...set2]);
  return matches / union.size;
}

/**
 * Check if a route path matches a resource name
 */
function pathMatchesResource(path: string, resource: string | null): boolean {
  if (!resource) return false;
  
  const pathLower = path.toLowerCase();
  const resourceLower = resource.toLowerCase();
  
  // Check for exact match or plural form
  return pathLower.includes(resourceLower) || 
         pathLower.includes(resourceLower + 's') ||
         pathLower.includes(resourceLower + 'es');
}

/**
 * Infer HTTP method from action type
 */
function inferMethodFromAction(action: ResourceAction['action']): string | null {
  if (!action) return null;
  
  const methods = ACTION_TO_METHOD_MAP[action];
  return methods ? methods[0] : null;
}

/**
 * Match a route to a task using generic semantic matching
 * 
 * This function analyzes the task and acceptance criterion text to find
 * the most appropriate route from the discovered routes. It uses keyword
 * extraction, resource detection, and action inference to make intelligent
 * matches without hardcoding specific endpoints.
 * 
 * @param task - The QA task to match
 * @param acceptanceCriterion - The acceptance criterion being tested
 * @param discoveredRoutes - List of routes discovered from the application
 * @param openApiSpec - Optional OpenAPI specification for additional context
 * @returns Match result with confidence level and reasoning
 * 
 * @example
 * ```typescript
 * const result = matchRouteToTask(
 *   task,
 *   { id: 'AC-1', description: 'User can register with valid email' },
 *   discoveredRoutes
 * );
 * 
 * if (result.matched && result.confidence === 'high') {
 *   console.log(`Matched to ${result.route.path} with ${result.method}`);
 * }
 * ```
 */
export function matchRouteToTask(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  openApiSpec?: any
): RouteMatchResult {
  // Combine text from task and acceptance criterion
  const combinedText = `${task.title} ${acceptanceCriterion.description}`;
  
  // Detect resource and action
  const { resource, action, keywords } = detectResourceAndAction(combinedText);
  
  // Infer expected HTTP method
  const expectedMethod = inferMethodFromAction(action);
  
  if (discoveredRoutes.length === 0) {
    return {
      matched: false,
      confidence: 'low',
      route: null,
      method: expectedMethod,
      reasoning: 'No routes discovered from the application',
    };
  }
  
  // Score each route
  interface ScoredRoute {
    route: DiscoveredRoute;
    score: number;
    methodMatch: boolean;
    pathMatch: boolean;
    keywordSimilarity: number;
  }
  
  const scoredRoutes: ScoredRoute[] = discoveredRoutes.map(route => {
    const routeKeywords = extractKeywords(route.path + ' ' + (route.description || ''));
    const keywordSimilarity = calculateKeywordSimilarity(keywords, routeKeywords);
    const methodMatch = !expectedMethod || route.method.toUpperCase() === expectedMethod.toUpperCase();
    const pathMatch = pathMatchesResource(route.path, resource);
    
    // Calculate score
    let score = 0;
    if (methodMatch) score += 40;
    if (pathMatch) score += 40;
    score += keywordSimilarity * 20;
    
    // Bonus for OpenAPI description match
    if (openApiSpec && route.description) {
      const descKeywords = extractKeywords(route.description);
      const descSimilarity = calculateKeywordSimilarity(keywords, descKeywords);
      score += descSimilarity * 10;
    }
    
    return {
      route,
      score,
      methodMatch,
      pathMatch,
      keywordSimilarity,
    };
  });
  
  // Sort by score
  scoredRoutes.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredRoutes[0];
  
  if (bestMatch.score === 0) {
    return {
      matched: false,
      confidence: 'low',
      route: null,
      method: expectedMethod,
      reasoning: 'No routes matched the task criteria',
    };
  }
  
  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  let reasoning: string;
  
  if (bestMatch.score >= 80) {
    confidence = 'high';
    reasoning = `Exact match: method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
  } else if (bestMatch.score >= 50) {
    confidence = 'medium';
    reasoning = `Partial match: method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
  } else {
    confidence = 'low';
    reasoning = `Weak match: method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
  }
  
  return {
    matched: true,
    confidence,
    route: bestMatch.route,
    method: bestMatch.route.method,
    reasoning,
  };
}

/**
 * Check if a URL is valid (not a stringified object or malformed)
 */
function isValidUrl(url: string): boolean {
  // Check if it looks like a stringified JSON object
  if (url.trim().startsWith('{') || url.trim().startsWith('[')) {
    return false;
  }
  
  // Check if it contains common JSON patterns
  if (/"statusCode":|"message":|"error":/i.test(url)) {
    return false;
  }
  
  // Must start with / or http(s)://
  return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Normalize a relative URL with base URL
 */
function normalizeUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Remove trailing slash from baseUrl
  const base = baseUrl.replace(/\/$/, '');
  
  // Ensure url starts with /
  const path = url.startsWith('/') ? url : '/' + url;
  
  return base + path;
}

/**
 * Infer expected status codes based on HTTP method and context
 */
function inferExpectedStatuses(
  method: string,
  context: string,
  openApiSpec?: any
): { expectedStatus: number; acceptableStatuses: number[] } {
  const methodUpper = method.toUpperCase();
  const contextLower = context.toLowerCase();
  
  // Check for specific scenarios in context
  if (contextLower.includes('invalid') || contextLower.includes('reject') || 
      contextLower.includes('validation') || contextLower.includes('bad')) {
    return { expectedStatus: 400, acceptableStatuses: [400, 422] };
  }
  
  if (contextLower.includes('unauthorized') || contextLower.includes('not authenticated')) {
    return { expectedStatus: 401, acceptableStatuses: [401] };
  }
  
  if (contextLower.includes('forbidden') || contextLower.includes('not authorized')) {
    return { expectedStatus: 403, acceptableStatuses: [403] };
  }
  
  if (contextLower.includes('not found') || contextLower.includes('missing')) {
    return { expectedStatus: 404, acceptableStatuses: [404] };
  }
  
  if (contextLower.includes('duplicate') || contextLower.includes('conflict') || 
      contextLower.includes('already exists')) {
    return { expectedStatus: 409, acceptableStatuses: [409] };
  }
  
  // Default success statuses by method
  switch (methodUpper) {
    case 'GET':
      return { expectedStatus: 200, acceptableStatuses: [200] };
    case 'POST':
      return { expectedStatus: 201, acceptableStatuses: [200, 201] };
    case 'PUT':
    case 'PATCH':
      return { expectedStatus: 200, acceptableStatuses: [200, 204] };
    case 'DELETE':
      return { expectedStatus: 204, acceptableStatuses: [200, 204] };
    case 'HEAD':
    case 'OPTIONS':
      return { expectedStatus: 200, acceptableStatuses: [200, 204] };
    default:
      return { expectedStatus: 200, acceptableStatuses: [200] };
  }
}

/**
 * Validate and normalize an HTTP test step
 * 
 * This function validates the structure and content of an HTTP test step,
 * checking for common issues like invalid URLs, incorrect methods, or
 * malformed data. It also normalizes the step by inferring missing values
 * and providing sensible defaults.
 * 
 * @param step - The HTTP test step to validate
 * @param discoveredRoutes - List of discovered routes for validation
 * @param baseUrl - Base URL for normalizing relative URLs
 * @returns Validation result with errors, warnings, and normalized values
 * 
 * @example
 * ```typescript
 * const result = validateAndNormalizeHTTPStep(
 *   step,
 *   discoveredRoutes,
 *   'http://localhost:3000'
 * );
 * 
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * } else {
 *   // Use result.normalized for execution
 * }
 * ```
 */
export function validateAndNormalizeHTTPStep(
  step: HTTPTestStep,
  discoveredRoutes: DiscoveredRoute[],
  baseUrl: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalized: ValidationResult['normalized'] = {};
  
  // Validate method
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  if (!validMethods.includes(step.method.toUpperCase())) {
    errors.push(`Invalid HTTP method: ${step.method}. Must be one of: ${validMethods.join(', ')}`);
  } else {
    normalized.method = step.method.toUpperCase();
  }
  
  // Validate URL
  if (typeof step.url !== 'string') {
    errors.push(`URL must be a string, got: ${typeof step.url}`);
  } else if (!isValidUrl(step.url)) {
    errors.push(`Invalid URL format: ${step.url}. URL appears to be a stringified object or malformed.`);
  } else {
    normalized.url = normalizeUrl(step.url, baseUrl);
    
    // Check if URL matches any discovered route
    const urlPath = step.url.split('?')[0]; // Remove query params
    const matchingRoute = discoveredRoutes.find(route => 
      route.path === urlPath && route.method.toUpperCase() === step.method.toUpperCase()
    );
    
    if (!matchingRoute && discoveredRoutes.length > 0) {
      warnings.push(`URL ${urlPath} with method ${step.method} not found in discovered routes. This may indicate a typo or undiscovered endpoint.`);
    }
  }
  
  // Validate and normalize body
  if (step.body !== null && step.body !== undefined) {
    if (typeof step.body !== 'object' || Array.isArray(step.body)) {
      warnings.push(`Body should be an object, got: ${typeof step.body}`);
    }
    normalized.body = step.body;
  }
  
  // Validate and normalize expected status
  if (step.expectedStatus) {
    if (typeof step.expectedStatus !== 'number' || step.expectedStatus < 100 || step.expectedStatus > 599) {
      errors.push(`Invalid expectedStatus: ${step.expectedStatus}. Must be a valid HTTP status code (100-599).`);
    } else {
      normalized.expectedStatus = step.expectedStatus;
    }
  } else {
    // Infer expected status from method and description
    const inferred = inferExpectedStatuses(step.method, step.description);
    normalized.expectedStatus = inferred.expectedStatus;
    warnings.push(`No expectedStatus provided. Inferred ${inferred.expectedStatus} based on method and context.`);
  }
  
  // Validate and normalize acceptable statuses
  if (step.acceptableStatuses && step.acceptableStatuses.length > 0) {
    const invalidStatuses = step.acceptableStatuses.filter(
      status => typeof status !== 'number' || status < 100 || status > 599
    );
    
    if (invalidStatuses.length > 0) {
      errors.push(`Invalid status codes in acceptableStatuses: ${invalidStatuses.join(', ')}`);
    } else {
      normalized.acceptableStatuses = step.acceptableStatuses;
    }
  } else {
    // Infer acceptable statuses
    const inferred = inferExpectedStatuses(step.method, step.description);
    normalized.acceptableStatuses = inferred.acceptableStatuses;
    
    if (!step.expectedStatus) {
      warnings.push(`No acceptableStatuses provided. Inferred ${JSON.stringify(inferred.acceptableStatuses)} based on method and context.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
  };
}

/**
 * Detect if a test scenario requires multiple steps
 * 
 * This function analyzes the test context to determine if it needs
 * setup steps before the main action. For example, testing duplicate
 * creation requires creating the resource first, then attempting to
 * create it again.
 * 
 * @param context - Combined text from task and acceptance criterion
 * @returns Object indicating if multi-step is needed and what type
 */
export function detectMultiStepRequirement(context: string): {
  requiresMultiStep: boolean;
  setupAction: 'create' | 'login' | null;
  mainAction: 'create' | 'update' | 'delete' | 'read' | null;
  reasoning: string;
} {
  const contextLower = context.toLowerCase();
  
  // Duplicate/conflict scenarios
  if (contextLower.includes('duplicate') || contextLower.includes('already exists') || 
      contextLower.includes('conflict')) {
    return {
      requiresMultiStep: true,
      setupAction: 'create',
      mainAction: 'create',
      reasoning: 'Duplicate/conflict test requires creating resource first, then attempting duplicate creation',
    };
  }
  
  // Update scenarios
  if (contextLower.includes('update') || contextLower.includes('modify') || 
      contextLower.includes('edit')) {
    return {
      requiresMultiStep: true,
      setupAction: 'create',
      mainAction: 'update',
      reasoning: 'Update test requires creating resource first, then updating it',
    };
  }
  
  // Delete scenarios
  if (contextLower.includes('delete') || contextLower.includes('remove')) {
    return {
      requiresMultiStep: true,
      setupAction: 'create',
      mainAction: 'delete',
      reasoning: 'Delete test requires creating resource first, then deleting it',
    };
  }
  
  // Auth-dependent scenarios
  if (contextLower.includes('authenticated') || contextLower.includes('logged in') ||
      contextLower.includes('authorized')) {
    return {
      requiresMultiStep: true,
      setupAction: 'login',
      mainAction: 'read',
      reasoning: 'Auth-dependent test requires login first, then performing action',
    };
  }
  
  return {
    requiresMultiStep: false,
    setupAction: null,
    mainAction: null,
    reasoning: 'Single-step test sufficient',
  };
}

// Made with Bob
