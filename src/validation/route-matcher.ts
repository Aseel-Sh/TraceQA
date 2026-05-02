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
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'login' | 'register' | 'verify' | 'activate' | 'reset' | 'refresh' | 'search' | null;
  keywords: string[];
}

/**
 * HTTP method mapping for different action types
 * Does NOT include hardcoded action types like 'auth' or 'health'
 * Those should be inferred from actual routes and IBM reasoning
 */
const ACTION_TO_METHOD_MAP: Record<string, string[]> = {
  create: ['POST'],
  read: ['GET'],
  update: ['PUT', 'PATCH'],
  delete: ['DELETE'],
  list: ['GET'],
  login: ['POST'],
  register: ['POST'],
  verify: ['POST', 'GET'],
  activate: ['POST', 'PUT'],
  reset: ['POST'],
  refresh: ['POST'],
  search: ['GET', 'POST'],
};

/**
 * Action verb patterns for detecting generic CRUD operations
 * Intentionally avoids business-specific keywords like 'login', 'register', 'auth', 'token'
 * Those concepts are handled by IBM reasoning, not hardcoded patterns
 */
const ACTION_PATTERNS = {
  create: /\b(create|add|submit|post|new)\b/i,
  read: /\b(get|retrieve|fetch|view|check|show)\b/i,
  update: /\b(update|edit|modify|change|patch|put)\b/i,
  delete: /\b(delete|remove|destroy)\b/i,
  list: /\b(list|all|index|collection|retrieve\s+all)\b/i,
  login: /\b(login|log\s*in|signin|sign\s*in|authenticate|auth)\b/i,
  register: /\b(register|signup|sign\s*up|create\s+account)\b/i,
  verify: /\b(verify|validate|confirm|check)\b/i,
  activate: /\b(activate|enable)\b/i,
  reset: /\b(reset|forgot|recover)\b/i,
  refresh: /\b(refresh|renew)\b/i,
  search: /\b(search|find|query|filter)\b/i,
};

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
 * Detect action from text using generic CRUD patterns only
 * Does NOT attempt to detect business-specific actions like 'auth', 'health', etc.
 * Those require inspection of actual route paths and AI reasoning.
 * 
 * @param text - Text to analyze (acceptance criterion, task title, etc.)
 * @returns Detected action and extracted keywords
 * 
 * @example
 * ```typescript
 * detectResourceAndAction("User should be able to create new items")
 * // Returns: { resource: null, action: "create", keywords: [...] }
 * 
 * detectResourceAndAction("Retrieve system status")
 * // Returns: { resource: null, action: "read", keywords: [...] }
 * ```
 */
export function detectResourceAndAction(text: string): ResourceAction {
  const keywords = extractKeywords(text);
  
  // Detect action using enhanced patterns (including domain-specific actions)
  let action: ResourceAction['action'] = null;
  let bestActionScore = 0;
  
  // Try all action patterns and pick the best match
  for (const [actionType, pattern] of Object.entries(ACTION_PATTERNS)) {
    if (pattern.test(text)) {
      // Calculate score based on pattern specificity
      // Domain-specific actions (login, register, etc.) get higher priority
      const isDomainSpecific = ['login', 'register', 'verify', 'activate', 'reset', 'refresh', 'search'].includes(actionType);
      const score = isDomainSpecific ? 2 : 1;
      
      if (score > bestActionScore) {
        action = actionType as ResourceAction['action'];
        bestActionScore = score;
      }
    }
  }
  
  // Re-enable resource detection from paths and text
  // Extract potential resource names from text (nouns that might be API resources)
  const resource = extractResourceFromText(text);
  
  return { resource, action, keywords };
}

/**
 * Extract potential resource name from text
 * Looks for common REST resource patterns
 */
function extractResourceFromText(text: string): string | null {
  const textLower = text.toLowerCase();
  
  // Common resource patterns in REST APIs
  const resourcePatterns = [
    /\b(user|account|profile|customer|client)s?\b/i,
    /\b(product|item|article|post|entry)s?\b/i,
    /\b(order|transaction|payment|invoice)s?\b/i,
    /\b(comment|review|rating|feedback)s?\b/i,
    /\b(category|tag|label|group)s?\b/i,
    /\b(file|document|image|media)s?\b/i,
    /\b(message|notification|alert|email)s?\b/i,
    /\b(session|token|credential|auth)s?\b/i,
    /\b(setting|config|preference|option)s?\b/i,
    /\b(report|analytics|stat|metric)s?\b/i,
  ];
  
  for (const pattern of resourcePatterns) {
    const match = textLower.match(pattern);
    if (match) {
      // Return the matched resource in singular form
      let resource = match[1];
      // Remove trailing 's' if present
      if (resource.endsWith('s') && resource.length > 3) {
        resource = resource.slice(0, -1);
      }
      return resource;
    }
  }
  
  return null;
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
  const hasExactMatch = pathLower.includes(resourceLower);
  const hasPluralMatch = pathLower.includes(resourceLower + 's') ||
                         pathLower.includes(resourceLower + 'es');
  
  // Also check for path segments (e.g., /api/users vs /api/user-settings)
  const pathSegments = pathLower.split('/').filter(s => s.length > 0);
  const hasSegmentMatch = pathSegments.some(segment =>
    segment === resourceLower ||
    segment === resourceLower + 's' ||
    segment === resourceLower + 'es'
  );
  
  return hasExactMatch || hasPluralMatch || hasSegmentMatch;
}

