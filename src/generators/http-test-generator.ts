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
  VariableExtraction,
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
  tests?: Array<{
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
  id?: string;
  acceptanceCriterionId?: string;
  title?: string;
  status?: 'ready' | 'manual' | 'uncertain';
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

/**
 * Detect if a URL contains variable placeholders that need to be resolved
 *
 * @param url - URL to check
 * @returns True if URL contains unresolved variables
 */
/**
 * Check if a URL contains unresolved template placeholders
 * Detects all common placeholder formats:
 * - {id}, {userId}, {resourceId} (curly braces)
 * - :id, :userId, :resourceId (colon prefix)
 * - <id>, <userId>, <resourceId> (angle brackets)
 * - [id], [userId], [resourceId] (square brackets)
 */
function hasUnresolvedVariables(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Check for various placeholder formats
  const patterns = [
    /\{[^}]+\}/,           // {id}, {userId}, etc.
    /:[a-zA-Z_]\w*/,       // :id, :userId, etc. (colon followed by identifier)
    /<[^>]+>/,             // <id>, <userId>, etc.
    /\[[^\]]+\]/           // [id], [userId], etc.
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Extract placeholder names from a URL template
 * Returns an array of placeholder names found in the URL
 */
function extractPlaceholders(url: string): string[] {
  if (!url || typeof url !== 'string') {
    return [];
  }
  
  const placeholders: string[] = [];
  
  // Extract {placeholder}
  const curlyMatches = url.match(/\{([^}]+)\}/g);
  if (curlyMatches) {
    placeholders.push(...curlyMatches.map(m => m.slice(1, -1)));
  }
  
  // Extract :placeholder
  const colonMatches = url.match(/:([a-zA-Z_]\w*)/g);
  if (colonMatches) {
    placeholders.push(...colonMatches.map(m => m.slice(1)));
  }
  
  // Extract <placeholder>
  const angleMatches = url.match(/<([^>]+)>/g);
  if (angleMatches) {
    placeholders.push(...angleMatches.map(m => m.slice(1, -1)));
  }
  
  // Extract [placeholder]
  const squareMatches = url.match(/\[([^\]]+)\]/g);
  if (squareMatches) {
    placeholders.push(...squareMatches.map(m => m.slice(1, -1)));
  }
  
  return placeholders;
}

/**
 * Validate that URL templates can be resolved by captured variables
 * Returns validation result with details about unresolved placeholders
 */
function validateTemplateResolution(
  steps: HTTPTestStep[]
): {
  valid: boolean;
  unresolvedPlaceholders: Array<{
    stepIndex: number;
    stepId: string;
    url: string;
    placeholders: string[];
  }>;
  message?: string;
} {
  const unresolvedPlaceholders: Array<{
    stepIndex: number;
    stepId: string;
    url: string;
    placeholders: string[];
  }> = [];
  
  // Track variables captured in previous steps
  const availableVariables = new Set<string>();
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Check if this step's URL has unresolved placeholders
    if (hasUnresolvedVariables(step.url)) {
      const placeholders = extractPlaceholders(step.url);
      
      // Check which placeholders are not available from previous steps
      const unresolved = placeholders.filter(p => !availableVariables.has(p));
      
      if (unresolved.length > 0) {
        unresolvedPlaceholders.push({
          stepIndex: i,
          stepId: step.stepId,
          url: step.url,
          placeholders: unresolved,
        });
      }
    }
    
    // Add variables that this step captures for use in subsequent steps
    if (step.captureVariables && Array.isArray(step.captureVariables)) {
      step.captureVariables.forEach(capture => {
        if (capture.name) {
          availableVariables.add(capture.name);
        }
      });
    }
  }
  
  if (unresolvedPlaceholders.length > 0) {
    const details = unresolvedPlaceholders
      .map(u => `Step ${u.stepIndex + 1} (${u.stepId}): URL "${u.url}" has unresolved placeholders: ${u.placeholders.join(', ')}`)
      .join('; ');
    
    return {
      valid: false,
      unresolvedPlaceholders,
      message: `URL template resolution failed: ${details}`,
    };
  }
  
  return {
    valid: true,
    unresolvedPlaceholders: [],
  };
}

