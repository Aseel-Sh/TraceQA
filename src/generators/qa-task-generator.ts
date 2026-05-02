import { 
  QATask, 
  QATaskPlan, 
  GeneratedHTTPTest, 
  GeneratedHTTPTestSuite,
  HTTPTestStep,
  AcceptanceCriterion,
  DiscoveredRoute,
  TestStatus
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Generates deterministic QA task plans from acceptance criteria and AI suggestions
 */
export class QATaskGenerator {
  private baseUrl: string;
  private routes: DiscoveredRoute[];
  
  constructor(baseUrl: string, routes: DiscoveredRoute[]) {
    this.baseUrl = baseUrl;
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
   * Normalize AI task to QATask schema
   */
  private normalizeAITask(
    aiTask: any,
    criterion: AcceptanceCriterion,
    taskNumber: number
  ): QATask {
    const taskId = `QA-${String(taskNumber).padStart(3, '0')}`;
    
    // Determine execution mode
    let executionMode: 'automated' | 'manual' | 'uncertain' = 'automated';
    let uncertainReason: string | undefined;
    
    if (aiTask.executionMode === 'manual' || aiTask.type === 'manual') {
      executionMode = 'manual';
    } else if (aiTask.executionMode === 'uncertain' || aiTask.type === 'uncertain') {
      executionMode = 'uncertain';
      uncertainReason = aiTask.uncertainReason || 'AI marked as uncertain';
    }
    
    return {
      taskId,
      acceptanceCriterionId: criterion.id,
      title: aiTask.title || criterion.description,
      type: this.normalizeTaskType(aiTask.type),
      priority: this.normalizePriority(aiTask.priority),
      preconditions: Array.isArray(aiTask.preconditions) ? aiTask.preconditions : [],
      setupData: aiTask.setupData || {},
      steps: Array.isArray(aiTask.steps) ? aiTask.steps : [],
      expectedResult: aiTask.expectedResult || '',
      executionMode,
      reasoning: aiTask.reasoning || 'Generated from acceptance criterion',
      uncertainReason
    };
  }

  /**
   * Generate deterministic task when AI fails or is unavailable
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
        reasoning: `Matched to discovered route: ${matchedRoute.method} ${matchedRoute.path}`
      };
    } else {
      // Cannot safely automate - mark as uncertain
      return {
        taskId,
        acceptanceCriterionId: criterion.id,
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
        uncertainReason: 'Could not map to discovered API routes'
      };
    }
  }

  /**
   * Find matching route for acceptance criterion
   */
  private findMatchingRoute(criterion: AcceptanceCriterion): DiscoveredRoute | null {
    const criterionText = criterion.description.toLowerCase();
    
    for (const route of this.routes) {
      const routeText = `${route.method} ${route.path} ${route.description || ''}`.toLowerCase();
      
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
  
  constructor(baseUrl: string, routes: DiscoveredRoute[]) {
    this.baseUrl = baseUrl;
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
   * Generate HTTP test from QA task
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
    
    return {
      id: testId,
      acceptanceCriterionId: task.acceptanceCriterionId,
      qaTaskId: task.taskId,
      title: task.title,
      type: 'api',
      status: 'ready',
      uncertainReason: null,
      steps
    };
  }

  /**
   * Generate test steps for HTTP test
   */
  private generateTestSteps(
    task: QATask,
    route: DiscoveredRoute,
    testId: string
  ): HTTPTestStep[] {
    const steps: HTTPTestStep[] = [];
    const stepId = `${testId}-S1`;
    
    // Build URL
    const url = this.buildURL(route.path);
    
    // Determine expected status
    const expectedStatus = this.inferExpectedStatus(route.method, task);
    const acceptableStatuses = this.getAcceptableStatuses(route.method, expectedStatus);
    
    // Build request body if needed
    const body = this.buildRequestBody(route.method, task);
    
    steps.push({
      stepId,
      description: task.steps[0]?.description || `Test ${route.method} ${route.path}`,
      method: route.method,
      url,
      headers: { 'Content-Type': 'application/json' },
      body,
      expectedStatus,
      acceptableStatuses
    });
    
    return steps;
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
   * Infer expected status from method and task
   */
  private inferExpectedStatus(method: string, task: QATask): number {
    const expectedResult = task.expectedResult.toLowerCase();
    
    // Check for explicit failure scenarios
    if (expectedResult.includes('invalid') || expectedResult.includes('error')) {
      if (expectedResult.includes('unauthorized') || expectedResult.includes('auth')) {
        return 401;
      }
      if (expectedResult.includes('not found')) {
        return 404;
      }
      if (expectedResult.includes('conflict') || expectedResult.includes('duplicate')) {
        return 409;
      }
      return 400; // Generic validation error
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
   * Get acceptable status codes
   */
  private getAcceptableStatuses(method: string, expectedStatus: number): number[] {
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
   * Build request body
   */
  private buildRequestBody(method: string, task: QATask): any {
    if (['GET', 'DELETE', 'HEAD'].includes(method.toUpperCase())) {
      return undefined;
    }
    
    // Use setup data if available
    if (task.setupData && Object.keys(task.setupData).length > 0) {
      return task.setupData;
    }
    
    return {};
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
      totalTests: tests.length,
      readyTests: tests.filter(t => t.status === 'ready').length,
      uncertainTests: tests.filter(t => t.status === 'uncertain').length,
      manualTests: tests.filter(t => t.status === 'manual').length
    };
  }
}

// Made with Bob
