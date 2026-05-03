**User:**

<task>
Design the new route-mapping priority system for TraceQA based on the architecture analysis.

**Context from Analysis:**
The analysis revealed that TraceQA has a fundamentally sound architecture with NO hardcoded route mappings. The system uses semantic pattern matching with discovered routes. However, there are improvements needed:

1. **Current Flow:** Route discovery → Semantic matching → IBM receives matched routes → Test generation
2. **Issues:** No explicit route mapping override, hardcoded field inference in body generation, limited config extensibility

**Design Requirements:**

Create a comprehensive design document that specifies:

1. **Route Mapping Priority System:**
   - Level 1: OpenAPI operationId/summary/schemas (if available)
   - Level 2: traceqa.config.json explicit route mappings (user override)
   - Level 3: IBM route mapping using discovered routes + acceptance criteria
   - Level 4: Structural validation of IBM-proposed routes against discovered routes
   - Level 5: Conservative deterministic fallback (only when AC explicitly includes method/path)
   - Level 6: Mark as uncertain/manual if no safe mapping exists

2. **IBM Integration Enhancement:**
   - IBM should produce a route mapping object BEFORE test generation
   - Format: `{ acceptanceCriterionId, selectedRoute: {method, path}, confidence, reasoning, requiresSetup, setupRoute }`
   - IBM must choose ONLY from discovered routes
   - If no fit, selectedRoute should be null

3. **Configuration Schema Extension:**
   - Add `routeMappings` for explicit AC→Route mapping
   - Add `sampleData` for test data scenarios
   - Add `fieldInferenceRules` for customizable field generation
   - Keep all additions optional and backward-compatible

4. **Validation Architecture:**
   - Separate route discovery from route validation
   - Structural validation: method/path exists in discovered routes
   - Content validation: URL is string, method is valid, body is valid, statuses are valid
   - Confidence scoring based on validation results

5. **Test Status Classification:**
   - Ready: route mapped with acceptable confidence, structurally valid, body usable, statuses valid
   - Uncertain: no safe route mapping, route doesn't exist, body cannot be generated, invalid statuses
   - Failed: test executed but application returned unexpected result
   - Clearly separate "uncertain" (not executed) from "failed" (executed with bad result)

6. **Report Classification:**
   - Categories: generated, ready, executed, passed, failed, uncertain, manual, skipped
   - Do NOT count uncertain tests as failed application tests
   - Provide clear metrics for each category

7. **Trace Matrix Mapping:**
   - Map by exact acceptanceCriterionId only
   - Do not attach unrelated tests to every AC
   - Support 1:N mapping (one AC can have multiple tests)

**Deliverable:**
Create a design document at `traceqa-debug/route-mapping-design.md` that includes:
- Detailed architecture diagrams (in markdown/ASCII)
- Data flow specifications
- Interface definitions
- Configuration schema examples
- Decision trees for route selection
- Error handling strategies
- Backward compatibility considerations
- Migration path from current to new architecture

This design will guide all subsequent implementation subtasks. Use `attempt_completion` when the design is complete.
</task>
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:42:58.467Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.00

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>


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
traceqa-debug/architecture-analysis.md
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

I'll analyze the current architecture and design a comprehensive route-mapping priority system for TraceQA. Let me start by gathering more context about the existing implementation.

<read_file>
<args>
  <file>
    <path>traceqa-debug/architecture-analysis.md</path>
  </file>
</args>
</read_file>

<read_file>
<args>
  <file>
    <path>src/types/index.ts</path>
  </file>
</args>
</read_file>

<read_file>
<args>
  <file>
    

[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]

---

**User:**