/**
 * Detect if a URL references a specific resource ID that likely doesn't exist
 * Looks for patterns like /api/resources/1, /users/123, etc.
 *
 * @param url - URL to check
 * @returns True if URL appears to reference a specific resource ID
 */
function referencesSpecificResourceId(url: string): boolean {
  // Match patterns like /resource/123 or /resource/abc123
  // But exclude common patterns like /api/v1 or /users/me
  const specificIdPattern = /\/[a-z_-]+\/(?!me\b|current\b|self\b)([0-9]+|[a-f0-9]{8,}|[a-z0-9]{20,})\b/i;
  return specificIdPattern.test(url);
}

/**
 * Detect if a test step needs setup (resource creation) before it can execute
 *
 * @param step - Test step to analyze
 * @param stepIndex - Index of the step in the test
 * @returns Object indicating if setup is needed and why
 */
function detectSetupRequirement(
  step: any,
  stepIndex: number
): { needsSetup: boolean; reason: string | null } {
  const url = typeof step.url === 'string' ? step.url : typeof step.path === 'string' ? step.path : '';
  const method = typeof step.method === 'string' ? step.method.toUpperCase() : '';

  // First step that's a POST/PUT doesn't need setup (it IS the setup)
  if (stepIndex === 0 && (method === 'POST' || method === 'PUT')) {
    return { needsSetup: false, reason: null };
  }

  // Check for unresolved variables
  if (hasUnresolvedVariables(url)) {
    return {
      needsSetup: true,
      reason: `URL contains unresolved variables: ${url}`,
    };
  }

  // Check if URL references a specific resource ID
  if (referencesSpecificResourceId(url)) {
    // If it's a GET/DELETE/PATCH on a specific ID, it likely needs setup
    if (['GET', 'DELETE', 'PATCH', 'PUT'].includes(method)) {
      return {
        needsSetup: true,
        reason: `${method} request to specific resource ID that may not exist: ${url}`,
      };
    }
  }

  return { needsSetup: false, reason: null };
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
  index?: number;
}): GeneratedHTTPTest {
  const taskNumber = options.task.taskId.replace('QA-', '');
  const testId = options.index !== undefined ? `TC-${taskNumber}-${options.index}` : `TC-${taskNumber}`;
  
  return {
    id: testId,
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
  baseUrl: string,
  index: number
): GeneratedHTTPTest | null {
  const warnings: string[] = [];

  if (!rawTest || typeof rawTest !== 'object') {
    return null;
  }

  // Enforce acceptanceCriterionId to equal the task's acceptance criterion
  const rawAcId = typeof rawTest.acceptanceCriterionId === 'string' ? rawTest.acceptanceCriterionId : undefined;
  const acceptanceCriterionId = acceptanceCriterion.id;
  const taskNumber = task.taskId.replace('QA-', '');
  const testId = `TC-${taskNumber}-${index}`;
  
  if (rawAcId && rawAcId !== acceptanceCriterionId) {
    // Do not silently accept wrong AC IDs — mark uncertain and explain mapping mismatch
    return {
      id: testId,
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
      id: testId,
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
      index,
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
        index,
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
          index,
        });
      }

      if (!(urlValue.startsWith('http://') || urlValue.startsWith('https://') || urlValue.startsWith('/'))) {
        return createUncertainTest({
          task,
          acceptanceCriterion,
          reason: `Step ${stepNumber} has an invalid URL format.`,
          index,
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
        index,
      });
    }

    // Check if this step needs setup before execution
    const setupCheck = detectSetupRequirement(rawStep, index);
    if (setupCheck.needsSetup) {
      warnings.push(`Step ${stepNumber}: ${setupCheck.reason}`);
      // Mark as uncertain if setup is needed but not provided
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Setup required: ${setupCheck.reason}`,
        index,
      });
    }

    const routeHint = findRouteHint(stepPath, method, discoveredRoutes);
    if (discoveredRoutes.length > 0 && !routeHint.matched) {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} does not match any discovered route.`,
        index,
      });
    }

    const body = rawStep.body === undefined || rawStep.body === null ? null : rawStep.body;
    if (['POST', 'PUT', 'PATCH'].includes(method) && body !== null && (typeof body !== 'object' || Array.isArray(body))) {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} must use an object request body.`,
        index,
      });
    }

    const expectedStatus = typeof rawStep.expectedStatus === 'number' ? rawStep.expectedStatus : undefined;
    if (typeof expectedStatus !== 'number') {
      return createUncertainTest({
        task,
        acceptanceCriterion,
        reason: `Step ${stepNumber} is missing a numeric expectedStatus.`,
        index,
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

  // Validate URL template resolution before marking as ready
  const templateValidation = validateTemplateResolution(normalizedSteps);
  if (!templateValidation.valid) {
    return {
      id: testId,
      qaTaskId: task.taskId,
      acceptanceCriterionId,
      title,
      type: 'api',
      status: 'uncertain',
      uncertainReason: templateValidation.message || 'URL templates cannot be resolved with available captured variables',
      steps: normalizedSteps,
      reasoning,
      confidence,
      executionMode: 'uncertain',
    } as GeneratedHTTPTest;
  }

  const isAutomated = executionMode === 'automated' && confidence >= 0.7 && warnings.length === 0;

  return {
    id: testId,
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

  logger.success(`Generated ${summary.totalGenerated} HTTP tests (${summary.totalTests} executable)`);
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

  const routeMatch = matchRouteToTask(task, acceptanceCriterion, discoveredRoutes);

  let generatedTests: GeneratedHTTPTest[] = [];

  if (watsonxClient && routeMatch.matched) {
    try {
      const ibmTests = await generateTestsWithIBM(
        task,
        acceptanceCriterion,
        discoveredRoutes,
        routeMatch,
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
  routeMatch: RouteMatchResult,
  config: TraceQAConfig,
  projectContext: ProjectContext,
  watsonxClient: WatsonxClient
): Promise<GeneratedHTTPTest[] | null> {
  logger.debug(`IBM HTTP generation disabled for task ${task.taskId}; using deterministic fallback to avoid truncation`);
  return null;

  const prompt = buildHTTPTestPrompt(
    task,
    acceptanceCriterion,
    discoveredRoutes,
    routeMatch,
    projectContext
  );

  logger.debug('Requesting test steps from IBM watsonx.ai...');

  try {
    let response = await watsonxClient.sendMessage(prompt, {
      temperature: 0.3,
      maxTokens: 96,
    });

    // If truncated, retry once with ultra-compact prompt
    if (response.truncated) {
      logger.warn(`IBM response truncated for task ${task.taskId}, retrying with compact prompt`);
      const retryPrompt = buildHTTPTestPrompt(task, acceptanceCriterion, discoveredRoutes, routeMatch, projectContext, 1);
      response = await watsonxClient.sendMessage(retryPrompt, { temperature: 0.2, maxTokens: 64 });

      if (response.truncated) {
        logger.warn(`IBM response still truncated after retry for task ${task.taskId}. Falling back to deterministic test.`);
        return null;
      }
    }

    // Save raw response for debugging (ensure string)
    const respText = (response && typeof response === 'object' && 'text' in response) ? (response as any).text : (typeof response === 'string' ? response : JSON.stringify(response));
    saveRawIBMResponse(respText, task.taskId);

    const extracted = safeExtractJSON(respText);

    if (!extracted.success || !extracted.data) {
      logger.warn(`Failed to extract JSON from IBM response for task ${task.taskId}`);
      return null;
    }

    const data = extracted.data as IBMGeneratedHTTPTestResponse;
    let rawTests: any[] = [];
    if (Array.isArray(data.tests)) {
      rawTests = data.tests as any[];
    } else if (data.id || data.acceptanceCriterionId || data.steps) {
      rawTests = [data];
    }

    if (rawTests.length === 0) {
      logger.warn(`IBM response missing test object for task ${task.taskId}`);
      return null;
    }

    const normalizedTests: GeneratedHTTPTest[] = [];
    for (let i = 0; i < rawTests.length; i++) {
      const rawTest = rawTests[i];
      const testIndex = i + 1; // 1-based index for test IDs
      const normalizedCandidate = normalizeGeneratedTest(
        rawTest,
        task,
        acceptanceCriterion,
        discoveredRoutes,
        projectContext.baseUrl,
        testIndex
      );

      if (!normalizedCandidate) {
        continue;
      }

      const normalized: GeneratedHTTPTest = normalizedCandidate as GeneratedHTTPTest;

      // Assess generated data confidence using route evidence and config
      try {
        const firstStep = normalized.steps[0];
        if (firstStep) {
          const route = discoveredRoutes.find(r =>
            r.path && pathMatchesDiscoveredRoute(r.path, new URL(firstStep.url).pathname) &&
            r.method.toUpperCase() === firstStep.method.toUpperCase()
          ) || null;

          // GET routes do not require body confidence — if route matches and expected status looks valid, mark ready
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
        }
      } catch (e) {
        // If anything fails during assessment, mark uncertain conservatively
        normalized.status = 'uncertain';
        normalized.uncertainReason = 'Failed to assess test data confidence';
        normalized.executionMode = 'uncertain';
      }

      normalizedTests.push(normalized);
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
  _task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  routeMatch: RouteMatchResult,
  projectContext: ProjectContext,
  retryLevel: number = 0
): string {
  // Keep prompt tiny: use only the matched discovered route when available
  const activeRoute = routeMatch.matched && routeMatch.route ? routeMatch.route : discoveredRoutes[0];
  const routeSummary = activeRoute
    ? `${activeRoute.method.toUpperCase()} ${activeRoute.path}${(activeRoute as any).requestSchema?.required?.length ? ` (requires: ${(activeRoute as any).requestSchema.required.slice(0, 3).join(',')})` : ''}`
    : 'No matched route';

  const basePrompt = `JSON only. One HTTP test object.
