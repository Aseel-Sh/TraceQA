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
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | null;
  keywords: string[];
}

/**
 * HTTP method mapping for generic CRUD action types
 * GENERIC ONLY - No business-specific actions like 'login', 'register', 'auth'
 * Business logic should be inferred from route paths and AI reasoning
 */
const ACTION_TO_METHOD_MAP: Record<string, string[]> = {
  create: ['POST'],
  read: ['GET'],
  update: ['PUT', 'PATCH'],
  delete: ['DELETE'],
  list: ['GET'],
};

/**
 * Generic action verb patterns for detecting CRUD operations
 * IMPORTANT: Only includes generic REST/CRUD verbs
 * NO business-specific keywords (login, register, auth, verify, etc.)
 * Business logic is domain-specific and should be handled by:
 * - Route path analysis (e.g., /auth/login, /users/register)
 * - AI reasoning from acceptance criteria
 * - OpenAPI schema descriptions
 */
const ACTION_PATTERNS = {
  create: /\b(create|add|submit|post|new|insert)\b/i,
  read: /\b(get|retrieve|fetch|view|show|read|find)\b/i,
  update: /\b(update|edit|modify|change|patch|put)\b/i,
  delete: /\b(delete|remove|destroy)\b/i,
  list: /\b(list|all|index|collection|retrieve\s+all)\b/i,
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
 * Detect action from text using GENERIC CRUD patterns only
 *
 * IMPORTANT: This function is intentionally generic and domain-agnostic.
 * It only detects standard REST/CRUD operations (create, read, update, delete, list).
 *
 * Business-specific actions (login, register, verify, etc.) should be:
 * - Inferred from route paths (e.g., /auth/login, /users/verify)
 * - Determined by AI reasoning from acceptance criteria
 * - Extracted from OpenAPI schema descriptions
 *
 * @param text - Text to analyze (acceptance criterion, task title, etc.)
 * @returns Detected generic action and extracted keywords
 *
 * @example
 * ```typescript
 * detectResourceAndAction("User should be able to create new items")
 * // Returns: { resource: null, action: "create", keywords: [...] }
 *
 * detectResourceAndAction("Retrieve system status")
 * // Returns: { resource: null, action: "read", keywords: [...] }
 *
 * detectResourceAndAction("Login with valid credentials")
 * // Returns: { resource: null, action: null, keywords: ["login", "valid", "credentials"] }
 * // Note: 'login' is in keywords but not detected as action - it's business-specific
 * ```
 */
export function detectResourceAndAction(text: string): ResourceAction {
  const keywords = extractKeywords(text);
  
  // Detect GENERIC CRUD action only
  let action: ResourceAction['action'] = null;
  
  // Try all generic action patterns
  for (const [actionType, pattern] of Object.entries(ACTION_PATTERNS)) {
    if (pattern.test(text)) {
      action = actionType as ResourceAction['action'];
      break; // Use first match (patterns are ordered by priority)
    }
  }
  
  // Extract potential resource names from text
  // This is generic - looks for nouns that could be API resources
  const resource = extractResourceFromText(text);
  
  return { resource, action, keywords };
}

/**
 * Extract potential resource name from text using GENERIC patterns
 *
 * IMPORTANT: This function extracts common nouns that might represent API resources.
 * It does NOT hardcode specific business domains (e-commerce, auth, etc.).
 *
 * Instead, it looks for:
 * - Plural nouns (likely collections: /users, /items, /orders)
 * - Common REST resource naming patterns
 * - Path segments that look like resource names
 *
 * The function is intentionally broad to work across any API domain.
 *
 * @param text - Text to analyze
 * @returns Extracted resource name in singular form, or null
 */
function extractResourceFromText(text: string): string | null {
  const textLower = text.toLowerCase();
  
  // Generic pattern: Look for plural nouns (common in REST APIs)
  // Matches: "users", "items", "orders", "products", etc.
  // This is domain-agnostic - works for any API
  const pluralNounPattern = /\b([a-z]{3,})(s|es)\b/gi;
  const matches = textLower.matchAll(pluralNounPattern);
  
  for (const match of matches) {
    const word = match[1];
    
    // Filter out common English words that aren't likely resources
    const commonWords = new Set([
      'this', 'that', 'these', 'those', 'what', 'when', 'where', 'which',
      'should', 'could', 'would', 'must', 'can', 'will', 'shall',
      'has', 'have', 'had', 'does', 'did', 'was', 'were', 'been',
      'make', 'take', 'give', 'come', 'goes', 'goes', 'comes',
    ]);
    
    if (!commonWords.has(word) && word.length >= 3) {
      // Return first valid resource found (singular form)
      return word;
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
 * Supports multiple formats: {id}, :id, <id>, [id]
 *
 * @param path - Path to check
 * @returns True if path contains any parameter placeholder format
 *
 * @example
 * ```typescript
 * hasPathParameters('/users/{id}')     // true
 * hasPathParameters('/users/:userId')  // true
 * hasPathParameters('/users/<id>')     // true
 * hasPathParameters('/users/[id]')     // true
 * hasPathParameters('/users/123')      // false
 * ```
 */
function hasPathParameters(path: string): boolean {
  return /\{[^}]+\}|:[a-zA-Z_][a-zA-Z0-9_]*|<[^>]+>|\[[^\]]+\]/.test(path);
}

/**
 * Normalize a path for matching - handles all URL formats and parameter styles
 *
 * This is the CORE function for unified route matching. It ensures that:
 * - Absolute URLs are converted to paths
 * - Query strings are removed
 * - Trailing slashes are handled consistently
 * - All parameter formats are normalized to a standard form
 * - Paths are case-insensitive
 *
 * Supported parameter formats:
 * - {id}, {userId}, {item_id}  (OpenAPI/Swagger style)
 * - :id, :userId, :item_id     (Express/Koa style)
 * - <id>, <userId>, <item_id>  (Flask/Django style)
 * - [id], [userId], [item_id]  (Alternative style)
 *
 * @param path - Path or URL to normalize
 * @returns Normalized path for comparison
 *
 * @example
 * ```typescript
 * normalizePathForMatching('http://localhost:3000/api/users/{id}')
 * // Returns: '/api/users/:param'
 *
 * normalizePathForMatching('/api/users/:userId?page=1')
 * // Returns: '/api/users/:param'
 *
 * normalizePathForMatching('/api/users/')
 * // Returns: '/api/users'
 *
 * normalizePathForMatching('/API/Users/<id>')
 * // Returns: '/api/users/:param'
 * ```
 */
export function normalizePathForMatching(path: string): string {
  if (!path) return '';
  
  // Step 1: Handle absolute URLs - extract pathname
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path);
      path = url.pathname || '/';
    }
  } catch {
    // If URL parsing fails, continue with original path
  }

  // Step 2: Remove query string and fragment
  path = path.split('?')[0].split('#')[0];

  // Step 3: Remove trailing slash (but preserve root '/')
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Step 4: Normalize ALL parameter placeholder formats to ':param'
  // This ensures {id}, :id, <id>, [id] all match each other
  path = path.replace(/\{[^}]+\}|:[^\/]+|<[^>]+>|\[[^\]]+\]/g, ':param');

  // Step 5: Convert to lowercase for case-insensitive matching
  return path.toLowerCase();
}