[read_file for 'traceqa-debug/architecture-analysis.md'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>traceqa-debug/architecture-analysis.md</path>
<content lines="1-596">
  1 | # TraceQA Architecture Analysis: Route Mapping & Domain Logic
  2 | 
  3 | **Date:** 2026-05-02  
  4 | **Analyst:** Bob  
  5 | **Purpose:** Identify hardcoded domain logic and architectural issues
  6 | 
  7 | ---
  8 | 
  9 | ## Executive Summary
 10 | 
 11 | TraceQA demonstrates **excellent generic architecture** with minimal hardcoded domain logic. The system uses **semantic pattern matching** rather than hardcoded route mappings.
 12 | 
 13 | **Key Findings:**
 14 | - ✅ **No hardcoded route mappings** - Uses discovered routes with semantic matching
 15 | - ✅ **Generic resource/action detection** - Pattern-based inference
 16 | - ⚠️ **Some hardcoded patterns** in body generation (email, password, phone, etc.)
 17 | - ✅ **IBM integration is clean** - No route mapping in AI layer
 18 | - ✅ **Config ready for extension** - Can support route mapping config
 19 | 
 20 | **Architectural Health: 7/10**
 21 | 
 22 | ---
 23 | 
 24 | ## 1. Route Matching Architecture
 25 | 
 26 | ### File: `src/validation/route-matcher.ts` (Lines 1-607)
 27 | 
 28 | **Current Approach:** Generic semantic matching with NO hardcoded routes
 29 | 
 30 | #### Action Patterns (Lines 68-76)
 31 | ```typescript
 32 | const ACTION_PATTERNS = {
 33 |   create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
 34 |   read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
 35 |   update: /\b(update|edit|modify|change|patch|put)\b/i,
 36 |   delete: /\b(delete|remove|destroy)\b/i,
 37 |   list: /\b(list|all|index|collection)\b/i,
 38 |   health: /\b(health|status|ping|alive|ready|liveness|readiness)\b/i,
 39 |   auth: /\b(login|authenticate|sign\s*in|auth|token|session)\b/i,
 40 | };
 41 | ```
 42 | 
 43 | **Analysis:**
 44 | - ✅ Generic patterns, not domain-specific
 45 | - ⚠️ **ISSUE:** Hardcoded in code, should be configurable
 46 | - ✅ Covers standard REST operations
 47 | 
 48 | #### Resource Patterns (Lines 81-97)
 49 | ```typescript
 50 | const RESOURCE_PATTERNS = [
 51 |   /\b(user|account|profile|member)s?\b/i,
 52 |   /\b(order|purchase|transaction)s?\b/i,
 53 |   /\b(product|item|article)s?\b/i,
 54 |   /\b(invoice|bill|receipt)s?\b/i,
 55 |   // ... 11 more patterns
 56 | ];
 57 | ```
 58 | 
 59 | **Analysis:**
 60 | - ✅ Generic REST resources
 61 | - ⚠️ **ISSUE:** Hardcoded, should be in config
 62 | - ✅ Covers common domains
 63 | 
 64 | #### Route Matching Function (Lines 233-332)
 65 | 
 66 | **Algorithm:**
 67 | 1. Extract keywords from task + acceptance criterion
 68 | 2. Detect resource and action using patterns
 69 | 3. Score each discovered route:
 70 |    - Method match: 40 points
 71 |    - Path match: 40 points
 72 |    - Keyword similarity: 20 points
 73 |    - OpenAPI description: 10 bonus points
 74 | 4. Return best match with confidence
 75 | 
 76 | **Strengths:**
 77 | - ✅ No hardcoded routes like `/api/register`
 78 | - ✅ Uses actual discovered routes
 79 | - ✅ Confidence-based scoring
 80 | - ✅ OpenAPI integration
 81 | 
 82 | **Weaknesses:**
 83 | - ⚠️ No user override mechanism
 84 | - ⚠️ Patterns not configurable
 85 | 
 86 | ---
 87 | 
 88 | ## 2. HTTP Test Generation
 89 | 
 90 | ### File: `src/generators/http-test-generator.ts` (Lines 1-878)
 91 | 
 92 | **Architecture:** IBM-first with deterministic fallback
 93 | 
 94 | #### Key Flow:
 95 | 1. Match route using `matchRouteToTask()` (semantic)
 96 | 2. Try IBM generation with matched route
 97 | 3. Validate and normalize IBM output
 98 | 4. Fall back to deterministic if IBM fails
 99 | 5. Generate request bodies
100 | 6. Determine test status
101 | 
102 | #### IBM Prompt (Lines 365-409)
103 | ```typescript
104 | const routeInfo = matchedRoute
105 |   ? `Matched Route: ${matchedRoute.method} ${matchedRoute.path}`
106 |   : 'No specific route matched - infer from task description';
107 | ```
108 | 
109 | **Analysis:**
110 | - ✅ IBM receives matched route, not hardcoded
111 | - ✅ Prompt includes discovered routes
112 | - ✅ No domain-specific suggestions
113 | - ✅ Clean separation of concerns
114 | 
115 | #### Test Status Determination (Lines 652-730)
116 | 
117 | **Factors:**
118 | - Task execution mode
119 | - Route match confidence (high/medium/low)
120 | - Body generation confidence
121 | - Empty bodies on POST/PUT/PATCH
122 | - Invalid URLs
123 | 
124 | **Status Categories:**
125 | - `ready` - High confidence, can execute
126 | - `uncertain` - Low confidence, needs review
127 | - `manual` - Requires human execution
128 | 
129 | **Analysis:**
130 | - ✅ Generic, not domain-specific
131 | - ✅ Conservative approach
132 | - ✅ Confidence-based decisions
133 | 
134 | ---
135 | 
136 | ## 3. QA Task Plan Generation
137 | 
138 | ### File: `src/generators/qa-task-plan-generator.ts` (Lines 1-657)
139 | 
140 | **Architecture:** IBM-first with deterministic fallback
141 | 
142 | #### IBM Prompt (Lines 91-186)
143 | ```typescript
144 | Discovered Routes:
145 | ${routesSummary}
146 | 
147 | Acceptance Criteria:
148 | ${acceptanceCriteria.map(...)}
149 | 
150 | Task: Create a QA task plan by mapping each criterion to tasks.
151 | ```
152 | 
153 | **Analysis:**
154 | - ✅ IBM receives discovered routes
155 | - ✅ No hardcoded route mappings
156 | - ✅ Classification based on route availability
157 | 
158 | #### Fallback Generation (Lines 311-417)
159 | 
160 | **Logic:**
161 | ```typescript
162 | // Check if criterion mentions API/endpoint
163 | if (/\b(api|endpoint|request|response)\b/i.test(combinedText)) {
164 |   if (discoveredRoutes.length > 0) {
165 |     type = 'api';
166 |     executionMode = 'automated';
167 |   } else {
168 |     type = 'uncertain';
169 |   }
170 | }
171 | ```
172 | 
173 | **Analysis:**
174 | - ✅ Generic keyword detection
175 | - ✅ Depends on discovered routes
176 | - ✅ Conservative classification
177 | 
178 | ---
179 | 
180 | ## 4. Request Body Generation
181 | 
182 | ### File: `src/validation/body-generator.ts` (Lines 1-862)
183 | 
184 | **⚠️ PRIMARY LOCATION OF HARDCODED DOMAIN LOGIC**
185 | 
186 | #### Generation Priority:
187 | 1. OpenAPI schema (high confidence)
188 | 2. IBM suggested body
189 | 3. Config sample data
190 | 4. **Inferred fields** ← HARDCODED
191 | 5. Generic fallback
192 | 
193 | ### ISSUE 1: Hardcoded Field Inference (Lines 588-672)
194 | 
195 | ```typescript
196 | if (text.includes('email')) {
197 |   fields.email = `traceqa-${testId}-${timestamp}@example.com`;
198 | }
199 | if (text.includes('password')) {
200 |   fields.password = 'StrongPassword123!';
201 | }
202 | if (text.includes('username')) {
203 |   fields.username = `traceqa_${testId}`;
204 | }
205 | if (text.includes('phone')) {
206 |   fields.phone = '+1-555-0100';
207 | }
208 | if (text.includes('address')) {
209 |   fields.address = '123 TraceQA Street';
210 | }
211 | if (text.includes('city')) {
212 |   fields.city = 'TestCity';
213 | }
214 | // ... 15+ more hardcoded patterns
215 | ```
216 | 
217 | **Severity:** HIGH  
218 | **Impact:** Cannot customize field generation for different domains
219 | 
220 | ### ISSUE 2: Hardcoded Scenario Modifications (Lines 677-744)
221 | 
222 | ```typescript
223 | switch (scenario) {
224 |   case 'invalid_email':
225 |     if (body.email) {
226 |       body.email = 'invalid-email';  // Hardcoded
227 |     }
228 |     break;
229 |   case 'weak_password':
230 |     if (body.password) {
231 |       body.password = 'weak';  // Hardcoded
232 |     }
233 |     break;
234 |   // ... more hardcoded scenarios
235 | }
236 | ```
237 | 
238 | **Severity:** MEDIUM  
239 | **Impact:** Cannot customize invalid values per domain
240 | 
241 | ### ISSUE 3: Hardcoded Field Value Generation (Lines 350-540)
242 | 
243 | ```typescript
244 | if (fieldLower.includes('phone')) {
245 |   return '+1-555-0100';  // US format only
246 | }
247 | if (fieldLower.includes('city')) {
248 |   return 'TestCity';  // Generic only
249 | }
250 | if (fieldLower.includes('country')) {
251 |   return 'US';  // US-centric
252 | }
253 | ```
254 | 
255 | **Severity:** MEDIUM  
256 | **Impact:** Not locale-aware, US-centric values
257 | 
258 | ---
259 | 
260 | ## 5. Test Execution & Status
261 | 
262 | ### File: `src/testing/test-coordinator.ts` (Lines 214-531)
263 | 
264 | **Architecture:** Phase-based execution
265 | 
266 | **Phases:**
267 | 1. Parse acceptance criteria
268 | 2. Discover routes
269 | 3. Get AI suggestions (optional)
270 | 4. Generate QA task plan
271 | 5. Generate HTTP tests
272 | 6. Execute ready tests
273 | 7. Record uncertain/manual tests
274 | 8. Generate reports
275 | 
276 | **Analysis:**
277 | - ✅ Generic execution flow
278 | - ✅ No domain-specific logic
279 | - ✅ Status tracking is generic
280 | 
281 | ---
282 | 
283 | ## 6. Report Generation
284 | 
285 | ### File: `src/reporting/report-generator.ts` (Lines 1-778)
286 | 
287 | **Architecture:** Comprehensive reporting with trace matrix
288 | 
289 | **Test Classifications:**
290 | - `passed` - Test passed
291 | - `application_failure` - Real bug
292 | - `traceqa_generation_issue` - Test problem
293 | - `uncertain` - Cannot determine
294 | - `manual` - Manual test
295 | 
296 | **Trace Matrix:** AC → Task → Test → Result
297 | 
298 | **Analysis:**
299 | - ✅ Classification is result-based
300 | - ✅ No domain-specific logic
301 | - ✅ Generic merge readiness assessment
302 | 
303 | ---
304 | 
305 | ## 7. Configuration Structure
306 | 
307 | ### File: `src/config/config-loader.ts` (Lines 1-161)
308 | 
309 | **Current Config:**
310 | ```typescript
311 | interface TraceQAProjectConfig {
312 |   baseUrl?: string;
313 |   healthUrl?: string;
314 |   openapi?: string;
315 |   language?: string;
316 |   projectType?: string;
317 |   testType?: 'ui' | 'api' | 'both' | 'integration';
318 |   outputDir?: string;
319 |   timeout?: number;
320 |   retries?: number;
321 |   ibmWatsonxApiKey?: string;
322 |   // ... more fields
323 | }
324 | ```
325 | 
326 | **Analysis:**
327 | - ✅ Extensible structure
328 | - ⚠️ **MISSING:** Route mapping config
329 | - ⚠️ **MISSING:** Custom resource patterns
330 | - ⚠️ **MISSING:** Field inference rules
331 | - ⚠️ **MISSING:** Custom sample data structure
332 | 
333 | ---
334 | 
335 | ## 8. Identified Issues Summary
336 | 
337 | ### HIGH PRIORITY
338 | 
339 | #### Issue 1: No Route Mapping Configuration
340 | **Files:** All generators  
341 | **Impact:** Users cannot override route matching
342 | 
343 | **Needed:**
344 | ```typescript
345 | interface RouteMapping {
346 |   acceptanceCriterionId: string;
347 |   route: { method: string; path: string; };
348 |   confidence: 'high' | 'medium' | 'low';
349 | }
350 | 
351 | interface TraceQAConfig {
352 |   routeMappings?: RouteMapping[];
353 | }
354 | ```
355 | 
356 | #### Issue 2: Hardcoded Field Inference
357 | **File:** `src/validation/body-generator.ts:588-672`  
358 | **Impact:** Cannot customize field generation
359 | 
360 | **Needed:**
361 | ```typescript
362 | interface FieldInferenceRule {
363 |   fieldPattern: string;  // regex
364 |   generator: 'email' | 'password' | 'phone' | 'custom';
365 |   template?: string;
366 |   scenarios?: { [scenario: string]: any; };
367 | }
368 | 
369 | interface TraceQAConfig {
370 |   fieldInferenceRules?: FieldInferenceRule[];
371 | }
372 | ```
373 | 
374 | ### MEDIUM PRIORITY
375 | 
376 | #### Issue 3: Hardcoded Resource Patterns
377 | **File:** `src/validation/route-matcher.ts:81-97`  
378 | **Impact:** Cannot detect domain-specific resources
379 | 
380 | **Needed:**
381 | ```typescript
382 | interface TraceQAConfig {
383 |   customResourcePatterns?: {
384 |     name: string;
385 |     pattern: string;
386 |   }[];
387 | }
388 | ```
389 | 
390 | #### Issue 4: Hardcoded Action Patterns
391 | **File:** `src/validation/route-matcher.ts:68-76`  
392 | **Impact:** Cannot support domain-specific verbs
393 | 
394 | **Needed:**
395 | ```typescript
396 | interface TraceQAConfig {
397 |   customActionPatterns?: {
398 |     action: string;
399 |     pattern: string;
400 |     httpMethods: string[];
401 |   }[];
402 | }
403 | ```
404 | 
405 | #### Issue 5: Limited Sample Data Structure
406 | **File:** `src/types/index.ts:302-307`  
407 | **Impact:** Cannot provide scenario-based sample data
408 | 
409 | **Current:**
410 | ```typescript
411 | interface SampleData {
412 |   validUser?: Record<string, any>;
413 |   invalidEmail?: string;
414 |   weakPassword?: string;
415 | }
416 | ```
417 | 
418 | **Needed:**
419 | ```typescript
420 | interface SampleData {
421 |   [scenario: string]: {
422 |     [fieldName: string]: any;
423 |   };
424 | }
425 | ```
426 | 
427 | ---
428 | 
429 | ## 9. Code Examples: Before & After
430 | 
431 | ### Example 1: Route Mapping Override
432 | 
433 | **BEFORE (No override):**
434 | ```typescript
435 | const routeMatch = matchRouteToTask(
436 |   task,
437 |   acceptanceCriterion,
438 |   discoveredRoutes
439 | );
440 | ```
441 | 
442 | **AFTER (With config override):**
443 | ```typescript
444 | function getRouteForTask(
445 |   task: QATask,
446 |   acceptanceCriterion: AcceptanceCriterion,
447 |   discoveredRoutes: DiscoveredRoute[],
448 |   config: TraceQAConfig
449 | ): RouteMatchResult {
450 |   // Check explicit mapping first
451 |   const mapping = config.routeMappings?.find(
452 |     m => m.acceptanceCriterionId === acceptanceCriterion.id
453 |   );
454 |   
455 |   if (mapping) {
456 |     const route = discoveredRoutes.find(
457 |       r => r.method === mapping.route.method &&
458 |            r.path === mapping.route.path
459 |     );
460 |     if (route) {
461 |       return {
462 |         matched: true,
463 |         confidence: mapping.confidence || 'high',
464 |         route,
465 |         method: route.method,
466 |         reasoning: 'Explicit config mapping'
467 |       };
468 |     }
469 |   }
470 |   
471 |   // Fall back to semantic matching
472 |   return matchRouteToTask(task, acceptanceCriterion, discoveredRoutes);
473 | }
474 | ```
475 | 
476 | ### Example 2: Configurable Field Inference
477 | 
478 | **BEFORE (Hardcoded):**
479 | ```typescript
480 | if (text.includes('email')) {
481 |   fields.email = `traceqa-${testId}-${timestamp}@example.com`;
482 | }
483 | if (text.includes('password')) {
484 |   fields.password = 'StrongPassword123!';
485 | }
486 | ```
487 | 
488 | **AFTER (Configurable):**
489 | ```typescript
490 | function inferFieldsFromContext(
491 |   task: QATask,
492 |   config: TraceQAConfig,
493 |   testId: string,
494 |   timestamp: string
495 | ): Record<string, any> {
496 |   const fields: Record<string, any> = {};
497 |   const text = getContextText(task);
498 |   
499 |   // Apply custom rules from config
500 |   if (config.fieldInferenceRules) {
501 |     for (const rule of config.fieldInferenceRules) {
502 |       const pattern = new RegExp(rule.fieldPattern, 'i');
503 |       if (pattern.test(text)) {
504 |         fields[rule.fieldName] = generateFieldValue(
505 |           rule,
506 |           testId,
507 |           timestamp
508 |         );
509 |       }
510 |     }
511 |   }
512 |   
513 |   // Apply defaults for missing fields
514 |   applyDefaultInference(fields, text, testId, timestamp);
515 |   
516 |   return fields;
517 | }
518 | ```
519 | 
520 | ---
521 | 
522 | ## 10. Refactoring Roadmap
523 | 
524 | ### Phase 1: Configuration Support (Subtask 1.1)
525 | - Add `routeMappings` to config
526 | - Add `customResourcePatterns` to config
527 | - Add `customActionPatterns` to config
528 | - Add `fieldInferenceRules` to config
529 | - Update config loader and validator
530 | 
531 | ### Phase 2: Route Matching Enhancement (Subtask 1.2)
532 | - Implement config-based route override
533 | - Support custom resource patterns
534 | - Support custom action patterns
535 | - Maintain backward compatibility
536 | 
537 | ### Phase 3: Body Generation Refactor (Subtask 1.3)
538 | - Extract field inference to configurable system
539 | - Support custom field generators
540 | - Add scenario-based sample data
541 | - Maintain fallback logic
542 | 
543 | ### Phase 4: Documentation & Testing (Subtask 1.4)
544 | - Document new config options
545 | - Add examples for common domains
546 | - Create migration guide
547 | - Add integration tests
548 | 
549 | ---
550 | 
551 | ## 11. Conclusion
552 | 
553 | ### Strengths
554 | 1. ✅ **No hardcoded route mappings** - Uses discovered routes
555 | 2. ✅ **Generic semantic matching** - Pattern-based inference
556 | 3. ✅ **Clean IBM integration** - No domain logic in AI layer
557 | 4. ✅ **Confidence-based decisions** - Conservative approach
558 | 5. ✅ **Good separation of concerns** - Modular architecture
559 | 
560 | ### Weaknesses
561 | 1. ⚠️ **Hardcoded field inference** - 20+ patterns in code
562 | 2. ⚠️ **Hardcoded resource patterns** - 15 patterns in code
563 | 3. ⚠️ **No route mapping override** - Cannot force specific routes
564 | 4. ⚠️ **Limited configuration** - Missing key config options
565 | 5. ⚠️ **US-centric values** - Phone, address formats
566 | 
567 | ### Recommendations
568 | 
569 | **Immediate (High Priority):**
570 | 1. Add route mapping configuration support
571 | 2. Make field inference configurable
572 | 3. Support custom resource/action patterns
573 | 
574 | **Short-term (Medium Priority):**
575 | 4. Enhance sample data structure
576 | 5. Add locale-aware value generators
577 | 6. Improve config validation
578 | 
579 | **Long-term (Low Priority):**
580 | 7. Add field type registry system
581 | 8. Support custom validation rules
582 | 9. Add internationalization support
583 | 
584 | ### Final Assessment
585 | 
586 | **Architecture Quality: 7/10**
587 | 
588 | The architecture is fundamentally sound with excellent generic design. The main issues are in body generation where field inference is hardcoded. These can be addressed through configuration without major architectural changes.
589 | 
590 | **Refactoring Complexity: Medium**
591 | 
592 | Most changes involve adding configuration support and extracting hardcoded patterns. The core algorithms remain unchanged.
593 | 
594 | ---
595 | 
596 | **End of Analysis**
</content>
</file>
</files>
Tool [read_file] was not executed because a tool has already been used in this message. Only one tool may be used per message. You must assess the first tool's result before proceeding to use the next tool.
Tool [read_file] was not executed because a tool has already been used in this message. Only one tool may be used per message. You must assess the first tool's result before proceeding to use the next tool.
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:43:02.712Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.03

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

<read_file>
<args>
  <file>
    <path>src/types/index.ts</path>
  </file>
  <file>
    <path>src/config/config-loader.ts</path>
  </file>
  <file>
    <path>src/validation/route-matcher.ts</path>
    <line_range>1-100</line_range>
  </file>
  <file>
    <path>src/generators/http-test-generator.ts</path>
    <line_range>1-100</line_range>
  </file>
  <file>
    <path>src/reporting/report-generator.ts</path>
    <line_range>1-100</line_range>
  </file>
</args>
</read_file>

---

**User:**

[read_file for 5 files] Result:
<files>
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
<file><path>src/validation/route-matcher.ts</path>
<content lines="1-100">
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
</content>
</file>
<file><path>src/generators/http-test-generator.ts</path>
<content lines="1-100">
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
</content>
</file>
<file><path>src/reporting/report-generator.ts</path>
<content lines="1-100">
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
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:43:06.635Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.08

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Now let me read more specific sections to understand the current implementation better:

<read_file>
<args>
  <file>
    <path>src/generators/qa-task-plan-generator.ts</path>
    <line_range>1-200</line_range>
  </file>
  <file>
    <path>src/testing/test-coordinator.ts</path>
    <line_range>1-150</line_range>
  </file>
  <file>
    <path>src/validation/body-generator.ts</path>
    <line_range>1-100</line_range>
  </file>
</args>
</read_file>

---

**User:**

[read_file for 'src/generators/qa-task-plan-generator.ts', 'src/testing/test-coordinator.ts', 'src/validation/body-generator.ts'] Result:
<files>
<file><path>src/generators/qa-task-plan-generator.ts</path>
<content lines="1-200">
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
</content>
</file>
<file><path>src/testing/test-coordinator.ts</path>
<content lines="1-150">
  1 | /**
  2 |  * Test Coordinator
  3 |  * Main coordinator that orchestrates the entire testing workflow
  4 |  * Integrates build system, agent, MCP clients, and test execution
  5 |  */
  6 | 
  7 | import { BuildSystem } from '../core/build-system.js';
  8 | import { TestAgent } from '../agent/test-agent.js';
  9 | import { MCPClientManager } from '../mcp/index.js';
 10 | import { TestRunner } from './test-runner.js';
 11 | import { APITester } from './api-tester.js';
 12 | import { WebTester } from './web-tester.js';
 13 | import { TestNormalizer, NormalizedTest } from './test-normalizer.js';
 14 | import { QATaskGenerator, HTTPTestGenerator } from '../generators/qa-task-generator.js';
 15 | import {
 16 |   writeAllGeneratedArtifacts,
 17 |   writeQATaskPlan,
 18 |   writeGeneratedHTTPTests,
 19 |   writeGeneratedTestsMarkdown,
 20 |   writeGeneratedMetadata
 21 | } from '../generators/artifact-writer.js';
 22 | import { parseAcceptanceCriteriaFromFile } from '../parsers/acceptance-parser.js';
 23 | import { discoverRoutes } from '../discovery/route-discovery.js';
 24 | import { ReportGenerator } from '../reporting/report-generator.js';
 25 | import { generateQATaskPlan } from '../generators/qa-task-plan-generator.js';
 26 | import { generateHTTPTests } from '../generators/http-test-generator.js';
 27 | import { executeHTTPTests } from './http-test-executor.js';
 28 | import {
 29 |   TestConfig,
 30 |   TestContext,
 31 |   TestPlan,
 32 |   TestResults,
 33 |   TestResult,
 34 |   TestCase,
 35 |   TestType,
 36 |   TestCoordinatorConfig,
 37 |   TestCoordinatorState,
 38 |   AgentAnalysis,
 39 |   BuildInfo,
 40 |   ChangeSet,
 41 |   RepositoryInfo,
 42 |   TraceQAError,
 43 |   ErrorCategory,
 44 |   HTTPMethod,
 45 |   AssertionType,
 46 |   APIAssertion,
 47 |   DiffAnalysis,
 48 |   QATaskPlan,
 49 |   GeneratedHTTPTestSuite,
 50 |   HTTPTestResult,
 51 |   TraceQAConfig
 52 | } from '../types/index.js';
 53 | import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
 54 | import { logger, formatDuration } from '../utils/logger.js';
 55 | 
 56 | /**
 57 |  * Test Coordinator class
 58 |  */
 59 | export class TestCoordinator {
 60 |   private buildSystem: BuildSystem;
 61 |   private agent: TestAgent;
 62 |   private mcpManager: MCPClientManager;
 63 |   private testRunner: TestRunner;
 64 |   private apiTester: APITester | null = null;
 65 |   private webTester: WebTester | null = null;
 66 |   private config: Required<Omit<TestCoordinatorConfig, 'baseUrl' | 'healthUrl'>> & { baseUrl?: string; healthUrl?: string };
 67 |   private state: TestCoordinatorState;
 68 |   private normalizedTests: NormalizedTest[] = [];
 69 |   private routeDiscovery: RouteDiscoveryResult | null = null;
 70 | 
 71 |   constructor(
 72 |     buildSystem: BuildSystem,
 73 |     agent: TestAgent,
 74 |     mcpManager: MCPClientManager,
 75 |     config: TestCoordinatorConfig = {}
 76 |   ) {
 77 |     this.buildSystem = buildSystem;
 78 |     this.agent = agent;
 79 |     this.mcpManager = mcpManager;
 80 | 
 81 |     // Set default configuration
 82 |     this.config = {
 83 |       buildSystem: {
 84 |         autoInstall: config.buildSystem?.autoInstall ?? true,
 85 |         autoBuild: config.buildSystem?.autoBuild ?? true,
 86 |         autoStart: config.buildSystem?.autoStart ?? true,
 87 |         port: config.buildSystem?.port
 88 |       },
 89 |       agent: config.agent ?? {} as any,
 90 |       mcp: config.mcp ?? {},
 91 |       execution: config.execution ?? {},
 92 |       cleanup: {
 93 |         stopServer: config.cleanup?.stopServer ?? true,
 94 |         cleanupMCP: config.cleanup?.cleanupMCP ?? true,
 95 |         saveResults: config.cleanup?.saveResults ?? true
 96 |       },
 97 |       baseUrl: config.baseUrl ?? undefined,
 98 |       healthUrl: config.healthUrl ?? undefined
 99 |     };
100 | 
101 |     // Initialize test runner
102 |     this.testRunner = new TestRunner(this.config.execution);
103 | 
104 |     // Initialize state
105 |     this.state = {
106 |       phase: 'idle'
107 |     };
108 | 
109 |     logger.info('Test Coordinator initialized');
110 |   }
111 | 
112 |   /**
113 |    * Run complete test workflow
114 |    */
115 |   async runTests(
116 |     testConfig: TestConfig,
117 |     diffAnalysis?: DiffAnalysis | null,
118 |     discoveredRoutes?: RouteDiscoveryResult | null
119 |   ): Promise<{
120 |     testPlan: TestPlan;
121 |     results: TestResults;
122 |     analysis: AgentAnalysis;
123 |     report: string;
124 |   }> {
125 |     logger.info('Starting test workflow...');
126 |     this.state.startTime = new Date().toISOString();
127 | 
128 |     try {
129 |       // Phase 1: Initialize and build
130 |       this.updatePhase('initializing');
131 |       await this.initialize();
132 | 
133 |       // Phase 2: Build project
134 |       this.updatePhase('building');
135 |       const buildResult = await this.buildProject(testConfig);
136 | 
137 |       // Phase 3: Create test context
138 |       const context = await this.createTestContext(testConfig, buildResult, diffAnalysis);
139 | 
140 |       // Store route discovery for normalization
141 |       this.routeDiscovery = discoveredRoutes || null;
142 | 
143 |       // Log discovered routes if available
144 |       if (discoveredRoutes && discoveredRoutes.routes.length > 0) {
145 |         logger.info(`\n🔍 Discovered ${discoveredRoutes.routes.length} routes (${discoveredRoutes.framework}):`);
146 |         discoveredRoutes.routes.slice(0, 10).forEach(route => {
147 |           logger.info(`  ${route.method.padEnd(6)} ${route.path}`);
148 |         });
149 |         if (discoveredRoutes.routes.length > 10) {
150 |           logger.info(`  ... and ${discoveredRoutes.routes.length - 10} more`);
</content>
</file>
<file><path>src/validation/body-generator.ts</path>
<content lines="1-100">
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
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
traceqa-debug\architecture-analysis.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:43:11.113Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.16

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

<update_todo_list>
<todos>
[ ] Analyze current architecture and gather context from existing codebase
[ ] Design route mapping priority system with 6-level hierarchy
[ ] Design IBM integration enhancement for route mapping objects
[ ] Design configuration schema extensions for route mappings and field inference
[ ] Design validation architecture for route discovery and validation separation
[ ] Design test status classification system (ready/uncertain/failed)
[ ] Design report classification categories and metrics
[ ] Design trace matrix mapping by acceptanceCriterionId
[ ] Create comprehensive design document with diagrams and specifications
[ ] Review design document with user for approval
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
Current time in ISO 8601 UTC format: 2026-05-02T02:43:17.042Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.25

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Analyze current architecture and gather context from existing codebase | Pending |
| 2 | Design route mapping priority system with 6-level hierarchy | Pending |
| 3 | Design IBM integration enhancement for route mapping objects | Pending |
| 4 | Design configuration schema extensions for route mappings and field inference | Pending |
| 5 | Design validation architecture for route discovery and validation separation | Pending |
| 6 | Design test status classification system (ready/uncertain/failed) | Pending |
| 7 | Design report classification categories and metrics | Pending |
| 8 | Design trace matrix mapping by acceptanceCriterionId | Pending |
| 9 | Create comprehensive design document with diagrams and specifications | Pending |
| 10 | Review design document with user for approval | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

<update_todo_list>
<todos>
[x] Analyze current architecture and gather context from existing codebase
[-] Design route mapping priority system with 6-level hierarchy
[ ] Design IBM integration enhancement for route mapping objects
[ ] Design configuration schema extensions for route mappings and field inference
[ ] Design validation architecture for route discovery and validation separation
[ ] Design test status classification system (ready/uncertain/failed)
[ ] Design report classification categories and metrics
[ ] Design trace matrix mapping by acceptanceCriterionId
[ ] Create comprehensive design document with diagrams and specifications
[ ] Review design document with user for approval
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
Current time in ISO 8601 UTC format: 2026-05-02T02:43:20.059Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.35

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Analyze current architecture and gather context from existing codebase | Completed |
| 2 | Design route mapping priority system with 6-level hierarchy | In Progress |
| 3 | Design IBM integration enhancement for route mapping objects | Pending |
| 4 | Design configuration schema extensions for route mappings and field inference | Pending |
| 5 | Design validation architecture for route discovery and validation separation | Pending |
| 6 | Design test status classification system (ready/uncertain/failed) | Pending |
| 7 | Design report classification categories and metrics | Pending |
| 8 | Design trace matrix mapping by acceptanceCriterionId | Pending |
| 9 | Create comprehensive design document with diagrams and specifications | Pending |
| 10 | Review design document with user for approval | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Now I'll create a comprehensive design document for the route-mapping priority system. Based on my analysis, I have a clear understanding of the current architecture and can design the improvements.

<write_to_file>
<path>traceqa-debug/route-mapping-design.md</path>
<content>
# TraceQA Route Mapping Priority System - Design Document

**Version:** 1.0  
**Date:** 2026-05-02  
**Author:** Bob  
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Route Mapping Priority System](#route-mapping-priority-system)
4. [IBM Integration Enhancement](#ibm-integration-enhancement)
5. [Configuration Schema Extensions](#configuration-schema-extensions)
6. [Validation Architecture](#validation-architecture)
7. [Test Status Classification](#test-status-classification)
8. [Report Classification System](#report-classification-system)
9. [Trace Matrix Mapping](#trace-matrix-mapping)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Interface Definitions](#interface-definitions)
12. [Decision Trees](#decision-trees)
13. [Error Handling Strategy](#error-handling-strategy)
14. [Backward Compatibility](#backward-compatibility)
15. [Migration Path](#migration-path)
16. [Implementation Phases](#implementation-phases)

---

## 1. Executive Summary

This design document specifies a comprehensive route-mapping priority system for TraceQA that addresses the key architectural improvements identified in the analysis:

**Key Improvements:**
- 6-level route mapping priority hierarchy (OpenAPI → Config → IBM → Validation → Fallback → Manual)
- IBM produces route mapping objects BEFORE test generation
- Extensible configuration schema for route mappings and field inference
- Clear separation between route discovery and validation
- Precise test status classification (ready/uncertain/failed)
- Accurate report metrics that don't conflate uncertain with failed tests
- Exact trace matrix mapping by acceptanceCriterionId

**Design Principles:**
- Backward compatible with existing implementations
- Optional enhancements (all new features are opt-in)
- Conservative approach (mark as uncertain when confidence is low)
- Clear separation of concerns
- Fail-safe defaults

---

## 2. Current Architecture Analysis

### 2.1 Current Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT TRACEQA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. Parse Acceptance Criteria
   ↓
2. Discover Routes (route-discovery.ts)
   ↓
3. Generate QA Task Plan (qa-task-plan-generator.ts)
   │  ├─ IBM suggests task types
   │  └─ Fallback: deterministic classification
   ↓
4. Generate HTTP Tests (http-test-generator.ts)
   │  ├─ Match routes using semantic matching (route-matcher.ts)
   │  ├─ IBM suggests test structure
   │  ├─ Generate bodies (body-generator.ts)
   │  └─ Determine test status (ready/uncertain/manual)
   ↓
5. Execute Tests (http-test-executor.ts)
   ↓
6. Generate Reports (report-generator.ts)
```

### 2.2 Current Issues

**Issue 1: No Explicit Route Mapping Override**
- Users cannot force specific AC → Route mappings
- Semantic matching may choose wrong route
- No way to override IBM's route selection

**Issue 2: IBM Doesn't Produce Route Mapping Object**
- IBM suggests routes within test generation
- No separate route mapping phase
- Cannot validate route selection before test generation

**Issue 3: Limited Configuration**
- No `routeMappings` in config
- No `fieldInferenceRules` customization
- Hardcoded patterns in body-generator.ts

**Issue 4: Unclear Test Status**
- "uncertain" tests mixed with "failed" tests in reports
- No clear distinction between "not executed" and "executed but failed"

**Issue 5: Trace Matrix Over-mapping**
- Tests may be attached to multiple ACs incorrectly
- No strict acceptanceCriterionId matching

---

## 3. Route Mapping Priority System

### 3.1 Six-Level Hierarchy

The route mapping system follows a strict priority order, with each level taking precedence over lower levels:

```
┌─────────────────────────────────────────────────────────────────┐
│              ROUTE MAPPING PRIORITY HIERARCHY                   │
└─────────────────────────────────────────────────────────────────┘

LEVEL 1: OpenAPI operationId/summary/schemas
         ├─ Source: OpenAPI specification
         ├─ Confidence: HIGH
         ├─ When: OpenAPI spec available with operationId
         └─ Example: operationId: "registerUser" → POST /api/users/register

LEVEL 2: Explicit Config Route Mappings
         ├─ Source: traceqa.config.json routeMappings
         ├─ Confidence: HIGH (user-defined)
         ├─ When: User explicitly maps AC → Route
         └─ Example: AC-1 → POST /api/auth/signup

LEVEL 3: IBM Route Mapping (from discovered routes)
         ├─ Source: IBM watsonx route mapping object
         ├─ Confidence: HIGH/MEDIUM/LOW (IBM-provided)
         ├─ When: IBM successfully maps AC to discovered route
         └─ Example: IBM selects POST /api/users from discovered routes

LEVEL 4: Structural Validation
         ├─ Source: Validation against discovered routes
         ├─ Confidence: MEDIUM
         ├─ When: IBM/fallback route exists in discovered routes
         └─ Example: Verify POST /api/users exists in discovered routes

LEVEL 5: Conservative Deterministic Fallback
         ├─ Source: Semantic pattern matching
         ├─ Confidence: LOW
         ├─ When: AC explicitly mentions method/path
         └─ Example: AC says "POST to /register" → POST /register

LEVEL 6: Mark as Uncertain/Manual
         ├─ Source: No safe mapping found
         ├─ Confidence: NONE
         ├─ When: No route can be safely mapped
         └─ Example: AC is vague, no routes discovered
```

### 3.2 Route Mapping Algorithm

```typescript
function mapRouteForAcceptanceCriterion(
  ac: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  openApiSpec?: OpenAPISpec,
  ibmRouteMapping?: IBMRouteMapping
): RouteMappingResult {
  
  // LEVEL 1: Check OpenAPI operationId/summary
  if (openApiSpec) {
    const openApiRoute = findRouteByOperationId(ac, openApiSpec);
    if (openApiRoute && routeExistsInDiscovered(openApiRoute, discoveredRoutes)) {
      return {
        route: openApiRoute,
        confidence: 'high',
        source: 'openapi',
        reasoning: `Mapped via OpenAPI operationId: ${openApiRoute.operationId}`
      };
    }
  }
  
  // LEVEL 2: Check explicit config mapping
  const configMapping = config.routeMappings?.find(
    m => m.acceptanceCriterionId === ac.id
  );
  if (configMapping) {
    const route = findRouteInDiscovered(configMapping.route, discoveredRoutes);
    if (route) {
      return {
        route,
        confidence: configMapping.confidence || 'high',
        source: 'config',
        reasoning: 'Explicit user-defined mapping in traceqa.config.json'
      };
    } else {
      return {
        route: null,
        confidence: 'none',
        source: 'config_error',
        reasoning: `Config mapping specifies ${configMapping.route.method} ${configMapping.route.path} but route not found in discovered routes`
      };
    }
  }
  
  // LEVEL 3: Use IBM route mapping (if available)
  if (ibmRouteMapping && ibmRouteMapping.selectedRoute) {
    const route = findRouteInDiscovered(ibmRouteMapping.selectedRoute, discoveredRoutes);
    if (route) {
      return {
        route,
        confidence: ibmRouteMapping.confidence,
        source: 'ibm',
        reasoning: ibmRouteMapping.reasoning,
        requiresSetup: ibmRouteMapping.requiresSetup,
        setupRoute: ibmRouteMapping.setupRoute
      };
    }
  }
  
  // LEVEL 4: Structural validation (validate any proposed route)
  // This level is implicit - all routes must pass structural validation
  
  // LEVEL 5: Conservative deterministic fallback
  if (acExplicitlyMentionsRoute(ac)) {
    const fallbackRoute = semanticRouteMatch(ac, discoveredRoutes);
    if (fallbackRoute && fallbackRoute.confidence !== 'low') {
      return {
        route: fallbackRoute.route,
        confidence: 'low',
        source: 'semantic_fallback',
        reasoning: 'Fallback semantic matching based on AC keywords'
      };
    }
  }
  
  // LEVEL 6: Mark as uncertain
  return {
    route: null,
    confidence: 'none',
    source: 'uncertain',
    reasoning: 'No safe route mapping found. Manual review required.'
  };
}
```

### 3.3 Route Mapping Decision Tree

```
                    ┌─────────────────────┐
                    │  Acceptance         │
                    │  Criterion (AC)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ OpenAPI spec        │
                    │ available?          │
                    └──────┬──────────────┘
                           │
                ┌──────────┴──────────┐
                │ YES                 │ NO
                ▼                     ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │ Find operationId    │   │ Check config        │
    │ matching AC         │   │ routeMappings       │
    └──────┬──────────────┘   └──────┬──────────────┘
           │                          │
    ┌──────┴──────┐          ┌────────┴────────┐
    │ Found?      │          │ Mapping exists? │
    └──────┬──────┘          └────────┬────────┘
           │                          │
    ┌──────┴──────┐          ┌────────┴────────┐
    │ YES         │ NO       │ YES             │ NO
    ▼             ▼          ▼                 ▼
┌────────┐   ┌────────┐  ┌────────┐      ┌────────┐
│ Level 1│   │ Level 2│  │ Level 2│      │ Level 3│
│ OpenAPI│   │ Config │  │ Config │      │  IBM   │
└────┬───┘   └────┬───┘  └────┬───┘      └────┬───┘
     │            │           │                │
     │            │           │         ┌──────┴──────┐
     │            │           │         │ IBM mapping │
     │            │           │         │ available?  │
     │            │           │         └──────┬──────┘
     │            │           │                │
     │            │           │         ┌──────┴──────┐
     │            │           │         │ YES         │ NO
     │            │           │         ▼             ▼
     │            │           │    ┌────────┐    ┌────────┐
     │            │           │    │ Level 3│    │ Level 5│
     │            │           │    │  IBM   │    │Fallback│
     │            │           │    └────┬───┘    └────┬───┘
     │            │           │         │             │
     └────────────┴───────────┴─────────┴─────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Level 4: Structural │
                   │ Validation          │
                   └──────────┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │ Route exists in     │
                   │ discovered routes?  │
                   └──────────┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │ YES                 │ NO
                   ▼                     ▼
            ┌─────────────┐      ┌─────────────┐
            │ MAPPED      │      │ Level 6:    │
            │ (ready)     │      │ UNCERTAIN   │
            └─────────────┘      └─────────────┘
```

---

## 4. IBM Integration Enhancement

### 4.1 New IBM Workflow

IBM now produces a **route mapping object** BEFORE test generation:

```
┌─────────────────────────────────────────────────────────────────┐
│                  NEW IBM INTEGRATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. Parse Acceptance Criteria
   ↓
2. Discover Routes
   ↓
3. IBM Route Mapping Phase (NEW)
   │  ├─ Input: AC + Discovered Routes
   │  ├─ Output: Route Mapping Object per AC
   │  └─ IBM chooses ONLY from discovered routes
   ↓
4. Validate Route Mappings
   │  └─ Structural validation against discovered routes
   ↓
5. Generate QA Task Plan
   │  └─ Uses validated route mappings
   ↓
6. Generate HTTP Tests
   │  └─ Uses validated route mappings
   ↓
7. Execute Tests
   ↓
8. Generate Reports
```

### 4.2 IBM Route Mapping Object

```typescript
interface IBMRouteMapping {
  /** Acceptance criterion ID this mapping is for */
  acceptanceCriterionId: string;
  
  /** Selected route from discovered routes (null if no fit) */
  selectedRoute: {
    method: string;
    path: string;
  } | null;
  
  /** Confidence in this mapping */
  confidence: 'high' | 'medium' | 'low';
  
  /** Reasoning for route selection */
  reasoning: string;
  
  /** Whether this test requires setup (e.g., login first) */
  requiresSetup: boolean;
  
  /** Setup route if required (e.g., POST /api/auth/login) */
  setupRoute?: {
    method: string;
    path: string;
  };
  
  /** Alternative routes considered */
  alternatives?: Array<{
    method: string;
    path: string;
    reason: string;
  }>;
}

interface IBMRouteMappingResponse {
  /** Route mappings for each AC */
  mappings: IBMRouteMapping[];
  
  /** Overall confidence in mappings */
  overallConfidence: 'high' | 'medium' | 'low';
  
  /** Warnings or concerns */
  warnings: string[];
}
```

### 4.3 IBM Route Mapping Prompt

```typescript
function buildIBMRouteMappingPrompt(
  acceptanceCriteria: AcceptanceCriterion[],
  discoveredRoutes: DiscoveredRoute[]
): string {
  return `You are a QA engineer mapping acceptance criteria to API routes.

DISCOVERED ROUTES:
${discoveredRoutes.map(r => `  ${r.method} ${r.path}${r.description ? ` - ${r.description}` : ''}`).join('\n')}

ACCEPTANCE CRITERIA:
${acceptanceCriteria.map(ac => `  [${ac.id}] ${ac.description}`).join('\n')}

TASK: Map each acceptance criterion to the most appropriate route from the DISCOVERED ROUTES list.

RULES:
1. You MUST choose ONLY from the discovered routes listed above
2. If no route fits, set selectedRoute to null
3. Provide confidence: high (90%+ sure), medium (60-89%), low (<60%)
4. Explain your reasoning in 1-2 sentences
5. Indicate if setup is required (e.g., login before testing protected route)

Return ONLY valid JSON with this structure:
{
  "mappings": [
    {
      "acceptanceCriterionId": "AC-1",
      "selectedRoute": {
        "method": "POST",
        "path": "/api/users/register"
      },
      "confidence": "high",
      "reasoning": "AC-1 describes user registration, and POST /api/users/register is the standard registration endpoint.",
      "requiresSetup": false
    },
    {
      "acceptanceCriterionId": "AC-2",
      "selectedRoute": null,
      "confidence": "low",
      "reasoning": "AC-2 describes UI behavior with no clear API endpoint match in discovered routes.",
      "requiresSetup": false
    }
  ],
  "overallConfidence": "medium",
  "warnings": ["AC-2 has no clear API route match"]
}`;
}
```

### 4.4 IBM Route Mapping Validation

```typescript
function validateIBMRouteMapping(
  mapping: IBMRouteMapping,
  discoveredRoutes: DiscoveredRoute[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate selectedRoute exists in discovered routes
  if (mapping.selectedRoute) {
    const routeExists = discoveredRoutes.some(
      r => r.method === mapping.selectedRoute!.method &&
           r.path === mapping.selectedRoute!.path
    );
    
    if (!routeExists) {
      errors.push(
        `IBM selected route ${mapping.selectedRoute.method} ${mapping.selectedRoute.path} ` +
        `not found in discovered routes`
      );
    }
  }
  
  // Validate setupRoute if provided
  if (mapping.setupRoute) {
    const setupExists = discoveredRoutes.some(
      r => r.method === mapping.setupRoute!.method &&
           r.path === mapping.setupRoute!.path
    );
    
    if (!setupExists) {
      warnings.push(
        `Setup route ${mapping.setupRoute.method} ${mapping.setupRoute.path} ` +
        `not found in discovered routes`
      );
    }
  }
  
  // Validate confidence level
  if (!['high', 'medium', 'low'].includes(mapping.confidence)) {
    errors.push(`Invalid confidence level: ${mapping.confidence}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 5. Configuration Schema Extensions

### 5.1 Extended TraceQAProjectConfig

```typescript
interface TraceQAProjectConfig {
  // ... existing fields ...
  
  /**
   * Explicit route mappings for acceptance criteria
   * Takes precedence over IBM and semantic matching
   */
  routeMappings?: RouteMapping[];
  
  /**
   * Sample data for test scenarios
   * Organized by scenario type
   */
  sampleData?: SampleDataConfig;
  
  /**
   * Custom field inference rules for body generation
   * Allows domain-specific field generation
   */
  fieldInferenceRules?: FieldInferenceRule[];
  
  /**
   * Custom resource patterns for route matching
   * Extends default resource detection
   */
  customResourcePatterns?: ResourcePattern[];
  
  /**
   * Custom action patterns for route matching
   * Extends default action detection
   */
  customActionPatterns?: ActionPattern[];
}
```

### 5.2 Route Mapping Configuration

```typescript
interface RouteMapping {
  /** Acceptance criterion ID to map */
  acceptanceCriterionId: string;
  
  /** Target route */
  route: {
    method: string;
    path: string;
  };
  
  /** Confidence level (optional, defaults to 'high') */
  confidence?: 'high' | 'medium' | 'low';
  
  /** Optional reasoning for documentation */
  reasoning?: string;
  
  /** Whether this route requires setup */
  requiresSetup?: boolean;
  
  /** Setup route if required */
  setupRoute?: {
    method: string;
    path: string;
  };
}
```

### 5.3 Sample Data Configuration

```typescript
interface SampleDataConfig {
  /** Sample data organized by scenario */
  scenarios: {
    [scenarioName: string]: {
      [fieldName: string]: any;
    };
  };
  
  /** Default values for common fields */
  defaults?: {
    [fieldName: string]: any;
  };
}
```

### 5.4 Field Inference Rules

```typescript
interface FieldInferenceRule {
  /** Field name or pattern (regex) */
  fieldPattern: string;
  
  /** Generator type */
  generator: 'email' | 'password' | 'phone' | 'uuid' | 'timestamp' | 'custom';
  
  /** Template for custom generator (supports placeholders) */
  template?: string;
  
  /** Scenario-specific overrides */
  scenarios?: {
    [scenarioName: string]: any;
  };
  
  /** Priority (higher = checked first) */
  priority?: number;
}
```

### 5.5 Resource and Action Patterns

```typescript
interface ResourcePattern {
  /** Resource name */
  name: string;
  
  /** Regex pattern to match */
  pattern: string;
  
  /** Priority (higher = checked first) */
  priority?: number;
}

interface ActionPattern {
  /** Action name */
  action: string;
  
  /** Regex pattern to match */
  pattern: string;
  
  /** HTTP methods associated with this action */
  httpMethods: string[];
  
  /** Priority (higher = checked first) */
  priority?: number;
}
```

### 5.6 Example Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "openapi": "./openapi.yaml",
  
  "routeMappings": [
    {
      "acceptanceCriterionId": "AC-1",
      "route": {
        "method": "POST",
        "path": "/api/auth/signup"
      },
      "confidence": "high",
      "reasoning": "User explicitly wants signup endpoint tested"
    },
    {
      "acceptanceCriterionId": "AC-5",
      "route": {
        "method": "GET",
        "path": "/api/users/profile"
      },
      "requiresSetup": true,
      "setupRoute": {
        "method": "POST",
        "path": "/api/auth/login"
      }
    }
  ],
  
  "sampleData": {
    "scenarios": {
      "valid_user": {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "firstName": "Test",
        "lastName": "User"
      },
      "invalid_email": {
        "email": "invalid-email",
        "password": "SecurePass123!"
      },
      "weak_password": {
        "email": "test@example.com",
        "password": "weak"
      }
    },
    "defaults": {
      "email": "default@example.com",
      "phone": "+1-555-0100"
    }
  },
  
  "fieldInferenceRules": [
    {
      "fieldPattern": "email",
      "generator": "email",
      "template": "traceqa-{testId}@example.com",
      "scenarios": {
        "invalid_email": "not-an-email"
      },
      "priority": 10
    },
    {
      "fieldPattern": "password",
      "generator": "password",
      "template": "SecurePass{timestamp}!",
      "scenarios": {
        "weak_password": "weak"
      },
      "priority": 10
    },
    {
      "fieldPattern": "userId|user_id",
      "generator": "uuid",
      "priority": 5
    }
  ],
  
  "customResourcePatterns": [
    {
      "name": "tenant",
      "pattern": "\\b(tenant|organization|org)s?\\b",
      "priority": 10
    },
    {
      "name": "subscription",
      "pattern": "\\b(subscription|plan|tier)s?\\b",
      "priority": 10
    }
  ],
  
  "customActionPatterns": [
    {
      "action": "activate",
      "pattern": "\\b(activate|enable|turn\\s*on)\\b",
      "httpMethods": ["POST", "PATCH"],
      "priority": 10
    },
    {
      "action": "deactivate",
      "pattern": "\\b(deactivate|disable|turn\\s*off)\\b",
      "httpMethods": ["POST", "PATCH"],
      "priority": 10
    }
  ]
}
```

---

## 6. Validation Architecture

### 6.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDATION ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│ Route Discovery     │  Discovers routes from application
│ (route-discovery)   │  - Scans code/OpenAPI
└──────────┬──────────┘  - Returns DiscoveredRoute[]
           │
           ▼
┌─────────────────────┐
│ Route Mapping       │  Maps AC to routes using priority system
│ (route-mapper)      │  - Level 1-6 hierarchy
└──────────┬──────────┘  - Returns RouteMappingResult
           │
           ▼
┌─────────────────────┐
│ Structural          │  Validates route exists in discovered routes
│ Validation          │  - Method/path validation
└──────────┬──────────┘  - Returns structural errors
           │
           ▼
┌─────────────────────┐
│ Content Validation  │  Validates test content
│ (test-validator)    │  - URL format
└──────────┬──────────┘  - Body structure
           │             - Status codes
           ▼
┌─────────────────────┐
│ Confidence Scoring  │  Assigns confidence based on validation
│ (confidence-scorer) │  - High: All validations pass
└──────────┬──────────┘  - Medium: Some warnings
           │             - Low: Significant issues
           ▼
┌─────────────────────┐
│ Test Status         │  Determines if test is ready/uncertain
│ Classification      │  - ready: High/medium confidence
└─────────────────────┘  - uncertain: Low/no confidence
```

### 6.2 Structural Validation

```typescript
interface StructuralValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    routeExists: boolean;
    methodValid: boolean;
    pathValid: boolean;
    parametersValid: boolean;
  };
}

function validateRouteStructure(
  proposedRoute: { method: string; path: string },
  discoveredRoutes: DiscoveredRoute[]
): StructuralValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if route exists
  const routeExists = discoveredRoutes.some(
    r => r.method === proposedRoute.method &&
         r.path === proposedRoute.path
  );
  
  if (!routeExists) {
    errors.push(
      `Route ${proposedRoute.method} ${proposedRoute.path} not found in discovered routes`
    );
  }
  
  // Validate HTTP method
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  const methodValid = validMethods.includes(proposedRoute.method.toUpperCase());
  
  if (!methodValid) {
    errors.push(`Invalid HTTP method: ${proposedRoute.method}`);
  }
  
  // Validate path format
  const pathValid = proposedRoute.path.startsWith('/');
  
  if (!pathValid) {
    errors.push(`Invalid path format: ${proposedRoute.path} (must start with /)`);
  }
  
  // Check for path parameters
  const hasPathParams = proposedRoute.path.includes(':') || proposedRoute.path.includes('{');
  if (hasPathParams) {
    warnings.push(
      `Path contains parameters: ${proposedRoute.path}. ` +
      `Ensure parameter values are provided during test execution.`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: {
      routeExists,
      methodValid,
      pathValid,
      parametersValid: !hasPathParams || warnings.length === 0
    }
  };
}
```

### 6.3 Content Validation

```typescript
interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    urlValid: boolean;
    bodyValid: boolean;
    statusesValid: boolean;
    headersValid: boolean;
  };
}

function validateTestContent(
  test: HTTPTestStep,
  baseUrl: string
): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate URL
  let urlValid = false;
  try {
    new URL(test.url, baseUrl);
    urlValid = true;
  } catch {
    errors.push(`Invalid URL: ${test.url}`);
  }
  
  // Validate body (if present)
  let bodyValid = true;
  if (test.body) {
    if (typeof test.body !== 'object') {
      errors.push('Body must be an object');
      bodyValid = false;
    }
  }
  
  // Validate expected status
  let statusesValid = true;
  if (test.expectedStatus) {
    if (test.expectedStatus < 100 || test.expectedStatus > 599) {
      errors.push(`Invalid expected status: ${test.expectedStatus}`);
      statusesValid = false;
    }
  }
  
  // Validate acceptable statuses
  if (test.acceptableStatuses) {
    for (const status of test.acceptableStatuses) {
      if (status < 100 || status > 599) {
        errors.push(`Invalid acceptable status: ${status}`);
        statusesValid = false;
      }
    }
  }
  
  // Validate headers
  let headersValid = true;
  if (test.headers) {
    if (typeof test.headers !== 'object') {
      errors.push('Headers must be an object');
      headersValid = false;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: {
      urlValid,
      bodyValid,
      statusesValid,
      headersValid
    }
  };
}
```

### 6.4 Confidence Scoring

```typescript
function calculateConfidence(
  routeMapping: RouteMappingResult,
  structuralValidation: StructuralValidationResult,
  contentValidation: ContentValidationResult
): 'high' | 'medium' | 'low' | 'none' {
  
  // If structural validation fails, confidence is none
  if (!structuralValidation.valid) {
    return 'none';
  }
  
  // If content validation fails, confidence is low
  if (!contentValidation.valid) {
    return 'low';
  }
  
  // Base confidence on route mapping source
  const sourceConfidence = {
    'openapi': 'high',
    'config': 'high',
    'ibm': routeMapping.confidence,
    'semantic_fallback': 'low',
    'uncertain': 'none'
  };
  
  let confidence = sourceConfidence[routeMapping.source] || 'low';
  
  // Downgrade if there are warnings
  if (structuralValidation.warnings.length > 0 || contentValidation.warnings.length > 0) {
    if (confidence === 'high') confidence = 'medium';
    else if (confidence === 'medium') confidence = 'low';
  }
  
  return confidence as 'high' | 'medium' | 'low' | 'none';
}
```

---

## 7. Test Status Classification

### 7.1 Status Definitions

```typescript
enum TestStatus {
  /** Test is ready to execute (high/medium confidence) */
  READY = 'ready',
  
  /** Test cannot be safely generated (low/no confidence) */
  UNCERTAIN = 'uncertain',
  
  /** Test requires manual execution */
  MANUAL = 'manual',
  
  /** Test was executed and passed */
  PASSED = 'passed',
  
  /** Test was executed and failed (application issue) */
  FAILED = 'failed',
  
  /** Test was skipped (dependency failed, etc.) */
  SKIPPED = 'skipped'
}
```

### 7.2 Status Classification Logic

```typescript
function determineTestStatus(
  routeMapping: RouteMappingResult,
  structuralValidation: StructuralValidationResult,
  contentValidation: ContentValidationResult,
  bodyGeneration: BodyGenerationResult,
  task: QATask
): {
  status: TestStatus;
  uncertainReason?: string;
} {
  
  // If task is marked as manual, status is manual
  if (task.executionMode === 'manual') {
    return {
      status: TestStatus.MANUAL,
      uncertainReason: task.uncertainReason
    };
  }
  
  // If no route mapping, status is uncertain
  if (!routeMapping.route) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: routeMapping.reasoning || 'No route mapping found'
    };
  }
  
  // If structural validation fails, status is uncertain
  if (!structuralValidation.valid) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Route validation failed: ${structuralValidation.errors.join(', ')}`
    };
  }
  
  // If content validation fails, status is uncertain
  if (!contentValidation.valid) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Content validation failed: ${contentValidation.errors.join(', ')}`
    };
  }
  
  // If body generation failed for POST/PUT/PATCH, status is uncertain
  const methodNeedsBody = ['POST', 'PUT', 'PATCH'].includes(routeMapping.route.method);
  if (methodNeedsBody && !bodyGeneration.body) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: 'Cannot generate request body for this endpoint'
    };
  }
  
  // If confidence is low, status is uncertain
  const confidence = calculateConfidence(routeMapping, structuralValidation, contentValidation);
  if (confidence === 'low' || confidence === 'none') {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Low confidence in test generation (${confidence})`
    };
  }
  
  // Otherwise, test is ready
  return {
    status: TestStatus.READY
  };
}
```

### 7.3 Status Transition Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              TEST STATUS LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │  GENERATED  │  (Initial state)
                    └──────┬──────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Classification      │
                └──────────┬───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌────────┐        ┌─────────┐       ┌─────────┐
   │ READY  │        │UNCERTAIN│       │ MANUAL  │
   └────┬───┘        └─────────┘       └─────────┘
        │                  │                  │
        │                  │                  │
        ▼                  │                  │
   ┌────────┐             │                  │
   │EXECUTE │             │                  │
   └────┬───┘             │                  │
        │                  │                  │
   ┌────┴────┐            │                  │
   │         │            │                  │
   ▼         ▼            ▼                  ▼
┌────────┐ ┌────────┐ ┌────────┐      ┌──────────┐
│ PASSED │ │ FAILED │ │SKIPPED │      │ MANUAL   │
└────────┘ └────────┘ └────────┘      │EXECUTION │
                                       └──────────┘

NOTES:
- UNCERTAIN tests are NOT executed
- MANUAL tests require human execution
- READY tests proceed to execution
- PASSED/FAILED are execution results
- SKIPPED when dependencies fail
```

---

## 8. Report Classification System

### 8.1 Report Categories

```typescript
interface ReportCategories {
  /** Total tests generated */
  generated: number;
  
  /** Tests ready for execution */
  ready: number;
  
  /** Tests actually executed */
  executed: number;
  
  /** Tests that passed */
  passed: number;
  
  /** Tests that failed (application issue) */
  failed: number;
  
  /** Tests marked as uncertain (not executed) */
  uncertain: number;
  
  /** Tests requiring manual execution */
  manual: number;
  
  /** Tests skipped due to dependencies */
  skipped: number;
}
```

### 8.2 Classification Rules

```
┌─────────────────────────────────────────────────────────────────┐
│              REPORT CLASSIFICATION RULES                        │
└─────────────────────────────────────────────────────────────────┘

GENERATED: All tests created by TraceQA
  ├─ Includes: ready, uncertain, manual
  └─ Count: Total number of GeneratedHTTPTest objects

READY: Tests with status = 'ready'
  ├─ High/medium confidence
  ├─ Valid route mapping
  ├─ Valid body generation
  └─ Can be executed

EXECUTED: Tests that were actually run
  ├─ Subset of 'ready' tests
  ├─ Excludes uncertain and manual
  └─ Count: Tests with HTTPTestResult

PASSED: Executed tests with passing result
  ├─ Status code matches expected
  ├─ Body validation passes
  └─ Classification = 'passed'

FAILED: Executed tests with failing result
  ├─ Status code doesn't match
  ├─ Body validation fails
  ├─ Classification = 'application_failure'
  └─ IMPORTANT: Does NOT include uncertain tests

UNCERTAIN: Tests that could not be safely generated
  ├─ Status = 'uncertain'
  ├─ NOT executed
  ├─ NOT counted as failed
  └─ Requires manual review

MANUAL: Tests requiring human execution
  ├─ Status = 'manual'
  ├─ Cannot be automated
  └─ Requires manual test execution

SKIPPED: Tests not executed due to dependencies
  ├─ Setup step failed
  ├─ Prerequisite test failed
  └─ Status = 'skipped'
```

### 8.3 Report Summary Structure

```typescript
interface ReportSummary {
  timestamp: string;
  projectName: string;
  
  acceptanceCriteria: {
    total: number;
    covered: number;
    uncovered: number;
  };
  
  qaTasks: {
    total: number;
    automated: number;
    manual: number;
    uncertain: number;
  };
  
  generatedTests: {
    total: number;
    ready: number;
    uncertain: number;
    manual: number;
  };
  
  executionResults: {
    total: number;        // Same as generatedTests.total
    executed: number;     // Tests actually run
    passed: number;       // Executed and passed
    failed: number;       // Executed and failed (application issue)
    uncertain: number;    // Not executed (generation issue)
    manual: number;       // Requires manual execution
    skipped: number;      // Not executed (dependency failed)
  };
  
  classifications: {
    passed: number;                    // Application working correctly
    application_failure: number;       // Real bugs found
    traceqa_generation_issue: number;  // TraceQA couldn't generate proper test
    uncertain: number;                 // Cannot determine
    manual: number;                    // Requires human execution
  };
  
  mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  riskLevel: 'low' | 'medium' | 'high';
}
```

### 8.4 Merge Readiness Calculation

```typescript
function calculateMergeReadiness(summary: ReportSummary): {
  mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
} {
  const { executionResults, classifications } = summary;
  
  // Calculate coverage
  const executionCoverage = executionResults.executed / executionResults.total;
  const passRate = executionResults.passed / executionResults.executed;
  
  // Determine merge readiness
  let mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  let riskLevel: 'low' | 'medium' | 'high';
  let reasoning: string;
  
  // Not ready if there are application failures
  if (classifications.application_failure > 0) {
    mergeReadiness = 'not_ready';
    riskLevel = 'high';
    reasoning = `${classifications.application_failure} application failure(s) detected`;
  }
  // Uncertain if too many uncertain tests
  else if (executionResults.uncertain / executionResults.total > 0.5) {
    mergeReadiness = 'uncertain';
    riskLevel = 'medium';
    reasoning = `${executionResults.uncertain} uncertain tests (${Math.round(executionResults.uncertain / executionResults.total * 100)}% of total)`;
  }
  // Uncertain if low execution coverage
  else if (executionCoverage < 0.5) {
    mergeReadiness = 'uncertain';
    riskLevel = 'medium';
    reasoning = `Low execution coverage (${Math.round(executionCoverage * 100)}%)`;
  }
  // Ready if all executed tests passed
  else if (passRate === 1.0) {
    mergeReadiness = 'ready';
    riskLevel = 'low';
    reasoning = `All ${executionResults.executed} executed tests passed`;
  }
  // Not ready if pass rate is low
  else if (passRate < 0.8) {
    mergeReadiness = 'not_ready';
    riskLevel = 'high';
    reasoning = `Low pass rate (${Math.round(passRate * 100)}%)`;
  }
  // Uncertain otherwise
  else {
    mergeReadiness = 'uncertain';
    riskLevel = 'medium';
    reasoning = `Pass rate ${Math.round(passRate * 100)}%, but some tests failed`;
  }
  
  return { mergeReadiness, riskLevel, reasoning };
}
```

---

## 9. Trace Matrix Mapping

### 9.1 Strict Mapping Rules

```
┌─────────────────────────────────────────────────────────────────┐
│              TRACE MATRIX MAPPING RULES                         │
└─────────────────────────────────────────────────────────────────┘

RULE 1: Map by exact acceptanceCriterionId ONLY
  ├─ Each test has acceptanceCriterionId field
  ├─ Match test.acceptanceCriterionId === ac.id
  └─ Do NOT attach tests to unrelated ACs

RULE 2: Support 1:N mapping
  ├─ One AC can have multiple tests
  ├─ Example: AC-1 → [Test-1, Test-2, Test-3]
  └─ All tests with same acceptanceCriterionId

RULE 3: Do NOT attach unrelated tests
  ├─ If test.acceptanceCriterionId !== ac.id, do NOT include
  ├─ Empty test list is valid (AC not covered)
  └─ Better to show gaps than false coverage

RULE 4: Preserve full chain
  ├─ AC → QATask → GeneratedTest → ExecutionResult
  ├─ Each level maps by ID
  └─ Complete traceability
```

### 9.2 Trace Matrix Structure

```typescript
interface TraceMatrixEntry {
  /** Acceptance criterion being traced */
  acceptanceCriterionId: string;
  acceptanceCriterionText: string;
  acceptanceCriterionPriority: string;
  
  /** QA tasks generated for this AC */
  qaTasks: Array<{
    taskId: string;
    title: string;
    type: string;
    executionMode: string;
    reasoning: string;
  }>;
  
  /** Tests generated for this AC */
  generatedTests: Array<{
    testId: string;
    title: string;
    status: 'ready' | 'uncertain' | 'manual';
    uncertainReason?: string;
    routeMapping?: {
      method: string;
      path: string;
      source: string;
      confidence: string;
    };
  }>;
  
  /** Execution results for tests of this AC */
  executionResults: Array<{
    testId: string;
    status: 'passed' | 'failed' | 'skipped';

---

**User:**

[write_to_file for 'traceqa-debug/route-mapping-design.md'] Result:
The tool execution failed with the following error:
<error>
This appears to be a new file.
Note: Your response may have been truncated because it exceeded your output limit. You wrote 1400 lines of content, but the line_count parameter was either missing or not included in your response.

RECOMMENDED APPROACH:
1. Try again with the line_count parameter in your response if you forgot to include it
2. Or break your content into smaller chunks - first use write_to_file with the initial chunk
3. Then use insert_content to append additional chunks

# Reminder: Instructions for Tool Use

Tool uses are formatted using XML-style tags. The tool name itself becomes the XML tag name. Each parameter is enclosed within its own set of tags. Here's the structure:

<actual_tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</actual_tool_name>

For example, to use the attempt_completion tool:

<attempt_completion>
<result>
I have completed the task...
</result>
</attempt_completion>

Always use the actual tool name as the XML tag name for proper parsing and execution.
</error>
<environment_details>
# VSCode Visible Files
traceqa-debug\route-mapping-design.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,traceqa-debug/route-mapping-design.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:45:43.709Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.47

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Analyze current architecture and gather context from existing codebase | Completed |
| 2 | Design route mapping priority system with 6-level hierarchy | In Progress |
| 3 | Design IBM integration enhancement for route mapping objects | Pending |
| 4 | Design configuration schema extensions for route mappings and field inference | Pending |
| 5 | Design validation architecture for route discovery and validation separation | Pending |
| 6 | Design test status classification system (ready/uncertain/failed) | Pending |
| 7 | Design report classification categories and metrics | Pending |
| 8 | Design trace matrix mapping by acceptanceCriterionId | Pending |
| 9 | Create comprehensive design document with diagrams and specifications | Pending |
| 10 | Review design document with user for approval | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

I need to break this into smaller chunks. Let me create the design document in parts:

<write_to_file>
<path>traceqa-debug/route-mapping-design.md</path>
<content>
# TraceQA Route Mapping Priority System - Design Document

**Version:** 1.0  
**Date:** 2026-05-02  
**Author:** Bob  
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Route Mapping Priority System](#route-mapping-priority-system)
4. [IBM Integration Enhancement](#ibm-integration-enhancement)
5. [Configuration Schema Extensions](#configuration-schema-extensions)
6. [Validation Architecture](#validation-architecture)
7. [Test Status Classification](#test-status-classification)
8. [Report Classification System](#report-classification-system)
9. [Trace Matrix Mapping](#trace-matrix-mapping)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Interface Definitions](#interface-definitions)
12. [Decision Trees](#decision-trees)
13. [Error Handling Strategy](#error-handling-strategy)
14. [Backward Compatibility](#backward-compatibility)
15. [Migration Path](#migration-path)
16. [Implementation Phases](#implementation-phases)

---

## 1. Executive Summary

This design document specifies a comprehensive route-mapping priority system for TraceQA that addresses the key architectural improvements identified in the analysis:

**Key Improvements:**
- 6-level route mapping priority hierarchy (OpenAPI → Config → IBM → Validation → Fallback → Manual)
- IBM produces route mapping objects BEFORE test generation
- Extensible configuration schema for route mappings and field inference
- Clear separation between route discovery and validation
- Precise test status classification (ready/uncertain/failed)
- Accurate report metrics that don't conflate uncertain with failed tests
- Exact trace matrix mapping by acceptanceCriterionId

**Design Principles:**
- Backward compatible with existing implementations
- Optional enhancements (all new features are opt-in)
- Conservative approach (mark as uncertain when confidence is low)
- Clear separation of concerns
- Fail-safe defaults

---

## 2. Current Architecture Analysis

### 2.1 Current Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT TRACEQA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. Parse Acceptance Criteria
   ↓
2. Discover Routes (route-discovery.ts)
   ↓
3. Generate QA Task Plan (qa-task-plan-generator.ts)
   │  ├─ IBM suggests task types
   │  └─ Fallback: deterministic classification
   ↓
4. Generate HTTP Tests (http-test-generator.ts)
   │  ├─ Match routes using semantic matching (route-matcher.ts)
   │  ├─ IBM suggests test structure
   │  ├─ Generate bodies (body-generator.ts)
   │  └─ Determine test status (ready/uncertain/manual)
   ↓
5. Execute Tests (http-test-executor.ts)
   ↓
6. Generate Reports (report-generator.ts)
```

### 2.2 Current Issues

**Issue 1: No Explicit Route Mapping Override**
- Users cannot force specific AC → Route mappings
- Semantic matching may choose wrong route
- No way to override IBM's route selection

**Issue 2: IBM Doesn't Produce Route Mapping Object**
- IBM suggests routes within test generation
- No separate route mapping phase
- Cannot validate route selection before test generation

**Issue 3: Limited Configuration**
- No `routeMappings` in config
- No `fieldInferenceRules` customization
- Hardcoded patterns in body-generator.ts

**Issue 4: Unclear Test Status**
- "uncertain" tests mixed with "failed" tests in reports
- No clear distinction between "not executed" and "executed but failed"

**Issue 5: Trace Matrix Over-mapping**
- Tests may be attached to multiple ACs incorrectly
- No strict acceptanceCriterionId matching

---

## 3. Route Mapping Priority System

### 3.1 Six-Level Hierarchy

The route mapping system follows a strict priority order, with each level taking precedence over lower levels:

```
┌─────────────────────────────────────────────────────────────────┐
│              ROUTE MAPPING PRIORITY HIERARCHY                   │
└─────────────────────────────────────────────────────────────────┘

LEVEL 1: OpenAPI operationId/summary/schemas
         ├─ Source: OpenAPI specification
         ├─ Confidence: HIGH
         ├─ When: OpenAPI spec available with operationId
         └─ Example: operationId: "registerUser" → POST /api/users/register

LEVEL 2: Explicit Config Route Mappings
         ├─ Source: traceqa.config.json routeMappings
         ├─ Confidence: HIGH (user-defined)
         ├─ When: User explicitly maps AC → Route
         └─ Example: AC-1 → POST /api/auth/signup

LEVEL 3: IBM Route Mapping (from discovered routes)
         ├─ Source: IBM watsonx route mapping object
         ├─ Confidence: HIGH/MEDIUM/LOW (IBM-provided)
         ├─ When: IBM successfully maps AC to discovered route
         └─ Example: IBM selects POST /api/users from discovered routes

LEVEL 4: Structural Validation
         ├─ Source: Validation against discovered routes
         ├─ Confidence: MEDIUM
         ├─ When: IBM/fallback route exists in discovered routes
         └─ Example: Verify POST /api/users exists in discovered routes

LEVEL 5: Conservative Deterministic Fallback
         ├─ Source: Semantic pattern matching
         ├─ Confidence: LOW
         ├─ When: AC explicitly mentions method/path
         └─ Example: AC says "POST to /register" → POST /register

LEVEL 6: Mark as Uncertain/Manual
         ├─ Source: No safe mapping found
         ├─ Confidence: NONE
         ├─ When: No route can be safely mapped
         └─ Example: AC is vague, no routes discovered
```

### 3.2 Route Mapping Algorithm

```typescript
function mapRouteForAcceptanceCriterion(
  ac: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  openApiSpec?: OpenAPISpec,
  ibmRouteMapping?: IBMRouteMapping
): RouteMappingResult {
  
  // LEVEL 1: Check OpenAPI operationId/summary
  if (openApiSpec) {
    const openApiRoute = findRouteByOperationId(ac, openApiSpec);
    if (openApiRoute && routeExistsInDiscovered(openApiRoute, discoveredRoutes)) {
      return {
        route: openApiRoute,
        confidence: 'high',
        source: 'openapi',
        reasoning: `Mapped via OpenAPI operationId: ${openApiRoute.operationId}`
      };
    }
  }
  
  // LEVEL 2: Check explicit config mapping
  const configMapping = config.routeMappings?.find(
    m => m.acceptanceCriterionId === ac.id
  );
  if (configMapping) {
    const route = findRouteInDiscovered(configMapping.route, discoveredRoutes);
    if (route) {
      return {
        route,
        confidence: configMapping.confidence || 'high',
        source: 'config',
        reasoning: 'Explicit user-defined mapping in traceqa.config.json'
      };
    } else {
      return {
        route: null,
        confidence: 'none',
        source: 'config_error',
        reasoning: `Config mapping specifies ${configMapping.route.method} ${configMapping.route.path} but route not found in discovered routes`
      };
    }
  }
  
  // LEVEL 3: Use IBM route mapping (if available)
  if (ibmRouteMapping && ibmRouteMapping.selectedRoute) {
    const route = findRouteInDiscovered(ibmRouteMapping.selectedRoute, discoveredRoutes);
    if (route) {
      return {
        route,
        confidence: ibmRouteMapping.confidence,
        source: 'ibm',
        reasoning: ibmRouteMapping.reasoning,
        requiresSetup: ibmRouteMapping.requiresSetup,
        setupRoute: ibmRouteMapping.setupRoute
      };
    }
  }
  
  // LEVEL 4: Structural validation (implicit - all routes must pass)
  
  // LEVEL 5: Conservative deterministic fallback
  if (acExplicitlyMentionsRoute(ac)) {
    const fallbackRoute = semanticRouteMatch(ac, discoveredRoutes);
    if (fallbackRoute && fallbackRoute.confidence !== 'low') {
      return {
        route: fallbackRoute.route,
        confidence: 'low',
        source: 'semantic_fallback',
        reasoning: 'Fallback semantic matching based on AC keywords'
      };
    }
  }
  
  // LEVEL 6: Mark as uncertain
  return {
    route: null,
    confidence: 'none',
    source: 'uncertain',
    reasoning: 'No safe route mapping found. Manual review required.'
  };
}
```

---

## 4. IBM Integration Enhancement

### 4.1 New IBM Workflow

IBM now produces a **route mapping object** BEFORE test generation:

```
┌─────────────────────────────────────────────────────────────────┐
│                  NEW IBM INTEGRATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. Parse Acceptance Criteria
   ↓
2. Discover Routes
   ↓
3. IBM Route Mapping Phase (NEW)
   │  ├─ Input: AC + Discovered Routes
   │  ├─ Output: Route Mapping Object per AC
   │  └─ IBM chooses ONLY from discovered routes
   ↓
4. Validate Route Mappings
   │  └─ Structural validation against discovered routes
   ↓
5. Generate QA Task Plan
   │  └─ Uses validated route mappings
   ↓
6. Generate HTTP Tests
   │  └─ Uses validated route mappings
   ↓
7. Execute Tests
   ↓
8. Generate Reports
```

### 4.2 IBM Route Mapping Object

```typescript
interface IBMRouteMapping {
  /** Acceptance criterion ID this mapping is for */
  acceptanceCriterionId: string;
  
  /** Selected route from discovered routes (null if no fit) */
  selectedRoute: {
    method: string;
    path: string;
  } | null;
  
  /** Confidence in this mapping */
  confidence: 'high' | 'medium' | 'low';
  
  /** Reasoning for route selection */
  reasoning: string;
  
  /** Whether this test requires setup (e.g., login first) */
  requiresSetup: boolean;
  
  /** Setup route if required (e.g., POST /api/auth/login) */
  setupRoute?: {
    method: string;
    path: string;
  };
  
  /** Alternative routes considered */
  alternatives?: Array<{
    method: string;
    path: string;
    reason: string;
  }>;
}

interface IBMRouteMappingResponse {
  /** Route mappings for each AC */
  mappings: IBMRouteMapping[];
  
  /** Overall confidence in mappings */
  overallConfidence: 'high' | 'medium' | 'low';
  
  /** Warnings or concerns */
  warnings: string[];
}
```

---

## 5. Configuration Schema Extensions

### 5.1 Extended TraceQAProjectConfig

```typescript
interface TraceQAProjectConfig {
  // ... existing fields ...
  
  /**
   * Explicit route mappings for acceptance criteria
   * Takes precedence over IBM and semantic matching
   */
  routeMappings?: RouteMapping[];
  
  /**
   * Sample data for test scenarios
   * Organized by scenario type
   */
  sampleData?: SampleDataConfig;
  
  /**
   * Custom field inference rules for body generation
   * Allows domain-specific field generation
   */
  fieldInferenceRules?: FieldInferenceRule[];
  
  /**
   * Custom resource patterns for route matching
   * Extends default resource detection
   */
  customResourcePatterns?: ResourcePattern[];
  
  /**
   * Custom action patterns for route matching
   * Extends default action detection
   */
  customActionPatterns?: ActionPattern[];
}
```

### 5.2 Route Mapping Configuration

```typescript
interface RouteMapping {
  /** Acceptance criterion ID to map */
  acceptanceCriterionId: string;
  
  /** Target route */
  route: {
    method: string;
    path: string;
  };
  
  /** Confidence level (optional, defaults to 'high') */
  confidence?: 'high' | 'medium' | 'low';
  
  /** Optional reasoning for documentation */
  reasoning?: string;
  
  /** Whether this route requires setup */
  requiresSetup?: boolean;
  
  /** Setup route if required */
  setupRoute?: {
    method: string;
    path: string;
  };
}
```

### 5.3 Example Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "openapi": "./openapi.yaml",
  
  "routeMappings": [
    {
      "acceptanceCriterionId": "AC-1",
      "route": {
        "method": "POST",
        "path": "/api/auth/signup"
      },
      "confidence": "high",
      "reasoning": "User explicitly wants signup endpoint tested"
    },
    {
      "acceptanceCriterionId": "AC-5",
      "route": {
        "method": "GET",
        "path": "/api/users/profile"
      },
      "requiresSetup": true,
      "setupRoute": {
        "method": "POST",
        "path": "/api/auth/login"
      }
    }
  ],
  
  "sampleData": {
    "scenarios": {
      "valid_user": {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "firstName": "Test",
        "lastName": "User"
      },
      "invalid_email": {
        "email": "invalid-email",
        "password": "SecurePass123!"
      }
    }
  },
  
  "fieldInferenceRules": [
    {
      "fieldPattern": "email",
      "generator": "email",
      "template": "traceqa-{testId}@example.com",
      "scenarios": {
        "invalid_email": "not-an-email"
      }
    }
  ]
}
```

---

## 6. Validation Architecture

### 6.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDATION ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│ Route Discovery     │  Discovers routes from application
│ (route-discovery)   │  - Scans code/OpenAPI
└──────────┬──────────┘  - Returns DiscoveredRoute[]
           │
           ▼
┌─────────────────────┐
│ Route Mapping       │  Maps AC to routes using priority system
│ (route-mapper)      │  - Level 1-6 hierarchy
└──────────┬──────────┘  - Returns RouteMappingResult
           │
           ▼
┌─────────────────────┐
│ Structural          │  Validates route exists in discovered routes
│ Validation          │  - Method/path validation
└──────────┬──────────┘  - Returns structural errors
           │
           ▼
┌─────────────────────┐
│ Content Validation  │  Validates test content
│ (test-validator)    │  - URL format
└──────────┬──────────┘  - Body structure
           │             - Status codes
           ▼
┌─────────────────────┐
│ Confidence Scoring  │  Assigns confidence based on validation
│ (confidence-scorer) │  - High: All validations pass
└──────────┬──────────┘  - Medium: Some warnings
           │             - Low: Significant issues
           ▼
┌─────────────────────┐
│ Test Status         │  Determines if test is ready/uncertain
│ Classification      │  - ready: High/medium confidence
└─────────────────────┘  - uncertain: Low/no confidence
```

---

## 7. Test Status Classification

### 7.1 Status Definitions

```typescript
enum TestStatus {
  /** Test is ready to execute (high/medium confidence) */
  READY = 'ready',
  
  /** Test cannot be safely generated (low/no confidence) */
  UNCERTAIN = 'uncertain',
  
  /** Test requires manual execution */
  MANUAL = 'manual',
  
  /** Test was executed and passed */
  PASSED = 'passed',
  
  /** Test was executed and failed (application issue) */
  FAILED = 'failed',
  
  /** Test was skipped (dependency failed, etc.) */
  SKIPPED = 'skipped'
}
```

### 7.2 Status Classification Logic

```typescript
function determineTestStatus(
  routeMapping: RouteMappingResult,
  structuralValidation: StructuralValidationResult,
  contentValidation: ContentValidationResult,
  bodyGeneration: BodyGenerationResult,
  task: QATask
): {
  status: TestStatus;
  uncertainReason?: string;
} {
  
  // If task is marked as manual, status is manual
  if (task.executionMode === 'manual') {
    return {
      status: TestStatus.MANUAL,
      uncertainReason: task.uncertainReason
    };
  }
  
  // If no route mapping, status is uncertain
  if (!routeMapping.route) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: routeMapping.reasoning || 'No route mapping found'
    };
  }
  
  // If structural validation fails, status is uncertain
  if (!structuralValidation.valid) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Route validation failed: ${structuralValidation.errors.join(', ')}`
    };
  }
  
  // If content validation fails, status is uncertain
  if (!contentValidation.valid) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Content validation failed: ${contentValidation.errors.join(', ')}`
    };
  }
  
  // If body generation failed for POST/PUT/PATCH, status is uncertain
  const methodNeedsBody = ['POST', 'PUT', 'PATCH'].includes(routeMapping.route.method);
  if (methodNeedsBody && !bodyGeneration.body) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: 'Cannot generate request body for this endpoint'
    };
  }
  
  // If confidence is low, status is uncertain
  const confidence = calculateConfidence(routeMapping, structuralValidation, contentValidation);
  if (confidence === 'low' || confidence === 'none') {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Low confidence in test generation (${confidence})`
    };
  }
  
  // Otherwise, test is ready
  return {
    status: TestStatus.READY
  };
}
```

---

## 8. Report Classification System

### 8.1 Report Categories

```typescript
interface ReportCategories {
  /** Total tests generated */
  generated: number;
  
  /** Tests ready for execution */
  ready: number;
  
  /** Tests actually executed */
  executed: number;
  
  /** Tests that passed */
  passed: number;
  
  /** Tests that failed (application issue) */
  failed: number;
  
  /** Tests marked as uncertain (not executed) */
  uncertain: number;
  
  /** Tests requiring manual execution */
  manual: number;
  
  /** Tests skipped due to dependencies */
  skipped: number;
}
```

### 8.2 Classification Rules

**IMPORTANT:** Uncertain tests are NOT counted as failed tests. They represent tests that could not be safely generated, not tests that were executed and failed.

```
GENERATED: All tests created by TraceQA
READY: Tests with status = 'ready'
EXECUTED: Tests that were actually run
PASSED: Executed tests with passing result
FAILED: Executed tests with failing result (application issue)
UNCERTAIN: Tests that could not be safely generated (NOT executed)
MANUAL: Tests requiring human execution
SKIPPED: Tests not executed due to dependencies
```

---

## 9. Trace Matrix Mapping

### 9.1 Strict Mapping Rules

```
RULE 1: Map by exact acceptanceCriterionId ONLY
  ├─ Each test has acceptanceCriterionId field
  ├─ Match test.acceptanceCriterionId === ac.id
  └─ Do NOT attach tests to unrelated ACs

RULE 2: Support 1:N mapping
  ├─ One AC can have multiple tests
  ├─ Example: AC-1 → [Test-1, Test-2, Test-3]
  └─ All tests with same acceptanceCriterionId

RULE 3: Do NOT attach unrelated tests
  ├─ If test.acceptanceCriterionId !== ac.id, do NOT include
  ├─ Empty test list is valid (AC not covered)
  └─ Better to show gaps than false coverage
```

---

*[Document continues with remaining sections...]*
</content>
<line_count>700</line_count>
</write_to_file>

---

**User:**

[write_to_file for 'traceqa-debug/route-mapping-design.md'] Result:
<file_write_result>
<path>traceqa-debug/route-mapping-design.md</path>
<operation>created</operation>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<environment_details>
# VSCode Visible Files
traceqa-debug\route-mapping-design.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,traceqa-debug/route-mapping-design.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:46:56.575Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.61

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Analyze current architecture and gather context from existing codebase | Completed |
| 2 | Design route mapping priority system with 6-level hierarchy | In Progress |
| 3 | Design IBM integration enhancement for route mapping objects | Pending |
| 4 | Design configuration schema extensions for route mappings and field inference | Pending |
| 5 | Design validation architecture for route discovery and validation separation | Pending |
| 6 | Design test status classification system (ready/uncertain/failed) | Pending |
| 7 | Design report classification categories and metrics | Pending |
| 8 | Design trace matrix mapping by acceptanceCriterionId | Pending |
| 9 | Create comprehensive design document with diagrams and specifications | Pending |
| 10 | Review design document with user for approval | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

---

**Assistant:**

Now let me append the remaining sections to complete the design document:

<insert_content>
<path>traceqa-debug/route-mapping-design.md</path>
<line>700</line>
<content>

## 10. Data Flow Diagrams

### 10.1 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           COMPLETE TRACEQA ROUTE MAPPING FLOW                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ 1. Parse AC          │
│ acceptance.md        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Discover Routes   │
│ - Scan code          │
│ - Parse OpenAPI      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Route Mapping     │
│ Priority System      │
│ (Levels 1-6)         │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────┐
│OpenAPI │   │ Config │
│Level 1 │   │Level 2 │
└────┬───┘   └────┬───┘
     │            │
     └─────┬──────┘
           │
           ▼
┌──────────────────────┐
│ 4. IBM Route Mapping │
│ (Level 3)            │
│ - AC + Routes → IBM  │
│ - IBM returns        │
│   mapping object     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. Structural        │
│ Validation (Level 4) │
│ - Route exists?      │
│ - Method valid?      │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │ Valid?      │
    └──────┬──────┘
           │
    ┌──────┴──────┐
    │ NO          │ YES
    ▼             ▼
┌────────┐   ┌────────┐
│Fallback│   │Continue│
│Level 5 │   │        │
└────┬───┘   └────┬───┘
     │            │
     └─────┬──────┘
           │
           ▼
┌──────────────────────┐
│ 6. Generate QA Tasks │
│ - Use route mappings │
│ - Classify tasks     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 7. Generate Tests    │
│ - Use route mappings │
│ - Generate bodies    │
│ - Determine status   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 8. Execute Tests     │
│ - Only 'ready' tests │
│ - Skip 'uncertain'   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 9. Generate Report   │
│ - Classify results   │
│ - Build trace matrix │
│ - Calculate metrics  │
└──────────────────────┘
```

### 10.2 Route Mapping Decision Flow

```
                    ┌─────────────────────┐
                    │  Acceptance         │
                    │  Criterion (AC)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ OpenAPI spec        │
                    │ available?          │
                    └──────┬──────────────┘
                           │
                ┌──────────┴──────────┐
                │ YES                 │ NO
                ▼                     ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │ Find operationId    │   │ Check config        │
    │ matching AC         │   │ routeMappings       │
    └──────┬──────────────┘   └──────┬──────────────┘
           │                          │
    ┌──────┴──────┐          ┌────────┴────────┐
    │ Found?      │          │ Mapping exists? │
    └──────┬──────┘          └────────┬────────┘
           │                          │
    ┌──────┴──────┐          ┌────────┴────────┐
    │ YES         │ NO       │ YES             │ NO
    ▼             ▼          ▼                 ▼
┌────────┐   ┌────────┐  ┌────────┐      ┌────────┐
│ Level 1│   │ Level 2│  │ Level 2│      │ Level 3│
│ OpenAPI│   │ Config │  │ Config │      │  IBM   │
└────┬───┘   └────┬───┘  └────┬───┘      └────┬───┘
     │            │           │                │
     │            │           │         ┌──────┴──────┐
     │            │           │         │ IBM mapping │
     │            │           │         │ available?  │
     │            │           │         └──────┬──────┘
     │            │           │                │
     │            │           │         ┌──────┴──────┐
     │            │           │         │ YES         │ NO
     │            │           │         ▼             ▼
     │            │           │    ┌────────┐    ┌────────┐
     │            │           │    │ Level 3│    │ Level 5│
     │            │           │    │  IBM   │    │Fallback│
     │            │           │    └────┬───┘    └────┬───┘
     │            │           │         │             │
     └────────────┴───────────┴─────────┴─────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Level 4: Structural │
                   │ Validation          │
                   └──────────┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │ Route exists in     │
                   │ discovered routes?  │
                   └──────────┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │ YES                 │ NO
                   ▼                     ▼
            ┌─────────────┐      ┌─────────────┐
            │ MAPPED      │      │ Level 6:    │
            │ (ready)     │      │ UNCERTAIN   │
            └─────────────┘      └─────────────┘
```

---

## 11. Interface Definitions

### 11.1 Core Interfaces

```typescript
// Route Mapping Result
interface RouteMappingResult {
  route: DiscoveredRoute | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'openapi' | 'config' | 'ibm' | 'semantic_fallback' | 'uncertain' | 'config_error';
  reasoning: string;
  requiresSetup?: boolean;
  setupRoute?: {
    method: string;
    path: string;
  };
}

// Structural Validation Result
interface StructuralValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    routeExists: boolean;
    methodValid: boolean;
    pathValid: boolean;
    parametersValid: boolean;
  };
}

// Content Validation Result
interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    urlValid: boolean;
    bodyValid: boolean;
    statusesValid: boolean;
    headersValid: boolean;
  };
}

// Test Status Result
interface TestStatusResult {
  status: 'ready' | 'uncertain' | 'manual' | 'passed' | 'failed' | 'skipped';
  uncertainReason?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
}
```

### 11.2 Configuration Interfaces

```typescript
// Field Inference Rule
interface FieldInferenceRule {
  fieldPattern: string;
  generator: 'email' | 'password' | 'phone' | 'uuid' | 'timestamp' | 'custom';
  template?: string;
  scenarios?: {
    [scenarioName: string]: any;
  };
  priority?: number;
}

// Sample Data Config
interface SampleDataConfig {
  scenarios: {
    [scenarioName: string]: {
      [fieldName: string]: any;
    };
  };
  defaults?: {
    [fieldName: string]: any;
  };
}

// Resource Pattern
interface ResourcePattern {
  name: string;
  pattern: string;
  priority?: number;
}

// Action Pattern
interface ActionPattern {
  action: string;
  pattern: string;
  httpMethods: string[];
  priority?: number;
}
```

### 11.3 Report Interfaces

```typescript
// Report Summary
interface ReportSummary {
  timestamp: string;
  projectName: string;
  
  acceptanceCriteria: {
    total: number;
    covered: number;
    uncovered: number;
  };
  
  qaTasks: {
    total: number;
    automated: number;
    manual: number;
    uncertain: number;
  };
  
  generatedTests: {
    total: number;
    ready: number;
    uncertain: number;
    manual: number;
  };
  
  executionResults: {
    total: number;
    executed: number;
    passed: number;
    failed: number;
    uncertain: number;
    manual: number;
    skipped: number;
  };
  
  classifications: {
    passed: number;
    application_failure: number;
    traceqa_generation_issue: number;
    uncertain: number;
    manual: number;
  };
  
  mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  riskLevel: 'low' | 'medium' | 'high';
}

// Trace Matrix Entry
interface TraceMatrixEntry {
  acceptanceCriterionId: string;
  acceptanceCriterionText: string;
  acceptanceCriterionPriority: string;
  
  qaTasks: Array<{
    taskId: string;
    title: string;
    type: string;
    executionMode: string;
    reasoning: string;
  }>;
  
  generatedTests: Array<{
    testId: string;
    title: string;
    status: 'ready' | 'uncertain' | 'manual';
    uncertainReason?: string;
    routeMapping?: {
      method: string;
      path: string;
      source: string;
      confidence: string;
    };
  }>;
  
  executionResults: Array<{
    testId: string;
    status: 'passed' | 'failed' | 'skipped';
    classification: string;
    executor: string;
    duration: number;
    evidence?: string;
  }>;
  
  coverage: {
    tasksGenerated: number;
    testsGenerated: number;
    testsExecuted: number;
    testsPassed: number;
    testsFailed: number;
  };
}
```

---

## 12. Decision Trees

### 12.1 Test Status Decision Tree

```
                    ┌─────────────────────┐
                    │  Generated Test     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Task execution mode │
                    │ = 'manual'?         │
                    └──────┬──────────────┘
                           │
                    ┌──────┴──────┐
                    │ YES         │ NO
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │ MANUAL      │  │ Route mapped?│
            └─────────────┘  └──────┬───────┘
                                    │
                             ┌──────┴──────┐
                             │ YES         │ NO
                             ▼             ▼
                    ┌─────────────┐  ┌─────────────┐
                    │ Structural  │  │ UNCERTAIN   │
                    │ valid?      │  │ (no route)  │
                    └──────┬──────┘  └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ YES         │ NO
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │ Content     │  │ UNCERTAIN   │
            │ valid?      │  │ (invalid)   │
            └──────┬──────┘  └─────────────┘
                   │
            ┌──────┴──────┐
            │ YES         │ NO
            ▼             ▼
    ┌─────────────┐  ┌─────────────┐
    │ Body needed?│  │ UNCERTAIN   │
    └──────┬──────┘  │ (invalid)   │
           │         └─────────────┘
    ┌──────┴──────┐
    │ YES         │ NO
    ▼             ▼
┌────────┐   ┌────────┐
│ Body   │   │Confidence│
│ valid? │   │ check   │
└────┬───┘   └────┬───┘
     │            │
┌────┴────┐  ┌────┴────┐
│YES  │NO │  │high/med │low/none
▼     ▼   │  ▼         ▼
┌────┐┌───┐│┌────┐  ┌────────┐
│Conf││UNC│││READY│  │UNCERTAIN│
│chk ││ERT││└────┘  └────────┘
└─┬──┘└───┘│
  │        │
  ▼        │
┌────┐     │
│READY│    │
└────┘     │
```

### 12.2 Report Classification Decision Tree

```
                    ┌─────────────────────┐
                    │  Test Result        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Was test executed?  │
                    └──────┬──────────────┘
                           │
                    ┌──────┴──────┐
                    │ YES         │ NO
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │ Status?     │  │ Status?     │
            └──────┬──────┘  └──────┬──────┘
                   │                │
        ┌──────────┼──────┐  ┌──────┴──────┐
        │          │      │  │             │
        ▼          ▼      ▼  ▼             ▼
    ┌──────┐  ┌──────┐ ┌──┐┌────────┐ ┌──────┐
    │PASSED│  │FAILED│ │SK││UNCERTAIN│ │MANUAL│
    └──────┘  └──────┘ │IP││         │ └──────┘
                       │PE││         │
                       │D │└────────┘
                       └──┘
                       
CLASSIFICATION:
- PASSED → classifications.passed++
- FAILED → classifications.application_failure++
- SKIPPED → executionResults.skipped++
- UNCERTAIN → classifications.uncertain++ (NOT failed!)
- MANUAL → classifications.manual++
```

---

## 13. Error Handling Strategy

### 13.1 Error Categories

```typescript
enum RouteMappi ngErrorCategory {
  /** OpenAPI spec parsing failed */
  OPENAPI_PARSE_ERROR = 'openapi_parse_error',
  
  /** Config route mapping references non-existent route */
  CONFIG_ROUTE_NOT_FOUND = 'config_route_not_found',
  
  /** IBM route mapping failed or returned invalid data */
  IBM_MAPPING_ERROR = 'ibm_mapping_error',
  
  /** IBM selected route not in discovered routes */
  IBM_ROUTE_NOT_FOUND = 'ibm_route_not_found',
  
  /** Structural validation failed */
  STRUCTURAL_VALIDATION_ERROR = 'structural_validation_error',
  
  /** Content validation failed */
  CONTENT_VALIDATION_ERROR = 'content_validation_error',
  
  /** No safe route mapping found */
  NO_SAFE_MAPPING = 'no_safe_mapping',
}
```

### 13.2 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ERROR HANDLING STRATEGY                            │
└─────────────────────────────────────────────────────────────────┘

1. OpenAPI Parse Error
   ├─ Log warning
   ├─ Continue without OpenAPI (Level 1 skipped)
   └─ Proceed to Level 2 (Config)

2. Config Route Not Found
   ├─ Log error with AC ID
   ├─ Mark test as UNCERTAIN
   ├─ Reason: "Config specifies route X but not found"
   └─ Do NOT proceed to IBM (user intent was explicit)

3. IBM Mapping Error
   ├─ Log warning
   ├─ Continue without IBM (Level 3 skipped)
   └─ Proceed to Level 5 (Fallback)

4. IBM Route Not Found
   ├─ Log warning
   ├─ Ignore IBM suggestion
   └─ Proceed to Level 5 (Fallback)

5. Structural Validation Error
   ├─ Log error with details
   ├─ Mark test as UNCERTAIN
   └─ Reason: "Route validation failed: [errors]"

6. Content Validation Error
   ├─ Log error with details
   ├─ Mark test as UNCERTAIN
   └─ Reason: "Content validation failed: [errors]"

7. No Safe Mapping
   ├─ Log info (not an error)
   ├─ Mark test as UNCERTAIN
   └─ Reason: "No safe route mapping found"
```

### 13.3 Graceful Degradation

```typescript
function handleRouteMappingError(
  error: RouteMappi ngErrorCategory,
  context: {
    ac: AcceptanceCriterion;
    level: number;
    details: string;
  }
): RouteMappingResult {
  
  logger.warn(
    `Route mapping error at Level ${context.level} for AC ${context.ac.id}: ${error}`,
    context.details
  );
  
  // Determine if we should try next level or mark as uncertain
  const shouldContinue = [
    RouteMappi ngErrorCategory.OPENAPI_PARSE_ERROR,
    RouteMappi ngErrorCategory.IBM_MAPPING_ERROR,
    RouteMappi ngErrorCategory.IBM_ROUTE_NOT_FOUND,
  ].includes(error);
  
  if (shouldContinue) {
    // Continue to next level
    return {
      route: null,
      confidence: 'none',
      source: 'uncertain',
      reasoning: `Level ${context.level} failed, trying next level`,
      continueToNextLevel: true
    };
  } else {
    // Mark as uncertain
    return {
      route: null,
      confidence: 'none',
      source: 'uncertain',
      reasoning: context.details,
      continueToNextLevel: false
    };
  }
}
```

---

## 14. Backward Compatibility

### 14.1 Compatibility Guarantees

```
┌─────────────────────────────────────────────────────────────────┐
│              BACKWARD COMPATIBILITY GUARANTEES                  │
└─────────────────────────────────────────────────────────────────┘

1. All new config fields are OPTIONAL
   ├─ routeMappings?: RouteMapping[]
   ├─ sampleData?: SampleDataConfig
   ├─ fieldInferenceRules?: FieldInferenceRule[]
   ├─ customResourcePatterns?: ResourcePattern[]
   └─ customActionPatterns?: ActionPattern[]

2. Existing behavior preserved when new fields absent
   ├─ No routeMappings → Skip Level 2
   ├─ No fieldInferenceRules → Use default inference
   └─ No custom patterns → Use default patterns

3. Existing test status values unchanged
   ├─ 'ready' → still means ready to execute
   ├─ 'uncertain' → still means cannot safely generate
   └─ 'manual' → still means requires human execution

4. Report structure extended, not changed
   ├─ Existing fields remain
   ├─ New fields added
   └─ Old reports still valid

5. API signatures extended with optional parameters
   ├─ New parameters added at end
   ├─ All new parameters optional
   └─ Existing calls still work
```

### 14.2 Migration Strategy

```typescript
// Old code (still works)
const result = await generateHTTPTests(
  taskPlan,
  discoveredRoutes,
  config,
  projectContext
);

// New code (with route mappings)
const routeMappings = await generateRouteMappings(
  acceptanceCriteria,
  discoveredRoutes,
  config,
  openApiSpec
);

const result = await generateHTTPTests(
  taskPlan,
  discoveredRoutes,
  config,
  projectContext,
  routeMappings  // Optional parameter
);
```

---

## 15. Migration Path

### 15.1 Phase 1: Add Configuration Support

**Goal:** Enable new config fields without changing behavior

**Changes:**
1. Extend [`TraceQAProjectConfig`](src/config/config-loader.ts:13) interface
2. Update [`config-loader.ts`](src/config/config-loader.ts:66) to parse new fields
3. Add validation for new config fields
4. No behavior changes yet

**Testing:**
- Verify old configs still work
- Verify new config fields are parsed
- Verify validation catches errors

### 15.2 Phase 2: Implement Route Mapping Priority

**Goal:** Implement 6-level route mapping hierarchy

**Changes:**
1. Create new `route-mapper.ts` module
2. Implement [`mapRouteForAcceptanceCriterion()`](src/validation/route-matcher.ts:233) function
3. Add Level 1 (OpenAPI) support
4. Add Level 2 (Config) support
5. Integrate with existing Level 3 (IBM)
6. Add Level 4 (Structural validation)
7. Add Level 5 (Fallback)
8. Add Level 6 (Uncertain)

**Testing:**
- Test each level independently
- Test level priority order
- Test fallback behavior

### 15.3 Phase 3: Enhance IBM Integration

**Goal:** IBM produces route mapping objects

**Changes:**
1. Create [`buildIBMRouteMappingPrompt()`](src/generators/qa-task-plan-generator.ts:91) function
2. Add IBM route mapping API call
3. Implement [`validateIBMRouteMapping()`](src/generators/qa-task-plan-generator.ts:195) function
4. Update test generation to use route mappings

**Testing:**
- Test IBM route mapping generation
- Test validation logic
- Test integration with test generation

### 15.4 Phase 4: Refactor Body Generation

**Goal:** Make field inference configurable

**Changes:**
1. Extract hardcoded patterns from [`body-generator.ts`](src/validation/body-generator.ts:1)
2. Implement configurable field inference
3. Add sample data support
4. Maintain fallback to defaults

**Testing:**
- Test custom field inference rules
- Test sample data scenarios
- Test fallback behavior

### 15.5 Phase 5: Update Reporting

**Goal:** Accurate test classification and trace matrix

**Changes:**
1. Update [`report-generator.ts`](src/reporting/report-generator.ts:1) classification logic
2. Separate uncertain from failed tests
3. Implement strict trace matrix mapping
4. Add new report metrics

**Testing:**
- Test report classification
- Test trace matrix mapping
- Test merge readiness calculation

---

## 16. Implementation Phases

### 16.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              IMPLEMENTATION PHASES                              │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Configuration Support (1-2 days)
├─ Add new config fields
├─ Update config loader
├─ Add validation
└─ No behavior changes

Phase 2: Route Mapping Priority (3-4 days)
├─ Implement 6-level hierarchy
├─ Create route-mapper module
├─ Integrate with existing code
└─ Add comprehensive tests

Phase 3: IBM Enhancement (2-3 days)
├─ Create route mapping prompt
├─ Add IBM API integration
├─ Implement validation
└─ Update test generation

Phase 4: Body Generation Refactor (2-3 days)
├─ Extract hardcoded patterns
├─ Implement configurable inference
├─ Add sample data support
└─ Maintain backward compatibility

Phase 5: Reporting Updates (1-2 days)
├─ Update classification logic
├─ Fix trace matrix mapping
├─ Add new metrics
└─ Update report format

Total Estimated Time: 9-14 days
```

### 16.2 Success Criteria

**Phase 1:**
- [ ] New config fields parsed correctly
- [ ] Old configs still work
- [ ] Validation catches errors
- [ ] No behavior changes

**Phase 2:**
- [ ] All 6 levels implemented
- [ ] Priority order respected
- [ ] Fallback works correctly
- [ ] Tests pass

**Phase 3:**
- [ ] IBM produces route mappings
- [ ] Validation works correctly
- [ ] Integration with test generation
- [ ] Tests pass

**Phase 4:**
- [ ] Field inference configurable
- [ ] Sample data works
- [ ] Fallback to defaults
- [ ] Tests pass

**Phase 5:**
- [ ] Uncertain ≠ Failed
- [ ] Trace matrix accurate
- [ ] New metrics correct
- [ ] Tests pass

---

## 17. Conclusion

This design document provides a comprehensive specification for implementing a route-mapping priority system in TraceQA. The design addresses all identified issues while maintaining backward compatibility and following best practices.

**Key Benefits:**
1. **User Control:** Explicit route mappings via config
2. **AI Enhancement:** IBM produces validated route mappings
3. **Flexibility:** Configurable field inference and patterns
4. **Accuracy:** Clear test status classification
5. **Transparency:** Accurate reporting and trace matrix

**Next Steps:**
1. Review this design document
2. Gather feedback and make adjustments
3. Begin Phase 1 implementation
4. Iterate through remaining phases
5. Deploy and monitor

---

**Document Status:** Ready for Review  
**Approval Required:** Yes  
**Implementation Start:** Pending Approval

</content>
</insert_content>

---

**User:**

[insert_content for 'traceqa-debug/route-mapping-design.md'] Result:
<file_write_result>
<path>traceqa-debug/route-mapping-design.md</path>
<operation>modified</operation>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<environment_details>
# VSCode Visible Files
traceqa-debug\route-mapping-design.md

# VSCode Open Tabs
.env,REFACTORING_PLAN.md,src/validation/route-matcher.ts,test-body-generator.ts,src/generators/qa-task-plan-generator.ts,test-qa-task-plan-generator.ts,src/generators/http-test-generator.ts,src/testing/http-test-executor.ts,src/testing/index.ts,src/generators/artifact-writer.ts,src/cli/index.ts,src/reporting/report-generator.ts,src/testing/test-coordinator.ts,src/reporting/index.ts,traceqa-debug/architecture-analysis.md,traceqa-debug/route-mapping-design.md,src/validation/body-generator.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T02:48:29.087Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.78

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>plan</slug>
<name>📝 Plan</name>
====

REMINDERS

Below is your current list of reminders for this task. Keep them updated as you progress.

| # | Content | Status |
|---|---------|--------|
| 1 | Analyze current architecture and gather context from existing codebase | Completed |
| 2 | Design route mapping priority system with 6-level hierarchy | In Progress |
| 3 | Design IBM integration enhancement for route mapping objects | Pending |
| 4 | Design configuration schema extensions for route mappings and field inference | Pending |
| 5 | Design validation architecture for route discovery and validation separation | Pending |
| 6 | Design test status classification system (ready/uncertain/failed) | Pending |
| 7 | Design report classification categories and metrics | Pending |
| 8 | Design trace matrix mapping by acceptanceCriterionId | Pending |
| 9 | Create comprehensive design document with diagrams and specifications | Pending |
| 10 | Review design document with user for approval | Pending |


IMPORTANT: When task status changes, remember to call the `update_todo_list` tool to update your progress.

</environment_details>

