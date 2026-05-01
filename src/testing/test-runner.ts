/**
 * Test Runner
 * Test execution engine with support for sequential and parallel execution
 */

import {
  TestCase,
  TestResult,
  TestExecutionOptions,
  TestExecutionMode,
  TestExecutionStatus,
  TestExecutionProgress,
  TestContext,
  TestType,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Test execution task
 */
interface TestTask {
  testCase: TestCase;
  status: TestExecutionStatus;
  result?: TestResult;
  startTime?: number;
  endTime?: number;
  error?: string;
}

/**
 * Test Runner class for executing test cases
 */
export class TestRunner {
  private options: Required<TestExecutionOptions>;
  private tasks: Map<string, TestTask> = new Map();
  private progressCallbacks: Array<(progress: TestExecutionProgress) => void> = [];
  private aborted: boolean = false;

  constructor(options: TestExecutionOptions = {}) {
    this.options = {
      mode: options.mode || TestExecutionMode.SEQUENTIAL,
      maxParallel: options.maxParallel || 5,
      timeout: options.timeout || 300000, // 5 minutes default
      retries: options.retries || 0,
      retryDelay: options.retryDelay || 1000,
      continueOnFailure: options.continueOnFailure ?? true,
      captureScreenshots: options.captureScreenshots ?? true,
      captureLogs: options.captureLogs ?? true,
      generateReport: options.generateReport ?? true,
      reportFormat: options.reportFormat || 'json',
      outputDir: options.outputDir || './test-results'
    };

    logger.debug('Test Runner initialized', this.options);
  }

  /**
   * Execute test cases
   */
  async executeTests(
    testCases: TestCase[],
    context: TestContext,
    executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
  ): Promise<TestResult[]> {
    logger.info(`Executing ${testCases.length} test cases in ${this.options.mode} mode`);

    // Initialize tasks
    this.tasks.clear();
    this.aborted = false;

    for (const testCase of testCases) {
      this.tasks.set(testCase.id, {
        testCase,
        status: TestExecutionStatus.PENDING
      });
    }

    // Execute based on mode
    let results: TestResult[];

    switch (this.options.mode) {
      case TestExecutionMode.SEQUENTIAL:
        results = await this.executeSequential(testCases, context, executor);
        break;

      case TestExecutionMode.PARALLEL:
        results = await this.executeParallel(testCases, context, executor);
        break;

      case TestExecutionMode.MIXED:
        results = await this.executeMixed(testCases, context, executor);
        break;

      default:
        throw new TraceQAError(
          `Unknown execution mode: ${this.options.mode}`,
          ErrorCategory.TEST_EXECUTION
        );
    }

    // Report final progress
    this.reportProgress();

    const passed = results.filter(r => r.passed).length;
    logger.success(
      `Test execution completed: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`
    );

    return results;
  }

  /**
   * Execute tests sequentially
   */
  private async executeSequential(
    testCases: TestCase[],
    context: TestContext,
    executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      if (this.aborted) {
        logger.warn('Test execution aborted');
        break;
      }

      const testCase = testCases[i];
      logger.info(`[${i + 1}/${testCases.length}] Executing: ${testCase.name}`);

      const result = await this.executeTestCase(testCase, context, executor);
      results.push(result);

      // Report progress
      this.reportProgress();

      // Check if we should continue
      if (!result.passed && !this.options.continueOnFailure) {
        logger.warn('Stopping execution due to test failure');
        break;
      }
    }

    return results;
  }

  /**
   * Execute tests in parallel
   */
  private async executeParallel(
    testCases: TestCase[],
    context: TestContext,
    executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const executing: Promise<TestResult>[] = [];

    for (const testCase of testCases) {
      if (this.aborted) {
        break;
      }

      // Wait if we've reached max parallel limit
      if (executing.length >= this.options.maxParallel) {
        const result = await Promise.race(executing);
        results.push(result);
        executing.splice(
          executing.findIndex(p => p === Promise.resolve(result)),
          1
        );
        this.reportProgress();
      }

      // Start execution
      const promise = this.executeTestCase(testCase, context, executor);
      executing.push(promise);
    }

    // Wait for remaining tests
    const remaining = await Promise.all(executing);
    results.push(...remaining);

    return results;
  }

  /**
   * Execute tests in mixed mode (parallel groups, sequential within groups)
   */
  private async executeMixed(
    testCases: TestCase[],
    context: TestContext,
    executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
  ): Promise<TestResult[]> {
    // Group tests by type
    const groups = new Map<TestType, TestCase[]>();

    for (const testCase of testCases) {
      const group = groups.get(testCase.type) || [];
      group.push(testCase);
      groups.set(testCase.type, group);
    }

    logger.info(`Executing ${groups.size} test groups in parallel`);

    // Execute groups in parallel
    const groupPromises = Array.from(groups.values()).map(group =>
      this.executeSequential(group, context, executor)
    );

    const groupResults = await Promise.all(groupPromises);

    // Flatten results
    return groupResults.flat();
  }

  /**
   * Execute a single test case with retry logic
   */
  private async executeTestCase(
    testCase: TestCase,
    context: TestContext,
    executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>
  ): Promise<TestResult> {
    const task = this.tasks.get(testCase.id);
    if (!task) {
      throw new TraceQAError(
        `Test task not found: ${testCase.id}`,
        ErrorCategory.TEST_EXECUTION
      );
    }

    task.status = TestExecutionStatus.RUNNING;
    task.startTime = Date.now();

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= this.options.retries) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(
          () => executor(testCase, context),
          this.options.timeout
        );

        task.status = result.passed
          ? TestExecutionStatus.PASSED
          : TestExecutionStatus.FAILED;
        task.result = result;
        task.endTime = Date.now();

        if (result.passed || retryCount >= this.options.retries) {
          return result;
        }

        // Retry on failure
        logger.warn(
          `Test failed, retrying (${retryCount + 1}/${this.options.retries}): ${testCase.name}`
        );
        retryCount++;
        await this.sleep(this.options.retryDelay);
      } catch (error) {
        lastError = error as Error;

        if (retryCount >= this.options.retries) {
          // Max retries reached
          task.status = TestExecutionStatus.ERROR;
          task.error = lastError.message;
          task.endTime = Date.now();

          const result: TestResult = {
            testCaseId: testCase.id,
            testCaseName: testCase.name,
            passed: false,
            duration: task.endTime - task.startTime,
            message: 'Test execution error',
            error: lastError.message,
            timestamp: new Date().toISOString()
          };

          task.result = result;
          return result;
        }

        logger.warn(
          `Test error, retrying (${retryCount + 1}/${this.options.retries}): ${testCase.name}`,
          error
        );
        retryCount++;
        await this.sleep(this.options.retryDelay);
      }
    }

    // Should never reach here
    throw new TraceQAError(
      'Unexpected error in test execution',
      ErrorCategory.TEST_EXECUTION
    );
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        global.setTimeout(() => {
          reject(
            new TraceQAError(
              `Test execution timeout after ${timeout}ms`,
              ErrorCategory.TEST_EXECUTION
            )
          );
        }, timeout);
      })
    ]);
  }

  /**
   * Get current execution progress
   */
  getProgress(): TestExecutionProgress {
    const tasks = Array.from(this.tasks.values());
    const total = tasks.length;
    const completed = tasks.filter(
      t =>
        t.status === TestExecutionStatus.PASSED ||
        t.status === TestExecutionStatus.FAILED ||
        t.status === TestExecutionStatus.ERROR ||
        t.status === TestExecutionStatus.SKIPPED
    ).length;
    const passed = tasks.filter(t => t.status === TestExecutionStatus.PASSED).length;
    const failed = tasks.filter(
      t =>
        t.status === TestExecutionStatus.FAILED ||
        t.status === TestExecutionStatus.ERROR
    ).length;
    const skipped = tasks.filter(t => t.status === TestExecutionStatus.SKIPPED).length;
    const running = tasks.find(t => t.status === TestExecutionStatus.RUNNING);

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (completed > 0 && completed < total) {
      const completedTasks = tasks.filter(t => t.endTime && t.startTime);
      if (completedTasks.length > 0) {
        const avgDuration =
          completedTasks.reduce((sum, t) => sum + (t.endTime! - t.startTime!), 0) /
          completedTasks.length;
        estimatedTimeRemaining = Math.round(avgDuration * (total - completed));
      }
    }

    return {
      total,
      completed,
      passed,
      failed,
      skipped,
      current: running?.testCase.name,
      percentage: total > 0 ? (completed / total) * 100 : 0,
      estimatedTimeRemaining
    };
  }

  /**
   * Report progress to callbacks
   */
  private reportProgress(): void {
    const progress = this.getProgress();

    for (const callback of this.progressCallbacks) {
      try {
        callback(progress);
      } catch (error) {
        logger.error('Progress callback error', error);
      }
    }

    logger.debug(
      `Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)`
    );
  }

  /**
   * Register a progress callback
   */
  onProgress(callback: (progress: TestExecutionProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Abort test execution
   */
  abort(): void {
    logger.warn('Aborting test execution...');
    this.aborted = true;

    // Mark pending tests as skipped
    for (const task of this.tasks.values()) {
      if (task.status === TestExecutionStatus.PENDING) {
        task.status = TestExecutionStatus.SKIPPED;
      }
    }
  }

  /**
   * Check if execution is aborted
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * Get all test tasks
   */
  getTasks(): Map<string, TestTask> {
    return new Map(this.tasks);
  }

  /**
   * Get execution statistics
   */
  getStatistics(): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    duration: number;
    successRate: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const total = tasks.length;
    const passed = tasks.filter(t => t.status === TestExecutionStatus.PASSED).length;
    const failed = tasks.filter(t => t.status === TestExecutionStatus.FAILED).length;
    const skipped = tasks.filter(t => t.status === TestExecutionStatus.SKIPPED).length;
    const errors = tasks.filter(t => t.status === TestExecutionStatus.ERROR).length;

    const completedTasks = tasks.filter(t => t.endTime && t.startTime);
    const duration = completedTasks.reduce(
      (sum, t) => sum + (t.endTime! - t.startTime!),
      0
    );

    const successRate = total > 0 ? passed / total : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      errors,
      duration,
      successRate
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => global.setTimeout(resolve, ms));
  }
}

/**
 * Create a test runner instance
 */
export function createTestRunner(options?: TestExecutionOptions): TestRunner {
  return new TestRunner(options);
}

/**
 * Execute tests with a simple API
 */
export async function executeTests(
  testCases: TestCase[],
  context: TestContext,
  executor: (testCase: TestCase, context: TestContext) => Promise<TestResult>,
  options?: TestExecutionOptions
): Promise<TestResult[]> {
  const runner = new TestRunner(options);
  return runner.executeTests(testCases, context, executor);
}

// Made with Bob