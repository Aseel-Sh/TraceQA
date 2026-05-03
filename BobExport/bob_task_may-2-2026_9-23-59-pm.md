**User:**

<task>
Analyze the TraceQA codebase to identify the key files and their responsibilities related to the 10 issues described. Focus on:

1. Route matching logic (currently in src/validation/route-matcher.ts)
2. Schema/OpenAPI usage (src/discovery/route-discovery.ts, src/validation/body-generator.ts)
3. Test validation (src/testing/test-normalizer.ts, src/generators/test-generator.ts)
4. Failure classification (src/testing/failure-classifier.ts)
5. Body assertions (src/testing/api-tester.ts, src/testing/http-test-executor.ts)
6. Setup/capture logic (src/generators/test-generator.ts, src/agent/test-agent.ts)
7. IBM AC handling (src/agent/watsonx-client.ts, src/agent/prompts.ts)
8. IBM generation (src/agent/test-agent.ts, src/generators/qa-task-generator.ts)
9. Report generation (src/reporting/report-generator.ts)
10. Test execution flow (src/testing/test-coordinator.ts, src/testing/test-runner.ts)

Read the relevant files and provide a summary of:
- Current implementation approach for each area
- Where the problems described in the task are likely occurring
- Dependencies between components
- Recommended order for implementing fixes

This analysis will inform how we break down the implementation work. Do NOT make any code changes yet - only analyze and report findings.

These instructions supersede any conflicting general instructions you might have. When complete, use attempt_completion with a comprehensive summary of your findings.
</task>
<environment_details>
# VSCode Visible Files


# VSCode Open Tabs
src/utils/logger.ts,.env,src/agent/watsonx-client.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example,src/config/index.ts,src/reporting/report-generator.ts,test-fixtures/ibm-test-plan.json,src/testing/api-tester.ts,test-post-fix.ts,src/parsers/acceptance-parser.ts,src/generators/test-generator.ts,src/types/index.ts,test-acceptance-parser.ts,acceptance.md,README.md,CHANGELOG.md,FEATURES.md,src/utils/json-extractor.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T02:22:29.967Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.00

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>ask</slug>
<name>❓ Ask</name>


# Current Workspace Directory (c:/Users/Aseel/TraceQA) Files
.env.example
.gitignore
acceptance.md
package-lock.json
package.json
README.md
test-acceptance-parser.ts
test-body-generator.ts
test-build-system.ts
test-helpers.ts
test-ibm-integration.ts
test-integration-fixes.ts
test-post-fix.ts
test-qa-task-plan-generator.ts
test-route-discovery.ts
test-url-template-validation.ts
tsconfig.json
tsup.config.ts
src/
src/cli.ts
src/index.ts
src/agent/
src/agent/decision-engine.ts
src/agent/index.ts
src/agent/prompts.ts
src/agent/test-agent.ts
src/agent/watsonx-client.ts
src/analysis/
src/analysis/ambiguity-detector.ts
src/analysis/git-analyzer.ts
src/analysis/index.ts
src/cli/
src/cli/index.ts
src/cli/prompts.ts
src/config/
src/config/config-loader.ts
src/config/index.ts
src/core/
src/core/build-system.ts
src/core/index.ts
src/core/process-manager.ts
src/core/project-detector.ts
src/demo/
src/demo/demo-runner.ts
src/demo/mock-generator.ts
src/discovery/
src/discovery/route-discovery.ts
src/generators/
src/generators/artifact-writer.ts
src/generators/http-test-generator.ts
src/generators/qa-task-generator.ts
src/generators/qa-task-plan-generator.ts
src/generators/test-generator.ts
src/mcp/
src/mcp/browser-mcp.ts
src/mcp/client.ts
src/mcp/index.ts
src/mcp/playwright-mcp.ts
src/parsers/
src/parsers/acceptance-parser.ts
src/reporting/
src/reporting/index.ts
src/reporting/report-generator.ts
src/smoke-tests/
src/smoke-tests/ibm-smoke-test.ts
src/testing/
src/testing/api-tester.ts
src/testing/failure-classifier.ts
src/testing/http-test-executor.ts
src/testing/index.ts
src/testing/test-context.ts
src/testing/test-coordinator.ts
src/testing/test-normalizer.ts
src/testing/test-runner.ts
src/testing/web-tester.ts
src/types/
src/types/index.ts
src/utils/
src/utils/file-system.ts
src/utils/json-extractor.ts
src/utils/logger.ts
src/validation/
src/validation/body-generator.ts
src/validation/route-matcher.ts
src/validation/test-data-inference.ts
test-app/
test-app/package-lock.json
test-app/package.json
test-app/server.js
test-fixtures/
test-fixtures/ibm-test-plan.json
test-fixtures/express-app/
test-fixtures/express-app/server.js
test-fixtures/fastapi-app/
test-fixtures/fastapi-app/main.py
test-fixtures/generic-api/
test-fixtures/generic-api/proof/
test-fixtures/integration/
test-fixtures/integration/mock-responses.json
test-fixtures/integration/openapi-samples.json
test-fixtures/integration/test-scenarios.json
traceqa-debug/
traceqa-debug/architecture-analysis.md
traceqa-debug/raw-response-attempt-1.txt
traceqa-debug/raw-response-attempt-2.txt
traceqa-debug/route-mapping-design.md
traceqa-docs-archive/
traceqa-docs-archive/archive-2026-05-01/
traceqa-docs-archive/archive-2026-05-01/ACCEPTANCE_CRITERIA_USAGE.md
traceqa-docs-archive/archive-2026-05-01/CHANGELOG.md
traceqa-docs-archive/archive-2026-05-01/CLI_IMPLEMENTATION.md
traceqa-docs-archive/archive-2026-05-01/FEATURES.md
traceqa-docs-archive/archive-2026-05-01/IMPLEMENTATION_REPORT.md
traceqa-docs-archive/archive-2026-05-01/PROGRESS.md
traceqa-docs-archive/archive-2026-05-01/PROJECT_SUMMARY.md
traceqa-docs-archive/archive-2026-05-01/REFACTORING_PLAN.md
traceqa-docs-archive/archive-2026-05-01/TECHNICAL_SPEC.md
traceqa-proof/
traceqa-proof/report.json
traceqa-proof/report.md
traceqa-proof/trace-matrix.json
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I'll analyze the TraceQA codebase to identify key files and their responsibilities related to the 10 issues. Let me start by reading the relevant files systematically.

<read_file>
<args>
  <file>
    <path>src/validation/route-matcher.ts</path>
  </file>
  <file>
    <path>src/discovery/route-discovery.ts</path>
  </file>
  <file>
    <path>src/validation/body-generator.ts</path>
  </file>
  <file>
    <path>src/testing/test-normalizer.ts</path>
  </file>
  <file>
    <path>src/generators/test-generator.ts</path>
  </file>
</args>
</read_file>

---

**User:**

