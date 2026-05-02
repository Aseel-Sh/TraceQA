/**
 * HTTP Test Generator
 * 
 * Generates executable HTTP tests from QA tasks with proper validation,
 * normalization, and multi-step support. Integrates with IBM watsonx.ai
 * for intelligent test generation with robust fallback logic.
 * 
 * @module http-test-generator
 */

import type {
  QATask,
  QATaskPlan,
  AcceptanceCriterion,
  DiscoveredRoute,
  TraceQAConfig,
  GeneratedHTTPTest,
  GeneratedHTTPTestSuite,
  HTTPTestStep,
} from '../types/index.js';
import { WatsonxClient } from '../agent/watsonx-client.js';
import {
  matchRouteToTask,
  validateAndNormalizeHTTPStep,
  detectMultiStepRequirement,
  type RouteMatchResult,
} from '../validation/route-matcher.js';
import {
  generateRequestBody,
  generateStatefulBody,
  type BodyGenerationResult,
  type TestDataContext,
} from '../validation/body-generator.js';
import { assessTestDataConfidence } from '../validation/test-data-inference.js';
import { logger } from '../utils/logger.js';
import { safeExtractJSON } from '../utils/json-extractor.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Result of HTTP test generation
 */
export interface HTTPTestGenerationResult {
  testSuite: GeneratedHTTPTestSuite;
  warnings: string[];
  ibmUsed: boolean;
  normalizationApplied: boolean;
}

/**
 * Project context for test generation
 */
export interface ProjectContext {
  baseUrl: string;
  projectType?: string;
  language?: string;
  openApiSpec?: any;
  routeSources?: string[];
}

interface IBMGeneratedHTTPTestResponse {
  tests: Array<{
    id?: string;
    acceptanceCriterionId?: string;
    title?: string;
    reasoning?: string;
    confidence?: number;
    executionMode?: 'automated' | 'manual' | 'uncertain';
    uncertainReason?: string | null;
    steps?: Array<{
      stepId?: string;
      description?: string;
      method?: string;
      path?: string;
      url?: unknown;
      headers?: Record<string, string>;
      body?: unknown;
      expectedStatus?: unknown;
      acceptableStatuses?: unknown;
      expectedBodyContains?: unknown;
    }>;
  }>;
}

interface RouteMatchHint {
  matched: boolean;
  route?: DiscoveredRoute;
}

function isAllowedMethod(method: unknown): method is HTTPTestStep['method'] {
  return typeof method === 'string' && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function normalizeStepUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
}

function pathMatchesDiscoveredRoute(routePath: string, requestPath: string): boolean {
  if (routePath === requestPath) {
    return true;
  }

  const routeParts = routePath.split('/');
  const requestParts = requestPath.split('/');
  if (routeParts.length !== requestParts.length) {
    return false;
  }

  for (let index = 0; index < routeParts.length; index++) {
    const routePart = routeParts[index];
    const requestPart = requestParts[index];

    if (routePart.startsWith(':') || routePart.startsWith('{')) {
      continue;
    }

    if (routePart !== requestPart) {
      return false;
    }
  }

  return true;
}

function findRouteHint(stepPath: string, method: string, discoveredRoutes: DiscoveredRoute[]): RouteMatchHint {
  const normalizedStepPath = stepPath.split('?')[0];
  const route = discoveredRoutes.find(candidate =>
    candidate.method.toUpperCase() === method.toUpperCase() &&
    pathMatchesDiscoveredRoute(candidate.path, normalizedStepPath)
  );

  return {
    matched: !!route,
    route,
  };
}

function buildOpenApiSummary(openApiSpec: any): string {
  if (!openApiSpec || typeof openApiSpec !== 'object') {
    return 'None';
  }

  const paths = openApiSpec.paths && typeof openApiSpec.paths === 'object' ? openApiSpec.paths : {};
  const routeCount = Object.keys(paths).length;
  const sample = Object.entries(paths).slice(0, 10).map(([routePath, methods]) => {
    const methodList = Object.keys(methods as Record<string, unknown>).join(', ');
    return `- ${routePath}: ${methodList}`;
  });

  return [`Routes: ${routeCount}`, ...sample].join('\n');
}

function inferExpectedStatuses(method: string): number[] {
  switch (method.toUpperCase()) {
    case 'GET':
      return [200];
    case 'POST':
      return [200, 201];
    case 'PUT':
    case 'PATCH':
      return [200, 204];
    case 'DELETE':
      return [200, 204];
    default:
      return [200];
  }
}

function createUncertainTest(options: {
  task: QATask;
  acceptanceCriterion: AcceptanceCriterion;
  reason: string;
}): GeneratedHTTPTest {
  return {
    id: `TC-${options.task.taskId.replace('QA-', '')}`,
    qaTaskId: options.task.taskId,
    acceptanceCriterionId: options.acceptanceCriterion.id,
    title: options.task.title,
    type: 'api',
    status: 'uncertain',
    uncertainReason: options.reason,
    steps: [],
  };
}

