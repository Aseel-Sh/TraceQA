**User:**

<task>
Create a new file [`src/generators/qa-task-generator.ts`](src/generators/qa-task-generator.ts) for QA task plan generation and HTTP test generation.

**Context**: This new module will handle the deterministic generation of QA task plans and HTTP tests, separating AI planning from executable test generation.

**Required Implementation**:

Create a new file with these classes and methods:

```typescript
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
      title: aiTask.title || criterion.criterion,
      type: this.normalizeTaskType(aiTask.type),
      priority: this.normalizePriority(aiTask.priority),
      preconditions: Array.isArray(aiTask.preconditions) ? aiTask.preconditions : [],
      setupData: aiTask.setupData || {},
      steps: Array.isArray(aiTask.steps) ? aiTask.steps : [],
      expectedResult: aiTask.expectedResult || criterion.expectedResult || '',
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
        title: criterion.criterion,
        type: 'api',
        priority: 'high',
        preconditions: [],
        setupData: {},
        steps: [{
          description: `Test ${matchedRoute.method} ${matchedRoute.path}`,
          action: `Send ${matchedRoute.method} request to ${matchedRoute.path}`,
          expectedOutcome: criterion.expectedResult || 'Request succeeds'
        }],
        expectedResult: criterion.expectedResult || 'Request succeeds',
        executionMode: 'automated',
        reasoning: `Matched to discovered route: ${matchedRoute.method} ${matchedRoute.path}`
      };
    } else {
      // Cannot safely automate - mark as uncertain
      return {
        taskId,
        acceptanceCriterionId: criterion.id,
        title: criterion.criterion,
        type: 'uncertain',
        priority: 'medium',
        preconditions: [],
        setupData: {},
        steps: [{
          description: criterion.criterion,
          expectedOutcome: criterion.expectedResult || 'Criterion is met'
        }],
        expectedResult: criterion.expectedResult || 'Criterion is met',
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
    const criterionText = `${criterion.criterion} ${criterion.expectedResult || ''}`.toLowerCase();
    
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
```

**Important Constraints**:
- Do NOT run any commands or tests
- Create new file [`src/generators/qa-task-generator.ts`](src/generators/qa-task-generator.ts)
- Use the new types from types/index.ts
- Implement deterministic generation logic
- Handle AI failures gracefully
- Use generic HTTP semantics (no hardcoded routes)

**Completion**:
When done, use `attempt_completion` with a summary of:
- Classes created
- Key methods implemented
- How it handles AI failures

These instructions supersede any conflicting general instructions your mode might have.
</task>
<environment_details>
# VSCode Visible Files
src\types\index.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:18:39.757Z
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
TECHNICAL_SPEC.md
test-acceptance-parser.ts
test-build-system.ts
test-ibm-integration.ts
test-post-fix.ts
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

I'll create the new file `src/generators/qa-task-generator.ts` with the QA task plan generation and HTTP test generation classes.