/**
 * Check if two paths match, considering parameter placeholders
 *
 * This function implements the core path matching logic used throughout the system.
 * It handles:
 * - Exact path matches
 * - Parameter placeholder matching (template vs concrete)
 * - Concrete ID matching to templates (e.g., /users/123 matches /users/{id})
 *
 * @param path1 - First path (can be template or concrete)
 * @param path2 - Second path (can be template or concrete)
 * @returns True if paths match semantically
 *
 * @example
 * ```typescript
 * matchesPathTemplate('/api/users/{id}', '/api/users/123')
 * // Returns: true
 *
 * matchesPathTemplate('/api/users/:userId', '/api/users/abc-def-123')
 * // Returns: true
 *
 * matchesPathTemplate('/api/users', '/api/users/')
 * // Returns: true (trailing slash normalized)
 *
 * matchesPathTemplate('/api/users', '/api/products')
 * // Returns: false
 *
 * matchesPathTemplate('http://localhost/api/users', '/api/users')
 * // Returns: true (absolute URL normalized)
 * ```
 */
export function matchesPathTemplate(path1: string, path2: string): boolean {
  // Normalize both paths
  const normalized1 = normalizePathForMatching(path1);
  const normalized2 = normalizePathForMatching(path2);
  
  // Split into segments
  const segments1 = normalized1.split('/').filter(s => s.length > 0);
  const segments2 = normalized2.split('/').filter(s => s.length > 0);
  
  // Must have same number of segments
  if (segments1.length !== segments2.length) {
    return false;
  }
  
  // Compare each segment
  for (let i = 0; i < segments1.length; i++) {
    const seg1 = segments1[i];
    const seg2 = segments2[i];
    
    // Exact match
    if (seg1 === seg2) {
      continue;
    }
    
    // One or both are parameters - they match
    if (seg1 === ':param' || seg2 === ':param') {
      continue;
    }
    
    // Check if one looks like a concrete ID and the other is a path segment
    // This handles cases like /users/123 matching /users/{id}
    // A concrete ID is typically: numbers, UUIDs, or alphanumeric strings
    const isConcreteId = (seg: string) => {
      return /^[0-9]+$/.test(seg) ||                           // Numeric ID: 123
             /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || // UUID
             /^[a-z0-9_-]{8,}$/i.test(seg);                    // Long alphanumeric: abc-def-123
    };
    
    // If one segment looks like a concrete ID, it could match a parameter
    if (isConcreteId(seg1) || isConcreteId(seg2)) {
      continue;
    }
    
    // Segments don't match
    return false;
  }
  
  return true;
}

