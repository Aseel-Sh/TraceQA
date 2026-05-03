import {
  QATask,
  QATaskPlan,
  GeneratedHTTPTest,
  GeneratedHTTPTestSuite,
  HTTPTestStep,
  AcceptanceCriterion,
  DiscoveredRoute,
  VariableExtraction,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { matchesPathTemplate } from '../validation/route-matcher.js';
import { generateRequestBody } from '../validation/body-generator.js';

/**
 * Generates deterministic QA task plans from acceptance criteria and AI suggestions
 */
export class QATaskGenerator {
  private routes: DiscoveredRoute[];
  
  constructor(_baseUrl: string, routes: DiscoveredRoute[]) {
    this.routes = routes;
  }

  /**
   * Generate QA task plan from acceptance criteria and optional AI suggestions
   */
  generateTaskPlan(
    acceptanceCriteria: AcceptanceCriterion[],
    aiSuggestions?: any[]
  ): QATaskPlan {
    logger.info('Generating QA task plan...');
    
    const tasks: QATask[] = [];
    let taskCounter = 1;
    
    for (const criterion of acceptanceCriteria) {
      // Try to use AI suggestion if available
      const aiTask = aiSuggestions?.find(
        (s: any) => s.acceptanceCriterionId === criterion.id || 
                    s.criterionId === criterion.id
      );
      
      if (aiTask && this.isValidAITask(aiTask)) {
        // Use AI suggestion with validation
        tasks.push(this.normalizeAITask(aiTask, criterion, taskCounter++));
      } else {
        // Generate deterministic task from criterion
        tasks.push(this.generateDeterministicTask(criterion, taskCounter++));
      }
    }
    
    const summary = this.calculateTaskSummary(tasks);
    
    return {
      projectName: 'TraceQA Test Project',
      timestamp: new Date().toISOString(),
      acceptanceCriteria,
      tasks,
      summary
    };
  }

  /**
   * Validate AI-generated task structure
   */
  private isValidAITask(task: any): boolean {
    return (
      task &&
      typeof task === 'object' &&
      typeof task.title === 'string' &&
      typeof task.expectedResult === 'string' &&
      Array.isArray(task.steps)
    );
  }

  /**
   * Validate AC alignment for generated task (Issue #8)
   */
  private validateACAlignment(
    task: any,
    criterion: AcceptanceCriterion
  ): { aligned: boolean; reason?: string } {
    // Check 1: AC ID must match
    const taskACId = task.acceptanceCriterionId || task.criterionId;
    if (taskACId !== criterion.id) {
      return {
        aligned: false,
        reason: `AC ID mismatch: task references ${taskACId}, expected ${criterion.id}`
      };
    }

    // Check 2: Task title should relate to AC description
    const taskTitle = (task.title || '').toLowerCase();
    const acDesc = (criterion.description || '').toLowerCase();
    
    // Extract meaningful words (ignore common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall', 'test', 'testing'];
    const acWords = acDesc.split(/\s+/).filter((w: string) => w.length > 3 && !commonWords.includes(w));
    
    if (acWords.length > 0) {
      const matchingWords = acWords.filter((word: string) => taskTitle.includes(word));
      const matchRatio = matchingWords.length / acWords.length;
      
      // Require at least 20% keyword overlap for alignment
      if (matchRatio < 0.2) {
        return {
          aligned: false,
          reason: `Task title "${task.title}" does not relate to AC "${criterion.description}"`
        };
      }
    }

    // Check 3: Expected result alignment (if task has expectedResult)
    if (task.expectedResult) {
      const taskExpected = task.expectedResult.toLowerCase();
      
      // Check for contradictory expectations between task and AC description
      const contradictions = [
        { positive: ['success', 'valid', 'accept', 'allow', 'create', 'update'], negative: ['fail', 'invalid', 'reject', 'deny', 'error'] },
        { positive: ['200', '201', '204'], negative: ['400', '401', '403', '404', '409', '422', '500'] }
      ];
      
      for (const { positive, negative } of contradictions) {
        const acHasPositive = positive.some((kw: string) => acDesc.includes(kw));
        const taskHasNegative = negative.some((kw: string) => taskExpected.includes(kw));
        const acHasNegative = negative.some((kw: string) => acDesc.includes(kw));
        const taskHasPositive = positive.some((kw: string) => taskExpected.includes(kw));
        
        if ((acHasPositive && taskHasNegative) || (acHasNegative && taskHasPositive)) {
          return {
            aligned: false,
            reason: `Expected result contradicts AC: AC "${criterion.description}" but task expects "${task.expectedResult}"`
          };
        }
      }
    }

    return { aligned: true };
  }

  /**
   * Normalize AI task to QATask schema with AC alignment validation (Issue #8)
   */
  private normalizeAITask(
    aiTask: any,
    criterion: AcceptanceCriterion,
    taskNumber: number
  ): QATask {
    const taskId = `QA-${String(taskNumber).padStart(3, '0')}`;
    
    // Validate AC alignment (Issue #8)
    const alignmentCheck = this.validateACAlignment(aiTask, criterion);
    
    // Determine execution mode
    let executionMode: 'automated' | 'manual' | 'uncertain' = 'automated';
    let uncertainReason: string | undefined;
    
    if (!alignmentCheck.aligned) {
      // AC drift detected - mark as uncertain
      logger.warn(`AC drift detected for ${criterion.id}: ${alignmentCheck.reason}`);
      executionMode = 'uncertain';
      uncertainReason = `AC drift: ${alignmentCheck.reason}`;
    } else if (aiTask.executionMode === 'manual' || aiTask.type === 'manual') {
      executionMode = 'manual';
    } else if (aiTask.executionMode === 'uncertain' || aiTask.type === 'uncertain') {
      executionMode = 'uncertain';
      uncertainReason = aiTask.uncertainReason || 'AI marked as uncertain';
    }
    
    // Ensure AC metadata is included (Issue #8)
    return {
      taskId,
      acceptanceCriterionId: criterion.id, // Always use the criterion ID for traceability
      acceptanceCriterionText: criterion.description, // Include AC text for reference
      title: aiTask.title || criterion.description,
      type: this.normalizeTaskType(aiTask.type),
      priority: this.normalizePriority(aiTask.priority),
      preconditions: Array.isArray(aiTask.preconditions) ? aiTask.preconditions : [],
      setupData: aiTask.setupData || {},
      steps: Array.isArray(aiTask.steps) ? aiTask.steps : [],
      expectedResult: aiTask.expectedResult || '',
      executionMode,
      reasoning: aiTask.reasoning || 'Generated from acceptance criterion',
      uncertainReason,
      generatedBy: 'ibm' // Track generation source
    } as QATask;
  }

  /**
   * Generate deterministic task when AI fails or is unavailable (Issue #8)
   * Includes AC metadata for traceability
   */
  private generateDeterministicTask(
    criterion: AcceptanceCriterion,
    taskNumber: number
  ): QATask {
    const taskId = `QA-${String(taskNumber).padStart(3, '0')}`;
    
    // Try to match criterion to routes
    const matchedRoute = this.findMatchingRoute(criterion);
    
    if (matchedRoute) {
      // Can generate automated API task
      return {
        taskId,
        acceptanceCriterionId: criterion.id,
        acceptanceCriterionText: criterion.description, // Include AC text for reference
        title: criterion.description,
        type: 'api',
        priority: 'high',
        preconditions: [],
        setupData: {},
        steps: [{
          description: `Test ${matchedRoute.method} ${matchedRoute.path}`,
          action: `Send ${matchedRoute.method} request to ${matchedRoute.path}`,
          expectedOutcome: 'Request succeeds'
        }],
        expectedResult: 'Request succeeds',
        executionMode: 'automated',
        reasoning: `Matched to discovered route: ${matchedRoute.method} ${matchedRoute.path}`,
        generatedBy: 'deterministic' // Track generation source
      } as QATask;
    } else {
      // Cannot safely automate - mark as uncertain
      return {
        taskId,
        acceptanceCriterionId: criterion.id,
        acceptanceCriterionText: criterion.description, // Include AC text for reference
        title: criterion.description,
        type: 'uncertain',
        priority: 'medium',
        preconditions: [],
        setupData: {},
        steps: [{
          description: criterion.description,
          expectedOutcome: 'Criterion is met'
        }],
        expectedResult: 'Criterion is met',
        executionMode: 'uncertain',
        reasoning: 'No matching route found - requires manual verification',
        uncertainReason: 'Could not map to discovered API routes',
        generatedBy: 'deterministic' // Track generation source
      } as QATask;
    }
  }

  /**
   * Find matching route for acceptance criterion
   */
  private findMatchingRoute(criterion: AcceptanceCriterion): DiscoveredRoute | null {
    const criterionText = criterion.description.toLowerCase();
    
    for (const route of this.routes) {
      // Simple keyword matching
      if (criterionText.includes(route.path.toLowerCase()) ||
          (route.description && criterionText.includes(route.description.toLowerCase()))) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * Normalize task type from AI output
   */
  private normalizeTaskType(type: any): 'api' | 'ui' | 'integration' | 'manual' | 'uncertain' {
    if (typeof type === 'string') {
      const normalized = type.toLowerCase();
      if (['api', 'ui', 'integration', 'manual', 'uncertain'].includes(normalized)) {
        return normalized as any;
      }
    }
    return 'api'; // Default to API
  }

  /**
   * Normalize priority from AI output
   */
  private normalizePriority(priority: any): 'high' | 'medium' | 'low' {
    if (typeof priority === 'string') {
      const normalized = priority.toLowerCase();
      if (['high', 'medium', 'low'].includes(normalized)) {
        return normalized as any;
      }
    }
    return 'medium'; // Default to medium
  }

  /**
   * Calculate task summary statistics
   */
  private calculateTaskSummary(tasks: QATask[]) {
    return {
      totalTasks: tasks.length,
      automatedTasks: tasks.filter(t => t.executionMode === 'automated').length,
      manualTasks: tasks.filter(t => t.executionMode === 'manual').length,
      uncertainTasks: tasks.filter(t => t.executionMode === 'uncertain').length
    };
  }
}

/**
 * Generates executable HTTP tests from QA tasks
 */
export class HTTPTestGenerator {
  private baseUrl: string;
  private routes: DiscoveredRoute[];
  
  constructor(_baseUrl: string, routes: DiscoveredRoute[]) {
    this.baseUrl = _baseUrl;
    this.routes = routes;
  }

  /**
   * Generate HTTP test suite from QA task plan
   */
  generateTestSuite(taskPlan: QATaskPlan): GeneratedHTTPTestSuite {
    logger.info('Generating HTTP test suite...');
    
    const tests: GeneratedHTTPTest[] = [];
    let testCounter = 1;
    
    for (const task of taskPlan.tasks) {
      if (task.type === 'api' && task.executionMode === 'automated') {
        const test = this.generateHTTPTest(task, testCounter++);
        if (test) {
          tests.push(test);
        }
      } else if (task.executionMode === 'uncertain') {
        // Create uncertain test placeholder
        tests.push(this.createUncertainTest(task, testCounter++));
      } else if (task.executionMode === 'manual') {
        // Create manual test placeholder
        tests.push(this.createManualTest(task, testCounter++));
      }
    }
    
    const summary = this.calculateTestSummary(tests);
    
    return {
      projectName: taskPlan.projectName,
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      tests,
      summary
    };
  }

  /**
   * Check if URL has unresolved placeholders
   */
  private hasUnresolvedPlaceholders(url: string): boolean {
    const placeholderPattern = /\{[^}]+\}|:[a-zA-Z_][a-zA-Z0-9_]*|<[^>]+>|\[[^\]]+\]/;
    return placeholderPattern.test(url);
  }

  /**
   * Validate HTTP test step before marking as ready (Issue #4)
   */
  private validateTestStep(step: HTTPTestStep): { valid: boolean; reason?: string } {
    // Check 1: URL has no unresolved placeholders
    if (this.hasUnresolvedPlaceholders(step.url)) {
      return {
        valid: false,
        reason: `URL contains unresolved placeholders: ${step.url}`
      };
    }

    // Check 2: Valid HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(step.method.toUpperCase())) {
      return {
        valid: false,
        reason: `Invalid HTTP method: ${step.method}`
      };
    }

    // Check 3: Route matches discovered routes (using unified matcher from Issue #1)
    if (this.routes && this.routes.length > 0) {
      const urlPath = step.url.split('?')[0].split('#')[0];
      const matchingRoute = this.routes.find(route => {
        const methodMatches = route.method.toUpperCase() === step.method.toUpperCase();
        return methodMatches && matchesPathTemplate(route.path, urlPath);
      });

      if (!matchingRoute) {
        return {
          valid: false,
          reason: `Route ${step.method.toUpperCase()} ${urlPath} does not match any discovered route`
        };
      }
    }

    // Check 4: Valid expected status code
    if (step.expectedStatus !== undefined) {
      if (step.expectedStatus < 100 || step.expectedStatus > 599) {
        return {
          valid: false,
          reason: `Invalid expected status code: ${step.expectedStatus}`
        };
      }
    }

    // Check 5: Body present for methods that typically require it
    const methodsRequiringBody = ['POST', 'PUT', 'PATCH'];
    if (methodsRequiringBody.includes(step.method.toUpperCase())) {
      if (!step.body || (typeof step.body === 'object' && Object.keys(step.body).length === 0)) {
        // This is a warning, not a hard failure - some APIs accept empty bodies
        logger.warn(`${step.method} request has no body: ${step.url}`);
      }
    }

    return { valid: true };
  }

  /**
   * Generate HTTP test from QA task with validation (Enhanced in Issue #4)
   */
  private generateHTTPTest(
    task: QATask,
    testNumber: number
  ): GeneratedHTTPTest | null {
    const testId = `TC-${String(testNumber).padStart(3, '0')}`;
    
    // Find matching route
    const route = this.findRouteForTask(task);
    
    if (!route) {
      logger.warn(`No route found for task ${task.taskId}`);
      return this.createUncertainTest(task, testNumber);
    }
    
    // Generate test steps
    const steps = this.generateTestSteps(task, route, testId);
    
    if (steps.length === 0) {
      return this.createUncertainTest(task, testNumber);
    }

    // Validate each step before marking test as ready (Issue #4)
    for (const step of steps) {
      const validation = this.validateTestStep(step);
      if (!validation.valid) {
        logger.warn(`Test validation failed for ${testId}: ${validation.reason}`);
        return {
          id: testId,
          acceptanceCriterionId: task.acceptanceCriterionId,
          acceptanceCriterionText: (task as any).acceptanceCriterionText, // Include AC text for traceability
          qaTaskId: task.taskId,
          title: task.title,
          type: 'api',
          status: 'uncertain',
          uncertainReason: `Validation failed: ${validation.reason}`,
          generatedBy: (task as any).generatedBy || 'unknown', // Track generation source
          steps
        };
      }
    }
    
    // All validations passed - mark as ready (Issue #8: Include AC metadata)
    return {
      id: testId,
      acceptanceCriterionId: task.acceptanceCriterionId,
      acceptanceCriterionText: (task as any).acceptanceCriterionText, // Include AC text for traceability
      qaTaskId: task.taskId,
      title: task.title,
      type: 'api',
      status: 'ready',
      uncertainReason: null,
      generatedBy: (task as any).generatedBy || 'unknown', // Track generation source
      steps
    };
  }
  /**
   * Detect if a test needs setup (Issue #7)
   */
  private detectSetupRequirement(
    task: QATask,
    method: string,
    path: string
  ): {
    needsSetup: boolean;
    setupType: 'create' | 'none';
    resourceType?: string;
    captureVariable?: string;
  } {
    const description = task.title.toLowerCase();
    const expectedResult = task.expectedResult.toLowerCase();
    const methodUpper = method.toUpperCase();
    
    // Extract resource type from path (e.g., /users/{id} -> users)
    const pathMatch = path.match(/^\/([^\/\{]+)/);
    const resourceType = pathMatch ? pathMatch[1] : undefined;
    
    // Scenarios that DON'T need setup (testing missing resources)
    const isNotFoundTest = 
      expectedResult.includes('not found') ||
      expectedResult.includes('404') ||
      description.includes('non-existent') ||
      description.includes('missing') ||
      description.includes('does not exist');
    
    if (isNotFoundTest) {
      return { needsSetup: false, setupType: 'none' };
    }
    
    // Scenarios that NEED setup (testing existing resources)
    
    // 1. Update existing resource (PUT/PATCH on /{id})
    const isUpdateExisting = 
      (methodUpper === 'PUT' || methodUpper === 'PATCH') &&
      (path.includes('{id}') || path.includes(':id') || path.includes('/<')) &&
      !isNotFoundTest;
    
    // 2. Delete existing resource
    const isDeleteExisting = 
      methodUpper === 'DELETE' &&
      (path.includes('{id}') || path.includes(':id') || path.includes('/<')) &&
      !isNotFoundTest;
    
    // 3. Get existing resource
    const isGetExisting = 
      methodUpper === 'GET' &&
      (path.includes('{id}') || path.includes(':id') || path.includes('/<')) &&
      (description.includes('existing') || description.includes('retrieve') || 
       description.includes('fetch') || description.includes('get')) &&
      !isNotFoundTest;
    
    // 4. Duplicate/conflict test (POST with duplicate key)
    const isDuplicateTest = 
      methodUpper === 'POST' &&
      (description.includes('duplicate') || description.includes('conflict') ||
       description.includes('already exists') || expectedResult.includes('409') ||
       expectedResult.includes('conflict'));
    
    if (isUpdateExisting || isDeleteExisting || isGetExisting || isDuplicateTest) {
      const captureVariable = isDuplicateTest ? 'duplicateKey' : 'createdId';
      return {
        needsSetup: true,
        setupType: 'create',
        resourceType,
        captureVariable
      };
    }
    
    return { needsSetup: false, setupType: 'none' };
  }

  /**
   * Generate setup step for creating a resource (Issue #7)
   */
  private generateSetupStep(
    resourceType: string | undefined,
    captureVariable: string,
    testId: string,
    task: QATask
  ): HTTPTestStep | null {
    if (!resourceType) {
      logger.warn('Cannot generate setup: no resource type identified');
      return null;
    }
    
    // Find POST route for creating the resource
    const createRoute = this.routes.find(r => 
      r.method.toUpperCase() === 'POST' &&
      r.path.toLowerCase().includes(`/${resourceType.toLowerCase()}`) &&
      !r.path.includes('{id}') &&
      !r.path.includes(':id') &&
      !r.path.includes('/<')
    );
    
    if (!createRoute) {
      logger.warn(`Cannot generate setup: no POST route found for ${resourceType}`);
      return null;
    }
    
    // Generate request body using existing body generator
    const bodyResult = generateRequestBody(
      'POST',
      createRoute,
      task,
      { id: task.acceptanceCriterionId, description: task.title, priority: 'high' },
      { sampleData: {} } as any, // Minimal config
      undefined, // No OpenAPI spec
      undefined, // No IBM suggested body
      undefined  // No context data
    );
    
    if (!bodyResult.body || Object.keys(bodyResult.body).length === 0) {
      logger.warn('Cannot generate setup: failed to generate request body');
      return null;
    }
    
    // Build setup URL
    const setupUrl = this.buildURL(createRoute.path);
    
    // Define variable extraction based on capture type
    const captureVariables: VariableExtraction[] = [];
    
    if (captureVariable === 'createdId') {
      // Try multiple ID capture strategies (priority order)
      captureVariables.push(
        // 1. From Location header
        { name: 'createdId', source: 'headers', path: 'location' },
        // 2. From response body id field
        { name: 'createdId', source: 'body', path: 'id' },
        // 3. From response body _id field (MongoDB)
        { name: 'createdId', source: 'body', path: '_id' },
        // 4. From response body uuid field
        { name: 'createdId', source: 'body', path: 'uuid' }
      );
    } else if (captureVariable === 'duplicateKey') {
      // For duplicate tests, capture the unique key from request body
      // Find unique fields (email, username, etc.)
      const uniqueFields = ['email', 'username', 'name', 'key', 'code'];
      for (const field of uniqueFields) {
        if (bodyResult.body[field]) {
          captureVariables.push({
            name: 'duplicateKey',
            source: 'body',
            path: field
          });
          break;
        }
      }
    }
    
    const setupStep: HTTPTestStep = {
      stepId: `${testId}-SETUP`,
      description: `Setup: Create ${resourceType} for test`,
      method: 'POST',
      url: setupUrl,
      headers: { 'Content-Type': 'application/json' },
      body: bodyResult.body,
      expectedStatus: 201,
      acceptableStatuses: [200, 201],
      captureVariables: captureVariables.length > 0 ? captureVariables : undefined
    };
    
    logger.debug(`Generated setup step for ${resourceType}`, {
      url: setupUrl,
      captureVariable,
      captureCount: captureVariables.length
    });
    
    return setupStep;
  }

  /**
   * Apply variable substitution to URL (Issue #7)
   */
  private applyVariableSubstitution(url: string, captureVariable: string): string {
    // Replace path parameters with captured variable
    const patterns = [
      /\{id\}/g,
      /:id\b/g,
      /<[^>]+>/g,
      /\/\d+$/  // Trailing numeric ID
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        url = url.replace(pattern, `{{${captureVariable}}}`);
        break;
      }
    }
    
    return url;
  }


  /**
   * Generate test steps for HTTP test with schema support (Issue #2)
   * Body assertions are advisory by default (Issue #6)
   * Setup/capture for stateful tests (Issue #7)
   */
  private generateTestSteps(
    task: QATask,
    route: DiscoveredRoute,
    testId: string
  ): HTTPTestStep[] {
    const steps: HTTPTestStep[] = [];
    
    // Check if test needs setup (Issue #7)
    const setupRequirement = this.detectSetupRequirement(task, route.method, route.path);
    
    // Generate setup step if needed
    if (setupRequirement.needsSetup && setupRequirement.resourceType && setupRequirement.captureVariable) {
      const setupStep = this.generateSetupStep(
        setupRequirement.resourceType,
        setupRequirement.captureVariable,
        testId,
        task
      );
      
      if (setupStep) {
        steps.push(setupStep);
        logger.info(`Added setup step for ${task.taskId}: ${setupStep.description}`);
      } else {
        // Could not generate setup - mark test as uncertain
        logger.warn(`Could not generate setup for ${task.taskId}, test may be uncertain`);
      }
    }
    
    // Build main test step
    const stepId = setupRequirement.needsSetup ? `${testId}-S1` : `${testId}-S1`;
    
    // Build URL with variable substitution if setup was created
    let url = this.buildURL(route.path);
    if (setupRequirement.needsSetup && setupRequirement.captureVariable) {
      url = this.applyVariableSubstitution(url, setupRequirement.captureVariable);
    }
    
    // Determine expected status using schema if available (Issue #2)
    const expectedStatus = this.inferExpectedStatus(route.method, task, route);
    const acceptableStatuses = this.getAcceptableStatuses(route.method, expectedStatus, route);
    
    // Build request body using schema if available (Issue #2)
    let body = this.buildRequestBody(route.method, task, route);
    
    // For duplicate tests, reuse the same body from setup
    if (setupRequirement.needsSetup && setupRequirement.captureVariable === 'duplicateKey' && steps.length > 0) {
      // Use the same body as setup step to trigger duplicate/conflict
      body = steps[0].body;
    }
    
    // Determine if body assertions should be critical based on AC requirements
    const bodyAssertionsCritical = this.shouldBodyAssertionsBeCritical(task);
    
    // Generate expected body patterns if needed (advisory by default)
    const expectedBodyContains = this.generateExpectedBodyPatterns(task, expectedStatus);
    
    steps.push({
      stepId,
      description: task.steps[0]?.description || `Test ${route.method} ${route.path}`,
      method: route.method as HTTPTestStep['method'],
      url,
      headers: { 'Content-Type': 'application/json' },
      body,
      expectedStatus,
      acceptableStatuses,
      bodyAssertionsCritical,
      expectedBodyContains: expectedBodyContains.length > 0 ? expectedBodyContains : undefined,
      expectedBodySchema: route.responseSchema
    });
    
    return steps;
  }

  /**
   * Determine if body assertions should be critical based on acceptance criteria
   * Returns true only if AC explicitly requires exact text match
   */
  private shouldBodyAssertionsBeCritical(task: QATask): boolean {
    const expectedResult = task.expectedResult.toLowerCase();
    const title = task.title.toLowerCase();
    
    // Body assertions are critical only if AC explicitly requires exact text
    const requiresExactText =
      expectedResult.includes('returns error message') ||
      expectedResult.includes('exact message') ||
      expectedResult.includes('specific text') ||
      title.includes('exact message') ||
      title.includes('specific error');
    
    return requiresExactText;
  }

  /**
   * Generate expected body patterns based on task requirements
   * These are advisory by default unless AC requires exact match
   */
  private generateExpectedBodyPatterns(task: QATask, expectedStatus: number): string[] {
    const patterns: string[] = [];
    const expectedResult = task.expectedResult.toLowerCase();
    
    // For error responses, add common error indicators (advisory)
    if (expectedStatus >= 400) {
      if (expectedResult.includes('not found')) {
        patterns.push('not found');
      } else if (expectedResult.includes('unauthorized') || expectedResult.includes('login')) {
        patterns.push('unauthorized');
      } else if (expectedResult.includes('forbidden') || expectedResult.includes('denied')) {
        patterns.push('forbidden');
      } else if (expectedResult.includes('invalid') || expectedResult.includes('validation')) {
        patterns.push('invalid');
      } else if (expectedResult.includes('error')) {
        patterns.push('error');
      }
    }
    
    return patterns;
  }

  /**
   * Find route for QA task
   */
  private findRouteForTask(task: QATask): DiscoveredRoute | null {
    // Try to match based on task title and steps
    const taskText = `${task.title} ${task.steps.map(s => s.description).join(' ')}`.toLowerCase();
    
    for (const route of this.routes) {
      if (taskText.includes(route.path.toLowerCase())) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * Build full URL from path
   */
  private buildURL(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  /**
   * Infer expected status from method, task, route code hints, and OpenAPI schema (Issue #2)
   * EVIDENCE-BASED: prioritize OpenAPI schema, then source code hints, then HTTP semantics
   */
  private inferExpectedStatus(method: string, task: QATask, route?: DiscoveredRoute): number {
    const expectedResult = task.expectedResult.toLowerCase();
    
    // Priority 1: Use OpenAPI response schema if available (Issue #2)
    if (route?.responseSchema) {
      const statusCodes = Object.keys(route.responseSchema).map(code => parseInt(code, 10));
      const isFailureScenario = expectedResult.includes('error') ||
                               expectedResult.includes('fail') ||
                               expectedResult.includes('invalid');
      
      if (isFailureScenario) {
        // Look for error status codes (4xx, 5xx)
        const errorStatuses = statusCodes.filter(code => code >= 400);
        if (errorStatuses.length > 0) {
          // Match specific error types
          if (expectedResult.includes('not found')) {
            return errorStatuses.find(code => code === 404) || errorStatuses[0];
          }
          if (expectedResult.includes('unauthorized')) {
            return errorStatuses.find(code => code === 401) || errorStatuses[0];
          }
          if (expectedResult.includes('forbidden') || expectedResult.includes('denied')) {
            return errorStatuses.find(code => code === 403) || errorStatuses[0];
          }
          if (expectedResult.includes('conflict') || expectedResult.includes('duplicate')) {
            return errorStatuses.find(code => code === 409) || errorStatuses[0];
          }
          if (expectedResult.includes('validation')) {
            return errorStatuses.find(code => code === 422 || code === 400) || errorStatuses[0];
          }
          return errorStatuses[0];
        }
      } else {
        // Look for success status codes (2xx)
        const successStatuses = statusCodes.filter(code => code >= 200 && code < 300);
        if (successStatuses.length > 0) {
          return successStatuses[0];
        }
      }
    }
    
    // Priority 2: Look for explicit error status codes in validation hints
    const routes = this.routes.filter(r => r.method?.toUpperCase() === method.toUpperCase());
    for (const r of routes) {
      const hints = (r as any)?.validationSnippets || [];
      const snippet = (r as any)?.sourceSnippet || '';
      const allCode = (hints.join(' ') + snippet).toLowerCase();
      
      // Look for explicit status codes in source code
      const statusCodeMatch = allCode.match(/(?:status|res.*)\((\d{3})\)|res\.status\((\d{3})\)/);
      if (statusCodeMatch) {
        const code = parseInt(statusCodeMatch[1] || statusCodeMatch[2]);
        if (expectedResult.includes('error') || expectedResult.includes('fail') || expectedResult.includes('invalid')) {
          if (code >= 400) return code;
        }
      }
      
      // If no explicit code found, use HTTP semantic conventions
      if (expectedResult.includes('not found')) return 404;
      if (expectedResult.includes('forbidden') || expectedResult.includes('denied')) return 403;
    }
    
    // Priority 3: Default behavior based on method and expected result
    if (expectedResult.includes('error') || expectedResult.includes('fail') || expectedResult.includes('invalid')) {
      return 400; // Generic client error
    }
    
    // Success scenarios
    switch (method.toUpperCase()) {
      case 'POST': return 201;
      case 'PUT': return 200;
      case 'PATCH': return 200;
      case 'DELETE': return 204;
      case 'GET': return 200;
      default: return 200;
    }
  }

  /**
   * Get acceptable status codes with schema awareness (Issue #2)
   */
  private getAcceptableStatuses(method: string, expectedStatus: number, route?: DiscoveredRoute): number[] {
    // If schema defines multiple success statuses, include them all
    if (route?.responseSchema) {
      const statusCodes = Object.keys(route.responseSchema).map(code => parseInt(code, 10));
      const successStatuses = statusCodes.filter(code => code >= 200 && code < 300);
      
      // If expected status is a success status and schema has multiple success statuses
      if (expectedStatus >= 200 && expectedStatus < 300 && successStatuses.length > 1) {
        return successStatuses;
      }
    }
    
    // Fallback to generic acceptable statuses
    switch (method.toUpperCase()) {
      case 'POST':
        return expectedStatus === 201 ? [200, 201] : [expectedStatus];
      case 'PUT':
      case 'PATCH':
        return [200, 204];
      case 'DELETE':
        return [200, 204];
      default:
        return [expectedStatus];
    }
  }

  /**
   * Build request body with schema awareness (Issue #2)
   */
  private buildRequestBody(method: string, task: QATask, route?: DiscoveredRoute): any {
    if (['GET', 'DELETE', 'HEAD'].includes(method.toUpperCase())) {
      return undefined;
    }
    
    // Use setup data if available
    if (task.setupData && Object.keys(task.setupData).length > 0) {
      return task.setupData;
    }
    
    // Use schema to generate minimal valid body (Issue #2)
    if (route?.requestSchema) {
      const body: any = {};
      const required = route.requestSchema.required || [];
      const properties = route.requestSchema.properties || {};
      
      // Add required fields with placeholder values
      for (const fieldName of required) {
        const fieldSchema = properties[fieldName];
        if (fieldSchema) {
          body[fieldName] = this.generateValueFromSchema(fieldSchema);
        } else {
          body[fieldName] = null; // Unknown required field
        }
      }
      
      // If we generated any fields, return the body
      if (Object.keys(body).length > 0) {
        logger.debug(`Generated request body from schema for ${route.method} ${route.path}`, body);
        return body;
      }
    }
    
    return {};
  }

  /**
   * Generate a placeholder value based on schema type (Issue #2)
   */
  private generateValueFromSchema(schema: any): any {
    if (!schema) return null;
    
    // Handle enum values
    if (schema.enum && schema.enum.length > 0) {
      return schema.enum[0];
    }
    
    // Handle type-based generation
    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'date-time') return new Date().toISOString();
        return schema.example || 'test-value';
      case 'number':
      case 'integer':
        return schema.example || schema.minimum || 0;
      case 'boolean':
        return schema.example !== undefined ? schema.example : true;
      case 'array':
        return schema.example || [];
      case 'object':
        return schema.example || {};
      default:
        return null;
    }
  }

  /**
   * Create uncertain test placeholder
   */
  private createUncertainTest(task: QATask, testNumber: number): GeneratedHTTPTest {
    const testId = `TC-${String(testNumber).padStart(3, '0')}`;
    
    return {
      id: testId,
      acceptanceCriterionId: task.acceptanceCriterionId,
      qaTaskId: task.taskId,
      title: task.title,
      type: 'api',
      status: 'uncertain',
      uncertainReason: task.uncertainReason || 'Could not generate executable HTTP test',
      steps: []
    };
  }

  /**
   * Create manual test placeholder
   */
  private createManualTest(task: QATask, testNumber: number): GeneratedHTTPTest {
    const testId = `TC-${String(testNumber).padStart(3, '0')}`;
    
    return {
      id: testId,
      acceptanceCriterionId: task.acceptanceCriterionId,
      qaTaskId: task.taskId,
      title: task.title,
      type: 'api',
      status: 'manual',
      uncertainReason: 'Requires manual testing',
      steps: []
    };
  }

  /**
   * Calculate test summary statistics
   */
  private calculateTestSummary(tests: GeneratedHTTPTest[]) {
    return {
      totalGenerated: tests.length,
      totalTests: tests.length,
      readyTests: tests.filter(t => t.status === 'ready').length,
      uncertainTests: tests.filter(t => t.status === 'uncertain').length,
      manualTests: tests.filter(t => t.status === 'manual').length
    };
  }
}

// Made with Bob
