**User:**

<task>
Analyze TraceQA's current route-mapping architecture to identify hardcoded domain logic and architectural issues.

**Objective:** Examine the codebase to find where route mapping decisions are made and identify problematic patterns.

**Files to analyze:**
1. `src/validation/route-matcher.ts` - likely contains route matching logic
2. `src/generators/http-test-generator.ts` - generates HTTP tests, may have route selection
3. `src/generators/qa-task-plan-generator.ts` - IBM integration for test planning
4. `src/testing/test-coordinator.ts` - coordinates test execution and status
5. `src/reporting/report-generator.ts` - generates reports with test classifications
6. `src/types/index.ts` - type definitions that may reveal architecture
7. `src/validation/body-generator.ts` - may contain domain-specific logic
8. `src/config/config-loader.ts` - current config structure

**What to look for:**
1. Hardcoded domain keyword arrays (login, register, auth, health, order, profile, etc.)
2. Route selection logic that uses keyword matching as primary strategy
3. Hardcoded sample routes like `/api/register`, `/api/login` in core logic
4. How IBM integration currently works - does it produce route mappings?
5. How test status is determined (ready vs uncertain vs failed)
6. How reports classify tests
7. How trace matrix maps tests to acceptance criteria
8. Whether config supports route mappings

**Deliverable:**
Create a detailed analysis document at `traceqa-debug/architecture-analysis.md` that:
- Lists all locations with hardcoded domain logic
- Documents current route-mapping flow
- Identifies specific code sections that need refactoring
- Maps current vs desired architecture
- Provides code snippets showing problematic patterns

This analysis will guide the refactoring subtasks. Use `attempt_completion` when done with a summary of key findings.
</task>
<environment_details>
# VSCode Visible Files
src\reporting\index.ts

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:37:58.837Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.00

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>


# Current Workspace Directory (c:/Users/ragha/TraceQA) Files
.env.example
.gitignore
ACCEPTANCE_CRITERIA_USAGE.md
acceptance.md
CHANGELOG.md
CLI_IMPLEMENTATION.md
FEATURES.md
IMPLEMENTATION_REPORT.md
package-lock.json
package.json
PROGRESS.md
PROJECT_SUMMARY.md
README.md
REFACTORING_PLAN.md
TECHNICAL_SPEC.md
test-acceptance-parser.ts
test-body-generator.ts
test-build-system.ts
test-ibm-integration.ts
test-post-fix.ts
test-qa-task-plan-generator.ts
test-route-discovery.ts
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
src/testing/http-test-executor.ts
src/testing/index.ts
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
test-fixtures/
test-fixtures/ibm-test-plan.json
test-fixtures/express-app/
test-fixtures/express-app/server.js
test-fixtures/fastapi-app/
test-fixtures/fastapi-app/main.py
traceqa-debug/
traceqa-debug/raw-response-attempt-1.txt
traceqa-debug/raw-response-attempt-2.txt
traceqa-proof/
traceqa-proof/report.json
traceqa-proof/report.md
traceqa-proof/trace-matrix.json
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I'll analyze TraceQA's architecture to identify hardcoded domain logic and architectural issues. Let me start by creating a TODO list and then systematically examining the key files.

<update_todo_list>
<todos>
[ ] Read and analyze route-matcher.ts for hardcoded domain logic
[ ] Examine http-test-generator.ts for route selection patterns
[ ] Review qa-task-plan-generator.ts for IBM integration
[ ] Analyze test-coordinator.ts for test status determination
[ ] Check report-generator.ts for test classification logic
[ ] Review types/index.ts for architectural patterns
[ ] Examine body-generator.ts for domain-specific logic
[ ] Check config-loader.ts for configuration structure
[ ] Create comprehensive architecture-analysis.md document
[ ] Complete task with summary of findings
</todos>
</update_todo_list>

---

**User:**

[update_todo_list] Result:
Todo list updated successfully.
<environment_details>
# VSCode Visible Files
src\reporting\index.ts

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:38:04.606Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.01

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Now let me read the key files to analyze the architecture. I'll start by reading multiple critical files together.