function normalizeGeneratedTest(
  rawTest: any,
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  baseUrl: string
): GeneratedHTTPTest | null {
  const warnings: string[] = [];

  if (!rawTest || typeof rawTest !== 'object') {
    return null;
  }

  // Enforce acceptanceCriterionId to equal the task's acceptance criterion
  const rawAcId = typeof rawTest.acceptanceCriterionId === 'string' ? rawTest.acceptanceCriterionId : undefined;
  const acceptanceCriterionId = acceptanceCriterion.id;
  if (rawAcId && rawAcId !== acceptanceCriterionId) {
    // Do not silently accept wrong AC IDs — mark uncertain and explain mapping mismatch
    return {
      id: typeof rawTest.id === 'string' && rawTest.id.trim().length > 0 ? rawTest.id : `TC-${task.taskId.replace('QA-', '')}`,
      qaTaskId: task.taskId,
      acceptanceCriterionId,
      title: typeof rawTest.title === 'string' && rawTest.title.trim().length > 0 ? rawTest.title.trim() : task.title,
      type: 'api',
      status: 'uncertain',
      uncertainReason: `Acceptance criterion mapping mismatch: IBM returned ${rawAcId} but task expects ${acceptanceCriterionId}`,
      steps: [],
      reasoning: typeof rawTest.reasoning === 'string' ? rawTest.reasoning : task.reasoning,
      confidence: typeof rawTest.confidence === 'number' ? rawTest.confidence : 0,
      executionMode: (rawTest.executionMode as any) || 'uncertain'
    } as GeneratedHTTPTest;
  }

  const confidence = typeof rawTest.confidence === 'number' ? rawTest.confidence : 0;
  const executionMode = rawTest.executionMode;
  const uncertainReason = typeof rawTest.uncertainReason === 'string' ? rawTest.uncertainReason : null;
  const title = typeof rawTest.title === 'string' && rawTest.title.trim().length > 0
    ? rawTest.title.trim()
    : task.title;
  const reasoning = typeof rawTest.reasoning === 'string' ? rawTest.reasoning : task.reasoning;

  if (!Array.isArray(rawTest.steps) || rawTest.steps.length === 0) {
    return {
      id: typeof rawTest.id === 'string' && rawTest.id.trim().length > 0 ? rawTest.id : `TC-${task.taskId.replace('QA-', '')}`,
      qaTaskId: task.taskId,
      acceptanceCriterionId,
      title,
      type: 'api',
      status: 'uncertain',
      uncertainReason: uncertainReason || 'IBM response did not contain executable steps.',
      steps: [],
      reasoning,
      confidence,
      executionMode: 'uncertain',
    } as GeneratedHTTPTest;
  }

  if (discoveredRoutes.length === 0) {
    return createUncertainTest({
      task,
      acceptanceCriterion,
      reason: 'No discovered routes were available to validate this test.',
    });
  }

  const normalizedSteps: HTTPTestStep[] = [];

  for (let index = 0; index < rawTest.steps.length; index++) {
    const rawStep = rawTest.steps[index];
    const stepNumber = index + 1;

    if (!rawStep || typeof rawStep !== 'object') {
      return null;
    }

    if (!isAllowedMethod(rawStep.method)) {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} has invalid HTTP method.`,
      });
    }

    const method = rawStep.method.toUpperCase() as HTTPTestStep['method'];

    let stepPath = '';
    if (typeof rawStep.path === 'string' && rawStep.path.trim().length > 0) {
      stepPath = rawStep.path.trim();
    } else if (typeof rawStep.url === 'string' && rawStep.url.trim().length > 0) {
      const urlValue = rawStep.url.trim();
      if (urlValue.startsWith('{') || urlValue.startsWith('[')) {
        return createUncertainTest({
          task,
          acceptanceCriterion,
          reason: `Step ${stepNumber} has an invalid URL object/stringified object.`,
        });
      }

      if (!(urlValue.startsWith('http://') || urlValue.startsWith('https://') || urlValue.startsWith('/'))) {
        return createUncertainTest({
          task,
          acceptanceCriterion,
          reason: `Step ${stepNumber} has an invalid URL format.`,
        });
      }

      stepPath = urlValue.startsWith('http://') || urlValue.startsWith('https://')
        ? new URL(urlValue).pathname
        : urlValue;
    } else {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} is missing a path or URL.`,
      });
    }

    const routeHint = findRouteHint(stepPath, method, discoveredRoutes);
    if (discoveredRoutes.length > 0 && !routeHint.matched) {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} does not match any discovered route.`,
      });
    }

    const body = rawStep.body === undefined || rawStep.body === null ? null : rawStep.body;
    if (['POST', 'PUT', 'PATCH'].includes(method) && body !== null && (typeof body !== 'object' || Array.isArray(body))) {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} must use an object request body.`,
      });
    }

    const expectedStatus = typeof rawStep.expectedStatus === 'number' ? rawStep.expectedStatus : undefined;
    if (typeof expectedStatus !== 'number') {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} is missing a numeric expectedStatus.`,
      });
    }

    const acceptableStatuses = Array.isArray(rawStep.acceptableStatuses)
      ? rawStep.acceptableStatuses.filter((value: unknown) => typeof value === 'number') as number[]
      : inferExpectedStatuses(method);

    const url = typeof rawStep.url === 'string' && (rawStep.url.startsWith('http://') || rawStep.url.startsWith('https://'))
      ? rawStep.url
      : normalizeStepUrl(stepPath, baseUrl);

    normalizedSteps.push({
      stepId: typeof rawStep.stepId === 'string' && rawStep.stepId.trim().length > 0
        ? rawStep.stepId
        : `${task.taskId}-S${stepNumber}`,
      description: typeof rawStep.description === 'string' && rawStep.description.trim().length > 0
        ? rawStep.description
        : `${task.title} step ${stepNumber}`,
      method,
      url,
      headers: rawStep.headers && typeof rawStep.headers === 'object'
        ? rawStep.headers
        : { 'Content-Type': 'application/json' },
      body: body as Record<string, any> | null,
      expectedStatus,
      acceptableStatuses,
      expectedBodyContains: Array.isArray(rawStep.expectedBodyContains)
        ? rawStep.expectedBodyContains.filter((value: unknown) => typeof value === 'string')
        : [],
    });
  }

  const isAutomated = executionMode === 'automated' && confidence >= 0.7 && warnings.length === 0;

  return {
    id: typeof rawTest.id === 'string' && rawTest.id.trim().length > 0 ? rawTest.id : `TC-${task.taskId.replace('QA-', '')}`,
    qaTaskId: task.taskId,
    acceptanceCriterionId,
    title,
    type: 'api',
    status: isAutomated ? 'ready' : 'uncertain',
    uncertainReason: isAutomated ? null : (uncertainReason || 'IBM output did not meet executable-test validation requirements.'),
    steps: normalizedSteps,
    reasoning,
    confidence,
    executionMode: executionMode || 'uncertain',
  } as GeneratedHTTPTest;
}

/**
 * Generate HTTP tests from QA task plan
 * 
 * Main entry point for HTTP test generation. Takes a QA task plan and
 * generates executable HTTP tests with proper validation and normalization.
 * 
 * @param taskPlan - QA task plan containing tasks to generate tests for
 * @param discoveredRoutes - Routes discovered from the application
 * @param config - TraceQA configuration
 * @param projectContext - Project context with base URL and optional OpenAPI spec
 * @returns HTTP test generation result with test suite and metadata
 * 
 * @example
 * ```typescript
 * const result = await generateHTTPTests(
 *   taskPlan,
 *   discoveredRoutes,
 *   config,
 *   { baseUrl: 'http://localhost:3000' }
 * );
 * 
 * console.log(`Generated ${result.testSuite.tests.length} tests`);
 * console.log(`IBM used: ${result.ibmUsed}`);
 * ```
 */
export async function generateHTTPTests(
  taskPlan: QATaskPlan,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  projectContext: ProjectContext
): Promise<HTTPTestGenerationResult> {
  logger.info('Generating HTTP tests from QA task plan...');
  
  const warnings: string[] = [];
  let ibmUsed = false;
  let normalizationApplied = false;
  const tests: GeneratedHTTPTest[] = [];

  // Initialize IBM client if available
  let watsonxClient: WatsonxClient | null = null;
  if (config.ibmWatsonxApiKey) {
    try {
      watsonxClient = new WatsonxClient({
        apiKey: config.ibmWatsonxApiKey,
        model: process.env.IBM_WATSONX_MODEL || 'ibm/granite-3-3-8b-instruct',
        temperature: 0.3, // Lower temperature for more consistent test generation
        maxTokens: 2048,
      });
      logger.debug('IBM watsonx.ai client initialized for test generation');
    } catch (error) {
      logger.warn('Failed to initialize IBM client, will use fallback generation');
      warnings.push('IBM watsonx.ai unavailable - using fallback test generation');
    }
  }

  // Generate tests for each task
  for (const task of taskPlan.tasks) {
    // Find the acceptance criterion for this task
    const acceptanceCriterion = taskPlan.acceptanceCriteria.find(
      ac => ac.id === task.acceptanceCriterionId
    );

    if (!acceptanceCriterion) {
      logger.warn(`No acceptance criterion found for task ${task.taskId}`);
      warnings.push(`Task ${task.taskId}: No acceptance criterion found`);
      continue;
    }

    // Skip non-API tasks
    if (task.type === 'ui' || task.type === 'integration') {
      logger.debug(`Skipping ${task.type} task ${task.taskId}`);
      continue;
    }

    try {
      const generatedTests = await generateTestsFromTask(
        task,
        acceptanceCriterion,
        discoveredRoutes,
        config,
        projectContext,
        watsonxClient
      );

      tests.push(...generatedTests);

      if (generatedTests.some(test => (test as any).reasoning?.toLowerCase().includes('ibm'))) {
        ibmUsed = true;
      }

      if (generatedTests.some(test => test.status !== 'ready')) {
        normalizationApplied = true;
      }
    } catch (error) {
      logger.error(`Failed to generate test for task ${task.taskId}:`, error);
      warnings.push(`Task ${task.taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate summary
  const summary = generateTestSummary(tests);

  const testSuite: GeneratedHTTPTestSuite = {
    projectName: taskPlan.projectName,
    timestamp: new Date().toISOString(),
    baseUrl: projectContext.baseUrl,
    tests,
    summary,
  };

  logger.success(`Generated ${tests.length} HTTP tests`);
  logger.info(`Ready: ${summary.readyTests}, Uncertain: ${summary.uncertainTests}, Manual: ${summary.manualTests}`);

  return {
    testSuite,
    warnings,
    ibmUsed,
    normalizationApplied,
  };
}