<write_to_file>
<path>src/generators/qa-task-generator.ts</path>
<content>
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
      title: aiTask.title || criterion.criterion,
      type: this.normalizeTaskType(aiTask.type),
      priority: this.normalizePriority(aiTask.priority),
      preconditions: Array.isArray(aiTask.preconditions) ? aiTask.preconditions : [],
      setupData: aiTask.setupData || {},
      steps: Array.isArray(aiTask.steps) ? aiTask.steps : [],
      expectedResult: aiTask.expectedResult || criterion.expectedResult || '',
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
        title: criterion.criterion,
        type: 'api',
        priority: 'high',
        preconditions: [],
        setupData: {},
        steps: [{
          description: `Test ${matchedRoute.method} ${matchedRoute.path}`,
          action: `Send ${matchedRoute.method} request to ${matchedRoute.path}`,
          expectedOutcome: criterion.expectedResult || 'Request succeeds'
        }],
        expectedResult: criterion.expectedResult || 'Request succeeds',
        executionMode: 'automated',
        reasoning: `Matched to discovered route: ${matchedRoute.method} ${matchedRoute.path}`
      };
    } else {
      // Cannot safely automate - mark as uncertain
      return {
        taskId,
        acceptanceCriterionId: criterion.id,
        title: criterion.criterion,
        type: 'uncertain',
        priority: 'medium',
        preconditions: [],
        setupData: {},
        steps: [{
          description: criterion.criterion,
          expectedOutcome: criterion.expectedResult || 'Criterion is met'
        }],
        expectedResult: criterion.expectedResult || 'Criterion is met',
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
    const criterionText = `${criterion.criterion} ${criterion.expectedResult || ''}`.toLowerCase();
    
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
</content>
<line_count>485</line_count>
</write_to_file>

<attempt_completion>
<result>
Successfully created `src/generators/qa-task-generator.ts` with two main classes:

## Classes Created:

### 1. QATaskGenerator
Generates deterministic QA task plans from acceptance criteria with optional AI suggestions.

**Key Methods:**
- `generateTaskPlan()`

[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]

---

**User:**

[write_to_file for 'src/generators/qa-task-generator.ts'] Result:
<file_write_result>
<path>src/generators/qa-task-generator.ts</path>
<operation>created</operation>
<problems>

New problems detected after saving the file:
src/generators/qa-task-generator.ts
- [ts Error] 101 |       title: aiTask.title || criterion.criterion, : Property 'criterion' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 107 |       expectedResult: aiTask.expectedResult || criterion.expectedResult || '', : Property 'expectedResult' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 131 |         title: criterion.criterion, : Property 'criterion' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 139 |           expectedOutcome: criterion.expectedResult || 'Request succeeds' : Property 'expectedResult' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 141 |         expectedResult: criterion.expectedResult || 'Request succeeds', : Property 'expectedResult' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 150 |         title: criterion.criterion, : Property 'criterion' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 156 |           description: criterion.criterion, : Property 'criterion' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 157 |           expectedOutcome: criterion.expectedResult || 'Criterion is met' : Property 'expectedResult' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 159 |         expectedResult: criterion.expectedResult || 'Criterion is met', : Property 'expectedResult' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 171 |     const criterionText = `${criterion.criterion} ${criterion.expectedResult || ''}`.toLowerCase(); : Property 'criterion' does not exist on type 'AcceptanceCriterion'.
- [ts Error] 171 |     const criterionText = `${criterion.criterion} ${criterion.expectedResult || ''}`.toLowerCase(); : Property 'expectedResult' does not exist on type 'AcceptanceCriterion'.</problems>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

Tool [attempt_completion] was not executed because a tool has already been used in this message. Only one tool may be used per message. You must assess the first tool's result before proceeding to use the next tool.
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:17.801Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.00

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I need to check the AcceptanceCriterion type definition to fix the property name errors.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>1-100</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="1-100">
  1 | /**
  2 |  * TraceQA Type Definitions
  3 |  * Core TypeScript interfaces and types for the TraceQA testing system
  4 |  */
  5 | 
  6 | // ============================================================================
  7 | // Test Configuration Types
  8 | // ============================================================================
  9 | 
 10 | /**
 11 |  * Test type enumeration
 12 |  */
 13 | export enum TestType {
 14 |   WEB_UI = 'ui',
 15 |   API = 'api',
 16 |   INTEGRATION = 'integration',
 17 |   BOTH = 'both'
 18 | }
 19 | 
 20 | /**
 21 |  * Main test configuration interface
 22 |  */
 23 | export interface TestConfig {
 24 |   repository: RepositoryInfo;
 25 |   testType: TestType;
 26 |   description: string;
 27 |   acceptanceCriteria?: string[];
 28 |   branch?: string;
 29 |   autoApprove?: boolean;
 30 |   outputDir?: string;
 31 |   baseUrl?: string;
 32 | }
 33 | 
 34 | // ============================================================================
 35 | // Repository Types
 36 | // ============================================================================
 37 | 
 38 | /**
 39 |  * Repository information
 40 |  */
 41 | export interface RepositoryInfo {
 42 |   path: string;
 43 |   name: string;
 44 |   branch: string;
 45 |   remote?: string;
 46 | }
 47 | 
 48 | /**
 49 |  * File change information
 50 |  */
 51 | export interface FileChange {
 52 |   path: string;
 53 |   type: 'added' | 'modified' | 'deleted' | 'renamed';
 54 |   additions: number;
 55 |   deletions: number;
 56 | }
 57 | 
 58 | /**
 59 |  * Change set information
 60 |  */
 61 | export interface ChangeSet {
 62 |   files: FileChange[];
 63 |   summary: string;
 64 |   additions: number;
 65 |   deletions: number;
 66 |   diff: string;
 67 | }
 68 | 
 69 | // ============================================================================
 70 | // Test Context Types
 71 | // ============================================================================
 72 | 
 73 | /**
 74 |  * Complete test context
 75 |  */
 76 | export interface TestContext {
 77 |   repository: RepositoryInfo;
 78 |   changes: ChangeSet;
 79 |   description: string;
 80 |   acceptanceCriteria?: string[];
 81 |   buildInfo: BuildInfo;
 82 | }
 83 | 
 84 | /**
 85 |  * Build information
 86 |  */
 87 | export interface BuildInfo {
 88 |   framework: string;
 89 |   language: string;
 90 |   buildCommand?: string;
 91 |   testCommand?: string;
 92 |   startCommand?: string;
 93 |   port?: number;
 94 |   success: boolean;
 95 |   duration?: number;
 96 |   output?: string;
 97 | }
 98 | 
 99 | // ============================================================================
100 | // Test Plan Types
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:21.091Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.03

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I need to see more of the types file to find the AcceptanceCriterion definition.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>100-250</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="100-250">
100 | // Test Plan Types
101 | // ============================================================================
102 | 
103 | /**
104 |  * Test plan generated by the agent
105 |  */
106 | export interface TestPlan {
107 |   id: string;
108 |   testCases: TestCase[];
109 |   estimatedDuration: number;
110 |   requiredResources: string[];
111 |   createdAt: string;
112 | }
113 | 
114 | /**
115 |  * Individual test case
116 |  */
117 | export interface TestCase {
118 |   id: string;
119 |   name: string;
120 |   description: string;
121 |   type: TestType;
122 |   steps: TestStep[];
123 |   expectedResult: string;
124 |   priority?: 'high' | 'medium' | 'low';
125 | }
126 | 
127 | /**
128 |  * Test step within a test case
129 |  */
130 | export interface TestStep {
131 |   action: string;
132 |   target?: string;
133 |   value?: string;
134 |   description: string;
135 | }
136 | 
137 | // ============================================================================
138 | // Test Result Types
139 | // ============================================================================
140 | 
141 | /**
142 |  * Result of a single test case
143 |  */
144 | export interface TestResult {
145 |   testCaseId: string;
146 |   testCaseName: string;
147 |   passed: boolean;
148 |   duration: number;
149 |   message: string;
150 |   error?: string;
151 |   screenshots?: string[];
152 |   logs?: string[];
153 |   timestamp: string;
154 |   acceptanceCriterionId?: string;
155 | }
156 | 
157 | /**
158 |  * Summary of all test results
159 |  */
160 | export interface TestSummary {
161 |   total: number;
162 |   passed: number;
163 |   failed: number;
164 |   skipped: number;
165 |   duration: number;
166 |   successRate: number;
167 | }
168 | 
169 | /**
170 |  * Complete test results
171 |  */
172 | export interface TestResults {
173 |   summary: TestSummary;
174 |   results: TestResult[];
175 |   duration: number;
176 |   timestamp: string;
177 |   repository: RepositoryInfo;
178 |   testPlan: TestPlan;
179 | }
180 | // ============================================================================
181 | // Acceptance Criteria Types
182 | // ============================================================================
183 | 
184 | /**
185 |  * Parsed acceptance criterion
186 |  */
187 | export interface AcceptanceCriterion {
188 |   id: string;
189 |   description: string;
190 |   priority?: 'high' | 'medium' | 'low';
191 | }
192 | 
193 | /**
194 |  * Parsed acceptance criteria from markdown
195 |  */
196 | export interface ParsedAcceptanceCriteria {
197 |   criteria: AcceptanceCriterion[];
198 |   rawContent: string;
199 | }
200 | 
201 | // ============================================================================
202 | // Executable Test Types
203 | // ============================================================================
204 | 
205 | /**
206 |  * Executable HTTP test
207 |  */
208 | export interface ExecutableHTTPTest {
209 |   id: string;
210 |   acceptanceCriterionId: string;
211 |   title: string;
212 |   method: string;
213 |   url: string;
214 |   headers?: Record<string, string>;
215 |   body?: any;
216 |   expectedStatus: number;
217 |   expectedBodyContains?: string[];
218 |   expectedBodySchema?: any;
219 | }
220 | 
221 | /**
222 |  * Generated test artifacts
223 |  */
224 | export interface GeneratedTestArtifacts {
225 |   qaTaskPlan: any;
226 |   httpTests: ExecutableHTTPTest[];
227 |   generatedAt: string;
228 |   metadata: {
229 |     totalTests: number;
230 |     apiTests: number;
231 |     manualTests: number;
232 |   };
233 | }
234 | 
235 | 
236 | // ============================================================================
237 | // CLI Prompt Types
238 | // ============================================================================
239 | 
240 | /**
241 |  * User input from CLI prompts
242 |  */
243 | export interface UserInput {
244 |   repository: string;
245 |   description: string;
246 |   acceptanceCriteria?: string;
247 |   testType: TestType;
248 |   confirmed: boolean;
249 | }
250 | 
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:23.678Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.07

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

I can see the issue. The `AcceptanceCriterion` type has `description` property, not `criterion`, and doesn't have `expectedResult`. Let me continue reading to find the QATask and related types.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>250-400</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="250-400">
250 | 
251 | /**
252 |  * Repository selection option
253 |  */
254 | export interface RepositoryOption {
255 |   value: string;
256 |   label: string;
257 |   hint?: string;
258 | }
259 | 
260 | // ============================================================================
261 | // Error Types
262 | // ============================================================================
263 | 
264 | /**
265 |  * TraceQA error categories
266 |  */
267 | export enum ErrorCategory {
268 |   CONFIGURATION = 'configuration',
269 |   REPOSITORY = 'repository',
270 |   BUILD = 'build',
271 |   TEST_EXECUTION = 'test_execution',
272 |   AGENT = 'agent',
273 |   MCP = 'mcp',
274 |   NETWORK = 'network',
275 |   UNKNOWN = 'unknown'
276 | }
277 | 
278 | /**
279 |  * Custom error class for TraceQA
280 |  */
281 | export class TraceQAError extends Error {
282 |   constructor(
283 |     message: string,
284 |     public category: ErrorCategory,
285 |     public details?: unknown
286 |   ) {
287 |     super(message);
288 |     this.name = 'TraceQAError';
289 |   }
290 | }
291 | 
292 | // ============================================================================
293 | // Configuration Types
294 | // ============================================================================
295 | 
296 | /**
297 |  * TraceQA configuration
298 |  */
299 | export interface TraceQAConfig {
300 |   ibmWatsonxApiKey?: string;
301 |   defaultRepository?: string;
302 |   mcpServers?: MCPServerConfig[];
303 |   testTimeout?: number;
304 |   maxRetries?: number;
305 |   reportFormat?: 'json' | 'html' | 'markdown';
306 |   outputDir?: string;
307 | }
308 | 
309 | /**
310 |  * TraceQA project configuration (from traceqa.config.json)
311 |  */
312 | export interface TraceQAProjectConfig {
313 |   // API Configuration
314 |   baseUrl?: string;
315 |   healthUrl?: string;
316 |   openapi?: string;
317 | 
318 |   // Build Configuration
319 |   language?: string;
320 |   projectType?: string;
321 |   installCommand?: string;
322 |   buildCommand?: string;
323 |   startCommand?: string;
324 | 
325 |   // Build Flags
326 |   autoInstall?: boolean;
327 |   autoBuild?: boolean;
328 |   autoStart?: boolean;
329 | 
330 |   // Test Configuration
331 |   testType?: 'ui' | 'api' | 'both' | 'integration';
332 |   outputDir?: string;
333 |   timeout?: number;
334 |   retries?: number;
335 | 
336 |   // IBM watsonx Configuration
337 |   ibmWatsonxApiKey?: string;
338 |   ibmWatsonxProjectId?: string;
339 |   ibmWatsonxUrl?: string;
340 |   ibmWatsonxModel?: string;
341 | }
342 | 
343 | /**
344 |  * MCP server configuration
345 |  */
346 | export interface MCPServerConfig {
347 |   name: string;
348 |   command: string;
349 |   args?: string[];
350 |   env?: Record<string, string>;
351 | }
352 | 
353 | // ============================================================================
354 | // Agent Types
355 | // ============================================================================
356 | 
357 | /**
358 |  * Agent configuration
359 |  */
360 | export interface AgentConfig {
361 |   apiKey: string;
362 |   model?: string;
363 |   maxTokens?: number;
364 |   temperature?: number;
365 |   systemPrompt?: string;
366 |   conversationHistory?: ConversationMessage[];
367 |   timeout?: number;
368 |   maxRetries?: number;
369 |   streamResponses?: boolean;
370 | }
371 | 
372 | /**
373 |  * Agent state tracking
374 |  */
375 | export interface AgentState {
376 |   currentPhase: 'planning' | 'executing' | 'analyzing' | 'reporting' | 'idle';
377 |   conversationHistory: ConversationMessage[];
378 |   testPlan?: TestPlan;
379 |   executedTests: TestResult[];
380 |   pendingDecisions: AgentDecision[];
381 |   tokenUsage: TokenUsage;
382 |   startTime: string;
383 |   lastActivity: string;
384 | }
385 | 
386 | /**
387 |  * Conversation message for agent communication
388 |  */
389 | export interface ConversationMessage {
390 |   role: 'user' | 'assistant' | 'system';
391 |   content: string;
392 |   timestamp: string;
393 |   metadata?: {
394 |     tokenCount?: number;
395 |     model?: string;
396 |     finishReason?: string;
397 |   };
398 | }
399 | 
400 | /**
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:26.979Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.11

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Let me continue reading to find the QATask and related types.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>400-600</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="400-600">
400 | /**
401 |  * Token usage tracking
402 |  */
403 | export interface TokenUsage {
404 |   inputTokens: number;
405 |   outputTokens: number;
406 |   totalTokens: number;
407 |   estimatedCost: number;
408 | }
409 | 
410 | /**
411 |  * Agent decision result
412 |  */
413 | export interface AgentDecision {
414 |   action: 'approve' | 'modify' | 'reject' | 'ask_human' | 'retry' | 'continue' | 'abort';
415 |   reasoning: string;
416 |   suggestions?: string[];
417 |   confidence: number;
418 |   nextSteps?: string[];
419 |   requiresHumanInput?: boolean;
420 |   metadata?: Record<string, unknown>;
421 | }
422 | 
423 | /**
424 |  * Agent message for communication (legacy, use ConversationMessage)
425 |  */
426 | export interface AgentMessage {
427 |   role: 'user' | 'assistant' | 'system';
428 |   content: string;
429 |   timestamp: string;
430 | }
431 | 
432 | /**
433 |  * IBM watsonx.ai API response
434 |  */
435 | export interface WatsonxResponse {
436 |   model_id: string;
437 |   created_at: string;
438 |   results: Array<{
439 |     generated_text: string;
440 |     generated_token_count: number;
441 |     input_token_count: number;
442 |     stop_reason: string;
443 |   }>;
444 | }
445 | 
446 | /**
447 |  * IBM watsonx.ai streaming chunk
448 |  */
449 | export interface WatsonxStreamChunk {
450 |   results?: Array<{
451 |     generated_text?: string;
452 |     generated_token_count?: number;
453 |     input_token_count?: number;
454 |     stop_reason?: string;
455 |   }>;
456 |   usage?: {
457 |     input_tokens?: number;
458 |     output_tokens?: number;
459 |   };
460 | }
461 | 
462 | /**
463 |  * Test planning request
464 |  */
465 | export interface TestPlanningRequest {
466 |   context: TestContext;
467 |   requirements: string[];
468 |   constraints?: {
469 |     maxDuration?: number;
470 |     maxTestCases?: number;
471 |     priorityAreas?: string[];
472 |   };
473 | }
474 | 
475 | /**
476 |  * Test execution request
477 |  */
478 | export interface TestExecutionRequest {
479 |   testCase: TestCase;
480 |   context: TestContext;
481 |   retryCount?: number;
482 | }
483 | 
484 | /**
485 |  * Agent analysis result
486 |  */
487 | export interface AgentAnalysis {
488 |   summary: string;
489 |   findings: string[];
490 |   recommendations: string[];
491 |   risks: Array<{
492 |     description: string;
493 |     severity: 'low' | 'medium' | 'high' | 'critical';
494 |     mitigation?: string;
495 |   }>;
496 |   confidence: number;
497 | }
498 | 
499 | /**
500 |  * Agent report generation options
501 |  */
502 | export interface ReportOptions {
503 |   format: 'json' | 'html' | 'markdown';
504 |   includeScreenshots?: boolean;
505 |   includeLogs?: boolean;
506 |   includeTokenUsage?: boolean;
507 |   outputPath?: string;
508 | }
509 | 
510 | // ============================================================================
511 | // Utility Types
512 | // ============================================================================
513 | 
514 | /**
515 |  * Async operation result
516 |  */
517 | export type Result<T, E = Error> = 
518 |   | { success: true; data: T }
519 |   | { success: false; error: E };
520 | 
521 | /**
522 |  * Progress callback type
523 |  */
524 | export type ProgressCallback = (message: string, percentage?: number) => void;
525 | 
526 | /**
527 |  * Log level enumeration
528 |  */
529 | export enum LogLevel {
530 |   DEBUG = 'debug',
531 |   INFO = 'info',
532 |   WARN = 'warn',
533 |   ERROR = 'error',
534 |   SUCCESS = 'success'
535 | }
536 | 
537 | // ============================================================================
538 | // Build System Types (Re-exported from core modules)
539 | // ============================================================================
540 | 
541 | /**
542 |  * Project types for framework detection
543 |  */
544 | export enum ProjectFramework {
545 |   REACT = 'react',
546 |   VUE = 'vue',
547 |   ANGULAR = 'angular',
548 |   NEXT = 'next',
549 |   NUXT = 'nuxt',
550 |   SVELTE = 'svelte',
551 |   NODE_API = 'node-api',
552 |   EXPRESS = 'express',
553 |   FASTIFY = 'fastify',
554 |   NEST = 'nest',
555 |   UNKNOWN = 'unknown',
556 | }
557 | 
558 | /**
559 |  * Package managers
560 |  */
561 | export enum PackageManagerType {
562 |   NPM = 'npm',
563 |   YARN = 'yarn',
564 |   PNPM = 'pnpm',
565 |   BUN = 'bun',
566 | }
567 | 
568 | /**
569 |  * Build modes
570 |  */
571 | export enum BuildMode {
572 |   DEVELOPMENT = 'development',
573 |   PRODUCTION = 'production',
574 |   PREVIEW = 'preview',
575 | }
576 | 
577 | // ============================================================================
578 | // MCP (Model Context Protocol) Types
579 | // ============================================================================
580 | 
581 | /**
582 |  * Browser action enumeration for MCP operations
583 |  */
584 | export enum BrowserAction {
585 |   NAVIGATE = 'navigate',
586 |   CLICK = 'click',
587 |   TYPE = 'type',
588 |   SCREENSHOT = 'screenshot',
589 |   WAIT_FOR_ELEMENT = 'waitForElement',
590 |   EVALUATE = 'evaluate',
591 |   FILL = 'fill',
592 |   SELECT = 'select',
593 |   HOVER = 'hover',
594 |   PRESS = 'press',
595 |   GO_BACK = 'goBack',
596 |   GO_FORWARD = 'goForward',
597 |   RELOAD = 'reload',
598 |   CLOSE = 'close'
599 | }
600 | 
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:29.534Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.16

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Let me continue reading to find the QATask types.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>600-800</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="600-800">
600 | 
601 | /**
602 |  * MCP configuration interface
603 |  */
604 | export interface MCPConfig {
605 |   enableBrowserMCP?: boolean;
606 |   enablePlaywrightMCP?: boolean;
607 |   servers?: MCPServerConfig[];
608 |   timeout?: number;
609 |   retryAttempts?: number;
610 |   retryDelay?: number;
611 |   headless?: boolean;
612 |   slowMo?: number;
613 |   viewport?: {
614 |     width: number;
615 |     height: number;
616 |   };
617 | }
618 | 
619 | /**
620 |  * MCP tool request interface
621 |  */
622 | export interface MCPToolRequest {
623 |   serverName: string;
624 |   toolName: string;
625 |   arguments: Record<string, unknown>;
626 |   timeout?: number;
627 | }
628 | 
629 | /**
630 |  * MCP tool response interface
631 |  */
632 | export interface MCPToolResponse<T = unknown> {
633 |   success: boolean;
634 |   data?: T;
635 |   error?: string;
636 |   metadata?: {
637 |     duration: number;
638 |     timestamp: string;
639 |     serverName: string;
640 |     toolName: string;
641 |   };
642 | }
643 | 
644 | /**
645 |  * Browser state interface
646 |  */
647 | export interface BrowserState {
648 |   url: string;
649 |   title: string;
650 |   isNavigating: boolean;
651 |   viewport: {
652 |     width: number;
653 |     height: number;
654 |   };
655 |   cookies?: Array<{
656 |     name: string;
657 |     value: string;
658 |     domain: string;
659 |   }>;
660 |   localStorage?: Record<string, string>;
661 |   sessionStorage?: Record<string, string>;
662 | }
663 | 
664 | /**
665 |  * Browser navigation options
666 |  */
667 | export interface NavigationOptions {
668 |   url: string;
669 |   waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
670 |   timeout?: number;
671 | }
672 | 
673 | /**
674 |  * Element selector options
675 |  */
676 | export interface SelectorOptions {
677 |   selector: string;
678 |   timeout?: number;
679 |   visible?: boolean;
680 |   state?: 'attached' | 'detached' | 'visible' | 'hidden';
681 | }
682 | 
683 | /**
684 |  * Screenshot options
685 |  */
686 | export interface ScreenshotOptions {
687 |   path?: string;
688 |   fullPage?: boolean;
689 |   type?: 'png' | 'jpeg';
690 |   quality?: number;
691 |   clip?: {
692 |     x: number;
693 |     y: number;
694 |     width: number;
695 |     height: number;
696 |   };
697 | }
698 | 
699 | /**
700 |  * MCP server connection status
701 |  */
702 | export enum MCPConnectionStatus {
703 |   DISCONNECTED = 'disconnected',
704 |   CONNECTING = 'connecting',
705 |   CONNECTED = 'connected',
706 |   ERROR = 'error',
707 |   RECONNECTING = 'reconnecting'
708 | }
709 | 
710 | /**
711 |  * MCP server info
712 |  */
713 | export interface MCPServerInfo {
714 |   name: string;
715 |   status: MCPConnectionStatus;
716 |   capabilities: string[];
717 |   version?: string;
718 |   lastConnected?: string;
719 |   errorCount: number;
720 | }
721 | 
722 | /**
723 |  * Browser type enumeration
724 |  */
725 | export enum BrowserType {
726 |   CHROMIUM = 'chromium',
727 |   FIREFOX = 'firefox',
728 |   WEBKIT = 'webkit'
729 | }
730 | 
731 | /**
732 |  * Playwright-specific configuration
733 |  */
734 | export interface PlaywrightConfig {
735 |   browserType: BrowserType;
736 |   headless?: boolean;
737 |   slowMo?: number;
738 |   devtools?: boolean;
739 |   args?: string[];
740 |   ignoreHTTPSErrors?: boolean;
741 |   downloadsPath?: string;
742 |   proxy?: {
743 |     server: string;
744 |     username?: string;
745 |     password?: string;
746 |   };
747 | }
748 | 
749 | /**
750 |  * Network interception options
751 |  */
752 | export interface NetworkInterceptionOptions {
753 |   patterns?: string[];
754 |   blockResources?: ('image' | 'stylesheet' | 'font' | 'script' | 'xhr' | 'fetch')[];
755 |   modifyResponses?: Array<{
756 |     urlPattern: string;
757 |     status?: number;
758 |     body?: string;
759 |     headers?: Record<string, string>;
760 |   }>;
761 | }
762 | 
763 | /**
764 |  * MCP operation result with retry information
765 |  */
766 | export interface MCPOperationResult<T = unknown> extends MCPToolResponse<T> {
767 |   attempts: number;
768 |   totalDuration: number;
769 |   retried: boolean;
770 | }
771 | 
772 | // ============================================================================
773 | // API Testing Types
774 | // ============================================================================
775 | 
776 | /**
777 |  * HTTP methods for API testing
778 |  */
779 | export enum HTTPMethod {
780 |   GET = 'GET',
781 |   POST = 'POST',
782 |   PUT = 'PUT',
783 |   DELETE = 'DELETE',
784 |   PATCH = 'PATCH',
785 |   HEAD = 'HEAD',
786 |   OPTIONS = 'OPTIONS'
787 | }
788 | 
789 | /**
790 |  * Authentication types for API requests
791 |  */
792 | export enum AuthType {
793 |   NONE = 'none',
794 |   BEARER = 'bearer',
795 |   BASIC = 'basic',
796 |   API_KEY = 'api_key',
797 |   CUSTOM = 'custom'
798 | }
799 | 
800 | /**
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:31.861Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.21

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Let me continue reading to find the QATask and related types.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>800-1000</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="800-1000">
 800 | /**
 801 |  * API authentication configuration
 802 |  */
 803 | export interface APIAuth {
 804 |   type: AuthType;
 805 |   token?: string;
 806 |   username?: string;
 807 |   password?: string;
 808 |   apiKey?: string;
 809 |   apiKeyHeader?: string;
 810 |   customHeaders?: Record<string, string>;
 811 | }
 812 | 
 813 | /**
 814 |  * API request configuration
 815 |  */
 816 | export interface APIRequest {
 817 |   method: HTTPMethod;
 818 |   url: string;
 819 |   headers?: Record<string, string>;
 820 |   body?: unknown;
 821 |   params?: Record<string, string>;
 822 |   auth?: APIAuth;
 823 |   timeout?: number;
 824 |   validateSSL?: boolean;
 825 | }
 826 | 
 827 | /**
 828 |  * API response data
 829 |  */
 830 | export interface APIResponse<T = unknown> {
 831 |   status: number;
 832 |   statusText: string;
 833 |   headers: Record<string, string>;
 834 |   body: T;
 835 |   duration: number;
 836 |   timestamp: string;
 837 | }
 838 | 
 839 | /**
 840 |  * API assertion types
 841 |  */
 842 | export enum AssertionType {
 843 |   STATUS_CODE = 'status_code',
 844 |   HEADER = 'header',
 845 |   BODY_CONTAINS = 'body_contains',
 846 |   BODY_EQUALS = 'body_equals',
 847 |   BODY_MATCHES = 'body_matches',
 848 |   JSON_PATH = 'json_path',
 849 |   RESPONSE_TIME = 'response_time',
 850 |   CUSTOM = 'custom'
 851 | }
 852 | 
 853 | /**
 854 |  * API assertion configuration
 855 |  */
 856 | export interface APIAssertion {
 857 |   type: AssertionType;
 858 |   expected: unknown;
 859 |   actual?: unknown;
 860 |   path?: string;
 861 |   operator?: 'equals' | 'contains' | 'matches' | 'lessThan' | 'greaterThan';
 862 |   message?: string;
 863 | }
 864 | 
 865 | /**
 866 |  * API test configuration
 867 |  */
 868 | export interface APITestConfig {
 869 |   name: string;
 870 |   description?: string;
 871 |   request: APIRequest;
 872 |   assertions: APIAssertion[];
 873 |   retries?: number;
 874 |   retryDelay?: number;
 875 |   continueOnFailure?: boolean;
 876 |   acceptableStatuses?: number[];
 877 | }
 878 | 
 879 | /**
 880 |  * API test result
 881 |  */
 882 | export interface APITestResult {
 883 |   testName: string;
 884 |   passed: boolean;
 885 |   request: APIRequest;
 886 |   response?: APIResponse;
 887 |   assertions: Array<{
 888 |     assertion: APIAssertion;
 889 |     passed: boolean;
 890 |     message: string;
 891 |   }>;
 892 |   error?: string;
 893 |   duration: number;
 894 |   timestamp: string;
 895 |   retryCount: number;
 896 | }
 897 | 
 898 | // ============================================================================
 899 | // QA Task Plan Types
 900 | // ============================================================================
 901 | 
 902 | /**
 903 |  * QA task type classification
 904 |  */
 905 | export type QATaskType = 'api' | 'ui' | 'integration' | 'manual' | 'uncertain';
 906 | 
 907 | /**
 908 |  * QA task priority level
 909 |  */
 910 | export type QATaskPriority = 'high' | 'medium' | 'low';
 911 | 
 912 | /**
 913 |  * Execution mode for QA tasks
 914 |  */
 915 | export type ExecutionMode = 'automated' | 'manual' | 'uncertain';
 916 | 
 917 | /**
 918 |  * Individual step within a QA task
 919 |  */
 920 | export interface QATaskStep {
 921 |   description: string;
 922 |   action?: string;
 923 |   expectedOutcome?: string;
 924 | }
 925 | 
 926 | /**
 927 |  * QA task definition from the deterministic task plan
 928 |  */
 929 | export interface QATask {
 930 |   taskId: string;
 931 |   acceptanceCriterionId: string;
 932 |   title: string;
 933 |   type: QATaskType;
 934 |   priority: QATaskPriority;
 935 |   preconditions: string[];
 936 |   setupData?: Record<string, any>;
 937 |   steps: QATaskStep[];
 938 |   expectedResult: string;
 939 |   executionMode: ExecutionMode;
 940 |   reasoning: string;
 941 |   uncertainReason?: string;
 942 | }
 943 | 
 944 | /**
 945 |  * Complete QA task plan schema
 946 |  */
 947 | export interface QATaskPlan {
 948 |   projectName?: string;
 949 |   timestamp: string;
 950 |   acceptanceCriteria: AcceptanceCriterion[];
 951 |   tasks: QATask[];
 952 |   summary: {
 953 |     totalTasks: number;
 954 |     automatedTasks: number;
 955 |     manualTasks: number;
 956 |     uncertainTasks: number;
 957 |   };
 958 | }
 959 | 
 960 | // ============================================================================
 961 | // Generated HTTP Test Types
 962 | // ============================================================================
 963 | 
 964 | /**
 965 |  * Test status for generated tests
 966 |  */
 967 | export type TestStatus = 'ready' | 'uncertain' | 'manual' | 'skipped';
 968 | 
 969 | /**
 970 |  * Individual HTTP test step
 971 |  */
 972 | export interface HTTPTestStep {
 973 |   stepId: string;
 974 |   description?: string;
 975 |   method: string;
 976 |   url: string;
 977 |   headers?: Record<string, string>;
 978 |   body?: any;
 979 |   expectedStatus: number;
 980 |   acceptableStatuses: number[];
 981 |   expectedBodyContains?: string[];
 982 |   expectedBodySchema?: Record<string, any>;
 983 | }
 984 | 
 985 | /**
 986 |  * Generated HTTP test from the executable test schema
 987 |  */
 988 | export interface GeneratedHTTPTest {
 989 |   id: string;
 990 |   acceptanceCriterionId: string;
 991 |   qaTaskId?: string;
 992 |   title: string;
 993 |   type: 'api';
 994 |   status: TestStatus;
 995 |   uncertainReason?: string | null;
 996 |   steps: HTTPTestStep[];
 997 |   setupRequired?: boolean;
 998 |   teardownRequired?: boolean;
 999 | }
1000 | 
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:35.218Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.27

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Perfect! Now I can see the types. Let me continue reading to find the remaining types like GeneratedHTTPTestSuite and DiscoveredRoute.

<read_file>
<args>
<file>
<path>src/types/index.ts</path>
<line_range>1000-1100</line_range>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'src/types/index.ts'. Reading multiple files at once is more efficient for the LLM. If other files are relevant to your current task, please read them simultaneously.] Result:
<files>
<file><path>src/types/index.ts</path>
<content lines="1000-1100">
1000 | 
1001 | /**
1002 |  * Complete generated HTTP test suite
1003 |  */
1004 | export interface GeneratedHTTPTestSuite {
1005 |   projectName?: string;
1006 |   timestamp: string;
1007 |   baseUrl?: string;
1008 |   tests: GeneratedHTTPTest[];
1009 |   summary: {
1010 |     totalTests: number;
1011 |     readyTests: number;
1012 |     uncertainTests: number;
1013 |     manualTests: number;
1014 |   };
1015 | }
1016 | 
1017 | // ============================================================================
1018 | // Test Execution Result Types
1019 | // ============================================================================
1020 | 
1021 | /**
1022 |  * Assertion result for test validation
1023 |  */
1024 | export interface AssertionResult {
1025 |   type: string;
1026 |   expected: any;
1027 |   actual: any;
1028 |   passed: boolean;
1029 |   message: string;
1030 | }
1031 | 
1032 | /**
1033 |  * HTTP step execution result
1034 |  */
1035 | export interface HTTPStepResult {
1036 |   stepId: string;
1037 |   method: string;
1038 |   url: string;
1039 |   requestBody?: any;
1040 |   expectedStatus: number;
1041 |   acceptableStatuses: number[];
1042 |   actualStatus?: number;
1043 |   responseBody?: any;
1044 |   duration: number;
1045 |   passed: boolean;
1046 |   error?: string;
1047 |   assertions: AssertionResult[];
1048 | }
1049 | 
1050 | /**
1051 |  * HTTP test execution result
1052 |  */
1053 | export interface HTTPTestResult {
1054 |   testId: string;
1055 |   title: string;
1056 |   acceptanceCriterionId: string;
1057 |   status: 'passed' | 'failed' | 'uncertain' | 'skipped';
1058 |   steps: HTTPStepResult[];
1059 |   duration: number;
1060 |   error?: string;
1061 |   message?: string;
1062 | }
1063 | 
1064 | // ============================================================================
1065 | // Fallback Mapper Types
1066 | // ============================================================================
1067 | 
1068 | /**
1069 |  * Discovered route information for route matching
1070 |  */
1071 | export interface DiscoveredRoute {
1072 |   method: string;
1073 |   path: string;
1074 |   description?: string;
1075 |   handler?: string;
1076 |   middleware?: string[];
1077 | }
1078 | 
1079 | /**
1080 |  * Route match result with confidence level
1081 |  */
1082 | export interface RouteMatch {
1083 |   route: DiscoveredRoute;
1084 |   confidence: 'high' | 'medium' | 'low';
1085 |   reason: string;
1086 | }
1087 | 
1088 | /**
1089 |  * Fallback mapping result for deterministic test generation
1090 |  */
1091 | export interface FallbackMappingResult {
1092 |   success: boolean;
1093 |   qaTask?: QATask;
1094 |   httpTest?: GeneratedHTTPTest;
1095 |   reason: string;
1096 |   confidence: 'high' | 'medium' | 'low';
1097 | }
1098 | 
1099 | // ============================================================================
1100 | // Test Execution Types
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:38.253Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.33

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

Perfect! Now I have all the type information. The issue is that `AcceptanceCriterion` has a `description` property, not `criterion`, and doesn't have an `expectedResult` property. Let me fix the code.

<apply_diff>
<path>src/generators/qa-task-generator.ts</path>
<diff>
<<<<<<< SEARCH
:start_line:101
-------
      title: aiTask.title || criterion.criterion,
=======
      title: aiTask.title || criterion.description,
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:107
-------
      expectedResult: aiTask.expectedResult || criterion.expectedResult || '',
=======
      expectedResult: aiTask.expectedResult || '',
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:131
-------
        title: criterion.criterion,
=======
        title: criterion.description,
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:139
-------
          expectedOutcome: criterion.expectedResult || 'Request succeeds'
=======
          expectedOutcome: 'Request succeeds'
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:141
-------
        expectedResult: criterion.expectedResult || 'Request succeeds',
=======
        expectedResult: 'Request succeeds',
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:150
-------
        title: criterion.criterion,
=======
        title: criterion.description,
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:156
-------
          description: criterion.criterion,
          expectedOutcome: criterion.expectedResult || 'Criterion is met'
=======
          description: criterion.description,
          expectedOutcome: 'Criterion is met'
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:159
-------
        expectedResult: criterion.expectedResult || 'Criterion is met',
=======
        expectedResult: 'Criterion is met',
>>>>>>> REPLACE
<<<<<<< SEARCH
:start_line:171
-------
    const criterionText = `${criterion.criterion} ${criterion.expectedResult || ''}`.toLowerCase();
=======
    const criterionText = criterion.description.toLowerCase();
>>>>>>> REPLACE
</diff>
</apply_diff>

---

**User:**

[apply_diff for 'src/generators/qa-task-generator.ts'] Result:
<file_write_result>
<path>src/generators/qa-task-generator.ts</path>
<operation>modified</operation>
<notice>
<i>You do not need to re-read the file, as you have seen all changes</i>
<i>Proceed with the task using these changes as the new baseline.</i>
</notice>
</file_write_result>

<environment_details>
# VSCode Visible Files
src\generators\qa-task-generator.ts

# VSCode Open Tabs
.env,src/generators/artifact-writer.ts,src/testing/index.ts,src/utils/logger.ts,src/testing/test-coordinator.ts,src/testing/test-normalizer.ts,src/testing/api-tester.ts,src/reporting/report-generator.ts,src/utils/json-extractor.ts,src/types/index.ts,src/generators/qa-task-generator.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-02T01:19:48.393Z
User time zone: America/Chicago, UTC-5:00

# Current Cost
$0.40

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

<attempt_completion>
<result>
Successfully created `src/generators/qa-task-generator.ts` with two main classes for deterministic QA task and HTTP test generation.

## Classes Created:

### 1. **QATaskGenerator**
Generates deterministic QA task plans from acceptance criteria with optional AI suggestions.

**Key Methods:**
- `generateTaskPlan()` - Main entry point that processes acceptance criteria and optional AI suggestions
- `isValidAITask()` - Validates AI-generated task structure before use
- `normalizeAITask()` - Converts AI suggestions to standardized QATask format
- `generateDeterministicTask()` - Fallback generator when AI fails or is unavailable
- `findMatchingRoute()` - Maps acceptance criteria to discovered API routes
- `normalizeTaskType()` / `normalizePriority()` - Sanitize AI output
- `calculateTaskSummary()` - Generate statistics for the task plan

### 2. **HTTPTestGenerator**
Generates executable HTTP tests from QA task plans.

**Key Methods:**
- `generateTestSuite()` - Main entry point that converts QA tasks to HTTP tests
- `generateHTTPTest()` - Creates executable HTTP test from QA task
- `generateTestSteps()` - Builds HTTP request steps with proper semantics
- `findRouteForTask()` - Matches QA tasks to discovered routes
- `inferExpectedStatus()` - Determines expected HTTP status from task context
- `getAcceptableStatuses()` - Provides flexible status code matching
- `buildRequestBody()` - Constructs request payloads from task setup data
- `createUncertainTest()` / `createManualTest()` - Generate placeholders for non-automatable tests
- `calculateTestSummary()` - Generate statistics for the test suite

## How It Handles AI Failures:

1. **Validation First**: Always validates AI output structure before use
2. **Graceful Fallback**: If AI fails or produces invalid output, falls back to deterministic generation
3. **Route Matching**: Uses discovered routes to generate basic API tests when AI is unavailable
4. **Uncertainty Tracking**: Marks tests as "uncertain" when automation isn't possible, with clear reasons
5. **Manual Test Placeholders**: Creates manual test entries for UI/complex scenarios
6. **Generic HTTP Semantics**: Uses standard HTTP conventions (POST→201, DELETE→204, etc.) without hardcoded routes
7. **Flexible Status Codes**: Accepts multiple valid status codes (e.g., POST accepts both 200 and 201)

## Key Features:

- **Type-Safe**: Uses all types from `src/types/index.ts`
- **Deterministic**: Can generate tests without AI when needed
- **Traceable**: Links tests back to acceptance criteria and QA tasks
- **Flexible**: Handles automated, manual, and uncertain test scenarios
- **Robust**: Validates and normalizes AI output to prevent errors
- **Informative**: Provides detailed reasoning and uncertainty explanations

The module is ready to be integrated into the test generation pipeline and provides a reliable fallback when AI services are unavailable or produce invalid output.
</result>
</attempt_completion>