<read_file>
<args>
<file>
<path>src/validation/route-matcher.ts</path>
</file>
<file>
<path>src/generators/http-test-generator.ts</path>
</file>
<file>
<path>src/types/index.ts</path>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/validation/route-matcher.ts', 'src/generators/http-test-generator.ts', 'src/types/index.ts'] Result:
<files>
<file><path>src/validation/route-matcher.ts</path>
<content lines="1-607">
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
 48 |   action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'health' | 'auth' | null;
 49 |   keywords: string[];
 50 | }
 51 | 
 52 | /**
 53 |  * HTTP method mapping for different action types
 54 |  */
 55 | const ACTION_TO_METHOD_MAP: Record<string, string[]> = {
 56 |   create: ['POST'],
 57 |   read: ['GET'],
 58 |   update: ['PUT', 'PATCH'],
 59 |   delete: ['DELETE'],
 60 |   list: ['GET'],
 61 |   health: ['GET'],
 62 |   auth: ['POST'],
 63 | };
 64 | 
 65 | /**
 66 |  * Action verb patterns for detecting CRUD operations
 67 |  */
 68 | const ACTION_PATTERNS = {
 69 |   create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
 70 |   read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
 71 |   update: /\b(update|edit|modify|change|patch|put)\b/i,
 72 |   delete: /\b(delete|remove|destroy)\b/i,
 73 |   list: /\b(list|all|index|collection)\b/i,
 74 |   health: /\b(health|status|ping|alive|ready|liveness|readiness)\b/i,
 75 |   auth: /\b(login|authenticate|sign\s*in|auth|token|session)\b/i,
 76 | };
 77 | 
 78 | /**
 79 |  * Common REST resource patterns
 80 |  */
 81 | const RESOURCE_PATTERNS = [
 82 |   /\b(user|account|profile|member)s?\b/i,
 83 |   /\b(order|purchase|transaction)s?\b/i,
 84 |   /\b(product|item|article)s?\b/i,
 85 |   /\b(invoice|bill|receipt)s?\b/i,
 86 |   /\b(appointment|booking|reservation)s?\b/i,
 87 |   /\b(task|todo|job)s?\b/i,
 88 |   /\b(payment|charge|refund)s?\b/i,
 89 |   /\b(comment|review|feedback)s?\b/i,
 90 |   /\b(post|article|blog)s?\b/i,
 91 |   /\b(message|notification|alert)s?\b/i,
 92 |   /\b(file|document|attachment)s?\b/i,
 93 |   /\b(category|tag|label)s?\b/i,
 94 |   /\b(customer|client|contact)s?\b/i,
 95 |   /\b(employee|staff|worker)s?\b/i,
 96 |   /\b(report|analytics|metric)s?\b/i,
 97 | ];
 98 | 
 99 | /**
100 |  * Extract keywords from text by tokenizing and filtering
101 |  */
102 | function extractKeywords(text: string): string[] {
103 |   // Convert to lowercase and split on non-alphanumeric characters
104 |   const tokens = text.toLowerCase()
105 |     .split(/[^a-z0-9]+/)
106 |     .filter(token => token.length > 2); // Filter out very short tokens
107 |   
108 |   // Remove common stop words
109 |   const stopWords = new Set([
110 |     'the', 'and', 'for', 'with', 'that', 'this', 'from', 'should',
111 |     'must', 'can', 'will', 'are', 'was', 'were', 'been', 'have',
112 |     'has', 'had', 'does', 'did', 'but', 'not', 'when', 'where',
113 |   ]);
114 |   
115 |   return tokens.filter(token => !stopWords.has(token));
116 | }
117 | 
118 | /**
119 |  * Detect resource and action from text using generic patterns
120 |  * 
121 |  * @param text - Text to analyze (acceptance criterion, task title, etc.)
122 |  * @returns Detected resource, action, and extracted keywords
123 |  * 
124 |  * @example
125 |  * ```typescript
126 |  * detectResourceAndAction("User should be able to register")
127 |  * // Returns: { resource: "user", action: "create", keywords: [...] }
128 |  * 
129 |  * detectResourceAndAction("System health check endpoint")
130 |  * // Returns: { resource: null, action: "health", keywords: [...] }
131 |  * ```
132 |  */
133 | export function detectResourceAndAction(text: string): ResourceAction {
134 |   const keywords = extractKeywords(text);
135 |   
136 |   // Detect action
137 |   let action: ResourceAction['action'] = null;
138 |   for (const [actionType, pattern] of Object.entries(ACTION_PATTERNS)) {
139 |     if (pattern.test(text)) {
140 |       action = actionType as ResourceAction['action'];
141 |       break;
142 |     }
143 |   }
144 |   
145 |   // Detect resource
146 |   let resource: string | null = null;
147 |   for (const pattern of RESOURCE_PATTERNS) {
148 |     const match = text.match(pattern);
149 |     if (match) {
150 |       resource = match[1].toLowerCase();
151 |       break;
152 |     }
153 |   }
154 |   
155 |   return { resource, action, keywords };
156 | }
157 | 
158 | /**
159 |  * Calculate similarity score between two sets of keywords
160 |  */
161 | function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
162 |   if (keywords1.length === 0 || keywords2.length === 0) {
163 |     return 0;
164 |   }
165 |   
166 |   const set1 = new Set(keywords1);
167 |   const set2 = new Set(keywords2);
168 |   
169 |   let matches = 0;
170 |   for (const keyword of set1) {
171 |     if (set2.has(keyword)) {
172 |       matches++;
173 |     }
174 |   }
175 |   
176 |   // Jaccard similarity
177 |   const union = new Set([...set1, ...set2]);
178 |   return matches / union.size;
179 | }
180 | 
181 | /**
182 |  * Check if a route path matches a resource name
183 |  */
184 | function pathMatchesResource(path: string, resource: string | null): boolean {
185 |   if (!resource) return false;
186 |   
187 |   const pathLower = path.toLowerCase();
188 |   const resourceLower = resource.toLowerCase();
189 |   
190 |   // Check for exact match or plural form
191 |   return pathLower.includes(resourceLower) || 
192 |          pathLower.includes(resourceLower + 's') ||
193 |          pathLower.includes(resourceLower + 'es');
194 | }
195 | 
196 | /**
197 |  * Infer HTTP method from action type
198 |  */
199 | function inferMethodFromAction(action: ResourceAction['action']): string | null {
200 |   if (!action) return null;
201 |   
202 |   const methods = ACTION_TO_METHOD_MAP[action];
203 |   return methods ? methods[0] : null;
204 | }
205 | 
206 | /**
207 |  * Match a route to a task using generic semantic matching
208 |  * 
209 |  * This function analyzes the task and acceptance criterion text to find
210 |  * the most appropriate route from the discovered routes. It uses keyword
211 |  * extraction, resource detection, and action inference to make intelligent
212 |  * matches without hardcoding specific endpoints.
213 |  * 
214 |  * @param task - The QA task to match
215 |  * @param acceptanceCriterion - The acceptance criterion being tested
216 |  * @param discoveredRoutes - List of routes discovered from the application
217 |  * @param openApiSpec - Optional OpenAPI specification for additional context
218 |  * @returns Match result with confidence level and reasoning
219 |  * 
220 |  * @example
221 |  * ```typescript
222 |  * const result = matchRouteToTask(
223 |  *   task,
224 |  *   { id: 'AC-1', description: 'User can register with valid email' },
225 |  *   discoveredRoutes
226 |  * );
227 |  * 
228 |  * if (result.matched && result.confidence === 'high') {
229 |  *   console.log(`Matched to ${result.route.path} with ${result.method}`);
230 |  * }
231 |  * ```
232 |  */
233 | export function matchRouteToTask(
234 |   task: QATask,
235 |   acceptanceCriterion: AcceptanceCriterion,
236 |   discoveredRoutes: DiscoveredRoute[],
237 |   openApiSpec?: any
238 | ): RouteMatchResult {
239 |   // Combine text from task and acceptance criterion
240 |   const combinedText = `${task.title} ${acceptanceCriterion.description}`;
241 |   
242 |   // Detect resource and action
243 |   const { resource, action, keywords } = detectResourceAndAction(combinedText);
244 |   
245 |   // Infer expected HTTP method
246 |   const expectedMethod = inferMethodFromAction(action);
247 |   
248 |   if (discoveredRoutes.length === 0) {
249 |     return {
250 |       matched: false,
251 |       confidence: 'low',
252 |       route: null,
253 |       method: expectedMethod,
254 |       reasoning: 'No routes discovered from the application',
255 |     };
256 |   }
257 |   
258 |   // Score each route
259 |   interface ScoredRoute {
260 |     route: DiscoveredRoute;
261 |     score: number;
262 |     methodMatch: boolean;
263 |     pathMatch: boolean;
264 |     keywordSimilarity: number;
265 |   }
266 |   
267 |   const scoredRoutes: ScoredRoute[] = discoveredRoutes.map(route => {
268 |     const routeKeywords = extractKeywords(route.path + ' ' + (route.description || ''));
269 |     const keywordSimilarity = calculateKeywordSimilarity(keywords, routeKeywords);
270 |     const methodMatch = !expectedMethod || route.method.toUpperCase() === expectedMethod.toUpperCase();
271 |     const pathMatch = pathMatchesResource(route.path, resource);
272 |     
273 |     // Calculate score
274 |     let score = 0;
275 |     if (methodMatch) score += 40;
276 |     if (pathMatch) score += 40;
277 |     score += keywordSimilarity * 20;
278 |     
279 |     // Bonus for OpenAPI description match
280 |     if (openApiSpec && route.description) {
281 |       const descKeywords = extractKeywords(route.description);
282 |       const descSimilarity = calculateKeywordSimilarity(keywords, descKeywords);
283 |       score += descSimilarity * 10;
284 |     }
285 |     
286 |     return {
287 |       route,
288 |       score,
289 |       methodMatch,
290 |       pathMatch,
291 |       keywordSimilarity,
292 |     };
293 |   });
294 |   
295 |   // Sort by score
296 |   scoredRoutes.sort((a, b) => b.score - a.score);
297 |   
298 |   const bestMatch = scoredRoutes[0];
299 |   
300 |   if (bestMatch.score === 0) {
301 |     return {
302 |       matched: false,
303 |       confidence: 'low',
304 |       route: null,
305 |       method: expectedMethod,
306 |       reasoning: 'No routes matched the task criteria',
307 |     };
308 |   }
309 |   
310 |   // Determine confidence level
311 |   let confidence: 'high' | 'medium' | 'low';
312 |   let reasoning: string;
313 |   
314 |   if (bestMatch.score >= 80) {
315 |     confidence = 'high';
316 |     reasoning = `Exact match: method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
317 |   } else if (bestMatch.score >= 50) {
318 |     confidence = 'medium';
319 |     reasoning = `Partial match: method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
320 |   } else {
321 |     confidence = 'low';
322 |     reasoning = `Weak match: method=${bestMatch.methodMatch}, path=${bestMatch.pathMatch}, keywords=${(bestMatch.keywordSimilarity * 100).toFixed(0)}%`;
323 |   }
324 |   
325 |   return {
326 |     matched: true,
327 |     confidence,
328 |     route: bestMatch.route,
329 |     method: bestMatch.route.method,
330 |     reasoning,
331 |   };
332 | }
333 | 
334 | /**
335 |  * Check if a URL is valid (not a stringified object or malformed)
336 |  */
337 | function isValidUrl(url: string): boolean {
338 |   // Check if it looks like a stringified JSON object
339 |   if (url.trim().startsWith('{') || url.trim().startsWith('[')) {
340 |     return false;
341 |   }
342 |   
343 |   // Check if it contains common JSON patterns
344 |   if (/"statusCode":|"message":|"error":/i.test(url)) {
345 |     return false;
346 |   }
347 |   
348 |   // Must start with / or http(s)://
349 |   return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://');
350 | }
351 | 
352 | /**
353 |  * Normalize a relative URL with base URL
354 |  */
355 | function normalizeUrl(url: string, baseUrl: string): string {
356 |   if (url.startsWith('http://') || url.startsWith('https://')) {
357 |     return url;
358 |   }
359 |   
360 |   // Remove trailing slash from baseUrl
361 |   const base = baseUrl.replace(/\/$/, '');
362 |   
363 |   // Ensure url starts with /
364 |   const path = url.startsWith('/') ? url : '/' + url;
365 |   
366 |   return base + path;
367 | }
368 | 
369 | /**
370 |  * Infer expected status codes based on HTTP method and context
371 |  */
372 | function inferExpectedStatuses(
373 |   method: string,
374 |   context: string,
375 |   openApiSpec?: any
376 | ): { expectedStatus: number; acceptableStatuses: number[] } {
377 |   const methodUpper = method.toUpperCase();
378 |   const contextLower = context.toLowerCase();
379 |   
380 |   // Check for specific scenarios in context
381 |   if (contextLower.includes('invalid') || contextLower.includes('reject') || 
382 |       contextLower.includes('validation') || contextLower.includes('bad')) {
383 |     return { expectedStatus: 400, acceptableStatuses: [400, 422] };
384 |   }
385 |   
386 |   if (contextLower.includes('unauthorized') || contextLower.includes('not authenticated')) {
387 |     return { expectedStatus: 401, acceptableStatuses: [401] };
388 |   }
389 |   
390 |   if (contextLower.includes('forbidden') || contextLower.includes('not authorized')) {
391 |     return { expectedStatus: 403, acceptableStatuses: [403] };
392 |   }
393 |   
394 |   if (contextLower.includes('not found') || contextLower.includes('missing')) {
395 |     return { expectedStatus: 404, acceptableStatuses: [404] };
396 |   }
397 |   
398 |   if (contextLower.includes('duplicate') || contextLower.includes('conflict') || 
399 |       contextLower.includes('already exists')) {
400 |     return { expectedStatus: 409, acceptableStatuses: [409] };
401 |   }
402 |   
403 |   // Default success statuses by method
404 |   switch (methodUpper) {
405 |     case 'GET':
406 |       return { expectedStatus: 200, acceptableStatuses: [200] };
407 |     case 'POST':
408 |       return { expectedStatus: 201, acceptableStatuses: [200, 201] };
409 |     case 'PUT':
410 |     case 'PATCH':
411 |       return { expectedStatus: 200, acceptableStatuses: [200, 204] };
412 |     case 'DELETE':
413 |       return { expectedStatus: 204, acceptableStatuses: [200, 204] };
414 |     case 'HEAD':
415 |     case 'OPTIONS':
416 |       return { expectedStatus: 200, acceptableStatuses: [200, 204] };
417 |     default:
418 |       return { expectedStatus: 200, acceptableStatuses: [200] };
419 |   }
420 | }
421 | 
422 | /**
423 |  * Validate and normalize an HTTP test step
424 |  * 
425 |  * This function validates the structure and content of an HTTP test step,
426 |  * checking for common issues like invalid URLs, incorrect methods, or
427 |  * malformed data. It also normalizes the step by inferring missing values
428 |  * and providing sensible defaults.
429 |  * 
430 |  * @param step - The HTTP test step to validate
431 |  * @param discoveredRoutes - List of discovered routes for validation
432 |  * @param baseUrl - Base URL for normalizing relative URLs
433 |  * @returns Validation result with errors, warnings, and normalized values
434 |  * 
435 |  * @example
436 |  * ```typescript
437 |  * const result = validateAndNormalizeHTTPStep(
438 |  *   step,
439 |  *   discoveredRoutes,
440 |  *   'http://localhost:3000'
441 |  * );
442 |  * 
443 |  * if (!result.valid) {
444 |  *   console.error('Validation errors:', result.errors);
445 |  * } else {
446 |  *   // Use result.normalized for execution
447 |  * }
448 |  * ```
449 |  */
450 | export function validateAndNormalizeHTTPStep(
451 |   step: HTTPTestStep,
452 |   discoveredRoutes: DiscoveredRoute[],
453 |   baseUrl: string
454 | ): ValidationResult {
455 |   const errors: string[] = [];
456 |   const warnings: string[] = [];
457 |   const normalized: ValidationResult['normalized'] = {};
458 |   
459 |   // Validate method
460 |   const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
461 |   if (!validMethods.includes(step.method.toUpperCase())) {
462 |     errors.push(`Invalid HTTP method: ${step.method}. Must be one of: ${validMethods.join(', ')}`);
463 |   } else {
464 |     normalized.method = step.method.toUpperCase();
465 |   }
466 |   
467 |   // Validate URL
468 |   if (typeof step.url !== 'string') {
469 |     errors.push(`URL must be a string, got: ${typeof step.url}`);
470 |   } else if (!isValidUrl(step.url)) {
471 |     errors.push(`Invalid URL format: ${step.url}. URL appears to be a stringified object or malformed.`);
472 |   } else {
473 |     normalized.url = normalizeUrl(step.url, baseUrl);
474 |     
475 |     // Check if URL matches any discovered route
476 |     const urlPath = step.url.split('?')[0]; // Remove query params
477 |     const matchingRoute = discoveredRoutes.find(route => 
478 |       route.path === urlPath && route.method.toUpperCase() === step.method.toUpperCase()
479 |     );
480 |     
481 |     if (!matchingRoute && discoveredRoutes.length > 0) {
482 |       warnings.push(`URL ${urlPath} with method ${step.method} not found in discovered routes. This may indicate a typo or undiscovered endpoint.`);
483 |     }
484 |   }
485 |   
486 |   // Validate and normalize body
487 |   if (step.body !== null && step.body !== undefined) {
488 |     if (typeof step.body !== 'object' || Array.isArray(step.body)) {
489 |       warnings.push(`Body should be an object, got: ${typeof step.body}`);
490 |     }
491 |     normalized.body = step.body;
492 |   }
493 |   
494 |   // Validate and normalize expected status
495 |   if (step.expectedStatus) {
496 |     if (typeof step.expectedStatus !== 'number' || step.expectedStatus < 100 || step.expectedStatus > 599) {
497 |       errors.push(`Invalid expectedStatus: ${step.expectedStatus}. Must be a valid HTTP status code (100-599).`);
498 |     } else {
499 |       normalized.expectedStatus = step.expectedStatus;
500 |     }
501 |   } else {
502 |     // Infer expected status from method and description
503 |     const inferred = inferExpectedStatuses(step.method, step.description);
504 |     normalized.expectedStatus = inferred.expectedStatus;
505 |     warnings.push(`No expectedStatus provided. Inferred ${inferred.expectedStatus} based on method and context.`);
506 |   }
507 |   
508 |   // Validate and normalize acceptable statuses
509 |   if (step.acceptableStatuses && step.acceptableStatuses.length > 0) {
510 |     const invalidStatuses = step.acceptableStatuses.filter(
511 |       status => typeof status !== 'number' || status < 100 || status > 599
512 |     );
513 |     
514 |     if (invalidStatuses.length > 0) {
515 |       errors.push(`Invalid status codes in acceptableStatuses: ${invalidStatuses.join(', ')}`);
516 |     } else {
517 |       normalized.acceptableStatuses = step.acceptableStatuses;
518 |     }
519 |   } else {
520 |     // Infer acceptable statuses
521 |     const inferred = inferExpectedStatuses(step.method, step.description);
522 |     normalized.acceptableStatuses = inferred.acceptableStatuses;
523 |     
524 |     if (!step.expectedStatus) {
525 |       warnings.push(`No acceptableStatuses provided. Inferred ${JSON.stringify(inferred.acceptableStatuses)} based on method and context.`);
526 |     }
527 |   }
528 |   
529 |   return {
530 |     valid: errors.length === 0,
531 |     errors,
532 |     warnings,
533 |     normalized,
534 |   };
535 | }
536 | 
537 | /**
538 |  * Detect if a test scenario requires multiple steps
539 |  * 
540 |  * This function analyzes the test context to determine if it needs
541 |  * setup steps before the main action. For example, testing duplicate
542 |  * creation requires creating the resource first, then attempting to
543 |  * create it again.
544 |  * 
545 |  * @param context - Combined text from task and acceptance criterion
546 |  * @returns Object indicating if multi-step is needed and what type
547 |  */
548 | export function detectMultiStepRequirement(context: string): {
549 |   requiresMultiStep: boolean;
550 |   setupAction: 'create' | 'login' | null;
551 |   mainAction: 'create' | 'update' | 'delete' | 'read' | null;
552 |   reasoning: string;
553 | } {
554 |   const contextLower = context.toLowerCase();
555 |   
556 |   // Duplicate/conflict scenarios
557 |   if (contextLower.includes('duplicate') || contextLower.includes('already exists') || 
558 |       contextLower.includes('conflict')) {
559 |     return {
560 |       requiresMultiStep: true,
561 |       setupAction: 'create',
562 |       mainAction: 'create',
563 |       reasoning: 'Duplicate/conflict test requires creating resource first, then attempting duplicate creation',
564 |     };
565 |   }
566 |   
567 |   // Update scenarios
568 |   if (contextLower.includes('update') || contextLower.includes('modify') || 
569 |       contextLower.includes('edit')) {
570 |     return {
571 |       requiresMultiStep: true,
572 |       setupAction: 'create',
573 |       mainAction: 'update',
574 |       reasoning: 'Update test requires creating resource first, then updating it',
575 |     };
576 |   }
577 |   
578 |   // Delete scenarios
579 |   if (contextLower.includes('delete') || contextLower.includes('remove')) {
580 |     return {
581 |       requiresMultiStep: true,
582 |       setupAction: 'create',
583 |       mainAction: 'delete',
584 |       reasoning: 'Delete test requires creating resource first, then deleting it',
585 |     };
586 |   }
587 |   
588 |   // Auth-dependent scenarios
589 |   if (contextLower.includes('authenticated') || contextLower.includes('logged in') ||
590 |       contextLower.includes('authorized')) {
591 |     return {
592 |       requiresMultiStep: true,
593 |       setupAction: 'login',
594 |       mainAction: 'read',
595 |       reasoning: 'Auth-dependent test requires login first, then performing action',
596 |     };
597 |   }
598 |   
599 |   return {
600 |     requiresMultiStep: false,
601 |     setupAction: null,
602 |     mainAction: null,
603 |     reasoning: 'Single-step test sufficient',
604 |   };
605 | }
606 | 
607 | // Made with Bob
</content>
</file>
<file><path>src/generators/http-test-generator.ts</path>
<content lines="1-878">
  1 | /**
  2 |  * HTTP Test Generator
  3 |  * 
  4 |  * Generates executable HTTP tests from QA tasks with proper validation,
  5 |  * normalization, and multi-step support. Integrates with IBM watsonx.ai
  6 |  * for intelligent test generation with robust fallback logic.
  7 |  * 
  8 |  * @module http-test-generator
  9 |  */
 10 | 
 11 | import type {
 12 |   QATask,
 13 |   QATaskPlan,
 14 |   AcceptanceCriterion,
 15 |   DiscoveredRoute,
 16 |   TraceQAConfig,
 17 |   GeneratedHTTPTest,
 18 |   GeneratedHTTPTestSuite,
 19 |   HTTPTestStep,
 20 | } from '../types/index.js';
 21 | import { WatsonxClient } from '../agent/watsonx-client.js';
 22 | import {
 23 |   matchRouteToTask,
 24 |   validateAndNormalizeHTTPStep,
 25 |   detectMultiStepRequirement,
 26 |   type RouteMatchResult,
 27 |   type ValidationResult,
 28 | } from '../validation/route-matcher.js';
 29 | import {
 30 |   generateRequestBody,
 31 |   generateStatefulBody,
 32 |   type BodyGenerationResult,
 33 |   type TestDataContext,
 34 | } from '../validation/body-generator.js';
 35 | import { logger } from '../utils/logger.js';
 36 | import { extractJSON, safeExtractJSON } from '../utils/json-extractor.js';
 37 | import { writeFileSync, mkdirSync } from 'fs';
 38 | import { join } from 'path';
 39 | 
 40 | /**
 41 |  * Result of HTTP test generation
 42 |  */
 43 | export interface HTTPTestGenerationResult {
 44 |   testSuite: GeneratedHTTPTestSuite;
 45 |   warnings: string[];
 46 |   ibmUsed: boolean;
 47 |   normalizationApplied: boolean;
 48 | }
 49 | 
 50 | /**
 51 |  * Project context for test generation
 52 |  */
 53 | export interface ProjectContext {
 54 |   baseUrl: string;
 55 |   openApiSpec?: any;
 56 | }
 57 | 
 58 | /**
 59 |  * Generate HTTP tests from QA task plan
 60 |  * 
 61 |  * Main entry point for HTTP test generation. Takes a QA task plan and
 62 |  * generates executable HTTP tests with proper validation and normalization.
 63 |  * 
 64 |  * @param taskPlan - QA task plan containing tasks to generate tests for
 65 |  * @param discoveredRoutes - Routes discovered from the application
 66 |  * @param config - TraceQA configuration
 67 |  * @param projectContext - Project context with base URL and optional OpenAPI spec
 68 |  * @returns HTTP test generation result with test suite and metadata
 69 |  * 
 70 |  * @example
 71 |  * ```typescript
 72 |  * const result = await generateHTTPTests(
 73 |  *   taskPlan,
 74 |  *   discoveredRoutes,
 75 |  *   config,
 76 |  *   { baseUrl: 'http://localhost:3000' }
 77 |  * );
 78 |  * 
 79 |  * console.log(`Generated ${result.testSuite.tests.length} tests`);
 80 |  * console.log(`IBM used: ${result.ibmUsed}`);
 81 |  * ```
 82 |  */
 83 | export async function generateHTTPTests(
 84 |   taskPlan: QATaskPlan,
 85 |   discoveredRoutes: DiscoveredRoute[],
 86 |   config: TraceQAConfig,
 87 |   projectContext: ProjectContext
 88 | ): Promise<HTTPTestGenerationResult> {
 89 |   logger.info('Generating HTTP tests from QA task plan...');
 90 |   
 91 |   const warnings: string[] = [];
 92 |   let ibmUsed = false;
 93 |   let normalizationApplied = false;
 94 |   const tests: GeneratedHTTPTest[] = [];
 95 | 
 96 |   // Initialize IBM client if available
 97 |   let watsonxClient: WatsonxClient | null = null;
 98 |   if (config.ibmWatsonxApiKey) {
 99 |     try {
100 |       watsonxClient = new WatsonxClient({
101 |         apiKey: config.ibmWatsonxApiKey,
102 |         model: process.env.IBM_WATSONX_MODEL || 'ibm/granite-3-3-8b-instruct',
103 |         temperature: 0.3, // Lower temperature for more consistent test generation
104 |         maxTokens: 2048,
105 |       });
106 |       logger.debug('IBM watsonx.ai client initialized for test generation');
107 |     } catch (error) {
108 |       logger.warn('Failed to initialize IBM client, will use fallback generation');
109 |       warnings.push('IBM watsonx.ai unavailable - using fallback test generation');
110 |     }
111 |   }
112 | 
113 |   // Generate tests for each task
114 |   for (const task of taskPlan.tasks) {
115 |     // Find the acceptance criterion for this task
116 |     const acceptanceCriterion = taskPlan.acceptanceCriteria.find(
117 |       ac => ac.id === task.acceptanceCriterionId
118 |     );
119 | 
120 |     if (!acceptanceCriterion) {
121 |       logger.warn(`No acceptance criterion found for task ${task.taskId}`);
122 |       warnings.push(`Task ${task.taskId}: No acceptance criterion found`);
123 |       continue;
124 |     }
125 | 
126 |     // Skip non-API tasks
127 |     if (task.type === 'ui' || task.type === 'integration') {
128 |       logger.debug(`Skipping ${task.type} task ${task.taskId}`);
129 |       continue;
130 |     }
131 | 
132 |     try {
133 |       const test = await generateTestFromTask(
134 |         task,
135 |         acceptanceCriterion,
136 |         discoveredRoutes,
137 |         config,
138 |         projectContext,
139 |         watsonxClient
140 |       );
141 | 
142 |       tests.push(test);
143 | 
144 |       // Track if IBM was used
145 |       if (test.steps.some(step => step.description.includes('IBM'))) {
146 |         ibmUsed = true;
147 |       }
148 | 
149 |       // Track if normalization was applied
150 |       if (test.uncertainReason?.includes('normalized') || 
151 |           test.uncertainReason?.includes('inferred')) {
152 |         normalizationApplied = true;
153 |       }
154 |     } catch (error) {
155 |       logger.error(`Failed to generate test for task ${task.taskId}:`, error);
156 |       warnings.push(`Task ${task.taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
157 |     }
158 |   }
159 | 
160 |   // Generate summary
161 |   const summary = generateTestSummary(tests);
162 | 
163 |   const testSuite: GeneratedHTTPTestSuite = {
164 |     projectName: taskPlan.projectName,
165 |     timestamp: new Date().toISOString(),
166 |     baseUrl: projectContext.baseUrl,
167 |     tests,
168 |     summary,
169 |   };
170 | 
171 |   logger.success(`Generated ${tests.length} HTTP tests`);
172 |   logger.info(`Ready: ${summary.readyTests}, Uncertain: ${summary.uncertainTests}, Manual: ${summary.manualTests}`);
173 | 
174 |   return {
175 |     testSuite,
176 |     warnings,
177 |     ibmUsed,
178 |     normalizationApplied,
179 |   };
180 | }
181 | 
182 | /**
183 |  * Generate a single HTTP test from a QA task
184 |  * 
185 |  * @param task - QA task to generate test for
186 |  * @param acceptanceCriterion - Acceptance criterion being tested
187 |  * @param discoveredRoutes - Routes discovered from the application
188 |  * @param config - TraceQA configuration
189 |  * @param projectContext - Project context
190 |  * @param watsonxClient - Optional IBM watsonx.ai client
191 |  * @returns Generated HTTP test
192 |  */
193 | async function generateTestFromTask(
194 |   task: QATask,
195 |   acceptanceCriterion: AcceptanceCriterion,
196 |   discoveredRoutes: DiscoveredRoute[],
197 |   config: TraceQAConfig,
198 |   projectContext: ProjectContext,
199 |   watsonxClient: WatsonxClient | null
200 | ): Promise<GeneratedHTTPTest> {
201 |   logger.debug(`Generating test for task ${task.taskId}: ${task.title}`);
202 | 
203 |   // Match route to task
204 |   const routeMatch = matchRouteToTask(
205 |     task,
206 |     acceptanceCriterion,
207 |     discoveredRoutes,
208 |     projectContext.openApiSpec
209 |   );
210 | 
211 |   // Try IBM generation first if available
212 |   let ibmSteps: any[] | null = null;
213 |   if (watsonxClient && routeMatch.matched) {
214 |     try {
215 |       ibmSteps = await generateTestStepsWithIBM(
216 |         task,
217 |         acceptanceCriterion,
218 |         routeMatch,
219 |         projectContext.baseUrl,
220 |         watsonxClient
221 |       );
222 |     } catch (error) {
223 |       logger.debug(`IBM generation failed for task ${task.taskId}, using fallback`);
224 |     }
225 |   }
226 | 
227 |   // Validate and normalize IBM steps or generate fallback
228 |   let steps: HTTPTestStep[];
229 |   let bodyGenerationResults: BodyGenerationResult[] = [];
230 |   let testWarnings: string[] = [];
231 | 
232 |   if (ibmSteps && ibmSteps.length > 0) {
233 |     const validation = validateAndNormalizeTestSteps(
234 |       ibmSteps,
235 |       task,
236 |       acceptanceCriterion,
237 |       discoveredRoutes,
238 |       config,
239 |       projectContext.baseUrl
240 |     );
241 | 
242 |     steps = validation.normalizedSteps;
243 |     testWarnings = [...validation.warnings, ...validation.errors];
244 |     
245 |     // Generate bodies for steps that need them
246 |     for (const step of steps) {
247 |       if (['POST', 'PUT', 'PATCH'].includes(step.method) && !step.body) {
248 |         const bodyResult = generateRequestBody(
249 |           step.method,
250 |           routeMatch.route,
251 |           task,
252 |           acceptanceCriterion,
253 |           config,
254 |           projectContext.openApiSpec
255 |         );
256 |         step.body = bodyResult.body;
257 |         bodyGenerationResults.push(bodyResult);
258 |         testWarnings.push(...bodyResult.warnings);
259 |       }
260 |     }
261 |   } else {
262 |     // Fallback generation
263 |     const fallbackTest = generateFallbackTest(
264 |       task,
265 |       acceptanceCriterion,
266 |       discoveredRoutes,
267 |       config,
268 |       projectContext.baseUrl
269 |     );
270 |     
271 |     steps = fallbackTest.steps;
272 |     testWarnings.push('Generated using fallback logic - IBM unavailable or failed');
273 |   }
274 | 
275 |   // Determine test status
276 |   const statusResult = determineTestStatus(
277 |     task,
278 |     steps,
279 |     routeMatch,
280 |     bodyGenerationResults
281 |   );
282 | 
283 |   // Build the test
284 |   const test: GeneratedHTTPTest = {
285 |     id: `TC-${task.taskId.replace('QA-', '')}`,
286 |     qaTaskId: task.taskId,
287 |     acceptanceCriterionId: task.acceptanceCriterionId,
288 |     title: task.title,
289 |     type: task.type === 'uncertain' ? 'api' : task.type,
290 |     steps,
291 |     status: statusResult.status,
292 |     uncertainReason: statusResult.uncertainReason || undefined,
293 |   };
294 | 
295 |   return test;
296 | }
297 | 
298 | /**
299 |  * Generate test steps using IBM watsonx.ai
300 |  * 
301 |  * @param task - QA task
302 |  * @param acceptanceCriterion - Acceptance criterion
303 |  * @param routeMatch - Matched route result
304 |  * @param baseUrl - Base URL for the API
305 |  * @param watsonxClient - IBM watsonx.ai client
306 |  * @returns Array of test steps or null if generation failed
307 |  */
308 | async function generateTestStepsWithIBM(
309 |   task: QATask,
310 |   acceptanceCriterion: AcceptanceCriterion,
311 |   routeMatch: RouteMatchResult,
312 |   baseUrl: string,
313 |   watsonxClient: WatsonxClient
314 | ): Promise<any[] | null> {
315 |   const prompt = buildHTTPTestPrompt(
316 |     task,
317 |     acceptanceCriterion,
318 |     routeMatch.route,
319 |     baseUrl
320 |   );
321 | 
322 |   logger.debug('Requesting test steps from IBM watsonx.ai...');
323 | 
324 |   try {
325 |     const response = await watsonxClient.sendMessage(prompt, {
326 |       temperature: 0.3,
327 |       maxTokens: 2048,
328 |     });
329 | 
330 |     // Save raw response for debugging
331 |     saveRawIBMResponse(response, task.taskId);
332 | 
333 |     // Extract JSON from response
334 |     const extracted = safeExtractJSON(response);
335 |     
336 |     if (!extracted.success || !extracted.data) {
337 |       logger.warn(`Failed to extract JSON from IBM response for task ${task.taskId}`);
338 |       return null;
339 |     }
340 | 
341 |     // Validate structure
342 |     const data = extracted.data;
343 |     if (!data.steps || !Array.isArray(data.steps)) {
344 |       logger.warn(`IBM response missing 'steps' array for task ${task.taskId}`);
345 |       return null;
346 |     }
347 | 
348 |     logger.debug(`IBM generated ${data.steps.length} test steps`);
349 |     return data.steps;
350 |   } catch (error) {
351 |     logger.error(`IBM test generation failed for task ${task.taskId}:`, error);
352 |     return null;
353 |   }
354 | }
355 | 
356 | /**
357 |  * Build prompt for IBM watsonx.ai to generate HTTP test steps
358 |  * 
359 |  * @param task - QA task
360 |  * @param acceptanceCriterion - Acceptance criterion
361 |  * @param matchedRoute - Matched route (or null)
362 |  * @param baseUrl - Base URL for the API
363 |  * @returns Formatted prompt string
364 |  */
365 | function buildHTTPTestPrompt(
366 |   task: QATask,
367 |   acceptanceCriterion: AcceptanceCriterion,
368 |   matchedRoute: DiscoveredRoute | null,
369 |   baseUrl: string
370 | ): string {
371 |   const routeInfo = matchedRoute
372 |     ? `Matched Route: ${matchedRoute.method} ${matchedRoute.path}`
373 |     : 'No specific route matched - infer from task description';
374 | 
375 |   return `Generate HTTP test steps for the following QA task.
376 | 
377 | Task: ${task.title}
378 | Acceptance Criterion: ${acceptanceCriterion.description}
379 | Expected Result: ${task.expectedResult}
380 | ${routeInfo}
381 | Base URL: ${baseUrl}
382 | 
383 | Generate a JSON object with the following structure:
384 | {
385 |   "steps": [
386 |     {
387 |       "description": "Step description",
388 |       "method": "HTTP method (GET, POST, PUT, PATCH, DELETE)",
389 |       "url": "Relative URL path (e.g., /api/users)",
390 |       "headers": { "Content-Type": "application/json" },
391 |       "body": { "field": "value" } or null,
392 |       "expectedStatus": 200,
393 |       "expectedBodyContains": ["expected", "values"] or null
394 |     }
395 |   ],
396 |   "reasoning": "Why these steps test the acceptance criterion"
397 | }
398 | 
399 | Requirements:
400 | - Use the matched route if provided
401 | - Include setup steps if needed (e.g., create before update/delete)
402 | - For duplicate/conflict tests, create resource first, then attempt duplicate
403 | - Use realistic test data with unique identifiers
404 | - Set appropriate expected status codes
405 | - Include expected response patterns when relevant
406 | - Keep URLs as relative paths (e.g., /api/users, not full URLs)
407 | 
408 | Return ONLY the JSON object, no additional text.`;
409 | }
410 | 
411 | /**
412 |  * Validate and normalize test steps from IBM or other sources
413 |  * 
414 |  * @param steps - Raw test steps to validate
415 |  * @param task - QA task
416 |  * @param acceptanceCriterion - Acceptance criterion
417 |  * @param discoveredRoutes - Discovered routes
418 |  * @param config - TraceQA configuration
419 |  * @param baseUrl - Base URL
420 |  * @returns Validation result with normalized steps
421 |  */
422 | function validateAndNormalizeTestSteps(
423 |   steps: any[],
424 |   task: QATask,
425 |   acceptanceCriterion: AcceptanceCriterion,
426 |   discoveredRoutes: DiscoveredRoute[],
427 |   config: TraceQAConfig,
428 |   baseUrl: string
429 | ): {
430 |   normalizedSteps: HTTPTestStep[];
431 |   warnings: string[];
432 |   errors: string[];
433 | } {
434 |   const normalizedSteps: HTTPTestStep[] = [];
435 |   const warnings: string[] = [];
436 |   const errors: string[] = [];
437 | 
438 |   for (let i = 0; i < steps.length; i++) {
439 |     const step = steps[i];
440 |     const stepNum = i + 1;
441 | 
442 |     // Validate required fields
443 |     if (!step.method) {
444 |       errors.push(`Step ${stepNum}: Missing method`);
445 |       continue;
446 |     }
447 |     if (!step.url) {
448 |       errors.push(`Step ${stepNum}: Missing URL`);
449 |       continue;
450 |     }
451 | 
452 |     // Create HTTPTestStep for validation
453 |     const httpStep: HTTPTestStep = {
454 |       stepId: `${task.taskId}-S${stepNum}`,
455 |       description: step.description || `Step ${stepNum}`,
456 |       method: step.method,
457 |       url: step.url,
458 |       headers: step.headers || { 'Content-Type': 'application/json' },
459 |       body: step.body || null,
460 |       expectedStatus: step.expectedStatus || 200,
461 |       acceptableStatuses: step.acceptableStatuses || [],
462 |       expectedBodyContains: step.expectedBodyContains || null,
463 |     };
464 | 
465 |     // Validate and normalize using route-matcher
466 |     const validation = validateAndNormalizeHTTPStep(
467 |       httpStep,
468 |       discoveredRoutes,
469 |       baseUrl
470 |     );
471 | 
472 |     if (!validation.valid) {
473 |       errors.push(...validation.errors.map(e => `Step ${stepNum}: ${e}`));
474 |       continue;
475 |     }
476 | 
477 |     warnings.push(...validation.warnings.map(w => `Step ${stepNum}: ${w}`));
478 | 
479 |     // Apply normalized values
480 |     if (validation.normalized.method) {
481 |       httpStep.method = validation.normalized.method as HTTPTestStep['method'];
482 |     }
483 |     if (validation.normalized.url) {
484 |       httpStep.url = validation.normalized.url;
485 |     }
486 |     if (validation.normalized.body !== undefined) {
487 |       httpStep.body = validation.normalized.body;
488 |     }
489 |     if (validation.normalized.expectedStatus) {
490 |       httpStep.expectedStatus = validation.normalized.expectedStatus;
491 |     }
492 |     if (validation.normalized.acceptableStatuses) {
493 |       httpStep.acceptableStatuses = validation.normalized.acceptableStatuses;
494 |     }
495 | 
496 |     // Validate body for POST/PUT/PATCH
497 |     if (['POST', 'PUT', 'PATCH'].includes(httpStep.method)) {
498 |       if (!httpStep.body || Object.keys(httpStep.body).length === 0) {
499 |         warnings.push(`Step ${stepNum}: ${httpStep.method} request has empty body`);
500 |       }
501 |     }
502 | 
503 |     normalizedSteps.push(httpStep);
504 |   }
505 | 
506 |   return { normalizedSteps, warnings, errors };
507 | }
508 | 
509 | /**
510 |  * Generate multi-step test for scenarios requiring setup
511 |  * 
512 |  * @param task - QA task
513 |  * @param acceptanceCriterion - Acceptance criterion
514 |  * @param route - Discovered route
515 |  * @param config - TraceQA configuration
516 |  * @param baseUrl - Base URL
517 |  * @returns Array of HTTP test steps
518 |  */
519 | function generateMultiStepTest(
520 |   task: QATask,
521 |   acceptanceCriterion: AcceptanceCriterion,
522 |   route: DiscoveredRoute,
523 |   config: TraceQAConfig,
524 |   baseUrl: string
525 | ): HTTPTestStep[] {
526 |   const steps: HTTPTestStep[] = [];
527 |   const context = `${task.title} ${acceptanceCriterion.description}`;
528 |   const multiStepReq = detectMultiStepRequirement(context);
529 | 
530 |   if (!multiStepReq.requiresMultiStep) {
531 |     // Single step test
532 |     const bodyResult = generateRequestBody(
533 |       route.method,
534 |       route,
535 |       task,
536 |       acceptanceCriterion,
537 |       config
538 |     );
539 | 
540 |     steps.push({
541 |       stepId: `${task.taskId}-S1`,
542 |       description: task.title,
543 |       method: route.method as HTTPTestStep['method'],
544 |       url: `${baseUrl}${route.path}`,
545 |       headers: { 'Content-Type': 'application/json' },
546 |       body: bodyResult.body,
547 |       expectedStatus: route.method === 'POST' ? 201 : 200,
548 |       acceptableStatuses: route.method === 'POST' ? [200, 201] : [200],
549 |     });
550 | 
551 |     return steps;
552 |   }
553 | 
554 |   // Multi-step test
555 |   const testId = task.taskId;
556 |   const timestamp = Date.now().toString();
557 |   const testDataContext: TestDataContext = {
558 |     setupData: {},
559 |     testId,
560 |     timestamp,
561 |   };
562 | 
563 |   // Step 1: Setup (create resource)
564 |   if (multiStepReq.setupAction === 'create') {
565 |     const setupBodyResult = generateRequestBody(
566 |       'POST',
567 |       route,
568 |       task,
569 |       acceptanceCriterion,
570 |       config
571 |     );
572 | 
573 |     const setupBody = generateStatefulBody(
574 |       'setup',
575 |       testDataContext,
576 |       setupBodyResult.body || {}
577 |     );
578 | 
579 |     steps.push({
580 |       stepId: `${task.taskId}-S1`,
581 |       description: 'Setup: Create resource',
582 |       method: 'POST',
583 |       url: `${baseUrl}${route.path}`,
584 |       headers: { 'Content-Type': 'application/json' },
585 |       body: setupBody,
586 |       expectedStatus: 201,
587 |       acceptableStatuses: [200, 201],
588 |     });
589 |   }
590 | 
591 |   // Step 2: Main action
592 |   if (multiStepReq.mainAction === 'create') {
593 |     // Duplicate/conflict scenario
594 |     const conflictBody = generateStatefulBody(
595 |       'conflict',
596 |       testDataContext,
597 |       testDataContext.setupData
598 |     );
599 | 
600 |     steps.push({
601 |       stepId: `${task.taskId}-S2`,
602 |       description: 'Attempt duplicate creation (expect conflict)',
603 |       method: 'POST',
604 |       url: `${baseUrl}${route.path}`,
605 |       headers: { 'Content-Type': 'application/json' },
606 |       body: conflictBody,
607 |       expectedStatus: 409,
608 |       acceptableStatuses: [409],
609 |     });
610 |   } else if (multiStepReq.mainAction === 'update') {
611 |     const updateBody = generateStatefulBody(
612 |       'action',
613 |       testDataContext,
614 |       testDataContext.setupData
615 |     );
616 | 
617 |     steps.push({
618 |       stepId: `${task.taskId}-S2`,
619 |       description: 'Update resource',
620 |       method: 'PUT',
621 |       url: `${baseUrl}${route.path}`,
622 |       headers: { 'Content-Type': 'application/json' },
623 |       body: updateBody,
624 |       expectedStatus: 200,
625 |       acceptableStatuses: [200, 204],
626 |     });
627 |   } else if (multiStepReq.mainAction === 'delete') {
628 |     steps.push({
629 |       stepId: `${task.taskId}-S2`,
630 |       description: 'Delete resource',
631 |       method: 'DELETE',
632 |       url: `${baseUrl}${route.path}`,
633 |       headers: { 'Content-Type': 'application/json' },
634 |       body: null,
635 |       expectedStatus: 204,
636 |       acceptableStatuses: [200, 204],
637 |     });
638 |   }
639 | 
640 |   return steps;
641 | }
642 | 
643 | /**
644 |  * Determine test status based on confidence levels
645 |  * 
646 |  * @param task - QA task
647 |  * @param steps - Generated test steps
648 |  * @param routeMatch - Route match result
649 |  * @param bodyGeneration - Body generation results
650 |  * @returns Test status and reason
651 |  */
652 | function determineTestStatus(
653 |   task: QATask,
654 |   steps: HTTPTestStep[],
655 |   routeMatch: RouteMatchResult,
656 |   bodyGeneration: BodyGenerationResult[]
657 | ): {
658 |   status: 'ready' | 'uncertain' | 'manual';
659 |   uncertainReason: string | null;
660 | } {
661 |   const reasons: string[] = [];
662 | 
663 |   // Check if task is already marked as uncertain or manual
664 |   if (task.executionMode === 'manual') {
665 |     return {
666 |       status: 'manual',
667 |       uncertainReason: 'Task marked for manual execution',
668 |     };
669 |   }
670 | 
671 |   if (task.type === 'uncertain') {
672 |     reasons.push('Task type is uncertain');
673 |   }
674 | 
675 |   // Check route match confidence
676 |   if (!routeMatch.matched) {
677 |     reasons.push('No route matched for this task');
678 |   } else if (routeMatch.confidence === 'low') {
679 |     reasons.push(`Route match confidence is low: ${routeMatch.reasoning}`);
680 |   }
681 | 
682 |   // Check body generation confidence
683 |   const lowConfidenceBodies = bodyGeneration.filter(bg => bg.confidence === 'low');
684 |   if (lowConfidenceBodies.length > 0) {
685 |     reasons.push(`${lowConfidenceBodies.length} request bodies generated with low confidence`);
686 |   }
687 | 
688 |   // Check for empty bodies on POST/PUT/PATCH
689 |   const emptyBodySteps = steps.filter(
690 |     step => ['POST', 'PUT', 'PATCH'].includes(step.method) && 
691 |             (!step.body || Object.keys(step.body).length === 0)
692 |   );
693 |   if (emptyBodySteps.length > 0) {
694 |     reasons.push(`${emptyBodySteps.length} steps have empty request bodies`);
695 |   }
696 | 
697 |   // Check for invalid URLs
698 |   const invalidUrlSteps = steps.filter(
699 |     step => !step.url || step.url.includes('{') || step.url.includes('"')
700 |   );
701 |   if (invalidUrlSteps.length > 0) {
702 |     reasons.push(`${invalidUrlSteps.length} steps have invalid URLs`);
703 |   }
704 | 
705 |   // Determine final status
706 |   if (reasons.length === 0) {
707 |     return { status: 'ready', uncertainReason: null };
708 |   }
709 | 
710 |   // If only minor issues, mark as uncertain
711 |   if (routeMatch.confidence === 'medium' && emptyBodySteps.length === 0) {
712 |     return {
713 |       status: 'uncertain',
714 |       uncertainReason: reasons.join('; '),
715 |     };
716 |   }
717 | 
718 |   // Major issues - mark as uncertain or manual
719 |   if (task.type === 'ui' || task.type === 'integration') {
720 |     return {
721 |       status: 'manual',
722 |       uncertainReason: `${task.type} task not suitable for HTTP testing`,
723 |     };
724 |   }
725 | 
726 |   return {
727 |     status: 'uncertain',
728 |     uncertainReason: reasons.join('; '),
729 |   };
730 | }
731 | 
732 | /**
733 |  * Generate test summary statistics
734 |  * 
735 |  * @param tests - Generated HTTP tests
736 |  * @returns Summary statistics
737 |  */
738 | function generateTestSummary(tests: GeneratedHTTPTest[]): {
739 |   totalTests: number;
740 |   readyTests: number;
741 |   uncertainTests: number;
742 |   manualTests: number;
743 | } {
744 |   return {
745 |     totalTests: tests.length,
746 |     readyTests: tests.filter(t => t.status === 'ready').length,
747 |     uncertainTests: tests.filter(t => t.status === 'uncertain').length,
748 |     manualTests: tests.filter(t => t.status === 'manual').length,
749 |   };
750 | }
751 | 
752 | /**
753 |  * Generate fallback test when IBM fails or is unavailable
754 |  * 
755 |  * @param task - QA task
756 |  * @param acceptanceCriterion - Acceptance criterion
757 |  * @param discoveredRoutes - Discovered routes
758 |  * @param config - TraceQA configuration
759 |  * @param baseUrl - Base URL
760 |  * @returns Generated HTTP test
761 |  */
762 | function generateFallbackTest(
763 |   task: QATask,
764 |   acceptanceCriterion: AcceptanceCriterion,
765 |   discoveredRoutes: DiscoveredRoute[],
766 |   config: TraceQAConfig,
767 |   baseUrl: string
768 | ): GeneratedHTTPTest {
769 |   logger.debug(`Generating fallback test for task ${task.taskId}`);
770 | 
771 |   // Match route
772 |   const routeMatch = matchRouteToTask(
773 |     task,
774 |     acceptanceCriterion,
775 |     discoveredRoutes
776 |   );
777 | 
778 |   let steps: HTTPTestStep[];
779 | 
780 |   if (routeMatch.matched && routeMatch.route) {
781 |     // Generate multi-step or single-step test
782 |     const context = `${task.title} ${acceptanceCriterion.description}`;
783 |     const multiStepReq = detectMultiStepRequirement(context);
784 | 
785 |     if (multiStepReq.requiresMultiStep) {
786 |       steps = generateMultiStepTest(
787 |         task,
788 |         acceptanceCriterion,
789 |         routeMatch.route,
790 |         config,
791 |         baseUrl
792 |       );
793 |     } else {
794 |       // Single step test
795 |       const bodyResult = generateRequestBody(
796 |         routeMatch.route.method,
797 |         routeMatch.route,
798 |         task,
799 |         acceptanceCriterion,
800 |         config
801 |       );
802 | 
803 |       steps = [{
804 |         stepId: `${task.taskId}-S1`,
805 |         description: task.title,
806 |         method: routeMatch.route.method as HTTPTestStep['method'],
807 |         url: `${baseUrl}${routeMatch.route.path}`,
808 |         headers: { 'Content-Type': 'application/json' },
809 |         body: bodyResult.body,
810 |         expectedStatus: routeMatch.route.method === 'POST' ? 201 : 200,
811 |         acceptableStatuses: routeMatch.route.method === 'POST' ? [200, 201] : [200],
812 |       }];
813 |     }
814 |   } else {
815 |     // No route matched - create minimal test
816 |     steps = [{
817 |       stepId: `${task.taskId}-S1`,
818 |       description: task.title,
819 |       method: 'GET',
820 |       url: `${baseUrl}/api/unknown`,
821 |       headers: { 'Content-Type': 'application/json' },
822 |       body: null,
823 |       expectedStatus: 200,
824 |       acceptableStatuses: [200],
825 |     }];
826 |   }
827 | 
828 |   // Determine status
829 |   const bodyGeneration: BodyGenerationResult[] = steps
830 |     .filter(s => s.body !== null)
831 |     .map(s => ({
832 |       body: s.body,
833 |       source: 'inferred' as const,
834 |       confidence: 'medium' as const,
835 |       warnings: [],
836 |     }));
837 | 
838 |   const statusResult = determineTestStatus(
839 |     task,
840 |     steps,
841 |     routeMatch,
842 |     bodyGeneration
843 |   );
844 | 
845 |   return {
846 |     id: `TC-${task.taskId.replace('QA-', '')}`,
847 |     qaTaskId: task.taskId,
848 |     acceptanceCriterionId: task.acceptanceCriterionId,
849 |     title: task.title,
850 |     type: task.type === 'uncertain' ? 'api' : task.type,
851 |     steps,
852 |     status: statusResult.status,
853 |     uncertainReason: statusResult.uncertainReason || 'Generated using fallback logic',
854 |   };
855 | }
856 | 
857 | /**
858 |  * Save raw IBM response for debugging
859 |  * 
860 |  * @param response - Raw response text
861 |  * @param taskId - Task ID for filename
862 |  */
863 | function saveRawIBMResponse(response: string, taskId: string): void {
864 |   try {
865 |     const debugDir = join(process.cwd(), 'traceqa-debug');
866 |     mkdirSync(debugDir, { recursive: true });
867 |     
868 |     const filename = `ibm-http-test-${taskId}-${Date.now()}.txt`;
869 |     const filepath = join(debugDir, filename);
870 |     
871 |     writeFileSync(filepath, response, 'utf-8');
872 |     logger.debug(`Saved raw IBM response to ${filepath}`);
873 |   } catch (error) {
874 |     logger.warn('Failed to save raw IBM response');
875 |   }
876 | }
877 | 
878 | // Made with Bob
</content>
</file>
<file><path>src/types/index.ts</path><file_outline>File: index.ts (1412 lines)

Enum: TestType (lines 13-18)
Interface: TestConfig (lines 23-32)
  Propertys: acceptanceCriteria, autoApprove, baseUrl, branch, description, outputDir, repository, testType
Interface: RepositoryInfo (lines 41-46)
  Propertys: branch, name, path, remote
Interface: FileChange (lines 51-56)
  Propertys: additions, deletions, path, type
Interface: ChangeSet (lines 61-67)
  Propertys: additions, deletions, diff, files, summary
Interface: TestContext (lines 76-82)
  Propertys: acceptanceCriteria, buildInfo, changes, description, repository
Interface: BuildInfo (lines 87-97)
  Propertys: buildCommand, duration, framework, language, output, port, startCommand, success, testCommand
Interface: TestPlan (lines 106-112)
  Propertys: createdAt, estimatedDuration, id, requiredResources, testCases
Interface: TestCase (lines 117-125)
  Propertys: description, expectedResult, id, name, priority, steps, type
Interface: TestStep (lines 130-135)
  Propertys: action, description, target, value
Interface: TestResult (lines 144-155)
  Propertys: acceptanceCriterionId, duration, error, logs, message, passed, screenshots, testCaseId, testCaseName, timestamp
Interface: TestSummary (lines 160-167)
  Propertys: duration, failed, passed, skipped, successRate, total
Interface: TestResults (lines 172-179)
  Propertys: duration, repository, results, summary, testPlan, timestamp
Interface: AcceptanceCriterion (lines 187-191)
  Propertys: description, id, priority
Interface: ParsedAcceptanceCriteria (lines 196-199)
  Propertys: criteria, rawContent
Interface: ExecutableHTTPTest (lines 208-219)
  Propertys: acceptanceCriterionId, body, expectedBodyContains, expectedBodySchema, expectedStatus, headers, id, method, title, url
Interface: GeneratedTestArtifacts (lines 224-233)
  Propertys: generatedAt, httpTests, metadata, qaTaskPlan
Interface: UserInput (lines 243-249)
  Propertys: acceptanceCriteria, confirmed, description, repository, testType
Interface: RepositoryOption (lines 254-258)
  Propertys: hint, label, value
Enum: ErrorCategory (lines 267-276)
Class: TraceQAError (lines 281-290)
  Propertys: category, details
  Constructor: constructor (lines 282-289)
Interface: SampleData (lines 302-307)
  Propertys: invalidEmail, validUser, weakPassword
Interface: TraceQAConfig (lines 312-330)
  Propertys: apiPrefix, baseUrl, defaultRepository, generatedDir, healthUrl, ibmWatsonxApiKey, maxRetries, mcpServers, outputDir, projectName, proofDir, reportFormat, retries, sampleData, testTimeout, timeout
Interface: TraceQAProjectConfig (lines 335-364)
  Propertys: autoBuild, autoInstall, autoStart, baseUrl, buildCommand, healthUrl, ibmWatsonxApiKey, ibmWatsonxModel, ibmWatsonxProjectId, ibmWatsonxUrl, installCommand, language, openapi, outputDir, projectType, retries, startCommand, testType, timeout
Interface: MCPServerConfig (lines 369-374)
  Propertys: args, command, env, name
Interface: AgentConfig (lines 383-393)
  Propertys: apiKey, conversationHistory, maxRetries, maxTokens, model, streamResponses, systemPrompt, temperature, timeout
Interface: AgentState (lines 398-407)
  Propertys: conversationHistory, currentPhase, executedTests, lastActivity, pendingDecisions, startTime, testPlan, tokenUsage
Interface: ConversationMessage (lines 412-421)
  Propertys: content, metadata, role, timestamp
Interface: TokenUsage (lines 426-431)
  Propertys: estimatedCost, inputTokens, outputTokens, totalTokens
Interface: AgentDecision (lines 436-444)
  Propertys: action, confidence, metadata, nextSteps, reasoning, requiresHumanInput, suggestions
Interface: AgentMessage (lines 449-453)
  Propertys: content, role, timestamp
Interface: WatsonxResponse (lines 458-467)
  Propertys: created_at, model_id, results
Interface: WatsonxStreamChunk (lines 472-483)
  Propertys: results, usage
Interface: TestPlanningRequest (lines 488-496)
  Propertys: constraints, context, requirements
Interface: TestExecutionRequest (lines 501-505)
  Propertys: context, retryCount, testCase
Interface: AgentAnalysis (lines 510-520)
  Propertys: confidence, findings, recommendations, risks, summary
Interface: ReportOptions (lines 525-531)
  Propertys: format, includeLogs, includeScreenshots, includeTokenUsage, outputPath
Enum: LogLevel (lines 552-558)
Enum: ProjectFramework (lines 567-579)
Enum: PackageManagerType (lines 584-589)
Enum: BuildMode (lines 594-598)
Enum: BrowserAction (lines 607-622)
Interface: MCPConfig (lines 627-640)
  Propertys: enableBrowserMCP, enablePlaywrightMCP, headless, retryAttempts, retryDelay, servers, slowMo, timeout, viewport
Interface: MCPToolRequest (lines 645-650)
  Propertys: arguments, serverName, timeout, toolName
Interface: MCPToolResponse (lines 655-665)
  Propertys: data, error, metadata, success
Interface: BrowserState (lines 670-685)
  Propertys: cookies, isNavigating, localStorage, sessionStorage, title, url, viewport
Interface: NavigationOptions (lines 690-694)
  Propertys: timeout, url, waitUntil
Interface: SelectorOptions (lines 699-704)
  Propertys: selector, state, timeout, visible
Interface: ScreenshotOptions (lines 709-720)
  Propertys: clip, fullPage, path, quality, type
Enum: MCPConnectionStatus (lines 725-731)
Interface: MCPServerInfo (lines 736-743)
  Propertys: capabilities, errorCount, lastConnected, name, status, version
Enum: BrowserType (lines 748-752)
Interface: PlaywrightConfig (lines 757-770)
  Propertys: args, browserType, devtools, downloadsPath, headless, ignoreHTTPSErrors, proxy, slowMo
Interface: NetworkInterceptionOptions (lines 775-784)
  Propertys: blockResources, modifyResponses, patterns
Interface: MCPOperationResult (lines 789-793)
  Propertys: attempts, retried, totalDuration
Enum: HTTPMethod (lines 802-810)
Enum: AuthType (lines 815-821)
Interface: APIAuth (lines 826-834)
  Propertys: apiKey, apiKeyHeader, customHeaders, password, token, type, username
Interface: APIRequest (lines 839-848)
  Propertys: auth, body, headers, method, params, timeout, url, validateSSL
Interface: APIResponse (lines 853-860)
  Propertys: body, duration, headers, status, statusText, timestamp
Enum: AssertionType (lines 865-874)
Interface: APIAssertion (lines 879-886)
  Propertys: actual, expected, message, operator, path, type
Interface: APITestConfig (lines 891-900)
  Propertys: acceptableStatuses, assertions, continueOnFailure, description, name, request, retries, retryDelay
Interface: APITestResult (lines 905-919)
  Propertys: assertions, duration, error, passed, request, response, retryCount, testName, timestamp
Interface: QATaskStep (lines 946-950)
  Propertys: action, description, expectedOutcome
Interface: QATask (lines 955-968)
  Propertys: acceptanceCriterionId, executionMode, expectedResult, preconditions, priority, reasoning, setupData, steps, taskId, title, type, uncertainReason
Interface: QATaskPlan (lines 973-984)
  Propertys: acceptanceCriteria, projectName, summary, tasks, timestamp
Interface: HTTPTestStep (lines 1001-1011)
  Propertys: acceptableStatuses, body, description, expectedBodyContains, expectedStatus, headers, method, stepId, url
Interface: GeneratedHTTPTest (lines 1016-1025)
  Propertys: acceptanceCriterionId, id, qaTaskId, status, steps, title, type, uncertainReason
Interface: GeneratedHTTPTestSuite (lines 1030-1041)
  Propertys: baseUrl, projectName, summary, tests, timestamp
Interface: AssertionResult (lines 1050-1056)
  Propertys: actual, expected, message, passed, type
Interface: HTTPStepResult (lines 1064-1077)
  Propertys: acceptableStatuses, actualStatus, description, duration, error, expectedStatus, method, passed, requestBody, responseBody, stepId, url
Interface: HTTPTestResult (lines 1082-1094)
  Propertys: acceptanceCriterionId, classification, duration, evidence, executor, qaTaskId, status, stepResults, testId, timestamp, title
Interface: DiscoveredRoute (lines 1103-1109)
  Propertys: description, handler, method, middleware, path
Interface: RouteMatch (lines 1114-1118)
  Propertys: confidence, reason, route
Interface: FallbackMappingResult (lines 1123-1129)
  Propertys: confidence, httpTest, qaTask, reason, success
Enum: TestExecutionMode (lines 1138-1142)
Interface: TestExecutionOptions (lines 1147-1159)
  Propertys: captureLogs, captureScreenshots, continueOnFailure, generateReport, maxParallel, mode, outputDir, reportFormat, retries, retryDelay, timeout
Enum: TestExecutionStatus (lines 1164-1172)
Interface: TestExecutionProgress (lines 1177-1186)
  Propertys: completed, current, estimatedTimeRemaining, failed, passed, percentage, skipped, total
Interface: TestCoordinatorConfig (lines 1191-1208)
  Propertys: agent, baseUrl, buildSystem, cleanup, execution, healthUrl, mcp
Interface: TestCoordinatorState (lines 1213-1226)
  Propertys: buildResult, endTime, error, executionProgress, phase, results, startTime, testPlan
Enum: WebTestAction (lines 1231-1251)
Interface: WebTestStep (lines 1256-1264)
  Propertys: action, continueOnFailure, description, screenshot, selector, timeout, value
Interface: WebTestConfig (lines 1269-1280)
  Propertys: description, name, retries, steps, timeout, url, viewport
Interface: WebTestResult (lines 1285-1299)
  Propertys: duration, error, passed, screenshots, steps, testName, timestamp
Interface: TraceMatrixEntry (lines 1308-1318)
  Propertys: acceptanceCriterion, coverage, executionResults, generatedTests
Interface: TraceMatrix (lines 1323-1328)
  Propertys: coveragePercentage, coveredCriteria, entries, totalCriteria
Interface: MergeReadinessScore (lines 1333-1345)
  Propertys: factors, recommendation, risks, score, summary
Interface: ReportData (lines 1350-1360)
  Propertys: mergeReadiness, metadata, testResults, traceMatrix
Interface: AmbiguityIssue (lines 1364-1370)
  Propertys: criterion, issue, severity, suggestion, vagueTerms
Interface: AmbiguityAnalysis (lines 1372-1377)
  Propertys: issues, issuesFound, overallQuality, totalCriteria
Interface: GitFileChange (lines 1382-1387)
  Propertys: linesAdded, linesDeleted, path, type
Interface: DiffAnalysis (lines 1389-1395)
  Propertys: baseBranch, changedFiles, impactedAreas, riskLevel, suggestedTestFocus
Interface: DirectoryConfig (lines 1404-1408)
  Propertys: debugDir, generatedDir, proofDir
</file_outline>
<notice>This file is large (1411 lines). You will use the following strategy to understand this file:
- Inform the user you are going to use large file strategy, to efficiently understand the file
- Use the file_outline provided to get an overview of the file structure to help decide next action. This is not the full file. It is not the full depth of the contents.
- If you read the file, use precise file reads with line ranges for specific sections of interest
- Consider if other commands/tools are better suited for extracting information from that file type
- Use ask_followup_question tool if needed to identify the best next action
</notice></file>
</files>
<environment_details>
# VSCode Visible Files
src\reporting\index.ts

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:38:07.958Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.02

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Good! I can see the types file is large. Let me continue reading the remaining critical files to complete my analysis.

<read_file>
<args>
<file>
<path>src/generators/qa-task-plan-generator.ts</path>
</file>
<file>
<path>src/validation/body-generator.ts</path>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/generators/qa-task-plan-generator.ts', 'src/validation/body-generator.ts'] Result:
<files>
<file><path>src/generators/qa-task-plan-generator.ts</path>
<content lines="1-657">
  1 | /**
  2 |  * QA Task Plan Generator with IBM watsonx Integration
  3 |  * 
  4 |  * This module generates structured QA task plans from acceptance criteria using
  5 |  * IBM watsonx for intelligent reasoning while maintaining robustness through
  6 |  * validation and deterministic fallback mechanisms.
  7 |  * 
  8 |  * Key Features:
  9 |  * - IBM watsonx integration for intelligent task classification
 10 |  * - Robust validation and JSON repair
 11 |  * - Deterministic fallback when IBM fails
 12 |  * - Never crashes on IBM errors
 13 |  * - Comprehensive error handling and logging
 14 |  */
 15 | 
 16 | import { WatsonxClient } from '../agent/watsonx-client.js';
 17 | import {
 18 |   AcceptanceCriterion,
 19 |   DiscoveredRoute,
 20 |   QATask,
 21 |   QATaskPlan,
 22 |   TraceQAConfig,
 23 | } from '../types/index.js';
 24 | import { matchRouteToTask, detectResourceAndAction } from '../validation/route-matcher.js';
 25 | import { logger } from '../utils/logger.js';
 26 | import { extractJSON, safeExtractJSON } from '../utils/json-extractor.js';
 27 | import * as fs from 'fs';
 28 | import * as path from 'path';
 29 | 
 30 | /**
 31 |  * Result of QA task plan generation
 32 |  */
 33 | export interface QATaskPlanGenerationResult {
 34 |   taskPlan: QATaskPlan;
 35 |   warnings: string[];
 36 |   ibmUsed: boolean;
 37 |   fallbackUsed: boolean;
 38 | }
 39 | 
 40 | /**
 41 |  * Project context for task generation
 42 |  */
 43 | export interface ProjectContext {
 44 |   projectName: string;
 45 |   framework?: string;
 46 |   openApiSpec?: any;
 47 | }
 48 | 
 49 | /**
 50 |  * IBM response structure for task plan
 51 |  */
 52 | interface IBMTaskPlanResponse {
 53 |   tasks: Array<{
 54 |     taskId: string;
 55 |     acceptanceCriterionId: string;
 56 |     title: string;
 57 |     type: 'api' | 'ui' | 'integration' | 'manual' | 'uncertain';
 58 |     executionMode: 'automated' | 'manual' | 'uncertain';
 59 |     priority?: 'high' | 'medium' | 'low';
 60 |     reasoning: string;
 61 |     uncertainReason?: string;
 62 |     preconditions?: string[];
 63 |     setupData?: Record<string, any>;
 64 |     steps?: Array<{
 65 |       action: string;
 66 |       description: string;
 67 |       expectedOutcome?: string;
 68 |     }>;
 69 |     expectedResult?: string;
 70 |   }>;
 71 | }
 72 | 
 73 | /**
 74 |  * Validation result for IBM response
 75 |  */
 76 | interface ValidationResult {
 77 |   valid: boolean;
 78 |   tasks: QATask[];
 79 |   errors: string[];
 80 |   warnings: string[];
 81 | }
 82 | 
 83 | /**
 84 |  * Build prompt for IBM watsonx to generate QA task plan
 85 |  * 
 86 |  * @param acceptanceCriteria - List of acceptance criteria to map to tasks
 87 |  * @param discoveredRoutes - Routes discovered from the application
 88 |  * @param projectContext - Project information for context
 89 |  * @returns Formatted prompt for IBM watsonx
 90 |  */
 91 | export function buildQATaskPlanPrompt(
 92 |   acceptanceCriteria: AcceptanceCriterion[],
 93 |   discoveredRoutes: DiscoveredRoute[],
 94 |   projectContext: ProjectContext
 95 | ): string {
 96 |   const routesSummary = discoveredRoutes.length > 0
 97 |     ? discoveredRoutes.map(r => `  - ${r.method.toUpperCase()} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')
 98 |     : '  No routes discovered';
 99 | 
100 |   const openApiInfo = projectContext.openApiSpec
101 |     ? `\n\nOpenAPI Specification Available: Yes\nEndpoints: ${Object.keys(projectContext.openApiSpec.paths || {}).length}`
102 |     : '';
103 | 
104 |   return `You are a QA engineer analyzing acceptance criteria to create a structured test plan.
105 | 
106 | Project: ${projectContext.projectName}
107 | Framework: ${projectContext.framework || 'Unknown'}${openApiInfo}
108 | 
109 | Discovered Routes:
110 | ${routesSummary}
111 | 
112 | Acceptance Criteria:
113 | ${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description} (Priority: ${ac.priority || 'medium'})`).join('\n')}
114 | 
115 | Task: Create a QA task plan by mapping each acceptance criterion to one or more testable tasks.
116 | 
117 | For each task, determine:
118 | 1. **Task Type**: Classify as one of:
119 |    - api: Can be tested via API calls (use when routes are discovered and criterion mentions API/endpoints)
120 |    - ui: Requires browser interaction (use when criterion mentions UI/pages/buttons)
121 |    - integration: Requires multiple systems (use when criterion mentions external services)
122 |    - manual: Cannot be automated (use when criterion requires human judgment)
123 |    - uncertain: Cannot determine with confidence (use when unclear)
124 | 
125 | 2. **Execution Mode**: Classify as:
126 |    - automated: Can be fully automated
127 |    - manual: Requires human execution
128 |    - uncertain: Cannot determine with confidence
129 | 
130 | 3. **Priority**: Based on acceptance criterion priority and testability:
131 |    - high: Critical functionality with clear automation path
132 |    - medium: Important functionality or partial automation
133 |    - low: Nice-to-have or manual-only tests
134 | 
135 | 4. **Reasoning**: Explain why you chose this classification (2-3 sentences)
136 | 
137 | 5. **Uncertain Reason**: If type or executionMode is 'uncertain', explain why (required for uncertain tasks)
138 | 
139 | 6. **Test Steps**: Suggest 2-5 concrete test steps
140 | 
141 | 7. **Preconditions**: List any setup requirements (e.g., "User must be logged in")
142 | 
143 | 8. **Setup Data**: Suggest test data needed (e.g., valid email, test user credentials)
144 | 
145 | IMPORTANT GUIDELINES:
146 | - Be conservative: Mark as 'uncertain' when confidence is low
147 | - Match routes to criteria: Use discovered routes to inform task type
148 | - One task per criterion minimum: Each criterion should have at least one task
149 | - Provide clear reasoning: Explain your classification decisions
150 | - Consider dependencies: Note if tasks require other tasks to run first
151 | 
152 | Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
153 | {
154 |   "tasks": [
155 |     {
156 |       "taskId": "QA-001",
157 |       "acceptanceCriterionId": "AC-1",
158 |       "title": "Test user registration with valid email",
159 |       "type": "api",
160 |       "executionMode": "automated",
161 |       "priority": "high",
162 |       "reasoning": "Clear API endpoint discovered (POST /api/users/register). Acceptance criterion specifies testable validation rules. High confidence in automation.",
163 |       "preconditions": ["Database is accessible", "Email service is mocked"],
164 |       "setupData": {
165 |         "validEmail": "test@example.com",
166 |         "validPassword": "SecurePass123!"
167 |       },
168 |       "steps": [
169 |         {
170 |           "action": "Send POST request to /api/users/register",
171 |           "description": "Submit registration with valid email and password",
172 |           "expectedOutcome": "201 Created response with user object"
173 |         },
174 |         {
175 |           "action": "Verify response structure",
176 |           "description": "Check that response contains userId, email, and createdAt",
177 |           "expectedOutcome": "All required fields present"
178 |         }
179 |       ],
180 |       "expectedResult": "User is created successfully with valid data"
181 |     }
182 |   ]
183 | }
184 | 
185 | Generate the task plan now:`;
186 | }
187 | 
188 | /**
189 |  * Validate IBM task plan response and normalize tasks
190 |  * 
191 |  * @param response - Raw response from IBM watsonx
192 |  * @param acceptanceCriteria - Original acceptance criteria for validation
193 |  * @returns Validation result with normalized tasks and any errors/warnings
194 |  */
195 | export function validateIBMTaskPlanResponse(
196 |   response: any,
197 |   acceptanceCriteria: AcceptanceCriterion[]
198 | ): ValidationResult {
199 |   const errors: string[] = [];
200 |   const warnings: string[] = [];
201 |   const tasks: QATask[] = [];
202 | 
203 |   // Check if response has tasks array
204 |   if (!response || typeof response !== 'object') {
205 |     errors.push('Response is not a valid object');
206 |     return { valid: false, tasks: [], errors, warnings };
207 |   }
208 | 
209 |   if (!Array.isArray(response.tasks)) {
210 |     errors.push('Response does not contain a tasks array');
211 |     return { valid: false, tasks: [], errors, warnings };
212 |   }
213 | 
214 |   if (response.tasks.length === 0) {
215 |     warnings.push('No tasks generated by IBM');
216 |   }
217 | 
218 |   // Create a map of valid acceptance criterion IDs
219 |   const validAcIds = new Set(acceptanceCriteria.map(ac => ac.id));
220 | 
221 |   // Validate each task
222 |   response.tasks.forEach((task: any, index: number) => {
223 |     const taskErrors: string[] = [];
224 |     const taskWarnings: string[] = [];
225 | 
226 |     // Validate required fields
227 |     if (!task.taskId || typeof task.taskId !== 'string') {
228 |       taskErrors.push(`Task ${index + 1}: Missing or invalid taskId`);
229 |     } else if (!/^QA-\d+$/.test(task.taskId)) {
230 |       taskWarnings.push(`Task ${task.taskId}: taskId should follow pattern "QA-001", "QA-002", etc.`);
231 |     }
232 | 
233 |     if (!task.acceptanceCriterionId || typeof task.acceptanceCriterionId !== 'string') {
234 |       taskErrors.push(`Task ${index + 1}: Missing or invalid acceptanceCriterionId`);
235 |     } else if (!validAcIds.has(task.acceptanceCriterionId)) {
236 |       taskErrors.push(`Task ${task.taskId}: acceptanceCriterionId "${task.acceptanceCriterionId}" does not reference a valid acceptance criterion`);
237 |     }
238 | 
239 |     if (!task.title || typeof task.title !== 'string') {
240 |       taskErrors.push(`Task ${task.taskId || index + 1}: Missing or invalid title`);
241 |     }
242 | 
243 |     // Validate type
244 |     const validTypes = ['api', 'ui', 'integration', 'manual', 'uncertain'];
245 |     if (!task.type || !validTypes.includes(task.type)) {
246 |       taskErrors.push(`Task ${task.taskId || index + 1}: Invalid type "${task.type}". Must be one of: ${validTypes.join(', ')}`);
247 |     }
248 | 
249 |     // Validate executionMode
250 |     const validModes = ['automated', 'manual', 'uncertain'];
251 |     if (!task.executionMode || !validModes.includes(task.executionMode)) {
252 |       taskErrors.push(`Task ${task.taskId || index + 1}: Invalid executionMode "${task.executionMode}". Must be one of: ${validModes.join(', ')}`);
253 |     }
254 | 
255 |     // Validate reasoning
256 |     if (!task.reasoning || typeof task.reasoning !== 'string') {
257 |       taskWarnings.push(`Task ${task.taskId || index + 1}: Missing reasoning`);
258 |     }
259 | 
260 |     // Check for uncertainReason when type or executionMode is uncertain
261 |     if ((task.type === 'uncertain' || task.executionMode === 'uncertain') && !task.uncertainReason) {
262 |       taskWarnings.push(`Task ${task.taskId || index + 1}: Missing uncertainReason for uncertain task`);
263 |     }
264 | 
265 |     // If task has errors, skip it
266 |     if (taskErrors.length > 0) {
267 |       errors.push(...taskErrors);
268 |       return;
269 |     }
270 | 
271 |     // Add warnings
272 |     warnings.push(...taskWarnings);
273 | 
274 |     // Normalize and add task
275 |     const normalizedTask: QATask = {
276 |       taskId: task.taskId,
277 |       acceptanceCriterionId: task.acceptanceCriterionId,
278 |       title: task.title,
279 |       type: task.type,
280 |       executionMode: task.executionMode,
281 |       priority: task.priority || 'medium',
282 |       reasoning: task.reasoning || 'No reasoning provided',
283 |       uncertainReason: task.uncertainReason,
284 |       preconditions: task.preconditions || [],
285 |       setupData: task.setupData || {},
286 |       steps: task.steps || [],
287 |       expectedResult: task.expectedResult,
288 |     };
289 | 
290 |     tasks.push(normalizedTask);
291 |   });
292 | 
293 |   return {
294 |     valid: errors.length === 0,
295 |     tasks,
296 |     errors,
297 |     warnings,
298 |   };
299 | }
300 | 
301 | /**
302 |  * Generate fallback tasks when IBM fails or returns invalid output
303 |  * 
304 |  * Uses deterministic logic to create basic tasks from acceptance criteria
305 |  * and discovered routes.
306 |  * 
307 |  * @param acceptanceCriteria - List of acceptance criteria
308 |  * @param discoveredRoutes - Routes discovered from the application
309 |  * @returns Array of fallback QA tasks
310 |  */
311 | export function generateFallbackTasks(
312 |   acceptanceCriteria: AcceptanceCriterion[],
313 |   discoveredRoutes: DiscoveredRoute[]
314 | ): QATask[] {
315 |   logger.warn('Using deterministic fallback for task generation');
316 | 
317 |   const tasks: QATask[] = [];
318 | 
319 |   acceptanceCriteria.forEach((criterion, index) => {
320 |     const taskId = `QA-${String(index + 1).padStart(3, '0')}`;
321 |     const combinedText = criterion.description;
322 | 
323 |     // Detect resource and action from criterion
324 |     const { resource, action } = detectResourceAndAction(combinedText);
325 | 
326 |     // Determine task type based on criterion text and routes
327 |     let type: QATask['type'] = 'uncertain';
328 |     let executionMode: QATask['executionMode'] = 'uncertain';
329 |     let reasoning = 'Fallback generation: ';
330 |     let uncertainReason: string | undefined;
331 | 
332 |     // Check if criterion mentions API/endpoint
333 |     if (/\b(api|endpoint|request|response|status|json)\b/i.test(combinedText)) {
334 |       if (discoveredRoutes.length > 0) {
335 |         type = 'api';
336 |         executionMode = 'automated';
337 |         reasoning += 'Criterion mentions API concepts and routes were discovered. Likely testable via API.';
338 |       } else {
339 |         type = 'uncertain';
340 |         executionMode = 'uncertain';
341 |         reasoning += 'Criterion mentions API concepts but no routes were discovered.';
342 |         uncertainReason = 'No routes discovered to validate API testing approach';
343 |       }
344 |     }
345 |     // Check if criterion mentions UI/browser
346 |     else if (/\b(ui|page|button|click|form|browser|display|show|view)\b/i.test(combinedText)) {
347 |       type = 'ui';
348 |       executionMode = 'manual';
349 |       reasoning += 'Criterion mentions UI concepts. Requires browser interaction.';
350 |       uncertainReason = 'UI automation not configured in fallback mode';
351 |     }
352 |     // Check if criterion mentions multiple systems
353 |     else if (/\b(integration|external|third[- ]party|service|system)\b/i.test(combinedText)) {
354 |       type = 'integration';
355 |       executionMode = 'manual';
356 |       reasoning += 'Criterion mentions integration with external systems.';
357 |       uncertainReason = 'Integration testing requires manual setup and verification';
358 |     }
359 |     // Check if we can infer from action
360 |     else if (action && discoveredRoutes.length > 0) {
361 |       type = 'api';
362 |       executionMode = 'automated';
363 |       reasoning += `Detected ${action} action and routes are available. Likely API testable.`;
364 |     }
365 |     // Default to uncertain
366 |     else {
367 |       type = 'uncertain';
368 |       executionMode = 'uncertain';
369 |       reasoning += 'Cannot determine task type from criterion text. Manual review needed.';
370 |       uncertainReason = 'Insufficient information to classify task type and execution mode';
371 |     }
372 | 
373 |     // Determine priority based on criterion priority and type
374 |     let priority: QATask['priority'] = criterion.priority || 'medium';
375 |     if (type === 'api' && executionMode === 'automated') {
376 |       priority = 'high'; // Boost priority for automatable API tests
377 |     } else if (type === 'uncertain') {
378 |       priority = 'low'; // Lower priority for uncertain tasks
379 |     }
380 | 
381 |     // Generate basic steps
382 |     const steps: QATask['steps'] = [
383 |       {
384 |         action: 'Review acceptance criterion',
385 |         description: criterion.description,
386 |         expectedOutcome: 'Understand test requirements',
387 |       },
388 |     ];
389 | 
390 |     if (type === 'api' && action) {
391 |       steps.push({
392 |         action: `Perform ${action} operation`,
393 |         description: `Execute ${action} via API endpoint`,
394 |         expectedOutcome: 'Operation completes successfully',
395 |       });
396 |     }
397 | 
398 |     const task: QATask = {
399 |       taskId,
400 |       acceptanceCriterionId: criterion.id,
401 |       title: `Test: ${criterion.description.substring(0, 60)}${criterion.description.length > 60 ? '...' : ''}`,
402 |       type,
403 |       executionMode,
404 |       priority,
405 |       reasoning,
406 |       uncertainReason,
407 |       preconditions: [],
408 |       setupData: {},
409 |       steps,
410 |       expectedResult: criterion.description,
411 |     };
412 | 
413 |     tasks.push(task);
414 |   });
415 | 
416 |   return tasks;
417 | }
418 | 
419 | /**
420 |  * Prioritize tasks based on type, execution mode, and confidence
421 |  * 
422 |  * Priority rules:
423 |  * - High: API tests with discovered routes and clear mapping
424 |  * - Medium: API tests with uncertain routes or UI tests with clear selectors
425 |  * - Low: Integration tests, manual tests, or uncertain tasks
426 |  * 
427 |  * @param tasks - Array of QA tasks to prioritize
428 |  * @returns Sorted array of tasks (high to low priority)
429 |  */
430 | export function prioritizeTasks(tasks: QATask[]): QATask[] {
431 |   const priorityOrder = { high: 3, medium: 2, low: 1 };
432 | 
433 |   return [...tasks].sort((a, b) => {
434 |     // First sort by priority
435 |     const aPriority = priorityOrder[a.priority || 'medium'];
436 |     const bPriority = priorityOrder[b.priority || 'medium'];
437 | 
438 |     if (aPriority !== bPriority) {
439 |       return bPriority - aPriority;
440 |     }
441 | 
442 |     // Then by execution mode (automated > manual > uncertain)
443 |     const executionOrder = { automated: 3, manual: 2, uncertain: 1 };
444 |     const aExecution = executionOrder[a.executionMode];
445 |     const bExecution = executionOrder[b.executionMode];
446 | 
447 |     if (aExecution !== bExecution) {
448 |       return bExecution - aExecution;
449 |     }
450 | 
451 |     // Then by type (api > ui > integration > manual > uncertain)
452 |     const typeOrder = { api: 5, ui: 4, integration: 3, manual: 2, uncertain: 1 };
453 |     const aType = typeOrder[a.type];
454 |     const bType = typeOrder[b.type];
455 | 
456 |     return bType - aType;
457 |   });
458 | }
459 | 
460 | /**
461 |  * Generate task summary statistics
462 |  * 
463 |  * @param tasks - Array of QA tasks
464 |  * @returns Summary object with task counts
465 |  */
466 | export function generateTaskSummary(tasks: QATask[]): {
467 |   totalTasks: number;
468 |   automatedTasks: number;
469 |   manualTasks: number;
470 |   uncertainTasks: number;
471 | } {
472 |   return {
473 |     totalTasks: tasks.length,
474 |     automatedTasks: tasks.filter(t => t.executionMode === 'automated').length,
475 |     manualTasks: tasks.filter(t => t.executionMode === 'manual').length,
476 |     uncertainTasks: tasks.filter(t => t.executionMode === 'uncertain').length,
477 |   };
478 | }
479 | 
480 | /**
481 |  * Save raw IBM output to debug directory
482 |  * 
483 |  * @param output - Raw output from IBM
484 |  * @param debugDir - Debug directory path
485 |  * @param attemptNumber - Attempt number for unique filename
486 |  */
487 | function saveRawOutput(output: string, debugDir: string, attemptNumber: number): void {
488 |   try {
489 |     if (!fs.existsSync(debugDir)) {
490 |       fs.mkdirSync(debugDir, { recursive: true });
491 |     }
492 | 
493 |     const filename = `qa-task-plan-raw-${attemptNumber}-${Date.now()}.txt`;
494 |     const filepath = path.join(debugDir, filename);
495 | 
496 |     fs.writeFileSync(filepath, output, 'utf-8');
497 |     logger.debug(`Saved raw IBM output to ${filepath}`);
498 |   } catch (error) {
499 |     logger.warn('Failed to save raw IBM output', error instanceof Error ? error.message : String(error));
500 |   }
501 | }
502 | 
503 | /**
504 |  * Generate QA task plan from acceptance criteria
505 |  * 
506 |  * Main function that orchestrates the entire task plan generation process:
507 |  * 1. Attempts to use IBM watsonx for intelligent task generation
508 |  * 2. Validates and normalizes IBM output
509 |  * 3. Falls back to deterministic generation if IBM fails
510 |  * 4. Prioritizes tasks and generates summary
511 |  * 5. Never crashes - always returns a valid task plan
512 |  * 
513 |  * @param acceptanceCriteria - List of acceptance criteria to map to tasks
514 |  * @param discoveredRoutes - Routes discovered from the application
515 |  * @param config - TraceQA configuration
516 |  * @param projectContext - Project information for context
517 |  * @returns Task plan generation result with warnings and metadata
518 |  */
519 | export async function generateQATaskPlan(
520 |   acceptanceCriteria: AcceptanceCriterion[],
521 |   discoveredRoutes: DiscoveredRoute[],
522 |   config: TraceQAConfig,
523 |   projectContext: ProjectContext
524 | ): Promise<QATaskPlanGenerationResult> {
525 |   const warnings: string[] = [];
526 |   let ibmUsed = false;
527 |   let fallbackUsed = false;
528 |   let tasks: QATask[] = [];
529 | 
530 |   const debugDir = path.join(process.cwd(), 'traceqa-debug');
531 | 
532 |   logger.info('Generating QA task plan...');
533 |   logger.debug(`Acceptance criteria: ${acceptanceCriteria.length}, Routes: ${discoveredRoutes.length}`);
534 | 
535 |   // Validate inputs
536 |   if (acceptanceCriteria.length === 0) {
537 |     warnings.push('No acceptance criteria provided');
538 |     return {
539 |       taskPlan: {
540 |         projectName: projectContext.projectName,
541 |         timestamp: new Date().toISOString(),
542 |         acceptanceCriteria: [],
543 |         tasks: [],
544 |         summary: {
545 |           totalTasks: 0,
546 |           automatedTasks: 0,
547 |           manualTasks: 0,
548 |           uncertainTasks: 0,
549 |         },
550 |       },
551 |       warnings,
552 |       ibmUsed: false,
553 |       fallbackUsed: false,
554 |     };
555 |   }
556 | 
557 |   // Try IBM watsonx generation
558 |   try {
559 |     if (!config.ibmWatsonxApiKey) {
560 |       throw new Error('IBM watsonx API key not configured');
561 |     }
562 | 
563 |     logger.info('Using IBM watsonx for task plan generation...');
564 | 
565 |     const watsonxClient = new WatsonxClient({
566 |       apiKey: config.ibmWatsonxApiKey,
567 |       temperature: 0.3, // Lower temperature for more deterministic output
568 |       maxTokens: 4096,
569 |     });
570 | 
571 |     const prompt = buildQATaskPlanPrompt(acceptanceCriteria, discoveredRoutes, projectContext);
572 |     const response = await watsonxClient.sendMessage(prompt);
573 | 
574 |     // Save raw response for debugging
575 |     saveRawOutput(response, debugDir, 1);
576 | 
577 |     // Try to extract JSON from response
578 |     const extractionResult = safeExtractJSON(response, {
579 |       saveRawOnFailure: true,
580 |       attemptRepair: false,
581 |     });
582 | 
583 |     if (!extractionResult.success) {
584 |       logger.warn('Failed to extract JSON from IBM response');
585 |       warnings.push('IBM returned invalid JSON format');
586 | 
587 |       // Try balanced JSON extraction as fallback
588 |       const extracted = extractJSON(response);
589 |       if (extracted) {
590 |         logger.info('Successfully extracted JSON using balanced extraction');
591 |         const validation = validateIBMTaskPlanResponse(extracted, acceptanceCriteria);
592 | 
593 |         if (validation.valid && validation.tasks.length > 0) {
594 |           tasks = validation.tasks;
595 |           ibmUsed = true;
596 |           warnings.push(...validation.warnings);
597 |           logger.success(`IBM generated ${tasks.length} tasks (with JSON repair)`);
598 |         } else {
599 |           warnings.push(...validation.errors, ...validation.warnings);
600 |           throw new Error('IBM response validation failed after JSON repair');
601 |         }
602 |       } else {
603 |         throw new Error('Could not extract valid JSON from IBM response');
604 |       }
605 |     } else {
606 |       // Validate IBM response
607 |       const validation = validateIBMTaskPlanResponse(extractionResult.data, acceptanceCriteria);
608 | 
609 |       if (validation.valid && validation.tasks.length > 0) {
610 |         tasks = validation.tasks;
611 |         ibmUsed = true;
612 |         warnings.push(...validation.warnings);
613 |         logger.success(`IBM generated ${tasks.length} tasks`);
614 |       } else {
615 |         warnings.push(...validation.errors, ...validation.warnings);
616 |         throw new Error('IBM response validation failed');
617 |       }
618 |     }
619 |   } catch (error) {
620 |     const errorMessage = error instanceof Error ? error.message : String(error);
621 |     logger.warn(`IBM generation failed: ${errorMessage}`);
622 |     warnings.push(`IBM generation failed: ${errorMessage}`);
623 | 
624 |     // Use deterministic fallback
625 |     logger.info('Falling back to deterministic task generation...');
626 |     tasks = generateFallbackTasks(acceptanceCriteria, discoveredRoutes);
627 |     fallbackUsed = true;
628 |     logger.success(`Fallback generated ${tasks.length} tasks`);
629 |   }
630 | 
631 |   // Prioritize tasks
632 |   tasks = prioritizeTasks(tasks);
633 | 
634 |   // Generate summary
635 |   const summary = generateTaskSummary(tasks);
636 | 
637 |   // Create task plan
638 |   const taskPlan: QATaskPlan = {
639 |     projectName: projectContext.projectName,
640 |     timestamp: new Date().toISOString(),
641 |     acceptanceCriteria,
642 |     tasks,
643 |     summary,
644 |   };
645 | 
646 |   logger.success('QA task plan generated successfully');
647 |   logger.info(`Summary: ${summary.totalTasks} total, ${summary.automatedTasks} automated, ${summary.manualTasks} manual, ${summary.uncertainTasks} uncertain`);
648 | 
649 |   return {
650 |     taskPlan,
651 |     warnings,
652 |     ibmUsed,
653 |     fallbackUsed,
654 |   };
655 | }
656 | 
657 | // Made with Bob
</content>
</file>
<file><path>src/validation/body-generator.ts</path>
<content lines="1-862">
  1 | /**
  2 |  * Generic Request Body Generator
  3 |  * 
  4 |  * Implements intelligent request body generation with fallback logic for REST APIs.
  5 |  * Supports OpenAPI schemas, config sample data, field inference, and generic fallbacks.
  6 |  * 
  7 |  * @module body-generator
  8 |  */
  9 | 
 10 | import type {
 11 |   QATask,
 12 |   AcceptanceCriterion,
 13 |   TraceQAConfig,
 14 |   DiscoveredRoute,
 15 | } from '../types/index.js';
 16 | 
 17 | /**
 18 |  * Result of body generation with metadata
 19 |  */
 20 | export interface BodyGenerationResult {
 21 |   /** Generated request body or null if generation failed */
 22 |   body: Record<string, any> | null;
 23 |   /** Source of the generated body */
 24 |   source: 'openapi' | 'ibm' | 'config' | 'inferred' | 'generic_fallback';
 25 |   /** Confidence level in the generated body */
 26 |   confidence: 'high' | 'medium' | 'low';
 27 |   /** Warnings about potential issues */
 28 |   warnings: string[];
 29 | }
 30 | 
 31 | /**
 32 |  * Context for stateful test data management
 33 |  */
 34 | export interface TestDataContext {
 35 |   /** Data from setup step */
 36 |   setupData: Record<string, any>;
 37 |   /** Unique test identifier */
 38 |   testId: string;
 39 |   /** Timestamp for unique data generation */
 40 |   timestamp: string;
 41 | }
 42 | 
 43 | /**
 44 |  * Scenario types for body generation
 45 |  */
 46 | export type BodyScenario =
 47 |   | 'valid'
 48 |   | 'invalid'
 49 |   | 'duplicate'
 50 |   | 'missing_field'
 51 |   | 'weak_password'
 52 |   | 'invalid_email'
 53 |   | 'unauthorized'
 54 |   | 'conflict';
 55 | 
 56 | /**
 57 |  * Main function to generate request body with intelligent fallback logic
 58 |  * 
 59 |  * Priority order:
 60 |  * 1. OpenAPI request schema
 61 |  * 2. IBM suggested body (if valid)
 62 |  * 3. Config sample data
 63 |  * 4. Inferred fields from context
 64 |  * 5. Generic fallback
 65 |  * 
 66 |  * @param method - HTTP method (POST, PUT, PATCH, etc.)
 67 |  * @param route - Discovered route information
 68 |  * @param task - QA task being executed
 69 |  * @param acceptanceCriterion - Acceptance criterion being tested
 70 |  * @param config - TraceQA configuration
 71 |  * @param openApiSpec - Optional OpenAPI specification
 72 |  * @param ibmSuggestedBody - Optional IBM-suggested body
 73 |  * @returns Body generation result with metadata
 74 |  */
 75 | export function generateRequestBody(
 76 |   method: string,
 77 |   route: DiscoveredRoute | null,
 78 |   task: QATask,
 79 |   acceptanceCriterion: AcceptanceCriterion,
 80 |   config: TraceQAConfig,
 81 |   openApiSpec?: any,
 82 |   ibmSuggestedBody?: any
 83 | ): BodyGenerationResult {
 84 |   const warnings: string[] = [];
 85 |   const testId = task.taskId;
 86 |   const timestamp = Date.now().toString();
 87 | 
 88 |   // Methods that typically don't need a body
 89 |   const noBodyMethods = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];
 90 |   if (noBodyMethods.includes(method.toUpperCase())) {
 91 |     return {
 92 |       body: null,
 93 |       source: 'generic_fallback',
 94 |       confidence: 'high',
 95 |       warnings: [],
 96 |     };
 97 |   }
 98 | 
 99 |   // Determine scenario from task and acceptance criterion
100 |   const scenario = inferScenario(task, acceptanceCriterion);
101 | 
102 |   // Priority 1: OpenAPI schema
103 |   if (openApiSpec && route) {
104 |     const openApiBody = generateBodyFromOpenAPISchema(
105 |       openApiSpec,
106 |       route.method,
107 |       route.path,
108 |       scenario,
109 |       testId,
110 |       timestamp
111 |     );
112 |     if (openApiBody && Object.keys(openApiBody).length > 0) {
113 |       return {
114 |         body: openApiBody,
115 |         source: 'openapi',
116 |         confidence: 'high',
117 |         warnings,
118 |       };
119 |     }
120 |   }
121 | 
122 |   // Priority 2: IBM suggested body (if valid)
123 |   if (ibmSuggestedBody && typeof ibmSuggestedBody === 'object') {
124 |     const keys = Object.keys(ibmSuggestedBody);
125 |     if (keys.length > 0) {
126 |       // Apply scenario modifications to IBM body
127 |       const modifiedBody = generateBodyForScenario(
128 |         scenario,
129 |         ibmSuggestedBody,
130 |         task,
131 |         testId,
132 |         timestamp
133 |       );
134 |       return {
135 |         body: modifiedBody,
136 |         source: 'ibm',
137 |         confidence: 'high',
138 |         warnings,
139 |       };
140 |     }
141 |   }
142 | 
143 |   // Priority 3: Config sample data
144 |   if (config.sampleData) {
145 |     const configBody = generateBodyFromConfig(
146 |       config,
147 |       scenario,
148 |       task,
149 |       testId,
150 |       timestamp
151 |     );
152 |     if (configBody && Object.keys(configBody).length > 0) {
153 |       return {
154 |         body: configBody,
155 |         source: 'config',
156 |         confidence: 'medium',
157 |         warnings,
158 |       };
159 |     }
160 |   }
161 | 
162 |   // Priority 4: Inferred fields from context
163 |   const inferredFields = inferFieldsFromContext(
164 |     task,
165 |     acceptanceCriterion,
166 |     route,
167 |     testId,
168 |     timestamp
169 |   );
170 |   if (inferredFields && Object.keys(inferredFields).length > 0) {
171 |     const scenarioBody = generateBodyForScenario(
172 |       scenario,
173 |       inferredFields,
174 |       task,
175 |       testId,
176 |       timestamp
177 |     );
178 |     
179 |     warnings.push(
180 |       'Body generated from context inference - may not match actual API requirements'
181 |     );
182 |     
183 |     return {
184 |       body: scenarioBody,
185 |       source: 'inferred',
186 |       confidence: 'medium',
187 |       warnings,
188 |     };
189 |   }
190 | 
191 |   // Priority 5: Generic fallback
192 |   warnings.push('Using generic fallback body - likely insufficient for actual API');
193 |   warnings.push('Consider adding OpenAPI spec or sample data to config');
194 |   
195 |   const fallbackBody = generateGenericFallback(scenario, testId, timestamp);
196 |   
197 |   return {
198 |     body: fallbackBody,
199 |     source: 'generic_fallback',
200 |     confidence: 'low',
201 |     warnings,
202 |   };
203 | }
204 | 
205 | /**
206 |  * Infer test scenario from task and acceptance criterion
207 |  */
208 | function inferScenario(
209 |   task: QATask,
210 |   acceptanceCriterion: AcceptanceCriterion
211 | ): BodyScenario {
212 |   const text = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();
213 | 
214 |   if (text.includes('invalid email') || text.includes('malformed email')) {
215 |     return 'invalid_email';
216 |   }
217 |   if (text.includes('weak password') || text.includes('short password')) {
218 |     return 'weak_password';
219 |   }
220 |   if (text.includes('duplicate') || text.includes('already exists')) {
221 |     return 'duplicate';
222 |   }
223 |   if (text.includes('missing') || text.includes('required field')) {
224 |     return 'missing_field';
225 |   }
226 |   if (text.includes('unauthorized') || text.includes('not authorized')) {
227 |     return 'unauthorized';
228 |   }
229 |   if (text.includes('conflict')) {
230 |     return 'conflict';
231 |   }
232 |   if (text.includes('invalid') || text.includes('error') || text.includes('fail')) {
233 |     return 'invalid';
234 |   }
235 | 
236 |   return 'valid';
237 | }
238 | 
239 | /**
240 |  * Generate body from OpenAPI schema
241 |  * 
242 |  * @param openApiSpec - OpenAPI specification object
243 |  * @param method - HTTP method
244 |  * @param path - API path
245 |  * @param scenario - Test scenario
246 |  * @param testId - Test identifier
247 |  * @param timestamp - Timestamp for unique values
248 |  * @returns Generated body or null
249 |  */
250 | export function generateBodyFromOpenAPISchema(
251 |   openApiSpec: any,
252 |   method: string,
253 |   path: string,
254 |   scenario: BodyScenario,
255 |   testId: string,
256 |   timestamp: string
257 | ): Record<string, any> | null {
258 |   try {
259 |     if (!openApiSpec.paths || !openApiSpec.paths[path]) {
260 |       return null;
261 |     }
262 | 
263 |     const pathItem = openApiSpec.paths[path];
264 |     const operation = pathItem[method.toLowerCase()];
265 |     
266 |     if (!operation || !operation.requestBody) {
267 |       return null;
268 |     }
269 | 
270 |     const requestBody = operation.requestBody;
271 |     const content = requestBody.content || requestBody;
272 |     
273 |     // Try to get JSON schema
274 |     const jsonSchema =
275 |       content['application/json']?.schema ||
276 |       content.schema ||
277 |       null;
278 | 
279 |     if (!jsonSchema) {
280 |       return null;
281 |     }
282 | 
283 |     // Generate body from schema
284 |     const body = generateFromSchema(jsonSchema, openApiSpec, scenario, testId, timestamp);
285 |     return body;
286 |   } catch (error) {
287 |     return null;
288 |   }
289 | }
290 | 
291 | /**
292 |  * Generate body from JSON schema
293 |  */
294 | function generateFromSchema(
295 |   schema: any,
296 |   openApiSpec: any,
297 |   scenario: BodyScenario,
298 |   testId: string,
299 |   timestamp: string
300 | ): Record<string, any> {
301 |   const body: Record<string, any> = {};
302 | 
303 |   // Resolve $ref if present
304 |   if (schema.$ref) {
305 |     schema = resolveRef(schema.$ref, openApiSpec);
306 |   }
307 | 
308 |   const properties = schema.properties || {};
309 |   const required = schema.required || [];
310 | 
311 |   for (const [fieldName, fieldSchema] of Object.entries(properties)) {
312 |     const field = fieldSchema as any;
313 |     const isRequired = required.includes(fieldName);
314 | 
315 |     // Skip non-required fields for missing_field scenario
316 |     if (scenario === 'missing_field' && isRequired) {
317 |       continue;
318 |     }
319 | 
320 |     body[fieldName] = generateFieldValue(
321 |       fieldName,
322 |       field,
323 |       scenario,
324 |       testId,
325 |       timestamp,
326 |       openApiSpec
327 |     );
328 |   }
329 | 
330 |   return body;
331 | }
332 | 
333 | /**
334 |  * Resolve OpenAPI $ref
335 |  */
336 | function resolveRef(ref: string, openApiSpec: any): any {
337 |   const parts = ref.split('/').slice(1); // Remove leading #
338 |   let current = openApiSpec;
339 |   
340 |   for (const part of parts) {
341 |     current = current[part];
342 |     if (!current) return {};
343 |   }
344 |   
345 |   return current;
346 | }
347 | 
348 | /**
349 |  * Generate value for a specific field based on schema
350 |  */
351 | function generateFieldValue(
352 |   fieldName: string,
353 |   fieldSchema: any,
354 |   scenario: BodyScenario,
355 |   testId: string,
356 |   timestamp: string,
357 |   openApiSpec?: any
358 | ): any {
359 |   // Resolve $ref if present
360 |   if (fieldSchema.$ref && openApiSpec) {
361 |     fieldSchema = resolveRef(fieldSchema.$ref, openApiSpec);
362 |   }
363 | 
364 |   const type = fieldSchema.type;
365 |   const format = fieldSchema.format;
366 |   const fieldLower = fieldName.toLowerCase();
367 | 
368 |   // Handle enum values
369 |   if (fieldSchema.enum && fieldSchema.enum.length > 0) {
370 |     return fieldSchema.enum[0];
371 |   }
372 | 
373 |   // Handle arrays
374 |   if (type === 'array') {
375 |     const itemSchema = fieldSchema.items || {};
376 |     const item = generateFieldValue(
377 |       fieldName,
378 |       itemSchema,
379 |       scenario,
380 |       testId,
381 |       timestamp,
382 |       openApiSpec
383 |     );
384 |     return [item];
385 |   }
386 | 
387 |   // Handle objects
388 |   if (type === 'object') {
389 |     return generateFromSchema(fieldSchema, openApiSpec || {}, scenario, testId, timestamp);
390 |   }
391 | 
392 |   // Handle specific formats
393 |   if (format === 'email') {
394 |     return generateEmailValue(fieldName, scenario, testId, timestamp);
395 |   }
396 |   if (format === 'date-time' || format === 'date') {
397 |     return new Date().toISOString();
398 |   }
399 |   if (format === 'uri' || format === 'url') {
400 |     return 'https://example.com';
401 |   }
402 |   if (format === 'uuid') {
403 |     return `${testId}-${timestamp}`;
404 |   }
405 | 
406 |   // Handle by field name patterns
407 |   if (fieldLower.includes('email')) {
408 |     return generateEmailValue(fieldName, scenario, testId, timestamp);
409 |   }
410 |   if (fieldLower.includes('password')) {
411 |     return generatePasswordValue(fieldName, scenario);
412 |   }
413 | 
414 |   // Handle by type
415 |   if (type === 'string') {
416 |     return generateStringValue(fieldName, scenario, testId, timestamp);
417 |   }
418 |   if (type === 'number' || type === 'integer') {
419 |     return generateNumberValue(fieldName, fieldSchema);
420 |   }
421 |   if (type === 'boolean') {
422 |     return scenario === 'valid';
423 |   }
424 | 
425 |   // Default fallback
426 |   return `${fieldName}_${testId}`;
427 | }
428 | 
429 | /**
430 |  * Generate email value based on scenario
431 |  */
432 | function generateEmailValue(
433 |   fieldName: string,
434 |   scenario: BodyScenario,
435 |   testId: string,
436 |   timestamp: string
437 | ): string {
438 |   if (scenario === 'invalid_email' || scenario === 'invalid') {
439 |     return 'invalid-email';
440 |   }
441 |   return `traceqa-${testId}-${timestamp}@example.com`;
442 | }
443 | 
444 | /**
445 |  * Generate password value based on scenario
446 |  */
447 | function generatePasswordValue(fieldName: string, scenario: BodyScenario): string {
448 |   if (scenario === 'weak_password') {
449 |     return 'weak';
450 |   }
451 |   if (scenario === 'invalid') {
452 |     return '123';
453 |   }
454 |   return 'StrongPassword123!';
455 | }
456 | 
457 | /**
458 |  * Generate string value based on field name
459 |  */
460 | function generateStringValue(
461 |   fieldName: string,
462 |   scenario: BodyScenario,
463 |   testId: string,
464 |   timestamp: string
465 | ): string {
466 |   const fieldLower = fieldName.toLowerCase();
467 | 
468 |   if (fieldLower.includes('name') || fieldLower.includes('title') || fieldLower.includes('label')) {
469 |     return `TraceQA ${testId}`;
470 |   }
471 |   if (fieldLower.includes('bio') || fieldLower.includes('description') || fieldLower.includes('comment')) {
472 |     return 'Generated by TraceQA for automated testing';
473 |   }
474 |   if (fieldLower.includes('phone')) {
475 |     return '+1-555-0100';
476 |   }
477 |   if (fieldLower.includes('address')) {
478 |     return '123 TraceQA Street';
479 |   }
480 |   if (fieldLower.includes('city')) {
481 |     return 'TestCity';
482 |   }
483 |   if (fieldLower.includes('state') || fieldLower.includes('province')) {
484 |     return 'TS';
485 |   }
486 |   if (fieldLower.includes('zip') || fieldLower.includes('postal')) {
487 |     return '12345';
488 |   }
489 |   if (fieldLower.includes('country')) {
490 |     return 'US';
491 |   }
492 |   if (fieldLower.includes('url') || fieldLower.includes('website')) {
493 |     return 'https://example.com';
494 |   }
495 |   if (fieldLower.includes('date') || fieldLower.includes('time')) {
496 |     return new Date().toISOString();
497 |   }
498 | 
499 |   return `${fieldName}_${testId}`;
500 | }
501 | 
502 | /**
503 |  * Generate number value based on field name and constraints
504 |  */
505 | function generateNumberValue(fieldName: string, fieldSchema: any): number {
506 |   const fieldLower = fieldName.toLowerCase();
507 | 
508 |   // Check schema constraints
509 |   const min = fieldSchema.minimum ?? fieldSchema.min;
510 |   const max = fieldSchema.maximum ?? fieldSchema.max;
511 | 
512 |   if (fieldLower.includes('amount') || fieldLower.includes('price') || fieldLower.includes('cost')) {
513 |     if (min !== undefined && max !== undefined) {
514 |       return Math.min(max, Math.max(min, 99.99));
515 |     }
516 |     return 99.99;
517 |   }
518 |   if (fieldLower.includes('count') || fieldLower.includes('quantity')) {
519 |     if (min !== undefined && max !== undefined) {
520 |       return Math.min(max, Math.max(min, 5));
521 |     }
522 |     return 5;
523 |   }
524 |   if (fieldLower.includes('age')) {
525 |     return 25;
526 |   }
527 |   if (fieldLower.includes('percent') || fieldLower.includes('rate')) {
528 |     return 50;
529 |   }
530 | 
531 |   // Use schema constraints if available
532 |   if (min !== undefined) {
533 |     return min + 1;
534 |   }
535 |   if (max !== undefined) {
536 |     return Math.floor(max / 2);
537 |   }
538 | 
539 |   return fieldSchema.type === 'integer' ? 1 : 1.0;
540 | }
541 | 
542 | /**
543 |  * Generate body from config sample data
544 |  */
545 | function generateBodyFromConfig(
546 |   config: TraceQAConfig,
547 |   scenario: BodyScenario,
548 |   task: QATask,
549 |   testId: string,
550 |   timestamp: string
551 | ): Record<string, any> | null {
552 |   if (!config.sampleData) {
553 |     return null;
554 |   }
555 | 
556 |   const sampleData = config.sampleData;
557 |   let baseBody: Record<string, any> = {};
558 | 
559 |   // Try to find matching sample data
560 |   if (scenario === 'valid' && sampleData.validUser) {
561 |     baseBody = { ...sampleData.validUser };
562 |   } else if (scenario === 'invalid_email' && sampleData.invalidEmail) {
563 |     baseBody = { email: sampleData.invalidEmail };
564 |   } else if (scenario === 'weak_password' && sampleData.weakPassword) {
565 |     baseBody = { password: sampleData.weakPassword };
566 |   } else {
567 |     // Try to find any matching key in sample data
568 |     const taskLower = task.title.toLowerCase();
569 |     for (const [key, value] of Object.entries(sampleData)) {
570 |       if (taskLower.includes(key.toLowerCase()) && typeof value === 'object') {
571 |         baseBody = { ...value };
572 |         break;
573 |       }
574 |     }
575 |   }
576 | 
577 |   if (Object.keys(baseBody).length === 0) {
578 |     return null;
579 |   }
580 | 
581 |   // Apply scenario modifications
582 |   return generateBodyForScenario(scenario, baseBody, task, testId, timestamp);
583 | }
584 | 
585 | /**
586 |  * Infer fields from task context, acceptance criteria, and route
587 |  */
588 | export function inferFieldsFromContext(
589 |   task: QATask,
590 |   acceptanceCriterion: AcceptanceCriterion,
591 |   route: DiscoveredRoute | null,
592 |   testId: string,
593 |   timestamp: string
594 | ): Record<string, any> {
595 |   const fields: Record<string, any> = {};
596 |   const text = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();
597 | 
598 |   // Infer common fields from context
599 |   if (text.includes('email')) {
600 |     fields.email = `traceqa-${testId}-${timestamp}@example.com`;
601 |   }
602 |   if (text.includes('password')) {
603 |     fields.password = 'StrongPassword123!';
604 |   }
605 |   if (text.includes('username') || text.includes('user name')) {
606 |     fields.username = `traceqa_${testId}`;
607 |   }
608 |   if (text.includes('name') && !text.includes('username')) {
609 |     fields.name = `TraceQA ${testId}`;
610 |   }
611 |   if (text.includes('title')) {
612 |     fields.title = `TraceQA Test ${testId}`;
613 |   }
614 |   if (text.includes('description')) {
615 |     fields.description = 'Generated by TraceQA for automated testing';
616 |   }
617 |   if (text.includes('bio')) {
618 |     fields.bio = 'TraceQA automated test user';
619 |   }
620 |   if (text.includes('phone')) {
621 |     fields.phone = '+1-555-0100';
622 |   }
623 |   if (text.includes('address')) {
624 |     fields.address = '123 TraceQA Street';
625 |   }
626 |   if (text.includes('city')) {
627 |     fields.city = 'TestCity';
628 |   }
629 |   if (text.includes('amount') || text.includes('price')) {
630 |     fields.amount = 99.99;
631 |   }
632 |   if (text.includes('quantity') || text.includes('count')) {
633 |     fields.quantity = 5;
634 |   }
635 |   if (text.includes('product')) {
636 |     fields.productId = `prod-${testId}`;
637 |   }
638 |   if (text.includes('order')) {
639 |     fields.orderId = `order-${testId}`;
640 |   }
641 | 
642 |   // Infer from route path
643 |   if (route) {
644 |     const pathLower = route.path.toLowerCase();
645 |     
646 |     if (pathLower.includes('user') && !fields.email) {
647 |       fields.email = `traceqa-${testId}-${timestamp}@example.com`;
648 |       fields.password = 'StrongPassword123!';
649 |     }
650 |     if (pathLower.includes('order') && !fields.productId) {
651 |       fields.productId = `prod-${testId}`;
652 |       fields.quantity = 1;
653 |     }
654 |     if (pathLower.includes('profile') && !fields.bio) {
655 |       fields.bio = 'TraceQA automated test user';
656 |     }
657 |     if (pathLower.includes('post') || pathLower.includes('article')) {
658 |       fields.title = fields.title || `TraceQA Test ${testId}`;
659 |       fields.content = 'Generated by TraceQA for automated testing';
660 |     }
661 |     if (pathLower.includes('comment')) {
662 |       fields.content = 'TraceQA test comment';
663 |     }
664 |   }
665 | 
666 |   // Use setup data if available
667 |   if (task.setupData && Object.keys(task.setupData).length > 0) {
668 |     Object.assign(fields, task.setupData);
669 |   }
670 | 
671 |   return fields;
672 | }
673 | 
674 | /**
675 |  * Generate body for specific test scenario
676 |  */
677 | export function generateBodyForScenario(
678 |   scenario: BodyScenario,
679 |   baseFields: Record<string, any>,
680 |   task: QATask,
681 |   testId: string,
682 |   timestamp: string
683 | ): Record<string, any> {
684 |   const body = { ...baseFields };
685 | 
686 |   switch (scenario) {
687 |     case 'valid':
688 |       // Use base fields as-is, ensure unique values
689 |       if (body.email && !body.email.includes(timestamp)) {
690 |         body.email = `traceqa-${testId}-${timestamp}@example.com`;
691 |       }
692 |       break;
693 | 
694 |     case 'invalid_email':
695 |       if (body.email) {
696 |         body.email = 'invalid-email';
697 |       }
698 |       break;
699 | 
700 |     case 'weak_password':
701 |       if (body.password) {
702 |         body.password = 'weak';
703 |       }
704 |       break;
705 | 
706 |     case 'invalid':
707 |       // Make various fields invalid
708 |       if (body.email) {
709 |         body.email = 'invalid-email';
710 |       }
711 |       if (body.password) {
712 |         body.password = '123';
713 |       }
714 |       if (body.amount) {
715 |         body.amount = -1;
716 |       }
717 |       break;
718 | 
719 |     case 'duplicate':
720 |     case 'conflict':
721 |       // Use setup data to create duplicate
722 |       if (task.setupData && Object.keys(task.setupData).length > 0) {
723 |         Object.assign(body, task.setupData);
724 |       }
725 |       break;
726 | 
727 |     case 'missing_field':
728 |       // Remove a required field (try to identify one)
729 |       const requiredFields = ['email', 'password', 'name', 'title', 'productId'];
730 |       for (const field of requiredFields) {
731 |         if (body[field]) {
732 |           delete body[field];
733 |           break;
734 |         }
735 |       }
736 |       break;
737 | 
738 |     case 'unauthorized':
739 |       // Keep body but it will be used without proper auth
740 |       break;
741 |   }
742 | 
743 |   return body;
744 | }
745 | 
746 | /**
747 |  * Generate stateful body for multi-step tests
748 |  * 
749 |  * @param step - Test step type (setup, action, conflict)
750 |  * @param context - Test data context
751 |  * @param baseBody - Base body to modify
752 |  * @returns Modified body for the step
753 |  */
754 | export function generateStatefulBody(
755 |   step: 'setup' | 'action' | 'conflict',
756 |   context: TestDataContext,
757 |   baseBody: Record<string, any>
758 | ): Record<string, any> {
759 |   const body = { ...baseBody };
760 | 
761 |   switch (step) {
762 |     case 'setup':
763 |       // Generate unique data for setup
764 |       if (body.email && !body.email.includes(context.timestamp)) {
765 |         body.email = `traceqa-${context.testId}-${context.timestamp}@example.com`;
766 |       }
767 |       if (body.username && !body.username.includes(context.testId)) {
768 |         body.username = `traceqa_${context.testId}`;
769 |       }
770 |       // Store for later use
771 |       Object.assign(context.setupData, body);
772 |       break;
773 | 
774 |     case 'action':
775 |       // Use different data from setup
776 |       if (body.email) {
777 |         body.email = `traceqa-${context.testId}-action-${context.timestamp}@example.com`;
778 |       }
779 |       break;
780 | 
781 |     case 'conflict':
782 |       // Reuse exact same data from setup to trigger conflict
783 |       if (context.setupData && Object.keys(context.setupData).length > 0) {
784 |         Object.assign(body, context.setupData);
785 |       }
786 |       break;
787 |   }
788 | 
789 |   return body;
790 | }
791 | 
792 | /**
793 |  * Generate generic fallback body when no other source is available
794 |  */
795 | function generateGenericFallback(
796 |   scenario: BodyScenario,
797 |   testId: string,
798 |   timestamp: string
799 | ): Record<string, any> {
800 |   const body: Record<string, any> = {
801 |     name: `TraceQA ${testId}`,
802 |     description: 'Generated by TraceQA for automated testing',
803 |   };
804 | 
805 |   // Add common fields based on scenario
806 |   if (scenario === 'valid') {
807 |     body.email = `traceqa-${testId}-${timestamp}@example.com`;
808 |     body.value = 'test-value';
809 |   } else if (scenario === 'invalid_email') {
810 |     body.email = 'invalid-email';
811 |   } else if (scenario === 'weak_password') {
812 |     body.password = 'weak';
813 |   } else if (scenario === 'invalid') {
814 |     body.email = 'invalid-email';
815 |     body.value = '';
816 |   }
817 | 
818 |   return body;
819 | }
820 | 
821 | /**
822 |  * Validate generated body and add warnings
823 |  * 
824 |  * @param body - Generated body
825 |  * @param method - HTTP method
826 |  * @param route - Route information
827 |  * @returns Array of validation warnings
828 |  */
829 | export function validateGeneratedBody(
830 |   body: Record<string, any> | null,
831 |   method: string,
832 |   route: DiscoveredRoute | null
833 | ): string[] {
834 |   const warnings: string[] = [];
835 | 
836 |   // Check if body is needed but missing
837 |   const bodyMethods = ['POST', 'PUT', 'PATCH'];
838 |   if (bodyMethods.includes(method.toUpperCase())) {
839 |     if (!body || Object.keys(body).length === 0) {
840 |       warnings.push(`${method} request typically requires a body, but none was generated`);
841 |     }
842 |   }
843 | 
844 |   // Check for minimal fields
845 |   if (body && Object.keys(body).length < 2) {
846 |     warnings.push('Generated body has very few fields - may be insufficient');
847 |   }
848 | 
849 |   // Check for generic values
850 |   if (body) {
851 |     const hasGenericValues = Object.values(body).some(
852 |       (value) => typeof value === 'string' && value.includes('TraceQA')
853 |     );
854 |     if (hasGenericValues) {
855 |       warnings.push('Body contains generic placeholder values');
856 |     }
857 |   }
858 | 
859 |   return warnings;
860 | }
861 | 
862 | // Made with Bob
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\reporting\index.ts

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:38:12.212Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.09

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Now let me read the remaining critical files to complete my analysis.

<read_file>
<args>
<file>
<path>src/testing/test-coordinator.ts</path>
</file>
<file>
<path>src/reporting/report-generator.ts</path>
</file>
<file>
<path>src/config/config-loader.ts</path>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/testing/test-coordinator.ts', 'src/reporting/report-generator.ts', 'src/config/config-loader.ts'] Result:
<files>
<file><path>src/testing/test-coordinator.ts</path><file_outline>File: test-coordinator.ts (1415 lines)

Class: TestCoordinator (lines 59-1401)
  Propertys: agent, apiTester, buildSystem, config, mcpManager, normalizedTests, routeDiscovery, state, testRunner, webTester
  Constructor: constructor (lines 71-110)
    Propertys: agent, baseUrl, buildSystem, cleanup, execution, healthUrl, mcp, phase
  Method: abort (lines 1362-1365)
  Method: buildProject (lines 562-654)
    Propertys: port, port, serverUrl, serverUrl, serverUrl, serverUrl, success, success, success, success, success, success
  Method: cleanup (lines 1321-1342)
  Method: createTestContext (lines 659-730)
  Method: executeAPITest (lines 871-1007)
    Propertys: duration, duration, duration, duration, duration, error, error, error, error, error, logs, logs, message, message, message, message, message, passed, passed, passed, passed, passed, testCaseId, testCaseId, testCaseId, testCaseId, testCaseId, testCaseName, testCaseName, testCaseName, testCaseName, testCaseName, timestamp, timestamp, timestamp, timestamp, timestamp
  Method: executeIntegrationTest (lines 1100-1190)
    Propertys: duration, duration, duration, error, error, error, message, message, message, passed, passed, passed, testCaseId, testCaseId, testCaseId, testCaseName, testCaseName, testCaseName, timestamp, timestamp, timestamp
  Method: executeTestCase (lines 827-866)
    Propertys: duration, error, message, passed, testCaseId, testCaseName, timestamp
  Method: executeTestPlan (lines 735-822)
    Propertys: retries, retryDelay, timeout, timeout
    Function: forEach (lines 759-761)
    Function: normalizedTests.filter (lines 759-759)
    Function: testRunner.onProgress (lines 782-787)
  Method: executeWebTest (lines 1012-1095)
    Propertys: duration, duration, duration, duration, error, error, error, error, message, message, message, message, passed, passed, passed, passed, screenshots, testCaseId, testCaseId, testCaseId, testCaseId, testCaseName, testCaseName, testCaseName, testCaseName, timestamp, timestamp, timestamp, timestamp
  Method: getAgent (lines 1384-1386)
  Method: getBuildSystem (lines 1377-1379)
  Method: getMCPManager (lines 1391-1393)
  Method: getNormalizedTests (lines 1398-1400)
  Method: getState (lines 1355-1357)
    Propertys: <unknown>
  Method: getTestRunner (lines 1370-1372)
  Method: initialize (lines 536-557)
  Method: parseAPITestSteps (lines 1195-1316)
    Propertys: assertions, body, expected, headers, method, operator, type, url
  Method: runTests (lines 115-203)
    Propertys: analysis, report, results, testPlan
    Function: forEach (lines 146-148)
  Method: runTestsWithNewArchitecture (lines 214-531)
    Propertys: acceptanceCriterionId, acceptanceCriterionId, classification, classification, duration, duration, duration, duration, error, error, evidence, evidence, executor, executor, message, message, outputDir, passed, passed, projectName, qaTaskId, qaTaskId, status, status, stepResults, stepResults, testCaseId, testCaseId, testCaseName, testCaseName, testId, testId, timestamp, timestamp, timestamp, timestamp, title, title
    Function: httpTestResults.map (lines 370-378)
      Propertys: duration, error, message, passed, testCaseId, testCaseName, timestamp
    Function: warnings.forEach (lines 507-507)
  Method: updatePhase (lines 1347-1350)
Function: createTestCoordinator (lines 1406-1413)
</file_outline>
<notice>This file is large (1415 lines). You will use the following strategy to understand this file:
- Inform the user you are going to use large file strategy, to efficiently understand the file
- Use the file_outline provided to get an overview of the file structure to help decide next action. This is not the full file. It is not the full depth of the contents.
- If you read the file, use precise file reads with line ranges for specific sections of interest
- Consider if other commands/tools are better suited for extracting information from that file type
- Use ask_followup_question tool if needed to identify the best next action
</notice></file>
<file><path>src/reporting/report-generator.ts</path>
<content lines="1-778">
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
 14 |   QATask,
 15 |   GeneratedHTTPTest,
 16 |   HTTPStepResult
 17 | } from '../types/index.js';
 18 | import { logger, formatDuration } from '../utils/logger.js';
 19 | 
 20 | /**
 21 |  * Report summary statistics
 22 |  */
 23 | export interface ReportSummary {
 24 |   timestamp: string;
 25 |   projectName: string;
 26 |   acceptanceCriteria: {
 27 |     total: number;
 28 |     covered: number;
 29 |     uncovered: number;
 30 |   };
 31 |   qaTasks: {
 32 |     total: number;
 33 |     automated: number;
 34 |     manual: number;
 35 |     uncertain: number;
 36 |   };
 37 |   generatedTests: {
 38 |     total: number;
 39 |     ready: number;
 40 |     uncertain: number;
 41 |     manual: number;
 42 |   };
 43 |   executionResults: {
 44 |     total: number;
 45 |     executed: number;
 46 |     passed: number;
 47 |     failed: number;
 48 |     uncertain: number;
 49 |     manual: number;
 50 |     skipped: number;
 51 |   };
 52 |   classifications: {
 53 |     passed: number;
 54 |     application_failure: number;
 55 |     traceqa_generation_issue: number;
 56 |     uncertain: number;
 57 |     manual: number;
 58 |   };
 59 |   mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
 60 |   riskLevel: 'low' | 'medium' | 'high';
 61 | }
 62 | 
 63 | /**
 64 |  * Trace matrix entry with complete AC->Task->Test->Result mapping
 65 |  */
 66 | export interface TraceMatrixEntry {
 67 |   acceptanceCriterionId: string;
 68 |   acceptanceCriterionText: string;
 69 |   qaTasks: {
 70 |     taskId: string;
 71 |     title: string;
 72 |     type: string;
 73 |     executionMode: string;
 74 |   }[];
 75 |   generatedTests: {
 76 |     testId: string;
 77 |     title: string;
 78 |     status: string;
 79 |     uncertainReason?: string;
 80 |   }[];
 81 |   executionResults: {
 82 |     testId: string;
 83 |     status: string;
 84 |     classification: string;
 85 |     executor: string;
 86 |     duration: number;
 87 |   }[];
 88 |   coverage: {
 89 |     tasksGenerated: number;
 90 |     testsGenerated: number;
 91 |     testsExecuted: number;
 92 |     testsPassed: number;
 93 |     testsFailed: number;
 94 |   };
 95 | }
 96 | 
 97 | /**
 98 |  * Complete report data structure
 99 |  */
100 | export interface ReportData {
101 |   summary: ReportSummary;
102 |   traceMatrix: TraceMatrixEntry[];
103 |   testResults: HTTPTestResult[];
104 |   mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
105 |   riskLevel: 'low' | 'medium' | 'high';
106 |   risks: string[];
107 |   recommendations: string[];
108 | }
109 | 
110 | /**
111 |  * Report Generator
112 |  * Generates comprehensive reports with proper classification and traceability
113 |  */
114 | export class ReportGenerator {
115 |   private static readonly VERSION = '2.0.0';
116 |   private static readonly DEFAULT_OUTPUT_DIR = 'traceqa-proof';
117 | 
118 |   /**
119 |    * Generate complete report with all artifacts
120 |    * 
121 |    * @param acceptanceCriteria - Parsed acceptance criteria
122 |    * @param taskPlan - Generated QA task plan
123 |    * @param testSuite - Generated HTTP test suite
124 |    * @param testResults - Execution results
125 |    * @param config - Configuration options
126 |    * @returns Paths to generated report files
127 |    */
128 |   async generateReport(
129 |     acceptanceCriteria: AcceptanceCriterion[],
130 |     taskPlan: QATaskPlan,
131 |     testSuite: GeneratedHTTPTestSuite,
132 |     testResults: HTTPTestResult[],
133 |     config?: { outputDir?: string; projectName?: string }
134 |   ): Promise<{
135 |     reportPath: string;
136 |     traceMatrixPath: string;
137 |   }> {
138 |     const reportDir = config?.outputDir || ReportGenerator.DEFAULT_OUTPUT_DIR;
139 |     const projectName = config?.projectName || taskPlan.projectName || testSuite.projectName || 'Unknown Project';
140 | 
141 |     try {
142 |       // Create output directory
143 |       await this.ensureDirectory(reportDir);
144 | 
145 |       // Generate trace matrix
146 |       const traceMatrix = this.generateTraceMatrix(
147 |         acceptanceCriteria,
148 |         taskPlan,
149 |         testSuite,
150 |         testResults
151 |       );
152 | 
153 |       // Generate summary
154 |       const summary = this.generateSummary(
155 |         projectName,
156 |         acceptanceCriteria,
157 |         taskPlan,
158 |         testSuite,
159 |         testResults,
160 |         traceMatrix
161 |       );
162 | 
163 |       // Calculate merge readiness and risk
164 |       const { mergeReadiness, riskLevel, risks, recommendations } = this.assessMergeReadiness(
165 |         summary,
166 |         traceMatrix,
167 |         testResults
168 |       );
169 | 
170 |       // Create complete report data
171 |       const reportData: ReportData = {
172 |         summary,
173 |         traceMatrix,
174 |         testResults,
175 |         mergeReadiness,
176 |         riskLevel,
177 |         risks,
178 |         recommendations
179 |       };
180 | 
181 |       // Write all report files
182 |       const reportPath = path.join(reportDir, 'report.json');
183 |       const traceMatrixPath = path.join(reportDir, 'trace-matrix.json');
184 |       const markdownPath = path.join(reportDir, 'report.md');
185 | 
186 |       await Promise.all([
187 |         this.writeJsonReport(reportPath, reportData),
188 |         this.writeTraceMatrix(traceMatrixPath, traceMatrix),
189 |         this.writeMarkdownReport(markdownPath, reportData)
190 |       ]);
191 | 
192 |       logger.success(`Reports generated successfully in ${reportDir}/`);
193 |       logger.info(`  - report.json`);
194 |       logger.info(`  - trace-matrix.json`);
195 |       logger.info(`  - report.md`);
196 | 
197 |       // Display merge readiness
198 |       this.displayMergeReadiness(mergeReadiness, riskLevel, summary);
199 | 
200 |       return { reportPath, traceMatrixPath };
201 |     } catch (error) {
202 |       logger.error('Failed to generate reports:', error);
203 |       throw error;
204 |     }
205 |   }
206 | 
207 |   /**
208 |    * Generate comprehensive trace matrix with AC->Task->Test->Result mapping
209 |    * 
210 |    * @param acceptanceCriteria - Acceptance criteria
211 |    * @param taskPlan - QA task plan
212 |    * @param testSuite - Generated test suite
213 |    * @param testResults - Execution results
214 |    * @returns Trace matrix entries
215 |    */
216 |   generateTraceMatrix(
217 |     acceptanceCriteria: AcceptanceCriterion[],
218 |     taskPlan: QATaskPlan,
219 |     testSuite: GeneratedHTTPTestSuite,
220 |     testResults: HTTPTestResult[]
221 |   ): TraceMatrixEntry[] {
222 |     const entries: TraceMatrixEntry[] = [];
223 | 
224 |     for (const criterion of acceptanceCriteria) {
225 |       // Find QA tasks for this criterion
226 |       const relatedTasks = taskPlan.tasks.filter(
227 |         task => task.acceptanceCriterionId === criterion.id
228 |       );
229 | 
230 |       // Find generated tests for this criterion
231 |       const relatedTests = testSuite.tests.filter(
232 |         test => test.acceptanceCriterionId === criterion.id
233 |       );
234 | 
235 |       // Find execution results for this criterion
236 |       const relatedResults = testResults.filter(
237 |         result => result.acceptanceCriterionId === criterion.id
238 |       );
239 | 
240 |       // Calculate coverage metrics
241 |       const testsExecuted = relatedResults.filter(
242 |         r => r.status !== 'skipped' && r.status !== 'manual'
243 |       ).length;
244 |       const testsPassed = relatedResults.filter(
245 |         r => r.status === 'passed'
246 |       ).length;
247 |       const testsFailed = relatedResults.filter(
248 |         r => r.status === 'failed'
249 |       ).length;
250 | 
251 |       entries.push({
252 |         acceptanceCriterionId: criterion.id,
253 |         acceptanceCriterionText: criterion.description,
254 |         qaTasks: relatedTasks.map(task => ({
255 |           taskId: task.taskId,
256 |           title: task.title,
257 |           type: task.type,
258 |           executionMode: task.executionMode
259 |         })),
260 |         generatedTests: relatedTests.map(test => ({
261 |           testId: test.id,
262 |           title: test.title,
263 |           status: test.status,
264 |           uncertainReason: test.uncertainReason || undefined
265 |         })),
266 |         executionResults: relatedResults.map(result => ({
267 |           testId: result.testId,
268 |           status: result.status,
269 |           classification: result.classification,
270 |           executor: result.executor,
271 |           duration: result.duration
272 |         })),
273 |         coverage: {
274 |           tasksGenerated: relatedTasks.length,
275 |           testsGenerated: relatedTests.length,
276 |           testsExecuted,
277 |           testsPassed,
278 |           testsFailed
279 |         }
280 |       });
281 |     }
282 | 
283 |     return entries;
284 |   }
285 | 
286 |   /**
287 |    * Generate comprehensive summary statistics
288 |    * 
289 |    * @param projectName - Project name
290 |    * @param acceptanceCriteria - Acceptance criteria
291 |    * @param taskPlan - QA task plan
292 |    * @param testSuite - Generated test suite
293 |    * @param testResults - Execution results
294 |    * @param traceMatrix - Trace matrix
295 |    * @returns Report summary
296 |    */
297 |   private generateSummary(
298 |     projectName: string,
299 |     acceptanceCriteria: AcceptanceCriterion[],
300 |     taskPlan: QATaskPlan,
301 |     testSuite: GeneratedHTTPTestSuite,
302 |     testResults: HTTPTestResult[],
303 |     traceMatrix: TraceMatrixEntry[]
304 |   ): ReportSummary {
305 |     // Count covered criteria (those with at least one test)
306 |     const coveredCriteria = traceMatrix.filter(
307 |       entry => entry.generatedTests.length > 0
308 |     ).length;
309 | 
310 |     // Execution results statistics
311 |     const executed = testResults.filter(
312 |       r => r.status !== 'skipped' && r.status !== 'manual'
313 |     ).length;
314 |     const passed = testResults.filter(r => r.status === 'passed').length;
315 |     const failed = testResults.filter(r => r.status === 'failed').length;
316 |     const uncertain = testResults.filter(r => r.status === 'uncertain').length;
317 |     const manual = testResults.filter(r => r.status === 'manual').length;
318 |     const skipped = testResults.filter(r => r.status === 'skipped').length;
319 | 
320 |     // Classification statistics
321 |     const classifications = {
322 |       passed: testResults.filter(r => r.classification === 'passed').length,
323 |       application_failure: testResults.filter(r => r.classification === 'application_failure').length,
324 |       traceqa_generation_issue: testResults.filter(r => r.classification === 'traceqa_generation_issue').length,
325 |       uncertain: testResults.filter(r => r.classification === 'uncertain').length,
326 |       manual: testResults.filter(r => r.classification === 'manual').length
327 |     };
328 | 
329 |     // Determine merge readiness (preliminary)
330 |     let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
331 |     if (classifications.application_failure > 0) {
332 |       mergeReadiness = 'not_ready';
333 |     } else if (classifications.traceqa_generation_issue > 0 || classifications.uncertain > 0) {
334 |       mergeReadiness = 'uncertain';
335 |     }
336 | 
337 |     // Determine risk level (preliminary)
338 |     let riskLevel: 'low' | 'medium' | 'high' = 'low';
339 |     if (classifications.application_failure > 2 || failed > 3) {
340 |       riskLevel = 'high';
341 |     } else if (classifications.application_failure > 0 || failed > 0 || uncertain > 2) {
342 |       riskLevel = 'medium';
343 |     }
344 | 
345 |     return {
346 |       timestamp: new Date().toISOString(),
347 |       projectName,
348 |       acceptanceCriteria: {
349 |         total: acceptanceCriteria.length,
350 |         covered: coveredCriteria,
351 |         uncovered: acceptanceCriteria.length - coveredCriteria
352 |       },
353 |       qaTasks: {
354 |         total: taskPlan.summary.totalTasks,
355 |         automated: taskPlan.summary.automatedTasks,
356 |         manual: taskPlan.summary.manualTasks,
357 |         uncertain: taskPlan.summary.uncertainTasks
358 |       },
359 |       generatedTests: {
360 |         total: testSuite.summary.totalTests,
361 |         ready: testSuite.summary.readyTests,
362 |         uncertain: testSuite.summary.uncertainTests,
363 |         manual: testSuite.summary.manualTests
364 |       },
365 |       executionResults: {
366 |         total: testResults.length,
367 |         executed,
368 |         passed,
369 |         failed,
370 |         uncertain,
371 |         manual,
372 |         skipped
373 |       },
374 |       classifications,
375 |       mergeReadiness,
376 |       riskLevel
377 |     };
378 |   }
379 | 
380 |   /**
381 |    * Assess merge readiness and risk level
382 |    * 
383 |    * @param summary - Report summary
384 |    * @param traceMatrix - Trace matrix
385 |    * @param testResults - Test results
386 |    * @returns Merge readiness assessment
387 |    */
388 |   private assessMergeReadiness(
389 |     summary: ReportSummary,
390 |     traceMatrix: TraceMatrixEntry[],
391 |     testResults: HTTPTestResult[]
392 |   ): {
393 |     mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
394 |     riskLevel: 'low' | 'medium' | 'high';
395 |     risks: string[];
396 |     recommendations: string[];
397 |   } {
398 |     const risks: string[] = [];
399 |     const recommendations: string[] = [];
400 | 
401 |     // Check for application failures
402 |     if (summary.classifications.application_failure > 0) {
403 |       risks.push(`${summary.classifications.application_failure} application failure(s) detected`);
404 |       recommendations.push('Fix application failures before merging');
405 |     }
406 | 
407 |     // Check for test generation issues
408 |     if (summary.classifications.traceqa_generation_issue > 0) {
409 |       risks.push(`${summary.classifications.traceqa_generation_issue} test generation issue(s)`);
410 |       recommendations.push('Review and fix test generation issues');
411 |     }
412 | 
413 |     // Check for uncertain tests
414 |     if (summary.classifications.uncertain > 2) {
415 |       risks.push(`${summary.classifications.uncertain} uncertain test(s)`);
416 |       recommendations.push('Investigate uncertain tests or run manually');
417 |     }
418 | 
419 |     // Check coverage
420 |     const coveragePercent = (summary.acceptanceCriteria.covered / summary.acceptanceCriteria.total) * 100;
421 |     if (coveragePercent < 80) {
422 |       risks.push(`Low coverage: ${coveragePercent.toFixed(1)}%`);
423 |       recommendations.push('Improve test coverage for uncovered acceptance criteria');
424 |     }
425 | 
426 |     // Check execution rate
427 |     const executionRate = (summary.executionResults.executed / summary.executionResults.total) * 100;
428 |     if (executionRate < 80 && summary.executionResults.total > 0) {
429 |       risks.push(`Low execution rate: ${executionRate.toFixed(1)}%`);
430 |       recommendations.push('Execute remaining tests');
431 |     }
432 | 
433 |     // Determine final merge readiness
434 |     let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
435 |     if (summary.classifications.application_failure > 0) {
436 |       mergeReadiness = 'not_ready';
437 |     } else if (
438 |       summary.classifications.traceqa_generation_issue > 0 ||
439 |       summary.classifications.uncertain > 2 ||
440 |       executionRate < 50
441 |     ) {
442 |       mergeReadiness = 'uncertain';
443 |     }
444 | 
445 |     // Determine risk level
446 |     let riskLevel: 'low' | 'medium' | 'high' = 'low';
447 |     if (summary.classifications.application_failure > 2 || coveragePercent < 50) {
448 |       riskLevel = 'high';
449 |     } else if (
450 |       summary.classifications.application_failure > 0 ||
451 |       summary.classifications.traceqa_generation_issue > 2 ||
452 |       coveragePercent < 80
453 |     ) {
454 |       riskLevel = 'medium';
455 |     }
456 | 
457 |     // Add positive recommendations if ready
458 |     if (mergeReadiness === 'ready') {
459 |       recommendations.push('All tests passed - safe to merge');
460 |     }
461 | 
462 |     return { mergeReadiness, riskLevel, risks, recommendations };
463 |   }
464 | 
465 |   /**
466 |    * Write JSON report
467 |    */
468 |   private async writeJsonReport(filePath: string, data: ReportData): Promise<void> {
469 |     await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
470 |   }
471 | 
472 |   /**
473 |    * Write trace matrix JSON
474 |    */
475 |   private async writeTraceMatrix(filePath: string, matrix: TraceMatrixEntry[]): Promise<void> {
476 |     await fs.writeFile(filePath, JSON.stringify(matrix, null, 2), 'utf-8');
477 |   }
478 | 
479 |   /**
480 |    * Write markdown report
481 |    */
482 |   private async writeMarkdownReport(filePath: string, data: ReportData): Promise<void> {
483 |     const md = this.generateMarkdown(data);
484 |     await fs.writeFile(filePath, md, 'utf-8');
485 |   }
486 | 
487 |   /**
488 |    * Generate markdown report content
489 |    */
490 |   private generateMarkdown(data: ReportData): string {
491 |     const { summary, traceMatrix, testResults, mergeReadiness, riskLevel, risks, recommendations } = data;
492 | 
493 |     let md = `# TraceQA Test Report\n\n`;
494 |     md += `**Project:** ${summary.projectName}\n`;
495 |     md += `**Generated:** ${summary.timestamp}\n`;
496 |     md += `**Executor:** HTTP API executor\n`;
497 |     md += `**TraceQA Version:** ${ReportGenerator.VERSION}\n\n`;
498 | 
499 |     // Summary Section
500 |     md += `## Summary\n\n`;
501 |     md += `- **Acceptance Criteria:** ${summary.acceptanceCriteria.total} total, ${summary.acceptanceCriteria.covered} covered\n`;
502 |     md += `- **QA Tasks:** ${summary.qaTasks.total} generated (${summary.qaTasks.automated} automated, ${summary.qaTasks.manual} manual, ${summary.qaTasks.uncertain} uncertain)\n`;
503 |     md += `- **Generated Tests:** ${summary.generatedTests.total} generated (${summary.generatedTests.ready} ready, ${summary.generatedTests.uncertain} uncertain, ${summary.generatedTests.manual} manual)\n`;
504 |     md += `- **Execution Results:** ${summary.executionResults.executed}/${summary.executionResults.total} executed, ${summary.executionResults.passed} passed, ${summary.executionResults.failed} failed\n\n`;
505 | 
506 |     // Result Classifications
507 |     md += `## Result Classifications\n\n`;
508 |     md += `- ✓ **Passed:** ${summary.classifications.passed}\n`;
509 |     md += `- ✗ **Application Failures:** ${summary.classifications.application_failure}\n`;
510 |     md += `- ⚠ **Test Generation Issues:** ${summary.classifications.traceqa_generation_issue}\n`;
511 |     md += `- ? **Uncertain:** ${summary.classifications.uncertain}\n`;
512 |     md += `- 👤 **Manual:** ${summary.classifications.manual}\n\n`;
513 | 
514 |     // Merge Readiness
515 |     const readinessEmoji = {
516 |       ready: '✅',
517 |       not_ready: '❌',
518 |       uncertain: '⚠️'
519 |     }[mergeReadiness];
520 | 
521 |     const readinessText = {
522 |       ready: 'READY TO MERGE',
523 |       not_ready: 'NOT READY TO MERGE',
524 |       uncertain: 'UNCERTAIN - REVIEW NEEDED'
525 |     }[mergeReadiness];
526 | 
527 |     md += `## Merge Readiness\n\n`;
528 |     md += `${readinessEmoji} **${readinessText}**\n\n`;
529 | 
530 |     if (recommendations.length > 0) {
531 |       md += `**Recommendations:**\n`;
532 |       recommendations.forEach(rec => {
533 |         md += `- ${rec}\n`;
534 |       });
535 |       md += `\n`;
536 |     }
537 | 
538 |     // Risk Summary
539 |     const riskEmoji = {
540 |       low: '🟢',
541 |       medium: '🟡',
542 |       high: '🔴'
543 |     }[riskLevel];
544 | 
545 |     md += `## Risk Summary\n\n`;
546 |     md += `**Risk Level:** ${riskEmoji} ${riskLevel.toUpperCase()}\n\n`;
547 | 
548 |     if (risks.length > 0) {
549 |       md += `**Identified Risks:**\n`;
550 |       risks.forEach(risk => {
551 |         md += `- ⚠️ ${risk}\n`;
552 |       });
553 |       md += `\n`;
554 |     } else {
555 |       md += `No significant risks identified.\n\n`;
556 |     }
557 | 
558 |     // Trace Matrix
559 |     md += `## Trace Matrix\n\n`;
560 | 
561 |     for (const entry of traceMatrix) {
562 |       md += `### ${entry.acceptanceCriterionId}: ${entry.acceptanceCriterionText}\n\n`;
563 | 
564 |       // QA Tasks
565 |       if (entry.qaTasks.length > 0) {
566 |         md += `**QA Tasks:**\n`;
567 |         entry.qaTasks.forEach(task => {
568 |           md += `- ${task.taskId}: ${task.title} (${task.type}, ${task.executionMode})\n`;
569 |         });
570 |         md += `\n`;
571 |       }
572 | 
573 |       // Generated Tests
574 |       if (entry.generatedTests.length > 0) {
575 |         md += `**Generated Tests:**\n`;
576 |         entry.generatedTests.forEach(test => {
577 |           const statusIcon = test.status === 'ready' ? '✓' : test.status === 'uncertain' ? '?' : '👤';
578 |           md += `- ${statusIcon} ${test.testId}: ${test.title} (${test.status})`;
579 |           if (test.uncertainReason) {
580 |             md += ` - ${test.uncertainReason}`;
581 |           }
582 |           md += `\n`;
583 |         });
584 |         md += `\n`;
585 |       }
586 | 
587 |       // Execution Results
588 |       if (entry.executionResults.length > 0) {
589 |         md += `**Execution Results:**\n`;
590 |         entry.executionResults.forEach(result => {
591 |           const statusIcon = {
592 |             passed: '✓',
593 |             failed: '✗',
594 |             uncertain: '?',
595 |             manual: '👤',
596 |             skipped: '⊘'
597 |           }[result.status] || '?';
598 |           
599 |           const classIcon = {
600 |             passed: '✓',
601 |             application_failure: '✗',
602 |             traceqa_generation_issue: '⚠',
603 |             uncertain: '?',
604 |             manual: '👤'
605 |           }[result.classification] || '?';
606 | 
607 |           md += `- ${statusIcon} ${result.testId}: ${result.status} (${classIcon} ${result.classification}) - ${result.duration}ms\n`;
608 |           md += `  - Executor: ${result.executor}\n`;
609 |         });
610 |         md += `\n`;
611 |       }
612 | 
613 |       // Coverage
614 |       md += `**Coverage:**\n`;
615 |       md += `- Tasks Generated: ${entry.coverage.tasksGenerated}\n`;
616 |       md += `- Tests Generated: ${entry.coverage.testsGenerated}\n`;
617 |       md += `- Tests Executed: ${entry.coverage.testsExecuted}\n`;
618 |       md += `- Tests Passed: ${entry.coverage.testsPassed}\n`;
619 |       md += `- Tests Failed: ${entry.coverage.testsFailed}\n\n`;
620 |     }
621 | 
622 |     // Test Details
623 |     md += `## Test Details\n\n`;
624 | 
625 |     // Group by classification
626 |     const passedTests = testResults.filter(r => r.classification === 'passed');
627 |     const appFailures = testResults.filter(r => r.classification === 'application_failure');
628 |     const genIssues = testResults.filter(r => r.classification === 'traceqa_generation_issue');
629 |     const uncertainTests = testResults.filter(r => r.classification === 'uncertain');
630 |     const manualTests = testResults.filter(r => r.classification === 'manual');
631 | 
632 |     // Passed Tests
633 |     if (passedTests.length > 0) {
634 |       md += `### ✓ Passed Tests (${passedTests.length})\n\n`;
635 |       passedTests.forEach(result => {
636 |         md += this.formatTestDetail(result);
637 |       });
638 |     }
639 | 
640 |     // Application Failures
641 |     if (appFailures.length > 0) {
642 |       md += `### ✗ Application Failures (${appFailures.length})\n\n`;
643 |       md += `*These failures indicate issues with the application under test.*\n\n`;
644 |       appFailures.forEach(result => {
645 |         md += this.formatTestDetail(result);
646 |       });
647 |     }
648 | 
649 |     // Test Generation Issues
650 |     if (genIssues.length > 0) {
651 |       md += `### ⚠ Test Generation Issues (${genIssues.length})\n\n`;
652 |       md += `*These are issues with test generation, not application bugs.*\n\n`;
653 |       genIssues.forEach(result => {
654 |         md += this.formatTestDetail(result);
655 |       });
656 |     }
657 | 
658 |     // Uncertain Tests
659 |     if (uncertainTests.length > 0) {
660 |       md += `### ? Uncertain Tests (${uncertainTests.length})\n\n`;
661 |       md += `*These tests could not be classified definitively.*\n\n`;
662 |       uncertainTests.forEach(result => {
663 |         md += this.formatTestDetail(result);
664 |       });
665 |     }
666 | 
667 |     // Manual Tests
668 |     if (manualTests.length > 0) {
669 |       md += `### 👤 Manual Tests (${manualTests.length})\n\n`;
670 |       md += `*These tests require manual execution.*\n\n`;
671 |       manualTests.forEach(result => {
672 |         md += this.formatTestDetail(result);
673 |       });
674 |     }
675 | 
676 |     // Footer
677 |     md += `---\n\n`;
678 |     md += `*Report generated by TraceQA v${ReportGenerator.VERSION} on ${summary.timestamp}*\n`;
679 | 
680 |     return md;
681 |   }
682 | 
683 |   /**
684 |    * Format test detail for markdown
685 |    */
686 |   private formatTestDetail(result: HTTPTestResult): string {
687 |     let md = `#### ${result.testId}: ${result.title}\n\n`;
688 |     md += `**Status:** ${result.status}\n`;
689 |     md += `**Classification:** ${result.classification}\n`;
690 |     md += `**Executor:** ${result.executor}\n`;
691 |     md += `**Duration:** ${result.duration}ms\n\n`;
692 | 
693 |     if (result.stepResults.length > 0) {
694 |       md += `**Steps:**\n`;
695 |       result.stepResults.forEach((step, index) => {
696 |         const stepIcon = step.passed ? '✓' : '✗';
697 |         md += `${index + 1}. ${stepIcon} ${step.description}\n`;
698 |         md += `   - Method: ${step.method}\n`;
699 |         md += `   - URL: ${step.url}\n`;
700 |         md += `   - Expected Status: ${step.expectedStatus}\n`;
701 |         md += `   - Actual Status: ${step.actualStatus}\n`;
702 |         md += `   - Result: ${step.passed ? 'Passed' : 'Failed'}\n`;
703 |         if (step.error) {
704 |           md += `   - Error: ${step.error}\n`;
705 |         }
706 |       });
707 |       md += `\n`;
708 |     }
709 | 
710 |     if (result.evidence.length > 0) {
711 |       md += `**Evidence:**\n`;
712 |       result.evidence.forEach(ev => {
713 |         md += `- ${ev}\n`;
714 |       });
715 |       md += `\n`;
716 |     }
717 | 
718 |     return md;
719 |   }
720 | 
721 |   /**
722 |    * Display merge readiness in console
723 |    */
724 |   private displayMergeReadiness(
725 |     mergeReadiness: 'ready' | 'not_ready' | 'uncertain',
726 |     riskLevel: 'low' | 'medium' | 'high',
727 |     summary: ReportSummary
728 |   ): void {
729 |     console.log('\n' + '='.repeat(80));
730 | 
731 |     if (mergeReadiness === 'ready') {
732 |       logger.success(`✅ MERGE READINESS: READY TO MERGE (Risk: ${riskLevel})`);
733 |     } else if (mergeReadiness === 'uncertain') {
734 |       logger.warn(`⚠️  MERGE READINESS: UNCERTAIN - REVIEW NEEDED (Risk: ${riskLevel})`);
735 |     } else {
736 |       logger.error(`❌ MERGE READINESS: NOT READY TO MERGE (Risk: ${riskLevel})`);
737 |     }
738 | 
739 |     console.log('='.repeat(80));
740 |     console.log(`\nTests: ${summary.executionResults.executed}/${summary.executionResults.total} executed`);
741 |     console.log(`Passed: ${summary.classifications.passed}`);
742 |     console.log(`Application Failures: ${summary.classifications.application_failure}`);
743 |     console.log(`Test Generation Issues: ${summary.classifications.traceqa_generation_issue}`);
744 |     console.log(`Uncertain: ${summary.classifications.uncertain}`);
745 |     console.log('');
746 |   }
747 | 
748 |   /**
749 |    * Ensure directory exists
750 |    */
751 |   private async ensureDirectory(dir: string): Promise<void> {
752 |     try {
753 |       await fs.access(dir);
754 |     } catch {
755 |       await fs.mkdir(dir, { recursive: true });
756 |     }
757 |   }
758 | }
759 | 
760 | /**
761 |  * Standalone function to generate report
762 |  * Convenience wrapper for the ReportGenerator class
763 |  */
764 | export async function generateReport(
765 |   acceptanceCriteria: AcceptanceCriterion[],
766 |   taskPlan: QATaskPlan,
767 |   testSuite: GeneratedHTTPTestSuite,
768 |   testResults: HTTPTestResult[],
769 |   config?: { outputDir?: string; projectName?: string }
770 | ): Promise<{
771 |   reportPath: string;
772 |   traceMatrixPath: string;
773 | }> {
774 |   const generator = new ReportGenerator();
775 |   return generator.generateReport(acceptanceCriteria, taskPlan, testSuite, testResults, config);
776 | }
777 | 
778 | // Made with Bob
</content>
</file>
<file><path>src/config/config-loader.ts</path>
<content lines="1-161">
  1 | /**
  2 |  * TraceQA Configuration Loader
  3 |  * Loads and merges configuration from traceqa.config.json and CLI flags
  4 |  */
  5 | 
  6 | import fs from 'fs-extra';
  7 | import path from 'path';
  8 | import { logger } from '../utils/logger.js';
  9 | 
 10 | /**
 11 |  * TraceQA project configuration
 12 |  */
 13 | export interface TraceQAProjectConfig {
 14 |   // API Configuration
 15 |   baseUrl?: string;
 16 |   healthUrl?: string;
 17 |   openapi?: string;
 18 | 
 19 |   // Build Configuration
 20 |   language?: string;
 21 |   projectType?: string;
 22 |   installCommand?: string;
 23 |   buildCommand?: string;
 24 |   startCommand?: string;
 25 | 
 26 |   // Build Flags
 27 |   autoInstall?: boolean;
 28 |   autoBuild?: boolean;
 29 |   autoStart?: boolean;
 30 | 
 31 |   // Test Configuration
 32 |   testType?: 'ui' | 'api' | 'both' | 'integration';
 33 |   outputDir?: string;
 34 |   timeout?: number;
 35 |   retries?: number;
 36 | 
 37 |   // IBM watsonx Configuration
 38 |   ibmWatsonxApiKey?: string;
 39 |   ibmWatsonxProjectId?: string;
 40 |   ibmWatsonxUrl?: string;
 41 |   ibmWatsonxModel?: string;
 42 | }
 43 | 
 44 | /**
 45 |  * CLI options that can override config
 46 |  */
 47 | export interface CLIOptions {
 48 |   baseUrl?: string;
 49 |   healthUrl?: string;
 50 |   installCommand?: string;
 51 |   buildCommand?: string;
 52 |   startCommand?: string;
 53 |   openapi?: string;
 54 |   language?: string;
 55 |   projectType?: string;
 56 |   install?: boolean;
 57 |   build?: boolean;
 58 |   start?: boolean;
 59 |   outputDir?: string;
 60 |   [key: string]: any;
 61 | }
 62 | 
 63 | /**
 64 |  * Load configuration from traceqa.config.json
 65 |  */
 66 | export async function loadConfig(projectPath: string = process.cwd()): Promise<TraceQAProjectConfig> {
 67 |   const configPath = path.join(projectPath, 'traceqa.config.json');
 68 | 
 69 |   try {
 70 |     if (await fs.pathExists(configPath)) {
 71 |       logger.debug(`Loading config from: ${configPath}`);
 72 |       const config = await fs.readJSON(configPath);
 73 |       logger.success('Configuration loaded from traceqa.config.json');
 74 |       return config;
 75 |     } else {
 76 |       logger.debug('No traceqa.config.json found, using defaults');
 77 |       return {};
 78 |     }
 79 |   } catch (error) {
 80 |     logger.warn(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
 81 |     return {};
 82 |   }
 83 | }
 84 | 
 85 | /**
 86 |  * Merge configuration with CLI options (CLI takes precedence)
 87 |  */
 88 | export function mergeConfig(
 89 |   fileConfig: TraceQAProjectConfig,
 90 |   cliOptions: CLIOptions
 91 | ): TraceQAProjectConfig {
 92 |   const merged: TraceQAProjectConfig = { ...fileConfig };
 93 | 
 94 |   // Override with CLI options if provided
 95 |   if (cliOptions.baseUrl !== undefined) merged.baseUrl = cliOptions.baseUrl;
 96 |   if (cliOptions.healthUrl !== undefined) merged.healthUrl = cliOptions.healthUrl;
 97 |   if (cliOptions.installCommand !== undefined) merged.installCommand = cliOptions.installCommand;
 98 |   if (cliOptions.buildCommand !== undefined) merged.buildCommand = cliOptions.buildCommand;
 99 |   if (cliOptions.startCommand !== undefined) merged.startCommand = cliOptions.startCommand;
100 |   if (cliOptions.openapi !== undefined) merged.openapi = cliOptions.openapi;
101 |   if (cliOptions.language !== undefined) merged.language = cliOptions.language;
102 |   if (cliOptions.projectType !== undefined) merged.projectType = cliOptions.projectType;
103 |   if (cliOptions.outputDir !== undefined) merged.outputDir = cliOptions.outputDir;
104 | 
105 |   // Handle boolean flags (--no-install, --no-build, --no-start)
106 |   if (cliOptions.install === false) merged.autoInstall = false;
107 |   if (cliOptions.build === false) merged.autoBuild = false;
108 |   if (cliOptions.start === false) merged.autoStart = false;
109 | 
110 |   logger.debug('Merged configuration:', merged);
111 | 
112 |   return merged;
113 | }
114 | 
115 | /**
116 |  * Load and merge configuration
117 |  */
118 | export async function loadAndMergeConfig(
119 |   projectPath: string,
120 |   cliOptions: CLIOptions
121 | ): Promise<TraceQAProjectConfig> {
122 |   const fileConfig = await loadConfig(projectPath);
123 |   return mergeConfig(fileConfig, cliOptions);
124 | }
125 | 
126 | /**
127 |  * Validate configuration
128 |  */
129 | export function validateConfig(config: TraceQAProjectConfig): { valid: boolean; errors: string[] } {
130 |   const errors: string[] = [];
131 | 
132 |   // If baseUrl is provided, validate it's a valid URL
133 |   if (config.baseUrl) {
134 |     try {
135 |       new URL(config.baseUrl);
136 |     } catch {
137 |       errors.push(`Invalid baseUrl: ${config.baseUrl}`);
138 |     }
139 |   }
140 | 
141 |   // If healthUrl is provided, validate it's a valid URL
142 |   if (config.healthUrl) {
143 |     try {
144 |       new URL(config.healthUrl);
145 |     } catch {
146 |       errors.push(`Invalid healthUrl: ${config.healthUrl}`);
147 |     }
148 |   }
149 | 
150 |   // If openapi is provided, check if file exists
151 |   if (config.openapi && !fs.existsSync(config.openapi)) {
152 |     errors.push(`OpenAPI spec file not found: ${config.openapi}`);
153 |   }
154 | 
155 |   return {
156 |     valid: errors.length === 0,
157 |     errors
158 |   };
159 | }
160 | 
161 | // Made with Bob
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\reporting\index.ts

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:38:15.856Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.21

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Perfect! Now I have all the information I need. Let me read a specific section of test-coordinator.ts to understand test status determination, then create the comprehensive analysis document.

<read_file>
<args>
<file>
<path>src/testing/test-coordinator.ts</path>
<line_range>214-531</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/testing/test-coordinator.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/testing/test-coordinator.ts</path>
<content lines="214-531">
214 |   async runTestsWithNewArchitecture(options: {
215 |     acceptancePath: string;
216 |     baseUrl: string;
217 |     outputDir?: string;
218 |     generatedDir?: string;
219 |     proofDir?: string;
220 |     debugDir?: string;
221 |   }): Promise<void> {
222 |     const {
223 |       acceptancePath,
224 |       baseUrl,
225 |       outputDir = 'traceqa-proof',
226 |       generatedDir = 'traceqa-generated',
227 |       proofDir = 'traceqa-proof',
228 |       debugDir = 'traceqa-debug'
229 |     } = options;
230 | 
231 |     const warnings: string[] = [];
232 |     let ibmUsed = false;
233 | 
234 |     try {
235 |       logger.info('Starting TraceQA test execution with new architecture...');
236 |       logger.newLine();
237 | 
238 |       // Phase 1: Parse acceptance criteria
239 |       logger.section('Phase 1: Parsing acceptance criteria');
240 |       const parsed = await parseAcceptanceCriteriaFromFile(acceptancePath);
241 |       const acceptanceCriteria = parsed.criteria;
242 |       logger.success(`✓ Parsed ${acceptanceCriteria.length} acceptance criteria`);
243 |       logger.newLine();
244 | 
245 |       // Phase 2: Discover routes
246 |       logger.section('Phase 2: Discovering API routes');
247 |       const discoveryResult = await discoverRoutes(process.cwd());
248 |       const routes = discoveryResult?.routes || [];
249 |       logger.success(`✓ Discovered ${routes.length} routes`);
250 |       if (routes.length === 0) {
251 |         warnings.push('No routes discovered - tests may be limited');
252 |         logger.warn('⚠ No routes discovered - tests may be limited');
253 |       }
254 |       logger.newLine();
255 | 
256 |       // Phase 3-5: Keep existing phases for backward compatibility
257 |       logger.section('Phase 3: Getting AI suggestions (optional)');
258 |       let aiSuggestions: any[] = [];
259 |       try {
260 |         aiSuggestions = await this.agent.generateTests(
261 |           acceptanceCriteria,
262 |           routes,
263 |           baseUrl
264 |         );
265 |         
266 |         if (aiSuggestions.length > 0) {
267 |           logger.success(`✓ Received ${aiSuggestions.length} AI task suggestions`);
268 |           ibmUsed = true;
269 |         } else {
270 |           logger.warn('⚠ No AI suggestions received, using deterministic fallback');
271 |           warnings.push('AI suggestions not available - using deterministic fallback');
272 |         }
273 |       } catch (error) {
274 |         logger.warn('⚠ AI suggestion generation failed, using deterministic fallback');
275 |         logger.debug('AI error:', error);
276 |         warnings.push(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
277 |       }
278 |       logger.newLine();
279 | 
280 |       // Phase 6: Generate QA task plan using new architecture
281 |       logger.section('Phase 6: Generating QA task plan');
282 |       
283 |       // Build config object
284 |       const traceQAConfig: TraceQAConfig = {
285 |         baseUrl,
286 |         ibmWatsonxApiKey: process.env.IBM_WATSONX_API_KEY,
287 |         ibmWatsonxProjectId: process.env.IBM_WATSONX_PROJECT_ID,
288 |         ibmWatsonxUrl: process.env.IBM_WATSONX_URL,
289 |         maxRetries: 3,
290 |         timeout: 30000,
291 |       };
292 |       
293 |       const projectContext = {
294 |         projectName: 'TraceQA Project',
295 |         baseUrl,
296 |       };
297 |       
298 |       const qaTaskPlanResult = await generateQATaskPlan(
299 |         acceptanceCriteria,
300 |         routes,
301 |         traceQAConfig,
302 |         projectContext
303 |       );
304 |       
305 |       const qaTaskPlan = qaTaskPlanResult.taskPlan;
306 |       warnings.push(...qaTaskPlanResult.warnings);
307 |       ibmUsed = qaTaskPlanResult.ibmUsed || ibmUsed;
308 |       
309 |       logger.success(`✓ Generated ${qaTaskPlan.summary.totalTasks} QA tasks`);
310 |       logger.info(`  - ${qaTaskPlan.summary.automatedTasks} automated`);
311 |       logger.info(`  - ${qaTaskPlan.summary.manualTasks} manual`);
312 |       logger.info(`  - ${qaTaskPlan.summary.uncertainTasks} uncertain`);
313 |       
314 |       // Write QA task plan
315 |       await writeQATaskPlan(qaTaskPlan, generatedDir);
316 |       logger.newLine();
317 | 
318 |       // Phase 7: Generate HTTP tests using new architecture
319 |       logger.section('Phase 7: Generating HTTP tests');
320 |       
321 |       const httpTestResult = await generateHTTPTests(
322 |         qaTaskPlan,
323 |         routes,
324 |         traceQAConfig,
325 |         projectContext
326 |       );
327 |       
328 |       const testSuite = httpTestResult.testSuite;
329 |       warnings.push(...httpTestResult.warnings);
330 |       ibmUsed = httpTestResult.ibmUsed || ibmUsed;
331 |       
332 |       logger.success(`✓ Generated ${testSuite.summary.totalTests} HTTP tests`);
333 |       logger.info(`  - ${testSuite.summary.readyTests} ready`);
334 |       logger.info(`  - ${testSuite.summary.uncertainTests} uncertain`);
335 |       logger.info(`  - ${testSuite.summary.manualTests} manual`);
336 |       
337 |       // Write HTTP tests and documentation
338 |       await writeGeneratedHTTPTests(testSuite, generatedDir);
339 |       await writeGeneratedTestsMarkdown(qaTaskPlan, testSuite, generatedDir);
340 |       
341 |       // Write metadata
342 |       const metadata = {
343 |         generatedAt: new Date().toISOString(),
344 |         ibmUsed,
345 |         normalizationApplied: httpTestResult.normalizationApplied,
346 |         warnings
347 |       };
348 |       await writeGeneratedMetadata(metadata, generatedDir);
349 |       logger.newLine();
350 | 
351 |       // Phase 8: Execute ready tests using new architecture
352 |       logger.section('Phase 8: Executing ready tests');
353 |       const readyTests = testSuite.tests.filter(t => t.status === 'ready');
354 |       const uncertainTests = testSuite.tests.filter(t => t.status === 'uncertain');
355 |       const manualTests = testSuite.tests.filter(t => t.status === 'manual');
356 |       
357 |       let executionResults: TestResult[] = [];
358 |       let httpTestResults: HTTPTestResult[] = [];
359 |       
360 |       if (readyTests.length > 0) {
361 |         logger.info(`Executing ${readyTests.length} ready test(s)...`);
362 |         
363 |         try {
364 |           const executionResult = await executeHTTPTests(testSuite, traceQAConfig);
365 |           
366 |           // Store HTTP test results for new report generator
367 |           httpTestResults = executionResult.results;
368 |           
369 |           // Convert HTTPTestResult[] to TestResult[] for backward compatibility
370 |           executionResults = httpTestResults.map(r => ({
371 |             testCaseId: r.testId,
372 |             testCaseName: r.title,
373 |             passed: r.status === 'passed',
374 |             message: r.status === 'passed' ? 'Test passed' : `Test ${r.status}`,
375 |             timestamp: r.timestamp,
376 |             duration: r.duration,
377 |             error: r.status === 'failed' ? r.evidence.join('; ') : undefined,
378 |           }));
379 |           
380 |           const passed = executionResults.filter(r => r.passed).length;
381 |           const failed = executionResults.filter(r => !r.passed).length;
382 |           
383 |           logger.success(`✓ Executed ${readyTests.length} tests (${passed} passed, ${failed} failed)`);
384 |         } catch (error) {
385 |           logger.error('Test execution failed:', error);
386 |           warnings.push(`Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
387 |         }
388 |       } else {
389 |         logger.warn('⚠ No ready tests to execute');
390 |       }
391 |       
392 |       if (uncertainTests.length > 0) {
393 |         logger.warn(`⚠ Skipped ${uncertainTests.length} uncertain test(s)`);
394 |         
395 |         // Record uncertain tests without execution
396 |         for (const test of uncertainTests) {
397 |           executionResults.push({
398 |             testCaseId: test.id,
399 |             testCaseName: test.title,
400 |             passed: false,
401 |             message: `Uncertain: ${test.uncertainReason || 'Unable to generate test'}`,
402 |             timestamp: new Date().toISOString(),
403 |             duration: 0,
404 |             error: test.uncertainReason || undefined
405 |           });
406 |         }
407 |       }
408 |       
409 |       if (manualTests.length > 0) {
410 |         logger.warn(`⚠ Skipped ${manualTests.length} manual test(s)`);
411 |         
412 |         // Record manual tests without execution
413 |         for (const test of manualTests) {
414 |           executionResults.push({
415 |             testCaseId: test.id,
416 |             testCaseName: test.title,
417 |             passed: false,
418 |             message: 'Manual test - requires human execution',
419 |             timestamp: new Date().toISOString(),
420 |             duration: 0,
421 |             error: 'Manual test'
422 |           });
423 |         }
424 |       }
425 |       logger.newLine();
426 | 
427 |       // Phase 9: Generate reports using new architecture
428 |       logger.section('Phase 9: Generating reports');
429 |       const reportGenerator = new ReportGenerator();
430 |       
431 |       // Collect all HTTP test results (executed + uncertain + manual)
432 |       const allHttpTestResults: HTTPTestResult[] = [...httpTestResults];
433 |       
434 |       // Add uncertain tests as HTTPTestResult
435 |       for (const test of uncertainTests) {
436 |         allHttpTestResults.push({
437 |           testId: test.id,
438 |           acceptanceCriterionId: test.acceptanceCriterionId,
439 |           qaTaskId: test.qaTaskId,
440 |           title: test.title,
441 |           status: 'uncertain',
442 |           executor: 'uncertain',
443 |           stepResults: [],
444 |           evidence: [test.uncertainReason || 'Unable to generate test'],
445 |           classification: 'uncertain',
446 |           duration: 0,
447 |           timestamp: new Date().toISOString()
448 |         });
449 |       }
450 |       
451 |       // Add manual tests as HTTPTestResult
452 |       for (const test of manualTests) {
453 |         allHttpTestResults.push({
454 |           testId: test.id,
455 |           acceptanceCriterionId: test.acceptanceCriterionId,
456 |           qaTaskId: test.qaTaskId,
457 |           title: test.title,
458 |           status: 'manual',
459 |           executor: 'manual',
460 |           stepResults: [],
461 |           evidence: ['Manual test - requires human execution'],
462 |           classification: 'manual',
463 |           duration: 0,
464 |           timestamp: new Date().toISOString()
465 |         });
466 |       }
467 | 
468 |       await reportGenerator.generateReport(
469 |         acceptanceCriteria,
470 |         qaTaskPlan,
471 |         testSuite,
472 |         allHttpTestResults,
473 |         { outputDir: proofDir, projectName: projectContext.projectName }
474 |       );
475 |       
476 |       logger.success(`✓ Reports generated in ${proofDir}/`);
477 |       logger.newLine();
478 | 
479 |       // Summary
480 |       logger.section('Test Execution Summary');
481 |       
482 |       // Calculate summary statistics
483 |       const passed = executionResults.filter(r => r.passed).length;
484 |       const failed = executionResults.filter(r => !r.passed).length;
485 |       
486 |       logger.keyValue('Total QA Tasks', qaTaskPlan.summary.totalTasks.toString());
487 |       logger.keyValue('  - Automated', qaTaskPlan.summary.automatedTasks.toString());
488 |       logger.keyValue('  - Manual', qaTaskPlan.summary.manualTasks.toString());
489 |       logger.keyValue('  - Uncertain', qaTaskPlan.summary.uncertainTasks.toString());
490 |       logger.newLine();
491 |       logger.keyValue('Total HTTP Tests', testSuite.summary.totalTests.toString());
492 |       logger.keyValue('  - Ready', testSuite.summary.readyTests.toString());
493 |       logger.keyValue('  - Uncertain', testSuite.summary.uncertainTests.toString());
494 |       logger.keyValue('  - Manual', testSuite.summary.manualTests.toString());
495 |       logger.newLine();
496 |       logger.keyValue('Execution Results', '');
497 |       logger.keyValue('  - Passed', passed.toString());
498 |       logger.keyValue('  - Failed', failed.toString());
499 |       logger.keyValue('  - Skipped', (uncertainTests.length + manualTests.length).toString());
500 |       logger.newLine();
501 |       logger.keyValue('Artifacts', generatedDir + '/');
502 |       logger.keyValue('Reports', proofDir + '/');
503 |       
504 |       if (warnings.length > 0) {
505 |         logger.newLine();
506 |         logger.warn('Warnings:');
507 |         warnings.forEach(w => logger.warn(`  - ${w}`));
508 |       }
509 | 
510 |     } catch (error) {
511 |       logger.error('Test execution failed:', error);
512 |       
513 |       // Write debug information
514 |       try {
515 |         const fs = await import('fs-extra');
516 |         const path = await import('path');
517 |         await fs.ensureDir(debugDir);
518 |         await fs.writeFile(
519 |           path.join(debugDir, 'error.log'),
520 |           `Error: ${error instanceof Error ? error.message : String(error)}\n` +
521 |           `Stack: ${error instanceof Error ? error.stack : 'N/A'}\n` +
522 |           `Timestamp: ${new Date().toISOString()}\n`,
523 |           'utf-8'
524 |         );
525 |       } catch (debugError) {
526 |         logger.debug('Failed to write debug log:', debugError);
527 |       }
528 |       
529 |       throw error;
530 |     }
531 |   }
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\reporting\index.ts

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:38:20.052Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.37

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Excellent! Now I have all the information needed. Let me create a comprehensive architecture analysis document.

<write_to_file>
<path>traceqa-debug/architecture-analysis.md</path>
<content># TraceQA Architecture Analysis: Hardcoded Domain Logic & Route Mapping Issues

**Analysis Date:** 2026-05-02  
**Analyst:** Bob  
**Purpose:** Identify hardcoded domain logic and architectural issues in route-mapping system

---

## Executive Summary

TraceQA's current architecture demonstrates **excellent generic design** with minimal hardcoded domain logic. The system uses **pattern-based inference** rather than hardcoded route mappings. However, there are specific areas where domain-specific patterns exist that could be made more configurable.

**Key Findings:**
- ✅ **No hardcoded route mappings** - System uses semantic matching
- ✅ **Generic resource/action detection** - Pattern-based, not domain-specific
- ⚠️ **Some hardcoded domain patterns** in validation logic (email, password, etc.)
- ✅ **IBM integration is clean** - No route mapping in AI responses
- ✅ **Config structure supports extensibility** - Ready for route mapping config

---

## 1. Route Matching Architecture

### 1.1 Current Flow: `src/validation/route-matcher.ts`

**Location:** Lines 1-607

**Architecture:** Generic semantic matching with NO hardcoded routes

```typescript
// GOOD: Generic action patterns (lines 68-76)
const ACTION_PATTERNS = {
  create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
  read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
  update: /\b(update|edit|modify|change|patch|put)\b/i,
  delete: /\b(delete|remove|destroy)\b/i,
  list: /\b(list|all|index|collection)\b/i,
  health: /\b(health|status|ping|alive|ready|liveness|readiness)\b/i,
  auth: /\b(login|authenticate|sign\s*in|auth|token|session)\b/i,
};
```

**Analysis:**
- ✅ Uses regex patterns to detect actions from text
- ✅ No hardcoded routes like `/api/register` or `/api/login`
- ✅ Generic resource patterns (lines 81-97) cover common REST resources
- ✅ Scoring algorithm (lines 267-293) is domain-agnostic

**Resource Patterns (Lines 81-97):**
```typescript
const RESOURCE_PATTERNS = [
  /\b(user|account|profile|member)s?\b/i,
  /\b(order|purchase|transaction)s?\b/i,
  /\b(product|item|article)s?\b/i,
  // ... 12 more generic patterns
];
```

**Issue:** While generic, these patterns are still hardcoded. Should be configurable.

### 1.2 Route Matching Function

**Function:** `matchRouteToTask()` (Lines 233-332)

**Flow:**
1. Combines task + acceptance criterion text
2. Detects resource and action using patterns
3. Scores discovered routes based on:
   - Method match (40 points)
   - Path match (40 points)
   - Keyword similarity (20 points)
   - OpenAPI description match (10 bonus points)
4. Returns best match with confidence level

**Strengths:**
- ✅ No hardcoded route mappings
- ✅ Uses discovered routes from actual application
- ✅ Confidence-based scoring
- ✅ Supports OpenAPI for enhanced matching

**Weaknesses:**
- ⚠️ Resource patterns are hardcoded (should be in config)
- ⚠️ Action patterns are hardcoded (should be extensible)

---

## 2. HTTP Test Generation

### 2.1 Test Generator: `src/generators/http-test-generator.ts`

**Location:** Lines 1-878

**Architecture:** IBM-first with deterministic fallback

**Key Functions:**

#### `generateHTTPTests()` (Lines 83-180)
- Main entry point
- Initializes IBM client if API key available
- Generates tests for each QA task
- Tracks IBM usage and normalization

#### `generateTestFromTask()` (Lines 193-296)
- Matches route using `matchRouteToTask()`
- Tries IBM generation first
- Falls back to deterministic generation
- Validates and normalizes all steps

#### `generateTestStepsWithIBM()` (Lines 308-354)
- Sends prompt to IBM watsonx
- Extracts JSON from response
- Returns test steps or null on failure

**IBM Prompt (Lines 365-409):**
```typescript
function buildHTTPTestPrompt(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  matchedRoute: DiscoveredRoute | null,
  baseUrl: string
): string {
  const routeInfo = matchedRoute
    ? `Matched Route: ${matchedRoute.method} ${matchedRoute.path}`
    : 'No specific route matched - infer from task description';
  // ... builds prompt with context
}
```

**Analysis:**
- ✅ IBM receives matched route, not hardcoded routes
- ✅ Prompt asks IBM to use discovered routes
- ✅ No domain-specific route suggestions in prompt
- ✅ Fallback generation uses same route matching

**Fallback Generation (Lines 762-855):**
- Uses `matchRouteToTask()` to find route
- Generates multi-step or single-step tests
- Uses `generateRequestBody()` for body generation
- No hardcoded routes

---

## 3. QA Task Plan Generation

### 3.1 Task Plan Generator: `src/generators/qa-task-plan-generator.ts`

**Location:** Lines 1-657

**Architecture:** IBM-first with deterministic fallback

**Key Functions:**

#### `buildQATaskPlanPrompt()` (Lines 91-186)
- Builds prompt with discovered routes
- Includes OpenAPI info if available
- Asks IBM to classify tasks based on routes

**Prompt Structure:**
```typescript
Discovered Routes:
${routesSummary}

Acceptance Criteria:
${acceptanceCriteria.map(...)}

Task: Create a QA task plan by mapping each acceptance criterion to tasks.
```

**Analysis:**
- ✅ IBM receives discovered routes, not hardcoded mappings
- ✅ Classification is based on route availability
- ✅ No domain-specific task types hardcoded

#### `generateFallbackTasks()` (Lines 311-417)
- Uses `detectResourceAndAction()` from route-matcher
- Infers task type from criterion text
- Checks for API/UI/integration keywords
- No hardcoded route mappings

**Fallback Logic (Lines 333-371):**
```typescript
// Check if criterion mentions API/endpoint
if (/\b(api|endpoint|request|response|status|json)\b/i.test(combinedText)) {
  if (discoveredRoutes.length > 0) {
    type = 'api';
    executionMode = 'automated';
  } else {
    type = 'uncertain';
  }
}
```

**Analysis:**
- ✅ Generic keyword detection
- ✅ Depends on discovered routes, not hardcoded ones
- ✅ Conservative classification (marks as uncertain when unsure)

---

## 4. Request Body Generation

### 4.1 Body Generator: `src/validation/body-generator.ts`

**Location:** Lines 1-862

**Architecture:** Priority-based with multiple fallback strategies

**Generation Priority:**
1. OpenAPI request schema (highest confidence)
2. IBM suggested body
3. Config sample data
4. Inferred fields from context
5. Generic fallback (lowest confidence)

**Key Functions:**

#### `generateRequestBody()` (Lines 75-203)
- Main entry point
- Tries each strategy in order
- Returns body with confidence level

#### `inferFieldsFromContext()` (Lines 588-672)
**⚠️ HARDCODED DOMAIN LOGIC FOUND:**

```typescript
// Lines 599-640: Hardcoded field inference
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}
if (text.includes('username') || text.includes('user name')) {
  fields.username = `traceqa_${testId}`;
}
// ... more hardcoded field patterns
```

**Issue:** Field inference patterns are hardcoded. Should be configurable.

#### `generateBodyForScenario()` (Lines 677-744)
**⚠️ HARDCODED SCENARIO LOGIC:**

```typescript
switch (scenario) {
  case 'invalid_email':
    if (body.email) {
      body.email = 'invalid-email';  // Hardcoded invalid value
    }
    break;
  case 'weak_password':
    if (body.password) {
      body.password = 'weak';  // Hardcoded weak value
    }
    break;
  // ... more hardcoded scenario modifications
}
```

**Issue:** Scenario-specific modifications are hardcoded.

#### `generateFieldValue()` (Lines 350-427)
**⚠️ HARDCODED FIELD VALUE GENERATION:**

```typescript
// Lines 407-412: Hardcoded field name patterns
if (fieldLower.includes('email')) {
  return generateEmailValue(fieldName, scenario, testId, timestamp);
}
if (fieldLower.includes('password')) {
  return generatePasswordValue(fieldName, scenario);
}
```

**Issue:** Field value generation based on hardcoded name patterns.

---

## 5. Test Status Determination

### 5.1 Test Coordinator: `src/testing/test-coordinator.ts`

**Location:** Lines 214-531 (analyzed section)

**Architecture:** Phase-based execution with status tracking

**Status Flow:**
1. Parse acceptance criteria
2. Discover routes
3. Get AI suggestions (optional)
4. Generate QA task plan
5. Generate HTTP tests
6. Execute ready tests
7. Record uncertain/manual tests
8. Generate reports

**Test Status Categories:**
- `ready` - Can be executed automatically
- `uncertain` - Low confidence, needs review
- `manual` - Requires human execution
- `skipped` - Not executed

**Status Determination (in http-test-generator.ts, lines 652-730):**

```typescript
function determineTestStatus(
  task: QATask,
  steps: HTTPTestStep[],
  routeMatch: RouteMatchResult,
  bodyGeneration: BodyGenerationResult[]
): { status: 'ready' | 'uncertain' | 'manual'; uncertainReason: string | null }
```

**Factors:**
- Task execution mode
- Route match confidence
- Body generation confidence
- Empty bodies on POST/PUT/PATCH
- Invalid URLs

**Analysis:**
- ✅ Status determination is generic
- ✅ Based on confidence levels, not domain logic
- ✅ Conservative approach (marks uncertain when unsure)

---

## 6. Report Generation & Classification

### 6.1 Report Generator: `src/reporting/report-generator.ts`

**Location:** Lines 1-778

**Architecture:** Comprehensive reporting with trace matrix

**Test Classifications:**
- `passed` - Test passed successfully
- `application_failure` - Real application bug
- `traceqa_generation_issue` - Test generation problem
- `uncertain` - Cannot determine
- `manual` - Manual test

**Key Functions:**

#### `generateTraceMatrix()` (Lines 216-284)
- Maps AC → Task → Test → Result
- Calculates coverage metrics
- No hardcoded logic

#### `assessMergeReadiness()` (Lines 388-463)
- Determines if code is ready to merge
- Based on test results, not domain logic
- Risk assessment based on failure counts

**Analysis:**
- ✅ Classification is result-based, not domain-specific
- ✅ Merge readiness is generic
- ✅ No hardcoded domain rules

---

## 7. Configuration Structure

### 7.1 Config Loader: `src/config/config-loader.ts`

**Location:** Lines 1-161

**Current Config Structure:**
```typescript
interface TraceQAProjectConfig {
  // API Configuration
  baseUrl?: string;
  healthUrl?: string;
  openapi?: string;
  
  // Build Configuration
  language?: string;
  projectType?: string;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  
  // Test Configuration
  testType?: 'ui' | 'api' | 'both' | 'integration';
  outputDir?: string;
  timeout?: number;
  retries?: number;
  
  // IBM watsonx Configuration
  ibmWatsonxApiKey?: string;
  ibmWatsonxProjectId?: string;
  ibmWatsonxUrl?: string;
  ibmWatsonxModel?: string;
}
```

**Analysis:**
- ✅ Config structure is extensible
- ⚠️ **Missing:** Route mapping configuration
- ⚠️ **Missing:** Custom resource patterns
- ⚠️ **Missing:** Custom action patterns
- ⚠️ **Missing:** Field inference rules
- ⚠️ **Missing:** Sample data structure

---

## 8. Type Definitions

### 8.1 Types: `src/types/index.ts`

**Key Types Analyzed:**

#### `DiscoveredRoute` (Lines 1103-1109)
```typescript
interface DiscoveredRoute {
  path: string;
  method: string;
  handler?: string;
  middleware?: string[];
  description?: string;
}
```
- ✅ Generic structure
- ✅ No domain-specific fields

#### `QATask` (Lines 955-968)
```typescript
interface QATask {
  taskId: string;
  acceptanceCriterionId: string;
  title: string;
  type: 'api' | 'ui' | 'integration' | 'manual' | 'uncertain';
  executionMode: 'automated' | 'manual' | 'uncertain';
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  uncertainReason?: string;
  preconditions: string[];
  setupData: Record<string, any>;
  steps: QATaskStep[];
  expectedResult?: string;
}
```
- ✅ Generic structure
- ✅ Supports any domain via setupData

#### `HTTPTestStep` (Lines 1001-1011)
```typescript
interface HTTPTestStep {
  stepId: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body: Record<string, any> | null;
  expectedStatus: number;
  acceptableStatuses?: number[];
  expectedBodyContains?: string[] | null;
}
```
- ✅ Generic HTTP test structure
- ✅ No domain-specific fields

---

## 9. Identified Issues & Recommendations

### 9.1 Hardcoded Domain Logic Locations

#### **ISSUE 1: Hardcoded Resource Patterns**
**File:** `src/validation/route-matcher.ts`  
**Lines:** 81-97  
**Severity:** Medium  

**Current:**
```typescript
const RESOURCE_PATTERNS = [
  /\b(user|account|profile|member)s?\b/i,
  /\b(order|purchase|transaction)s?\b/i,
  // ... 13 more patterns
];
```

**Recommendation:**
- Move to config file
- Allow users to add custom patterns
- Keep defaults as fallback

---

#### **ISSUE 2: Hardcoded Action Patterns**
**File:** `src/validation/route-matcher.ts`  
**Lines:** 68-76  
**Severity:** Medium  

**Current:**
```typescript
const ACTION_PATTERNS = {
  create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
  read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
  // ... more patterns
};
```

**Recommendation:**
- Move to config file
- Allow custom action definitions
- Support domain-specific verbs

---

#### **ISSUE 3: Hardcoded Field Inference**
**File:** `src/validation/body-generator.ts`  
**Lines:** 588-672  
**Severity:** High  

**Current:**
```typescript
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}
// ... 20+ more hardcoded field patterns
```

**Recommendation:**
- Create configurable field mapping system
- Support custom field generators
- Allow domain-specific field rules

---

#### **ISSUE 4: Hardcoded Scenario Modifications**
**File:** `src/validation/body-generator.ts`  
**Lines:** 677-744  
**Severity:** Medium  

**Current:**
```typescript
case 'invalid_email':
  if (body.email) {
    body.email = 'invalid-email';  // Hardcoded
  }
  break;
```

**Recommendation:**
- Make scenario modifications configurable
- Support custom validation rules
- Allow domain-specific invalid values

---

#### **ISSUE 5: Hardcoded Field Value Generation**
**File:** `src/validation/body-generator.ts`  
**Lines:** 350-540  
**Severity:** Medium  

**Current:**
```typescript
if (fieldLower.includes('phone')) {
  return '+1-555-0100';  // Hardcoded
}
if (fieldLower.includes('city')) {
  return 'TestCity';  // Hardcoded
}
```

**Recommendation:**
- Create value generator registry
- Support custom generators per field type
- Allow locale-specific values

---

### 9.2 Missing Configuration Support

#### **MISSING 1: Route Mapping Configuration**
**Severity:** High  
**Impact:** Users cannot override route matching

**Needed:**
```typescript
interface RouteMapping {
  acceptanceCriterionId: string;
  route: {
    method: string;
    path: string;
  };
  confidence: 'high' | 'medium' | 'low';
}

interface TraceQAConfig {
  // ... existing fields
  routeMappings?: RouteMapping[];
}
```

---

#### **MISSING 2: Custom Resource Patterns**
**Severity:** Medium  
**Impact:** Cannot detect domain-specific resources

**Needed:**
```typescript
interface TraceQAConfig {
  // ... existing fields
  customResourcePatterns?: {
    name: string;
    pattern: string;  // regex as string
  }[];
}
```

---

#### **MISSING 3: Sample Data Structure**
**Severity:** Medium  
**Impact:** Limited sample data support

**Current (in types):**
```typescript
interface SampleData {
  validUser?: Record<string, any>;
  invalidEmail?: string;
  weakPassword?: string;
}
```

**Needed:**
```typescript
interface SampleData {
  [scenario: string]: {
    [fieldName: string]: any;
  };
}
```

---

#### **MISSING 4: Field Inference Rules**
**Severity:** High  
**Impact:** Cannot customize field generation

**Needed:**
```typescript
interface FieldInferenceRule {
  fieldPattern: string;  // regex
  generator: 'email' | 'password' | 'phone' | 'custom';
  customGenerator?: (testId: string, timestamp: string) => any;
  scenarios?: {
    [scenario: string]: any;  // scenario-specific values
  };
}

interface TraceQAConfig {
  // ... existing fields
  fieldInferenceRules?: FieldInferenceRule[];
}
```

---

## 10. Current vs Desired Architecture

### 10.1 Current Architecture

```
Acceptance Criteria
        ↓
    [IBM watsonx] ← Discovered Routes (generic matching)
        ↓
    QA Tasks
        ↓
    [IBM watsonx] ← Matched Routes (semantic scoring)
        ↓
    HTTP Tests
        ↓
    Body Generation (hardcoded field inference)
        ↓
    Test Execution
        ↓
    Reports (generic classification)
```

**Strengths:**
- No hardcoded route mappings
- Generic semantic matching
- IBM integration is clean
- Confidence-based decisions

**Weaknesses:**
- Hardcoded field inference patterns
- Hardcoded resource/action patterns
- Limited configuration options
- No user override for route matching

---

### 10.2 Desired Architecture

```
Acceptance Criteria
        ↓
    [Config: Route Mappings] ← User overrides
        ↓
    [IBM watsonx] ← Discovered Routes + Config patterns
        ↓
    QA Tasks
        ↓
    [Config: Field Rules] ← Custom generators
        ↓
    [IBM watsonx] ← Matched Routes + Config mappings
        ↓
    HTTP Tests
        ↓
    Body Generation (configurable inference)
        ↓
    Test Execution
        ↓
    Reports (generic classification)
```

**Improvements:**
- User-configurable route mappings
- Custom resource/action patterns
- Configurable field inference
- Domain-specific generators
- Maintains generic fallback

---

## 11. Refactoring Priority

### High Priority (Must Fix)
1. **Add route mapping configuration** - Allow users to override route matching
2. **Make field inference configurable** - Remove hardcoded field patterns
3. **Support custom field generators** - Allow domain-specific value generation

### Medium Priority (Should Fix)
4. **Make resource patterns configurable** - Move from hardcoded to config
5. **Make action patterns configurable** - Support custom verbs
6. **Enhance sample data structure** - Support scenario-based data

### Low Priority (Nice to Have)
7. **Add validation rule configuration** - Custom validation patterns
8. **Support locale-specific generators** - International phone, address, etc.
9. **Add field type registry** - Extensible field type system

---

## 12. Code Snippets: Problematic Patterns

### Pattern 1: Hardcoded Resource Detection
**File:** `src/validation/route-matcher.ts:81-97`
```typescript
// BEFORE (Hardcoded)
const RESOURCE_PATTERNS = [
  /\b(user|account|profile|member)s?\b/i,
  /\b(order|purchase|transaction)s?\b/i,
  // ... 13 more
];

// AFTER (Configurable)
function getResourcePatterns(config: TraceQAConfig): RegExp[] {
  const defaults = [
    /\b(user|account|profile|member)s?\b/i,
    // ... defaults
  ];
  
  const custom = (config.customResourcePatterns || []).map(
    p => new RegExp(p.pattern, 'i')
  );
  
  return [...defaults, ...custom];
}
```

---

### Pattern 2: Hardcoded Field Inference
**File:** `src/validation/body-generator.ts:588-672`
```typescript
// BEFORE (Hardcoded)
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}

// AFTER (Configurable)
function inferFieldsFromContext(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  route: DiscoveredRoute | null,
  testId: string,
  timestamp: string,
  config: TraceQAConfig
): Record<string, any> {
  const fields: Record<string, any> = {};
  const text = `${task.title} ${task.expectedResult} ${acceptanceCriterion.description}`.toLowerCase();
  
  // Apply custom rules first
  if (config.fieldInferenceRules) {
    for (const rule of config.fieldInferenceRules) {
      const pattern = new RegExp(rule.fieldPattern, 'i');
      if (pattern.test(text)) {
        fields[rule.fieldName] = generateFieldValue(rule, testId, timestamp);
      }
    }
  }
  
  // Apply defaults for missing fields
  applyDefaultFieldInference(fields, text, testId, timestamp);
  
  return fields;
}
```

---

### Pattern 3: No Route Mapping Override
**File:** `src/generators/http-test-generator.ts:193-296`
```typescript
// BEFORE (No override)
const routeMatch = matchRouteToTask(
  task,
  acceptanceCriterion,
  discoveredRoutes,
  projectContext.openApiSpec
);

// AFTER (With override)
function getRouteForTask(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  openApiSpec?: any
): RouteMatchResult {
  // Check for explicit mapping first
  const explicitMapping = config.routeMappings?.find(
    m => m.acceptanceCriterionId === acceptanceCriterion.id
  );
  
  if (explicitMapping) {
    const route = discoveredRoutes.find(
      r => r.method === explicitMapping.route.method &&
           r.path === explicitMapping.route.path
    );
    
    if (route) {
      return {
        matched: true,
        confidence: explicitMapping.confidence || 'high',
        route,
        method: route.method,
        reasoning: 'Explicit route mapping from config'
      };
    }
  }
  
  // Fall back to semantic matching
  return matchRouteToTask(
    task,
    acceptanceCriterion,
    discoveredRoutes,
    openApiSpec
  );
}
```

---

## 13. Conclusion

### Summary of Findings

**Positive Aspects:**
1. ✅ **No hardcoded route mappings** - System uses discovered routes
2. ✅ **Generic semantic matching** - Pattern-based, not domain-specific
3. ✅ **IBM integration is clean** - No route mapping in AI layer
4. ✅ **Confidence-based decisions** - Conservative approach
5. ✅ **Extensible type system** - Ready for enhancements

**Areas for Improvement:**
1. ⚠️ **Hardcoded field inference** - 20+ hardcoded field patterns
2. ⚠️ **Hardcoded resource patterns** - 15 hardcoded resource types
3. ⚠️ **Hardcoded action patterns** - 7 hardcoded action types
4. ⚠️ **Limited configuration** - Missing route mapping config
5. ⚠️ **No user overrides** - Cannot override route matching

### Architectural Health: 7/10

**Strengths:**
- Core architecture is sound
- Generic matching algorithms
- Clean separation of concerns
- Good fallback strategies

**Weaknesses:**
- Some hardcoded domain logic in body generation
- Limited user configuration options
- No route mapping override mechanism

### Recommended Next Steps

1. **Implement route mapping configuration** (Subtask 1.1)
2. **Make field inference configurable** (Subtask 1.2)
3. **Add custom pattern support** (Subtask 1.3)
4. **Enhance sample data structure** (Subtask 1.4)
5. **Add validation for config** (Subtask 1.5)

---

**End of Analysis**
</content>
<line_count>1247</line_count>
</write_to_file>

---

**User:**

[write_to_file for 'traceqa-debug/architecture-analysis.md'] Result:
The tool execution failed with the following error:
<error>
Content appears to be truncated (file has 919 lines but was predicted to have 1247 lines), and found comments indicating omitted code (e.g., '// rest of code unchanged', '/* previous code */'). Please provide the complete file content without any omissions if possible, or otherwise use the 'apply_diff' tool to apply the diff to the original file.
</error>
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:40:01.353Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.55

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Let me check what was written and complete it properly.

<read_file>
<args>
<file>
<path>traceqa-debug/architecture-analysis.md</path>
<line_range>900-919</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'traceqa-debug/architecture-analysis.md'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>traceqa-debug/architecture-analysis.md</path><error>File not found</error><notice>The file was not found. Consider using list_files to find available files before attempting to read them.</notice></file>
</files>
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:40:04.864Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.73

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Let me check if the directory exists and create the file properly.

<execute_command>
<command>cd traceqa-debug && dir</command>
</execute_command>

---

**User:**

[execute_command for 'cd traceqa-debug && dir'] Result:
Command executed in terminal  within working directory 'c:/Users/ragha/TraceQA'. Command execution was not successful, inspect the cause and adjust as needed.
Exit code: 1
Output:
At line:1 char:18
+ cd traceqa-debug && dir
+                  ~~
The token '&&' is not a valid statement separator in this version.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : InvalidEndOfLine
 

<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:40:15.355Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.92

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

<list_files>
<path>traceqa-debug</path>
<recursive>false</recursive>
</list_files>

---

**User:**

[list_files for 'traceqa-debug'] Result:
raw-response-attempt-1.txt
raw-response-attempt-2.txt
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:40:18.119Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$1.11

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

The file wasn't created. Let me create a more concise version that will fit within the limits.

<execute_command>
<command>New-Item -Path "traceqa-debug/architecture-analysis.md" -ItemType File -Force</command>
</execute_command>

---

**User:**

[execute_command for 'New-Item -Path "traceqa-debug/architecture-analysis.md" -ItemType File -Force'] Result:
Command executed in terminal  within working directory 'c:/Users/ragha/TraceQA'. Exit code: 0
Output:


    Directory: C:\Users\ragha\TraceQA\traceqa-debug


Mode                 LastWriteTime         Length Name                                                                 
----                 -------------         ------ ----                                                                 
-a----          5/1/2026   9:41 PM              0 architecture-analysis.md                                             



<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:41:07.425Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$1.30

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Now let me write a comprehensive but more concise analysis document:

<write_to_file>
<path>traceqa-debug/architecture-analysis.md</path>
<content># TraceQA Architecture Analysis: Route Mapping & Domain Logic

**Date:** 2026-05-02  
**Analyst:** Bob  
**Purpose:** Identify hardcoded domain logic and architectural issues

---

## Executive Summary

TraceQA demonstrates **excellent generic architecture** with minimal hardcoded domain logic. The system uses **semantic pattern matching** rather than hardcoded route mappings.

**Key Findings:**
- ✅ **No hardcoded route mappings** - Uses discovered routes with semantic matching
- ✅ **Generic resource/action detection** - Pattern-based inference
- ⚠️ **Some hardcoded patterns** in body generation (email, password, phone, etc.)
- ✅ **IBM integration is clean** - No route mapping in AI layer
- ✅ **Config ready for extension** - Can support route mapping config

**Architectural Health: 7/10**

---

## 1. Route Matching Architecture

### File: `src/validation/route-matcher.ts` (Lines 1-607)

**Current Approach:** Generic semantic matching with NO hardcoded routes

#### Action Patterns (Lines 68-76)
```typescript
const ACTION_PATTERNS = {
  create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
  read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
  update: /\b(update|edit|modify|change|patch|put)\b/i,
  delete: /\b(delete|remove|destroy)\b/i,
  list: /\b(list|all|index|collection)\b/i,
  health: /\b(health|status|ping|alive|ready|liveness|readiness)\b/i,
  auth: /\b(login|authenticate|sign\s*in|auth|token|session)\b/i,
};
```

**Analysis:**
- ✅ Generic patterns, not domain-specific
- ⚠️ **ISSUE:** Hardcoded in code, should be configurable
- ✅ Covers standard REST operations

#### Resource Patterns (Lines 81-97)
```typescript
const RESOURCE_PATTERNS = [
  /\b(user|account|profile|member)s?\b/i,
  /\b(order|purchase|transaction)s?\b/i,
  /\b(product|item|article)s?\b/i,
  /\b(invoice|bill|receipt)s?\b/i,
  // ... 11 more patterns
];
```

**Analysis:**
- ✅ Generic REST resources
- ⚠️ **ISSUE:** Hardcoded, should be in config
- ✅ Covers common domains

#### Route Matching Function (Lines 233-332)

**Algorithm:**
1. Extract keywords from task + acceptance criterion
2. Detect resource and action using patterns
3. Score each discovered route:
   - Method match: 40 points
   - Path match: 40 points
   - Keyword similarity: 20 points
   - OpenAPI description: 10 bonus points
4. Return best match with confidence

**Strengths:**
- ✅ No hardcoded routes like `/api/register`
- ✅ Uses actual discovered routes
- ✅ Confidence-based scoring
- ✅ OpenAPI integration

**Weaknesses:**
- ⚠️ No user override mechanism
- ⚠️ Patterns not configurable

---

## 2. HTTP Test Generation

### File: `src/generators/http-test-generator.ts` (Lines 1-878)

**Architecture:** IBM-first with deterministic fallback

#### Key Flow:
1. Match route using `matchRouteToTask()` (semantic)
2. Try IBM generation with matched route
3. Validate and normalize IBM output
4. Fall back to deterministic if IBM fails
5. Generate request bodies
6. Determine test status

#### IBM Prompt (Lines 365-409)
```typescript
const routeInfo = matchedRoute
  ? `Matched Route: ${matchedRoute.method} ${matchedRoute.path}`
  : 'No specific route matched - infer from task description';
```

**Analysis:**
- ✅ IBM receives matched route, not hardcoded
- ✅ Prompt includes discovered routes
- ✅ No domain-specific suggestions
- ✅ Clean separation of concerns

#### Test Status Determination (Lines 652-730)

**Factors:**
- Task execution mode
- Route match confidence (high/medium/low)
- Body generation confidence
- Empty bodies on POST/PUT/PATCH
- Invalid URLs

**Status Categories:**
- `ready` - High confidence, can execute
- `uncertain` - Low confidence, needs review
- `manual` - Requires human execution

**Analysis:**
- ✅ Generic, not domain-specific
- ✅ Conservative approach
- ✅ Confidence-based decisions

---

## 3. QA Task Plan Generation

### File: `src/generators/qa-task-plan-generator.ts` (Lines 1-657)

**Architecture:** IBM-first with deterministic fallback

#### IBM Prompt (Lines 91-186)
```typescript
Discovered Routes:
${routesSummary}

Acceptance Criteria:
${acceptanceCriteria.map(...)}

Task: Create a QA task plan by mapping each criterion to tasks.
```

**Analysis:**
- ✅ IBM receives discovered routes
- ✅ No hardcoded route mappings
- ✅ Classification based on route availability

#### Fallback Generation (Lines 311-417)

**Logic:**
```typescript
// Check if criterion mentions API/endpoint
if (/\b(api|endpoint|request|response)\b/i.test(combinedText)) {
  if (discoveredRoutes.length > 0) {
    type = 'api';
    executionMode = 'automated';
  } else {
    type = 'uncertain';
  }
}
```

**Analysis:**
- ✅ Generic keyword detection
- ✅ Depends on discovered routes
- ✅ Conservative classification

---

## 4. Request Body Generation

### File: `src/validation/body-generator.ts` (Lines 1-862)

**⚠️ PRIMARY LOCATION OF HARDCODED DOMAIN LOGIC**

#### Generation Priority:
1. OpenAPI schema (high confidence)
2. IBM suggested body
3. Config sample data
4. **Inferred fields** ← HARDCODED
5. Generic fallback

### ISSUE 1: Hardcoded Field Inference (Lines 588-672)

```typescript
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}
if (text.includes('username')) {
  fields.username = `traceqa_${testId}`;
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
// ... 15+ more hardcoded patterns
```

**Severity:** HIGH  
**Impact:** Cannot customize field generation for different domains

### ISSUE 2: Hardcoded Scenario Modifications (Lines 677-744)

```typescript
switch (scenario) {
  case 'invalid_email':
    if (body.email) {
      body.email = 'invalid-email';  // Hardcoded
    }
    break;
  case 'weak_password':
    if (body.password) {
      body.password = 'weak';  // Hardcoded
    }
    break;
  // ... more hardcoded scenarios
}
```

**Severity:** MEDIUM  
**Impact:** Cannot customize invalid values per domain

### ISSUE 3: Hardcoded Field Value Generation (Lines 350-540)

```typescript
if (fieldLower.includes('phone')) {
  return '+1-555-0100';  // US format only
}
if (fieldLower.includes('city')) {
  return 'TestCity';  // Generic only
}
if (fieldLower.includes('country')) {
  return 'US';  // US-centric
}
```

**Severity:** MEDIUM  
**Impact:** Not locale-aware, US-centric values

---

## 5. Test Execution & Status

### File: `src/testing/test-coordinator.ts` (Lines 214-531)

**Architecture:** Phase-based execution

**Phases:**
1. Parse acceptance criteria
2. Discover routes
3. Get AI suggestions (optional)
4. Generate QA task plan
5. Generate HTTP tests
6. Execute ready tests
7. Record uncertain/manual tests
8. Generate reports

**Analysis:**
- ✅ Generic execution flow
- ✅ No domain-specific logic
- ✅ Status tracking is generic

---

## 6. Report Generation

### File: `src/reporting/report-generator.ts` (Lines 1-778)

**Architecture:** Comprehensive reporting with trace matrix

**Test Classifications:**
- `passed` - Test passed
- `application_failure` - Real bug
- `traceqa_generation_issue` - Test problem
- `uncertain` - Cannot determine
- `manual` - Manual test

**Trace Matrix:** AC → Task → Test → Result

**Analysis:**
- ✅ Classification is result-based
- ✅ No domain-specific logic
- ✅ Generic merge readiness assessment

---

## 7. Configuration Structure

### File: `src/config/config-loader.ts` (Lines 1-161)

**Current Config:**
```typescript
interface TraceQAProjectConfig {
  baseUrl?: string;
  healthUrl?: string;
  openapi?: string;
  language?: string;
  projectType?: string;
  testType?: 'ui' | 'api' | 'both' | 'integration';
  outputDir?: string;
  timeout?: number;
  retries?: number;
  ibmWatsonxApiKey?: string;
  // ... more fields
}
```

**Analysis:**
- ✅ Extensible structure
- ⚠️ **MISSING:** Route mapping config
- ⚠️ **MISSING:** Custom resource patterns
- ⚠️ **MISSING:** Field inference rules
- ⚠️ **MISSING:** Custom sample data structure

---

## 8. Identified Issues Summary

### HIGH PRIORITY

#### Issue 1: No Route Mapping Configuration
**Files:** All generators  
**Impact:** Users cannot override route matching

**Needed:**
```typescript
interface RouteMapping {
  acceptanceCriterionId: string;
  route: { method: string; path: string; };
  confidence: 'high' | 'medium' | 'low';
}

interface TraceQAConfig {
  routeMappings?: RouteMapping[];
}
```

#### Issue 2: Hardcoded Field Inference
**File:** `src/validation/body-generator.ts:588-672`  
**Impact:** Cannot customize field generation

**Needed:**
```typescript
interface FieldInferenceRule {
  fieldPattern: string;  // regex
  generator: 'email' | 'password' | 'phone' | 'custom';
  template?: string;
  scenarios?: { [scenario: string]: any; };
}

interface TraceQAConfig {
  fieldInferenceRules?: FieldInferenceRule[];
}
```

### MEDIUM PRIORITY

#### Issue 3: Hardcoded Resource Patterns
**File:** `src/validation/route-matcher.ts:81-97`  
**Impact:** Cannot detect domain-specific resources

**Needed:**
```typescript
interface TraceQAConfig {
  customResourcePatterns?: {
    name: string;
    pattern: string;
  }[];
}
```

#### Issue 4: Hardcoded Action Patterns
**File:** `src/validation/route-matcher.ts:68-76`  
**Impact:** Cannot support domain-specific verbs

**Needed:**
```typescript
interface TraceQAConfig {
  customActionPatterns?: {
    action: string;
    pattern: string;
    httpMethods: string[];
  }[];
}
```

#### Issue 5: Limited Sample Data Structure
**File:** `src/types/index.ts:302-307`  
**Impact:** Cannot provide scenario-based sample data

**Current:**
```typescript
interface SampleData {
  validUser?: Record<string, any>;
  invalidEmail?: string;
  weakPassword?: string;
}
```

**Needed:**
```typescript
interface SampleData {
  [scenario: string]: {
    [fieldName: string]: any;
  };
}
```

---

## 9. Code Examples: Before & After

### Example 1: Route Mapping Override

**BEFORE (No override):**
```typescript
const routeMatch = matchRouteToTask(
  task,
  acceptanceCriterion,
  discoveredRoutes
);
```

**AFTER (With config override):**
```typescript
function getRouteForTask(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig
): RouteMatchResult {
  // Check explicit mapping first
  const mapping = config.routeMappings?.find(
    m => m.acceptanceCriterionId === acceptanceCriterion.id
  );
  
  if (mapping) {
    const route = discoveredRoutes.find(
      r => r.method === mapping.route.method &&
           r.path === mapping.route.path
    );
    if (route) {
      return {
        matched: true,
        confidence: mapping.confidence || 'high',
        route,
        method: route.method,
        reasoning: 'Explicit config mapping'
      };
    }
  }
  
  // Fall back to semantic matching
  return matchRouteToTask(task, acceptanceCriterion, discoveredRoutes);
}
```

### Example 2: Configurable Field Inference

**BEFORE (Hardcoded):**
```typescript
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}
```

**AFTER (Configurable):**
```typescript
function inferFieldsFromContext(
  task: QATask,
  config: TraceQAConfig,
  testId: string,
  timestamp: string
): Record<string, any> {
  const fields: Record<string, any> = {};
  const text = getContextText(task);
  
  // Apply custom rules from config
  if (config.fieldInferenceRules) {
    for (const rule of config.fieldInferenceRules) {
      const pattern = new RegExp(rule.fieldPattern, 'i');
      if (pattern.test(text)) {
        fields[rule.fieldName] = generateFieldValue(
          rule,
          testId,
          timestamp
        );
      }
    }
  }
  
  // Apply defaults for missing fields
  applyDefaultInference(fields, text, testId, timestamp);
  
  return fields;
}
```

---

## 10. Refactoring Roadmap

### Phase 1: Configuration Support (Subtask 1.1)
- Add `routeMappings` to config
- Add `customResourcePatterns` to config
- Add `customActionPatterns` to config
- Add `fieldInferenceRules` to config
- Update config loader and validator

### Phase 2: Route Matching Enhancement (Subtask 1.2)
- Implement config-based route override
- Support custom resource patterns
- Support custom action patterns
- Maintain backward compatibility

### Phase 3: Body Generation Refactor (Subtask 1.3)
- Extract field inference to configurable system
- Support custom field generators
- Add scenario-based sample data
- Maintain fallback logic

### Phase 4: Documentation & Testing (Subtask 1.4)
- Document new config options
- Add examples for common domains
- Create migration guide
- Add integration tests

---

## 11. Conclusion

### Strengths
1. ✅ **No hardcoded route mappings** - Uses discovered routes
2. ✅ **Generic semantic matching** - Pattern-based inference
3. ✅ **Clean IBM integration** - No domain logic in AI layer
4. ✅ **Confidence-based decisions** - Conservative approach
5. ✅ **Good separation of concerns** - Modular architecture

### Weaknesses
1. ⚠️ **Hardcoded field inference** - 20+ patterns in code
2. ⚠️ **Hardcoded resource patterns** - 15 patterns in code
3. ⚠️ **No route mapping override** - Cannot force specific routes
4. ⚠️ **Limited configuration** - Missing key config options
5. ⚠️ **US-centric values** - Phone, address formats

### Recommendations

**Immediate (High Priority):**
1. Add route mapping configuration support
2. Make field inference configurable
3. Support custom resource/action patterns

**Short-term (Medium Priority):**
4. Enhance sample data structure
5. Add locale-aware value generators
6. Improve config validation

**Long-term (Low Priority):**
7. Add field type registry system
8. Support custom validation rules
9. Add internationalization support

### Final Assessment

**Architecture Quality: 7/10**

The architecture is fundamentally sound with excellent generic design. The main issues are in body generation where field inference is hardcoded. These can be addressed through configuration without major architectural changes.

**Refactoring Complexity: Medium**

Most changes involve adding configuration support and extracting hardcoded patterns. The core algorithms remain unchanged.

---

**End of Analysis**
</content>
<line_count>650</line_count>
</write_to_file>

---

**User:**

[write_to_file for 'traceqa-debug/architecture-analysis.md'] Result:
<file_write_result>
<path>traceqa-debug/architecture-analysis.md</path>
<operation>modified</operation>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:42:17.141Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$1.51

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Pending |
| 2 | Examine http-test-generator.ts for route selection patterns | Pending |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Pending |
| 4 | Analyze test-coordinator.ts for test status determination | Pending |
| 5 | Check report-generator.ts for test classification logic | Pending |
| 6 | Review types/index.ts for architectural patterns | Pending |
| 7 | Examine body-generator.ts for domain-specific logic | Pending |
| 8 | Check config-loader.ts for configuration structure | Pending |
| 9 | Create comprehensive architecture-analysis.md document | Pending |
| 10 | Complete task with summary of findings | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Perfect! Now let me update the TODO list and complete the task.

<update_todo_list>
<todos>
[x] Read and analyze route-matcher.ts for hardcoded domain logic
[x] Examine http-test-generator.ts for route selection patterns
[x] Review qa-task-plan-generator.ts for IBM integration
[x] Analyze test-coordinator.ts for test status determination
[x] Check report-generator.ts for test classification logic
[x] Review types/index.ts for architectural patterns
[x] Examine body-generator.ts for domain-specific logic
[x] Check config-loader.ts for configuration structure
[x] Create comprehensive architecture-analysis.md document
[x] Complete task with summary of findings
</todos>
</update_todo_list>

---

**User:**

[update_todo_list] Result:
Todo list updated successfully.
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:42:21.136Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$1.71

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Read and analyze route-matcher.ts for hardcoded domain logic | Completed |
| 2 | Examine http-test-generator.ts for route selection patterns | Completed |
| 3 | Review qa-task-plan-generator.ts for IBM integration | Completed |
| 4 | Analyze test-coordinator.ts for test status determination | Completed |
| 5 | Check report-generator.ts for test classification logic | Completed |
| 6 | Review types/index.ts for architectural patterns | Completed |
| 7 | Examine body-generator.ts for domain-specific logic | Completed |
| 8 | Check config-loader.ts for configuration structure | Completed |
| 9 | Create comprehensive architecture-analysis.md document | Completed |
| 10 | Complete task with summary of findings | Completed |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

<attempt_completion>
<result>
# TraceQA Architecture Analysis Complete

## Summary of Key Findings

I've completed a comprehensive analysis of TraceQA's architecture and created a detailed report at `traceqa-debug/architecture-analysis.md`.

### 🎯 Main Discoveries

**EXCELLENT NEWS:** TraceQA has a fundamentally sound architecture with **NO hardcoded route mappings**. The system uses semantic pattern matching with discovered routes.

### ✅ Strengths Identified

1. **No Hardcoded Routes** - System uses discovered routes from actual application
2. **Generic Semantic Matching** - Pattern-based inference, not domain-specific
3. **Clean IBM Integration** - AI receives matched routes, not hardcoded mappings
4. **Confidence-Based Decisions** - Conservative approach with uncertainty tracking
5. **Extensible Config Structure** - Ready for enhancement

### ⚠️ Issues Found (Primarily in Body Generation)

**HIGH PRIORITY:**
1. **No Route Mapping Override** - Users cannot force specific AC→Route mappings
2. **Hardcoded Field Inference** - 20+ field patterns hardcoded in `body-generator.ts:588-672`

**MEDIUM PRIORITY:**
3. **Hardcoded Resource Patterns** - 15 patterns in `route-matcher.ts:81-97`
4. **Hardcoded Action Patterns** - 7 patterns in `route-matcher.ts:68-76`
5. **Limited Sample Data** - Current structure doesn't support scenario-based data

### 📊 Architecture Quality: 7/10

**Core route-mapping logic is excellent.** Issues are mainly in body generation where field inference uses hardcoded patterns like:
- Email: `traceqa-${testId}@example.com`
- Password: `StrongPassword123!`
- Phone: `+1-555-0100` (US-centric)
- Address: `123 TraceQA Street`

### 📋 Detailed Analysis Includes

1. **Route Matching Flow** - How semantic matching works (no hardcoded routes)
2. **HTTP Test Generation** - IBM integration and fallback logic
3. **QA Task Planning** - How IBM classifies tasks based on discovered routes
4. **Body Generation** - Where hardcoded domain logic exists (main issue area)
5. **Test Status Determination** - Confidence-based classification
6. **Report Generation** - Generic result classification
7. **Configuration Structure** - Current state and missing features
8. **Code Examples** - Before/after refactoring patterns
9. **Refactoring Roadmap** - Prioritized implementation plan

### 🔧 Recommended Next Steps

**Phase 1: Configuration Support**
- Add `routeMappings` config for explicit AC→Route mapping
- Add `fieldInferenceRules` for customizable field generation
- Add `customResourcePatterns` and `customActionPatterns`

**Phase 2: Body Generation Refactor**
- Extract hardcoded field patterns to config
- Support custom field generators
- Add locale-aware value generation

**Phase 3: Documentation & Testing**
- Document new config options
- Provide domain-specific examples
- Add integration tests

### 📄 Deliverable

Complete analysis document: `traceqa-debug/architecture-analysis.md` (650 lines)

This analysis provides the foundation for the refactoring subtasks outlined in REFACTORING_PLAN.md.
</result>
</attempt_completion>