/**
 * Generate a single HTTP test from a QA task
 * 
 * @param task - QA task to generate test for
 * @param acceptanceCriterion - Acceptance criterion being tested
 * @param discoveredRoutes - Routes discovered from the application
 * @param config - TraceQA configuration
 * @param projectContext - Project context
 * @param watsonxClient - Optional IBM watsonx.ai client
 * @returns Generated HTTP test
 */
async function generateTestsFromTask(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  projectContext: ProjectContext,
  watsonxClient: WatsonxClient | null
): Promise<GeneratedHTTPTest[]> {
  logger.debug(`Generating test for task ${task.taskId}: ${task.title}`);

  let generatedTests: GeneratedHTTPTest[] = [];

  if (watsonxClient) {
    try {
      const ibmTests = await generateTestsWithIBM(
        task,
        acceptanceCriterion,
        discoveredRoutes,
        config,
        projectContext,
        watsonxClient
      );

      if (ibmTests) {
        generatedTests = ibmTests;
      }
    } catch (error) {
      logger.debug(`IBM generation failed for task ${task.taskId}, using fallback`);
    }
  }

  if (generatedTests.length > 0) {
    return generatedTests;
  }

  return [generateFallbackTest(
    task,
    acceptanceCriterion,
    discoveredRoutes,
    config,
    projectContext.baseUrl
  )];
}