AC:${acceptanceCriterion.id}
Route:${routeSummary}
Base:${projectContext.baseUrl}
Return exactly: {"id":"${acceptanceCriterion.id}","acceptanceCriterionId":"${acceptanceCriterion.id}","status":"ready|uncertain|manual","uncertainReason":"","steps":[{"method":"GET","path":"/path","url":"${projectContext.baseUrl}/path","expectedStatus":200}]}

Rules:
- Use only the discovered route shown above.
- Keep uncertainReason to one short sentence.
- If uncertain, return an empty steps array.`;

  if (retryLevel > 0) {
    return `AC:${acceptanceCriterion.id} Route:${routeSummary} Base:${projectContext.baseUrl} JSON only: {"id":"${acceptanceCriterion.id}","acceptanceCriterionId":"${acceptanceCriterion.id}","status":"uncertain","uncertainReason":"","steps":[]}`;
  }

  return basePrompt;
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
export function generateMultiStepTest(
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

    // Add generic captures to try to obtain created resource identifiers
    const captureVariables: VariableExtraction[] = [
      { name: 'createdId', path: 'id', source: 'body' },
      { name: 'createdId', path: 'resourceId', source: 'body' },
      { name: 'createdId', path: 'resource.id', source: 'body' },
      { name: 'createdId', path: 'data.id', source: 'body' },
      { name: 'createdId', path: 'data.resourceId', source: 'body' },
      { name: 'createdId', path: 'data.attributes.id', source: 'body' },
      { name: 'createdId', path: 'result.id', source: 'body' },
      { name: 'createdId', path: 'entity.id', source: 'body' },
      { name: 'createdLocation', path: 'location', source: 'headers' }
    ];

    steps.push({
      stepId: `${task.taskId}-S1`,
      description: 'Setup: Create resource',
      method: 'POST',
      url: `${baseUrl}${route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: setupBody,
      expectedStatus: 201,
      acceptableStatuses: [200, 201],
      captureVariables,
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

      // Replace any id fields in the conflict body with placeholder for runtime substitution
      if (conflictBody && typeof conflictBody === 'object') {
        if ('id' in conflictBody) conflictBody.id = '{{createdId}}';
        if ('itemId' in conflictBody) conflictBody.itemId = '{{createdId}}';
        if ('productId' in conflictBody) conflictBody.productId = '{{createdId}}';
      }

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
      // For update/delete actions, if the discovered route path includes parameters,
      // substitute them with the captured placeholder so runtime substitution will work.
      const paramReplacedPath = route.path.replace(/\{[^}]+\}|:[^\/]+|\[[^\]]+\]/g, '{{createdId}}');

    steps.push({
      stepId: `${task.taskId}-S2`,
      description: 'Update resource',
      method: 'PUT',
        url: `${baseUrl}${paramReplacedPath}`,
      headers: { 'Content-Type': 'application/json' },
      body: updateBody,
      expectedStatus: 200,
      acceptableStatuses: [200, 204],
    });
  } else if (multiStepReq.mainAction === 'delete') {
    const deletePath = route.path.replace(/\{[^}]+\}|:[^\/]+|\[[^\]]+\]/g, '{{createdId}}');
    steps.push({
      stepId: `${task.taskId}-S2`,
      description: 'Delete resource',
      method: 'DELETE',
      url: `${baseUrl}${deletePath}`,
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

  // Check for invalid URLs and unresolved templates
  const invalidUrlSteps = steps.filter(
    step => !step.url || step.url.includes('"')
  );
  if (invalidUrlSteps.length > 0) {
    reasons.push(`${invalidUrlSteps.length} steps have invalid URLs`);
  }

  // Check for unresolved URL templates
  const templateValidation = validateTemplateResolution(steps);
  if (!templateValidation.valid) {
    const placeholderDetails = templateValidation.unresolvedPlaceholders
      .map(u => `${u.placeholders.join(', ')}`)
      .join(', ');
    reasons.push(`Unresolved URL placeholders: ${placeholderDetails}`);
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
  totalGenerated: number;
  totalTests: number;
  readyTests: number;
  uncertainTests: number;
  manualTests: number;
} {
  const readyTests = tests.filter(t => t.status === 'ready').length;
  const uncertainTests = tests.filter(t => t.status === 'uncertain').length;
  const manualTests = tests.filter(t => t.status === 'manual').length;
  
  return {
    totalGenerated: tests.length,
    totalTests: readyTests, // Only count ready/executable tests
    readyTests,
    uncertainTests,
    manualTests,
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

  const criterionText = `${task.title} ${acceptanceCriterion.description}`;
  const isNegativeTest = isNegativeFallbackCriterion(criterionText);

  // Match route
  const routeMatch = matchRouteToTask(
    task,
    acceptanceCriterion,
    discoveredRoutes
  );

  if (!routeMatch.matched || !routeMatch.route) {
    return buildUncertainFallbackTest(task, acceptanceCriterion, 'No discovered route appears to handle this behavior.');
  }

  const methodUpper = routeMatch.route.method.toUpperCase();
  const hasExactSafeGetEvidence = methodUpper === 'GET' && !routePathHasParameters(routeMatch.route.path) && routeMatch.confidence === 'high';
  const isHealthLikeRoute = isHealthLikeSafeRoute(routeMatch.route.path);
  const criterionMentionsHealth = /\b(health|status|uptime|availability|ping|live|ready)\b/i.test(criterionText);

  if (methodUpper === 'GET' && isHealthLikeRoute && !criterionMentionsHealth) {
    return buildUncertainFallbackTest(task, acceptanceCriterion, 'Safe health-like route was discovered, but the acceptance criterion is unrelated to it.');
  }

  if (methodUpper !== 'GET' && !hasRouteEvidence(routeMatch.route, criterionText)) {
    return buildUncertainFallbackTest(task, acceptanceCriterion, 'Matched route lacks enough source or schema evidence for a safe fallback test.');
  }

  let steps: HTTPTestStep[];

  // Stateful or multi-step flows require explicit setup evidence in fallback mode.
  const multiStepReq = detectMultiStepRequirement(criterionText);
  if (multiStepReq.requiresMultiStep) {
    return buildUncertainFallbackTest(task, acceptanceCriterion, 'Stateful or multi-step flow needs explicit setup evidence; fallback stays conservative.');
  }

  const expected = inferFallbackExpectedStatuses(routeMatch.route.method, criterionText, isNegativeTest);

  // GET routes do not require request-body schema evidence. Exact discovered safe GET routes are ready.
  if (methodUpper === 'GET' && hasExactSafeGetEvidence) {
    steps = [{
      stepId: `${task.taskId}-S1`,
      description: task.title,
      method: routeMatch.route.method as HTTPTestStep['method'],
      url: `${baseUrl}${routeMatch.route.path}`,
      headers: {},
      body: null,
      expectedStatus: expected.expectedStatus,
      acceptableStatuses: expected.acceptableStatuses,
    }];
  } else if (methodUpper === 'GET') {
    steps = [{
      stepId: `${task.taskId}-S1`,
      description: task.title,
      method: routeMatch.route.method as HTTPTestStep['method'],
      url: `${baseUrl}${routeMatch.route.path}`,
      headers: {},
      body: null,
      expectedStatus: expected.expectedStatus,
      acceptableStatuses: expected.acceptableStatuses,
    }];
  } else {
    // Single step test for mutating routes
    const bodyResult = generateRequestBody(
      routeMatch.route.method,
      routeMatch.route,
      task,
      acceptanceCriterion,
      config
    );

    if (bodyResult.source === 'generic_fallback' || bodyResult.confidence === 'low') {
      return buildUncertainFallbackTest(task, acceptanceCriterion, 'No schema or source evidence for a valid request body; fallback stays conservative.');
    }

    if ((methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'PATCH') && (!bodyResult.body || Object.keys(bodyResult.body).length === 0)) {
      return buildUncertainFallbackTest(task, acceptanceCriterion, 'Could not derive a valid request body for a mutating route.');
    }

    steps = [{
      stepId: `${task.taskId}-S1`,
      description: task.title,
      method: routeMatch.route.method as HTTPTestStep['method'],
      url: `${baseUrl}${routeMatch.route.path}`,
      headers: { 'Content-Type': 'application/json' },
      body: bodyResult.body,
      expectedStatus: expected.expectedStatus,
      acceptableStatuses: expected.acceptableStatuses,
    }];
  }

  // Determine status
  const bodyGeneration: BodyGenerationResult[] = steps
    .filter(s => s.body !== null)
    .map(s => ({
      body: s.body,
      source: methodUpper === 'GET' ? 'inferred' : 'inferred',
      confidence: 'medium',
      warnings: [],
    }));

  const statusResult = determineTestStatus(
    task,
    steps,
    routeMatch,
    bodyGeneration
  );

  const taskNumber = task.taskId.replace('QA-', '');
  return {
    id: `TC-${taskNumber}-1`,
    qaTaskId: task.taskId,
    acceptanceCriterionId: task.acceptanceCriterionId,
    title: task.title,
    type: task.type === 'uncertain' ? 'api' : task.type,
    steps,
    status: statusResult.status,
    uncertainReason: statusResult.uncertainReason || 'Generated using fallback logic',
  };
}

function buildUncertainFallbackTest(
  task: QATask,
  _acceptanceCriterion: AcceptanceCriterion,
  uncertainReason: string
): GeneratedHTTPTest {
  const taskNumber = task.taskId.replace('QA-', '');
  return {
    id: `TC-${taskNumber}-1`,
    qaTaskId: task.taskId,
    acceptanceCriterionId: task.acceptanceCriterionId,
    title: task.title,
    type: task.type === 'uncertain' ? 'api' : task.type,
    steps: [],
    status: 'uncertain',
    uncertainReason,
  };
}

function inferFallbackExpectedStatuses(
  method: string,
  criterionText: string,
  isNegativeTest: boolean
): { expectedStatus: number; acceptableStatuses: number[] } {
  const normalized = criterionText.toLowerCase();

  if (isNegativeTest || /\b(invalid|reject|fail|forbidden|unauthorized|bad request|negative|missing|required|conflict|duplicate|not found)\b/i.test(normalized)) {
    if (/\b(forbidden)\b/i.test(normalized)) {
      return { expectedStatus: 403, acceptableStatuses: [403] };
    }
    if (/\b(unauthorized|credentials|token|session)\b/i.test(normalized)) {
      return { expectedStatus: 401, acceptableStatuses: [401] };
    }
    if (/\b(not found|missing)\b/i.test(normalized)) {
      return { expectedStatus: 404, acceptableStatuses: [404] };
    }
    if (/\b(conflict|duplicate|already exists)\b/i.test(normalized)) {
      return { expectedStatus: 409, acceptableStatuses: [409] };
    }
    return { expectedStatus: 400, acceptableStatuses: [400, 422] };
  }

  const methodUpper = method.toUpperCase();
  if (methodUpper === 'POST') return { expectedStatus: 201, acceptableStatuses: [200, 201] };
  if (methodUpper === 'PUT' || methodUpper === 'PATCH') return { expectedStatus: 200, acceptableStatuses: [200, 204] };
  if (methodUpper === 'DELETE') return { expectedStatus: 204, acceptableStatuses: [200, 204] };
  return { expectedStatus: 200, acceptableStatuses: [200] };
}

function hasRouteEvidence(route: DiscoveredRoute, criterionText: string): boolean {
  const criterionTokens = extractEvidenceTokens(criterionText);
  if (criterionTokens.length === 0) {
    return false;
  }

  const routeText = [
    route.path,
    route.description || '',
    route.sourceSnippet || '',
    ...(route.validationSnippets || []),
    route.operationId || '',
    ...(route.tags || []),
    ...(route.requestSchema?.required || []),
    ...(route.requestSchema?.properties ? Object.keys(route.requestSchema.properties) : []),
  ].join(' ');

  const routeTokens = new Set(extractEvidenceTokens(routeText));
  return criterionTokens.some(token => routeTokens.has(token));
}

function extractEvidenceTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(token => token.trim())
    .filter(token => token.length > 2)
    .map(token => token.replace(/s$/,'') )
    .filter(token => !['the','and','for','with','that','this','from','should','must','can','will','are','was','were','been','have','has','had','does','did','but','not','when','where','any','all','one','two'].includes(token));
}

function isNegativeFallbackCriterion(text: string): boolean {
  return /\b(invalid|reject|rejects|fail|failed|failure|forbidden|unauthorized|bad request|negative|missing|required|conflict|duplicate|not found|cannot|should not|must not)\b/i.test(text);
}

function routePathHasParameters(path: string): boolean {
  return /\{[^}]+\}|:[^\/]+|\[[^\]]+\]/.test(path);
}

function isHealthLikeSafeRoute(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized === '/health' || normalized === '/status' || normalized === '/healthz' || normalized === '/ready' || normalized === '/live';
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