/**
 * Legacy function for backward compatibility
 * Use normalizePathForMatching() instead
 */
function normalizePathForComparison(path: string): string {
  return normalizePathForMatching(path);
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

  // Prefer a route whose path tokens are directly reflected in the task text.
  const directMatch = discoveredRoutes.find(route => {
    if (expectedMethod && route.method.toUpperCase() !== expectedMethod.toUpperCase()) {
      return false;
    }

    const normalizedPath = normalizePathForComparison(route.path);
    const pathTokens = normalizedPath
      .split('/')
      .filter(token => token.length > 0 && token !== 'api' && !/^v\d+$/.test(token) && token !== ':param');

    if (pathTokens.length === 0) {
      return false;
    }

    return pathTokens.every(token => keywords.includes(token) || keywords.some(keyword => keyword.includes(token) || token.includes(keyword)));
  });
  if (directMatch) {
    return {
      matched: true,
      confidence: 'high',
      route: directMatch,
      method: directMatch.method,
      reasoning: `Direct route-token match for ${directMatch.method.toUpperCase()} ${directMatch.path}`,
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

    // Prefer exact (non-parameterized) discovered routes slightly to avoid marking them weak
    if (!hasParams) {
      score += 10;
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
    
    // Check if URL matches any discovered route using unified matching
    const urlPath = step.url.split('?')[0]; // Remove query params

    const matchingRoute = discoveredRoutes.find(route => {
      const methodMatches = route.method.toUpperCase() === step.method.toUpperCase();
      // Use unified path matching - handles all parameter formats and concrete IDs
      return methodMatches && matchesPathTemplate(route.path, urlPath);
    });
    
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
 * IMPORTANT: This uses GENERIC patterns only. Business-specific multi-step
 * scenarios (like login flows) should be inferred from route analysis and
 * AI reasoning, not hardcoded here.
 *
 * @param context - Combined text from task and acceptance criterion
 * @returns Object indicating if multi-step is needed and what type
 */
export function detectMultiStepRequirement(context: string): {
  requiresMultiStep: boolean;
  setupAction: 'create' | null;
  mainAction: 'create' | 'update' | 'delete' | 'read' | null;
  reasoning: string;
} {
  const contextLower = context.toLowerCase();
  
  // Duplicate/conflict scenarios - GENERIC pattern
  if (contextLower.includes('duplicate') || contextLower.includes('already exists') ||
      contextLower.includes('conflict')) {
    return {
      requiresMultiStep: true,
      setupAction: 'create',
      mainAction: 'create',
      reasoning: 'Duplicate/conflict test requires creating resource first, then attempting duplicate creation',
    };
  }
  
  // Update scenarios - GENERIC pattern
  if (contextLower.includes('update') || contextLower.includes('modify') ||
      contextLower.includes('edit')) {
    return {
      requiresMultiStep: true,
      setupAction: 'create',
      mainAction: 'update',
      reasoning: 'Update test requires creating resource first, then updating it',
    };
  }
  
  // Delete scenarios - GENERIC pattern
  if (contextLower.includes('delete') || contextLower.includes('remove')) {
    return {
      requiresMultiStep: true,
      setupAction: 'create',
      mainAction: 'delete',
      reasoning: 'Delete test requires creating resource first, then deleting it',
    };
  }
  
  // Note: Auth-dependent scenarios removed - these are business-specific
  // and should be handled by route analysis (e.g., detecting /auth/login paths)
  // and AI reasoning from acceptance criteria
  
  return {
    requiresMultiStep: false,
    setupAction: null,
    mainAction: null,
    reasoning: 'Single-step test sufficient',
  };
}

// Made with Bob