/**
 * Generate test steps using IBM watsonx.ai
 * 
 * @param task - QA task
 * @param acceptanceCriterion - Acceptance criterion
 * @param routeMatch - Matched route result
 * @param baseUrl - Base URL for the API
 * @param watsonxClient - IBM watsonx.ai client
 * @returns Array of test steps or null if generation failed
 */
async function generateTestsWithIBM(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  projectContext: ProjectContext,
  watsonxClient: WatsonxClient
): Promise<GeneratedHTTPTest[] | null> {
  const prompt = buildHTTPTestPrompt(
    task,
    acceptanceCriterion,
    discoveredRoutes,
    projectContext
  );

  logger.debug('Requesting test steps from IBM watsonx.ai...');

  try {
    const response = await watsonxClient.sendMessage(prompt, {
      temperature: 0.3,
      maxTokens: 2048,
    });

    // Save raw response for debugging
    saveRawIBMResponse(response, task.taskId);

    const extracted = safeExtractJSON(response);

    if (!extracted.success || !extracted.data) {
      logger.warn(`Failed to extract JSON from IBM response for task ${task.taskId}`);
      return null;
    }

    const data = extracted.data as IBMGeneratedHTTPTestResponse;
    if (!data.tests || !Array.isArray(data.tests)) {
      logger.warn(`IBM response missing 'tests' array for task ${task.taskId}`);
      return null;
    }

    const normalizedTests: GeneratedHTTPTest[] = [];
    for (const rawTest of data.tests) {
      const normalized = normalizeGeneratedTest(
        rawTest,
        task,
        acceptanceCriterion,
        discoveredRoutes,
        projectContext.baseUrl
      );

      if (normalized) {
        // Assess generated data confidence using OpenAPI, route snippets, and config
        try {
          const firstStep = normalized.steps && normalized.steps.length > 0 ? normalized.steps[0] : null;
          if (firstStep) {
            const route = firstStep && discoveredRoutes.find(r => r.path && pathMatchesDiscoveredRoute(r.path, new URL(firstStep.url).pathname) && r.method.toUpperCase() === firstStep.method.toUpperCase()) || null;

            // GET routes do not require body confidence — if route matches and expected status looks valid, mark ready
            try {
              if (firstStep.method.toUpperCase() === 'GET' && route && typeof firstStep.expectedStatus === 'number' && firstStep.expectedStatus === 200) {
                normalized.status = 'ready';
                normalized.executionMode = 'automated';
                normalized.uncertainReason = null;
              } else {
                // Use IBM confidence as baseline when assessing generated data
                const assessment = assessTestDataConfidence(firstStep.body, firstStep.method, route, projectContext.openApiSpec, config, normalized.confidence || 0);
                if (assessment.confidence < 0.6) {
                  normalized.status = 'uncertain';
                  normalized.uncertainReason = `Low confidence in generated request data: ${assessment.reasons.join('; ')}`;
                  normalized.executionMode = 'uncertain';
                }
              }
            } catch (e) {
              normalized.status = 'uncertain';
              normalized.uncertainReason = 'Failed to assess test data confidence';
              normalized.executionMode = 'uncertain';
            }
          }
        } catch (e) {
          // If anything fails during assessment, mark uncertain conservatively
          normalized.status = 'uncertain';
          normalized.uncertainReason = 'Failed to assess test data confidence';
          normalized.executionMode = 'uncertain';
        }

        normalizedTests.push(normalized);
      }
    }

    logger.debug(`IBM generated ${normalizedTests.length} executable test(s)`);
    return normalizedTests.length > 0 ? normalizedTests : null;
  } catch (error) {
    logger.error(`IBM test generation failed for task ${task.taskId}:`, error);
    return null;
  }
}

