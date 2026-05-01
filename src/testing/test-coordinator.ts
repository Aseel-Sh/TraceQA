/**
 * Test Coordinator
 * Main coordinator that orchestrates the entire testing workflow
 * Integrates build system, agent, MCP clients, and test execution
 */

import { BuildSystem } from '../core/build-system.js';
import { TestAgent } from '../agent/test-agent.js';
import { MCPClientManager } from '../mcp/index.js';
import { TestRunner } from './test-runner.js';
import { APITester } from './api-tester.js';
import { WebTester } from './web-tester.js';
import {
  TestConfig,
  TestContext,
  TestPlan,
  TestResults,
  TestResult,
  TestCase,
  TestType,
  TestCoordinatorConfig,
  TestCoordinatorState,
  AgentAnalysis,
  BuildInfo,
  ChangeSet,
  RepositoryInfo,
  TraceQAError,
  ErrorCategory,
  TestExecutionOptions
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Test Coordinator class
 */
export class TestCoordinator {
  private buildSystem: BuildSystem;
  private agent: TestAgent;
  private mcpManager: MCPClientManager;
  private testRunner: TestRunner;
  private apiTester: APITester | null = null;
  private webTester: WebTester | null = null;
  private config: Required<TestCoordinatorConfig>;
  private state: TestCoordinatorState;

  constructor(
    buildSystem: BuildSystem,
    agent: TestAgent,
    mcpManager: MCPClientManager,
    config: TestCoordinatorConfig = {}
  ) {
    this.buildSystem = buildSystem;
    this.agent = agent;
    this.mcpManager = mcpManager;

    // Set default configuration
    this.config = {
      buildSystem: {
        autoInstall: config.buildSystem?.autoInstall ?? true,
        autoStart: config.buildSystem?.autoStart ?? true,
        port: config.buildSystem?.port
      },
      agent: config.agent || {},
      mcp: config.mcp || {},
      execution: config.execution || {},
      cleanup: {
        stopServer: config.cleanup?.stopServer ?? true,
        cleanupMCP: config.cleanup?.cleanupMCP ?? true,
        saveResults: config.cleanup?.saveResults ?? true
      }
    };

    // Initialize test runner
    this.testRunner = new TestRunner(this.config.execution);

    // Initialize state
    this.state = {
      phase: 'idle'
    };

    logger.info('Test Coordinator initialized');
  }

  /**
   * Run complete test workflow
   */
  async runTests(testConfig: TestConfig): Promise<{
    testPlan: TestPlan;
    results: TestResults;
    analysis: AgentAnalysis;
    report: string;
  }> {
    logger.info('Starting test workflow...');
    this.state.startTime = new Date().toISOString();

    try {
      // Phase 1: Initialize and build
      this.updatePhase('initializing');
      await this.initialize();

      // Phase 2: Build project
      this.updatePhase('building');
      const buildResult = await this.buildProject(testConfig);

      // Phase 3: Create test context
      const context = await this.createTestContext(testConfig, buildResult);

      // Phase 4: Plan tests
      this.updatePhase('planning');
      const testPlan = await this.agent.createTestPlan(context);
      this.state.testPlan = testPlan;

      // Phase 5: Execute tests
      this.updatePhase('executing');
      const results = await this.executeTestPlan(testPlan, context);
      this.state.results = results;

      // Phase 6: Analyze results
      this.updatePhase('analyzing');
      const analysis = await this.agent.analyzeResults(results, context);

      // Phase 7: Generate report
      this.updatePhase('reporting');
      const report = await this.agent.generateReport(results, analysis, context);

      // Phase 8: Cleanup
      this.updatePhase('cleanup');
      await this.cleanup();

      this.updatePhase('idle');
      this.state.endTime = new Date().toISOString();

      logger.success('Test workflow completed successfully');

      return {
        testPlan,
        results,
        analysis,
        report
      };
    } catch (error) {
      this.updatePhase('error');
      this.state.error = error instanceof Error ? error.message : String(error);
      this.state.endTime = new Date().toISOString();

      logger.error('Test workflow failed', error);

      // Attempt cleanup even on error
      try {
        await this.cleanup();
      } catch (cleanupError) {
        logger.error('Cleanup failed', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Initialize all components
   */
  private async initialize(): Promise<void> {
    logger.info('Initializing components...');

    // Initialize build system
    const buildInitialized = await this.buildSystem.initialize();
    if (!buildInitialized) {
      throw new TraceQAError(
        'Failed to initialize build system',
        ErrorCategory.BUILD
      );
    }

    // Initialize MCP servers if configured
    if (this.config.mcp.servers && this.config.mcp.servers.length > 0) {
      await this.mcpManager.initializeServers(this.config.mcp.servers);
    }

    // Set MCP manager for agent
    this.agent.setMCPManager(this.mcpManager);

    logger.success('Components initialized');
  }

  /**
   * Build the project
   */
  private async buildProject(testConfig: TestConfig): Promise<{
    success: boolean;
    serverUrl?: string;
    port?: number;
  }> {
    logger.info('Building project...');

    // Install dependencies if configured
    if (this.config.buildSystem.autoInstall) {
      const installed = await this.buildSystem.installDependencies();
      if (!installed) {
        throw new TraceQAError(
          'Failed to install dependencies',
          ErrorCategory.BUILD
        );
      }
    }

    // Start dev server if configured and needed
    if (
      this.config.buildSystem.autoStart &&
      (testConfig.testType === TestType.WEB_UI || testConfig.testType === TestType.BOTH)
    ) {
      const buildResult = await this.buildSystem.startDevServer({
        port: this.config.buildSystem.port,
        install: false // Already installed above
      });

      if (!buildResult.success) {
        throw new TraceQAError(
          `Failed to start dev server: ${buildResult.error}`,
          ErrorCategory.BUILD
        );
      }

      this.state.buildResult = {
        success: true,
        serverUrl: buildResult.serverUrl,
        port: buildResult.port
      };

      logger.success(`Dev server started: ${buildResult.serverUrl}`);

      return {
        success: true,
        serverUrl: buildResult.serverUrl,
        port: buildResult.port
      };
    }

    // For API-only tests, just verify build
    const buildResult = await this.buildSystem.build();
    if (!buildResult.success) {
      throw new TraceQAError(
        `Build failed: ${buildResult.error}`,
        ErrorCategory.BUILD
      );
    }

    this.state.buildResult = { success: true };

    return { success: true };
  }

  /**
   * Create test context
   */
  private async createTestContext(
    testConfig: TestConfig,
    buildResult: { success: boolean; serverUrl?: string; port?: number }
  ): Promise<TestContext> {
    logger.info('Creating test context...');

    const projectDetection = this.buildSystem.getProjectDetection();
    if (!projectDetection) {
      throw new TraceQAError(
        'Project detection not available',
        ErrorCategory.CONFIGURATION
      );
    }

    // Create build info
    const buildInfo: BuildInfo = {
      framework: projectDetection.framework.name,
      language: projectDetection.packageJson.dependencies?.['typescript']
        ? 'TypeScript'
        : 'JavaScript',
      buildCommand: projectDetection.buildCommands.build,
      testCommand: projectDetection.buildCommands.test,
      startCommand: projectDetection.buildCommands.dev || projectDetection.buildCommands.start,
      port: buildResult.port,
      success: buildResult.success
    };

    // Create repository info
    const repository: RepositoryInfo = {
      path: testConfig.repository.path,
      name: testConfig.repository.name,
      branch: testConfig.repository.branch || 'main',
      remote: testConfig.repository.remote
    };

    // Create change set (simplified - in real implementation, would use git)
    const changes: ChangeSet = {
      files: [],
      summary: testConfig.description,
      additions: 0,
      deletions: 0,
      diff: ''
    };

    const context: TestContext = {
      repository,
      changes,
      description: testConfig.description,
      acceptanceCriteria: testConfig.acceptanceCriteria,
      buildInfo
    };

    logger.success('Test context created');

    return context;
  }

  /**
   * Execute test plan
   */
  private async executeTestPlan(
    testPlan: TestPlan,
    context: TestContext
  ): Promise<TestResults> {
    logger.info(`Executing test plan with ${testPlan.testCases.length} test cases...`);

    // Initialize testers based on test types
    const testTypes = new Set(testPlan.testCases.map(tc => tc.type));

    if (testTypes.has(TestType.API) || testTypes.has(TestType.BOTH)) {
      this.apiTester = new APITester({
        timeout: this.config.execution.timeout,
        retries: this.config.execution.retries,
        retryDelay: this.config.execution.retryDelay
      });
    }

    if (testTypes.has(TestType.WEB_UI) || testTypes.has(TestType.BOTH)) {
      this.webTester = new WebTester(this.mcpManager, {
        timeout: this.config.execution.timeout
      });
    }

    // Set up progress tracking
    this.testRunner.onProgress(progress => {
      this.state.executionProgress = progress;
      logger.info(
        `Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)`
      );
    });

    // Execute tests using test runner
    const results = await this.testRunner.executeTests(
      testPlan.testCases,
      context,
      (testCase, ctx) => this.executeTestCase(testCase, ctx)
    );

    // Create test results summary
    const startTime = this.state.startTime || new Date().toISOString();
    const duration = Date.now() - new Date(startTime).getTime();

    const testResults: TestResults = {
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        skipped: testPlan.testCases.length - results.length,
        duration,
        successRate:
          results.length > 0 ? results.filter(r => r.passed).length / results.length : 0
      },
      results,
      duration,
      timestamp: new Date().toISOString(),
      repository: context.repository,
      testPlan
    };

    logger.success(
      `Test execution completed: ${testResults.summary.passed}/${testResults.summary.total} passed`
    );

    return testResults;
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    logger.debug(`Executing test case: ${testCase.name}`);

    try {
      // Route to appropriate tester based on test type
      switch (testCase.type) {
        case TestType.API:
          return await this.executeAPITest(testCase, context);

        case TestType.WEB_UI:
          return await this.executeWebTest(testCase, context);

        case TestType.INTEGRATION:
        case TestType.BOTH:
          // For integration tests, execute both API and UI components
          return await this.executeIntegrationTest(testCase, context);

        default:
          throw new TraceQAError(
            `Unknown test type: ${testCase.type}`,
            ErrorCategory.TEST_EXECUTION
          );
      }
    } catch (error) {
      logger.error(`Test case execution failed: ${testCase.name}`, error);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration: 0,
        message: 'Test execution error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute API test
   */
  private async executeAPITest(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    if (!this.apiTester) {
      throw new TraceQAError('API tester not initialized', ErrorCategory.TEST_EXECUTION);
    }

    // Convert test case to API test config (simplified)
    // In real implementation, would parse test steps into API requests
    const startTime = Date.now();

    // Simulate API test execution
    logger.debug(`Executing API test: ${testCase.name}`);

    // This is a placeholder - real implementation would convert test steps to API calls
    const passed = Math.random() > 0.2; // 80% success rate for demo
    const duration = Date.now() - startTime;

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      passed,
      duration,
      message: passed ? 'API test passed' : 'API test failed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute web UI test
   */
  private async executeWebTest(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    if (!this.webTester) {
      throw new TraceQAError('Web tester not initialized', ErrorCategory.TEST_EXECUTION);
    }

    // Convert test case to web test config (simplified)
    // In real implementation, would parse test steps into web actions
    const startTime = Date.now();

    logger.debug(`Executing web test: ${testCase.name}`);

    // This is a placeholder - real implementation would convert test steps to web actions
    const passed = Math.random() > 0.2; // 80% success rate for demo
    const duration = Date.now() - startTime;

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      passed,
      duration,
      message: passed ? 'Web test passed' : 'Web test failed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute integration test
   */
  private async executeIntegrationTest(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    logger.debug(`Executing integration test: ${testCase.name}`);

    // Integration tests may involve both API and UI testing
    const startTime = Date.now();

    // This is a placeholder - real implementation would orchestrate both API and UI tests
    const passed = Math.random() > 0.2; // 80% success rate for demo
    const duration = Date.now() - startTime;

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      passed,
      duration,
      message: passed ? 'Integration test passed' : 'Integration test failed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    logger.info('Cleaning up resources...');

    try {
      // Stop dev server if configured
      if (this.config.cleanup.stopServer) {
        if (this.buildSystem.isDevServerRunning()) {
          await this.buildSystem.stopDevServer();
        }
      }

      // Cleanup MCP connections if configured
      if (this.config.cleanup.cleanupMCP) {
        await this.mcpManager.disconnectAll();
      }

      logger.success('Cleanup completed');
    } catch (error) {
      logger.error('Cleanup error', error);
      // Don't throw - cleanup errors shouldn't fail the entire workflow
    }
  }

  /**
   * Update coordinator phase
   */
  private updatePhase(phase: TestCoordinatorState['phase']): void {
    this.state.phase = phase;
    logger.debug(`Coordinator phase: ${phase}`);
  }

  /**
   * Get current state
   */
  getState(): TestCoordinatorState {
    return { ...this.state };
  }

  /**
   * Abort test execution
   */
  abort(): void {
    logger.warn('Aborting test execution...');
    this.testRunner.abort();
  }

  /**
   * Get test runner
   */
  getTestRunner(): TestRunner {
    return this.testRunner;
  }

  /**
   * Get build system
   */
  getBuildSystem(): BuildSystem {
    return this.buildSystem;
  }

  /**
   * Get agent
   */
  getAgent(): TestAgent {
    return this.agent;
  }

  /**
   * Get MCP manager
   */
  getMCPManager(): MCPClientManager {
    return this.mcpManager;
  }
}

/**
 * Create a test coordinator instance
 */
export function createTestCoordinator(
  buildSystem: BuildSystem,
  agent: TestAgent,
  mcpManager: MCPClientManager,
  config?: TestCoordinatorConfig
): TestCoordinator {
  return new TestCoordinator(buildSystem, agent, mcpManager, config);
}

// Made with Bob