/**
 * Check if path contains parameter placeholders
 * e.g., /users/{id}, /users/:id, /users/[id]
 */
function hasPathParameters(path: string): boolean {
  return /\{[^}]+\}|:[a-zA-Z_][a-zA-Z0-9_]*|\[[^\]]+\]/.test(path);
}

/**
 * Calculate path similarity score considering parameter patterns
 */
function calculatePathSimilarity(path1: string, path2: string): number {
  const segments1 = path1.toLowerCase().split('/').filter(s => s.length > 0);
  const segments2 = path2.toLowerCase().split('/').filter(s => s.length > 0);
  
  if (segments1.length !== segments2.length) {
    return 0;
  }
  
  let matches = 0;
  for (let i = 0; i < segments1.length; i++) {
    const seg1 = segments1[i];
    const seg2 = segments2[i];
    
    // Exact match
    if (seg1 === seg2) {
      matches++;
    }
    // Both are parameters
    else if (isPathParameter(seg1) && isPathParameter(seg2)) {
      matches += 0.8; // Partial credit for parameter match
    }
    // One is parameter, check if other could be a value
    else if (isPathParameter(seg1) || isPathParameter(seg2)) {
      matches += 0.5; // Some credit for potential parameter match
    }
  }
  
  return matches / segments1.length;
}

/**
 * Check if a path segment is a parameter
 */
function isPathParameter(segment: string): boolean {
  return /^\{[^}]+\}$|^:[a-zA-Z_][a-zA-Z0-9_]*$|^\[[^\]]+\]$/.test(segment);
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
    
    // Calculate improved score with better weighting
    let score = 0;
    
    // Method match is critical (30 points)
    if (methodMatch) score += 30;
    
    // Path/resource match is very important (35 points)
    if (pathMatch) {
      score += 35;
    }
    
    // Keyword similarity (25 points)
    score += keywordSimilarity * 25;
    
    // OpenAPI description match (15 points)
    if (openApiSpec && route.description) {
      const descKeywords = extractKeywords(route.description);
      const descSimilarity = calculateKeywordSimilarity(keywords, descKeywords);
      score += descSimilarity * 15;
    }
    
    // Bonus for exact action match in path (10 points)
    if (action) {
      const pathLower = route.path.toLowerCase();
      const actionLower = action.toLowerCase();
      if (pathLower.includes(actionLower)) {
        score += 10;
      }
    }
    
    // Penalty for path parameter mismatch
    const hasParams = hasPathParameters(route.path);
    const expectsParams = combinedText.toLowerCase().includes('id') ||
                          combinedText.toLowerCase().includes('specific') ||
                          combinedText.toLowerCase().includes('particular');
    if (hasParams !== expectsParams) {
      score -= 5;
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
  const secondBestMatch = scoredRoutes[1];
  
  // Check for no matches
  if (bestMatch.score === 0) {
    return {
      matched: false,
      confidence: 'low',
      route: null,
      method: expectedMethod,
      reasoning: 'No routes matched the task criteria',
    };
  }
  
  // Determine confidence level with improved thresholds
  let confidence: 'high' | 'medium' | 'low';
  let reasoning: string;
  
  // Check for ambiguous matches (multiple routes with similar scores)
  const isAmbiguous = secondBestMatch && (bestMatch.score - secondBestMatch.score) < 10;
  
  if (bestMatch.score >= 70 && !isAmbiguous) {
    confidence = 'high';
    reasoning = `Strong match (score: ${bestMatch.score.toFixed(1)}): method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
  } else if (bestMatch.score >= 50) {
    confidence = 'medium';
    if (isAmbiguous) {
      reasoning = `Ambiguous match (score: ${bestMatch.score.toFixed(1)} vs ${secondBestMatch.score.toFixed(1)}): Multiple routes match similarly. Consider: ${bestMatch.route.path} and ${secondBestMatch.route.path}`;
    } else {
      reasoning = `Partial match (score: ${bestMatch.score.toFixed(1)}): method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
    }
  } else {
    confidence = 'low';
    reasoning = `Weak match (score: ${bestMatch.score.toFixed(1)}): method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%. Consider manual verification.`;
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
  _openApiSpec?: any
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