/**
 * Build prompt for IBM watsonx.ai to generate HTTP test steps
 * 
 * @param task - QA task
 * @param acceptanceCriterion - Acceptance criterion
 * @param matchedRoute - Matched route (or null)
 * @param baseUrl - Base URL for the API
 * @returns Formatted prompt string
 */
function buildHTTPTestPrompt(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  projectContext: ProjectContext
): string {
  const routesInfo = discoveredRoutes.length > 0
    ? discoveredRoutes.map(route => {
        const fileInfo = (route as DiscoveredRoute & { file?: string }).file ? ` [${(route as DiscoveredRoute & { file?: string }).file}]` : '';
        const snippetRaw = (route as any)?.sourceSnippet;
        const snippetInfo = snippetRaw ? `\n  Source snippet:\n${String(snippetRaw).split('\n').slice(0,8).join('\n')}` : '';
        const validationInfo = (route as DiscoveredRoute & { validationSnippets?: string[] }).validationSnippets && (route as DiscoveredRoute & { validationSnippets?: string[] }).validationSnippets!.length > 0
          ? `\n  Validation hints: ${(route as DiscoveredRoute & { validationSnippets?: string[] }).validationSnippets!.slice(0,5).join(' | ')}`
          : '';
        return `- ${route.method.toUpperCase()} ${route.path}${fileInfo}${validationInfo}${snippetInfo}`;
      }).join('\n')
    : 'No discovered routes were found.';

  const openApiInfo = buildOpenApiSummary(projectContext.openApiSpec);

  return `You are generating executable HTTP tests from acceptance criteria.

Return STRICT JSON ONLY. Do not return markdown, prose, or code fences.

Project type: ${projectContext.projectType || 'unknown'}
Language: ${projectContext.language || 'unknown'}
Base URL: ${projectContext.baseUrl}
OpenAPI summary: ${openApiInfo}

Acceptance criterion:
${acceptanceCriterion.id}: ${acceptanceCriterion.description}

Task:
${task.taskId}: ${task.title}

Discovered routes (include nearby source/validation hints where available):
${routesInfo}

When constructing request bodies, prefer the following sources in priority order:
1) OpenAPI requestBody schema and examples (if provided in the project)
2) Validation or schema snippets found near the route handler (provided above)
3) Config-provided sample data
4) IBM reasoning using the provided acceptance criterion and the route snippets
5) Generic placeholders only as last-resort low-confidence fallback

When you produce bodies, include a short 'confidence' numeric value (0.0 - 1.0) in the test metadata and explain which source you used.

Required JSON shape:
{
  "tests": [
    {
      "id": "TC-001",
      "acceptanceCriterionId": "AC-1",
      "title": "Human readable title",
      "reasoning": "Why this test maps to the acceptance criterion.",
      "confidence": 0.92,
      "executionMode": "automated",
      "steps": [
        {
          "stepId": "TC-001-S1",
          "method": "POST",
          "path": "/api/example",
          "url": "${projectContext.baseUrl}/api/example",
          "headers": { "Content-Type": "application/json" },
          "body": { "example": "value" },
          "expectedStatus": 201,
          "acceptableStatuses": [200, 201],
          "expectedBodyContains": []
        }
      ]
    }
  ]
}

Rules:
- Use only discovered routes or a clear UNCERTAIN response.
- Do not invent fake endpoints.
- If you cannot safely map the criterion to an executable HTTP test, return:
  { "tests": [{ "id": "TC-001", "acceptanceCriterionId": "${acceptanceCriterion.id}", "title": "${task.title}", "reasoning": "No discovered route appears to handle this behavior.", "confidence": 0.0, "executionMode": "uncertain", "uncertainReason": "No discovered route appears to handle this behavior.", "steps": [] }] }
- Every automated test must use discovered route paths and absolute or baseUrl-derived URLs.
- Use JSON bodies for POST, PUT, and PATCH when needed.
- If confidence is low, set executionMode to uncertain.
- Do not put objects in url.
- Keep paths aligned with discovered routes.

Return ONLY valid JSON.`;
}

