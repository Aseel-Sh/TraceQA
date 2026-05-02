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
  type ValidationResult,
} from '../validation/route-matcher.js';
import {
  generateRequestBody,
  generateStatefulBody,
  type BodyGenerationResult,
  type TestDataContext,
} from '../validation/body-generator.js';
import { logger } from '../utils/logger.js';
import { extractJSON, safeExtractJSON } from '../utils/json-extractor.js';
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
  openApiSpec?: any;
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
      const test = await generateTestFromTask(
        task,
        acceptanceCriterion,
        discoveredRoutes,
        config,
        projectContext,
        watsonxClient
      );

      tests.push(test);

      // Track if IBM was used
      if (test.steps.some(step => step.description.includes('IBM'))) {
        ibmUsed = true;
      }

      // Track if normalization was applied
      if (test.uncertainReason?.includes('normalized') || 
          test.uncertainReason?.includes('inferred')) {
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
async function generateTestFromTask(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  projectContext: ProjectContext,
  watsonxClient: WatsonxClient | null
): Promise<GeneratedHTTPTest> {
  logger.debug(`Generating test for task ${task.taskId}: ${task.title}`);

  // Match route to task
  const routeMatch = matchRouteToTask(
    task,
    acceptanceCriterion,
    discoveredRoutes,
    projectContext.openApiSpec
  );

  // Try IBM generation first if available
  let ibmSteps: any[] | null = null;
  if (watsonxClient && routeMatch.matched) {
    try {
      ibmSteps = await generateTestStepsWithIBM(
        task,
        acceptanceCriterion,
        routeMatch,
        projectContext.baseUrl,
        watsonxClient
      );
    } catch (error) {
      logger.debug(`IBM generation failed for task ${task.taskId}, using fallback`);
    }
  }

  // Validate and normalize IBM steps or generate fallback
  let steps: HTTPTestStep[];
  let bodyGenerationResults: BodyGenerationResult[] = [];
  let testWarnings: string[] = [];

  if (ibmSteps && ibmSteps.length > 0) {
    const validation = validateAndNormalizeTestSteps(
      ibmSteps,
      task,
      acceptanceCriterion,
      discoveredRoutes,
      config,
      projectContext.baseUrl
    );

    steps = validation.normalizedSteps;
    testWarnings = [...validation.warnings, ...validation.errors];
    
    // Generate bodies for steps that need them
    for (const step of steps) {
      if (['POST', 'PUT', 'PATCH'].includes(step.method) && !step.body) {
        const bodyResult = generateRequestBody(
          step.method,
          routeMatch.route,
          task,
          acceptanceCriterion,
          config,
          projectContext.openApiSpec
        );
        step.body = bodyResult.body;
        bodyGenerationResults.push(bodyResult);
        testWarnings.push(...bodyResult.warnings);
      }
    }
  } else {
    // Fallback generation
    const fallbackTest = generateFallbackTest(
      task,
      acceptanceCriterion,
      discoveredRoutes,
      config,
      projectContext.baseUrl
    );
    
    steps = fallbackTest.steps;
    testWarnings.push('Generated using fallback logic - IBM unavailable or failed');
  }

  // Determine test status
  const statusResult = determineTestStatus(
    task,
    steps,
    routeMatch,
    bodyGenerationResults
  );

  // Build the test
  const test: GeneratedHTTPTest = {
    id: `TC-${task.taskId.replace('QA-', '')}`,
    qaTaskId: task.taskId,
    acceptanceCriterionId: task.acceptanceCriterionId,
    title: task.title,
    type: task.type === 'uncertain' ? 'api' : task.type,
    steps,
    status: statusResult.status,
    uncertainReason: statusResult.uncertainReason || undefined,
  };

  return test;
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
async function generateTestStepsWithIBM(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  routeMatch: RouteMatchResult,
  baseUrl: string,
  watsonxClient: WatsonxClient
): Promise<any[] | null> {
  const prompt = buildHTTPTestPrompt(
    task,
    acceptanceCriterion,
    routeMatch.route,
    baseUrl
  );

  logger.debug('Requesting test steps from IBM watsonx.ai...');

  try {
    const response = await watsonxClient.sendMessage(prompt, {
      temperature: 0.3,
      maxTokens: 2048,
    });

    // Save raw response for debugging
    saveRawIBMResponse(response, task.taskId);

    // Extract JSON from response
    const extracted = safeExtractJSON(response);
    
    if (!extracted.success || !extracted.data) {
      logger.warn(`Failed to extract JSON from IBM response for task ${task.taskId}`);
      return null;
    }

    // Validate structure
    const data = extracted.data;
    if (!data.steps || !Array.isArray(data.steps)) {
      logger.warn(`IBM response missing 'steps' array for task ${task.taskId}`);
      return null;
    }

    logger.debug(`IBM generated ${data.steps.length} test steps`);
    return data.steps;
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
  matchedRoute: DiscoveredRoute | null,
  baseUrl: string
): string {
  const routeInfo = matchedRoute
    ? `Matched Route: ${matchedRoute.method} ${matchedRoute.path}`
    : 'No specific route matched - infer from task description';

  return `Generate HTTP test steps for the following QA task.

Task: ${task.title}
Acceptance Criterion: ${acceptanceCriterion.description}
Expected Result: ${task.expectedResult}
${routeInfo}
Base URL: ${baseUrl}

Generate a JSON object with the following structure:
{
  "steps": [
    {
      "description": "Step description",
      "method": "HTTP method (GET, POST, PUT, PATCH, DELETE)",
      "url": "Relative URL path (e.g., /api/users)",
      "headers": { "Content-Type": "application/json" },
      "body": { "field": "value" } or null,
      "expectedStatus": 200,
      "expectedBodyContains": ["expected", "values"] or null
    }
  ],
  "reasoning": "Why these steps test the acceptance criterion"
}

Requirements:
- Use the matched route if provided
- Include setup steps if needed (e.g., create before update/delete)
- For duplicate/conflict tests, create resource first, then attempt duplicate
- Use realistic test data with unique identifiers
- Set appropriate expected status codes
- Include expected response patterns when relevant
- Keep URLs as relative paths (e.g., /api/users, not full URLs)

Return ONLY the JSON object, no additional text.`;
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
function validateAndNormalizeTestSteps(
  steps: any[],
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
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
    if (!step.url) {
      errors.push(`Step ${stepNum}: Missing URL`);
      continue;
    }

    // Create HTTPTestStep for validation
    const httpStep: HTTPTestStep = {
      stepId: `${task.taskId}-S${stepNum}`,
      description: step.description || `Step ${stepNum}`,
      method: step.method,
      url: step.url,
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
    // No route matched - create minimal test
    steps = [{
      stepId: `${task.taskId}-S1`,
      description: task.title,
      method: 'GET',
      url: `${baseUrl}/api/unknown`,
      headers: { 'Content-Type': 'application/json' },
      body: null,
      expectedStatus: 200,
      acceptableStatuses: [200],
    }];
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
    const debugDir = join(process.cwd(), 'traceqa-debug');
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