[read_file for 5 files] Result:
<files>
<file><path>src/validation/route-matcher.ts</path>
<content lines="1-796">
  1 | /**
  2 |  * Route Matcher - Generic semantic route matching and validation
  3 |  * 
  4 |  * This module provides intelligent route matching and HTTP test validation
  5 |  * without hardcoding specific endpoints. It uses generic keyword extraction
  6 |  * and semantic analysis to match acceptance criteria to discovered routes.
  7 |  */
  8 | 
  9 | import type {
 10 |   QATask,
 11 |   AcceptanceCriterion,
 12 |   DiscoveredRoute,
 13 |   HTTPTestStep,
 14 | } from '../types/index.js';
 15 | 
 16 | /**
 17 |  * Result of matching a route to a task
 18 |  */
 19 | export interface RouteMatchResult {
 20 |   matched: boolean;
 21 |   confidence: 'high' | 'medium' | 'low';
 22 |   route: DiscoveredRoute | null;
 23 |   method: string | null;
 24 |   reasoning: string;
 25 | }
 26 | 
 27 | /**
 28 |  * Result of validating and normalizing an HTTP test step
 29 |  */
 30 | export interface ValidationResult {
 31 |   valid: boolean;
 32 |   errors: string[];
 33 |   warnings: string[];
 34 |   normalized: {
 35 |     method?: string;
 36 |     url?: string;
 37 |     body?: Record<string, any>;
 38 |     expectedStatus?: number;
 39 |     acceptableStatuses?: number[];
 40 |   };
 41 | }
 42 | 
 43 | /**
 44 |  * Detected resource and action from text analysis
 45 |  */
 46 | export interface ResourceAction {
 47 |   resource: string | null;
 48 |   action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'login' | 'register' | 'verify' | 'activate' | 'reset' | 'refresh' | 'search' | null;
 49 |   keywords: string[];
 50 | }
 51 | 
 52 | /**
 53 |  * HTTP method mapping for different action types
 54 |  * Does NOT include hardcoded action types like 'auth' or 'health'
 55 |  * Those should be inferred from actual routes and IBM reasoning
 56 |  */
 57 | const ACTION_TO_METHOD_MAP: Record<string, string[]> = {
 58 |   create: ['POST'],
 59 |   read: ['GET'],
 60 |   update: ['PUT', 'PATCH'],
 61 |   delete: ['DELETE'],
 62 |   list: ['GET'],
 63 |   login: ['POST'],
 64 |   register: ['POST'],
 65 |   verify: ['POST', 'GET'],
 66 |   activate: ['POST', 'PUT'],
 67 |   reset: ['POST'],
 68 |   refresh: ['POST'],
 69 |   search: ['GET', 'POST'],
 70 | };
 71 | 
 72 | /**
 73 |  * Action verb patterns for detecting generic CRUD operations
 74 |  * Intentionally avoids business-specific keywords like 'login', 'register', 'auth', 'token'
 75 |  * Those concepts are handled by IBM reasoning, not hardcoded patterns
 76 |  */
 77 | const ACTION_PATTERNS = {
 78 |   create: /\b(create|add|submit|post|new)\b/i,
 79 |   read: /\b(get|retrieve|fetch|view|check|show)\b/i,
 80 |   update: /\b(update|edit|modify|change|patch|put)\b/i,
 81 |   delete: /\b(delete|remove|destroy)\b/i,
 82 |   list: /\b(list|all|index|collection|retrieve\s+all)\b/i,
 83 |   login: /\b(login|log\s*in|signin|sign\s*in|authenticate|auth)\b/i,
 84 |   register: /\b(register|signup|sign\s*up|create\s+account)\b/i,
 85 |   verify: /\b(verify|validate|confirm|check)\b/i,
 86 |   activate: /\b(activate|enable)\b/i,
 87 |   reset: /\b(reset|forgot|recover)\b/i,
 88 |   refresh: /\b(refresh|renew)\b/i,
 89 |   search: /\b(search|find|query|filter)\b/i,
 90 | };
 91 | 
 92 | /**
 93 |  * Extract keywords from text by tokenizing and filtering
 94 |  */
 95 | function extractKeywords(text: string): string[] {
 96 |   // Convert to lowercase and split on non-alphanumeric characters
 97 |   const tokens = text.toLowerCase()
 98 |     .split(/[^a-z0-9]+/)
 99 |     .filter(token => token.length > 2); // Filter out very short tokens
100 |   
101 |   // Remove common stop words
102 |   const stopWords = new Set([
103 |     'the', 'and', 'for', 'with', 'that', 'this', 'from', 'should',
104 |     'must', 'can', 'will', 'are', 'was', 'were', 'been', 'have',
105 |     'has', 'had', 'does', 'did', 'but', 'not', 'when', 'where',
106 |   ]);
107 |   
108 |   return tokens.filter(token => !stopWords.has(token));
109 | }
110 | 
111 | /**
112 |  * Detect action from text using generic CRUD patterns only
113 |  * Does NOT attempt to detect business-specific actions like 'auth', 'health', etc.
114 |  * Those require inspection of actual route paths and AI reasoning.
115 |  * 
116 |  * @param text - Text to analyze (acceptance criterion, task title, etc.)
117 |  * @returns Detected action and extracted keywords
118 |  * 
119 |  * @example
120 |  * ```typescript
121 |  * detectResourceAndAction("User should be able to create new items")
122 |  * // Returns: { resource: null, action: "create", keywords: [...] }
123 |  * 
124 |  * detectResourceAndAction("Retrieve system status")
125 |  * // Returns: { resource: null, action: "read", keywords: [...] }
126 |  * ```
127 |  */
128 | export function detectResourceAndAction(text: string): ResourceAction {
129 |   const keywords = extractKeywords(text);
130 |   
131 |   // Detect action using enhanced patterns (including domain-specific actions)
132 |   let action: ResourceAction['action'] = null;
133 |   let bestActionScore = 0;
134 |   
135 |   // Try all action patterns and pick the best match
136 |   for (const [actionType, pattern] of Object.entries(ACTION_PATTERNS)) {
137 |     if (pattern.test(text)) {
138 |       // Calculate score based on pattern specificity
139 |       // Domain-specific actions (login, register, etc.) get higher priority
140 |       const isDomainSpecific = ['login', 'register', 'verify', 'activate', 'reset', 'refresh', 'search'].includes(actionType);
141 |       const score = isDomainSpecific ? 2 : 1;
142 |       
143 |       if (score > bestActionScore) {
144 |         action = actionType as ResourceAction['action'];
145 |         bestActionScore = score;
146 |       }
147 |     }
148 |   }
149 |   
150 |   // Re-enable resource detection from paths and text
151 |   // Extract potential resource names from text (nouns that might be API resources)
152 |   const resource = extractResourceFromText(text);
153 |   
154 |   return { resource, action, keywords };
155 | }
156 | 
157 | /**
158 |  * Extract potential resource name from text
159 |  * Looks for common REST resource patterns
160 |  */
161 | function extractResourceFromText(text: string): string | null {
162 |   const textLower = text.toLowerCase();
163 |   
164 |   // Common resource patterns in REST APIs
165 |   const resourcePatterns = [
166 |     /\b(user|account|profile|customer|client)s?\b/i,
167 |     /\b(product|item|article|post|entry)s?\b/i,
168 |     /\b(order|transaction|payment|invoice)s?\b/i,
169 |     /\b(comment|review|rating|feedback)s?\b/i,
170 |     /\b(category|tag|label|group)s?\b/i,
171 |     /\b(file|document|image|media)s?\b/i,
172 |     /\b(message|notification|alert|email)s?\b/i,
173 |     /\b(session|token|credential|auth)s?\b/i,
174 |     /\b(setting|config|preference|option)s?\b/i,
175 |     /\b(report|analytics|stat|metric)s?\b/i,
176 |   ];
177 |   
178 |   for (const pattern of resourcePatterns) {
179 |     const match = textLower.match(pattern);
180 |     if (match) {
181 |       // Return the matched resource in singular form
182 |       let resource = match[1];
183 |       // Remove trailing 's' if present
184 |       if (resource.endsWith('s') && resource.length > 3) {
185 |         resource = resource.slice(0, -1);
186 |       }
187 |       return resource;
188 |     }
189 |   }
190 |   
191 |   return null;
192 | }
193 | 
194 | /**
195 |  * Calculate similarity score between two sets of keywords
196 |  */
197 | function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
198 |   if (keywords1.length === 0 || keywords2.length === 0) {
199 |     return 0;
200 |   }
201 |   
202 |   const set1 = new Set(keywords1);
203 |   const set2 = new Set(keywords2);
204 |   
205 |   let matches = 0;
206 |   for (const keyword of set1) {
207 |     if (set2.has(keyword)) {
208 |       matches++;
209 |     }
210 |   }
211 |   
212 |   // Jaccard similarity
213 |   const union = new Set([...set1, ...set2]);
214 |   return matches / union.size;
215 | }
216 | 
217 | /**
218 |  * Check if a route path matches a resource name
219 |  */
220 | function pathMatchesResource(path: string, resource: string | null): boolean {
221 |   if (!resource) return false;
222 |   
223 |   const pathLower = path.toLowerCase();
224 |   const resourceLower = resource.toLowerCase();
225 |   
226 |   // Check for exact match or plural form
227 |   const hasExactMatch = pathLower.includes(resourceLower);
228 |   const hasPluralMatch = pathLower.includes(resourceLower + 's') ||
229 |                          pathLower.includes(resourceLower + 'es');
230 |   
231 |   // Also check for path segments (e.g., /api/users vs /api/user-settings)
232 |   const pathSegments = pathLower.split('/').filter(s => s.length > 0);
233 |   const hasSegmentMatch = pathSegments.some(segment =>
234 |     segment === resourceLower ||
235 |     segment === resourceLower + 's' ||
236 |     segment === resourceLower + 'es'
237 |   );
238 |   
239 |   return hasExactMatch || hasPluralMatch || hasSegmentMatch;
240 | }
241 | 
242 | /**
243 |  * Check if path contains parameter placeholders
244 |  * e.g., /users/{id}, /users/:id, /users/[id]
245 |  */
246 | function hasPathParameters(path: string): boolean {
247 |   return /\{[^}]+\}|:[a-zA-Z_][a-zA-Z0-9_]*|\[[^\]]+\]/.test(path);
248 | }
249 | 
250 | /**
251 |  * Normalize a path for comparison: remove trailing slash, strip base URL if present,
252 |  * and normalize parameter placeholders to a common token.
253 |  */
254 | function normalizePathForComparison(path: string): string {
255 |   if (!path) return '';
256 |   // If an absolute URL, extract the path portion
257 |   try {
258 |     if (path.startsWith('http://') || path.startsWith('https://')) {
259 |       const u = new URL(path);
260 |       path = u.pathname || '/';
261 |     }
262 |   } catch {
263 |     // ignore URL parse errors
264 |   }
265 | 
266 |   // Remove query and fragment
267 |   path = path.split('?')[0].split('#')[0];
268 | 
269 |   // Remove trailing slash (but keep root)
270 |   if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
271 | 
272 |   // Normalize parameter placeholders to :param
273 |   path = path.replace(/\{[^}]+\}|:[^\/]+|\[[^\]]+\]/g, ':param');
274 | 
275 |   return path.toLowerCase();
276 | }
277 | 
278 | /**
279 |  * Calculate path similarity score considering parameter patterns
280 |  */
281 | function calculatePathSimilarity(path1: string, path2: string): number {
282 |   const segments1 = path1.toLowerCase().split('/').filter(s => s.length > 0);
283 |   const segments2 = path2.toLowerCase().split('/').filter(s => s.length > 0);
284 |   
285 |   if (segments1.length !== segments2.length) {
286 |     return 0;
287 |   }
288 |   
289 |   let matches = 0;
290 |   for (let i = 0; i < segments1.length; i++) {
291 |     const seg1 = segments1[i];
292 |     const seg2 = segments2[i];
293 |     
294 |     // Exact match
295 |     if (seg1 === seg2) {
296 |       matches++;
297 |     }
298 |     // Both are parameters
299 |     else if (isPathParameter(seg1) && isPathParameter(seg2)) {
300 |       matches += 0.8; // Partial credit for parameter match
301 |     }
302 |     // One is parameter, check if other could be a value
303 |     else if (isPathParameter(seg1) || isPathParameter(seg2)) {
304 |       matches += 0.5; // Some credit for potential parameter match
305 |     }
306 |   }
307 |   
308 |   return matches / segments1.length;
309 | }
310 | 
311 | /**
312 |  * Check if a path segment is a parameter
313 |  */
314 | function isPathParameter(segment: string): boolean {
315 |   return /^\{[^}]+\}$|^:[a-zA-Z_][a-zA-Z0-9_]*$|^\[[^\]]+\]$/.test(segment);
316 | }
317 | 
318 | /**
319 |  * Infer HTTP method from action type
320 |  */
321 | function inferMethodFromAction(action: ResourceAction['action']): string | null {
322 |   if (!action) return null;
323 |   
324 |   const methods = ACTION_TO_METHOD_MAP[action];
325 |   return methods ? methods[0] : null;
326 | }
327 | 
328 | /**
329 |  * Match a route to a task using generic semantic matching
330 |  * 
331 |  * This function analyzes the task and acceptance criterion text to find
332 |  * the most appropriate route from the discovered routes. It uses keyword
333 |  * extraction, resource detection, and action inference to make intelligent
334 |  * matches without hardcoding specific endpoints.
335 |  * 
336 |  * @param task - The QA task to match
337 |  * @param acceptanceCriterion - The acceptance criterion being tested
338 |  * @param discoveredRoutes - List of routes discovered from the application
339 |  * @param openApiSpec - Optional OpenAPI specification for additional context
340 |  * @returns Match result with confidence level and reasoning
341 |  * 
342 |  * @example
343 |  * ```typescript
344 |  * const result = matchRouteToTask(
345 |  *   task,
346 |  *   { id: 'AC-1', description: 'User can register with valid email' },
347 |  *   discoveredRoutes
348 |  * );
349 |  * 
350 |  * if (result.matched && result.confidence === 'high') {
351 |  *   console.log(`Matched to ${result.route.path} with ${result.method}`);
352 |  * }
353 |  * ```
354 |  */
355 | export function matchRouteToTask(
356 |   task: QATask,
357 |   acceptanceCriterion: AcceptanceCriterion,
358 |   discoveredRoutes: DiscoveredRoute[],
359 |   openApiSpec?: any
360 | ): RouteMatchResult {
361 |   // Combine text from task and acceptance criterion
362 |   const combinedText = `${task.title} ${acceptanceCriterion.description}`;
363 |   
364 |   // Detect resource and action
365 |   const { resource, action, keywords } = detectResourceAndAction(combinedText);
366 |   
367 |   // Infer expected HTTP method
368 |   const expectedMethod = inferMethodFromAction(action);
369 |   
370 |   if (discoveredRoutes.length === 0) {
371 |     return {
372 |       matched: false,
373 |       confidence: 'low',
374 |       route: null,
375 |       method: expectedMethod,
376 |       reasoning: 'No routes discovered from the application',
377 |     };
378 |   }
379 | 
380 |   // Prefer a route whose path tokens are directly reflected in the task text.
381 |   const directMatch = discoveredRoutes.find(route => {
382 |     if (expectedMethod && route.method.toUpperCase() !== expectedMethod.toUpperCase()) {
383 |       return false;
384 |     }
385 | 
386 |     const normalizedPath = normalizePathForComparison(route.path);
387 |     const pathTokens = normalizedPath
388 |       .split('/')
389 |       .filter(token => token.length > 0 && token !== 'api' && !/^v\d+$/.test(token) && token !== ':param');
390 | 
391 |     if (pathTokens.length === 0) {
392 |       return false;
393 |     }
394 | 
395 |     return pathTokens.every(token => keywords.includes(token) || keywords.some(keyword => keyword.includes(token) || token.includes(keyword)));
396 |   });
397 | 
398 |   if (directMatch && expectedMethod) {
399 |     return {
400 |       matched: true,
401 |       confidence: 'high',
402 |       route: directMatch,
403 |       method: directMatch.method,
404 |       reasoning: `Direct route-token match for ${directMatch.method.toUpperCase()} ${directMatch.path}`,
405 |     };
406 |   }
407 |   
408 |   // Score each route
409 |   interface ScoredRoute {
410 |     route: DiscoveredRoute;
411 |     score: number;
412 |     methodMatch: boolean;
413 |     pathMatch: boolean;
414 |     keywordSimilarity: number;
415 |   }
416 |   
417 |   const scoredRoutes: ScoredRoute[] = discoveredRoutes.map(route => {
418 |     const routeKeywords = extractKeywords(route.path + ' ' + (route.description || ''));
419 |     const keywordSimilarity = calculateKeywordSimilarity(keywords, routeKeywords);
420 |     const methodMatch = !expectedMethod || route.method.toUpperCase() === expectedMethod.toUpperCase();
421 |     const pathMatch = pathMatchesResource(route.path, resource);
422 |     
423 |     // Calculate improved score with better weighting
424 |     let score = 0;
425 |     
426 |     // Method match is critical (30 points)
427 |     if (methodMatch) score += 30;
428 |     
429 |     // Path/resource match is very important (35 points)
430 |     if (pathMatch) {
431 |       score += 35;
432 |     }
433 |     
434 |     // Keyword similarity (25 points)
435 |     score += keywordSimilarity * 25;
436 |     
437 |     // OpenAPI description match (15 points)
438 |     if (openApiSpec && route.description) {
439 |       const descKeywords = extractKeywords(route.description);
440 |       const descSimilarity = calculateKeywordSimilarity(keywords, descKeywords);
441 |       score += descSimilarity * 15;
442 |     }
443 |     
444 |     // Bonus for exact action match in path (10 points)
445 |     if (action) {
446 |       const pathLower = route.path.toLowerCase();
447 |       const actionLower = action.toLowerCase();
448 |       if (pathLower.includes(actionLower)) {
449 |         score += 10;
450 |       }
451 |     }
452 |     
453 |     // Penalty for path parameter mismatch
454 |     const hasParams = hasPathParameters(route.path);
455 |     const expectsParams = combinedText.toLowerCase().includes('id') ||
456 |                           combinedText.toLowerCase().includes('specific') ||
457 |                           combinedText.toLowerCase().includes('particular');
458 |     if (hasParams !== expectsParams) {
459 |       score -= 5;
460 |     }
461 |     
462 |     return {
463 |       route,
464 |       score,
465 |       methodMatch,
466 |       pathMatch,
467 |       keywordSimilarity,
468 |     };
469 |   });
470 |   
471 |   // Sort by score
472 |   scoredRoutes.sort((a, b) => b.score - a.score);
473 |   
474 |   const bestMatch = scoredRoutes[0];
475 |   const secondBestMatch = scoredRoutes[1];
476 |   
477 |   // Check for no matches
478 |   if (bestMatch.score === 0) {
479 |     return {
480 |       matched: false,
481 |       confidence: 'low',
482 |       route: null,
483 |       method: expectedMethod,
484 |       reasoning: 'No routes matched the task criteria',
485 |     };
486 |   }
487 |   
488 |   // Determine confidence level with improved thresholds
489 |   let confidence: 'high' | 'medium' | 'low';
490 |   let reasoning: string;
491 |   
492 |   // Check for ambiguous matches (multiple routes with similar scores)
493 |   const isAmbiguous = secondBestMatch && (bestMatch.score - secondBestMatch.score) < 10;
494 |   
495 |   if (bestMatch.score >= 70 && !isAmbiguous) {
496 |     confidence = 'high';
497 |     reasoning = `Strong match (score: ${bestMatch.score.toFixed(1)}): method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
498 |   } else if (bestMatch.score >= 50) {
499 |     confidence = 'medium';
500 |     if (isAmbiguous) {
501 |       reasoning = `Ambiguous match (score: ${bestMatch.score.toFixed(1)} vs ${secondBestMatch.score.toFixed(1)}): Multiple routes match similarly. Consider: ${bestMatch.route.path} and ${secondBestMatch.route.path}`;
502 |     } else {
503 |       reasoning = `Partial match (score: ${bestMatch.score.toFixed(1)}): method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
504 |     }
505 |   } else {
506 |     confidence = 'low';
507 |     reasoning = `Weak match (score: ${bestMatch.score.toFixed(1)}): method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%. Consider manual verification.`;
508 |   }
509 |   
510 |   return {
511 |     matched: true,
512 |     confidence,
513 |     route: bestMatch.route,
514 |     method: bestMatch.route.method,
515 |     reasoning,
516 |   };
517 | }
518 | 
519 | /**
520 |  * Check if a URL is valid (not a stringified object or malformed)
521 |  */
522 | function isValidUrl(url: string): boolean {
523 |   // Check if it looks like a stringified JSON object
524 |   if (url.trim().startsWith('{') || url.trim().startsWith('[')) {
525 |     return false;
526 |   }
527 |   
528 |   // Check if it contains common JSON patterns
529 |   if (/"statusCode":|"message":|"error":/i.test(url)) {
530 |     return false;
531 |   }
532 |   
533 |   // Must start with / or http(s)://
534 |   return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://');
535 | }
536 | 
537 | /**
538 |  * Normalize a relative URL with base URL
539 |  */
540 | function normalizeUrl(url: string, baseUrl: string): string {
541 |   if (url.startsWith('http://') || url.startsWith('https://')) {
542 |     return url;
543 |   }
544 |   
545 |   // Remove trailing slash from baseUrl
546 |   const base = baseUrl.replace(/\/$/, '');
547 |   
548 |   // Ensure url starts with /
549 |   const path = url.startsWith('/') ? url : '/' + url;
550 |   
551 |   return base + path;
552 | }
553 | 
554 | /**
555 |  * Infer expected status codes based on HTTP method and context
556 |  */
557 | function inferExpectedStatuses(
558 |   method: string,
559 |   context: string,
560 |   _openApiSpec?: any
561 | ): { expectedStatus: number; acceptableStatuses: number[] } {
562 |   const methodUpper = method.toUpperCase();
563 |   const contextLower = context.toLowerCase();
564 |   
565 |   // Check for specific scenarios in context
566 |   if (contextLower.includes('invalid') || contextLower.includes('reject') || 
567 |       contextLower.includes('validation') || contextLower.includes('bad')) {
568 |     return { expectedStatus: 400, acceptableStatuses: [400, 422] };
569 |   }
570 |   
571 |   if (contextLower.includes('unauthorized') || contextLower.includes('not authenticated')) {
572 |     return { expectedStatus: 401, acceptableStatuses: [401] };
573 |   }
574 |   
575 |   if (contextLower.includes('forbidden') || contextLower.includes('not authorized')) {
576 |     return { expectedStatus: 403, acceptableStatuses: [403] };
577 |   }
578 |   
579 |   if (contextLower.includes('not found') || contextLower.includes('missing')) {
580 |     return { expectedStatus: 404, acceptableStatuses: [404] };
581 |   }
582 |   
583 |   if (contextLower.includes('duplicate') || contextLower.includes('conflict') || 
584 |       contextLower.includes('already exists')) {
585 |     return { expectedStatus: 409, acceptableStatuses: [409] };
586 |   }
587 |   
588 |   // Default success statuses by method
589 |   switch (methodUpper) {
590 |     case 'GET':
591 |       return { expectedStatus: 200, acceptableStatuses: [200] };
592 |     case 'POST':
593 |       return { expectedStatus: 201, acceptableStatuses: [200, 201] };
594 |     case 'PUT':
595 |     case 'PATCH':
596 |       return { expectedStatus: 200, acceptableStatuses: [200, 204] };
597 |     case 'DELETE':
598 |       return { expectedStatus: 204, acceptableStatuses: [200, 204] };
599 |     case 'HEAD':
600 |     case 'OPTIONS':
601 |       return { expectedStatus: 200, acceptableStatuses: [200, 204] };
602 |     default:
603 |       return { expectedStatus: 200, acceptableStatuses: [200] };
604 |   }
605 | }
606 | 
607 | /**
608 |  * Validate and normalize an HTTP test step
609 |  * 
610 |  * This function validates the structure and content of an HTTP test step,
611 |  * checking for common issues like invalid URLs, incorrect methods, or
612 |  * malformed data. It also normalizes the step by inferring missing values
613 |  * and providing sensible defaults.
614 |  * 
615 |  * @param step - The HTTP test step to validate
616 |  * @param discoveredRoutes - List of discovered routes for validation
617 |  * @param baseUrl - Base URL for normalizing relative URLs
618 |  * @returns Validation result with errors, warnings, and normalized values
619 |  * 
620 |  * @example
621 |  * ```typescript
622 |  * const result = validateAndNormalizeHTTPStep(
623 |  *   step,
624 |  *   discoveredRoutes,
625 |  *   'http://localhost:3000'
626 |  * );
627 |  * 
628 |  * if (!result.valid) {
629 |  *   console.error('Validation errors:', result.errors);
630 |  * } else {
631 |  *   // Use result.normalized for execution
632 |  * }
633 |  * ```
634 |  */
635 | export function validateAndNormalizeHTTPStep(
636 |   step: HTTPTestStep,
637 |   discoveredRoutes: DiscoveredRoute[],
638 |   baseUrl: string
639 | ): ValidationResult {
640 |   const errors: string[] = [];
641 |   const warnings: string[] = [];
642 |   const normalized: ValidationResult['normalized'] = {};
643 |   
644 |   // Validate method
645 |   const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
646 |   if (!validMethods.includes(step.method.toUpperCase())) {
647 |     errors.push(`Invalid HTTP method: ${step.method}. Must be one of: ${validMethods.join(', ')}`);
648 |   } else {
649 |     normalized.method = step.method.toUpperCase();
650 |   }
651 |   
652 |   // Validate URL
653 |   if (typeof step.url !== 'string') {
654 |     errors.push(`URL must be a string, got: ${typeof step.url}`);
655 |   } else if (!isValidUrl(step.url)) {
656 |     errors.push(`Invalid URL format: ${step.url}. URL appears to be a stringified object or malformed.`);
657 |   } else {
658 |     normalized.url = normalizeUrl(step.url, baseUrl);
659 |     
660 |     // Check if URL matches any discovered route
661 |     const urlPath = step.url.split('?')[0]; // Remove query params
662 |     const normalizedUrlPath = normalizePathForComparison(urlPath);
663 | 
664 |     const matchingRoute = discoveredRoutes.find(route => {
665 |       const routeNormalized = normalizePathForComparison(route.path);
666 |       const methodMatches = route.method.toUpperCase() === step.method.toUpperCase();
667 |       return methodMatches && (routeNormalized === normalizedUrlPath || calculatePathSimilarity(route.path, urlPath) > 0.75);
668 |     });
669 |     
670 |     if (!matchingRoute && discoveredRoutes.length > 0) {
671 |       warnings.push(`URL ${urlPath} with method ${step.method} not found in discovered routes. This may indicate a typo or undiscovered endpoint.`);
672 |     }
673 |   }
674 |   
675 |   // Validate and normalize body
676 |   if (step.body !== null && step.body !== undefined) {
677 |     if (typeof step.body !== 'object' || Array.isArray(step.body)) {
678 |       warnings.push(`Body should be an object, got: ${typeof step.body}`);
679 |     }
680 |     normalized.body = step.body;
681 |   }
682 |   
683 |   // Validate and normalize expected status
684 |   if (step.expectedStatus) {
685 |     if (typeof step.expectedStatus !== 'number' || step.expectedStatus < 100 || step.expectedStatus > 599) {
686 |       errors.push(`Invalid expectedStatus: ${step.expectedStatus}. Must be a valid HTTP status code (100-599).`);
687 |     } else {
688 |       normalized.expectedStatus = step.expectedStatus;
689 |     }
690 |   } else {
691 |     // Infer expected status from method and description
692 |     const inferred = inferExpectedStatuses(step.method, step.description);
693 |     normalized.expectedStatus = inferred.expectedStatus;
694 |     warnings.push(`No expectedStatus provided. Inferred ${inferred.expectedStatus} based on method and context.`);
695 |   }
696 |   
697 |   // Validate and normalize acceptable statuses
698 |   if (step.acceptableStatuses && step.acceptableStatuses.length > 0) {
699 |     const invalidStatuses = step.acceptableStatuses.filter(
700 |       status => typeof status !== 'number' || status < 100 || status > 599
701 |     );
702 |     
703 |     if (invalidStatuses.length > 0) {
704 |       errors.push(`Invalid status codes in acceptableStatuses: ${invalidStatuses.join(', ')}`);
705 |     } else {
706 |       normalized.acceptableStatuses = step.acceptableStatuses;
707 |     }
708 |   } else {
709 |     // Infer acceptable statuses
710 |     const inferred = inferExpectedStatuses(step.method, step.description);
711 |     normalized.acceptableStatuses = inferred.acceptableStatuses;
712 |     
713 |     if (!step.expectedStatus) {
714 |       warnings.push(`No acceptableStatuses provided. Inferred ${JSON.stringify(inferred.acceptableStatuses)} based on method and context.`);
715 |     }
716 |   }
717 |   
718 |   return {
719 |     valid: errors.length === 0,
720 |     errors,
721 |     warnings,
722 |     normalized,
723 |   };
724 | }
725 | 
726 | /**
727 |  * Detect if a test scenario requires multiple steps
728 |  * 
729 |  * This function analyzes the test context to determine if it needs
730 |  * setup steps before the main action. For example, testing duplicate
731 |  * creation requires creating the resource first, then attempting to
732 |  * create it again.
733 |  * 
734 |  * @param context - Combined text from task and acceptance criterion
735 |  * @returns Object indicating if multi-step is needed and what type
736 |  */
737 | export function detectMultiStepRequirement(context: string): {
738 |   requiresMultiStep: boolean;
739 |   setupAction: 'create' | 'login' | null;
740 |   mainAction: 'create' | 'update' | 'delete' | 'read' | null;
741 |   reasoning: string;
742 | } {
743 |   const contextLower = context.toLowerCase();
744 |   
745 |   // Duplicate/conflict scenarios
746 |   if (contextLower.includes('duplicate') || contextLower.includes('already exists') || 
747 |       contextLower.includes('conflict')) {
748 |     return {
749 |       requiresMultiStep: true,
750 |       setupAction: 'create',
751 |       mainAction: 'create',
752 |       reasoning: 'Duplicate/conflict test requires creating resource first, then attempting duplicate creation',
753 |     };
754 |   }
755 |   
756 |   // Update scenarios
757 |   if (contextLower.includes('update') || contextLower.includes('modify') || 
758 |       contextLower.includes('edit')) {
759 |     return {
760 |       requiresMultiStep: true,
761 |       setupAction: 'create',
762 |       mainAction: 'update',
763 |       reasoning: 'Update test requires creating resource first, then updating it',
764 |     };
765 |   }
766 |   
767 |   // Delete scenarios
768 |   if (contextLower.includes('delete') || contextLower.includes('remove')) {
769 |     return {
770 |       requiresMultiStep: true,
771 |       setupAction: 'create',
772 |       mainAction: 'delete',
773 |       reasoning: 'Delete test requires creating resource first, then deleting it',
774 |     };
775 |   }
776 |   
777 |   // Auth-dependent scenarios
778 |   if (contextLower.includes('authenticated') || contextLower.includes('logged in') ||
779 |       contextLower.includes('authorized')) {
780 |     return {
781 |       requiresMultiStep: true,
782 |       setupAction: 'login',
783 |       mainAction: 'read',
784 |       reasoning: 'Auth-dependent test requires login first, then performing action',
785 |     };
786 |   }
787 |   
788 |   return {
789 |     requiresMultiStep: false,
790 |     setupAction: null,
791 |     mainAction: null,
792 |     reasoning: 'Single-step test sufficient',
793 |   };
794 | }
795 | 
796 | // Made with Bob
</content>
</file>
<file><path>src/discovery/route-discovery.ts</path>
<content lines="1-407">
  1 | import * as fs from 'fs/promises';
  2 | import * as path from 'path';
  3 | import * as yaml from 'js-yaml';
  4 | 
  5 | export interface DiscoveredRoute {
  6 |   method: string;
  7 |   path: string;
  8 |   handler?: string;
  9 |   file?: string;
 10 |   line?: number;
 11 |   /** Optional nearby source snippet (few lines) to help infer validation or schema */
 12 |   sourceSnippet?: string;
 13 |   /** Optional small set of validation/schema snippets discovered near handler */
 14 |   validationSnippets?: string[];
 15 | }
 16 | 
 17 | export interface RouteDiscoveryResult {
 18 |   routes: DiscoveredRoute[];
 19 |   framework: string;
 20 |   discoveryMethod: 'static-analysis' | 'openapi' | 'runtime-logs';
 21 | }
 22 | 
 23 | interface FrameworkPattern {
 24 |   name: string;
 25 |   filePatterns: string[];
 26 |   routePattern: RegExp;
 27 |   methodExtractor: (match: RegExpMatchArray, content: string, filePath: string) => DiscoveredRoute[];
 28 | }
 29 | 
 30 | const FRAMEWORK_PATTERNS: FrameworkPattern[] = [
 31 |   // Express (Node.js)
 32 |   {
 33 |     name: 'Express',
 34 |     filePatterns: ['**/*.js', '**/*.ts'],
 35 |     routePattern: /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
 36 |     methodExtractor: (match, content, filePath) => {
 37 |       const method = match[1].toUpperCase();
 38 |       const routePath = match[2];
 39 |       const line = content.substring(0, match.index).split('\n').length;
 40 |       const snippet = extractNearbySnippet(content, match.index || 0, 8);
 41 |       const validations = extractValidationSnippets(snippet);
 42 |       return [{
 43 |         method,
 44 |         path: routePath,
 45 |         file: filePath,
 46 |         line,
 47 |         sourceSnippet: snippet,
 48 |         validationSnippets: validations,
 49 |       }];
 50 |     }
 51 |   },
 52 |   // FastAPI (Python)
 53 |   {
 54 |     name: 'FastAPI',
 55 |     filePatterns: ['**/*.py'],
 56 |     routePattern: /@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
 57 |     methodExtractor: (match, content, filePath) => {
 58 |       const method = match[1].toUpperCase();
 59 |       const routePath = match[2];
 60 |       const line = content.substring(0, match.index).split('\n').length;
 61 |       const snippet = extractNearbySnippet(content, match.index || 0, 8);
 62 |       const validations = extractValidationSnippets(snippet);
 63 |       return [{
 64 |         method,
 65 |         path: routePath,
 66 |         file: filePath,
 67 |         line,
 68 |         sourceSnippet: snippet,
 69 |         validationSnippets: validations,
 70 |       }];
 71 |     }
 72 |   },
 73 |   // ASP.NET (C#)
 74 |   {
 75 |     name: 'ASP.NET',
 76 |     filePatterns: ['**/*.cs'],
 77 |     routePattern: /\[Http(Get|Post|Put|Delete|Patch)(?:\("([^"]+)"\))?\]/g,
 78 |     methodExtractor: (match, content, filePath) => {
 79 |       const method = match[1].toUpperCase();
 80 |       const routePath = match[2] || '/';
 81 |       const line = content.substring(0, match.index).split('\n').length;
 82 |       const snippet = extractNearbySnippet(content, match.index || 0, 8);
 83 |       const validations = extractValidationSnippets(snippet);
 84 | 
 85 |       // Look for [Route] attribute above
 86 |       const beforeMatch = content.substring(0, match.index!);
 87 |       const routeMatch = beforeMatch.match(/\[Route\("([^\"]+)"\)\]/);
 88 |       const basePath = routeMatch ? routeMatch[1] : '';
 89 | 
 90 |       return [{
 91 |         method,
 92 |         path: basePath + routePath,
 93 |         file: filePath,
 94 |         line,
 95 |         sourceSnippet: snippet,
 96 |         validationSnippets: validations,
 97 |       }];
 98 |     }
 99 |   },
100 |   // Spring Boot (Java)
101 |   {
102 |     name: 'Spring Boot',
103 |     filePatterns: ['**/*.java'],
104 |     routePattern: /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/g,
105 |     methodExtractor: (match, content, filePath) => {
106 |       const method = match[1].toUpperCase();
107 |       const routePath = match[2];
108 |       const line = content.substring(0, match.index).split('\n').length;
109 |       
110 |       // Look for @RequestMapping at class level
111 |       const beforeMatch = content.substring(0, match.index!);
112 |       const requestMappingMatch = beforeMatch.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
113 |       const basePath = requestMappingMatch ? requestMappingMatch[1] : '';
114 |       
115 |       return [{
116 |         method,
117 |         path: basePath + routePath,
118 |         file: filePath,
119 |         line
120 |       }];
121 |     }
122 |   },
123 |   // Go
124 |   {
125 |     name: 'Go',
126 |     filePatterns: ['**/*.go'],
127 |     routePattern: /(?:HandleFunc|GET|POST|PUT|DELETE|PATCH)\s*\(\s*["']([^"']+)["']/g,
128 |     methodExtractor: (match, content, filePath) => {
129 |       const routePath = match[1];
130 |       const line = content.substring(0, match.index).split('\n').length;
131 |       const snippet = extractNearbySnippet(content, match.index || 0, 8);
132 |       const validations = extractValidationSnippets(snippet);
133 | 
134 |       // Try to determine method from context
135 |       const beforeMatch = content.substring(Math.max(0, match.index! - 50), match.index!);
136 |       let method = 'GET'; // default
137 |       
138 |       if (beforeMatch.includes('POST') || match[0].startsWith('POST')) {
139 |         method = 'POST';
140 |       } else if (beforeMatch.includes('PUT') || match[0].startsWith('PUT')) {
141 |         method = 'PUT';
142 |       } else if (beforeMatch.includes('DELETE') || match[0].startsWith('DELETE')) {
143 |         method = 'DELETE';
144 |       } else if (beforeMatch.includes('PATCH') || match[0].startsWith('PATCH')) {
145 |         method = 'PATCH';
146 |       }
147 |       
148 |       return [{
149 |         method,
150 |         path: routePath,
151 |         file: filePath,
152 |         line,
153 |         sourceSnippet: snippet,
154 |         validationSnippets: validations,
155 |       }];
156 |     }
157 |   }
158 | ];
159 | 
160 | /**
161 |  * Extract a nearby snippet of source code around an index (number of lines)
162 |  */
163 | function extractNearbySnippet(content: string, index: number, contextLines = 8): string {
164 |   const lines = content.split('\n');
165 |   // Find line number for index
166 |   let charCount = 0;
167 |   let lineNumber = 0;
168 |   for (let i = 0; i < lines.length; i++) {
169 |     charCount += lines[i].length + 1; // +1 for newline
170 |     if (charCount >= index) {
171 |       lineNumber = i;
172 |       break;
173 |     }
174 |   }
175 | 
176 |   const start = Math.max(0, lineNumber - contextLines);
177 |   const end = Math.min(lines.length - 1, lineNumber + contextLines);
178 |   return lines.slice(start, end + 1).join('\n');
179 | }
180 | 
181 | /**
182 |  * Very small heuristic scan to pick out validation-like snippets from a source snippet.
183 |  * Keep this lightweight: just return lines that contain common validation keywords.
184 |  */
185 | function extractValidationSnippets(snippet: string): string[] {
186 |   const keywords = ['joi', 'validate(', 'schema', 'pydantic', 'marshmallow', 'zod', 'isEmail', 'IsEmail', '@IsEmail', 'bodyParser', 'express-validator', 'Joi.object', 'check(', 'tryParse', 'parse_obj'];
187 |   const lines = snippet.split('\n');
188 |   const found: string[] = [];
189 |   for (const line of lines) {
190 |     const lower = line.toLowerCase();
191 |     for (const kw of keywords) {
192 |       if (lower.includes(kw.toLowerCase())) {
193 |         found.push(line.trim());
194 |         break;
195 |       }
196 |     }
197 |   }
198 |   return found.slice(0, 10);
199 | }
200 | 
201 | async function findFiles(dir: string, patterns: string[]): Promise<string[]> {
202 |   const files: string[] = [];
203 |   
204 |   async function walk(currentDir: string) {
205 |     try {
206 |       const entries = await fs.readdir(currentDir, { withFileTypes: true });
207 |       
208 |       for (const entry of entries) {
209 |         const fullPath = path.join(currentDir, entry.name);
210 |         
211 |         // Skip node_modules, .git, etc.
212 |         if (entry.name === 'node_modules' || entry.name === '.git' || 
213 |             entry.name === 'venv' || entry.name === '__pycache__' ||
214 |             entry.name === 'bin' || entry.name === 'obj' || entry.name === 'target') {
215 |           continue;
216 |         }
217 |         
218 |         if (entry.isDirectory()) {
219 |           await walk(fullPath);
220 |         } else if (entry.isFile()) {
221 |           // Check if file matches any pattern
222 |           for (const pattern of patterns) {
223 |             const ext = pattern.replace('**/*', '');
224 |             if (fullPath.endsWith(ext)) {
225 |               files.push(fullPath);
226 |               break;
227 |             }
228 |           }
229 |         }
230 |       }
231 |     } catch (error) {
232 |       // Ignore permission errors
233 |     }
234 |   }
235 |   
236 |   await walk(dir);
237 |   return files;
238 | }
239 | 
240 | async function discoverRoutesFromCode(
241 |   projectPath: string,
242 |   framework: FrameworkPattern
243 | ): Promise<DiscoveredRoute[]> {
244 |   const routes: DiscoveredRoute[] = [];
245 |   const files = await findFiles(projectPath, framework.filePatterns);
246 |   
247 |   for (const file of files) {
248 |     try {
249 |       const content = await fs.readFile(file, 'utf-8');
250 |       const matches = Array.from(content.matchAll(framework.routePattern));
251 |       
252 |       for (const match of matches) {
253 |         const discoveredRoutes = framework.methodExtractor(match, content, file);
254 |         routes.push(...discoveredRoutes);
255 |       }
256 |     } catch (error) {
257 |       // Skip files that can't be read
258 |     }
259 |   }
260 |   
261 |   return routes;
262 | }
263 | 
264 | async function discoverRoutesFromOpenAPI(projectPath: string): Promise<DiscoveredRoute[]> {
265 |   const routes: DiscoveredRoute[] = [];
266 |   const possibleFiles = [
267 |     'openapi.json',
268 |     'openapi.yaml',
269 |     'openapi.yml',
270 |     'swagger.json',
271 |     'swagger.yaml',
272 |     'swagger.yml',
273 |     'api/openapi.json',
274 |     'api/openapi.yaml',
275 |     'docs/openapi.json',
276 |     'docs/openapi.yaml'
277 |   ];
278 |   
279 |   for (const fileName of possibleFiles) {
280 |     const filePath = path.join(projectPath, fileName);
281 |     
282 |     try {
283 |       const content = await fs.readFile(filePath, 'utf-8');
284 |       let spec: any;
285 |       
286 |       if (fileName.endsWith('.json')) {
287 |         spec = JSON.parse(content);
288 |       } else {
289 |         spec = yaml.load(content);
290 |       }
291 |       
292 |       // Parse OpenAPI spec
293 |       if (spec.paths) {
294 |         for (const [routePath, methods] of Object.entries(spec.paths)) {
295 |           for (const [method, details] of Object.entries(methods as any)) {
296 |             if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
297 |               routes.push({
298 |                 method: method.toUpperCase(),
299 |                 path: routePath,
300 |                 handler: (details as any).operationId,
301 |                 file: filePath
302 |               });
303 |             }
304 |           }
305 |         }
306 |       }
307 |       
308 |       // If we found routes, return them
309 |       if (routes.length > 0) {
310 |         return routes;
311 |       }
312 |     } catch (error) {
313 |       // File doesn't exist or can't be parsed, continue
314 |     }
315 |   }
316 |   
317 |   return routes;
318 | }
319 | 
320 | function detectFramework(_projectPath: string, projectType?: string): FrameworkPattern | null {
321 |   if (projectType) {
322 |     const typeMap: { [key: string]: string } = {
323 |       'node': 'Express',
324 |       'python': 'FastAPI',
325 |       'dotnet': 'ASP.NET',
326 |       'java': 'Spring Boot',
327 |       'go': 'Go'
328 |     };
329 |     
330 |     const frameworkName = typeMap[projectType.toLowerCase()];
331 |     if (frameworkName) {
332 |       return FRAMEWORK_PATTERNS.find(f => f.name === frameworkName) || null;
333 |     }
334 |   }
335 |   
336 |   // Auto-detect based on files present
337 |   // This is a simple heuristic
338 |   return FRAMEWORK_PATTERNS[0]; // Default to Express for now
339 | }
340 | 
341 | export async function discoverRoutes(
342 |   projectPath: string,
343 |   projectType?: string
344 | ): Promise<RouteDiscoveryResult> {
345 |   // First, try OpenAPI/Swagger
346 |   const openApiRoutes = await discoverRoutesFromOpenAPI(projectPath);
347 |   if (openApiRoutes.length > 0) {
348 |     return {
349 |       routes: openApiRoutes,
350 |       framework: 'OpenAPI',
351 |       discoveryMethod: 'openapi'
352 |     };
353 |   }
354 |   
355 |   // Try all frameworks if no project type specified
356 |   if (!projectType) {
357 |     const allRoutes: DiscoveredRoute[] = [];
358 |     let detectedFramework = 'Unknown';
359 |     
360 |     for (const framework of FRAMEWORK_PATTERNS) {
361 |       const routes = await discoverRoutesFromCode(projectPath, framework);
362 |       if (routes.length > 0) {
363 |         allRoutes.push(...routes);
364 |         detectedFramework = framework.name;
365 |       }
366 |     }
367 |     
368 |     return {
369 |       routes: allRoutes,
370 |       framework: detectedFramework,
371 |       discoveryMethod: 'static-analysis'
372 |     };
373 |   }
374 |   
375 |   // Use specific framework
376 |   const framework = detectFramework(projectPath, projectType);
377 |   if (!framework) {
378 |     return {
379 |       routes: [],
380 |       framework: 'Unknown',
381 |       discoveryMethod: 'static-analysis'
382 |     };
383 |   }
384 |   
385 |   const routes = await discoverRoutesFromCode(projectPath, framework);
386 |   
387 |   return {
388 |     routes,
389 |     framework: framework.name,
390 |     discoveryMethod: 'static-analysis'
391 |   };
392 | }
393 | 
394 | export async function discoverRoutesForMultipleProjects(
395 |   projectPaths: string[]
396 | ): Promise<Map<string, RouteDiscoveryResult>> {
397 |   const results = new Map<string, RouteDiscoveryResult>();
398 |   
399 |   for (const projectPath of projectPaths) {
400 |     const result = await discoverRoutes(projectPath);
401 |     results.set(projectPath, result);
402 |   }
403 |   
404 |   return results;
405 | }
406 | 
407 | // Made with Bob
</content>
</file>
<file><path>src/validation/body-generator.ts</path><file_outline>File: body-generator.ts (1185 lines)

No symbols found in this file.</file_outline>
<notice>This file is large (1184 lines). You will use the following strategy to understand this file:
- Inform the user you are going to use large file strategy, to efficiently understand the file
- Use the file_outline provided to get an overview of the file structure to help decide next action. This is not the full file. It is not the full depth of the contents.
- If you read the file, use precise file reads with line ranges for specific sections of interest
- Consider if other commands/tools are better suited for extracting information from that file type
- Use ask_followup_question tool if needed to identify the best next action
</notice></file>
<file><path>src/testing/test-normalizer.ts</path>
<content lines="1-873">
  1 | /**
  2 |  * Test Normalizer
  3 |  * Transforms IBM test plans into validated HTTP test configurations
  4 |  * Handles URL validation, route matching, and multi-step test support
  5 |  */
  6 | 
  7 | import {
  8 |   TestCase,
  9 |   TestContext,
 10 |   APITestConfig,
 11 |   APIRequest,
 12 |   APIAssertion,
 13 |   HTTPMethod,
 14 |   AssertionType,
 15 |   AuthType
 16 | } from '../types/index.js';
 17 | import { DiscoveredRoute } from '../discovery/route-discovery.js';
 18 | import { logger } from '../utils/logger.js';
 19 | 
 20 | /**
 21 |  * Normalization result with error classification
 22 |  */
 23 | export interface NormalizedTest {
 24 |   config: APITestConfig;
 25 |   isValid: boolean;
 26 |   errorType?: 'generation_error' | 'app_error' | 'uncertain';
 27 |   errorMessage?: string;
 28 |   originalTestCase: TestCase;
 29 | }
 30 | 
 31 | /**
 32 |  * Extended API Test Config with acceptable statuses
 33 |  */
 34 | interface ExtendedAPITestConfig extends APITestConfig {
 35 |   acceptableStatuses?: number[];
 36 | }
 37 | 
 38 | /**
 39 |  * Normalization options
 40 |  */
 41 | export interface NormalizationOptions {
 42 |   baseUrl?: string;
 43 |   discoveredRoutes?: DiscoveredRoute[];
 44 |   strictValidation?: boolean;
 45 | }
 46 | 
 47 | /**
 48 |  * Test Normalizer Class
 49 |  * Transforms IBM TestCase objects into validated APITestConfig objects
 50 |  */
 51 | export class TestNormalizer {
 52 |   private baseUrl?: string;
 53 |   private discoveredRoutes: DiscoveredRoute[];
 54 |   private strictValidation: boolean;
 55 | 
 56 |   constructor(options: NormalizationOptions = {}) {
 57 |     this.baseUrl = options.baseUrl;
 58 |     this.discoveredRoutes = options.discoveredRoutes || [];
 59 |     this.strictValidation = options.strictValidation ?? true;
 60 | 
 61 |     logger.debug('TestNormalizer initialized', {
 62 |       baseUrl: this.baseUrl,
 63 |       routeCount: this.discoveredRoutes.length,
 64 |       strictValidation: this.strictValidation
 65 |     });
 66 |   }
 67 | 
 68 |   /**
 69 |    * Normalize a single test case
 70 |    */
 71 |   normalizeTestCase(testCase: TestCase, context: TestContext): NormalizedTest[] {
 72 |     logger.debug(`Normalizing test case: ${testCase.name}`);
 73 | 
 74 |     try {
 75 |       // Check if this is a multi-step test (e.g., duplicate registration)
 76 |       const isMultiStep = this.isMultiStepTest(testCase);
 77 | 
 78 |       if (isMultiStep) {
 79 |         return this.normalizeMultiStepTest(testCase, context);
 80 |       }
 81 | 
 82 |       // Single test normalization
 83 |       const normalized = this.normalizeSingleTest(testCase, context);
 84 |       return [normalized];
 85 |     } catch (error) {
 86 |       logger.error(`Failed to normalize test case: ${testCase.name}`, error);
 87 |       
 88 |       return [{
 89 |         config: this.createFallbackConfig(testCase),
 90 |         isValid: false,
 91 |         errorType: 'generation_error',
 92 |         errorMessage: `Normalization failed: ${error instanceof Error ? error.message : String(error)}`,
 93 |         originalTestCase: testCase
 94 |       }];
 95 |     }
 96 |   }
 97 | 
 98 |   /**
 99 |    * Normalize multiple test cases
100 |    */
101 |   normalizeTestCases(testCases: TestCase[], context: TestContext): NormalizedTest[] {
102 |     const normalized: NormalizedTest[] = [];
103 | 
104 |     for (const testCase of testCases) {
105 |       const results = this.normalizeTestCase(testCase, context);
106 |       normalized.push(...results);
107 |     }
108 | 
109 |     logger.info(`Normalized ${testCases.length} test cases into ${normalized.length} API tests`);
110 |     logger.info(`Valid: ${normalized.filter(n => n.isValid).length}, Invalid: ${normalized.filter(n => !n.isValid).length}`);
111 | 
112 |     return normalized;
113 |   }
114 | 
115 |   /**
116 |    * Check if test case requires multiple API calls
117 |    */
118 |   private isMultiStepTest(testCase: TestCase): boolean {
119 |     const description = testCase.description.toLowerCase();
120 |     const name = testCase.name.toLowerCase();
121 |     
122 |     // Detect duplicate/conflict scenarios
123 |     const isDuplicateTest = 
124 |       description.includes('duplicate') ||
125 |       description.includes('already exists') ||
126 |       description.includes('conflict') ||
127 |       name.includes('duplicate');
128 | 
129 |     // Detect sequential operations
130 |     const hasSequentialSteps = testCase.steps.length > 1 && 
131 |       testCase.steps.some(step => {
132 |         const stepDesc = step.description.toLowerCase();
133 |         return stepDesc.includes('first') || 
134 |                stepDesc.includes('then') || 
135 |                stepDesc.includes('second') ||
136 |                stepDesc.includes('again');
137 |       });
138 | 
139 |     return isDuplicateTest || hasSequentialSteps;
140 |   }
141 | 
142 |   /**
143 |    * Infer expected status code using generic HTTP semantics
144 |    * Priority: explicit status > HTTP semantics > undefined
145 |    */
146 |   private inferExpectedStatus(testCase: TestCase, endpoint: string, method: HTTPMethod): number | undefined {
147 |     const expectedResult = String(testCase.expectedResult || '').toLowerCase();
148 |     
149 |     // Priority 1: Check for explicit status codes in expectedResult
150 |     const statusMatch = expectedResult.match(/(\d{3})/);
151 |     if (statusMatch) {
152 |       return parseInt(statusMatch[1], 10);
153 |     }
154 | 
155 |     // Priority 2: Apply generic HTTP semantics
156 |     return this.inferExpectedStatusFromSemantics(method, testCase, endpoint);
157 |   }
158 | 
159 |   /**
160 |    * Infer status code from generic HTTP semantics (no route-specific keywords)
161 |    */
162 |   private inferExpectedStatusFromSemantics(
163 |     method: string,
164 |     testCase: any,
165 |     _endpoint?: string
166 |   ): number | undefined {
167 |     const methodUpper = method.toUpperCase();
168 |     const description = `${testCase.name || ''} ${testCase.description || ''} ${testCase.expectedResult || ''}`.toLowerCase();
169 |     
170 |     // Check for explicit success/failure indicators in description
171 |     const isSuccessScenario = description.includes('success') ||
172 |                              description.includes('valid') ||
173 |                              description.includes('correct') ||
174 |                              description.includes('created') ||
175 |                              description.includes('updated') ||
176 |                              description.includes('deleted');
177 |     
178 |     const isFailureScenario = description.includes('invalid') ||
179 |                              description.includes('error') ||
180 |                              description.includes('fail') ||
181 |                              description.includes('reject') ||
182 |                              description.includes('incorrect') ||
183 |                              description.includes('wrong');
184 |     
185 |     // Apply generic HTTP semantics for success scenarios
186 |     if (isSuccessScenario && !isFailureScenario) {
187 |       switch (methodUpper) {
188 |         case 'GET': return 200;
189 |         case 'POST': return 201; // Resource creation
190 |         case 'PUT': return 200;
191 |         case 'PATCH': return 200;
192 |         case 'DELETE': return 200; // or 204, handled by acceptableStatuses
193 |       }
194 |     }
195 |     
196 |     // Apply generic HTTP semantics for failure scenarios
197 |     if (isFailureScenario) {
198 |       // Check for specific failure types (generic patterns, not route-specific)
199 |       if (description.includes('not found') || description.includes('missing') || description.includes('does not exist')) {
200 |         return 404;
201 |       }
202 |       if (description.includes('unauthorized') || description.includes('not authorized') || description.includes('authentication')) {
203 |         return 401;
204 |       }
205 |       if (description.includes('forbidden') || description.includes('permission') || description.includes('not allowed')) {
206 |         return 403;
207 |       }
208 |       if (description.includes('conflict') || description.includes('duplicate') || description.includes('already exists')) {
209 |         return 409;
210 |       }
211 |       if (description.includes('unprocessable') || description.includes('validation')) {
212 |         return 422;
213 |       }
214 |       // Generic validation/input error
215 |       return 400;
216 |     }
217 |     
218 |     // Default success statuses if no clear indicator
219 |     switch (methodUpper) {
220 |       case 'GET': return 200;
221 |       case 'POST': return 201;
222 |       case 'PUT': return 200;
223 |       case 'PATCH': return 200;
224 |       case 'DELETE': return 204;
225 |       default: return undefined;
226 |     }
227 |   }
228 | 
229 |   /**
230 |    * Get acceptable status codes when multiple are valid
231 |    */
232 |   private getAcceptableStatuses(
233 |     method: string,
234 |     expectedStatus: number
235 |   ): number[] {
236 |     const methodUpper = method.toUpperCase();
237 |     
238 |     // For successful operations, multiple statuses may be acceptable
239 |     if (expectedStatus === 200 || expectedStatus === 201) {
240 |       if (methodUpper === 'POST') return [200, 201];
241 |       if (methodUpper === 'PUT' || methodUpper === 'PATCH') return [200, 204];
242 |       if (methodUpper === 'DELETE') return [200, 204];
243 |     }
244 |     
245 |     // For validation errors, both 400 and 422 are acceptable
246 |     if (expectedStatus === 400) return [400, 422];
247 |     if (expectedStatus === 422) return [400, 422];
248 |     
249 |     // For no content responses
250 |     if (expectedStatus === 204) {
251 |       if (methodUpper === 'DELETE' || methodUpper === 'PUT' || methodUpper === 'PATCH') {
252 |         return [200, 204];
253 |       }
254 |     }
255 |     
256 |     // Otherwise, only the expected status
257 |     return [expectedStatus];
258 |   }
259 | 
260 |   /**
261 |    * Generate unique test data with generic field detection
262 |    */
263 |   private generateUniqueTestData(
264 |     body: any,
265 |     testType: string,
266 |     runId: string = Date.now().toString()
267 |   ): any {
268 |     if (!body || typeof body !== 'object') {
269 |       return body;
270 |     }
271 |     
272 |     const uniqueBody = { ...body };
273 |     
274 |     // Identify fields that should be unique (generic patterns)
275 |     for (const key of Object.keys(uniqueBody)) {
276 |       const lowerKey = key.toLowerCase();
277 |       const value = uniqueBody[key];
278 |       
279 |       // Skip if value is not a string or is empty
280 |       if (typeof value !== 'string' || !value) {
281 |         continue;
282 |       }
283 |       
284 |       // Email fields (any field containing 'email')
285 |       if (lowerKey.includes('email')) {
286 |         uniqueBody[key] = `traceqa-${testType}-${runId}@example.com`;
287 |       }
288 |       // Username fields (username, user, login)
289 |       else if (lowerKey.includes('username') || lowerKey === 'user' || lowerKey.includes('login')) {
290 |         uniqueBody[key] = `traceqa_${testType}_${runId}`;
291 |       }
292 |       // ID fields (but not if it's a reference to another resource like userId, orderId)
293 |       else if (lowerKey === 'id' && !lowerKey.includes('_id') && !lowerKey.endsWith('id')) {
294 |         uniqueBody[key] = `${testType}-${runId}`;
295 |       }
296 |       // Name fields (name, title, label)
297 |       else if ((lowerKey.includes('name') || lowerKey === 'title' || lowerKey === 'label') &&
298 |                typeof uniqueBody[key] === 'string') {
299 |         uniqueBody[key] = `TraceQA ${testType} ${runId}`;
300 |       }
301 |       // Slug fields (slug, handle, identifier)
302 |       else if (lowerKey.includes('slug') || lowerKey === 'handle' || lowerKey === 'identifier') {
303 |         uniqueBody[key] = `traceqa-${testType}-${runId}`;
304 |       }
305 |     }
306 |     
307 |     return uniqueBody;
308 |   }
309 | 
310 |   /**
311 |    * Normalize a multi-step test into multiple API test configs
312 |    */
313 |   private normalizeMultiStepTest(testCase: TestCase, context: TestContext): NormalizedTest[] {
314 |     const results: NormalizedTest[] = [];
315 | 
316 |     // For duplicate/conflict scenarios: create two separate tests
317 |     if (testCase.description.toLowerCase().includes('duplicate') ||
318 |         testCase.description.toLowerCase().includes('already exists') ||
319 |         testCase.description.toLowerCase().includes('conflict')) {
320 |       
321 |       // Extract endpoint and method for status inference
322 |       const step = testCase.steps[0] || testCase.steps[0];
323 |       const method = this.extractMethod(step, testCase);
324 |       const urlResult = this.extractAndValidateURL(step, testCase, context, method);
325 |       const endpoint = urlResult.url || '';
326 | 
327 |       // Generate unique test data for this test run (run-scoped)
328 |       const runId = Date.now().toString();
329 |       const originalBody = this.extractBody(step, method);
330 |       const uniqueBody = this.generateUniqueTestData(originalBody, 'step1', runId);
331 | 
332 |       // Infer expected status for first step (successful operation)
333 |       const inferredFirstStatus = this.inferExpectedStatus(testCase, endpoint, method);
334 |       const firstStatus = inferredFirstStatus || 201; // Default to 201 for POST
335 |       const firstAcceptableStatuses = this.getAcceptableStatuses(method, firstStatus);
336 | 
337 |       // First request: successful operation
338 |       const firstTest = this.normalizeSingleTest(testCase, context, {
339 |         stepIndex: 0,
340 |         expectedStatus: firstStatus,
341 |         nameSuffix: ' - Initial Request'
342 |       });
343 |       
344 |       // Add acceptableStatuses to config
345 |       (firstTest.config as ExtendedAPITestConfig).acceptableStatuses = firstAcceptableStatuses;
346 |       
347 |       // Replace body with unique data
348 |       if (uniqueBody) {
349 |         firstTest.config.request.body = uniqueBody;
350 |       }
351 |       results.push(firstTest);
352 | 
353 |       // Second request: duplicate/conflict operation (should be 409)
354 |       const secondStatus = 409; // Conflict for duplicate resources
355 |       const secondAcceptableStatuses = this.getAcceptableStatuses(method, secondStatus);
356 |       
357 |       const secondTest = this.normalizeSingleTest(testCase, context, {
358 |         stepIndex: 1,
359 |         expectedStatus: secondStatus,
360 |         nameSuffix: ' - Duplicate Request'
361 |       });
362 |       
363 |       // Add acceptableStatuses to config
364 |       (secondTest.config as ExtendedAPITestConfig).acceptableStatuses = secondAcceptableStatuses;
365 |       
366 |       // Use the SAME unique data for duplicate detection
367 |       if (uniqueBody) {
368 |         secondTest.config.request.body = uniqueBody;
369 |       }
370 |       results.push(secondTest);
371 | 
372 |       logger.debug(`Created multi-step test: ${testCase.name} -> ${results.length} API tests with unique data`);
373 |     } else {
374 |       // Generic multi-step: create test for each step
375 |       const runId = Date.now().toString();
376 |       
377 |       for (let i = 0; i < testCase.steps.length; i++) {
378 |         const step = testCase.steps[i];
379 |         const method = this.extractMethod(step, testCase);
380 |         const urlResult = this.extractAndValidateURL(step, testCase, context, method);
381 |         const endpoint = urlResult.url || '';
382 |         
383 |         // Generate unique data for each step
384 |         const originalBody = this.extractBody(step, method);
385 |         const uniqueBody = this.generateUniqueTestData(originalBody, `step${i + 1}`, runId);
386 |         
387 |         // Infer status and get acceptable statuses
388 |         const inferredStatus = this.inferExpectedStatus(testCase, endpoint, method);
389 |         const expectedStatus = inferredStatus || 200;
390 |         const acceptableStatuses = this.getAcceptableStatuses(method, expectedStatus);
391 |         
392 |         const stepTest = this.normalizeSingleTest(testCase, context, {
393 |           stepIndex: i,
394 |           expectedStatus: expectedStatus,
395 |           nameSuffix: ` - Step ${i + 1}`
396 |         });
397 |         
398 |         // Add acceptableStatuses to config
399 |         (stepTest.config as ExtendedAPITestConfig).acceptableStatuses = acceptableStatuses;
400 |         
401 |         // Replace body with unique data
402 |         if (uniqueBody) {
403 |           stepTest.config.request.body = uniqueBody;
404 |         }
405 |         
406 |         results.push(stepTest);
407 |       }
408 |     }
409 | 
410 |     return results;
411 |   }
412 | 
413 |   /**
414 |    * Normalize a single test case into an API test config
415 |    */
416 |   private normalizeSingleTest(
417 |     testCase: TestCase,
418 |     context: TestContext,
419 |     options?: {
420 |       stepIndex?: number;
421 |       expectedStatus?: number;
422 |       nameSuffix?: string;
423 |     }
424 |   ): NormalizedTest {
425 |     const stepIndex = options?.stepIndex ?? 0;
426 |     const step = testCase.steps[stepIndex] || testCase.steps[0];
427 | 
428 |     // Extract HTTP method
429 |     const method = this.extractMethod(step, testCase);
430 | 
431 |     // Extract and validate URL
432 |     const urlResult = this.extractAndValidateURL(step, testCase, context, method);
433 | 
434 |     // Extract request body
435 |     const body = this.extractBody(step, method);
436 | 
437 |     // Extract headers
438 |     const headers = this.extractHeaders(step);
439 | 
440 |     // Extract assertions
441 |     const assertions = this.extractAssertions(testCase, options?.expectedStatus);
442 | 
443 |     // Build API request
444 |     const request: APIRequest = {
445 |       method,
446 |       url: urlResult.url || '',
447 |       headers,
448 |       body,
449 |       timeout: 30000,
450 |       validateSSL: true,
451 |       auth: {
452 |         type: AuthType.NONE
453 |       }
454 |     };
455 | 
456 |     // Build API test config
457 |     const config: APITestConfig = {
458 |       name: testCase.name + (options?.nameSuffix || ''),
459 |       description: testCase.description,
460 |       request,
461 |       assertions,
462 |       retries: 2,
463 |       retryDelay: 1000,
464 |       continueOnFailure: false
465 |     };
466 | 
467 |     // Determine validity and error classification
468 |     const result: NormalizedTest = {
469 |       config,
470 |       isValid: urlResult.isValid,
471 |       originalTestCase: testCase
472 |     };
473 | 
474 |     if (!urlResult.isValid) {
475 |       result.errorType = urlResult.errorType;
476 |       result.errorMessage = urlResult.errorMessage;
477 |     }
478 | 
479 |     return result;
480 |   }
481 | 
482 |   /**
483 |    * Extract HTTP method from test step
484 |    */
485 |   private extractMethod(step: any, testCase: TestCase): HTTPMethod {
486 |     // Check step.method first (IBM provides this explicitly)
487 |     if (step.method) {
488 |       const methodStr = String(step.method).toUpperCase();
489 |       if (Object.values(HTTPMethod).includes(methodStr as HTTPMethod)) {
490 |         return methodStr as HTTPMethod;
491 |       }
492 |     }
493 | 
494 |     // Fallback: extract from action or description
495 |     const action = String(step.action || '').toLowerCase();
496 |     const description = String(step.description || '').toLowerCase();
497 |     const testName = testCase.name.toLowerCase();
498 | 
499 |     if (action.includes('post') || description.includes('post') || testName.includes('post')) {
500 |       return HTTPMethod.POST;
501 |     } else if (action.includes('put') || description.includes('put') || testName.includes('put')) {
502 |       return HTTPMethod.PUT;
503 |     } else if (action.includes('delete') || description.includes('delete') || testName.includes('delete')) {
504 |       return HTTPMethod.DELETE;
505 |     } else if (action.includes('patch') || description.includes('patch') || testName.includes('patch')) {
506 |       return HTTPMethod.PATCH;
507 |     }
508 | 
509 |     // Default to GET
510 |     return HTTPMethod.GET;
511 |   }
512 | 
513 |   /**
514 |    * Extract and validate URL from test step
515 |    */
516 |   private extractAndValidateURL(
517 |     step: any,
518 |     _testCase: TestCase,
519 |     context: TestContext,
520 |     method: HTTPMethod
521 |   ): {
522 |     url: string | undefined;
523 |     isValid: boolean;
524 |     errorType?: 'generation_error' | 'app_error' | 'uncertain';
525 |     errorMessage?: string;
526 |   } {
527 |     let url: string | undefined;
528 | 
529 |     // Extract URL from step.target or step.url
530 |     if (step.target && typeof step.target === 'string') {
531 |       url = step.target;
532 |     } else if (step.url && typeof step.url === 'string') {
533 |       url = step.url;
534 |     }
535 | 
536 |     // Check if URL is actually an object (the bug we're fixing)
537 |     if (step.target && typeof step.target === 'object') {
538 |       logger.warn(`Invalid URL: step.target is an object, not a string`, step.target);
539 |       return {
540 |         url: undefined,
541 |         isValid: false,
542 |         errorType: 'generation_error',
543 |         errorMessage: `TraceQA generation error: URL is an object (${JSON.stringify(step.target)}) instead of a string. This is a test generation issue, not an application bug.`
544 |       };
545 |     }
546 | 
547 |     if (step.url && typeof step.url === 'object') {
548 |       logger.warn(`Invalid URL: step.url is an object, not a string`, step.url);
549 |       return {
550 |         url: undefined,
551 |         isValid: false,
552 |         errorType: 'generation_error',
553 |         errorMessage: `TraceQA generation error: URL is an object (${JSON.stringify(step.url)}) instead of a string. This is a test generation issue, not an application bug.`
554 |       };
555 |     }
556 | 
557 |     // If no URL found, try to extract from description
558 |     if (!url) {
559 |       const description = String(step.description || '').toLowerCase();
560 |       const urlMatch = description.match(/(https?:\/\/[^\s]+)/);
561 |       if (urlMatch) {
562 |         url = urlMatch[1];
563 |       } else {
564 |         // Try to extract path from description
565 |         const pathMatch = description.match(/\/(api\/[^\s]+)/);
566 |         if (pathMatch) {
567 |           url = '/' + pathMatch[1];
568 |         }
569 |       }
570 |     }
571 | 
572 |     // Validate and normalize URL
573 |     if (!url) {
574 |       // No URL found - check if we have baseUrl or context
575 |       if (!this.baseUrl && !context.buildInfo.port) {
576 |         return {
577 |           url: undefined,
578 |           isValid: false,
579 |           errorType: 'uncertain',
580 |           errorMessage: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available. Cannot determine if this is a generation error or app error.'
581 |         };
582 |       }
583 | 
584 |       return {
585 |         url: undefined,
586 |         isValid: false,
587 |         errorType: 'uncertain',
588 |         errorMessage: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available. Cannot safely infer a URL.'
589 |       };
590 |     }
591 | 
592 |     // Normalize URL
593 |     const normalizedURL = this.normalizeURL(url, context);
594 | 
595 |     // Validate URL format
596 |     if (!this.isValidURL(normalizedURL)) {
597 |       return {
598 |         url: normalizedURL,
599 |         isValid: false,
600 |         errorType: 'generation_error',
601 |         errorMessage: `TraceQA generation error: Invalid URL format: ${normalizedURL}`
602 |       };
603 |     }
604 | 
605 |     // Validate against discovered routes
606 |     if (this.strictValidation && this.discoveredRoutes.length > 0) {
607 |       const routeMatch = this.matchRoute(normalizedURL, method);
608 |       if (!routeMatch) {
609 |         logger.warn(`URL ${normalizedURL} with method ${method} does not match any discovered routes`);
610 |         // This is not necessarily an error - the route might be valid but not discovered
611 |       }
612 |     }
613 | 
614 |     return {
615 |       url: normalizedURL,
616 |       isValid: true
617 |     };
618 |   }
619 | 
620 |   /**
621 |    * Normalize URL (handle relative paths, combine with baseUrl)
622 |    */
623 |   private normalizeURL(url: string, context: TestContext): string {
624 |     // If URL starts with http:// or https://, use as-is
625 |     if (url.startsWith('http://') || url.startsWith('https://')) {
626 |       return url;
627 |     }
628 | 
629 |     // If URL starts with /, combine with baseUrl
630 |     if (url.startsWith('/')) {
631 |       if (this.baseUrl) {
632 |         return `${this.baseUrl}${url}`;
633 |       } else if (context.buildInfo.port) {
634 |         return `http://localhost:${context.buildInfo.port}${url}`;
635 |       }
636 |     }
637 | 
638 |     // If URL doesn't start with / or http, assume it's a path
639 |     if (this.baseUrl) {
640 |       return `${this.baseUrl}/${url}`;
641 |     } else if (context.buildInfo.port) {
642 |       return `http://localhost:${context.buildInfo.port}/${url}`;
643 |     }
644 | 
645 |     return url;
646 |   }
647 | 
648 |   /**
649 |    * Validate URL format
650 |    */
651 |   private isValidURL(url: string): boolean {
652 |     // Check if URL is empty or undefined
653 |     if (!url || url.trim() === '') {
654 |       return false;
655 |     }
656 | 
657 |     // Check if URL starts with http://, https://, or /
658 |     if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
659 |       return true;
660 |     }
661 | 
662 |     return false;
663 |   }
664 | 
665 |   /**
666 |    * Match URL against discovered routes
667 |    */
668 |   private matchRoute(url: string, method: HTTPMethod): DiscoveredRoute | undefined {
669 |     // Extract path from URL (simple string parsing)
670 |     let path = url;
671 |     
672 |     // Remove protocol and host if present
673 |     if (url.startsWith('http://') || url.startsWith('https://')) {
674 |       const protocolEnd = url.indexOf('://') + 3;
675 |       const pathStart = url.indexOf('/', protocolEnd);
676 |       if (pathStart !== -1) {
677 |         path = url.substring(pathStart);
678 |       }
679 |     }
680 |     
681 |     // Remove query string and hash
682 |     const queryIndex = path.indexOf('?');
683 |     if (queryIndex !== -1) {
684 |       path = path.substring(0, queryIndex);
685 |     }
686 |     const hashIndex = path.indexOf('#');
687 |     if (hashIndex !== -1) {
688 |       path = path.substring(0, hashIndex);
689 |     }
690 | 
691 |     // Find matching route
692 |     return this.discoveredRoutes.find(route => {
693 |       return route.method === method && this.pathsMatch(route.path, path);
694 |     });
695 |   }
696 | 
697 |   /**
698 |    * Check if two paths match (handles path parameters)
699 |    */
700 |   private pathsMatch(routePath: string, requestPath: string): boolean {
701 |     // Exact match
702 |     if (routePath === requestPath) {
703 |       return true;
704 |     }
705 | 
706 |     // Handle path parameters like /api/users/:id
707 |     const routeParts = routePath.split('/');
708 |     const requestParts = requestPath.split('/');
709 | 
710 |     if (routeParts.length !== requestParts.length) {
711 |       return false;
712 |     }
713 | 
714 |     for (let i = 0; i < routeParts.length; i++) {
715 |       const routePart = routeParts[i];
716 |       const requestPart = requestParts[i];
717 | 
718 |       // Skip parameter parts (start with : or {)
719 |       if (routePart.startsWith(':') || routePart.startsWith('{')) {
720 |         continue;
721 |       }
722 | 
723 |       if (routePart !== requestPart) {
724 |         return false;
725 |       }
726 |     }
727 | 
728 |     return true;
729 |   }
730 | 
731 |   /**
732 |    * Extract request body from test step
733 |    */
734 |   private extractBody(step: any, method: HTTPMethod): any {
735 |     // Only extract body for methods that support it
736 |     if (![HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(method)) {
737 |       return undefined;
738 |     }
739 | 
740 |     // Check step.body first (IBM provides this)
741 |     if (step.body) {
742 |       return step.body;
743 |     }
744 | 
745 |     // Fallback to step.value
746 |     if (step.value) {
747 |       try {
748 |         return JSON.parse(step.value);
749 |       } catch {
750 |         return step.value;
751 |       }
752 |     }
753 | 
754 |     return undefined;
755 |   }
756 | 
757 |   /**
758 |    * Extract headers from test step
759 |    */
760 |   private extractHeaders(step: any): Record<string, string> {
761 |     const headers: Record<string, string> = {
762 |       'Content-Type': 'application/json'
763 |     };
764 | 
765 |     if (step.headers && typeof step.headers === 'object') {
766 |       Object.assign(headers, step.headers);
767 |     }
768 | 
769 |     return headers;
770 |   }
771 | 
772 |   /**
773 |    * Extract assertions from test case
774 |    */
775 |   private extractAssertions(testCase: TestCase, overrideStatus?: number): APIAssertion[] {
776 |     const assertions: APIAssertion[] = [];
777 | 
778 |     // Parse expectedResult
779 |     const expectedResult = String(testCase.expectedResult || '');
780 | 
781 |     // Check if expectedResult is an object (another bug to handle)
782 |     if (typeof testCase.expectedResult === 'object' && testCase.expectedResult !== null) {
783 |       const resultObj = testCase.expectedResult as any;
784 |       
785 |       // Extract status code from object
786 |       if (resultObj.statusCode) {
787 |         assertions.push({
788 |           type: AssertionType.STATUS_CODE,
789 |           expected: resultObj.statusCode,
790 |           operator: 'equals'
791 |         });
792 |       }
793 | 
794 |       // Extract body assertions from object
795 |       if (resultObj.body) {
796 |         assertions.push({
797 |           type: AssertionType.BODY_CONTAINS,
798 |           expected: JSON.stringify(resultObj.body),
799 |           operator: 'contains'
800 |         });
801 |       }
802 | 
803 |       return assertions;
804 |     }
805 | 
806 |     // Extract status code from string
807 |     let expectedStatus = overrideStatus || 200;
808 | 
809 |     const statusCodeMatch = expectedResult.match(/(\d{3})/);
810 |     if (statusCodeMatch) {
811 |       expectedStatus = parseInt(statusCodeMatch[1], 10);
812 |     } else {
813 |       // Infer from keywords
814 |       const lower = expectedResult.toLowerCase();
815 |       if (lower.includes('created')) {
816 |         expectedStatus = 201;
817 |       } else if (lower.includes('bad request') || lower.includes('invalid')) {
818 |         expectedStatus = 400;
819 |       } else if (lower.includes('unauthorized')) {
820 |         expectedStatus = 401;
821 |       } else if (lower.includes('forbidden')) {
822 |         expectedStatus = 403;
823 |       } else if (lower.includes('not found')) {
824 |         expectedStatus = 404;
825 |       } else if (lower.includes('conflict') || lower.includes('duplicate')) {
826 |         expectedStatus = 409;
827 |       } else if (lower.includes('error') || lower.includes('fail')) {
828 |         expectedStatus = 500;
829 |       }
830 |     }
831 | 
832 |     assertions.push({
833 |       type: AssertionType.STATUS_CODE,
834 |       expected: expectedStatus,
835 |       operator: 'equals'
836 |     });
837 | 
838 |     return assertions;
839 |   }
840 | 
841 |   /**
842 |    * Create a fallback config for failed normalization
843 |    */
844 |   private createFallbackConfig(testCase: TestCase): APITestConfig {
845 |     return {
846 |       name: testCase.name,
847 |       description: testCase.description,
848 |       request: {
849 |         method: HTTPMethod.GET,
850 |         url: '',
851 |         headers: {},
852 |         timeout: 30000,
853 |         validateSSL: true,
854 |         auth: {
855 |           type: AuthType.NONE
856 |         }
857 |       },
858 |       assertions: [],
859 |       retries: 0,
860 |       retryDelay: 1000,
861 |       continueOnFailure: false
862 |     };
863 |   }
864 | }
865 | 
866 | /**
867 |  * Create a test normalizer instance
868 |  */
869 | export function createTestNormalizer(options: NormalizationOptions = {}): TestNormalizer {
870 |   return new TestNormalizer(options);
871 | }
872 | 
873 | // Made with Bob
</content>
</file>
<file><path>src/generators/test-generator.ts</path>
<content lines="1-241">
  1 | export interface ExecutableHTTPTest {
  2 |   id: string;
  3 |   acceptanceCriterionId: string;
  4 |   title: string;
  5 |   method: string;
  6 |   url: string;
  7 |   headers?: Record<string, string>;
  8 |   body?: any;
  9 |   expectedStatus: number;
 10 |   expectedBodyContains?: string[];
 11 |   expectedBodySchema?: any;
 12 | }
 13 | 
 14 | export interface GeneratedTestArtifacts {
 15 |   qaTaskPlan: any; // existing QA task plan
 16 |   httpTests: ExecutableHTTPTest[];
 17 |   generatedAt: string;
 18 |   metadata: {
 19 |     totalTests: number;
 20 |     apiTests: number;
 21 |     manualTests: number;
 22 |   };
 23 | }
 24 | 
 25 | /**
 26 |  * Extract HTTP method from test step description
 27 |  */
 28 | function extractMethod(step: string): string {
 29 |   const upperStep = step.toUpperCase();
 30 |   if (upperStep.includes('POST')) return 'POST';
 31 |   if (upperStep.includes('PUT')) return 'PUT';
 32 |   if (upperStep.includes('PATCH')) return 'PATCH';
 33 |   if (upperStep.includes('DELETE')) return 'DELETE';
 34 |   if (upperStep.includes('GET')) return 'GET';
 35 |   return 'GET'; // default
 36 | }
 37 | 
 38 | /**
 39 |  * Extract URL from test step description
 40 |  */
 41 | function extractUrl(step: string): string {
 42 |   // Look for common URL patterns
 43 |   const urlMatch = step.match(/(?:to|at|endpoint)\s+[`"]?([\/\w\-{}:]+)[`"]?/i);
 44 |   if (urlMatch) {
 45 |     return urlMatch[1];
 46 |   }
 47 |   
 48 |   // Look for paths starting with /
 49 |   const pathMatch = step.match(/[`"]?(\/[\w\-\/{}:]+)[`"]?/);
 50 |   if (pathMatch) {
 51 |     return pathMatch[1];
 52 |   }
 53 |   
 54 |   return '/api/endpoint'; // default placeholder
 55 | }
 56 | 
 57 | /**
 58 |  * Extract expected status code from test step
 59 |  * EVIDENCE-BASED: look for explicit status codes first
 60 |  * Fallback to generic HTTP semantics (not business-specific keywords)
 61 |  */
 62 | function extractExpectedStatus(step: string): number {
 63 |   // Look for explicit status codes first
 64 |   const statusMatch = step.match(/\b(200|201|204|400|401|403|404|409|422|500)\b/);
 65 |   if (statusMatch) {
 66 |     return parseInt(statusMatch[1]);
 67 |   }
 68 |   
 69 |   // Fallback to generic HTTP semantics only
 70 |   const lowerStep = step.toLowerCase();
 71 |   
 72 |   // Success
 73 |   if (lowerStep.includes('created')) return 201;
 74 |   if (lowerStep.includes('no content') || lowerStep.includes('deleted')) return 204;
 75 |   
 76 |   // Client errors - generic
 77 |   if (lowerStep.includes('bad request') || lowerStep.includes('invalid')) return 400;
 78 |   if (lowerStep.includes('forbidden') || lowerStep.includes('not allowed')) return 403;
 79 |   if (lowerStep.includes('not found')) return 404;
 80 |   
 81 |   // Server errors - only for catastrophic failures
 82 |   if (lowerStep.includes('server error') || lowerStep.includes('internal error')) return 500;
 83 |   
 84 |   return 200; // default success
 85 | }
 86 | 
 87 | /**
 88 |  * Extract request body from test step
 89 |  */
 90 | function extractBody(step: string): any | undefined {
 91 |   // Look for JSON-like content
 92 |   const jsonMatch = step.match(/\{[^}]+\}/);
 93 |   if (jsonMatch) {
 94 |     try {
 95 |       return JSON.parse(jsonMatch[0]);
 96 |     } catch {
 97 |       // If parsing fails, return as string
 98 |       return jsonMatch[0];
 99 |     }
100 |   }
101 |   
102 |   // Look for key-value pairs
103 |   const kvMatch = step.match(/with\s+(.+?)(?:\s+and\s+|\s*$)/i);
104 |   if (kvMatch) {
105 |     const pairs = kvMatch[1].split(/\s+and\s+/i);
106 |     const body: Record<string, any> = {};
107 |     pairs.forEach(pair => {
108 |       const [key, value] = pair.split(/[:=]/);
109 |       if (key && value) {
110 |         body[key.trim()] = value.trim().replace(/['"]/g, '');
111 |       }
112 |     });
113 |     if (Object.keys(body).length > 0) {
114 |       return body;
115 |     }
116 |   }
117 |   
118 |   return undefined;
119 | }
120 | 
121 | /**
122 |  * Extract expected body content from test step
123 |  */
124 | function extractExpectedBodyContains(step: string): string[] | undefined {
125 |   const contains: string[] = [];
126 |   
127 |   // Look for "contains" or "includes" patterns
128 |   const containsMatch = step.match(/(?:contains?|includes?)\s+[`"]?([^`"]+)[`"]?/gi);
129 |   if (containsMatch) {
130 |     containsMatch.forEach(match => {
131 |       const content = match.replace(/(?:contains?|includes?)\s+/i, '').replace(/[`"]/g, '');
132 |       contains.push(content);
133 |     });
134 |   }
135 |   
136 |   // Look for quoted strings that might be expected content
137 |   const quotedMatch = step.match(/["']([^"']+)["']/g);
138 |   if (quotedMatch) {
139 |     quotedMatch.forEach(match => {
140 |       const content = match.replace(/["']/g, '');
141 |       if (content.length > 3) { // Avoid short strings like "a", "is"
142 |         contains.push(content);
143 |       }
144 |     });
145 |   }
146 |   
147 |   return contains.length > 0 ? contains : undefined;
148 | }
149 | 
150 | /**
151 |  * Determine if a test is an API test based on its description
152 |  */
153 | function isApiTest(testCase: any): boolean {
154 |   const description = JSON.stringify(testCase).toLowerCase();
155 |   return description.includes('api') || 
156 |          description.includes('endpoint') || 
157 |          description.includes('request') ||
158 |          description.includes('post') ||
159 |          description.includes('get') ||
160 |          description.includes('put') ||
161 |          description.includes('delete');
162 | }
163 | 
164 | /**
165 |  * Generate executable HTTP tests from IBM QA task plan
166 |  */
167 | export function generateExecutableTests(qaTaskPlan: any): GeneratedTestArtifacts {
168 |   const httpTests: ExecutableHTTPTest[] = [];
169 |   let testIdCounter = 1;
170 |   let apiTestCount = 0;
171 |   let manualTestCount = 0;
172 |   
173 |   // Extract test cases from the QA task plan
174 |   const testCases = qaTaskPlan.testCases || qaTaskPlan.test_cases || [];
175 |   
176 |   testCases.forEach((testCase: any) => {
177 |     const isApi = isApiTest(testCase);
178 |     
179 |     if (isApi) {
180 |       apiTestCount++;
181 |       
182 |       // Extract test steps
183 |       const steps = testCase.steps || testCase.test_steps || [];
184 |       const firstStep = steps[0] || '';
185 |       const stepDescription = typeof firstStep === 'string' ? firstStep : firstStep.description || '';
186 |       
187 |       // Generate executable HTTP test
188 |       const httpTest: ExecutableHTTPTest = {
189 |         id: `TC-${String(testIdCounter).padStart(3, '0')}`,
190 |         acceptanceCriterionId: testCase.acceptanceCriterionId || testCase.acceptance_criterion_id || 'AC-1',
191 |         title: testCase.title || testCase.name || `Test ${testIdCounter}`,
192 |         method: extractMethod(stepDescription),
193 |         url: extractUrl(stepDescription),
194 |         expectedStatus: extractExpectedStatus(stepDescription),
195 |       };
196 |       
197 |       // Add optional fields
198 |       const body = extractBody(stepDescription);
199 |       if (body) {
200 |         httpTest.body = body;
201 |       }
202 |       
203 |       const expectedContains = extractExpectedBodyContains(stepDescription);
204 |       if (expectedContains) {
205 |         httpTest.expectedBodyContains = expectedContains;
206 |       }
207 |       
208 |       // Add default headers for JSON APIs
209 |       if (httpTest.method !== 'GET' && httpTest.body) {
210 |         httpTest.headers = {
211 |           'Content-Type': 'application/json'
212 |         };
213 |       }
214 |       
215 |       httpTests.push(httpTest);
216 |       testIdCounter++;
217 |     } else {
218 |       manualTestCount++;
219 |     }
220 |   });
221 |   
222 |   return {
223 |     qaTaskPlan,
224 |     httpTests,
225 |     generatedAt: new Date().toISOString(),
226 |     metadata: {
227 |       totalTests: testCases.length,
228 |       apiTests: apiTestCount,
229 |       manualTests: manualTestCount
230 |     }
231 |   };
232 | }
233 | 
234 | /**
235 |  * Generate test ID in format TC-001, TC-002, etc.
236 |  */
237 | export function generateTestId(index: number): string {
238 |   return `TC-${String(index).padStart(3, '0')}`;
239 | }
240 | 
241 | // Made with Bob
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files


# VSCode Open Tabs
src/utils/logger.ts,.env,src/agent/watsonx-client.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example,src/config/index.ts,src/reporting/report-generator.ts,test-fixtures/ibm-test-plan.json,src/testing/api-tester.ts,test-post-fix.ts,src/parsers/acceptance-parser.ts,src/generators/test-generator.ts,src/types/index.ts,test-acceptance-parser.ts,acceptance.md,README.md,CHANGELOG.md,FEATURES.md,src/utils/json-extractor.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T02:22:34.163Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.03

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>ask</slug>
<name>❓ Ask</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I'll continue reading the remaining key files to complete the analysis.

<read_file>
<args>
  <file>
    <path>src/testing/failure-classifier.ts</path>
  </file>
  <file>
    <path>src/testing/api-tester.ts</path>
  </file>
  <file>
    <path>src/testing/http-test-executor.ts</path>
  </file>
  <file>
    <path>src/agent/test-agent.ts</path>
  </file>
  <file>
    <path>src/agent/watsonx-client.ts</path>
  </file>
</args>
</read_file>

---

**User:**

[read_file for 5 files] Result:
<files>
<file><path>src/testing/failure-classifier.ts</path>
<content lines="1-502">
  1 | /**
  2 |  * Failure Classifier
  3 |  * Provides intelligent classification of test failures to distinguish between
  4 |  * application bugs, test generation issues, infrastructure problems, and uncertain results
  5 |  */
  6 | 
  7 | import {
  8 |   TestFailureClassification,
  9 |   ClassificationResult,
 10 |   APITestResult,
 11 |   APIResponse,
 12 |   HTTPMethod
 13 | } from '../types/index.js';
 14 | import { logger } from '../utils/logger.js';
 15 | 
 16 | /**
 17 |  * Network error codes that indicate infrastructure failures
 18 |  */
 19 | const NETWORK_ERROR_CODES = [
 20 |   'ECONNREFUSED',
 21 |   'ECONNRESET',
 22 |   'ETIMEDOUT',
 23 |   'ENOTFOUND',
 24 |   'ENETUNREACH',
 25 |   'EHOSTUNREACH',
 26 |   'ECONNABORTED',
 27 |   'EPIPE',
 28 |   'EAI_AGAIN'
 29 | ];
 30 | 
 31 | /**
 32 |  * HTTP status codes that typically indicate application failures
 33 |  */
 34 | const APPLICATION_ERROR_STATUSES = [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511];
 35 | 
 36 | /**
 37 |  * HTTP status codes that are typically expected in negative tests
 38 |  */
 39 | const EXPECTED_ERROR_STATUSES = [400, 401, 403, 404, 405, 406, 409, 410, 422, 429];
 40 | 
 41 | /**
 42 |  * Classify a test result based on error, response, and context
 43 |  */
 44 | export function classifyTestResult(
 45 |   testResult: APITestResult,
 46 |   context?: {
 47 |     isNegativeTest?: boolean;
 48 |     expectedStatuses?: number[];
 49 |     testDescription?: string;
 50 |   }
 51 | ): ClassificationResult {
 52 |   const { error, response, passed, assertions } = testResult;
 53 | 
 54 |   // If test passed, return PASSED classification
 55 |   if (passed) {
 56 |     return {
 57 |       classification: TestFailureClassification.PASSED,
 58 |       reason: 'All assertions passed successfully',
 59 |       confidence: 1.0,
 60 |       isExpectedFailure: false
 61 |     };
 62 |   }
 63 | 
 64 |   // Check for missing URL (TraceQA generation issue)
 65 |   if (error && error.includes('no endpoint or base URL')) {
 66 |     return {
 67 |       classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
 68 |       reason: 'No URL provided for test - route matching or URL generation failed',
 69 |       confidence: 1.0,
 70 |       metadata: { errorType: 'missing_url' }
 71 |     };
 72 |   }
 73 | 
 74 |   // Check for network errors (infrastructure failure)
 75 |   if (error && isNetworkError(error)) {
 76 |     const errorCode = extractErrorCode(error);
 77 |     return {
 78 |       classification: TestFailureClassification.INFRASTRUCTURE_FAILURE,
 79 |       reason: `Network error: ${errorCode || 'connection failed'} - application may not be running or network is unavailable`,
 80 |       confidence: 0.95,
 81 |       metadata: { errorCode, errorType: 'network' }
 82 |     };
 83 |   }
 84 | 
 85 |   // Check for invalid configuration (TraceQA generation issue)
 86 |   if (error && isConfigurationError(error)) {
 87 |     return {
 88 |       classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
 89 |       reason: 'Invalid test configuration - test generation produced invalid parameters',
 90 |       confidence: 0.9,
 91 |       metadata: { errorType: 'configuration' }
 92 |     };
 93 |   }
 94 | 
 95 |   // If we have a response, classify based on status code
 96 |   if (response) {
 97 |     return classifyByResponse(response, context);
 98 |   }
 99 | 
100 |   // If we have assertions but no response, it's uncertain
101 |   if (assertions && assertions.length > 0) {
102 |     return {
103 |       classification: TestFailureClassification.UNCERTAIN,
104 |       reason: 'Test failed with assertions but no response received',
105 |       confidence: 0.5,
106 |       metadata: { assertionCount: assertions.length }
107 |     };
108 |   }
109 | 
110 |   // No assertions defined - uncertain
111 |   if (!assertions || assertions.length === 0) {
112 |     return {
113 |       classification: TestFailureClassification.UNCERTAIN,
114 |       reason: 'No assertions defined - cannot determine success criteria',
115 |       confidence: 0.7,
116 |       metadata: { errorType: 'no_assertions' }
117 |     };
118 |   }
119 | 
120 |   // Default to uncertain for unknown cases
121 |   return {
122 |     classification: TestFailureClassification.UNCERTAIN,
123 |     reason: 'Unable to determine failure cause - requires manual investigation',
124 |     confidence: 0.3,
125 |     metadata: { error }
126 |   };
127 | }
128 | 
129 | /**
130 |  * Classify based on HTTP response
131 |  */
132 | function classifyByResponse(
133 |   response: APIResponse,
134 |   context?: {
135 |     isNegativeTest?: boolean;
136 |     expectedStatuses?: number[];
137 |     testDescription?: string;
138 |   }
139 | ): ClassificationResult {
140 |   const { status } = response;
141 |   const isNegativeTest = context?.isNegativeTest || false;
142 |   const expectedStatuses = context?.expectedStatuses || [];
143 | 
144 |   // Check if status is in expected statuses
145 |   if (expectedStatuses.length > 0 && expectedStatuses.includes(status)) {
146 |     return {
147 |       classification: TestFailureClassification.PASSED,
148 |       reason: `Received expected status ${status}`,
149 |       confidence: 1.0,
150 |       isExpectedFailure: false
151 |     };
152 |   }
153 | 
154 |   // 5xx errors typically indicate application failures
155 |   if (APPLICATION_ERROR_STATUSES.includes(status)) {
156 |     // Unless it's expected in a negative test
157 |     if (isNegativeTest && expectedStatuses.includes(status)) {
158 |       return {
159 |         classification: TestFailureClassification.PASSED,
160 |         reason: `Received expected ${status} error for negative test`,
161 |         confidence: 1.0,
162 |         isExpectedFailure: true
163 |       };
164 |     }
165 | 
166 |     return {
167 |       classification: TestFailureClassification.APPLICATION_FAILURE,
168 |       reason: `Server returned ${status} error - indicates application bug or misconfiguration`,
169 |       confidence: 0.9,
170 |       metadata: { statusCode: status, statusType: '5xx' }
171 |     };
172 |   }
173 | 
174 |   // 4xx errors - could be expected or unexpected
175 |   if (status >= 400 && status < 500) {
176 |     // If 422 and response contains enum/validation hints, mark as generation issue
177 |     try {
178 |       const bodyStr = typeof (response as any).body === 'string' ? (response as any).body : JSON.stringify((response as any).body || {});
179 |       if (status === 422 && /one of|enum|allowed values|allowed:/i.test(bodyStr)) {
180 |         return {
181 |           classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
182 |           reason: 'Validation failure (422) indicates generated request did not match expected schema or enum values',
183 |           confidence: 0.9,
184 |           metadata: { statusCode: status }
185 |         };
186 |       }
187 |     } catch (e) {
188 |       // ignore parse errors
189 |     }
190 |     // Check if this is an expected error for a negative test
191 |     if (isNegativeTest || EXPECTED_ERROR_STATUSES.includes(status)) {
192 |       // If we expected this status, it might be a pass
193 |       if (expectedStatuses.includes(status)) {
194 |         return {
195 |           classification: TestFailureClassification.PASSED,
196 |           reason: `Received expected ${status} error`,
197 |           confidence: 1.0,
198 |           isExpectedFailure: true
199 |         };
200 |       }
201 | 
202 |       // If it's a negative test but wrong error code
203 |       if (isNegativeTest) {
204 |         return {
205 |           classification: TestFailureClassification.UNCERTAIN,
206 |           reason: `Negative test received ${status} but expected different error code`,
207 |           confidence: 0.6,
208 |           metadata: { statusCode: status, statusType: '4xx' }
209 |         };
210 |       }
211 |     }
212 | 
213 |     // 404 might indicate route matching issue
214 |     if (status === 404) {
215 |       return {
216 |         classification: TestFailureClassification.TRACEQA_GENERATION_ISSUE,
217 |         reason: 'Received 404 Not Found - route matching may have failed or URL is incorrect',
218 |         confidence: 0.7,
219 |         metadata: { statusCode: 404, possibleCause: 'route_mismatch' }
220 |       };
221 |     }
222 | 
223 |     // Other 4xx errors could be application or generation issues
224 |     return {
225 |       classification: TestFailureClassification.UNCERTAIN,
226 |       reason: `Received ${status} client error - could be application validation or test data issue`,
227 |       confidence: 0.5,
228 |       metadata: { statusCode: status, statusType: '4xx' }
229 |     };
230 |   }
231 | 
232 |   // 2xx or 3xx but assertions failed
233 |   if (status >= 200 && status < 400) {
234 |     return {
235 |       classification: TestFailureClassification.UNCERTAIN,
236 |       reason: `Request succeeded with ${status} but assertions failed - may be incorrect expectations or response format changed`,
237 |       confidence: 0.6,
238 |       metadata: { statusCode: status, statusType: 'success' }
239 |     };
240 |   }
241 | 
242 |   // Unknown status code
243 |   return {
244 |     classification: TestFailureClassification.UNCERTAIN,
245 |     reason: `Received unusual status code ${status}`,
246 |     confidence: 0.4,
247 |     metadata: { statusCode: status }
248 |   };
249 | }
250 | 
251 | /**
252 |  * Check if error message indicates a network error
253 |  */
254 | export function isNetworkError(error: string): boolean {
255 |   const errorUpper = error.toUpperCase();
256 |   
257 |   // Check for known error codes
258 |   if (NETWORK_ERROR_CODES.some(code => errorUpper.includes(code))) {
259 |     return true;
260 |   }
261 | 
262 |   // Check for common network error phrases
263 |   const networkPhrases = [
264 |     'NETWORK',
265 |     'CONNECTION',
266 |     'TIMEOUT',
267 |     'DNS',
268 |     'SOCKET',
269 |     'REFUSED',
270 |     'UNREACHABLE',
271 |     'ABORTED'
272 |   ];
273 | 
274 |   return networkPhrases.some(phrase => errorUpper.includes(phrase));
275 | }
276 | 
277 | /**
278 |  * Check if error indicates a configuration issue
279 |  */
280 | export function isConfigurationError(error: string): boolean {
281 |   const errorLower = error.toLowerCase();
282 |   
283 |   const configPhrases = [
284 |     'invalid',
285 |     'missing',
286 |     'configuration',
287 |     'malformed',
288 |     'parse error',
289 |     'invalid json',
290 |     'invalid body',
291 |     'invalid header'
292 |   ];
293 | 
294 |   return configPhrases.some(phrase => errorLower.includes(phrase));
295 | }
296 | 
297 | /**
298 |  * Extract error code from error message
299 |  */
300 | export function extractErrorCode(error: string): string | null {
301 |   for (const code of NETWORK_ERROR_CODES) {
302 |     if (error.toUpperCase().includes(code)) {
303 |       return code;
304 |     }
305 |   }
306 |   return null;
307 | }
308 | 
309 | /**
310 |  * Determine if a test is likely a negative test based on description
311 |  */
312 | export function isLikelyNegativeTest(description?: string): boolean {
313 |   if (!description) {
314 |     return false;
315 |   }
316 | 
317 |   const negativePhrases = [
318 |     'invalid',
319 |     'error',
320 |     'fail',
321 |     'reject',
322 |     'unauthorized',
323 |     'forbidden',
324 |     'not found',
325 |     'bad request',
326 |     'should not',
327 |     'must not',
328 |     'cannot',
329 |     'negative'
330 |   ];
331 | 
332 |   const descLower = description.toLowerCase();
333 |   return negativePhrases.some(phrase => descLower.includes(phrase));
334 | }
335 | 
336 | /**
337 |  * Create a classification result for a specific scenario
338 |  */
339 | export function createClassification(
340 |   classification: TestFailureClassification,
341 |   reason: string,
342 |   confidence: number = 0.8,
343 |   metadata?: Record<string, any>
344 | ): ClassificationResult {
345 |   return {
346 |     classification,
347 |     reason,
348 |     confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0 and 1
349 |     metadata
350 |   };
351 | }
352 | 
353 | /**
354 |  * Classify assertion failures
355 |  */
356 | export function classifyAssertionFailure(
357 |   assertionType: string,
358 |   expected: any,
359 |   actual: any,
360 |   response?: APIResponse
361 | ): ClassificationResult {
362 |   // Status code mismatch
363 |   if (assertionType === 'STATUS_CODE') {
364 |     if (response && APPLICATION_ERROR_STATUSES.includes(response.status)) {
365 |       return createClassification(
366 |         TestFailureClassification.APPLICATION_FAILURE,
367 |         `Expected status ${expected} but got ${actual} - server error indicates application bug`,
368 |         0.85,
369 |         { assertionType, expected, actual }
370 |       );
371 |     }
372 | 
373 |     if (response && response.status === 404) {
374 |       return createClassification(
375 |         TestFailureClassification.TRACEQA_GENERATION_ISSUE,
376 |         `Expected status ${expected} but got 404 - route matching may have failed`,
377 |         0.75,
378 |         { assertionType, expected, actual }
379 |       );
380 |     }
381 | 
382 |     return createClassification(
383 |       TestFailureClassification.UNCERTAIN,
384 |       `Expected status ${expected} but got ${actual}`,
385 |       0.6,
386 |       { assertionType, expected, actual }
387 |     );
388 |   }
389 | 
390 |   // Body/content assertions
391 |   if (assertionType.includes('BODY') || assertionType.includes('JSON')) {
392 |     return createClassification(
393 |       TestFailureClassification.UNCERTAIN,
394 |       `Response content does not match expectations - could be application change or incorrect test expectations`,
395 |       0.5,
396 |       { assertionType, expected, actual }
397 |     );
398 |   }
399 | 
400 |   // Default uncertain classification
401 |   return createClassification(
402 |     TestFailureClassification.UNCERTAIN,
403 |     `Assertion failed: ${assertionType}`,
404 |     0.5,
405 |     { assertionType, expected, actual }
406 |   );
407 | }
408 | 
409 | /**
410 |  * Merge multiple classification results (for multi-step tests)
411 |  */
412 | export function mergeClassifications(
413 |   classifications: ClassificationResult[]
414 | ): ClassificationResult {
415 |   if (classifications.length === 0) {
416 |     return createClassification(
417 |       TestFailureClassification.UNCERTAIN,
418 |       'No classifications to merge',
419 |       0.0
420 |     );
421 |   }
422 | 
423 |   if (classifications.length === 1) {
424 |     return classifications[0];
425 |   }
426 | 
427 |   // Count classifications by type
428 |   const counts = new Map<TestFailureClassification, number>();
429 |   let totalConfidence = 0;
430 | 
431 |   for (const result of classifications) {
432 |     counts.set(result.classification, (counts.get(result.classification) || 0) + 1);
433 |     totalConfidence += result.confidence;
434 |   }
435 | 
436 |   // Find most common classification
437 |   let maxCount = 0;
438 |   let mostCommon = TestFailureClassification.UNCERTAIN;
439 | 
440 |   for (const [classification, count] of counts.entries()) {
441 |     if (count > maxCount) {
442 |       maxCount = count;
443 |       mostCommon = classification;
444 |     }
445 |   }
446 | 
447 |   const avgConfidence = totalConfidence / classifications.length;
448 |   const reasons = classifications.map(c => c.reason).join('; ');
449 | 
450 |   return createClassification(
451 |     mostCommon,
452 |     `Multiple failures: ${reasons}`,
453 |     avgConfidence * 0.8, // Reduce confidence for merged results
454 |     { mergedCount: classifications.length, classifications }
455 |   );
456 | }
457 | 
458 | /**
459 |  * Log classification result
460 |  */
461 | export function logClassification(
462 |   testName: string,
463 |   classification: ClassificationResult
464 | ): void {
465 |   const emoji = getClassificationEmoji(classification.classification);
466 |   const confidencePercent = (classification.confidence * 100).toFixed(0);
467 | 
468 |   logger.info(
469 |     `${emoji} Test "${testName}" classified as ${classification.classification} (${confidencePercent}% confidence)`
470 |   );
471 |   logger.debug(`Classification reason: ${classification.reason}`);
472 | 
473 |   if (classification.metadata) {
474 |     logger.debug('Classification metadata:', classification.metadata);
475 |   }
476 | }
477 | 
478 | /**
479 |  * Get emoji for classification type
480 |  */
481 | function getClassificationEmoji(classification: TestFailureClassification): string {
482 |   switch (classification) {
483 |     case TestFailureClassification.PASSED:
484 |       return '✅';
485 |     case TestFailureClassification.APPLICATION_FAILURE:
486 |       return '🐛';
487 |     case TestFailureClassification.TRACEQA_GENERATION_ISSUE:
488 |       return '🔧';
489 |     case TestFailureClassification.INFRASTRUCTURE_FAILURE:
490 |       return '🌐';
491 |     case TestFailureClassification.UNCERTAIN:
492 |       return '❓';
493 |     case TestFailureClassification.MANUAL:
494 |       return '👤';
495 |     case TestFailureClassification.SKIPPED:
496 |       return '⏭️';
497 |     default:
498 |       return '❔';
499 |   }
500 | }
501 | 
502 | // Made with Bob
</content>
</file>
<file><path>src/testing/api-tester.ts</path>
<content lines="1-742">
  1 | /**
  2 |  * API Tester
  3 |  * Comprehensive API testing implementation with support for various HTTP methods,
  4 |  * authentication, assertions, and retry logic
  5 |  */
  6 | 
  7 | import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
  8 | import {
  9 |   APITestConfig,
 10 |   APIRequest,
 11 |   APIResponse,
 12 |   APITestResult,
 13 |   APIAssertion,
 14 |   AssertionType,
 15 |   HTTPMethod,
 16 |   AuthType,
 17 |   TraceQAError,
 18 |   ErrorCategory,
 19 |   APITestConfigWithCapture,
 20 |   APITestResultWithCapture,
 21 |   VariableExtraction
 22 | } from '../types/index.js';
 23 | import { logger } from '../utils/logger.js';
 24 | import { TestContext } from './test-context.js';
 25 | import {
 26 |   classifyTestResult,
 27 |   isLikelyNegativeTest,
 28 |   logClassification
 29 | } from './failure-classifier.js';
 30 | 
 31 | /**
 32 |  * API Tester class for testing REST APIs
 33 |  */
 34 | export class APITester {
 35 |   private axiosInstance: AxiosInstance;
 36 |   private defaultTimeout: number;
 37 |   private defaultRetries: number;
 38 |   private defaultRetryDelay: number;
 39 |   private testContext: TestContext | null = null;
 40 | 
 41 |   constructor(options: {
 42 |     baseURL?: string;
 43 |     timeout?: number;
 44 |     retries?: number;
 45 |     retryDelay?: number;
 46 |     headers?: Record<string, string>;
 47 |   } = {}) {
 48 |     this.defaultTimeout = options.timeout || 30000;
 49 |     this.defaultRetries = options.retries || 3;
 50 |     this.defaultRetryDelay = options.retryDelay || 1000;
 51 | 
 52 |     // Create axios instance with default configuration
 53 |     this.axiosInstance = axios.create({
 54 |       baseURL: options.baseURL,
 55 |       timeout: this.defaultTimeout,
 56 |       headers: options.headers || {},
 57 |       validateStatus: () => true // Don't throw on any status code
 58 |     });
 59 | 
 60 |     logger.debug('API Tester initialized', {
 61 |       baseURL: options.baseURL,
 62 |       timeout: this.defaultTimeout
 63 |     });
 64 |   }
 65 | 
 66 |   /**
 67 |    * Set test context for variable capture and substitution
 68 |    */
 69 |   setContext(context: TestContext): void {
 70 |     this.testContext = context;
 71 |     logger.debug('Test context set', { testId: context.getTestId() });
 72 |   }
 73 | 
 74 |   /**
 75 |    * Get current test context
 76 |    */
 77 |   getContext(): TestContext | null {
 78 |     return this.testContext;
 79 |   }
 80 | 
 81 |   /**
 82 |    * Clear test context
 83 |    */
 84 |   clearContext(): void {
 85 |     this.testContext = null;
 86 |     logger.debug('Test context cleared');
 87 |   }
 88 | 
 89 |   /**
 90 |    * Apply variable substitution to request using context
 91 |    */
 92 |   private applyVariableSubstitution(request: APIRequest): APIRequest {
 93 |     if (!this.testContext) {
 94 |       return request;
 95 |     }
 96 | 
 97 |     const substituted: APIRequest = { ...request };
 98 | 
 99 |     // Substitute URL
100 |     if (substituted.url) {
101 |       const urlResult = this.testContext.substituteString(substituted.url);
102 |       if (!urlResult.success) {
103 |         logger.warn(`URL substitution warning: ${urlResult.message}`);
104 |       }
105 |       substituted.url = urlResult.value;
106 |     }
107 | 
108 |     // Substitute headers
109 |     if (substituted.headers) {
110 |       substituted.headers = this.testContext.substituteObject(substituted.headers);
111 |     }
112 | 
113 |     // Substitute query parameters
114 |     if (substituted.params) {
115 |       substituted.params = this.testContext.substituteObject(substituted.params);
116 |     }
117 | 
118 |     // Substitute body
119 |     if (substituted.body) {
120 |       substituted.body = this.testContext.substituteObject(substituted.body);
121 |     }
122 | 
123 |     return substituted;
124 |   }
125 | 
126 |   /**
127 |    * Capture variables from response
128 |    */
129 |   private captureVariables(
130 |     response: APIResponse,
131 |     extractions: VariableExtraction[]
132 |   ): Record<string, any> {
133 |     if (!this.testContext) {
134 |       logger.warn('Cannot capture variables: no test context set');
135 |       return {};
136 |     }
137 | 
138 |     const captured: Record<string, any> = {};
139 | 
140 |     for (const extraction of extractions) {
141 |       const success = this.testContext.extractAndStore(response, extraction);
142 |       if (success) {
143 |         captured[extraction.name] = this.testContext.get(extraction.name);
144 |       }
145 |     }
146 | 
147 |     return captured;
148 |   }
149 | 
150 |   /**
151 |    * Execute a single API test
152 |    */
153 |   async executeTest(config: APITestConfig): Promise<APITestResult> {
154 |     const startTime = Date.now();
155 |     let retryCount = 0;
156 |     const maxRetries = config.retries ?? this.defaultRetries;
157 | 
158 |     // Identify non-idempotent HTTP methods that should not be retried after receiving a valid response
159 |     const nonIdempotentMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
160 |     const isNonIdempotent = nonIdempotentMethods.includes(config.request.method.toUpperCase());
161 | 
162 |     logger.info(`Executing API test: ${config.name}`);
163 | 
164 |     // Apply variable substitution if context is available
165 |     const substitutedRequest = this.applyVariableSubstitution(config.request);
166 | 
167 |     // Validate URL before attempting request
168 |     if (!substitutedRequest.url || substitutedRequest.url.trim() === '') {
169 |       const duration = Date.now() - startTime;
170 |       logger.warn(`API test marked as UNCERTAIN due to missing URL: ${config.name}`);
171 |       
172 |       const result: APITestResult = {
173 |         testName: config.name,
174 |         passed: false,
175 |         request: substitutedRequest,
176 |         assertions: [{
177 |           assertion: {
178 |             type: AssertionType.CUSTOM,
179 |             expected: 'valid URL',
180 |             operator: 'equals',
181 |             message: 'Could not execute API test because no endpoint or base URL was available.'
182 |           },
183 |           passed: false,
184 |           message: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available.'
185 |         }],
186 |         error: 'UNCERTAIN: Could not execute API test because no endpoint or base URL was available.',
187 |         duration,
188 |         timestamp: new Date().toISOString(),
189 |         retryCount: 0
190 |       };
191 | 
192 |       // Classify as TraceQA generation issue
193 |       result.classification = classifyTestResult(result, {
194 |         isNegativeTest: isLikelyNegativeTest(config.description),
195 |         expectedStatuses: config.acceptableStatuses,
196 |         testDescription: config.description
197 |       });
198 |       logClassification(config.name, result.classification);
199 | 
200 |       return result;
201 |     }
202 | 
203 |     while (retryCount <= maxRetries) {
204 |       try {
205 |         // Make the API request with substituted values
206 |         const response = await this.makeRequest(substitutedRequest);
207 | 
208 |         // Capture variables if configured
209 |         let capturedVariables: Record<string, any> | undefined;
210 |         const configWithCapture = config as APITestConfigWithCapture;
211 |         if (configWithCapture.captureVariables && configWithCapture.captureVariables.length > 0) {
212 |           capturedVariables = this.captureVariables(response, configWithCapture.captureVariables);
213 |           logger.debug(`Captured ${Object.keys(capturedVariables).length} variables`);
214 |         }
215 | 
216 |         // Run assertions
217 |         const assertionResults = await this.runAssertions(
218 |           config.assertions,
219 |           response,
220 |           substitutedRequest,
221 |           config.acceptableStatuses
222 |         );
223 | 
224 |         const allPassed = assertionResults.every(r => r.passed);
225 |         const duration = Date.now() - startTime;
226 | 
227 |         const result: APITestResultWithCapture = {
228 |           testName: config.name,
229 |           passed: allPassed,
230 |           request: substitutedRequest,
231 |           response,
232 |           assertions: assertionResults,
233 |           duration,
234 |           timestamp: new Date().toISOString(),
235 |           retryCount,
236 |           capturedVariables
237 |         };
238 | 
239 |         // Classify the test result
240 |         const isNegativeTest = isLikelyNegativeTest(config.description);
241 |         const classification = classifyTestResult(result, {
242 |           isNegativeTest,
243 |           expectedStatuses: config.acceptableStatuses,
244 |           testDescription: config.description
245 |         });
246 |         result.classification = classification;
247 | 
248 |         // Log classification
249 |         logClassification(config.name, classification);
250 | 
251 |         if (allPassed) {
252 |           logger.success(`API test passed: ${config.name} (${duration}ms)`);
253 |           return result;
254 |         }
255 | 
256 |         // Don't retry non-idempotent methods if we got a valid HTTP response
257 |         // Only retry on network errors or for idempotent methods (GET, HEAD, OPTIONS)
258 |         if (isNonIdempotent && response?.status) {
259 |           logger.warn(
260 |             `Not retrying ${substitutedRequest.method} ${substitutedRequest.url} - non-idempotent method received status ${response.status}`
261 |           );
262 |           logger.error(`API test failed: ${config.name}`);
263 |           return result;
264 |         }
265 | 
266 |         // If not all passed and we have retries left
267 |         if (retryCount < maxRetries) {
268 |           logger.info(
269 |             `Retrying ${substitutedRequest.method} request due to assertion failure (attempt ${retryCount + 1}/${maxRetries}): ${config.name}`
270 |           );
271 |           retryCount++;
272 |           await this.sleep(config.retryDelay || this.defaultRetryDelay);
273 |           continue;
274 |         }
275 | 
276 |         logger.error(`API test failed: ${config.name}`);
277 |         return result;
278 |       } catch (error) {
279 |         const duration = Date.now() - startTime;
280 | 
281 |         // Network errors should be retried even for non-idempotent methods
282 |         // since the request may not have reached the server
283 |         if (retryCount < maxRetries) {
284 |           logger.warn(
285 |             `Retrying ${substitutedRequest.method} request due to network error (attempt ${retryCount + 1}/${maxRetries}): ${config.name}: ${error instanceof Error ? error.message : String(error)}`
286 |           );
287 |           retryCount++;
288 |           await this.sleep(config.retryDelay || this.defaultRetryDelay);
289 |           continue;
290 |         }
291 | 
292 |         logger.error(`API test error: ${config.name}`, error);
293 | 
294 |         const result: APITestResult = {
295 |           testName: config.name,
296 |           passed: false,
297 |           request: substitutedRequest,
298 |           assertions: [],
299 |           error: error instanceof Error ? error.message : String(error),
300 |           duration,
301 |           timestamp: new Date().toISOString(),
302 |           retryCount
303 |         };
304 | 
305 |         // Classify the error
306 |         result.classification = classifyTestResult(result, {
307 |           isNegativeTest: isLikelyNegativeTest(config.description),
308 |           expectedStatuses: config.acceptableStatuses,
309 |           testDescription: config.description
310 |         });
311 |         logClassification(config.name, result.classification);
312 | 
313 |         return result;
314 |       }
315 |     }
316 | 
317 |     // Should never reach here, but TypeScript needs it
318 |     throw new TraceQAError(
319 |       'Unexpected error in API test execution',
320 |       ErrorCategory.TEST_EXECUTION
321 |     );
322 |   }
323 | 
324 |   /**
325 |    * Make an API request
326 |    */
327 |   async makeRequest(request: APIRequest): Promise<APIResponse> {
328 |     const startTime = Date.now();
329 | 
330 |     // Validate URL before making request
331 |     if (!request.url || request.url.trim() === '') {
332 |       throw new TraceQAError(
333 |         'Invalid or missing URL',
334 |         ErrorCategory.CONFIGURATION
335 |       );
336 |     }
337 | 
338 |     try {
339 |       // Build axios config
340 |       const config: AxiosRequestConfig = {
341 |         method: request.method,
342 |         url: request.url,
343 |         headers: { ...request.headers },
344 |         params: request.params,
345 |         timeout: request.timeout || this.defaultTimeout,
346 |         validateStatus: () => true
347 |       };
348 | 
349 |       // Add authentication
350 |       if (request.auth) {
351 |         this.addAuthentication(config, request.auth);
352 |       }
353 | 
354 |       // Add body for methods that support it
355 |       if (
356 |         request.body &&
357 |         [HTTPMethod.POST, HTTPMethod.PUT, HTTPMethod.PATCH].includes(request.method)
358 |       ) {
359 |         config.data = request.body;
360 |         
361 |         // CRITICAL FIX: Add Content-Type header for JSON bodies
362 |         if (!config.headers) {
363 |           config.headers = {};
364 |         }
365 |         if (!config.headers['Content-Type'] && !config.headers['content-type']) {
366 |           config.headers['Content-Type'] = 'application/json';
367 |         }
368 |       }
369 | 
370 |       // SSL validation
371 |       if (request.validateSSL === false) {
372 |         config.httpsAgent = new (await import('https')).Agent({
373 |           rejectUnauthorized: false
374 |         });
375 |       }
376 | 
377 |       logger.debug(`Making ${request.method} request to ${request.url}`);
378 | 
379 |       // Make the request
380 |       const response: AxiosResponse = await this.axiosInstance.request(config);
381 | 
382 |       const duration = Date.now() - startTime;
383 | 
384 |       logger.debug(
385 |         `Request completed: ${response.status} ${response.statusText} (${duration}ms)`
386 |       );
387 | 
388 |       return {
389 |         status: response.status,
390 |         statusText: response.statusText,
391 |         headers: response.headers as Record<string, string>,
392 |         body: response.data,
393 |         duration,
394 |         timestamp: new Date().toISOString()
395 |       };
396 |     } catch (error) {
397 |       const duration = Date.now() - startTime;
398 |       logger.error('Request failed', error);
399 | 
400 |       if (axios.isAxiosError(error)) {
401 |         if (error.response) {
402 |           // Server responded with error status
403 |           return {
404 |             status: error.response.status,
405 |             statusText: error.response.statusText,
406 |             headers: error.response.headers as Record<string, string>,
407 |             body: error.response.data,
408 |             duration,
409 |             timestamp: new Date().toISOString()
410 |           };
411 |         }
412 |       }
413 | 
414 |       throw new TraceQAError(
415 |         `API request failed: ${error instanceof Error ? error.message : String(error)}`,
416 |         ErrorCategory.NETWORK,
417 |         error
418 |       );
419 |     }
420 |   }
421 | 
422 |   /**
423 |    * Add authentication to request config
424 |    */
425 |   private addAuthentication(
426 |     config: AxiosRequestConfig,
427 |     auth: APIRequest['auth']
428 |   ): void {
429 |     if (!auth || auth.type === AuthType.NONE) {
430 |       return;
431 |     }
432 | 
433 |     switch (auth.type) {
434 |       case AuthType.BEARER:
435 |         if (auth.token) {
436 |           config.headers = {
437 |             ...config.headers,
438 |             Authorization: `Bearer ${auth.token}`
439 |           };
440 |         }
441 |         break;
442 | 
443 |       case AuthType.BASIC:
444 |         if (auth.username && auth.password) {
445 |           config.auth = {
446 |             username: auth.username,
447 |             password: auth.password
448 |           };
449 |         }
450 |         break;
451 | 
452 |       case AuthType.API_KEY:
453 |         if (auth.apiKey && auth.apiKeyHeader) {
454 |           config.headers = {
455 |             ...config.headers,
456 |             [auth.apiKeyHeader]: auth.apiKey
457 |           };
458 |         }
459 |         break;
460 | 
461 |       case AuthType.CUSTOM:
462 |         if (auth.customHeaders) {
463 |           config.headers = {
464 |             ...config.headers,
465 |             ...auth.customHeaders
466 |           };
467 |         }
468 |         break;
469 |     }
470 |   }
471 | 
472 |   /**
473 |    * Run all assertions on a response
474 |    */
475 |   private async runAssertions(
476 |     assertions: APIAssertion[],
477 |     response: APIResponse,
478 |     request: APIRequest,
479 |     acceptableStatuses?: number[]
480 |   ): Promise<Array<{ assertion: APIAssertion; passed: boolean; message: string }>> {
481 |     const results: Array<{ assertion: APIAssertion; passed: boolean; message: string }> = [];
482 | 
483 |     for (const assertion of assertions) {
484 |       try {
485 |         const result = await this.runAssertion(assertion, response, request, acceptableStatuses);
486 |         results.push(result);
487 | 
488 |         if (result.passed) {
489 |           logger.debug(`Assertion passed: ${assertion.type}`);
490 |         } else {
491 |           logger.warn(`Assertion failed: ${result.message}`);
492 |         }
493 |       } catch (error) {
494 |         logger.error(`Assertion error: ${assertion.type}`, error);
495 |         results.push({
496 |           assertion,
497 |           passed: false,
498 |           message: `Assertion error: ${error instanceof Error ? error.message : String(error)}`
499 |         });
500 |       }
501 |     }
502 | 
503 |     return results;
504 |   }
505 | 
506 |   /**
507 |    * Run a single assertion
508 |    */
509 |   private async runAssertion(
510 |     assertion: APIAssertion,
511 |     response: APIResponse,
512 |     _request: APIRequest,
513 |     acceptableStatuses?: number[]
514 |   ): Promise<{ assertion: APIAssertion; passed: boolean; message: string }> {
515 |     let passed = false;
516 |     let message = '';
517 | 
518 |     switch (assertion.type) {
519 |       case AssertionType.STATUS_CODE:
520 |         // Use acceptableStatuses if provided, otherwise fall back to assertion.expected
521 |         const statusesToCheck = acceptableStatuses && acceptableStatuses.length > 0
522 |           ? acceptableStatuses
523 |           : (assertion.expected ? [assertion.expected as number] : [200]);
524 |         
525 |         passed = statusesToCheck.includes(response.status);
526 |         message = passed
527 |           ? `Status ${response.status} is acceptable (expected one of: ${statusesToCheck.join(', ')})`
528 |           : `Expected status to be one of [${statusesToCheck.join(', ')}], but got ${response.status}`;
529 |         break;
530 | 
531 |       case AssertionType.HEADER:
532 |         if (assertion.path) {
533 |           const headerValue = response.headers[assertion.path.toLowerCase()];
534 |           passed = this.compareValues(headerValue, assertion.expected, assertion.operator);
535 |           message = passed
536 |             ? `Header ${assertion.path} matches expected value`
537 |             : `Header ${assertion.path} does not match: expected ${assertion.expected}, got ${headerValue}`;
538 |         }
539 |         break;
540 | 
541 |       case AssertionType.BODY_CONTAINS:
542 |         const bodyStr = JSON.stringify(response.body);
543 |         const expectedStr = String(assertion.expected);
544 |         passed = bodyStr.includes(expectedStr);
545 |         message = passed
546 |           ? `Body contains "${expectedStr}"`
547 |           : `Body does not contain "${expectedStr}"`;
548 |         break;
549 | 
550 |       case AssertionType.BODY_EQUALS:
551 |         passed = JSON.stringify(response.body) === JSON.stringify(assertion.expected);
552 |         message = passed
553 |           ? 'Body equals expected value'
554 |           : 'Body does not equal expected value';
555 |         break;
556 | 
557 |       case AssertionType.BODY_MATCHES:
558 |         if (typeof assertion.expected === 'string') {
559 |           const regex = new RegExp(assertion.expected);
560 |           passed = regex.test(JSON.stringify(response.body));
561 |           message = passed
562 |             ? `Body matches pattern ${assertion.expected}`
563 |             : `Body does not match pattern ${assertion.expected}`;
564 |         }
565 |         break;
566 | 
567 |       case AssertionType.JSON_PATH:
568 |         if (assertion.path) {
569 |           const value = this.getJsonPath(response.body, assertion.path);
570 |           passed = this.compareValues(value, assertion.expected, assertion.operator);
571 |           message = passed
572 |             ? `JSON path ${assertion.path} matches expected value`
573 |             : `JSON path ${assertion.path} does not match: expected ${assertion.expected}, got ${value}`;
574 |         }
575 |         break;
576 | 
577 |       case AssertionType.RESPONSE_TIME:
578 |         if (typeof assertion.expected === 'number') {
579 |           passed = response.duration < assertion.expected;
580 |           message = passed
581 |             ? `Response time ${response.duration}ms is within limit`
582 |             : `Response time ${response.duration}ms exceeds limit of ${assertion.expected}ms`;
583 |         }
584 |         break;
585 | 
586 |       case AssertionType.CUSTOM:
587 |         // Custom assertions would be handled by user-provided functions
588 |         message = assertion.message || 'Custom assertion not implemented';
589 |         break;
590 | 
591 |       default:
592 |         message = `Unknown assertion type: ${assertion.type}`;
593 |     }
594 | 
595 |     return { assertion, passed, message };
596 |   }
597 | 
598 |   /**
599 |    * Compare values based on operator
600 |    */
601 |   private compareValues(
602 |     actual: unknown,
603 |     expected: unknown,
604 |     operator: APIAssertion['operator'] = 'equals'
605 |   ): boolean {
606 |     switch (operator) {
607 |       case 'equals':
608 |         return actual === expected;
609 | 
610 |       case 'contains':
611 |         if (typeof actual === 'string' && typeof expected === 'string') {
612 |           return actual.includes(expected);
613 |         }
614 |         if (Array.isArray(actual)) {
615 |           return actual.includes(expected);
616 |         }
617 |         return false;
618 | 
619 |       case 'matches':
620 |         if (typeof actual === 'string' && typeof expected === 'string') {
621 |           return new RegExp(expected).test(actual);
622 |         }
623 |         return false;
624 | 
625 |       case 'lessThan':
626 |         if (typeof actual === 'number' && typeof expected === 'number') {
627 |           return actual < expected;
628 |         }
629 |         return false;
630 | 
631 |       case 'greaterThan':
632 |         if (typeof actual === 'number' && typeof expected === 'number') {
633 |           return actual > expected;
634 |         }
635 |         return false;
636 | 
637 |       default:
638 |         return false;
639 |     }
640 |   }
641 | 
642 |   /**
643 |    * Get value from JSON path (simple implementation)
644 |    */
645 |   private getJsonPath(obj: unknown, path: string): unknown {
646 |     const parts = path.split('.');
647 |     let current: any = obj;
648 | 
649 |     for (const part of parts) {
650 |       if (current === null || current === undefined) {
651 |         return undefined;
652 |       }
653 | 
654 |       // Handle array indices
655 |       const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
656 |       if (arrayMatch) {
657 |         const [, key, index] = arrayMatch;
658 |         current = current[key];
659 |         if (Array.isArray(current)) {
660 |           current = current[parseInt(index, 10)];
661 |         } else {
662 |           return undefined;
663 |         }
664 |       } else {
665 |         current = current[part];
666 |       }
667 |     }
668 | 
669 |     return current;
670 |   }
671 | 
672 |   /**
673 |    * Execute multiple API tests
674 |    */
675 |   async executeTests(configs: APITestConfig[]): Promise<APITestResult[]> {
676 |     logger.info(`Executing ${configs.length} API tests...`);
677 | 
678 |     const results: APITestResult[] = [];
679 | 
680 |     for (let i = 0; i < configs.length; i++) {
681 |       const config = configs[i];
682 |       logger.info(`[${i + 1}/${configs.length}] ${config.name}`);
683 | 
684 |       const result = await this.executeTest(config);
685 |       results.push(result);
686 | 
687 |       // Check if we should continue on failure
688 |       if (!result.passed && !config.continueOnFailure) {
689 |         logger.warn('Stopping test execution due to failure');
690 |         break;
691 |       }
692 |     }
693 | 
694 |     const passed = results.filter(r => r.passed).length;
695 |     logger.success(
696 |       `API tests completed: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`
697 |     );
698 | 
699 |     return results;
700 |   }
701 | 
702 |   /**
703 |    * Set default headers for all requests
704 |    */
705 |   setDefaultHeaders(headers: Record<string, string>): void {
706 |     this.axiosInstance.defaults.headers.common = {
707 |       ...this.axiosInstance.defaults.headers.common,
708 |       ...headers
709 |     };
710 |     logger.debug('Default headers updated', headers);
711 |   }
712 | 
713 |   /**
714 |    * Set base URL for all requests
715 |    */
716 |   setBaseURL(baseURL: string): void {
717 |     this.axiosInstance.defaults.baseURL = baseURL;
718 |     logger.debug('Base URL updated', baseURL);
719 |   }
720 | 
721 |   /**
722 |    * Sleep utility
723 |    */
724 |   private sleep(ms: number): Promise<void> {
725 |     return new Promise(resolve => setTimeout(resolve, ms));
726 |   }
727 | }
728 | 
729 | /**
730 |  * Create an API tester instance
731 |  */
732 | export function createAPITester(options?: {
733 |   baseURL?: string;
734 |   timeout?: number;
735 |   retries?: number;
736 |   retryDelay?: number;
737 |   headers?: Record<string, string>;
738 | }): APITester {
739 |   return new APITester(options);
740 | }
741 | 
742 | // Made with Bob
</content>
</file>
<file><path>src/testing/http-test-executor.ts</path><file_outline>File: http-test-executor.ts (1472 lines)

Interface: ReachabilityCheckResult (lines 28-31)
  Propertys: reachable, reason
Interface: HTTPTestExecutionResult (lines 36-49)
  Propertys: duration, results, runFailure, summary
Interface: HTTPClientConfig (lines 54-58)
  Propertys: headers, timeout, validateStatus
Interface: StatusAssertionResult (lines 63-66)
  Propertys: message, passed
Interface: BodyAssertionResult (lines 71-76)
  Propertys: matchedPatterns, message, missedPatterns, passed
Interface: StepSkipDecision (lines 81-84)
  Propertys: reason, skip
Function: createHTTPClient (lines 96-106)
  Propertys: headers, timeout
  Method: validateStatus (lines 104-104)
Function: assertStatus (lines 125-151)
  Propertys: message, message, message, passed, passed, passed
Function: assertBodyContains (lines 160-201)
  Propertys: matchedPatterns, message, missedPatterns, passed
Function: extractValueByPath (lines 215-251)
Function: captureVariables (lines 261-295)
Function: resolveVariables (lines 305-330)
  Propertys: success, unresolvedVars, value
Function: resolveObjectVariables (lines 339-374)
  Propertys: success, success, success, success, unresolvedVars, unresolvedVars, unresolvedVars, unresolvedVars, value, value, value, value
Function: prepareStepWithVariables (lines 383-415)
  Propertys: step, success, unresolvedVars
Function: executeWithRetry (lines 429-593)
  Propertys: acceptableStatuses, acceptableStatuses, actualStatus, actualStatus, capturedVariables, description, description, duration, duration, error, error, expectedStatus, expectedStatus, method, method, passed, passed, requestBody, requestBody, responseBody, responseBody, responseHeaders, stepId, stepId, url, url
  Function: response.headers.forEach (lines 536-538)
Function: extractAllowedValuesFromResponse (lines 599-656)
  Propertys: ''
Function: executeHTTPStep (lines 666-709)
  Propertys: acceptableStatuses, actualStatus, description, duration, error, expectedStatus, method, passed, requestBody, responseBody, stepId, url
Function: shouldSkipStep (lines 727-769)
  Propertys: reason, reason, reason, reason, reason, skip, skip, skip, skip, skip
Function: classifyTestResult (lines 792-894)
  Propertys: classification, classification, classification, classification, classification, classification, confidence, confidence, confidence, confidence, confidence, confidence, metadata, metadata, metadata, reason, reason, reason, reason, reason, reason
Function: collectEvidence (lines 907-960)
  Function: stepResults.forEach (lines 921-949)
Function: executeHTTPTest (lines 973-1095)
  Propertys: acceptableStatuses, acceptanceCriterionId, acceptanceCriterionId, acceptanceCriterionId, actualStatus, classification, classification, classification, description, duration, duration, duration, duration, error, evidence, evidence, evidence, executor, executor, executor, expectedStatus, method, passed, qaTaskId, qaTaskId, qaTaskId, requestBody, responseBody, status, status, status, stepId, stepResults, stepResults, stepResults, testId, testId, testId, timestamp, timestamp, timestamp, title, title, title, url
Function: generateExecutionSummary (lines 1107-1125)
  Propertys: failed, manual, passed, skipped, total, uncertain
Function: extractFirstSafeGetEndpoint (lines 1137-1158)
Function: loadOpenAPISpec (lines 1166-1183)
Function: checkReachability (lines 1196-1310)
  Propertys: reachable, reachable, reachable, reachable, reachable, reachable, reason, reason, reason, reason, reason
Function: executeHTTPTests (lines 1323-1469)
  Propertys: acceptanceCriterionId, classification, duration, duration, duration, evidence, executor, qaTaskId, results, results, runFailure, status, stepResults, summary, summary, testId, timestamp, title
</file_outline>
<notice>This file is large (1471 lines). You will use the following strategy to understand this file:
- Inform the user you are going to use large file strategy, to efficiently understand the file
- Use the file_outline provided to get an overview of the file structure to help decide next action. This is not the full file. It is not the full depth of the contents.
- If you read the file, use precise file reads with line ranges for specific sections of interest
- Consider if other commands/tools are better suited for extracting information from that file type
- Use ask_followup_question tool if needed to identify the best next action
</notice></file>
<file><path>src/agent/test-agent.ts</path>
<content lines="1-803">
  1 | /**
  2 |  * TraceQA Test Agent
  3 |  * Main intelligent agent that orchestrates test planning, execution, and reporting
  4 |  */
  5 | 
  6 | import { WatsonxClient } from './watsonx-client.js';
  7 | import { DecisionEngine } from './decision-engine.js';
  8 | import {
  9 |   SYSTEM_PROMPT,
 10 |   getTestPlanningPrompt,
 11 |   getTestExecutionPrompt,
 12 |   getReportGenerationPrompt
 13 | } from './prompts.js';
 14 | import { parseJSONSafely, safeExtractJSON, ExtractionResult } from '../utils/json-extractor.js';
 15 | import fs from 'fs-extra';
 16 | import path from 'path';
 17 | import {
 18 |   AgentConfig,
 19 |   AgentState,
 20 |   TestContext,
 21 |   TestPlan,
 22 |   TestCase,
 23 |   TestResult,
 24 |   TestResults,
 25 |   TestSummary,
 26 |   AgentAnalysis,
 27 |   ConversationMessage,
 28 |   TokenUsage,
 29 |   TraceQAError,
 30 |   ErrorCategory,
 31 |   TestType,
 32 |   DiffAnalysis
 33 | } from '../types/index.js';
 34 | import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
 35 | import { MCPClientManager } from '../mcp/index.js';
 36 | import { logger } from '../utils/logger.js';
 37 | 
 38 | /**
 39 |  * Main test agent for TraceQA
 40 |  */
 41 | export class TestAgent {
 42 |   private watsonxClient: WatsonxClient;
 43 |   private decisionEngine: DecisionEngine;
 44 |   private mcpManager: MCPClientManager | null = null;
 45 |   private state: AgentState;
 46 | 
 47 |   constructor(config: AgentConfig, mcpManager?: MCPClientManager) {
 48 |     // Initialize Watsonx client with system prompt
 49 |     this.watsonxClient = new WatsonxClient({
 50 |       ...config,
 51 |       systemPrompt: config.systemPrompt || SYSTEM_PROMPT
 52 |     });
 53 | 
 54 |     this.decisionEngine = new DecisionEngine();
 55 |     this.mcpManager = mcpManager || null;
 56 | 
 57 |     // Initialize agent state
 58 |     this.state = {
 59 |       currentPhase: 'idle',
 60 |       conversationHistory: [],
 61 |       executedTests: [],
 62 |       pendingDecisions: [],
 63 |       tokenUsage: {
 64 |         inputTokens: 0,
 65 |         outputTokens: 0,
 66 |         totalTokens: 0,
 67 |         estimatedCost: 0
 68 |       },
 69 |       startTime: new Date().toISOString(),
 70 |       lastActivity: new Date().toISOString()
 71 |     };
 72 | 
 73 |     logger.info('Test agent initialized');
 74 |   }
 75 | 
 76 |   /**
 77 |    * Set MCP manager for test execution
 78 |    */
 79 |   setMCPManager(manager: MCPClientManager): void {
 80 |     this.mcpManager = manager;
 81 |     logger.debug('MCP manager set for test agent');
 82 |   }
 83 | 
 84 |   /**
 85 |    * Generate QA task suggestions from IBM watsonx
 86 |    * Returns AI suggestions array instead of complete test plan
 87 |    */
 88 |   async generateTests(
 89 |     acceptanceCriteria: any[],
 90 |     routes: any[],
 91 |     baseUrl: string
 92 |   ): Promise<any[]> {
 93 |     logger.info('Generating QA task suggestions from IBM watsonx...');
 94 |     
 95 |     try {
 96 |       const prompt = this.buildPrompt(acceptanceCriteria, routes, baseUrl);
 97 |       const response = await this.watsonxClient.sendMessage(prompt);
 98 |       
 99 |       // Use robust JSON extraction
100 |       const extractionResult: ExtractionResult = safeExtractJSON(response, {
101 |         saveRawOnFailure: true
102 |       });
103 |       
104 |       if (!extractionResult.success) {
105 |         logger.warn('Failed to extract JSON from IBM response');
106 |         
107 |         // Save raw output for debugging
108 |         if (extractionResult.rawText) {
109 |           await this.saveRawResponse(extractionResult.rawText);
110 |         }
111 |         
112 |         // Return empty array - fallback mapper will handle it
113 |         logger.info('Falling back to deterministic test generation');
114 |         return [];
115 |       }
116 |       
117 |       // Validate extracted data
118 |       const data = extractionResult.data;
119 |       
120 |       // Handle both array and object responses
121 |       let suggestions: any[] = [];
122 |       
123 |       if (Array.isArray(data)) {
124 |         suggestions = data;
125 |       } else if (data && typeof data === 'object') {
126 |         // Check for common response structures
127 |         if (Array.isArray(data.tasks)) {
128 |           suggestions = data.tasks;
129 |         } else if (Array.isArray(data.testCases)) {
130 |           suggestions = data.testCases;
131 |         } else if (Array.isArray(data.tests)) {
132 |           suggestions = data.tests;
133 |         } else {
134 |           // Single task/test object
135 |           suggestions = [data];
136 |         }
137 |       }
138 |       
139 |       logger.success(`✓ Extracted ${suggestions.length} QA task suggestions from IBM`);
140 |       return suggestions;
141 |       
142 |     } catch (error) {
143 |       logger.error('Error generating tests from IBM:', error);
144 |       
145 |       // Return empty array - fallback mapper will handle it
146 |       logger.info('Falling back to deterministic test generation');
147 |       return [];
148 |     }
149 |   }
150 | 
151 |   /**
152 |    * Build prompt for QA task suggestions
153 |    */
154 |   private buildPrompt(
155 |     acceptanceCriteria: any[],
156 |     routes: any[],
157 |     baseUrl: string
158 |   ): string {
159 |     const prompt = `You are a QA automation expert. Analyze the following acceptance criteria and API routes to suggest QA tasks.
160 | 
161 | Acceptance Criteria:
162 | ${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description || ac.criterion}
163 |    Expected: ${ac.expectedResult || 'Not specified'}`).join('\n')}
164 | 
165 | Discovered API Routes:
166 | ${routes.map(r => `- ${r.method} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')}
167 | 
168 | Base URL: ${baseUrl}
169 | 
170 | For each acceptance criterion, suggest a QA task with:
171 | - acceptanceCriterionId: The AC ID (e.g., "AC-1")
172 | - title: Clear task title
173 | - type: "api", "ui", "integration", "manual", or "uncertain"
174 | - priority: "high", "medium", or "low"
175 | - executionMode: "automated", "manual", or "uncertain"
176 | - steps: Array of test steps with description and expectedOutcome
177 | - expectedResult: What should happen
178 | - reasoning: Why this task maps to the AC
179 | - uncertainReason: (optional) Why automation is uncertain
180 | 
181 | Return a JSON array of task suggestions. If you cannot safely automate a task, mark it as "uncertain" with a reason.
182 | 
183 | Example format:
184 | [
185 |   {
186 |     "acceptanceCriterionId": "AC-1",
187 |     "title": "Test user registration with valid data",
188 |     "type": "api",
189 |     "priority": "high",
190 |     "executionMode": "automated",
191 |     "steps": [
192 |       {
193 |         "description": "Send POST request to /api/register with valid user data",
194 |         "expectedOutcome": "User is created successfully"
195 |       }
196 |     ],
197 |     "expectedResult": "User registration succeeds with 201 status",
198 |     "reasoning": "AC-1 requires testing successful registration"
199 |   }
200 | ]
201 | 
202 | Respond with ONLY the JSON array, no explanations.`;
203 | 
204 |     return prompt;
205 |   }
206 | 
207 |   /**
208 |    * Save raw response for debugging
209 |    */
210 |   private async saveRawResponse(rawText: string): Promise<void> {
211 |     try {
212 |       const debugDir = 'traceqa-debug';
213 |       const fs = await import('fs/promises');
214 |       const path = await import('path');
215 |       
216 |       // Ensure debug directory exists
217 |       try {
218 |         await fs.mkdir(debugDir, { recursive: true });
219 |       } catch (e) {
220 |         // Directory might already exist
221 |       }
222 |       
223 |       const timestamp = Date.now();
224 |       const filename = `raw-ibm-response-${timestamp}.txt`;
225 |       const filepath = path.join(debugDir, filename);
226 |       
227 |       await fs.writeFile(filepath, rawText, 'utf-8');
228 |       logger.info(`Raw IBM response saved to ${filepath}`);
229 |     } catch (error) {
230 |       const errorMsg = error instanceof Error ? error.message : String(error);
231 |       logger.warn(`Failed to save raw response: ${errorMsg}`);
232 |     }
233 |   }
234 | 
235 |   /**
236 |    * Create a comprehensive test plan based on context
237 |    */
238 |   async createTestPlan(
239 |     context: TestContext,
240 |     diffAnalysis?: DiffAnalysis | null,
241 |     discoveredRoutes?: RouteDiscoveryResult | null
242 |   ): Promise<TestPlan> {
243 |     this.updatePhase('planning');
244 |     logger.info('Creating test plan...');
245 | 
246 |     try {
247 |       // Generate test planning prompt with optional diff analysis and discovered routes
248 |       const prompt = getTestPlanningPrompt(context, diffAnalysis, discoveredRoutes);
249 | 
250 |       // Get response from Watsonx
251 |       const response = await this.watsonxClient.sendMessage(prompt);
252 | 
253 |       // Parse test plan from response with repair
254 |       const parsedPlan = await this.parseTestPlanWithRepair(response);
255 | 
256 |       if (!parsedPlan || !parsedPlan.testCases) {
257 |         throw new TraceQAError(
258 |           'Failed to parse test plan from agent response',
259 |           ErrorCategory.AGENT,
260 |           { response }
261 |         );
262 |       }
263 | 
264 |       // Validate test plan structure
265 |       this.validateTestPlan(parsedPlan);
266 | 
267 |       // Create test plan
268 |       const testPlan: TestPlan = {
269 |         id: `plan-${Date.now()}`,
270 |         testCases: parsedPlan.testCases,
271 |         estimatedDuration: parsedPlan.estimatedDuration,
272 |         requiredResources: parsedPlan.requiredResources,
273 |         createdAt: new Date().toISOString()
274 |       };
275 | 
276 |       // Prioritize test cases
277 |       testPlan.testCases = this.decisionEngine.prioritizeTests(
278 |         testPlan.testCases,
279 |         context
280 |       );
281 | 
282 |       this.state.testPlan = testPlan;
283 |       this.updateTokenUsage();
284 | 
285 |       logger.success(
286 |         `Test plan created with ${testPlan.testCases.length} test cases (estimated ${testPlan.estimatedDuration}s)`
287 |       );
288 |       logger.debug(`Reasoning: ${parsedPlan.reasoning}`);
289 | 
290 |       return testPlan;
291 |     } catch (error) {
292 |       logger.error('Failed to create test plan:', error);
293 |       throw new TraceQAError(
294 |         'Failed to create test plan',
295 |         ErrorCategory.AGENT,
296 |         error
297 |       );
298 |     }
299 |   }
300 | 
301 |   /**
302 |    * Parse test plan with repair attempts
303 |    */
304 |   private async parseTestPlanWithRepair(
305 |     rawResponse: string,
306 |     attempt: number = 1
307 |   ): Promise<{
308 |     testCases: TestCase[];
309 |     estimatedDuration: number;
310 |     requiredResources: string[];
311 |     reasoning: string;
312 |   } | null> {
313 |     // Try balanced JSON extraction first
314 |     const parsed = parseJSONSafely<{
315 |       testCases: TestCase[];
316 |       estimatedDuration: number;
317 |       requiredResources: string[];
318 |       reasoning: string;
319 |     }>(rawResponse);
320 |     
321 |     if (parsed && this.validateTestPlanStructure(parsed)) {
322 |       logger.debug('Successfully parsed test plan using balanced extraction');
323 |       return parsed;
324 |     }
325 | 
326 |     // Save raw response for debugging
327 |     try {
328 |       const debugDir = path.join(process.cwd(), 'traceqa-debug');
329 |       await fs.ensureDir(debugDir);
330 |       await fs.writeFile(
331 |         path.join(debugDir, `raw-response-attempt-${attempt}.txt`),
332 |         rawResponse,
333 |         'utf-8'
334 |       );
335 |       logger.info(`Raw AI response saved to: traceqa-debug/raw-response-attempt-${attempt}.txt`);
336 |     } catch (err) {
337 |       logger.warn(`Failed to save debug response: ${err instanceof Error ? err.message : String(err)}`);
338 |     }
339 | 
340 |     // Try one repair pass if first attempt failed
341 |     if (attempt === 1) {
342 |       logger.warn('Initial JSON parsing failed, attempting repair...');
343 |       
344 |       const repairPrompt = `The following response contains invalid JSON. Please return ONLY valid JSON with no markdown, no prose, no code fences, no commentary:
345 | 
346 | ${rawResponse}
347 | 
348 | Return valid JSON only:`;
349 | 
350 |       const repairedResponse = await this.watsonxClient.sendMessage(repairPrompt, {
351 |         maxTokens: 4000,
352 |         temperature: 0.1,
353 |       });
354 | 
355 |       return this.parseTestPlanWithRepair(repairedResponse, 2);
356 |     }
357 | 
358 |     throw new TraceQAError(
359 |       'Failed to parse test plan after repair attempt',
360 |       ErrorCategory.AGENT,
361 |       { rawResponse: rawResponse.substring(0, 500) }
362 |     );
363 |   }
364 | 
365 |   /**
366 |    * Validate test plan structure (returns boolean for use in parseJSONSafely)
367 |    */
368 |   private validateTestPlanStructure(plan: any): boolean {
369 |     return !!(
370 |       plan &&
371 |       plan.testCases &&
372 |       Array.isArray(plan.testCases) &&
373 |       typeof plan.estimatedDuration === 'number' &&
374 |       plan.requiredResources &&
375 |       Array.isArray(plan.requiredResources)
376 |     );
377 |   }
378 | 
379 |   /**
380 |    * Validate test plan structure
381 |    */
382 |   private validateTestPlan(plan: any): void {
383 |     const errors: string[] = [];
384 | 
385 |     if (!plan.testCases || !Array.isArray(plan.testCases)) {
386 |       errors.push('testCases must be an array');
387 |     } else {
388 |       plan.testCases.forEach((tc: any, index: number) => {
389 |         if (!tc.id) errors.push(`Test case ${index}: missing id`);
390 |         if (!tc.name) errors.push(`Test case ${index}: missing name`);
391 |         if (!tc.type) errors.push(`Test case ${index}: missing type`);
392 |         if (!tc.steps || !Array.isArray(tc.steps)) {
393 |           errors.push(`Test case ${index}: steps must be an array`);
394 |         }
395 |       });
396 |     }
397 | 
398 |     if (typeof plan.estimatedDuration !== 'number') {
399 |       errors.push('estimatedDuration must be a number');
400 |     }
401 | 
402 |     if (!plan.requiredResources || !Array.isArray(plan.requiredResources)) {
403 |       errors.push('requiredResources must be an array');
404 |     }
405 | 
406 |     if (errors.length > 0) {
407 |       logger.error('Test plan validation failed:', errors);
408 |       throw new TraceQAError(
409 |         'Test plan validation failed',
410 |         ErrorCategory.AGENT,
411 |         { validationErrors: errors }
412 |       );
413 |     }
414 | 
415 |     logger.debug('Test plan validation passed');
416 |   }
417 | 
418 |   /**
419 |    * Execute all tests in the test plan
420 |    */
421 |   async executeTests(
422 |     testPlan: TestPlan,
423 |     context: TestContext
424 |   ): Promise<TestResults> {
425 |     this.updatePhase('executing');
426 |     logger.info(`Executing ${testPlan.testCases.length} test cases...`);
427 | 
428 |     const results: TestResult[] = [];
429 |     const startTime = Date.now();
430 | 
431 |     for (let i = 0; i < testPlan.testCases.length; i++) {
432 |       const testCase = testPlan.testCases[i];
433 |       logger.info(`[${i + 1}/${testPlan.testCases.length}] Executing: ${testCase.name}`);
434 | 
435 |       // Execute test case
436 |       const result = await this.executeTestCase(testCase, context);
437 |       results.push(result);
438 |       this.state.executedTests.push(result);
439 | 
440 |       // Analyze result and decide next action
441 |       const decision = this.decisionEngine.analyzeTestResult(
442 |         result,
443 |         testCase,
444 |         context
445 |       );
446 |       this.state.pendingDecisions.push(decision);
447 | 
448 |       // Handle decision
449 |       if (decision.requiresHumanInput) {
450 |         logger.warn('Human input required:', decision.reasoning);
451 |         // In a real implementation, this would pause and wait for human input
452 |         // For now, we'll continue
453 |       }
454 | 
455 |       if (decision.action === 'retry' && !result.passed) {
456 |         logger.info('Retrying test case...');
457 |         const retryResult = await this.executeTestCase(testCase, context);
458 |         results[results.length - 1] = retryResult;
459 |         this.state.executedTests[this.state.executedTests.length - 1] = retryResult;
460 |       }
461 | 
462 |       if (decision.action === 'abort') {
463 |         logger.warn('Test execution aborted:', decision.reasoning);
464 |         break;
465 |       }
466 | 
467 |       // Check if we should continue
468 |       const remainingTests = testPlan.testCases.slice(i + 1);
469 |       const continueDecision = this.decisionEngine.shouldContinueExecution(
470 |         results,
471 |         remainingTests,
472 |         context
473 |       );
474 | 
475 |       if (continueDecision.action === 'ask_human') {
476 |         logger.warn('Execution paused for human decision:', continueDecision.reasoning);
477 |         // In a real implementation, wait for human input
478 |       }
479 |     }
480 | 
481 |     const duration = Date.now() - startTime;
482 | 
483 |     // Generate summary
484 |     const summary: TestSummary = {
485 |       total: results.length,
486 |       passed: results.filter(r => r.passed).length,
487 |       failed: results.filter(r => !r.passed).length,
488 |       skipped: testPlan.testCases.length - results.length,
489 |       duration,
490 |       successRate: results.length > 0 ? results.filter(r => r.passed).length / results.length : 0
491 |     };
492 | 
493 |     logger.success(
494 |       `Test execution completed: ${summary.passed}/${summary.total} passed (${(summary.successRate * 100).toFixed(1)}%)`
495 |     );
496 | 
497 |     return {
498 |       summary,
499 |       results,
500 |       duration,
501 |       timestamp: new Date().toISOString(),
502 |       repository: context.repository,
503 |       testPlan
504 |     };
505 |   }
506 | 
507 |   /**
508 |    * Execute a single test case
509 |    */
510 |   private async executeTestCase(
511 |     testCase: TestCase,
512 |     context: TestContext
513 |   ): Promise<TestResult> {
514 |     const startTime = Date.now();
515 | 
516 |     try {
517 |       logger.debug(`Executing test case: ${testCase.name}`);
518 | 
519 |       // For UI tests, we need MCP manager
520 |       if (testCase.type === TestType.WEB_UI && !this.mcpManager) {
521 |         throw new TraceQAError(
522 |           'MCP manager required for UI tests',
523 |           ErrorCategory.AGENT
524 |         );
525 |       }
526 | 
527 |       // Generate execution prompt
528 |       const stepsDescription = testCase.steps
529 |         .map((step, i) => `${i + 1}. ${step.description} (${step.action} ${step.target || ''})`)
530 |         .join('\n');
531 | 
532 |       const prompt = getTestExecutionPrompt(
533 |         testCase.name,
534 |         stepsDescription,
535 |         context
536 |       );
537 | 
538 |       // Get execution guidance from Watsonx
539 |       const response = await this.watsonxClient.sendMessage(prompt);
540 | 
541 |       // Execute steps (simplified - in real implementation, would use MCP)
542 |       const passed = await this.executeSteps(testCase, context);
543 | 
544 |       const duration = Date.now() - startTime;
545 | 
546 |       return {
547 |         testCaseId: testCase.id,
548 |         testCaseName: testCase.name,
549 |         passed,
550 |         duration,
551 |         message: passed ? 'Test passed successfully' : 'Test failed',
552 |         timestamp: new Date().toISOString(),
553 |         logs: [response]
554 |       };
555 |     } catch (error) {
556 |       const duration = Date.now() - startTime;
557 |       logger.error(`Test case failed: ${testCase.name}`, error);
558 | 
559 |       return {
560 |         testCaseId: testCase.id,
561 |         testCaseName: testCase.name,
562 |         passed: false,
563 |         duration,
564 |         message: 'Test execution error',
565 |         error: error instanceof Error ? error.message : String(error),
566 |         timestamp: new Date().toISOString()
567 |       };
568 |     }
569 |   }
570 | 
571 |   /**
572 |    * Execute test steps (simplified implementation)
573 |    */
574 |   private async executeSteps(
575 |     testCase: TestCase,
576 |     _context: TestContext
577 |   ): Promise<boolean> {
578 |     // This is a simplified implementation
579 |     // In a real implementation, this would:
580 |     // 1. Use MCP to execute browser actions
581 |     // 2. Make API calls for API tests
582 |     // 3. Verify results at each step
583 |     // 4. Handle errors and retries
584 | 
585 |     logger.debug(`Executing ${testCase.steps.length} steps for ${testCase.name}`);
586 | 
587 |     // Note: Actual test execution is now handled by TestCoordinator
588 |     // which delegates to APITester or WebTester based on test type.
589 |     // This method is kept for backward compatibility but should not be used directly.
590 |     
591 |     logger.warn('executeTestCase called directly - tests should be executed via TestCoordinator');
592 |     
593 |     // Return false to indicate this path should not be used
594 |     return false;
595 |   }
596 | 
597 |   /**
598 |    * Analyze test results and generate insights
599 |    */
600 |   async analyzeResults(
601 |     results: TestResults,
602 |     context: TestContext
603 |   ): Promise<AgentAnalysis> {
604 |     this.updatePhase('analyzing');
605 |     logger.info('Analyzing test results...');
606 | 
607 |     try {
608 |       const analysis = this.decisionEngine.analyzeResults(
609 |         results.results,
610 |         context
611 |       );
612 | 
613 |       this.updateTokenUsage();
614 | 
615 |       logger.success('Test results analyzed');
616 |       return analysis;
617 |     } catch (error) {
618 |       logger.error('Failed to analyze results:', error);
619 |       throw new TraceQAError(
620 |         'Failed to analyze test results',
621 |         ErrorCategory.AGENT,
622 |         error
623 |       );
624 |     }
625 |   }
626 | 
627 |   /**
628 |    * Generate comprehensive test report
629 |    */
630 |   async generateReport(
631 |     results: TestResults,
632 |     _analysis: AgentAnalysis,
633 |     context: TestContext
634 |   ): Promise<string> {
635 |     this.updatePhase('reporting');
636 |     logger.info('Generating test report...');
637 | 
638 |     try {
639 |       const resultsText = results.results
640 |         .map(r => `- ${r.testCaseName}: ${r.passed ? 'PASSED' : 'FAILED'} (${r.duration}ms)`)
641 |         .join('\n');
642 | 
643 |       const summaryText = `
644 | Total: ${results.summary.total}
645 | Passed: ${results.summary.passed}
646 | Failed: ${results.summary.failed}
647 | Success Rate: ${(results.summary.successRate * 100).toFixed(1)}%
648 | Duration: ${results.duration}ms
649 |       `.trim();
650 | 
651 |       const prompt = getReportGenerationPrompt(resultsText, summaryText, context);
652 | 
653 |       const report = await this.watsonxClient.sendMessage(prompt);
654 | 
655 |       this.updateTokenUsage();
656 | 
657 |       logger.success('Test report generated');
658 |       return report;
659 |     } catch (error) {
660 |       logger.error('Failed to generate report:', error);
661 |       throw new TraceQAError(
662 |         'Failed to generate test report',
663 |         ErrorCategory.AGENT,
664 |         error
665 |       );
666 |     }
667 |   }
668 | 
669 |   /**
670 |    * Run complete test cycle: plan, execute, analyze, report
671 |    */
672 |   async runTestCycle(context: TestContext): Promise<{
673 |     testPlan: TestPlan;
674 |     results: TestResults;
675 |     analysis: AgentAnalysis;
676 |     report: string;
677 |   }> {
678 |     logger.info('Starting complete test cycle...');
679 | 
680 |     try {
681 |       // Create test plan
682 |       const testPlan = await this.createTestPlan(context);
683 | 
684 |       // Execute tests
685 |       const results = await this.executeTests(testPlan, context);
686 | 
687 |       // Analyze results
688 |       const analysis = await this.analyzeResults(results, context);
689 | 
690 |       // Generate report
691 |       const report = await this.generateReport(results, analysis, context);
692 | 
693 |       this.updatePhase('idle');
694 | 
695 |       logger.success('Test cycle completed successfully');
696 | 
697 |       return {
698 |         testPlan,
699 |         results,
700 |         analysis,
701 |         report
702 |       };
703 |     } catch (error) {
704 |       logger.error('Test cycle failed:', error);
705 |       this.updatePhase('idle');
706 |       throw error;
707 |     }
708 |   }
709 | 
710 |   /**
711 |    * Get current agent state
712 |    */
713 |   getState(): AgentState {
714 |     return { ...this.state };
715 |   }
716 | 
717 |   /**
718 |    * Get token usage statistics
719 |    */
720 |   getTokenUsage(): TokenUsage {
721 |     return this.watsonxClient.getTokenUsage();
722 |   }
723 | 
724 |   /**
725 |    * Get conversation history
726 |    */
727 |   getConversationHistory(): ConversationMessage[] {
728 |     return this.watsonxClient.getHistory();
729 |   }
730 | 
731 |   /**
732 |    * Reset agent state
733 |    */
734 |   reset(): void {
735 |     this.watsonxClient.clearHistory();
736 |     this.watsonxClient.resetTokenUsage();
737 |     this.decisionEngine.reset();
738 | 
739 |     this.state = {
740 |       currentPhase: 'idle',
741 |       conversationHistory: [],
742 |       executedTests: [],
743 |       pendingDecisions: [],
744 |       tokenUsage: {
745 |         inputTokens: 0,
746 |         outputTokens: 0,
747 |         totalTokens: 0,
748 |         estimatedCost: 0
749 |       },
750 |       startTime: new Date().toISOString(),
751 |       lastActivity: new Date().toISOString()
752 |     };
753 | 
754 |     logger.info('Agent state reset');
755 |   }
756 | 
757 |   /**
758 |    * Update current phase
759 |    */
760 |   private updatePhase(phase: AgentState['currentPhase']): void {
761 |     this.state.currentPhase = phase;
762 |     this.state.lastActivity = new Date().toISOString();
763 |     logger.debug(`Agent phase: ${phase}`);
764 |   }
765 | 
766 |   /**
767 |    * Update token usage from watsonx client
768 |    */
769 |   private updateTokenUsage(): void {
770 |     this.state.tokenUsage = this.watsonxClient.getTokenUsage();
771 |     this.state.conversationHistory = this.watsonxClient.getHistory();
772 |   }
773 | 
774 | }
775 | 
776 | /**
777 |  * Create a test agent with configuration
778 |  */
779 | export function createTestAgent(
780 |   config: AgentConfig,
781 |   mcpManager?: MCPClientManager
782 | ): TestAgent {
783 |   return new TestAgent(config, mcpManager);
784 | }
785 | 
786 | /**
787 |  * Create a test agent with API key
788 |  */
789 | export function createTestAgentWithKey(
790 |   apiKey: string,
791 |   options?: Partial<AgentConfig>,
792 |   mcpManager?: MCPClientManager
793 | ): TestAgent {
794 |   return new TestAgent(
795 |     {
796 |       apiKey,
797 |       ...options
798 |     },
799 |     mcpManager
800 |   );
801 | }
802 | 
803 | // Made with Bob
</content>
</file>
<file><path>src/agent/watsonx-client.ts</path>
<content lines="1-470">
  1 | /**
  2 |  * TraceQA IBM watsonx.ai API Client
  3 |  * Handles communication with IBM watsonx.ai API
  4 |  */
  5 | 
  6 | import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
  7 | import { IamAuthenticator } from 'ibm-cloud-sdk-core';
  8 | import {
  9 |   AgentConfig,
 10 |   ConversationMessage,
 11 |   WatsonxStreamChunk,
 12 |   TokenUsage,
 13 |   TraceQAError,
 14 |   ErrorCategory
 15 | } from '../types/index.js';
 16 | import { logger } from '../utils/logger.js';
 17 | 
 18 | /**
 19 |  * IBM watsonx.ai API client for TraceQA agent
 20 |  */
 21 | export class WatsonxClient {
 22 |   private client: WatsonXAI;
 23 |   private config: Required<AgentConfig>;
 24 |   private conversationHistory: ConversationMessage[] = [];
 25 |   private tokenUsage: TokenUsage = {
 26 |     inputTokens: 0,
 27 |     outputTokens: 0,
 28 |     totalTokens: 0,
 29 |     estimatedCost: 0
 30 |   };
 31 |   private model: string;
 32 |   private projectId: string;
 33 | 
 34 |   // Pricing per million tokens (estimated for IBM watsonx.ai)
 35 |   private static readonly PRICING = {
 36 |     'ibm/granite-3-3-8b-instruct': { input: 0.5, output: 1.5 },
 37 |     'ibm/granite-13b-chat-v2': { input: 0.5, output: 1.5 },
 38 |     'ibm/granite-20b-multilingual': { input: 0.7, output: 2.0 },
 39 |     'meta-llama/llama-3-70b-instruct': { input: 1.0, output: 3.0 },
 40 |     'meta-llama/llama-3-8b-instruct': { input: 0.3, output: 1.0 }
 41 |   };
 42 | 
 43 |   constructor(config: AgentConfig) {
 44 |     this.config = {
 45 |       apiKey: config.apiKey,
 46 |       model: config.model || 'ibm/granite-3-3-8b-instruct',
 47 |       maxTokens: config.maxTokens || 4096,
 48 |       temperature: config.temperature || 0.7,
 49 |       systemPrompt: config.systemPrompt || '',
 50 |       conversationHistory: config.conversationHistory || [],
 51 |       timeout: config.timeout || 60000,
 52 |       maxRetries: config.maxRetries || 3,
 53 |       streamResponses: config.streamResponses || false
 54 |     };
 55 | 
 56 |     // Get environment variables
 57 |     const apiKey = this.config.apiKey || process.env.IBM_WATSONX_API_KEY || '';
 58 |     const serviceUrl = process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
 59 |     this.projectId = process.env.IBM_WATSONX_PROJECT_ID || '';
 60 |     this.model = process.env.IBM_WATSONX_MODEL || this.config.model;
 61 | 
 62 |     if (!apiKey) {
 63 |       throw new TraceQAError(
 64 |         'IBM_WATSONX_API_KEY is required',
 65 |         ErrorCategory.AGENT
 66 |       );
 67 |     }
 68 | 
 69 |     if (!this.projectId) {
 70 |       throw new TraceQAError(
 71 |         'IBM_WATSONX_PROJECT_ID is required',
 72 |         ErrorCategory.AGENT
 73 |       );
 74 |     }
 75 | 
 76 |     // Initialize IBM watsonx.ai client
 77 |     const authenticator = new IamAuthenticator({
 78 |       apikey: apiKey
 79 |     });
 80 | 
 81 |     this.client = new WatsonXAI({
 82 |       version: '2024-05-31',
 83 |       authenticator: authenticator,
 84 |       serviceUrl: serviceUrl
 85 |     });
 86 | 
 87 |     this.conversationHistory = [...this.config.conversationHistory];
 88 | 
 89 |     logger.info(`Watsonx client initialized with model: ${this.model}`);
 90 |   }
 91 | 
 92 |   /**
 93 |    * Convert conversation messages to watsonx input format
 94 |    */
 95 |   private convertMessagesToWatsonxInput(
 96 |     messages: ConversationMessage[],
 97 |     systemPrompt?: string
 98 |   ): string {
 99 |     let input = '';
100 |     
101 |     if (systemPrompt) {
102 |       input += `<|system|>\n${systemPrompt}\n`;
103 |     }
104 |     
105 |     for (const msg of messages) {
106 |       if (msg.role === 'user') {
107 |         input += `<|user|>\n${msg.content}\n`;
108 |       } else if (msg.role === 'assistant') {
109 |         input += `<|assistant|>\n${msg.content}\n`;
110 |       }
111 |     }
112 |     
113 |     input += '<|assistant|>\n';
114 |     return input;
115 |   }
116 | 
117 |   /**
118 |    * Send a message to watsonx.ai and get a response
119 |    */
120 |   async sendMessage(
121 |     message: string,
122 |     options?: {
123 |       systemPrompt?: string;
124 |       temperature?: number;
125 |       maxTokens?: number;
126 |     }
127 |   ): Promise<string> {
128 |     const startTime = Date.now();
129 | 
130 |     try {
131 |       // Add user message to history
132 |       this.addToHistory('user', message);
133 | 
134 |       // Prepare input for watsonx.ai
135 |       const input = this.convertMessagesToWatsonxInput(
136 |         this.conversationHistory,
137 |         options?.systemPrompt || this.config.systemPrompt
138 |       );
139 | 
140 |       logger.debug(`Sending message to watsonx.ai (${this.conversationHistory.length} messages in history)`);
141 | 
142 |       // Make API call with retry logic
143 |       const response = await this.withRetry(async () => {
144 |         return await this.client.generateText({
145 |           modelId: this.model,
146 |           projectId: this.projectId,
147 |           input: input,
148 |           parameters: {
149 |             max_new_tokens: options?.maxTokens || this.config.maxTokens,
150 |             temperature: options?.temperature || this.config.temperature,
151 |             top_p: 1,
152 |             top_k: 50
153 |           }
154 |         });
155 |       });
156 | 
157 |       // Extract response text
158 |       const responseText = response.result.results[0].generated_text;
159 |       const inputTokens = response.result.results[0].input_token_count || 0;
160 |       const outputTokens = response.result.results[0].generated_token_count || 0;
161 | 
162 |       // Add assistant response to history
163 |       this.addToHistory('assistant', responseText, {
164 |         tokenCount: outputTokens,
165 |         model: this.model,
166 |         finishReason: response.result.results[0].stop_reason || undefined
167 |       });
168 | 
169 |       // Update token usage
170 |       this.updateTokenUsage(inputTokens, outputTokens);
171 | 
172 |       const duration = Date.now() - startTime;
173 |       logger.success(`Received response from watsonx.ai (${duration}ms, ${outputTokens} tokens)`);
174 | 
175 |       return responseText;
176 |     } catch (error) {
177 |       const duration = Date.now() - startTime;
178 |       logger.error(`Failed to get response from watsonx.ai (${duration}ms):`, error);
179 |       throw new TraceQAError(
180 |         `Watsonx API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
181 |         ErrorCategory.AGENT,
182 |         { error, duration }
183 |       );
184 |     }
185 |   }
186 | 
187 |   /**
188 |    * Send a message and stream the response
189 |    */
190 |   async *streamMessage(
191 |     message: string,
192 |     options?: {
193 |       systemPrompt?: string;
194 |       temperature?: number;
195 |       maxTokens?: number;
196 |     }
197 |   ): AsyncGenerator<string, void, unknown> {
198 |     const startTime = Date.now();
199 | 
200 |     try {
201 |       // Add user message to history
202 |       this.addToHistory('user', message);
203 | 
204 |       // Prepare input for watsonx.ai
205 |       const input = this.convertMessagesToWatsonxInput(
206 |         this.conversationHistory,
207 |         options?.systemPrompt || this.config.systemPrompt
208 |       );
209 | 
210 |       logger.debug(`Streaming message to watsonx.ai (${this.conversationHistory.length} messages in history)`);
211 | 
212 |       // Make streaming API call
213 |       const stream = await this.client.generateTextStream({
214 |         modelId: this.model,
215 |         projectId: this.projectId,
216 |         input: input,
217 |         parameters: {
218 |           max_new_tokens: options?.maxTokens || this.config.maxTokens,
219 |           temperature: options?.temperature || this.config.temperature,
220 |           top_p: 1,
221 |           top_k: 50
222 |         }
223 |       });
224 | 
225 |       let fullResponse = '';
226 |       let inputTokens = 0;
227 |       let outputTokens = 0;
228 | 
229 |       for await (const chunk of stream) {
230 |         const parsedChunk = chunk as unknown as WatsonxStreamChunk;
231 |         if (parsedChunk.results && parsedChunk.results.length > 0) {
232 |           const result = parsedChunk.results[0];
233 |           
234 |           if (result.generated_text) {
235 |             const text = result.generated_text;
236 |             fullResponse += text;
237 |             yield text;
238 |           }
239 |           
240 |           if (result.input_token_count) {
241 |             inputTokens = result.input_token_count;
242 |           }
243 |           
244 |           if (result.generated_token_count) {
245 |             outputTokens = result.generated_token_count;
246 |           }
247 |         }
248 |       }
249 | 
250 |       // Add assistant response to history
251 |       this.addToHistory('assistant', fullResponse, {
252 |         tokenCount: outputTokens,
253 |         model: this.model
254 |       });
255 | 
256 |       // Update token usage
257 |       this.updateTokenUsage(inputTokens, outputTokens);
258 | 
259 |       const duration = Date.now() - startTime;
260 |       logger.success(`Completed streaming response from watsonx.ai (${duration}ms, ${outputTokens} tokens)`);
261 |     } catch (error) {
262 |       const duration = Date.now() - startTime;
263 |       logger.error(`Failed to stream response from watsonx.ai (${duration}ms):`, error);
264 |       throw new TraceQAError(
265 |         `Watsonx API streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
266 |         ErrorCategory.AGENT,
267 |         { error, duration }
268 |       );
269 |     }
270 |   }
271 | 
272 |   /**
273 |    * Clear conversation history
274 |    */
275 |   clearHistory(): void {
276 |     this.conversationHistory = [];
277 |     logger.debug('Conversation history cleared');
278 |   }
279 | 
280 |   /**
281 |    * Get conversation history
282 |    */
283 |   getHistory(): ConversationMessage[] {
284 |     return [...this.conversationHistory];
285 |   }
286 | 
287 |   /**
288 |    * Get token usage statistics
289 |    */
290 |   getTokenUsage(): TokenUsage {
291 |     return { ...this.tokenUsage };
292 |   }
293 | 
294 |   /**
295 |    * Reset token usage statistics
296 |    */
297 |   resetTokenUsage(): void {
298 |     this.tokenUsage = {
299 |       inputTokens: 0,
300 |       outputTokens: 0,
301 |       totalTokens: 0,
302 |       estimatedCost: 0
303 |     };
304 |     logger.debug('Token usage statistics reset');
305 |   }
306 | 
307 |   /**
308 |    * Set system prompt
309 |    */
310 |   setSystemPrompt(prompt: string): void {
311 |     this.config.systemPrompt = prompt;
312 |     logger.debug('System prompt updated');
313 |   }
314 | 
315 |   /**
316 |    * Get current configuration
317 |    */
318 |   getConfig(): Required<AgentConfig> {
319 |     return { ...this.config };
320 |   }
321 | 
322 |   /**
323 |    * Add message to conversation history
324 |    */
325 |   private addToHistory(
326 |     role: 'user' | 'assistant' | 'system',
327 |     content: string,
328 |     metadata?: ConversationMessage['metadata']
329 |   ): void {
330 |     this.conversationHistory.push({
331 |       role,
332 |       content,
333 |       timestamp: new Date().toISOString(),
334 |       metadata
335 |     });
336 |   }
337 | 
338 |   /**
339 |    * Update token usage and calculate cost
340 |    */
341 |   private updateTokenUsage(inputTokens: number, outputTokens: number): void {
342 |     this.tokenUsage.inputTokens += inputTokens;
343 |     this.tokenUsage.outputTokens += outputTokens;
344 |     this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;
345 | 
346 |     // Calculate estimated cost
347 |     const pricing = WatsonxClient.PRICING[this.model as keyof typeof WatsonxClient.PRICING] ||
348 |                     WatsonxClient.PRICING['ibm/granite-3-3-8b-instruct'];
349 |     
350 |     const inputCost = (this.tokenUsage.inputTokens / 1_000_000) * pricing.input;
351 |     const outputCost = (this.tokenUsage.outputTokens / 1_000_000) * pricing.output;
352 |     this.tokenUsage.estimatedCost = inputCost + outputCost;
353 |   }
354 | 
355 |   /**
356 |    * Retry logic for API calls
357 |    */
358 |   private async withRetry<T>(
359 |     operation: () => Promise<T>,
360 |     attempt = 1
361 |   ): Promise<T> {
362 |     try {
363 |       return await operation();
364 |     } catch (error) {
365 |       if (attempt >= this.config.maxRetries) {
366 |         throw error;
367 |       }
368 | 
369 |       // Check if error is retryable
370 |       const isRetryable = this.isRetryableError(error);
371 |       if (!isRetryable) {
372 |         throw error;
373 |       }
374 | 
375 |       // Calculate backoff delay
376 |       const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
377 |       logger.warn(`API call failed (attempt ${attempt}/${this.config.maxRetries}), retrying in ${delay}ms...`);
378 | 
379 |       // Simple delay using busy wait (not ideal but works in all environments)
380 |       await new Promise<void>(resolve => {
381 |         const start = Date.now();
382 |         const checkDelay = (): void => {
383 |           if (Date.now() - start >= delay) {
384 |             resolve();
385 |           } else {
386 |             Promise.resolve().then(checkDelay);
387 |           }
388 |         };
389 |         checkDelay();
390 |       });
391 |       return this.withRetry(operation, attempt + 1);
392 |     }
393 |   }
394 | 
395 |   /**
396 |    * Check if error is retryable
397 |    */
398 |   private isRetryableError(error: unknown): boolean {
399 |     if (error && typeof error === 'object' && 'status' in error) {
400 |       const status = (error as { status: number }).status;
401 |       // Retry on rate limits and server errors
402 |       return status === 429 || (status >= 500 && status < 600);
403 |     }
404 |     return false;
405 |   }
406 | 
407 |   /**
408 |    * Estimate tokens in text (rough approximation)
409 |    */
410 |   static estimateTokens(text: string): number {
411 |     // Rough estimate: ~4 characters per token
412 |     return Math.ceil(text.length / 4);
413 |   }
414 | 
415 |   /**
416 |    * Check if message would exceed token limit
417 |    */
418 |   wouldExceedTokenLimit(message: string): boolean {
419 |     const historyTokens = this.conversationHistory.reduce(
420 |       (sum, msg) => sum + WatsonxClient.estimateTokens(msg.content),
421 |       0
422 |     );
423 |     const messageTokens = WatsonxClient.estimateTokens(message);
424 |     const systemTokens = WatsonxClient.estimateTokens(this.config.systemPrompt);
425 | 
426 |     const totalTokens = historyTokens + messageTokens + systemTokens;
427 |     const maxContextTokens = 8192; // IBM Granite context window
428 | 
429 |     return totalTokens > maxContextTokens;
430 |   }
431 | 
432 |   /**
433 |    * Trim conversation history to fit within token limits
434 |    */
435 |   trimHistory(maxTokens: number = 6000): void {
436 |     let totalTokens = WatsonxClient.estimateTokens(this.config.systemPrompt);
437 |     const trimmedHistory: ConversationMessage[] = [];
438 | 
439 |     // Keep most recent messages
440 |     for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
441 |       const msg = this.conversationHistory[i];
442 |       const msgTokens = WatsonxClient.estimateTokens(msg.content);
443 | 
444 |       if (totalTokens + msgTokens > maxTokens) {
445 |         break;
446 |       }
447 | 
448 |       trimmedHistory.unshift(msg);
449 |       totalTokens += msgTokens;
450 |     }
451 | 
452 |     const removedCount = this.conversationHistory.length - trimmedHistory.length;
453 |     if (removedCount > 0) {
454 |       logger.warn(`Trimmed ${removedCount} messages from conversation history to fit token limit`);
455 |       this.conversationHistory = trimmedHistory;
456 |     }
457 |   }
458 | }
459 | 
460 | /**
461 |  * Create a Watsonx client with default configuration
462 |  */
463 | export function createWatsonxClient(apiKey: string, options?: Partial<AgentConfig>): WatsonxClient {
464 |   return new WatsonxClient({
465 |     apiKey,
466 |     ...options
467 |   });
468 | }
469 | 
470 | // Made with Bob
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files


# VSCode Open Tabs
src/utils/logger.ts,.env,src/agent/watsonx-client.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example,src/config/index.ts,src/reporting/report-generator.ts,test-fixtures/ibm-test-plan.json,src/testing/api-tester.ts,test-post-fix.ts,src/parsers/acceptance-parser.ts,src/generators/test-generator.ts,src/types/index.ts,test-acceptance-parser.ts,acceptance.md,README.md,CHANGELOG.md,FEATURES.md,src/utils/json-extractor.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T02:22:39.537Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.13

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>ask</slug>
<name>❓ Ask</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I'll continue reading the remaining critical files to complete the analysis.

<read_file>
<args>
  <file>
    <path>src/agent/prompts.ts</path>
  </file>
  <file>
    <path>src/generators/qa-task-generator.ts</path>
  </file>
  <file>
    <path>src/reporting/report-generator.ts</path>
  </file>
  <file>
    <path>src/testing/test-coordinator.ts</path>
  </file>
  <file>
    <path>src/testing/test-runner.ts</path>
  </file>
</args>
</read_file>

---

**User:**

[read_file for 5 files] Result:
<files>
<file><path>src/agent/prompts.ts</path>
<content lines="1-567">
  1 | /**
  2 |  * TraceQA Agent Prompts and Templates
  3 |  * System prompts, test planning prompts, and other templates for the AI agent
  4 |  */
  5 | 
  6 | import { TestContext, DiffAnalysis } from '../types/index.js';
  7 | import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
  8 | import { logger } from '../utils/logger.js';
  9 | 
 10 | /**
 11 |  * Base system prompt for the TraceQA agent
 12 |  */
 13 | export const SYSTEM_PROMPT = `You are TraceQA Agent, an intelligent software testing assistant specialized in automated testing for web applications and APIs.
 14 | 
 15 | Your capabilities:
 16 | - Analyze code changes and understand their impact
 17 | - Create comprehensive test plans based on requirements
 18 | - Execute tests using browser automation and API testing tools
 19 | - Make intelligent decisions about test execution flow
 20 | - Identify edge cases and potential issues
 21 | - Generate detailed test reports
 22 | 
 23 | Your responsibilities:
 24 | - Ensure test coverage aligns with acceptance criteria
 25 | - Prioritize critical functionality
 26 | - Handle errors gracefully and retry when appropriate
 27 | - Ask for human input when facing ambiguous situations
 28 | - Provide clear reasoning for all decisions
 29 | - Track and report on test progress
 30 | 
 31 | Guidelines:
 32 | - Be thorough but efficient
 33 | - Focus on user-facing functionality
 34 | - Consider edge cases and error scenarios
 35 | - Provide actionable feedback
 36 | - Use structured responses when requested
 37 | - Always explain your reasoning`;
 38 | 
 39 | /**
 40 |  * Test planning prompt template
 41 |  */
 42 | export function getTestPlanningPrompt(
 43 |   context: TestContext,
 44 |   diffAnalysis?: DiffAnalysis | null,
 45 |   discoveredRoutes?: RouteDiscoveryResult | null
 46 | ): string {
 47 |   const { repository, changes, description, acceptanceCriteria, buildInfo } = context;
 48 | 
 49 |   let prompt = `# Test Planning Request
 50 | 
 51 | ## Repository Information
 52 | - Name: ${repository.name}
 53 | - Branch: ${repository.branch}
 54 | - Path: ${repository.path}
 55 | 
 56 | ## Change Description
 57 | ${description}
 58 | 
 59 | ## Acceptance Criteria
 60 | ${acceptanceCriteria && acceptanceCriteria.length > 0
 61 |   ? acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
 62 |   : 'No specific acceptance criteria provided'}
 63 | 
 64 | ## Code Changes Summary
 65 | - Files changed: ${changes.files.length}
 66 | - Lines added: ${changes.additions}
 67 | - Lines deleted: ${changes.deletions}
 68 | 
 69 | ### Changed Files:
 70 | ${changes.files.map(f => `- ${f.path} (${f.type}): +${f.additions} -${f.deletions}`).join('\n')}`;
 71 | 
 72 |   // Add diff analysis if available
 73 |   if (diffAnalysis) {
 74 |     prompt += `
 75 | 
 76 | ## Git Diff Analysis
 77 | - Base branch: ${diffAnalysis.baseBranch}
 78 | - Changed files: ${diffAnalysis.changedFiles.length}
 79 | - Risk level: ${diffAnalysis.riskLevel.toUpperCase()}
 80 | 
 81 | ### Impacted Areas:
 82 | ${diffAnalysis.impactedAreas.length > 0
 83 |   ? diffAnalysis.impactedAreas.map(area => `- ${area}`).join('\n')
 84 |   : '- No specific areas identified'}
 85 | 
 86 | ### Suggested Test Focus:
 87 | ${diffAnalysis.suggestedTestFocus.length > 0
 88 |   ? diffAnalysis.suggestedTestFocus.map(focus => `- ${focus}`).join('\n')
 89 |   : '- General functionality testing'}
 90 | 
 91 | **IMPORTANT**: Prioritize tests for the impacted areas and suggested focus areas above.`;
 92 |   }
 93 | 
 94 |   // Add discovered routes if available
 95 |   if (discoveredRoutes && discoveredRoutes.routes.length > 0) {
 96 |     prompt += `
 97 | 
 98 | ## Discovered API Routes
 99 | Framework: ${discoveredRoutes.framework}
100 | Discovery Method: ${discoveredRoutes.discoveryMethod}
101 | 
102 | ### Available Routes:
103 | ${discoveredRoutes.routes.map(route => `- ${route.method.padEnd(6)} ${route.path}`).join('\n')}
104 | 
105 | **IMPORTANT**: Use these discovered routes when generating API test cases. Construct full URLs by combining the base URL with these paths. Ensure HTTP methods match the discovered routes.`;
106 |   }
107 | 
108 |   prompt += `
109 | 
110 | ## Build Information
111 | - Framework: ${buildInfo.framework}
112 | - Language: ${buildInfo.language}
113 | - Build Status: ${buildInfo.success ? 'Success' : 'Failed'}
114 | ${buildInfo.port ? `- Running on port: ${buildInfo.port}` : ''}
115 | 
116 | ## Task
117 | Create a comprehensive test plan that:
118 | 1. Covers all acceptance criteria
119 | 2. Tests the changed functionality thoroughly
120 | 3. Includes edge cases and error scenarios
121 | 4. Prioritizes critical user flows${diffAnalysis ? ' and impacted areas from diff analysis' : ''}
122 | 5. Is executable using browser automation and/or API testing
123 | 
124 | **CRITICAL JSON FORMATTING REQUIREMENTS:**
125 | - Return ONLY valid JSON, no markdown, no code fences, no explanatory text
126 | - Your response MUST start with { and end with }
127 | - Do NOT include any prose, commentary, or explanations before or after the JSON
128 | - Use double quotes for all strings, NOT single quotes
129 | - Request bodies must be JSON objects, NOT stringified JSON
130 | - Do NOT wrap response in \`\`\`json blocks or any other formatting
131 | - Ensure all JSON is properly escaped and valid
132 | - Numbers should not be quoted unless they are string values
133 | - Boolean values must be true/false (lowercase, unquoted)
134 | - NO text before the opening brace { or after the closing brace }
135 | 
136 | **IMPORTANT TRACEABILITY REQUIREMENTS:**
137 | - Each test case MUST map to a specific acceptance criterion ID (e.g., AC-1, AC-2)
138 | - Include the acceptanceCriterionId field in each test case
139 | - Ensure all acceptance criteria are covered by at least one test
140 | - Multiple tests can map to the same acceptance criterion for thorough coverage
141 | 
142 | Respond with a JSON object in this EXACT format (no additional text or formatting):
143 | {
144 |   "testCases": [
145 |     {
146 |       "id": "unique-test-id",
147 |       "name": "Test case name",
148 |       "description": "What this test validates",
149 |       "type": "ui" | "api" | "integration",
150 |       "priority": "high" | "medium" | "low",
151 |       "acceptanceCriterionId": "AC-1",
152 |       "steps": [
153 |         {
154 |           "action": "navigate" | "click" | "type" | "verify" | "api_call",
155 |           "target": "CSS selector or API endpoint",
156 |           "value": "value to input or expected result",
157 |           "description": "What this step does"
158 |         }
159 |       ],
160 |       "expectedResult": "What should happen if test passes"
161 |     }
162 |   ],
163 |   "estimatedDuration": 300,
164 |   "requiredResources": ["browser", "api-client"],
165 |   "reasoning": "Why these tests cover the requirements"
166 | }`;
167 | 
168 |   return prompt;
169 | }
170 | 
171 | /**
172 |  * Test execution prompt template
173 |  */
174 | export function getTestExecutionPrompt(
175 |   testCaseName: string,
176 |   testSteps: string,
177 |   context: TestContext
178 | ): string {
179 |   return `# Test Execution Request
180 | 
181 | ## Test Case
182 | ${testCaseName}
183 | 
184 | ## Test Steps
185 | ${testSteps}
186 | 
187 | ## Application Context
188 | - Framework: ${context.buildInfo.framework}
189 | - Base URL: http://localhost:${context.buildInfo.port || 3000}
190 | - Build Status: ${context.buildInfo.success ? 'Running' : 'Not running'}
191 | 
192 | ## Available Tools
193 | - Browser automation (navigate, click, type, screenshot, etc.)
194 | - API testing (HTTP requests, response validation)
195 | - Element inspection and verification
196 | 
197 | ## Task
198 | Execute the test steps and report results. For each step:
199 | 1. Perform the action using available tools
200 | 2. Verify the expected outcome
201 | 3. Capture screenshots for UI tests
202 | 4. Log any errors or unexpected behavior
203 | 
204 | If a step fails:
205 | - Analyze the failure reason
206 | - Determine if it's a real bug or test issue
207 | - Suggest next steps (retry, modify test, report bug)
208 | 
209 | Respond with structured results including:
210 | - Success/failure status
211 | - Detailed step-by-step results
212 | - Screenshots (for UI tests)
213 | - Error messages (if any)
214 | - Recommendations`;
215 | }
216 | 
217 | /**
218 |  * Error analysis prompt template
219 |  */
220 | export function getErrorAnalysisPrompt(
221 |   error: string,
222 |   testContext: string,
223 |   attemptNumber: number
224 | ): string {
225 |   return `# Error Analysis Request
226 | 
227 | ## Error Details
228 | ${error}
229 | 
230 | ## Test Context
231 | ${testContext}
232 | 
233 | ## Attempt Number
234 | ${attemptNumber}
235 | 
236 | ## Task
237 | Analyze this test failure and determine:
238 | 
239 | 1. **Root Cause**: What caused the failure?
240 |    - Application bug
241 |    - Test flakiness
242 |    - Environment issue
243 |    - Timing issue
244 |    - Configuration problem
245 | 
246 | 2. **Severity**: How critical is this?
247 |    - Critical: Blocks core functionality
248 |    - High: Affects important features
249 |    - Medium: Minor functionality issue
250 |    - Low: Edge case or cosmetic
251 | 
252 | 3. **Recommended Action**:
253 |    - Retry with adjustments
254 |    - Report as bug
255 |    - Skip test
256 |    - Ask for human input
257 |    - Modify test approach
258 | 
259 | 4. **Reasoning**: Explain your analysis
260 | 
261 | Respond with a JSON object:
262 | {
263 |   "rootCause": "description",
264 |   "category": "bug" | "flaky" | "environment" | "timing" | "config",
265 |   "severity": "critical" | "high" | "medium" | "low",
266 |   "action": "retry" | "report" | "skip" | "ask_human" | "modify",
267 |   "reasoning": "detailed explanation",
268 |   "suggestions": ["suggestion 1", "suggestion 2"],
269 |   "confidence": 0.85
270 | }`;
271 | }
272 | 
273 | /**
274 |  * Decision making prompt template
275 |  */
276 | export function getDecisionPrompt(
277 |   situation: string,
278 |   options: string[],
279 |   context: Record<string, unknown>
280 | ): string {
281 |   return `# Decision Request
282 | 
283 | ## Situation
284 | ${situation}
285 | 
286 | ## Available Options
287 | ${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}
288 | 
289 | ## Context
290 | ${JSON.stringify(context, null, 2)}
291 | 
292 | ## Task
293 | Analyze the situation and make a decision:
294 | 
295 | 1. Evaluate each option's pros and cons
296 | 2. Consider the context and constraints
297 | 3. Choose the best option
298 | 4. Explain your reasoning
299 | 5. Assess your confidence level
300 | 
301 | Respond with a JSON object:
302 | {
303 |   "decision": "chosen option",
304 |   "reasoning": "why this is the best choice",
305 |   "confidence": 0.9,
306 |   "alternatives": ["other viable options"],
307 |   "risks": ["potential risks of this decision"],
308 |   "requiresHumanInput": false
309 | }`;
310 | }
311 | 
312 | /**
313 |  * Report generation prompt template
314 |  */
315 | export function getReportGenerationPrompt(
316 |   testResults: string,
317 |   summary: string,
318 |   context: TestContext
319 | ): string {
320 |   return `# Test Report Generation Request
321 | 
322 | ## Test Summary
323 | ${summary}
324 | 
325 | ## Test Results
326 | ${testResults}
327 | 
328 | ## Test Context
329 | - Repository: ${context.repository.name}
330 | - Branch: ${context.repository.branch}
331 | - Change Description: ${context.description}
332 | 
333 | ## Task
334 | Generate a comprehensive test report that includes:
335 | 
336 | 1. **Executive Summary**
337 |    - Overall test status
338 |    - Key findings
339 |    - Critical issues
340 | 
341 | 2. **Test Coverage**
342 |    - What was tested
343 |    - Coverage of acceptance criteria
344 |    - Areas not covered (if any)
345 | 
346 | 3. **Detailed Results**
347 |    - Test case results
348 |    - Pass/fail breakdown
349 |    - Performance metrics
350 | 
351 | 4. **Issues Found**
352 |    - Bugs discovered
353 |    - Severity levels
354 |    - Reproduction steps
355 | 
356 | 5. **Recommendations**
357 |    - Next steps
358 |    - Areas needing attention
359 |    - Suggested improvements
360 | 
361 | Format the report in markdown with clear sections and actionable insights.`;
362 | }
363 | 
364 | /**
365 |  * Human input request prompt template
366 |  */
367 | export function getHumanInputPrompt(
368 |   question: string,
369 |   context: string,
370 |   options?: string[]
371 | ): string {
372 |   let prompt = `# Human Input Required
373 | 
374 | ## Question
375 | ${question}
376 | 
377 | ## Context
378 | ${context}`;
379 | 
380 |   if (options && options.length > 0) {
381 |     prompt += `\n\n## Options\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
382 |   }
383 | 
384 |   prompt += `\n\nPlease provide your input to help me proceed with the testing.`;
385 | 
386 |   return prompt;
387 | }
388 | 
389 | /**
390 |  * Test step refinement prompt
391 |  */
392 | export function getStepRefinementPrompt(
393 |   originalStep: string,
394 |   failureReason: string,
395 |   attemptNumber: number
396 | ): string {
397 |   return `# Test Step Refinement Request
398 | 
399 | ## Original Step
400 | ${originalStep}
401 | 
402 | ## Failure Reason
403 | ${failureReason}
404 | 
405 | ## Attempt Number
406 | ${attemptNumber}
407 | 
408 | ## Task
409 | Refine this test step to address the failure:
410 | 
411 | 1. Analyze why the original step failed
412 | 2. Identify what needs to change
413 | 3. Propose an improved version
414 | 4. Explain the improvements
415 | 
416 | Consider:
417 | - More specific selectors
418 | - Better wait conditions
419 | - Alternative approaches
420 | - Timing adjustments
421 | 
422 | Respond with a JSON object:
423 | {
424 |   "refinedStep": {
425 |     "action": "action type",
426 |     "target": "improved target",
427 |     "value": "value if needed",
428 |     "description": "what this does"
429 |   },
430 |   "changes": ["what was changed"],
431 |   "reasoning": "why these changes help",
432 |   "confidence": 0.8
433 | }`;
434 | }
435 | 
436 | /**
437 |  * Test prioritization prompt
438 |  */
439 | export function getTestPrioritizationPrompt(
440 |   testCases: string,
441 |   constraints: Record<string, unknown>
442 | ): string {
443 |   return `# Test Prioritization Request
444 | 
445 | ## Test Cases
446 | ${testCases}
447 | 
448 | ## Constraints
449 | ${JSON.stringify(constraints, null, 2)}
450 | 
451 | ## Task
452 | Prioritize these test cases based on:
453 | 
454 | 1. **Business Impact**: Critical user flows first
455 | 2. **Risk Level**: High-risk changes need more testing
456 | 3. **Dependencies**: Tests that unblock others
457 | 4. **Execution Time**: Balance thoroughness with efficiency
458 | 5. **Failure History**: Flaky areas need attention
459 | 
460 | Respond with a JSON object:
461 | {
462 |   "prioritizedTests": [
463 |     {
464 |       "testId": "test-id",
465 |       "priority": 1,
466 |       "reasoning": "why this priority",
467 |       "estimatedDuration": 60
468 |     }
469 |   ],
470 |   "executionStrategy": "parallel" | "sequential" | "hybrid",
471 |   "reasoning": "overall prioritization strategy"
472 | }`;
473 | }
474 | 
475 | /**
476 |  * Edge case identification prompt
477 |  */
478 | export function getEdgeCasePrompt(
479 |   functionality: string,
480 |   context: TestContext
481 | ): string {
482 |   return `# Edge Case Identification Request
483 | 
484 | ## Functionality
485 | ${functionality}
486 | 
487 | ## Context
488 | - Framework: ${context.buildInfo.framework}
489 | - Change Description: ${context.description}
490 | 
491 | ## Task
492 | Identify potential edge cases and boundary conditions for this functionality:
493 | 
494 | 1. **Input Validation**
495 |    - Empty inputs
496 |    - Invalid formats
497 |    - Extreme values
498 |    - Special characters
499 | 
500 | 2. **State Conditions**
501 |    - First-time use
502 |    - Logged out state
503 |    - Concurrent operations
504 |    - Network failures
505 | 
506 | 3. **Browser/Environment**
507 |    - Different screen sizes
508 |    - Slow connections
509 |    - Browser compatibility
510 |    - Accessibility
511 | 
512 | 4. **Data Scenarios**
513 |    - Empty datasets
514 |    - Large datasets
515 |    - Duplicate data
516 |    - Missing data
517 | 
518 | Respond with a JSON object:
519 | {
520 |   "edgeCases": [
521 |     {
522 |       "scenario": "description",
523 |       "category": "input" | "state" | "environment" | "data",
524 |       "priority": "high" | "medium" | "low",
525 |       "testApproach": "how to test this"
526 |     }
527 |   ],
528 |   "reasoning": "why these edge cases matter"
529 | }`;
530 | }
531 | 
532 | /**
533 |  * Parse JSON response from AI model
534 |  */
535 | export function parseJSONResponse<T>(response: string): T | null {
536 |   try {
537 |     // Try to find JSON in the response
538 |     const jsonMatch = response.match(/\{[\s\S]*\}/);
539 |     if (jsonMatch) {
540 |       return JSON.parse(jsonMatch[0]) as T;
541 |     }
542 |     return null;
543 |   } catch (error) {
544 |     logger.error('Failed to parse JSON response:', error);
545 |     return null;
546 |   }
547 | }
548 | 
549 | /**
550 |  * Extract code blocks from response
551 |  */
552 | export function extractCodeBlocks(response: string): Array<{ language: string; code: string }> {
553 |   const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
554 |   const blocks: Array<{ language: string; code: string }> = [];
555 |   
556 |   let match;
557 |   while ((match = codeBlockRegex.exec(response)) !== null) {
558 |     blocks.push({
559 |       language: match[1] || 'text',
560 |       code: match[2].trim()
561 |     });
562 |   }
563 |   
564 |   return blocks;
565 | }
566 | 
567 | // Made with Bob
</content>
</file>
<file><path>src/generators/qa-task-generator.ts</path>
<content lines="1-494">
  1 | import { 
  2 |   QATask, 
  3 |   QATaskPlan, 
  4 |   GeneratedHTTPTest, 
  5 |   GeneratedHTTPTestSuite,
  6 |   HTTPTestStep,
  7 |   AcceptanceCriterion,
  8 |   DiscoveredRoute,
  9 | } from '../types/index.js';
 10 | import { logger } from '../utils/logger.js';
 11 | 
 12 | /**
 13 |  * Generates deterministic QA task plans from acceptance criteria and AI suggestions
 14 |  */
 15 | export class QATaskGenerator {
 16 |   private routes: DiscoveredRoute[];
 17 |   
 18 |   constructor(_baseUrl: string, routes: DiscoveredRoute[]) {
 19 |     this.routes = routes;
 20 |   }
 21 | 
 22 |   /**
 23 |    * Generate QA task plan from acceptance criteria and optional AI suggestions
 24 |    */
 25 |   generateTaskPlan(
 26 |     acceptanceCriteria: AcceptanceCriterion[],
 27 |     aiSuggestions?: any[]
 28 |   ): QATaskPlan {
 29 |     logger.info('Generating QA task plan...');
 30 |     
 31 |     const tasks: QATask[] = [];
 32 |     let taskCounter = 1;
 33 |     
 34 |     for (const criterion of acceptanceCriteria) {
 35 |       // Try to use AI suggestion if available
 36 |       const aiTask = aiSuggestions?.find(
 37 |         (s: any) => s.acceptanceCriterionId === criterion.id || 
 38 |                     s.criterionId === criterion.id
 39 |       );
 40 |       
 41 |       if (aiTask && this.isValidAITask(aiTask)) {
 42 |         // Use AI suggestion with validation
 43 |         tasks.push(this.normalizeAITask(aiTask, criterion, taskCounter++));
 44 |       } else {
 45 |         // Generate deterministic task from criterion
 46 |         tasks.push(this.generateDeterministicTask(criterion, taskCounter++));
 47 |       }
 48 |     }
 49 |     
 50 |     const summary = this.calculateTaskSummary(tasks);
 51 |     
 52 |     return {
 53 |       projectName: 'TraceQA Test Project',
 54 |       timestamp: new Date().toISOString(),
 55 |       acceptanceCriteria,
 56 |       tasks,
 57 |       summary
 58 |     };
 59 |   }
 60 | 
 61 |   /**
 62 |    * Validate AI-generated task structure
 63 |    */
 64 |   private isValidAITask(task: any): boolean {
 65 |     return (
 66 |       task &&
 67 |       typeof task === 'object' &&
 68 |       typeof task.title === 'string' &&
 69 |       typeof task.expectedResult === 'string' &&
 70 |       Array.isArray(task.steps)
 71 |     );
 72 |   }
 73 | 
 74 |   /**
 75 |    * Normalize AI task to QATask schema
 76 |    */
 77 |   private normalizeAITask(
 78 |     aiTask: any,
 79 |     criterion: AcceptanceCriterion,
 80 |     taskNumber: number
 81 |   ): QATask {
 82 |     const taskId = `QA-${String(taskNumber).padStart(3, '0')}`;
 83 |     
 84 |     // Determine execution mode
 85 |     let executionMode: 'automated' | 'manual' | 'uncertain' = 'automated';
 86 |     let uncertainReason: string | undefined;
 87 |     
 88 |     if (aiTask.executionMode === 'manual' || aiTask.type === 'manual') {
 89 |       executionMode = 'manual';
 90 |     } else if (aiTask.executionMode === 'uncertain' || aiTask.type === 'uncertain') {
 91 |       executionMode = 'uncertain';
 92 |       uncertainReason = aiTask.uncertainReason || 'AI marked as uncertain';
 93 |     }
 94 |     
 95 |     return {
 96 |       taskId,
 97 |       acceptanceCriterionId: criterion.id,
 98 |       title: aiTask.title || criterion.description,
 99 |       type: this.normalizeTaskType(aiTask.type),
100 |       priority: this.normalizePriority(aiTask.priority),
101 |       preconditions: Array.isArray(aiTask.preconditions) ? aiTask.preconditions : [],
102 |       setupData: aiTask.setupData || {},
103 |       steps: Array.isArray(aiTask.steps) ? aiTask.steps : [],
104 |       expectedResult: aiTask.expectedResult || '',
105 |       executionMode,
106 |       reasoning: aiTask.reasoning || 'Generated from acceptance criterion',
107 |       uncertainReason
108 |     };
109 |   }
110 | 
111 |   /**
112 |    * Generate deterministic task when AI fails or is unavailable
113 |    */
114 |   private generateDeterministicTask(
115 |     criterion: AcceptanceCriterion,
116 |     taskNumber: number
117 |   ): QATask {
118 |     const taskId = `QA-${String(taskNumber).padStart(3, '0')}`;
119 |     
120 |     // Try to match criterion to routes
121 |     const matchedRoute = this.findMatchingRoute(criterion);
122 |     
123 |     if (matchedRoute) {
124 |       // Can generate automated API task
125 |       return {
126 |         taskId,
127 |         acceptanceCriterionId: criterion.id,
128 |         title: criterion.description,
129 |         type: 'api',
130 |         priority: 'high',
131 |         preconditions: [],
132 |         setupData: {},
133 |         steps: [{
134 |           description: `Test ${matchedRoute.method} ${matchedRoute.path}`,
135 |           action: `Send ${matchedRoute.method} request to ${matchedRoute.path}`,
136 |           expectedOutcome: 'Request succeeds'
137 |         }],
138 |         expectedResult: 'Request succeeds',
139 |         executionMode: 'automated',
140 |         reasoning: `Matched to discovered route: ${matchedRoute.method} ${matchedRoute.path}`
141 |       };
142 |     } else {
143 |       // Cannot safely automate - mark as uncertain
144 |       return {
145 |         taskId,
146 |         acceptanceCriterionId: criterion.id,
147 |         title: criterion.description,
148 |         type: 'uncertain',
149 |         priority: 'medium',
150 |         preconditions: [],
151 |         setupData: {},
152 |         steps: [{
153 |           description: criterion.description,
154 |           expectedOutcome: 'Criterion is met'
155 |         }],
156 |         expectedResult: 'Criterion is met',
157 |         executionMode: 'uncertain',
158 |         reasoning: 'No matching route found - requires manual verification',
159 |         uncertainReason: 'Could not map to discovered API routes'
160 |       };
161 |     }
162 |   }
163 | 
164 |   /**
165 |    * Find matching route for acceptance criterion
166 |    */
167 |   private findMatchingRoute(criterion: AcceptanceCriterion): DiscoveredRoute | null {
168 |     const criterionText = criterion.description.toLowerCase();
169 |     
170 |     for (const route of this.routes) {
171 |       // Simple keyword matching
172 |       if (criterionText.includes(route.path.toLowerCase()) ||
173 |           (route.description && criterionText.includes(route.description.toLowerCase()))) {
174 |         return route;
175 |       }
176 |     }
177 |     
178 |     return null;
179 |   }
180 | 
181 |   /**
182 |    * Normalize task type from AI output
183 |    */
184 |   private normalizeTaskType(type: any): 'api' | 'ui' | 'integration' | 'manual' | 'uncertain' {
185 |     if (typeof type === 'string') {
186 |       const normalized = type.toLowerCase();
187 |       if (['api', 'ui', 'integration', 'manual', 'uncertain'].includes(normalized)) {
188 |         return normalized as any;
189 |       }
190 |     }
191 |     return 'api'; // Default to API
192 |   }
193 | 
194 |   /**
195 |    * Normalize priority from AI output
196 |    */
197 |   private normalizePriority(priority: any): 'high' | 'medium' | 'low' {
198 |     if (typeof priority === 'string') {
199 |       const normalized = priority.toLowerCase();
200 |       if (['high', 'medium', 'low'].includes(normalized)) {
201 |         return normalized as any;
202 |       }
203 |     }
204 |     return 'medium'; // Default to medium
205 |   }
206 | 
207 |   /**
208 |    * Calculate task summary statistics
209 |    */
210 |   private calculateTaskSummary(tasks: QATask[]) {
211 |     return {
212 |       totalTasks: tasks.length,
213 |       automatedTasks: tasks.filter(t => t.executionMode === 'automated').length,
214 |       manualTasks: tasks.filter(t => t.executionMode === 'manual').length,
215 |       uncertainTasks: tasks.filter(t => t.executionMode === 'uncertain').length
216 |     };
217 |   }
218 | }
219 | 
220 | /**
221 |  * Generates executable HTTP tests from QA tasks
222 |  */
223 | export class HTTPTestGenerator {
224 |   private baseUrl: string;
225 |   private routes: DiscoveredRoute[];
226 |   
227 |   constructor(_baseUrl: string, routes: DiscoveredRoute[]) {
228 |     this.baseUrl = _baseUrl;
229 |     this.routes = routes;
230 |   }
231 | 
232 |   /**
233 |    * Generate HTTP test suite from QA task plan
234 |    */
235 |   generateTestSuite(taskPlan: QATaskPlan): GeneratedHTTPTestSuite {
236 |     logger.info('Generating HTTP test suite...');
237 |     
238 |     const tests: GeneratedHTTPTest[] = [];
239 |     let testCounter = 1;
240 |     
241 |     for (const task of taskPlan.tasks) {
242 |       if (task.type === 'api' && task.executionMode === 'automated') {
243 |         const test = this.generateHTTPTest(task, testCounter++);
244 |         if (test) {
245 |           tests.push(test);
246 |         }
247 |       } else if (task.executionMode === 'uncertain') {
248 |         // Create uncertain test placeholder
249 |         tests.push(this.createUncertainTest(task, testCounter++));
250 |       } else if (task.executionMode === 'manual') {
251 |         // Create manual test placeholder
252 |         tests.push(this.createManualTest(task, testCounter++));
253 |       }
254 |     }
255 |     
256 |     const summary = this.calculateTestSummary(tests);
257 |     
258 |     return {
259 |       projectName: taskPlan.projectName,
260 |       timestamp: new Date().toISOString(),
261 |       baseUrl: this.baseUrl,
262 |       tests,
263 |       summary
264 |     };
265 |   }
266 | 
267 |   /**
268 |    * Generate HTTP test from QA task
269 |    */
270 |   private generateHTTPTest(
271 |     task: QATask,
272 |     testNumber: number
273 |   ): GeneratedHTTPTest | null {
274 |     const testId = `TC-${String(testNumber).padStart(3, '0')}`;
275 |     
276 |     // Find matching route
277 |     const route = this.findRouteForTask(task);
278 |     
279 |     if (!route) {
280 |       logger.warn(`No route found for task ${task.taskId}`);
281 |       return this.createUncertainTest(task, testNumber);
282 |     }
283 |     
284 |     // Generate test steps
285 |     const steps = this.generateTestSteps(task, route, testId);
286 |     
287 |     if (steps.length === 0) {
288 |       return this.createUncertainTest(task, testNumber);
289 |     }
290 |     
291 |     return {
292 |       id: testId,
293 |       acceptanceCriterionId: task.acceptanceCriterionId,
294 |       qaTaskId: task.taskId,
295 |       title: task.title,
296 |       type: 'api',
297 |       status: 'ready',
298 |       uncertainReason: null,
299 |       steps
300 |     };
301 |   }
302 | 
303 |   /**
304 |    * Generate test steps for HTTP test
305 |    */
306 |   private generateTestSteps(
307 |     task: QATask,
308 |     route: DiscoveredRoute,
309 |     testId: string
310 |   ): HTTPTestStep[] {
311 |     const steps: HTTPTestStep[] = [];
312 |     const stepId = `${testId}-S1`;
313 |     
314 |     // Build URL
315 |     const url = this.buildURL(route.path);
316 |     
317 |     // Determine expected status
318 |     const expectedStatus = this.inferExpectedStatus(route.method, task);
319 |     const acceptableStatuses = this.getAcceptableStatuses(route.method, expectedStatus);
320 |     
321 |     // Build request body if needed
322 |     const body = this.buildRequestBody(route.method, task);
323 |     
324 |     steps.push({
325 |       stepId,
326 |       description: task.steps[0]?.description || `Test ${route.method} ${route.path}`,
327 |       method: route.method as HTTPTestStep['method'],
328 |       url,
329 |       headers: { 'Content-Type': 'application/json' },
330 |       body,
331 |       expectedStatus,
332 |       acceptableStatuses
333 |     });
334 |     
335 |     return steps;
336 |   }
337 | 
338 |   /**
339 |    * Find route for QA task
340 |    */
341 |   private findRouteForTask(task: QATask): DiscoveredRoute | null {
342 |     // Try to match based on task title and steps
343 |     const taskText = `${task.title} ${task.steps.map(s => s.description).join(' ')}`.toLowerCase();
344 |     
345 |     for (const route of this.routes) {
346 |       if (taskText.includes(route.path.toLowerCase())) {
347 |         return route;
348 |       }
349 |     }
350 |     
351 |     return null;
352 |   }
353 | 
354 |   /**
355 |    * Build full URL from path
356 |    */
357 |   private buildURL(path: string): string {
358 |     if (path.startsWith('http://') || path.startsWith('https://')) {
359 |       return path;
360 |     }
361 |     
362 |     const cleanPath = path.startsWith('/') ? path : `/${path}`;
363 |     return `${this.baseUrl}${cleanPath}`;
364 |   }
365 | 
366 |   /**
367 |    * Infer expected status from method, task, and route code hints
368 |    * EVIDENCE-BASED: look for status code responses in source code
369 |    */
370 |   private inferExpectedStatus(method: string, task: QATask): number {
371 |     const expectedResult = task.expectedResult.toLowerCase();
372 |     
373 |     // Try to find a matching route with validation hints
374 |     const routes = this.routes.filter(r => r.method?.toUpperCase() === method.toUpperCase());
375 |     
376 |     // Look for explicit error status codes in validation hints
377 |     for (const route of routes) {
378 |       const hints = (route as any)?.validationSnippets || [];
379 |       const snippet = (route as any)?.sourceSnippet || '';
380 |       const allCode = (hints.join(' ') + snippet).toLowerCase();
381 |       
382 |       // Look for explicit status codes in source code
383 |       const statusCodeMatch = allCode.match(/(?:status|res.*)\((\d{3})\)|res\.status\((\d{3})\)/);
384 |       if (statusCodeMatch) {
385 |         const code = parseInt(statusCodeMatch[1] || statusCodeMatch[2]);
386 |         if (expectedResult.includes('error') || expectedResult.includes('fail') || expectedResult.includes('invalid')) {
387 |           if (code >= 400) return code;
388 |         }
389 |       }
390 |       
391 |       // If no explicit code found, use HTTP semantic conventions
392 |       if (expectedResult.includes('not found')) return 404;
393 |       if (expectedResult.includes('forbidden') || expectedResult.includes('denied')) return 403;
394 |     }
395 |     
396 |     // Default behavior based on method
397 |     if (expectedResult.includes('error') || expectedResult.includes('fail') || expectedResult.includes('invalid')) {
398 |       return 400; // Generic client error
399 |     }
400 |     
401 |     // Success scenarios
402 |     switch (method.toUpperCase()) {
403 |       case 'POST': return 201;
404 |       case 'PUT': return 200;
405 |       case 'PATCH': return 200;
406 |       case 'DELETE': return 204;
407 |       case 'GET': return 200;
408 |       default: return 200;
409 |     }
410 |   }
411 | 
412 |   /**
413 |    * Get acceptable status codes
414 |    */
415 |   private getAcceptableStatuses(method: string, expectedStatus: number): number[] {
416 |     switch (method.toUpperCase()) {
417 |       case 'POST':
418 |         return expectedStatus === 201 ? [200, 201] : [expectedStatus];
419 |       case 'PUT':
420 |       case 'PATCH':
421 |         return [200, 204];
422 |       case 'DELETE':
423 |         return [200, 204];
424 |       default:
425 |         return [expectedStatus];
426 |     }
427 |   }
428 | 
429 |   /**
430 |    * Build request body
431 |    */
432 |   private buildRequestBody(method: string, task: QATask): any {
433 |     if (['GET', 'DELETE', 'HEAD'].includes(method.toUpperCase())) {
434 |       return undefined;
435 |     }
436 |     
437 |     // Use setup data if available
438 |     if (task.setupData && Object.keys(task.setupData).length > 0) {
439 |       return task.setupData;
440 |     }
441 |     
442 |     return {};
443 |   }
444 | 
445 |   /**
446 |    * Create uncertain test placeholder
447 |    */
448 |   private createUncertainTest(task: QATask, testNumber: number): GeneratedHTTPTest {
449 |     const testId = `TC-${String(testNumber).padStart(3, '0')}`;
450 |     
451 |     return {
452 |       id: testId,
453 |       acceptanceCriterionId: task.acceptanceCriterionId,
454 |       qaTaskId: task.taskId,
455 |       title: task.title,
456 |       type: 'api',
457 |       status: 'uncertain',
458 |       uncertainReason: task.uncertainReason || 'Could not generate executable HTTP test',
459 |       steps: []
460 |     };
461 |   }
462 | 
463 |   /**
464 |    * Create manual test placeholder
465 |    */
466 |   private createManualTest(task: QATask, testNumber: number): GeneratedHTTPTest {
467 |     const testId = `TC-${String(testNumber).padStart(3, '0')}`;
468 |     
469 |     return {
470 |       id: testId,
471 |       acceptanceCriterionId: task.acceptanceCriterionId,
472 |       qaTaskId: task.taskId,
473 |       title: task.title,
474 |       type: 'api',
475 |       status: 'manual',
476 |       uncertainReason: 'Requires manual testing',
477 |       steps: []
478 |     };
479 |   }
480 | 
481 |   /**
482 |    * Calculate test summary statistics
483 |    */
484 |   private calculateTestSummary(tests: GeneratedHTTPTest[]) {
485 |     return {
486 |       totalTests: tests.length,
487 |       readyTests: tests.filter(t => t.status === 'ready').length,
488 |       uncertainTests: tests.filter(t => t.status === 'uncertain').length,
489 |       manualTests: tests.filter(t => t.status === 'manual').length
490 |     };
491 |   }
492 | }
493 | 
494 | // Made with Bob
</content>
</file>
<file><path>src/reporting/report-generator.ts</path>
<content lines="1-872">
  1 | /**
  2 |  * TraceQA Report Generator
  3 |  * Generates comprehensive test reports with proper result classification
  4 |  * and trace matrix mapping AC->Task->Test->Result
  5 |  */
  6 | 
  7 | import * as fs from 'fs/promises';
  8 | import * as path from 'path';
  9 | import {
 10 |   QATaskPlan,
 11 |   GeneratedHTTPTestSuite,
 12 |   HTTPTestResult,
 13 |   AcceptanceCriterion,
 14 | } from '../types/index.js';
 15 | import { logger, formatDuration } from '../utils/logger.js';
 16 | 
 17 | /**
 18 |  * Report summary statistics with clear, non-overlapping counts
 19 |  */
 20 | export interface ReportSummary {
 21 |   timestamp: string;
 22 |   projectName: string;
 23 |   acceptanceCriteria: {
 24 |     total: number;
 25 |     covered: number;
 26 |     uncovered: number;
 27 |   };
 28 |   qaTasks: {
 29 |     total: number;
 30 |     automated: number;
 31 |     manual: number;
 32 |     uncertain: number;
 33 |   };
 34 |   generatedTests: {
 35 |     total: number;
 36 |     ready: number;
 37 |     uncertain: number;
 38 |     manual: number;
 39 |   };
 40 |   executionResults: {
 41 |     /** Total number of tests defined */
 42 |     total: number;
 43 |     /** Tests that actually ran (excludes skipped and manual) */
 44 |     executed: number;
 45 |     /** Tests that were not executed (skipped + manual) */
 46 |     notExecuted: number;
 47 |     
 48 |     /** Execution outcomes (subset of executed) */
 49 |     passed: number;
 50 |     /** All failures combined (subset of executed) */
 51 |     failed: number;
 52 |     
 53 |     /** Failure breakdown (subsets of failed) */
 54 |     applicationFailures: number;
 55 |     generationIssues: number;
 56 |     infrastructureFailures: number;
 57 |     uncertain: number;
 58 |     
 59 |     /** Not executed breakdown (subsets of notExecuted) */
 60 |     skipped: number;
 61 |     manual: number;
 62 |     /** Run-level infrastructure failure (pre-run) */
 63 |     runLevelInfrastructureFailure?: boolean;
 64 |   };
 65 |   mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
 66 |   riskLevel: 'low' | 'medium' | 'high';
 67 | }
 68 | 
 69 | /**
 70 |  * Trace matrix entry with complete AC->Task->Test->Result mapping
 71 |  */
 72 | export interface TraceMatrixEntry {
 73 |   acceptanceCriterionId: string;
 74 |   acceptanceCriterionText: string;
 75 |   qaTasks: {
 76 |     taskId: string;
 77 |     title: string;
 78 |     type: string;
 79 |     executionMode: string;
 80 |   }[];
 81 |   generatedTests: {
 82 |     testId: string;
 83 |     title: string;
 84 |     status: string;
 85 |     uncertainReason?: string;
 86 |   }[];
 87 |   executionResults: {
 88 |     testId: string;
 89 |     status: string;
 90 |     classification: string;
 91 |     classificationReason: string;
 92 |     executor: string;
 93 |     duration: number;
 94 |   }[];
 95 |   coverage: {
 96 |     tasksGenerated: number;
 97 |     testsGenerated: number;
 98 |     testsExecuted: number;
 99 |     testsPassed: number;
100 |     testsFailed: number;
101 |   };
102 | }
103 | 
104 | /**
105 |  * Complete report data structure
106 |  */
107 | export interface ReportData {
108 |   summary: ReportSummary;
109 |   traceMatrix: TraceMatrixEntry[];
110 |   testResults: HTTPTestResult[];
111 |   mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
112 |   riskLevel: 'low' | 'medium' | 'high';
113 |   risks: string[];
114 |   recommendations: string[];
115 | }
116 | 
117 | /**
118 |  * Report Generator
119 |  * Generates comprehensive reports with proper classification and traceability
120 |  */
121 | export class ReportGenerator {
122 |   private static readonly VERSION = '2.0.0';
123 |   private static readonly DEFAULT_OUTPUT_DIR = 'traceqa-proof';
124 | 
125 |   /**
126 |    * Generate complete report with all artifacts
127 |    * 
128 |    * @param acceptanceCriteria - Parsed acceptance criteria
129 |    * @param taskPlan - Generated QA task plan
130 |    * @param testSuite - Generated HTTP test suite
131 |    * @param testResults - Execution results
132 |    * @param config - Configuration options
133 |    * @returns Paths to generated report files
134 |    */
135 |   async generateReport(
136 |     acceptanceCriteria: AcceptanceCriterion[],
137 |     taskPlan: QATaskPlan,
138 |     testSuite: GeneratedHTTPTestSuite,
139 |     testResults: HTTPTestResult[],
140 |     config?: { outputDir?: string; projectName?: string }
141 |   ): Promise<{
142 |     reportPath: string;
143 |     traceMatrixPath: string;
144 |   }> {
145 |     const reportDir = config?.outputDir || ReportGenerator.DEFAULT_OUTPUT_DIR;
146 |     const projectName = config?.projectName || taskPlan.projectName || testSuite.projectName || 'Unknown Project';
147 | 
148 |     try {
149 |       // Create output directory
150 |       await this.ensureDirectory(reportDir);
151 | 
152 |       // Generate trace matrix
153 |       const traceMatrix = this.generateTraceMatrix(
154 |         acceptanceCriteria,
155 |         taskPlan,
156 |         testSuite,
157 |         testResults
158 |       );
159 | 
160 |       // Generate summary
161 |       const summary = this.generateSummary(
162 |         projectName,
163 |         acceptanceCriteria,
164 |         taskPlan,
165 |         testSuite,
166 |         testResults,
167 |         traceMatrix
168 |       );
169 | 
170 |       // Calculate merge readiness and risk
171 |       const { mergeReadiness, riskLevel, risks, recommendations } = this.assessMergeReadiness(
172 |         summary,
173 |         traceMatrix,
174 |         testResults
175 |       );
176 | 
177 |       // Create complete report data
178 |       const reportData: ReportData = {
179 |         summary,
180 |         traceMatrix,
181 |         testResults,
182 |         mergeReadiness,
183 |         riskLevel,
184 |         risks,
185 |         recommendations
186 |       };
187 | 
188 |       // Write all report files
189 |       const reportPath = path.join(reportDir, 'report.json');
190 |       const traceMatrixPath = path.join(reportDir, 'trace-matrix.json');
191 |       const markdownPath = path.join(reportDir, 'report.md');
192 | 
193 |       await Promise.all([
194 |         this.writeJsonReport(reportPath, reportData),
195 |         this.writeTraceMatrix(traceMatrixPath, traceMatrix),
196 |         this.writeMarkdownReport(markdownPath, reportData)
197 |       ]);
198 | 
199 |       logger.success(`Reports generated successfully in ${reportDir}/`);
200 |       logger.info(`  - report.json`);
201 |       logger.info(`  - trace-matrix.json`);
202 |       logger.info(`  - report.md`);
203 | 
204 |       // Display merge readiness
205 |       this.displayMergeReadiness(mergeReadiness, riskLevel, summary);
206 | 
207 |       return { reportPath, traceMatrixPath };
208 |     } catch (error) {
209 |       logger.error('Failed to generate reports:', error);
210 |       throw error;
211 |     }
212 |   }
213 | 
214 |   /**
215 |    * Generate comprehensive trace matrix with AC->Task->Test->Result mapping
216 |    * 
217 |    * @param acceptanceCriteria - Acceptance criteria
218 |    * @param taskPlan - QA task plan
219 |    * @param testSuite - Generated test suite
220 |    * @param testResults - Execution results
221 |    * @returns Trace matrix entries
222 |    */
223 |   generateTraceMatrix(
224 |     acceptanceCriteria: AcceptanceCriterion[],
225 |     taskPlan: QATaskPlan,
226 |     testSuite: GeneratedHTTPTestSuite,
227 |     testResults: HTTPTestResult[]
228 |   ): TraceMatrixEntry[] {
229 |     const entries: TraceMatrixEntry[] = [];
230 | 
231 |     for (const criterion of acceptanceCriteria) {
232 |       // Find QA tasks for this criterion
233 |       const relatedTasks = taskPlan.tasks.filter(
234 |         task => task.acceptanceCriterionId === criterion.id
235 |       );
236 | 
237 |       // Find generated tests for this criterion
238 |       const relatedTests = testSuite.tests.filter(
239 |         test => test.acceptanceCriterionId === criterion.id
240 |       );
241 | 
242 |       // Find execution results for this criterion
243 |       const relatedResults = testResults.filter(
244 |         result => result.acceptanceCriterionId === criterion.id
245 |       );
246 | 
247 |       // Calculate coverage metrics only from ready tests that actually ran.
248 |       const readyTestIds = new Set(
249 |         relatedTests.filter(test => test.status === 'ready').map(test => test.id)
250 |       );
251 |       const executedResults = relatedResults.filter(
252 |         result => readyTestIds.has(result.testId) &&
253 |                   result.classification.classification !== 'uncertain' &&
254 |                   result.classification.classification !== 'manual' &&
255 |                   result.classification.classification !== 'skipped'
256 |       );
257 |       const testsExecuted = executedResults.length;
258 |       const testsPassed = executedResults.filter(
259 |         r => r.classification.classification === 'passed'
260 |       ).length;
261 |       const testsFailed = executedResults.filter(
262 |         r => r.classification.classification !== 'passed'
263 |       ).length;
264 | 
265 |       entries.push({
266 |         acceptanceCriterionId: criterion.id,
267 |         acceptanceCriterionText: criterion.description,
268 |         qaTasks: relatedTasks.map(task => ({
269 |           taskId: task.taskId,
270 |           title: task.title,
271 |           type: task.type,
272 |           executionMode: task.executionMode
273 |         })),
274 |         generatedTests: relatedTests.map(test => ({
275 |           testId: test.id,
276 |           title: test.title,
277 |           status: test.status,
278 |           uncertainReason: test.uncertainReason || undefined
279 |         })),
280 |         executionResults: relatedResults.map(result => ({
281 |           testId: result.testId,
282 |           status: result.status,
283 |           classification: result.classification.classification,
284 |           classificationReason: result.classification.reason,
285 |           executor: result.executor,
286 |           duration: result.duration
287 |         })),
288 |         coverage: {
289 |           tasksGenerated: relatedTasks.length,
290 |           testsGenerated: relatedTests.length,
291 |           testsExecuted,
292 |           testsPassed,
293 |           testsFailed
294 |         }
295 |       });
296 |     }
297 | 
298 |     return entries;
299 |   }
300 | 
301 |   /**
302 |    * Generate comprehensive summary statistics
303 |    * 
304 |    * @param projectName - Project name
305 |    * @param acceptanceCriteria - Acceptance criteria
306 |    * @param taskPlan - QA task plan
307 |    * @param testSuite - Generated test suite
308 |    * @param testResults - Execution results
309 |    * @param traceMatrix - Trace matrix
310 |    * @returns Report summary
311 |    */
312 |   private generateSummary(
313 |     projectName: string,
314 |     acceptanceCriteria: AcceptanceCriterion[],
315 |     taskPlan: QATaskPlan,
316 |     testSuite: GeneratedHTTPTestSuite,
317 |     testResults: HTTPTestResult[],
318 |     traceMatrix: TraceMatrixEntry[]
319 |   ): ReportSummary {
320 |     // Count covered criteria (those with at least one test)
321 |     const coveredCriteria = traceMatrix.filter(
322 |       entry => entry.generatedTests.length > 0
323 |     ).length;
324 | 
325 |     // Execution results statistics using classification as primary metric
326 |     // EXECUTED = tests that actually ran (excludes skipped and manual)
327 |     // NOT EXECUTED = skipped + manual (require human intervention or were not run)
328 |     
329 |     // Use generated tests as the base for totals
330 |     const generatedTotal = testSuite.summary.totalGenerated;
331 | 
332 |     // Detect run-level infrastructure failure (single result added by executor)
333 |     const runLevelFailure = testResults.find(r => r.testId && r.testId.startsWith('run-infrastructure-failure'));
334 | 
335 |     // Count classifications only for generated tests (ignore run-level artifacts)
336 |     const generatedResults = testResults.filter(r => testSuite.tests.some(t => t.id === r.testId));
337 | 
338 |     const passed = generatedResults.filter(r => r.classification.classification === 'passed').length;
339 |     const applicationFailures = generatedResults.filter(r => r.classification.classification === 'application_failure').length;
340 |     const generationIssues = generatedResults.filter(r => r.classification.classification === 'traceqa_generation_issue').length;
341 |     const infrastructureFailures = generatedResults.filter(r => r.classification.classification === 'infrastructure_failure').length;
342 |     const uncertain = generatedResults.filter(r => r.classification.classification === 'uncertain').length;
343 |     const skipped = generatedResults.filter(r => r.classification.classification === 'skipped').length;
344 |     const manual = generatedResults.filter(r => r.classification.classification === 'manual').length;
345 | 
346 |     // Executed = number of generated ready tests that actually ran (exclude uncertain/manual)
347 |     const executed = generatedResults.filter(r => {
348 |       const corresponding = testSuite.tests.find(t => t.id === r.testId);
349 |       return corresponding && corresponding.status === 'ready' &&
350 |              r.classification.classification !== 'uncertain' &&
351 |              r.classification.classification !== 'manual' &&
352 |              r.classification.classification !== 'skipped';
353 |     }).length;
354 | 
355 |     const notExecuted = generatedTotal - executed;
356 |     const failed = applicationFailures + generationIssues + infrastructureFailures;
357 |     
358 |     // Validation: ensure counts add up correctly
359 |     const countCheck = executed + notExecuted;
360 |     if (countCheck !== generatedTotal) {
361 |       logger.warn(`Count validation failed: executed(${executed}) + notExecuted(${notExecuted}) = ${countCheck} != generatedTotal(${generatedTotal})`);
362 |     }
363 | 
364 |     const failedCheck = applicationFailures + generationIssues + infrastructureFailures;
365 |     if (failedCheck !== failed) {
366 |       logger.warn(`Failed count validation: sum of failure types(${failedCheck}) != failed(${failed})`);
367 |     }
368 | 
369 |     // Determine merge readiness based on classification
370 |     let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
371 |     if (applicationFailures > 0) {
372 |       mergeReadiness = 'not_ready';
373 |     } else if (generationIssues > 0 || infrastructureFailures > 0 || uncertain > 2) {
374 |       mergeReadiness = 'uncertain';
375 |     }
376 | 
377 |     // Determine risk level
378 |     let riskLevel: 'low' | 'medium' | 'high' = 'low';
379 |     if (applicationFailures > 2 || failed > 3) {
380 |       riskLevel = 'high';
381 |     } else if (applicationFailures > 0 || generationIssues > 0 || infrastructureFailures > 0 || uncertain > 2) {
382 |       riskLevel = 'medium';
383 |     }
384 | 
385 |     return {
386 |       timestamp: new Date().toISOString(),
387 |       projectName,
388 |       acceptanceCriteria: {
389 |         total: acceptanceCriteria.length,
390 |         covered: coveredCriteria,
391 |         uncovered: acceptanceCriteria.length - coveredCriteria
392 |       },
393 |       qaTasks: {
394 |         total: taskPlan.summary.totalTasks,
395 |         automated: taskPlan.summary.automatedTasks,
396 |         manual: taskPlan.summary.manualTasks,
397 |         uncertain: taskPlan.summary.uncertainTasks
398 |       },
399 |       generatedTests: {
400 |         total: testSuite.summary.totalGenerated,
401 |         ready: testSuite.summary.readyTests,
402 |         uncertain: testSuite.summary.uncertainTests,
403 |         manual: testSuite.summary.manualTests
404 |       },
405 |       executionResults: {
406 |         total: generatedTotal,
407 |         executed,
408 |         notExecuted,
409 |         passed,
410 |         failed,
411 |         applicationFailures,
412 |         generationIssues,
413 |         infrastructureFailures,
414 |         uncertain,
415 |         skipped,
416 |         manual,
417 |         runLevelInfrastructureFailure: !!runLevelFailure
418 |       },
419 |       mergeReadiness,
420 |       riskLevel
421 |     };
422 |   }
423 | 
424 |   /**
425 |    * Assess merge readiness and risk level
426 |    * 
427 |    * @param summary - Report summary
428 |    * @param traceMatrix - Trace matrix
429 |    * @param testResults - Test results
430 |    * @returns Merge readiness assessment
431 |    */
432 |   private assessMergeReadiness(
433 |     summary: ReportSummary,
434 |     _traceMatrix: TraceMatrixEntry[],
435 |     _testResults: HTTPTestResult[]
436 |   ): {
437 |     mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
438 |     riskLevel: 'low' | 'medium' | 'high';
439 |     risks: string[];
440 |     recommendations: string[];
441 |   } {
442 |     const risks: string[] = [];
443 |     const recommendations: string[] = [];
444 | 
445 |     // Check for application failures
446 |     if (summary.executionResults.applicationFailures > 0) {
447 |       risks.push(`${summary.executionResults.applicationFailures} application failure(s) detected`);
448 |       recommendations.push('Fix application failures before merging');
449 |     }
450 | 
451 |     // Check for test generation issues
452 |     if (summary.executionResults.generationIssues > 0) {
453 |       risks.push(`${summary.executionResults.generationIssues} test generation issue(s)`);
454 |       recommendations.push('Review and fix test generation issues');
455 |     }
456 | 
457 |     // Check for infrastructure failures
458 |     if (summary.executionResults.infrastructureFailures > 0) {
459 |       risks.push(`${summary.executionResults.infrastructureFailures} infrastructure failure(s)`);
460 |       recommendations.push('Check infrastructure and retry failed tests');
461 |     }
462 | 
463 |     // Check for uncertain tests
464 |     if (summary.executionResults.uncertain > 2) {
465 |       risks.push(`${summary.executionResults.uncertain} uncertain test(s)`);
466 |       recommendations.push('Investigate uncertain tests or run manually');
467 |     }
468 | 
469 |     // Check coverage
470 |     const coveragePercent = (summary.acceptanceCriteria.covered / summary.acceptanceCriteria.total) * 100;
471 |     if (coveragePercent < 80) {
472 |       risks.push(`Low coverage: ${coveragePercent.toFixed(1)}%`);
473 |       recommendations.push('Improve test coverage for uncovered acceptance criteria');
474 |     }
475 | 
476 |     // Check execution rate
477 |     const executionRate = (summary.executionResults.executed / summary.executionResults.total) * 100;
478 |     if (executionRate < 80 && summary.executionResults.total > 0) {
479 |       risks.push(`Low execution rate: ${executionRate.toFixed(1)}%`);
480 |       recommendations.push('Execute remaining tests');
481 |     }
482 | 
483 |     // Determine final merge readiness
484 |     let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
485 |     if (summary.executionResults.applicationFailures > 0) {
486 |       mergeReadiness = 'not_ready';
487 |     } else if (
488 |       summary.executionResults.generationIssues > 0 ||
489 |       summary.executionResults.infrastructureFailures > 0 ||
490 |       summary.executionResults.uncertain > 2 ||
491 |       executionRate < 50
492 |     ) {
493 |       mergeReadiness = 'uncertain';
494 |     }
495 | 
496 |     // Determine risk level
497 |     let riskLevel: 'low' | 'medium' | 'high' = 'low';
498 |     if (summary.executionResults.applicationFailures > 2 || coveragePercent < 50) {
499 |       riskLevel = 'high';
500 |     } else if (
501 |       summary.executionResults.applicationFailures > 0 ||
502 |       summary.executionResults.generationIssues > 2 ||
503 |       summary.executionResults.infrastructureFailures > 0 ||
504 |       coveragePercent < 80
505 |     ) {
506 |       riskLevel = 'medium';
507 |     }
508 | 
509 |     // Add positive recommendations if ready
510 |     if (mergeReadiness === 'ready') {
511 |       recommendations.push('All tests passed - safe to merge');
512 |     }
513 | 
514 |     return { mergeReadiness, riskLevel, risks, recommendations };
515 |   }
516 | 
517 |   /**
518 |    * Write JSON report
519 |    */
520 |   private async writeJsonReport(filePath: string, data: ReportData): Promise<void> {
521 |     await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
522 |   }
523 | 
524 |   /**
525 |    * Write trace matrix JSON
526 |    */
527 |   private async writeTraceMatrix(filePath: string, matrix: TraceMatrixEntry[]): Promise<void> {
528 |     await fs.writeFile(filePath, JSON.stringify(matrix, null, 2), 'utf-8');
529 |   }
530 | 
531 |   /**
532 |    * Write markdown report
533 |    */
534 |   private async writeMarkdownReport(filePath: string, data: ReportData): Promise<void> {
535 |     const md = this.generateMarkdown(data);
536 |     await fs.writeFile(filePath, md, 'utf-8');
537 |   }
538 | 
539 |   /**
540 |    * Generate markdown report content
541 |    */
542 |   private generateMarkdown(data: ReportData): string {
543 |     const { summary, traceMatrix, testResults, mergeReadiness, riskLevel, risks, recommendations } = data;
544 | 
545 |     let md = `# TraceQA Test Report\n\n`;
546 |     md += `**Project:** ${summary.projectName}\n`;
547 |     md += `**Generated:** ${summary.timestamp}\n`;
548 |     md += `**Executor:** HTTP API executor\n`;
549 |     md += `**TraceQA Version:** ${ReportGenerator.VERSION}\n\n`;
550 | 
551 |     // Summary Section
552 |     md += `## Summary\n\n`;
553 |     md += `- **Acceptance Criteria:** ${summary.acceptanceCriteria.total} total, ${summary.acceptanceCriteria.covered} covered\n`;
554 |     md += `- **QA Tasks:** ${summary.qaTasks.total} generated (${summary.qaTasks.automated} automated, ${summary.qaTasks.manual} manual, ${summary.qaTasks.uncertain} uncertain)\n`;
555 |     md += `- **Generated Tests:** ${summary.generatedTests.total} generated (${summary.generatedTests.ready} ready, ${summary.generatedTests.uncertain} uncertain, ${summary.generatedTests.manual} manual)\n`;
556 |     md += `- **Execution Results:** ${summary.executionResults.executed}/${summary.executionResults.total} executed, ${summary.executionResults.passed} passed, ${summary.executionResults.failed} failed\n\n`;
557 | 
558 |     // Execution Results with Clear Breakdown
559 |     md += `## Execution Results\n\n`;
560 |     md += `**Total Tests:** ${summary.executionResults.total}\n`;
561 |     const totalTestsForPct = summary.executionResults.total || 0;
562 |     const executedPct = totalTestsForPct > 0 ? ((summary.executionResults.executed / totalTestsForPct) * 100).toFixed(1) : '0.0';
563 |     const notExecutedPct = totalTestsForPct > 0 ? ((summary.executionResults.notExecuted / totalTestsForPct) * 100).toFixed(1) : '0.0';
564 | 
565 |     md += `**Executed:** ${summary.executionResults.executed} (${executedPct}%)\n`;
566 |     md += `**Not Executed:** ${summary.executionResults.notExecuted} (${notExecutedPct}%)\n\n`;
567 |     // Run-level infrastructure failure note
568 |     const runFailureResult = testResults.find(r => r.testId === 'run-infrastructure-failure');
569 |     if (runFailureResult) {
570 |       md += `**Run-level Infrastructure Failure:** ${runFailureResult.classification.reason}\n`;
571 |       if (runFailureResult.evidence && runFailureResult.evidence.length > 0) {
572 |         md += `- Details:\n`;
573 |         runFailureResult.evidence.forEach(ev => {
574 |           md += `  - ${ev}\n`;
575 |         });
576 |         md += `\n`;
577 |       }
578 |     }
579 |     
580 |     md += `### Execution Outcomes\n\n`;
581 |     md += `- ✓ **Passed:** ${summary.executionResults.passed}\n`;
582 |     md += `- ✗ **Failed:** ${summary.executionResults.failed}\n\n`;
583 |     
584 |     md += `### Failure Breakdown\n\n`;
585 |     md += `- 🐛 **Application Failures:** ${summary.executionResults.applicationFailures} (real bugs)\n`;
586 |     md += `- ⚠️ **Test Generation Issues:** ${summary.executionResults.generationIssues} (TraceQA issues)\n`;
587 |     md += `- 🔌 **Infrastructure Failures:** ${summary.executionResults.infrastructureFailures} (network/env issues)\n`;
588 |     md += `- ❓ **Uncertain:** ${summary.executionResults.uncertain} (needs review)\n\n`;
589 |     
590 |     md += `### Not Executed Breakdown\n\n`;
591 |     md += `- ⊘ **Skipped:** ${summary.executionResults.skipped}\n`;
592 |     md += `- 👤 **Manual:** ${summary.executionResults.manual}\n\n`;
593 | 
594 |     // Merge Readiness
595 |     const readinessEmoji = {
596 |       ready: '✅',
597 |       not_ready: '❌',
598 |       uncertain: '⚠️'
599 |     }[mergeReadiness];
600 | 
601 |     const readinessText = {
602 |       ready: 'READY TO MERGE',
603 |       not_ready: 'NOT READY TO MERGE',
604 |       uncertain: 'UNCERTAIN - REVIEW NEEDED'
605 |     }[mergeReadiness];
606 | 
607 |     md += `## Merge Readiness\n\n`;
608 |     md += `${readinessEmoji} **${readinessText}**\n\n`;
609 | 
610 |     if (recommendations.length > 0) {
611 |       md += `**Recommendations:**\n`;
612 |       recommendations.forEach(rec => {
613 |         md += `- ${rec}\n`;
614 |       });
615 |       md += `\n`;
616 |     }
617 | 
618 |     // Risk Summary
619 |     const riskEmoji = {
620 |       low: '🟢',
621 |       medium: '🟡',
622 |       high: '🔴'
623 |     }[riskLevel];
624 | 
625 |     md += `## Risk Summary\n\n`;
626 |     md += `**Risk Level:** ${riskEmoji} ${riskLevel.toUpperCase()}\n\n`;
627 | 
628 |     if (risks.length > 0) {
629 |       md += `**Identified Risks:**\n`;
630 |       risks.forEach(risk => {
631 |         md += `- ⚠️ ${risk}\n`;
632 |       });
633 |       md += `\n`;
634 |     } else {
635 |       md += `No significant risks identified.\n\n`;
636 |     }
637 | 
638 |     // Trace Matrix
639 |     md += `## Trace Matrix\n\n`;
640 | 
641 |     for (const entry of traceMatrix) {
642 |       md += `### ${entry.acceptanceCriterionId}: ${entry.acceptanceCriterionText}\n\n`;
643 | 
644 |       // QA Tasks
645 |       if (entry.qaTasks.length > 0) {
646 |         md += `**QA Tasks:**\n`;
647 |         entry.qaTasks.forEach(task => {
648 |           md += `- ${task.taskId}: ${task.title} (${task.type}, ${task.executionMode})\n`;
649 |         });
650 |         md += `\n`;
651 |       }
652 | 
653 |       // Generated Tests
654 |       if (entry.generatedTests.length > 0) {
655 |         md += `**Generated Tests:**\n`;
656 |         entry.generatedTests.forEach(test => {
657 |           const statusIcon = test.status === 'ready' ? '✓' : test.status === 'uncertain' ? '?' : '👤';
658 |           md += `- ${statusIcon} ${test.testId}: ${test.title} (${test.status})`;
659 |           if (test.uncertainReason) {
660 |             md += ` - ${test.uncertainReason}`;
661 |           }
662 |           md += `\n`;
663 |         });
664 |         md += `\n`;
665 |       }
666 | 
667 |       // Execution Results
668 |       if (entry.executionResults.length > 0) {
669 |         md += `**Execution Results:**\n`;
670 |         entry.executionResults.forEach(result => {
671 |           const statusIcon = {
672 |             passed: '✓',
673 |             failed: '✗',
674 |             uncertain: '?',
675 |             manual: '👤',
676 |             skipped: '⊘'
677 |           }[result.status] || '?';
678 |           
679 |           const classIcon = {
680 |             passed: '✓',
681 |             application_failure: '✗',
682 |             traceqa_generation_issue: '⚠',
683 |             uncertain: '?',
684 |             manual: '👤'
685 |           }[result.classification] || '?';
686 | 
687 |           md += `- ${statusIcon} ${result.testId}: ${result.status} (${classIcon} ${result.classification}) - ${formatDuration(result.duration)}\n`;
688 |           md += `  - Executor: ${result.executor}\n`;
689 |         });
690 |         md += `\n`;
691 |       }
692 | 
693 |       // Coverage
694 |       md += `**Coverage:**\n`;
695 |       md += `- Tasks Generated: ${entry.coverage.tasksGenerated}\n`;
696 |       md += `- Tests Generated: ${entry.coverage.testsGenerated}\n`;
697 |       md += `- Tests Executed: ${entry.coverage.testsExecuted}\n`;
698 |       md += `- Tests Passed: ${entry.coverage.testsPassed}\n`;
699 |       md += `- Tests Failed: ${entry.coverage.testsFailed}\n\n`;
700 |     }
701 | 
702 |     // Test Details
703 |     md += `## Test Details\n\n`;
704 | 
705 |     // Group by classification (using the classification field properly)
706 |     const passedTests = testResults.filter(r => r.classification.classification === 'passed');
707 |     const appFailures = testResults.filter(r => r.classification.classification === 'application_failure');
708 |     const genIssues = testResults.filter(r => r.classification.classification === 'traceqa_generation_issue');
709 |     const infraFailures = testResults.filter(r => r.classification.classification === 'infrastructure_failure');
710 |     const uncertainTests = testResults.filter(r => r.classification.classification === 'uncertain');
711 |     const manualTests = testResults.filter(r => r.classification.classification === 'manual');
712 | 
713 |     // Passed Tests
714 |     if (passedTests.length > 0) {
715 |       md += `### ✓ Passed Tests (${passedTests.length})\n\n`;
716 |       passedTests.forEach(result => {
717 |         md += this.formatTestDetail(result);
718 |       });
719 |     }
720 | 
721 |     // Application Failures
722 |     if (appFailures.length > 0) {
723 |       md += `### ✗ Application Failures (${appFailures.length})\n\n`;
724 |       md += `*These failures indicate issues with the application under test.*\n\n`;
725 |       appFailures.forEach(result => {
726 |         md += this.formatTestDetail(result);
727 |       });
728 |     }
729 | 
730 |     // Test Generation Issues
731 |     if (genIssues.length > 0) {
732 |       md += `### ⚠️ Test Generation Issues (${genIssues.length})\n\n`;
733 |       md += `*These are issues with test generation, not application bugs.*\n\n`;
734 |       genIssues.forEach(result => {
735 |         md += this.formatTestDetail(result);
736 |       });
737 |     }
738 | 
739 |     // Infrastructure Failures
740 |     if (infraFailures.length > 0) {
741 |       md += `### 🔌 Infrastructure Failures (${infraFailures.length})\n\n`;
742 |       md += `*These failures are due to network or environment issues.*\n\n`;
743 |       infraFailures.forEach(result => {
744 |         md += this.formatTestDetail(result);
745 |       });
746 |     }
747 | 
748 |     // Uncertain Tests
749 |     if (uncertainTests.length > 0) {
750 |       md += `### ? Uncertain Tests (${uncertainTests.length})\n\n`;
751 |       md += `*These tests could not be classified definitively.*\n\n`;
752 |       uncertainTests.forEach(result => {
753 |         md += this.formatTestDetail(result);
754 |       });
755 |     }
756 | 
757 |     // Manual Tests
758 |     if (manualTests.length > 0) {
759 |       md += `### 👤 Manual Tests (${manualTests.length})\n\n`;
760 |       md += `*These tests require manual execution.*\n\n`;
761 |       manualTests.forEach(result => {
762 |         md += this.formatTestDetail(result);
763 |       });
764 |     }
765 | 
766 |     // Footer
767 |     md += `---\n\n`;
768 |     md += `*Report generated by TraceQA v${ReportGenerator.VERSION} on ${summary.timestamp}*\n`;
769 | 
770 |     return md;
771 |   }
772 | 
773 |   /**
774 |    * Format test detail for markdown
775 |    */
776 |   private formatTestDetail(result: HTTPTestResult): string {
777 |     let md = `#### ${result.testId}: ${result.title}\n\n`;
778 |     md += `**Status:** ${result.status}\n`;
779 |     md += `**Classification:** ${result.classification.classification}\n`;
780 |     md += `**Reason:** ${result.classification.reason}\n`;
781 |     md += `**Confidence:** ${(result.classification.confidence * 100).toFixed(0)}%\n`;
782 |     md += `**Executor:** ${result.executor}\n`;
783 |     md += `**Duration:** ${formatDuration(result.duration)}\n\n`;
784 | 
785 |     if (result.stepResults.length > 0) {
786 |       md += `**Steps:**\n`;
787 |       result.stepResults.forEach((step, index) => {
788 |         const stepIcon = step.passed ? '✓' : '✗';
789 |         md += `${index + 1}. ${stepIcon} ${step.description}\n`;
790 |         md += `   - Method: ${step.method}\n`;
791 |         md += `   - URL: ${step.url}\n`;
792 |         md += `   - Expected Status: ${step.expectedStatus}\n`;
793 |         md += `   - Actual Status: ${step.actualStatus}\n`;
794 |         md += `   - Result: ${step.passed ? 'Passed' : 'Failed'}\n`;
795 |         if (step.error) {
796 |           md += `   - Error: ${step.error}\n`;
797 |         }
798 |       });
799 |       md += `\n`;
800 |     }
801 | 
802 |     if (result.evidence.length > 0) {
803 |       md += `**Evidence:**\n`;
804 |       result.evidence.forEach(ev => {
805 |         md += `- ${ev}\n`;
806 |       });
807 |       md += `\n`;
808 |     }
809 | 
810 |     return md;
811 |   }
812 | 
813 |   /**
814 |    * Display merge readiness in console
815 |    */
816 |   private displayMergeReadiness(
817 |     mergeReadiness: 'ready' | 'not_ready' | 'uncertain',
818 |     riskLevel: 'low' | 'medium' | 'high',
819 |     summary: ReportSummary
820 |   ): void {
821 |     console.log('\n' + '='.repeat(80));
822 | 
823 |     if (mergeReadiness === 'ready') {
824 |       logger.success(`✅ MERGE READINESS: READY TO MERGE (Risk: ${riskLevel})`);
825 |     } else if (mergeReadiness === 'uncertain') {
826 |       logger.warn(`⚠️  MERGE READINESS: UNCERTAIN - REVIEW NEEDED (Risk: ${riskLevel})`);
827 |     } else {
828 |       logger.error(`❌ MERGE READINESS: NOT READY TO MERGE (Risk: ${riskLevel})`);
829 |     }
830 | 
831 |     console.log('='.repeat(80));
832 |     console.log(`\nTests: ${summary.executionResults.executed}/${summary.executionResults.total} executed (${summary.executionResults.notExecuted} not executed)`);
833 |     console.log(`Passed: ${summary.executionResults.passed}`);
834 |     console.log(`Failed: ${summary.executionResults.failed}`);
835 |     console.log(`  - Application Failures: ${summary.executionResults.applicationFailures}`);
836 |     console.log(`  - Test Generation Issues: ${summary.executionResults.generationIssues}`);
837 |     console.log(`  - Infrastructure Failures: ${summary.executionResults.infrastructureFailures}`);
838 |     console.log(`  - Uncertain: ${summary.executionResults.uncertain}`);
839 |     console.log('');
840 |   }
841 | 
842 |   /**
843 |    * Ensure directory exists
844 |    */
845 |   private async ensureDirectory(dir: string): Promise<void> {
846 |     try {
847 |       await fs.access(dir);
848 |     } catch {
849 |       await fs.mkdir(dir, { recursive: true });
850 |     }
851 |   }
852 | }
853 | 
854 | /**
855 |  * Standalone function to generate report
856 |  * Convenience wrapper for the ReportGenerator class
857 |  */
858 | export async function generateReport(
859 |   acceptanceCriteria: AcceptanceCriterion[],
860 |   taskPlan: QATaskPlan,
861 |   testSuite: GeneratedHTTPTestSuite,
862 |   testResults: HTTPTestResult[],
863 |   config?: { outputDir?: string; projectName?: string }
864 | ): Promise<{
865 |   reportPath: string;
866 |   traceMatrixPath: string;
867 | }> {
868 |   const generator = new ReportGenerator();
869 |   return generator.generateReport(acceptanceCriteria, taskPlan, testSuite, testResults, config);
870 | }
871 | 
872 | // Made with Bob
</content>
</file>
<file><path>src/testing/test-coordinator.ts</path><file_outline>File: test-coordinator.ts (1466 lines)

Class: TestCoordinator (lines 57-1452)
  Propertys: agent, apiTester, buildSystem, config, mcpManager, normalizedTests, routeDiscovery, state, statefulContext, testRunner, webTester
  Constructor: constructor (lines 70-109)
    Propertys: agent, baseUrl, buildSystem, cleanup, execution, healthUrl, mcp, phase
  Method: abort (lines 1413-1416)
  Method: buildProject (lines 601-693)
    Propertys: port, port, serverUrl, serverUrl, serverUrl, serverUrl, success, success, success, success, success, success
  Method: cleanup (lines 1372-1393)
  Method: createTestContext (lines 698-769)
  Method: executeAPITest (lines 910-1058)
    Propertys: duration, duration, duration, duration, duration, error, error, error, error, error, logs, logs, message, message, message, message, message, passed, passed, passed, passed, passed, testCaseId, testCaseId, testCaseId, testCaseId, testCaseId, testCaseName, testCaseName, testCaseName, testCaseName, testCaseName, testId, timestamp, timestamp, timestamp, timestamp, timestamp
  Method: executeIntegrationTest (lines 1151-1241)
    Propertys: duration, duration, duration, error, error, error, message, message, message, passed, passed, passed, testCaseId, testCaseId, testCaseId, testCaseName, testCaseName, testCaseName, timestamp, timestamp, timestamp
  Method: executeTestCase (lines 866-905)
    Propertys: duration, error, message, passed, testCaseId, testCaseName, timestamp
  Method: executeTestPlan (lines 774-861)
    Propertys: retries, retryDelay, timeout, timeout
    Function: forEach (lines 798-800)
    Function: normalizedTests.filter (lines 798-798)
    Function: testRunner.onProgress (lines 821-826)
  Method: executeWebTest (lines 1063-1146)
    Propertys: duration, duration, duration, duration, error, error, error, error, message, message, message, message, passed, passed, passed, passed, screenshots, testCaseId, testCaseId, testCaseId, testCaseId, testCaseName, testCaseName, testCaseName, testCaseName, timestamp, timestamp, timestamp, timestamp
  Method: getAgent (lines 1435-1437)
  Method: getBuildSystem (lines 1428-1430)
  Method: getMCPManager (lines 1442-1444)
  Method: getNormalizedTests (lines 1449-1451)
  Method: getState (lines 1406-1408)
    Propertys: <unknown>
  Method: getTestRunner (lines 1421-1423)
  Method: initialize (lines 575-596)
  Method: loadOpenApiSpec (lines 543-570)
  Method: parseAPITestSteps (lines 1246-1367)
    Propertys: assertions, body, expected, headers, method, operator, type, url
  Method: runTests (lines 114-202)
    Propertys: analysis, report, results, testPlan
    Function: forEach (lines 145-147)
  Method: runTestsWithNewArchitecture (lines 213-541)
    Propertys: acceptanceCriterionId, acceptanceCriterionId, classification, classification, duration, duration, duration, duration, error, error, evidence, evidence, executor, executor, message, message, outputDir, passed, passed, projectName, qaTaskId, qaTaskId, status, status, stepResults, stepResults, testCaseId, testCaseId, testCaseName, testCaseName, testId, testId, timestamp, timestamp, timestamp, timestamp, title, title
    Function: httpTestResults.map (lines 372-380)
      Propertys: duration, error, message, passed, testCaseId, testCaseName, timestamp
    Function: warnings.forEach (lines 517-517)
  Method: updatePhase (lines 1398-1401)
Function: createTestCoordinator (lines 1457-1464)
</file_outline>
<notice>This file is large (1466 lines). You will use the following strategy to understand this file:
- Inform the user you are going to use large file strategy, to efficiently understand the file
- Use the file_outline provided to get an overview of the file structure to help decide next action. This is not the full file. It is not the full depth of the contents.
- If you read the file, use precise file reads with line ranges for specific sections of interest
- Consider if other commands/tools are better suited for extracting information from that file type
- Use ask_followup_question tool if needed to identify the best next action
</notice></file>
<file><path>src/testing/test-runner.ts</path>
<content lines="1-491">
  1 | /**
  2 |  * Test Runner
  3 |  * Test execution engine with support for sequential and parallel execution
  4 |  */
  5 | 
  6 | import {
  7 |   TestCase,
  8 |   TestResult,
  9 |   TestExecutionOptions,
 10 |   TestExecutionMode,
 11 |   TestExecutionStatus,
 12 |   TestExecutionProgress,
 13 |   TestContext,
 14 |   TestType,
 15 |   TraceQAError,
 16 |   ErrorCategory
 17 | } from '../types/index.js';
 18 | import { logger } from '../utils/logger.js';
 19 | 
 20 | /**
 21 |  * Test execution task
 22 |  */
 23 | interface TestTask {
 24 |   testCase: TestCase;
 25 |   status: TestExecutionStatus;
 26 |   result?: TestResult;
 27 |   startTime?: number;
 28 |   endTime?: number;
 29 |   error?: string;
 30 | }
 31 | 
 32 | /**
 33 |  * Test Runner class for executing test cases
 34 |  */
 35 | export class TestRunner {
 36 |   private options: Required<TestExecutionOptions>;
 37 |   private tasks: Map<string, TestTask> = new Map();
 38 |   private progressCallbacks: Array<(progress: TestExecutionProgress) => void> = [];
 39 |   private aborted: boolean = false;
 40 | 
 41 |   constructor(options: TestExecutionOptions = {}) {
 42 |     this.options = {
 43 |       mode: options.mode || TestExecutionMode.SEQUENTIAL,
 44 |       maxParallel: options.maxParallel || 5,
 45 |       timeout: options.timeout || 300000, // 5 minutes default
 46 |       retries: options.retries || 0,
 47 |       retryDelay: options.retryDelay || 1000,
 48 |       continueOnFailure: options.continueOnFailure ?? true,
 49 |       captureScreenshots: options.captureScreenshots ?? true,
 50 |       captureLogs: options.captureLogs ?? true,
 51 |       generateReport: options.generateReport ?? true,
 52 |       reportFormat: options.reportFormat || 'json',
 53 |       outputDir: options.outputDir || './test-results'
 54 |     };
 55 | 
 56 |     logger.debug('Test Runner initialized', this.options);
 57 |   }
 58 | 
 59 |   /**
 60 |    * Execute test cases
 61 |    */
 62 |   async executeTests(
 63 |     testCases: TestCase[],
 64 |     context: TestContext,
 65 |     executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
 66 |   ): Promise<TestResult[]> {
 67 |     logger.info(`Executing ${testCases.length} test cases in ${this.options.mode} mode`);
 68 | 
 69 |     // Initialize tasks
 70 |     this.tasks.clear();
 71 |     this.aborted = false;
 72 | 
 73 |     for (const testCase of testCases) {
 74 |       this.tasks.set(testCase.id, {
 75 |         testCase,
 76 |         status: TestExecutionStatus.PENDING
 77 |       });
 78 |     }
 79 | 
 80 |     // Execute based on mode
 81 |     let results: TestResult[];
 82 | 
 83 |     switch (this.options.mode) {
 84 |       case TestExecutionMode.SEQUENTIAL:
 85 |         results = await this.executeSequential(testCases, context, executor);
 86 |         break;
 87 | 
 88 |       case TestExecutionMode.PARALLEL:
 89 |         results = await this.executeParallel(testCases, context, executor);
 90 |         break;
 91 | 
 92 |       case TestExecutionMode.MIXED:
 93 |         results = await this.executeMixed(testCases, context, executor);
 94 |         break;
 95 | 
 96 |       default:
 97 |         throw new TraceQAError(
 98 |           `Unknown execution mode: ${this.options.mode}`,
 99 |           ErrorCategory.TEST_EXECUTION
100 |         );
101 |     }
102 | 
103 |     // Report final progress
104 |     this.reportProgress();
105 | 
106 |     const passed = results.filter(r => r.passed).length;
107 |     logger.success(
108 |       `Test execution completed: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`
109 |     );
110 | 
111 |     return results;
112 |   }
113 | 
114 |   /**
115 |    * Execute tests sequentially
116 |    */
117 |   private async executeSequential(
118 |     testCases: TestCase[],
119 |     context: TestContext,
120 |     executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
121 |   ): Promise<TestResult[]> {
122 |     const results: TestResult[] = [];
123 | 
124 |     for (let i = 0; i < testCases.length; i++) {
125 |       if (this.aborted) {
126 |         logger.warn('Test execution aborted');
127 |         break;
128 |       }
129 | 
130 |       const testCase = testCases[i];
131 |       logger.info(`[${i + 1}/${testCases.length}] Executing: ${testCase.name}`);
132 | 
133 |       const result = await this.executeTestCase(testCase, context, executor);
134 |       results.push(result);
135 | 
136 |       // Report progress
137 |       this.reportProgress();
138 | 
139 |       // Check if we should continue
140 |       if (!result.passed && !this.options.continueOnFailure) {
141 |         logger.warn('Stopping execution due to test failure');
142 |         break;
143 |       }
144 |     }
145 | 
146 |     return results;
147 |   }
148 | 
149 |   /**
150 |    * Execute tests in parallel
151 |    */
152 |   private async executeParallel(
153 |     testCases: TestCase[],
154 |     context: TestContext,
155 |     executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
156 |   ): Promise<TestResult[]> {
157 |     const results: TestResult[] = [];
158 |     const executing: Promise<TestResult>[] = [];
159 | 
160 |     for (const testCase of testCases) {
161 |       if (this.aborted) {
162 |         break;
163 |       }
164 | 
165 |       // Wait if we've reached max parallel limit
166 |       if (executing.length >= this.options.maxParallel) {
167 |         const result = await Promise.race(executing);
168 |         results.push(result);
169 |         executing.splice(
170 |           executing.findIndex(p => p === Promise.resolve(result)),
171 |           1
172 |         );
173 |         this.reportProgress();
174 |       }
175 | 
176 |       // Start execution
177 |       const promise = this.executeTestCase(testCase, context, executor);
178 |       executing.push(promise);
179 |     }
180 | 
181 |     // Wait for remaining tests
182 |     const remaining = await Promise.all(executing);
183 |     results.push(...remaining);
184 | 
185 |     return results;
186 |   }
187 | 
188 |   /**
189 |    * Execute tests in mixed mode (parallel groups, sequential within groups)
190 |    */
191 |   private async executeMixed(
192 |     testCases: TestCase[],
193 |     context: TestContext,
194 |     executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
195 |   ): Promise<TestResult[]> {
196 |     // Group tests by type
197 |     const groups = new Map<TestType, TestCase[]>();
198 | 
199 |     for (const testCase of testCases) {
200 |       const group = groups.get(testCase.type) || [];
201 |       group.push(testCase);
202 |       groups.set(testCase.type, group);
203 |     }
204 | 
205 |     logger.info(`Executing ${groups.size} test groups in parallel`);
206 | 
207 |     // Execute groups in parallel
208 |     const groupPromises = Array.from(groups.values()).map(group =>
209 |       this.executeSequential(group, context, executor)
210 |     );
211 | 
212 |     const groupResults = await Promise.all(groupPromises);
213 | 
214 |     // Flatten results
215 |     return groupResults.flat();
216 |   }
217 | 
218 |   /**
219 |    * Execute a single test case with retry logic
220 |    */
221 |   private async executeTestCase(
222 |     testCase: TestCase,
223 |     context: TestContext,
224 |     executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
225 |   ): Promise<TestResult> {
226 |     const task = this.tasks.get(testCase.id);
227 |     if (!task) {
228 |       throw new TraceQAError(
229 |         `Test task not found: ${testCase.id}`,
230 |         ErrorCategory.TEST_EXECUTION
231 |       );
232 |     }
233 | 
234 |     task.status = TestExecutionStatus.RUNNING;
235 |     task.startTime = Date.now();
236 | 
237 |     let lastError: Error | null = null;
238 |     let retryCount = 0;
239 | 
240 |     while (retryCount <= this.options.retries) {
241 |       try {
242 |         // Execute with timeout
243 |         const result = await this.executeWithTimeout(
244 |           () => executor(testCase, context),
245 |           this.options.timeout
246 |         );
247 | 
248 |         task.status = result.passed
249 |           ? TestExecutionStatus.PASSED
250 |           : TestExecutionStatus.FAILED;
251 |         task.result = result;
252 |         task.endTime = Date.now();
253 | 
254 |         if (result.passed || retryCount >= this.options.retries) {
255 |           return result;
256 |         }
257 | 
258 |         // Retry on failure
259 |         logger.warn(
260 |           `Test failed, retrying (${retryCount + 1}/${this.options.retries}): ${testCase.name}`
261 |         );
262 |         retryCount++;
263 |         await this.sleep(this.options.retryDelay);
264 |       } catch (error) {
265 |         lastError = error as Error;
266 | 
267 |         if (retryCount >= this.options.retries) {
268 |           // Max retries reached
269 |           task.status = TestExecutionStatus.ERROR;
270 |           task.error = lastError.message;
271 |           task.endTime = Date.now();
272 | 
273 |           const result: TestResult = {
274 |             testCaseId: testCase.id,
275 |             testCaseName: testCase.name,
276 |             passed: false,
277 |             duration: task.endTime - task.startTime,
278 |             message: 'Test execution error',
279 |             error: lastError.message,
280 |             timestamp: new Date().toISOString()
281 |           };
282 | 
283 |           task.result = result;
284 |           return result;
285 |         }
286 | 
287 |         logger.warn(
288 |           `Test error, retrying (${retryCount + 1}/${this.options.retries}): ${testCase.name}: ${error instanceof Error ? error.message : String(error)}`
289 |         );
290 |         retryCount++;
291 |         await this.sleep(this.options.retryDelay);
292 |       }
293 |     }
294 | 
295 |     // Should never reach here
296 |     throw new TraceQAError(
297 |       'Unexpected error in test execution',
298 |       ErrorCategory.TEST_EXECUTION
299 |     );
300 |   }
301 | 
302 |   /**
303 |    * Execute a function with timeout
304 |    */
305 |   private async executeWithTimeout<T>(
306 |     fn: () => Promise<T>,
307 |     timeout: number
308 |   ): Promise<T> {
309 |     return Promise.race([
310 |       fn(),
311 |       new Promise<T>((_, reject) => {
312 |         global.setTimeout(() => {
313 |           reject(
314 |             new TraceQAError(
315 |               `Test execution timeout after ${timeout}ms`,
316 |               ErrorCategory.TEST_EXECUTION
317 |             )
318 |           );
319 |         }, timeout);
320 |       })
321 |     ]);
322 |   }
323 | 
324 |   /**
325 |    * Get current execution progress
326 |    */
327 |   getProgress(): TestExecutionProgress {
328 |     const tasks = Array.from(this.tasks.values());
329 |     const total = tasks.length;
330 |     const completed = tasks.filter(
331 |       t =>
332 |         t.status === TestExecutionStatus.PASSED ||
333 |         t.status === TestExecutionStatus.FAILED ||
334 |         t.status === TestExecutionStatus.ERROR ||
335 |         t.status === TestExecutionStatus.SKIPPED
336 |     ).length;
337 |     const passed = tasks.filter(t => t.status === TestExecutionStatus.PASSED).length;
338 |     const failed = tasks.filter(
339 |       t =>
340 |         t.status === TestExecutionStatus.FAILED ||
341 |         t.status === TestExecutionStatus.ERROR
342 |     ).length;
343 |     const skipped = tasks.filter(t => t.status === TestExecutionStatus.SKIPPED).length;
344 |     const running = tasks.find(t => t.status === TestExecutionStatus.RUNNING);
345 | 
346 |     // Calculate estimated time remaining
347 |     let estimatedTimeRemaining: number | undefined;
348 |     if (completed > 0 && completed < total) {
349 |       const completedTasks = tasks.filter(t => t.endTime && t.startTime);
350 |       if (completedTasks.length > 0) {
351 |         const avgDuration =
352 |           completedTasks.reduce((sum, t) => sum + (t.endTime! - t.startTime!), 0) /
353 |           completedTasks.length;
354 |         estimatedTimeRemaining = Math.round(avgDuration * (total - completed));
355 |       }
356 |     }
357 | 
358 |     return {
359 |       total,
360 |       completed,
361 |       passed,
362 |       failed,
363 |       skipped,
364 |       current: running?.testCase.name,
365 |       percentage: total > 0 ? (completed / total) * 100 : 0,
366 |       estimatedTimeRemaining
367 |     };
368 |   }
369 | 
370 |   /**
371 |    * Report progress to callbacks
372 |    */
373 |   private reportProgress(): void {
374 |     const progress = this.getProgress();
375 | 
376 |     for (const callback of this.progressCallbacks) {
377 |       try {
378 |         callback(progress);
379 |       } catch (error) {
380 |         logger.error('Progress callback error', error);
381 |       }
382 |     }
383 | 
384 |     logger.debug(
385 |       `Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)`
386 |     );
387 |   }
388 | 
389 |   /**
390 |    * Register a progress callback
391 |    */
392 |   onProgress(callback: (progress: TestExecutionProgress) => void): void {
393 |     this.progressCallbacks.push(callback);
394 |   }
395 | 
396 |   /**
397 |    * Abort test execution
398 |    */
399 |   abort(): void {
400 |     logger.warn('Aborting test execution...');
401 |     this.aborted = true;
402 | 
403 |     // Mark pending tests as skipped
404 |     for (const task of this.tasks.values()) {
405 |       if (task.status === TestExecutionStatus.PENDING) {
406 |         task.status = TestExecutionStatus.SKIPPED;
407 |       }
408 |     }
409 |   }
410 | 
411 |   /**
412 |    * Check if execution is aborted
413 |    */
414 |   isAborted(): boolean {
415 |     return this.aborted;
416 |   }
417 | 
418 |   /**
419 |    * Get all test tasks
420 |    */
421 |   getTasks(): Map<string, TestTask> {
422 |     return new Map(this.tasks);
423 |   }
424 | 
425 |   /**
426 |    * Get execution statistics
427 |    */
428 |   getStatistics(): {
429 |     total: number;
430 |     passed: number;
431 |     failed: number;
432 |     skipped: number;
433 |     errors: number;
434 |     duration: number;
435 |     successRate: number;
436 |   } {
437 |     const tasks = Array.from(this.tasks.values());
438 |     const total = tasks.length;
439 |     const passed = tasks.filter(t => t.status === TestExecutionStatus.PASSED).length;
440 |     const failed = tasks.filter(t => t.status === TestExecutionStatus.FAILED).length;
441 |     const skipped = tasks.filter(t => t.status === TestExecutionStatus.SKIPPED).length;
442 |     const errors = tasks.filter(t => t.status === TestExecutionStatus.ERROR).length;
443 | 
444 |     const completedTasks = tasks.filter(t => t.endTime && t.startTime);
445 |     const duration = completedTasks.reduce(
446 |       (sum, t) => sum + (t.endTime! - t.startTime!),
447 |       0
448 |     );
449 | 
450 |     const successRate = total > 0 ? passed / total : 0;
451 | 
452 |     return {
453 |       total,
454 |       passed,
455 |       failed,
456 |       skipped,
457 |       errors,
458 |       duration,
459 |       successRate
460 |     };
461 |   }
462 | 
463 |   /**
464 |    * Sleep utility
465 |    */
466 |   private sleep(ms: number): Promise<void> {
467 |     return new Promise(resolve => global.setTimeout(resolve, ms));
468 |   }
469 | }
470 | 
471 | /**
472 |  * Create a test runner instance
473 |  */
474 | export function createTestRunner(options?: TestExecutionOptions): TestRunner {
475 |   return new TestRunner(options);
476 | }
477 | 
478 | /**
479 |  * Execute tests with a simple API
480 |  */
481 | export async function executeTests(
482 |   testCases: TestCase[],
483 |   context: TestContext,
484 |   executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>,
485 |   options?: TestExecutionOptions
486 | ): Promise<TestResult[]> {
487 |   const runner = new TestRunner(options);
488 |   return runner.executeTests(testCases, context, executor);
489 | }
490 | 
491 | // Made with Bob
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files


# VSCode Open Tabs
src/utils/logger.ts,.env,src/agent/watsonx-client.ts,src/agent/index.ts,src/smoke-tests/ibm-smoke-test.ts,.env.example,src/config/index.ts,src/reporting/report-generator.ts,test-fixtures/ibm-test-plan.json,src/testing/api-tester.ts,test-post-fix.ts,src/parsers/acceptance-parser.ts,src/generators/test-generator.ts,src/types/index.ts,test-acceptance-parser.ts,acceptance.md,README.md,CHANGELOG.md,FEATURES.md,src/utils/json-extractor.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-03T02:22:45.085Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.31

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>ask</slug>
<name>❓ Ask</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

<attempt_completion>
<result>
# TraceQA Codebase Analysis: 10 Issues Implementation Guide

## Executive Summary

I've analyzed the TraceQA codebase to identify key files and their responsibilities related to the 10 issues described. Here's a comprehensive breakdown of the current implementation, problem areas, dependencies, and recommended implementation order.

---

## 1. Route Matching Logic (Issue #1)

### Current Implementation
**File:** [`src/validation/route-matcher.ts`](src/validation/route-matcher.ts:1) (796 lines)

**Key Functions:**
- [`matchRouteToTask()`](src/validation/route-matcher.ts:355-517): Main route matching with scoring algorithm
- [`detectResourceAndAction()`](src/validation/route-matcher.ts:128-155): Extracts resources and actions from text
- [`validateAndNormalizeHTTPStep()`](src/validation/route-matcher.ts:635-724): Validates HTTP test steps

**Current Approach:**
- Uses keyword extraction and semantic matching
- Scoring system: method match (30pts), path match (35pts), keyword similarity (25pts)
- Supports parameter placeholders in paths
- Confidence levels: high (≥70), medium (≥50), low (<50)

**Problems:**
- Hardcoded action patterns (lines 77-90) include business-specific keywords like 'login', 'register'
- Resource detection limited to predefined patterns (lines 165-176)
- No integration with OpenAPI schema validation
- Path normalization doesn't handle all parameter formats

**Dependencies:**
- Used by: [`test-normalizer.ts`](src/testing/test-normalizer.ts:1), [`qa-task-generator.ts`](src/generators/qa-task-generator.ts:1)
- Depends on: [`route-discovery.ts`](src/discovery/route-discovery.ts:1) for DiscoveredRoute type

---

## 2. Schema/OpenAPI Usage (Issues #2, #3)

### Current Implementation

**Route Discovery:** [`src/discovery/route-discovery.ts`](src/discovery/route-discovery.ts:1) (407 lines)
- Discovers routes from code (Express, FastAPI, ASP.NET, Spring Boot, Go)
- Parses OpenAPI/Swagger specs (lines 264-318)
- Extracts validation snippets from source code (lines 185-199)

**Body Generation:** [`src/validation/body-generator.ts`](src/validation/body-generator.ts:1) (1185 lines - large file)
- Generates request bodies from schemas
- Handles validation rules and constraints

**Problems:**
- OpenAPI schema not used for route matching validation
- Body generator not integrated with route matcher
- No schema-based validation in test normalization
- Validation snippets extracted but not utilized

**Dependencies:**
- Route discovery feeds into test generation
- Body generator should inform test-normalizer but doesn't

---

## 3. Test Validation (Issue #4)

### Current Implementation
**File:** [`src/testing/test-normalizer.ts`](src/testing/test-normalizer.ts:1) (873 lines)

**Key Methods:**
- [`normalizeTestCase()`](src/testing/test-normalizer.ts:71-96): Main normalization entry point
- [`normalizeMultiStepTest()`](src/testing/test-normalizer.ts:313-411): Handles duplicate/conflict scenarios
- [`extractAndValidateURL()`](src/testing/test-normalizer.ts:516-618): URL validation and normalization
- [`inferExpectedStatus()`](src/testing/test-normalizer.ts:146-227): Status code inference

**Current Approach:**
- Validates URL format and structure
- Detects multi-step tests (duplicate scenarios)
- Generates unique test data with run-scoped IDs
- Infers expected statuses from HTTP semantics

**Problems:**
- URL validation doesn't check against discovered routes strictly
- Status inference uses generic patterns, not schema-based
- No validation of request body against schema
- Acceptable statuses hardcoded (lines 232-258)

---

## 4. Failure Classification (Issue #5)

### Current Implementation
**File:** [`src/testing/failure-classifier.ts`](src/testing/failure-classifier.ts:1) (502 lines)

**Key Functions:**
- [`classifyTestResult()`](src/testing/failure-classifier.ts:44-127): Main classification logic
- [`classifyByResponse()`](src/testing/failure-classifier.ts:132-249): Response-based classification
- [`isNetworkError()`](src/testing/failure-classifier.ts:254-275): Network error detection

**Classifications:**
- PASSED, APPLICATION_FAILURE, TRACEQA_GENERATION_ISSUE, INFRASTRUCTURE_FAILURE, UNCERTAIN, MANUAL, SKIPPED

**Current Approach:**
- Checks for network errors (ECONNREFUSED, etc.)
- Classifies 5xx as application failures
- Detects 404 as route matching issues
- Checks for enum/validation hints in 422 responses

**Problems:**
- Limited context for classification decisions
- No integration with schema validation results
- Uncertain classification too broad
- Doesn't use evidence from route discovery

---

## 5. Body Assertions (Issue #6)

### Current Implementation

**API Tester:** [`src/testing/api-tester.ts`](src/testing/api-tester.ts:1) (742 lines)
- [`runAssertion()`](src/testing/api-tester.ts:509-596): Executes individual assertions
- Supports: STATUS_CODE, HEADER, BODY_CONTAINS, BODY_EQUALS, BODY_MATCHES, JSON_PATH, RESPONSE_TIME

**HTTP Test Executor:** [`src/testing/http-test-executor.ts`](src/testing/http-test-executor.ts:1) (1472 lines - large file)
- [`assertBodyContains()`](src/testing/http-test-executor.ts:160-201): Body content assertions
- [`assertStatus()`](src/testing/http-test-executor.ts:125-151): Status code assertions

**Problems:**
- Body assertions are string-based, not schema-aware
- No validation against expected response schemas
- JSON path assertions limited
- No deep object comparison with schema

**Dependencies:**
- Used by test-coordinator for execution
- Should integrate with body-generator for validation

---

## 6. Setup/Capture Logic (Issue #7)

### Current Implementation

**Test Generator:** [`src/generators/test-generator.ts`](src/generators/test-generator.ts:1) (241 lines)
- Basic HTTP test generation
- Extracts method, URL, body, expected status from steps
- No variable capture or multi-step dependencies

**Test Agent:** [`src/agent/test-agent.ts`](src/agent/test-agent.ts:1) (803 lines)
- [`generateTests()`](src/agent/test-agent.ts:88-149): Generates QA task suggestions from IBM
- [`executeTestCase()`](src/agent/test-agent.ts:510-569): Executes individual test cases
- Note: Actual execution delegated to TestCoordinator (line 591)

**API Tester Context Support:**
- [`applyVariableSubstitution()`](src/testing/api-tester.ts:92-124): Substitutes variables in requests
- [`captureVariables()`](src/testing/api-tester.ts:129-148): Captures variables from responses
- Uses TestContext for variable storage

**Problems:**
- Test generator doesn't create setup steps
- No automatic dependency detection
- Variable capture exists but not used in generation
- Multi-step tests handled manually, not automatically

---

## 7. IBM AC Handling (Issue #8)

### Current Implementation

**Watsonx Client:** [`src/agent/watsonx-client.ts`](src/agent/watsonx-client.ts:1) (470 lines)
- [`sendMessage()`](src/agent/watsonx-client.ts:120-185): Sends prompts to IBM watsonx.ai
- Handles conversation history and token usage
- Retry logic for API failures

**Prompts:** [`src/agent/prompts.ts`](src/agent/prompts.ts:1) (567 lines)
- [`getTestPlanningPrompt()`](src/agent/prompts.ts:42-169): Generates test planning prompts
- Includes acceptance criteria, discovered routes, diff analysis
- **Critical formatting requirements** (lines 124-135): JSON-only responses

**Problems:**
- Prompt doesn't emphasize schema usage
- No explicit instruction to use validation snippets
- Route information provided but not strongly enforced
- JSON extraction can fail (handled by json-extractor)

---

## 8. IBM Generation (Issue #9)

### Current Implementation

**Test Agent:** [`src/agent/test-agent.ts`](src/agent/test-agent.ts:1)
- [`generateTests()`](src/agent/test-agent.ts:88-149): Extracts QA task suggestions
- Uses [`safeExtractJSON()`](src/agent/test-agent.ts:100) for robust parsing
- Falls back to empty array on failure

**QA Task Generator:** [`src/generators/qa-task-generator.ts`](src/generators/qa-task-generator.ts:1) (494 lines)
- [`generateTaskPlan()`](src/generators/qa-task-generator.ts:25-59): Creates task plan from AC + AI suggestions
- [`normalizeAITask()`](src/generators/qa-task-generator.ts:75-109): Validates and normalizes AI output
- [`generateDeterministicTask()`](src/generators/qa-task-generator.ts:114-162): Fallback when AI fails

**HTTP Test Generator:**
- [`generateTestSuite()`](src/generators/qa-task-generator.ts:235-265): Converts tasks to HTTP tests
- [`inferExpectedStatus()`](src/generators/qa-task-generator.ts:370-410): Evidence-based status inference

**Problems:**
- AI suggestions not validated against schemas
- Fallback generation too simplistic
- No validation of generated URLs against discovered routes
- Status inference doesn't use validation snippets

---

## 9. Report Generation (Issue #10)

### Current Implementation
**File:** [`src/reporting/report-generator.ts`](src/reporting/report-generator.ts:1) (872 lines)

**Key Methods:**
- [`generateReport()`](src/reporting/report-generator.ts:135-212): Main report generation
- [`generateTraceMatrix()`](src/reporting/report-generator.ts:223-299): AC→Task→Test→Result mapping
- [`assessMergeReadiness()`](src/reporting/report-generator.ts:432-515): Risk assessment

**Report Structure:**
- Summary with clear execution counts
- Trace matrix for traceability
- Failure breakdown by classification
- Merge readiness assessment
- Markdown and JSON outputs

**Current Approach:**
- Proper classification-based counting
- Clear separation of executed vs not-executed
- Evidence collection from test results
- Risk level calculation

**Problems:**
- No schema validation results in report
- Limited evidence about why tests failed
- No recommendations based on schema mismatches
- Could include more diagnostic information

---

## 10. Test Execution Flow (Issues across components)

### Current Implementation

**Test Coordinator:** [`src/testing/test-coordinator.ts`](src/testing/test-coordinator.ts:1) (1466 lines - large file)
- Orchestrates entire test lifecycle
- [`runTestsWithNewArchitecture()`](src/testing/test-coordinator.ts:213-541): Main execution flow
- Handles build, route discovery, test generation, execution, reporting

**Test Runner:** [`src/testing/test-runner.ts`](src/testing/test-runner.ts:1) (491 lines)
- [`executeTests()`](src/testing/test-runner.ts:62-112): Executes test cases
- Supports sequential, parallel, and mixed execution modes
- Retry logic and timeout handling

**Flow:**
1. Parse acceptance criteria
2. Discover routes
3. Generate QA tasks (with IBM suggestions)
4. Generate HTTP tests
5. Normalize tests
6. Execute tests
7. Classify results
8. Generate reports

**Problems:**
- Schema not passed through entire pipeline
- Route discovery results not fully utilized
- Test normalization happens late, after generation
- No feedback loop from execution to generation

---

## Dependencies Between Components

```
Acceptance Criteria
    ↓
Route Discovery ← OpenAPI Spec
    ↓
IBM Test Agent (prompts.ts, watsonx-client.ts)
    ↓
QA Task Generator (qa-task-generator.ts)
    ↓
HTTP Test Generator (qa-task-generator.ts)
    ↓
Test Normalizer (test-normalizer.ts) ← Route Matcher (route-matcher.ts)
    ↓
Test Coordinator (test-coordinator.ts)
    ↓
API Tester (api-tester.ts) / HTTP Test Executor (http-test-executor.ts)
    ↓
Failure Classifier (failure-classifier.ts)
    ↓
Report Generator (report-generator.ts)
```

**Key Integration Points:**
1. Route discovery → Route matcher (schema validation)
2. Body generator → Test normalizer (request validation)
3. Schema → IBM prompts (generation guidance)
4. Validation snippets → Failure classifier (better classification)
5. Test context → API tester (variable capture/substitution)

---

## Recommended Implementation Order

### Phase 1: Foundation (Issues #1, #2, #3)
**Priority: HIGH - Fixes core matching and validation**

1. **Enhance Route Matcher** (Issue #1)
   - Remove hardcoded business keywords
   - Add OpenAPI schema integration
   - Improve path parameter handling
   - Add schema-based validation

2. **Integrate OpenAPI Schema** (Issue #2)
   - Pass schema through entire pipeline
   - Use schema for route validation
   - Extract validation rules from schema

3. **Enhance Body Generator** (Issue #3)
   - Connect to route matcher
   - Generate bodies from OpenAPI schemas
   - Validate generated bodies against schemas

**Files to modify:**
- `src/validation/route-matcher.ts`
- `src/discovery/route-discovery.ts`
- `src/validation/body-generator.ts`
- `src/testing/test-normalizer.ts`

---

### Phase 2: Validation & Classification (Issues #4, #5)
**Priority: HIGH - Improves test quality and failure detection**

4. **Improve Test Validation** (Issue #4)
   - Add schema-based URL validation
   - Validate request bodies against schemas
   - Use schema for status code inference
   - Add acceptable status validation

5. **Enhance Failure Classification** (Issue #5)
   - Use schema validation results
   - Add evidence from route discovery
   - Improve uncertain classification
   - Add schema mismatch detection

**Files to modify:**
- `src/testing/test-normalizer.ts`
- `src/testing/failure-classifier.ts`
- `src/testing/api-tester.ts`

---

### Phase 3: Assertions & Setup (Issues #6, #7)
**Priority: MEDIUM - Adds advanced testing capabilities**

6. **Schema-Aware Body Assertions** (Issue #6)
   - Add schema validation assertions
   - Implement deep object comparison
   - Add response schema validation
   - Improve JSON path assertions

7. **Setup/Capture Logic** (Issue #7)
   - Auto-generate setup steps
   - Detect test dependencies
   - Implement variable capture in generation
   - Add multi-step test support

**Files to modify:**
- `src/testing/api-tester.ts`
- `src/testing/http-test-executor.ts`
- `src/generators/test-generator.ts`
- `src/generators/qa-task-generator.ts`

---

### Phase 4: IBM Integration (Issues #8, #9)
**Priority: MEDIUM - Improves AI-generated tests**

8. **Improve IBM AC Handling** (Issue #8)
   - Add schema to prompts
   - Emphasize validation snippet usage
   - Enforce route matching in prompts
   - Add schema examples to prompts

9. **Enhance IBM Generation** (Issue #9)
   - Validate AI output against schemas
   - Improve fallback generation
   - Add URL validation against routes
   - Use validation snippets for status inference

**Files to modify:**
- `src/agent/prompts.ts`
- `src/agent/test-agent.ts`
- `src/generators/qa-task-generator.ts`

---

### Phase 5: Reporting (Issue #10)
**Priority: LOW - Enhances visibility**

10. **Enhanced Report Generation** (Issue #10)
    - Add schema validation results
    - Include diagnostic information
    - Add schema mismatch recommendations
    - Improve evidence collection

**Files to modify:**
- `src/reporting/report-generator.ts`

---

## Critical Success Factors

1. **Schema Integration**: Pass OpenAPI schema through entire pipeline
2. **Evidence-Based**: Use validation snippets and schema for decisions
3. **Backward Compatibility**: Maintain existing test execution flow
4. **Incremental**: Each phase should be independently testable
5. **Documentation**: Update docs as each phase completes

## Risk Mitigation

- **Large Files**: Use precise line ranges when modifying large files (body-generator.ts, http-test-executor.ts, test-coordinator.ts)
- **Breaking Changes**: Add feature flags for new behavior
- **Testing**: Add unit tests for each modified component
- **Rollback**: Keep old logic as fallback during transition

---

This analysis provides a clear roadmap for implementing all 10 issues with minimal risk and maximum impact. Start with Phase 1 to establish the foundation, then proceed sequentially through the phases.
</result>
</attempt_completion>