/**
 * Validate and normalize test steps from IBM or other sources
 * 
 * @param steps - Raw test steps to validate
 * @param task - QA task
 * @param acceptanceCriterion - Acceptance criterion
 * @param discoveredRoutes - Discovered routes
 * @param config - TraceQA configuration
 * @param baseUrl - Base URL
 * @returns Validation result with normalized steps
 */
export function validateAndNormalizeTestSteps(
  steps: any[],
  task: QATask,
  _acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  _config: TraceQAConfig,
  baseUrl: string
): {
  normalizedSteps: HTTPTestStep[];
  warnings: string[];
  errors: string[];
} {
  const normalizedSteps: HTTPTestStep[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNum = i + 1;

    // Validate required fields
    if (!step.method) {
      errors.push(`Step ${stepNum}: Missing method`);
      continue;
    }
    if (!step.url && !step.path) {
      errors.push(`Step ${stepNum}: Missing URL/path`);
      continue;
    }

    // Create HTTPTestStep for validation
    const httpStep: HTTPTestStep = {
      stepId: `${task.taskId}-S${stepNum}`,
      description: step.description || `Step ${stepNum}`,
      method: step.method,
      url: typeof step.url === 'string' ? step.url : (typeof step.path === 'string' ? step.path : ''),
      headers: step.headers || { 'Content-Type': 'application/json' },
      body: step.body || null,
      expectedStatus: step.expectedStatus || 200,
      acceptableStatuses: step.acceptableStatuses || [],
      expectedBodyContains: step.expectedBodyContains || null,
    };

    // Validate and normalize using route-matcher
    const validation = validateAndNormalizeHTTPStep(
      httpStep,
      discoveredRoutes,
      baseUrl
    );

    if (!validation.valid) {
      errors.push(...validation.errors.map(e => `Step ${stepNum}: ${e}`));
      continue;
    }

    warnings.push(...validation.warnings.map(w => `Step ${stepNum}: ${w}`));

    // Apply normalized values
    if (validation.normalized.method) {
      httpStep.method = validation.normalized.method as HTTPTestStep['method'];
    }
    if (validation.normalized.url) {
      httpStep.url = validation.normalized.url;
    }
    if (validation.normalized.body !== undefined) {
      httpStep.body = validation.normalized.body;
    }
    if (validation.normalized.expectedStatus) {
      httpStep.expectedStatus = validation.normalized.expectedStatus;
    }
    if (validation.normalized.acceptableStatuses) {
      httpStep.acceptableStatuses = validation.normalized.acceptableStatuses;
    }

    // Validate body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(httpStep.method)) {
      if (!httpStep.body || Object.keys(httpStep.body).length === 0) {
        warnings.push(`Step ${stepNum}: ${httpStep.method} request has empty body`);
      }
    }

    normalizedSteps.push(httpStep);
  }

  return { normalizedSteps, warnings, errors };
}

/**
 * Generate multi-step test for scenarios requiring setup
 * 
 * @param task - QA task
 * @param acceptanceCriterion - Acceptance criterion
 * @param route - Discovered route
 * @param config - TraceQA configuration
 * @param baseUrl - Base URL
 * @returns Array of HTTP test steps
 */
function generateMultiStepTest(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  route: DiscoveredRoute,
  config: TraceQAConfig,
  baseUrl: string
): HTTPTestStep[] {
  const steps: HTTPTestStep[] = [];
  const context = `${task.title} ${acceptanceCriterion.description}`;
  const multiStepReq = detectMultiStepRequirement(context);

  if (!multiStepReq.requiresMultiStep) {
    // Single step test
    const bodyResult = generateRequestBody(
      route.method,
      route,
      task,
      acceptanceCriterion,
      config
    );

    steps.push({
      stepId: `${task.taskId}-S1`,
      description: task.title,
      method: route.method as HTTPTestStep['method'],
      url: `${baseUrl}${route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: bodyResult.body,
      expectedStatus: route.method === 'POST' ? 201 : 200,
      acceptableStatuses: route.method === 'POST' ? [200, 201] : [200],
    });

    return steps;
  }

  // Multi-step test
  const testId = task.taskId;
  const timestamp = Date.now().toString();
  const testDataContext: TestDataContext = {
    setupData: {},
    testId,
    timestamp,
  };

  // Step 1: Setup (create resource)
  if (multiStepReq.setupAction === 'create') {
    const setupBodyResult = generateRequestBody(
      'POST',
      route,
      task,
      acceptanceCriterion,
      config
    );

    const setupBody = generateStatefulBody(
      'setup',
      testDataContext,
      setupBodyResult.body || {}
    );

    steps.push({
      stepId: `${task.taskId}-S1`,
      description: 'Setup: Create resource',
      method: 'POST',
      url: `${baseUrl}${route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: setupBody,
      expectedStatus: 201,
      acceptableStatuses: [200, 201],
    });
  }

  // Step 2: Main action
  if (multiStepReq.mainAction === 'create') {
    // Duplicate/conflict scenario
    const conflictBody = generateStatefulBody(
      'conflict',
      testDataContext,
      testDataContext.setupData
    );

    steps.push({
      stepId: `${task.taskId}-S2`,
      description: 'Attempt duplicate creation (expect conflict)',
      method: 'POST',
      url: `${baseUrl}${route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: conflictBody,
      expectedStatus: 409,
      acceptableStatuses: [409],
    });
  } else if (multiStepReq.mainAction === 'update') {
    const updateBody = generateStatefulBody(
      'action',
      testDataContext,
      testDataContext.setupData
    );

    steps.push({
      stepId: `${task.taskId}-S2`,
      description: 'Update resource',
      method: 'PUT',
      url: `${baseUrl}${route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: updateBody,
      expectedStatus: 200,
      acceptableStatuses: [200, 204],
    });
  } else if (multiStepReq.mainAction === 'delete') {
    steps.push({
      stepId: `${task.taskId}-S2`,
      description: 'Delete resource',
      method: 'DELETE',
      url: `${baseUrl}${route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: null,
      expectedStatus: 204,
      acceptableStatuses: [200, 204],
    });
  }

  return steps;
}

/**
 * Determine test status based on confidence levels
 * 
 * @param task - QA task
 * @param steps - Generated test steps
 * @param routeMatch - Route match result
 * @param bodyGeneration - Body generation results
 * @returns Test status and reason
 */
function determineTestStatus(
  task: QATask,
  steps: HTTPTestStep[],
  routeMatch: RouteMatchResult,
  bodyGeneration: BodyGenerationResult[]
): {
  status: 'ready' | 'uncertain' | 'manual';
  uncertainReason: string | null;
} {
  const reasons: string[] = [];

  // Check if task is already marked as uncertain or manual
  if (task.executionMode === 'manual') {
    return {
      status: 'manual',
      uncertainReason: 'Task marked for manual execution',
    };
  }

  if (task.type === 'uncertain') {
    reasons.push('Task type is uncertain');
  }

  // Check route match confidence
  if (!routeMatch.matched) {
    reasons.push('No route matched for this task');
  } else if (routeMatch.confidence === 'low') {
    reasons.push(`Route match confidence is low: ${routeMatch.reasoning}`);
  }

  // Check body generation confidence
  const lowConfidenceBodies = bodyGeneration.filter(bg => bg.confidence === 'low');
  if (lowConfidenceBodies.length > 0) {
    reasons.push(`${lowConfidenceBodies.length} request bodies generated with low confidence`);
  }

  // Check for empty bodies on POST/PUT/PATCH
  const emptyBodySteps = steps.filter(
    step => ['POST', 'PUT', 'PATCH'].includes(step.method) && 
            (!step.body || Object.keys(step.body).length === 0)
  );
  if (emptyBodySteps.length > 0) {
    reasons.push(`${emptyBodySteps.length} steps have empty request bodies`);
  }

  // Check for invalid URLs
  const invalidUrlSteps = steps.filter(
    step => !step.url || step.url.includes('{') || step.url.includes('"')
  );
  if (invalidUrlSteps.length > 0) {
    reasons.push(`${invalidUrlSteps.length} steps have invalid URLs`);
  }

  // Determine final status
  if (reasons.length === 0) {
    return { status: 'ready', uncertainReason: null };
  }

  // If only minor issues, mark as uncertain
  if (routeMatch.confidence === 'medium' && emptyBodySteps.length === 0) {
    return {
      status: 'uncertain',
      uncertainReason: reasons.join('; '),
    };
  }

  // Major issues - mark as uncertain or manual
  if (task.type === 'ui' || task.type === 'integration') {
    return {
      status: 'manual',
      uncertainReason: `${task.type} task not suitable for HTTP testing`,
    };
  }

  return {
    status: 'uncertain',
    uncertainReason: reasons.join('; '),
  };
}

/**
 * Generate test summary statistics
 * 
 * @param tests - Generated HTTP tests
 * @returns Summary statistics
 */
function generateTestSummary(tests: GeneratedHTTPTest[]): {
  totalTests: number;
  readyTests: number;
  uncertainTests: number;
  manualTests: number;
} {
  return {
    totalTests: tests.length,
    readyTests: tests.filter(t => t.status === 'ready').length,
    uncertainTests: tests.filter(t => t.status === 'uncertain').length,
    manualTests: tests.filter(t => t.status === 'manual').length,
  };
}

/**
 * Generate fallback test when IBM fails or is unavailable
 * 
 * @param task - QA task
 * @param acceptanceCriterion - Acceptance criterion
 * @param discoveredRoutes - Discovered routes
 * @param config - TraceQA configuration
 * @param baseUrl - Base URL
 * @returns Generated HTTP test
 */
function generateFallbackTest(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  baseUrl: string
): GeneratedHTTPTest {
  logger.debug(`Generating fallback test for task ${task.taskId}`);

  // Match route
  const routeMatch = matchRouteToTask(
    task,
    acceptanceCriterion,
    discoveredRoutes
  );

  let steps: HTTPTestStep[];

  if (routeMatch.matched && routeMatch.route) {
    // Generate multi-step or single-step test
    const context = `${task.title} ${acceptanceCriterion.description}`;
    const multiStepReq = detectMultiStepRequirement(context);

    if (multiStepReq.requiresMultiStep) {
      steps = generateMultiStepTest(
        task,
        acceptanceCriterion,
        routeMatch.route,
        config,
        baseUrl
      );
    } else {
      // Single step test
      const bodyResult = generateRequestBody(
        routeMatch.route.method,
        routeMatch.route,
        task,
        acceptanceCriterion,
        config
      );

      steps = [{
        stepId: `${task.taskId}-S1`,
        description: task.title,
        method: routeMatch.route.method as HTTPTestStep['method'],
        url: `${baseUrl}${routeMatch.route.path}`,
        headers: { 'Content-Type': 'application/json' },
        body: bodyResult.body,
        expectedStatus: routeMatch.route.method === 'POST' ? 201 : 200,
        acceptableStatuses: routeMatch.route.method === 'POST' ? [200, 201] : [200],
      }];
    }
  } else {
    return {
      id: `TC-${task.taskId.replace('QA-', '')}`,
      qaTaskId: task.taskId,
      acceptanceCriterionId: task.acceptanceCriterionId,
      title: task.title,
      type: task.type === 'uncertain' ? 'api' : task.type,
      steps: [],
      status: 'uncertain',
      uncertainReason: 'No discovered route appears to handle this behavior.',
    };
  }

  // Determine status
  const bodyGeneration: BodyGenerationResult[] = steps
    .filter(s => s.body !== null)
    .map(s => ({
      body: s.body,
      source: 'inferred' as const,
      confidence: 'medium' as const,
      warnings: [],
    }));

  const statusResult = determineTestStatus(
    task,
    steps,
    routeMatch,
    bodyGeneration
  );

  return {
    id: `TC-${task.taskId.replace('QA-', '')}`,
    qaTaskId: task.taskId,
    acceptanceCriterionId: task.acceptanceCriterionId,
    title: task.title,
    type: task.type === 'uncertain' ? 'api' : task.type,
    steps,
    status: statusResult.status,
    uncertainReason: statusResult.uncertainReason || 'Generated using fallback logic',
  };
}

/**
 * Save raw IBM response for debugging
 * 
 * @param response - Raw response text
 * @param taskId - Task ID for filename
 */
function saveRawIBMResponse(response: string, taskId: string): void {
  try {
    const envDir = process.env.TRACEQA_DEBUG_DIR;
    const defaultDir = join(process.cwd(), 'traceqa-debug');
    const debugDir = envDir ? envDir : defaultDir;
    mkdirSync(debugDir, { recursive: true });
    
    const filename = `ibm-http-test-${taskId}-${Date.now()}.txt`;
    const filepath = join(debugDir, filename);
    
    writeFileSync(filepath, response, 'utf-8');
    logger.debug(`Saved raw IBM response to ${filepath}`);
  } catch (error) {
    logger.warn('Failed to save raw IBM response');
  }
}

// Made with Bob