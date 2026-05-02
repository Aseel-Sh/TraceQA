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
  HTTPMethod,
  AssertionType,
  APIAssertion,
  DiffAnalysis
} from '../types/index.js';
import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
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
  private config: Required<Omit<TestCoordinatorConfig, 'baseUrl' | 'healthUrl'>> & { baseUrl?: string; healthUrl?: string };
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
        autoBuild: config.buildSystem?.autoBuild ?? true,
        autoStart: config.buildSystem?.autoStart ?? true,
        port: config.buildSystem?.port
      },
      agent: config.agent ?? {} as any,
      mcp: config.mcp ?? {},
      execution: config.execution ?? {},
      cleanup: {
        stopServer: config.cleanup?.stopServer ?? true,
        cleanupMCP: config.cleanup?.cleanupMCP ?? true,
        saveResults: config.cleanup?.saveResults ?? true
      },
      baseUrl: config.baseUrl ?? undefined,
      healthUrl: config.healthUrl ?? undefined
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
  async runTests(
    testConfig: TestConfig,
    diffAnalysis?: DiffAnalysis | null,
    discoveredRoutes?: RouteDiscoveryResult | null
  ): Promise<{
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
      const context = await this.createTestContext(testConfig, buildResult, diffAnalysis);

      // Log discovered routes if available
      if (discoveredRoutes && discoveredRoutes.routes.length > 0) {
        logger.info(`\n🔍 Discovered ${discoveredRoutes.routes.length} routes (${discoveredRoutes.framework}):`);
        discoveredRoutes.routes.slice(0, 10).forEach(route => {
          logger.info(`  ${route.method.padEnd(6)} ${route.path}`);
        });
        if (discoveredRoutes.routes.length > 10) {
          logger.info(`  ... and ${discoveredRoutes.routes.length - 10} more`);
        }
      }

      // Phase 4: Plan tests
      this.updatePhase('planning');
      const testPlan = await this.agent.createTestPlan(context, diffAnalysis, discoveredRoutes);
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
    const skipInstall = !this.config.buildSystem.autoInstall;
    if (this.config.buildSystem.autoInstall) {
      const installed = await this.buildSystem.installDependencies(skipInstall);
      if (!installed) {
        throw new TraceQAError(
          'Failed to install dependencies',
          ErrorCategory.BUILD
        );
      }
    }

    // Build if configured
    const skipBuild = !this.config.buildSystem.autoBuild;
    if (this.config.buildSystem.autoBuild) {
      const buildResult = await this.buildSystem.build({}, skipBuild);
      if (!buildResult.success) {
        throw new TraceQAError(
          `Build failed: ${buildResult.error}`,
          ErrorCategory.BUILD
        );
      }
    }

    // Start dev server if configured and needed
    const skipStart = !this.config.buildSystem.autoStart;
    if (
      this.config.buildSystem.autoStart &&
      (testConfig.testType === TestType.WEB_UI || testConfig.testType === TestType.BOTH)
    ) {
      const buildResult = await this.buildSystem.startDevServer({
        port: this.config.buildSystem.port,
        install: false // Already installed above
      }, skipStart);

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

      // Run health check if healthUrl is configured
      if (this.config.healthUrl) {
        await this.buildSystem.waitForHealthCheck(this.config.healthUrl);
      }

      return {
        success: true,
        serverUrl: buildResult.serverUrl,
        port: buildResult.port
      };
    }

    // If baseUrl is provided without starting server, assume app is already running
    if (this.config.baseUrl && !this.config.buildSystem.autoStart) {
      logger.info(`Using provided base URL: ${this.config.baseUrl}`);
      
      // Run health check if healthUrl is configured
      if (this.config.healthUrl) {
        await this.buildSystem.waitForHealthCheck(this.config.healthUrl);
      }
      
      this.state.buildResult = {
        success: true,
        serverUrl: this.config.baseUrl
      };

      return {
        success: true,
        serverUrl: this.config.baseUrl
      };
    }

    this.state.buildResult = { success: true };

    return { success: true };
  }

  /**
   * Create test context
   */
  private async createTestContext(
    testConfig: TestConfig,
    buildResult: { success: boolean; serverUrl?: string; port?: number },
    diffAnalysis?: DiffAnalysis | null
  ): Promise<TestContext> {
    logger.info('Creating test context...');

    const projectDetection = this.buildSystem.getProjectDetection();
    const customConfig = this.buildSystem.getCustomConfig();
    
    // Build BuildInfo from config if detection not available
    const buildInfo: BuildInfo = projectDetection ? {
      framework: projectDetection.framework.name,
      language: projectDetection.packageJson.dependencies?.['typescript']
        ? 'TypeScript'
        : 'JavaScript',
      buildCommand: projectDetection.buildCommands.build,
      testCommand: projectDetection.buildCommands.test,
      startCommand: projectDetection.buildCommands.dev || projectDetection.buildCommands.start,
      port: buildResult.port,
      success: buildResult.success
    } : {
      // Use config values with sensible defaults when project detection is not available
      framework: customConfig.projectType || customConfig.type || 'generic',
      language: customConfig.language || 'generic',
      buildCommand: customConfig.buildCommand || 'none',
      testCommand: undefined,
      startCommand: customConfig.startCommand || 'external/already-running',
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

    // Create change set from diffAnalysis if available
    const changes: ChangeSet = diffAnalysis ? {
      files: diffAnalysis.changedFiles.map(f => ({
        path: f.path,
        type: f.type,
        additions: f.linesAdded,
        deletions: f.linesDeleted
      })),
      summary: testConfig.description,
      additions: diffAnalysis.changedFiles.reduce((sum, f) => sum + f.linesAdded, 0),
      deletions: diffAnalysis.changedFiles.reduce((sum, f) => sum + f.linesDeleted, 0),
      diff: `${diffAnalysis.changedFiles.length} files changed, ${diffAnalysis.changedFiles.reduce((sum, f) => sum + f.linesAdded, 0)} insertions(+), ${diffAnalysis.changedFiles.reduce((sum, f) => sum + f.linesDeleted, 0)} deletions(-)`
    } : {
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
      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration: 0,
        message: 'API tester not initialized - skipped',
        error: 'API tester not configured or initialized',
        timestamp: new Date().toISOString()
      };
    }

    const startTime = Date.now();
    logger.debug(`Executing API test: ${testCase.name}`);

    try {
      // Convert test case steps to API test config
      if (testCase.steps.length === 0) {
        return {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          passed: false,
          duration: Date.now() - startTime,
          message: 'No test steps defined',
          error: 'Test case has no steps to execute',
          timestamp: new Date().toISOString()
        };
      }

      // Parse test steps to extract API test details
      const parsedTest = this.parseAPITestSteps(testCase, context);
      
      if (!parsedTest.url) {
        return {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          passed: false,
          duration: Date.now() - startTime,
          message: 'Cannot determine API endpoint',
          error: 'No API endpoint specified in test steps or build info',
          timestamp: new Date().toISOString()
        };
      }

      // Log API test details for transparency
      logger.info(`API Test Details:`);
      logger.info(`  Method: ${parsedTest.method}`);
      logger.info(`  URL: ${parsedTest.url}`);
      if (parsedTest.body) {
        logger.info(`  Body: ${JSON.stringify(parsedTest.body)}`);
      }
      logger.info(`  Expected Status: ${parsedTest.assertions[0]?.expected || 'N/A'}`);
      logger.info(`  Assertions: ${parsedTest.assertions.length}`);

      // Execute the REAL API test (no mocking)
      const apiTestResult = await this.apiTester.executeTest({
        name: testCase.name,
        request: {
          method: parsedTest.method,
          url: parsedTest.url,
          headers: parsedTest.headers,
          body: parsedTest.body,
          timeout: 30000
        },
        assertions: parsedTest.assertions
      });

      const duration = Date.now() - startTime;

      // Log response details
      logger.info(`API Response:`);
      logger.info(`  Status: ${apiTestResult.response?.status || 'N/A'}`);
      logger.info(`  Duration: ${duration}ms`);
      if (apiTestResult.response?.body) {
        logger.debug(`  Response Body: ${JSON.stringify(apiTestResult.response.body).substring(0, 200)}...`);
      }

      // Format duration properly: ms for < 1000ms, seconds for >= 1000ms
      const formattedDuration = duration < 1000
        ? `${duration}ms`
        : `${(duration / 1000).toFixed(2)}s`;
      
      // Capture full evidence in test results
      const evidence = [
        `Method: ${parsedTest.method}`,
        `URL: ${parsedTest.url}`,
        parsedTest.body ? `Request Body: ${JSON.stringify(parsedTest.body)}` : null,
        `Expected Status: ${parsedTest.assertions[0]?.expected || 'N/A'}`,
        `Actual Status: ${apiTestResult.response?.status || 'N/A'}`,
        apiTestResult.response?.body ? `Response Body: ${JSON.stringify(apiTestResult.response.body).substring(0, 500)}` : null,
        `Assertion Result: ${apiTestResult.passed ? 'PASS' : 'FAIL'}`,
        `Duration: ${formattedDuration}`
      ].filter(Boolean) as string[];

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: apiTestResult.passed,
        duration,
        message: apiTestResult.passed
          ? `API test passed - ${parsedTest.method} ${parsedTest.url} returned ${apiTestResult.response?.status || 'unknown'}`
          : `API test failed: ${apiTestResult.error || 'Assertions failed'}`,
        error: apiTestResult.error,
        timestamp: new Date().toISOString(),
        logs: evidence
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is a TraceQA execution error (not an app error)
      const isTraceQAError = errorMessage.includes('ECONNREFUSED') ||
                             errorMessage.includes('timeout') ||
                             errorMessage.includes('network') ||
                             errorMessage.toLowerCase().includes('fetch');
      
      logger.error(`API test execution error: ${testCase.name}`, error);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration,
        message: isTraceQAError
          ? 'TraceQA execution error - test could not be executed'
          : 'API test execution failed',
        error: `${isTraceQAError ? '[TraceQA Error] ' : ''}${errorMessage}`,
        timestamp: new Date().toISOString(),
        logs: [
          `Error Type: ${isTraceQAError ? 'TraceQA Execution Error' : 'Test Failure'}`,
          `Error Message: ${errorMessage}`
        ]
      };
    }
  }

  /**
   * Execute web UI test
   */
  private async executeWebTest(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    const startTime = Date.now();
    logger.debug(`Executing web test: ${testCase.name}`);

    // Check if web tester is available
    if (!this.webTester) {
      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration: Date.now() - startTime,
        message: 'Browser MCP not configured - skipped',
        error: 'Web tester not initialized. Browser MCP server is required for web tests.',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Convert test case to web test config
      if (testCase.steps.length === 0) {
        return {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          passed: false,
          duration: Date.now() - startTime,
          message: 'No test steps defined',
          error: 'Test case has no steps to execute',
          timestamp: new Date().toISOString()
        };
      }

      // Get the base URL from build info
      const baseUrl = context.buildInfo.port
        ? `http://localhost:${context.buildInfo.port}`
        : 'http://localhost:3000'; // Default fallback

      // Convert test steps to web test steps
      const webSteps = testCase.steps.map(step => ({
        action: step.action as any,
        selector: step.target,
        value: step.value,
        description: step.description
      }));

      // Execute the web test
      const webTestResult = await this.webTester.executeTest({
        name: testCase.name,
        url: baseUrl,
        steps: webSteps,
        timeout: 30000
      });

      const duration = Date.now() - startTime;

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: webTestResult.passed,
        duration,
        message: webTestResult.passed
          ? 'Web test passed'
          : `Web test failed: ${webTestResult.error || 'Test steps failed'}`,
        error: webTestResult.error,
        screenshots: webTestResult.screenshots,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Web test execution error: ${testCase.name}`, error);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration,
        message: 'Web test execution failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute integration test
   */
  private async executeIntegrationTest(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    logger.debug(`Executing integration test: ${testCase.name}`);

    const startTime = Date.now();

    try {
      // Integration tests orchestrate both API and Web tests
      // Split test steps into API and Web components
      const apiSteps = testCase.steps.filter(step => {
        const action = String(step.action || '').toLowerCase();
        return action.includes('api') || action.includes('request');
      });
      const webSteps = testCase.steps.filter(step =>
        !apiSteps.includes(step)
      );

      const results: TestResult[] = [];

      // Execute API portion if there are API steps
      if (apiSteps.length > 0 && this.apiTester) {
        const apiTestCase: TestCase = {
          ...testCase,
          id: `${testCase.id}-api`,
          name: `${testCase.name} (API)`,
          steps: apiSteps
        };
        const apiResult = await this.executeAPITest(apiTestCase, context);
        results.push(apiResult);
      }

      // Execute Web portion if there are web steps
      if (webSteps.length > 0 && this.webTester) {
        const webTestCase: TestCase = {
          ...testCase,
          id: `${testCase.id}-web`,
          name: `${testCase.name} (Web)`,
          steps: webSteps
        };
        const webResult = await this.executeWebTest(webTestCase, context);
        results.push(webResult);
      }

      // If no steps could be executed
      if (results.length === 0) {
        return {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          passed: false,
          duration: Date.now() - startTime,
          message: 'Integration test could not be executed',
          error: 'No API or Web testers available, or no valid test steps',
          timestamp: new Date().toISOString()
        };
      }

      // Combine results
      const allPassed = results.every(r => r.passed);
      const duration = Date.now() - startTime;
      const failedResults = results.filter(r => !r.passed);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: allPassed,
        duration,
        message: allPassed
          ? 'Integration test passed'
          : `Integration test failed: ${failedResults.map(r => r.message).join('; ')}`,
        error: failedResults.length > 0
          ? failedResults.map(r => r.error).filter(Boolean).join('; ')
          : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Integration test execution error: ${testCase.name}`, error);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration,
        message: 'Integration test execution failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse API test steps to extract HTTP method, URL, body, and assertions
   */
  private parseAPITestSteps(testCase: TestCase, context: TestContext): {
    method: HTTPMethod;
    url: string | undefined;
    headers: Record<string, string>;
    body?: any;
    assertions: APIAssertion[];
  } {
    let inferredMethod: HTTPMethod | undefined;
    let url: string | undefined;
    let body: any;
    const headers: Record<string, string> = {};
    const assertions: APIAssertion[] = [];

    // Parse test steps for API details
    for (const step of testCase.steps) {
      // Safe string conversion with null checks
      const action = String(step.action || '').toLowerCase();
      const description = String(step.description || '').toLowerCase();
      
      // CRITICAL FIX: Check step.method FIRST (IBM provides this explicitly)
      if ((step as any).method) {
        const methodStr = String((step as any).method).toUpperCase();
        if (Object.values(HTTPMethod).includes(methodStr as HTTPMethod)) {
          inferredMethod = methodStr as HTTPMethod;
        }
      }
      
      // Fallback: Extract HTTP method from action or description if not found in step.method
      if (!inferredMethod) {
        if (action.includes('post') || description.includes('post')) {
          inferredMethod = HTTPMethod.POST;
        } else if (action.includes('put') || description.includes('put')) {
          inferredMethod = HTTPMethod.PUT;
        } else if (action.includes('delete') || description.includes('delete')) {
          inferredMethod = HTTPMethod.DELETE;
        } else if (action.includes('patch') || description.includes('patch')) {
          inferredMethod = HTTPMethod.PATCH;
        } else if (action.includes('get') || description.includes('get')) {
          inferredMethod = HTTPMethod.GET;
        }
      }
      
      // Extract URL from target or description
      if (step.target) {
        url = step.target;
      } else if (description.includes('http://') || description.includes('https://')) {
        const urlMatch = description.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          url = urlMatch[1];
        }
      }
      
      // Extract request body from step.body (IBM provides this) or step.value
      if ((step as any).body && inferredMethod && (inferredMethod === HTTPMethod.POST || inferredMethod === HTTPMethod.PUT || inferredMethod === HTTPMethod.PATCH)) {
        body = (step as any).body;
      } else if (step.value && inferredMethod && (inferredMethod === HTTPMethod.POST || inferredMethod === HTTPMethod.PUT || inferredMethod === HTTPMethod.PATCH)) {
        try {
          body = JSON.parse(step.value);
        } catch {
          body = step.value;
        }
      }
    }
    
    // Robust method normalization - never call toLowerCase on undefined
    const method = String(inferredMethod || HTTPMethod.GET).toUpperCase() as HTTPMethod;
    
    // If no URL found, use default from build info or config baseUrl
    if (!url) {
      if (this.config.baseUrl) {
        url = `${this.config.baseUrl}/api/test`;
      } else if (context.buildInfo.port) {
        url = `http://localhost:${context.buildInfo.port}/api/test`;
      }
    } else if (url.startsWith('/') && this.config.baseUrl) {
      // Combine relative endpoint with base URL
      url = `${this.config.baseUrl}${url}`;
    } else if (url.startsWith('/') && context.buildInfo.port) {
      // Combine relative endpoint with build info port
      url = `http://localhost:${context.buildInfo.port}${url}`;
    }
    
    // Parse expected result for assertions - safe string conversion
    const expectedResult = String(testCase.expectedResult || '').toLowerCase();
    
    // Extract expected status code from strings like "201 Created", "400 Bad Request", etc.
    let expectedStatus = 200;
    
    // First try to extract any 3-digit number (status code)
    const statusCodeMatch = expectedResult.match(/(\d{3})/);
    if (statusCodeMatch) {
      expectedStatus = parseInt(statusCodeMatch[1], 10);
    } else if (expectedResult.includes('success') || expectedResult.includes('ok')) {
      expectedStatus = 200;
    } else if (expectedResult.includes('created')) {
      expectedStatus = 201;
    } else if (expectedResult.includes('bad request') || expectedResult.includes('invalid')) {
      expectedStatus = 400;
    } else if (expectedResult.includes('unauthorized') || expectedResult.includes('not authorized')) {
      expectedStatus = 401;
    } else if (expectedResult.includes('forbidden')) {
      expectedStatus = 403;
    } else if (expectedResult.includes('not found')) {
      expectedStatus = 404;
    } else if (expectedResult.includes('conflict')) {
      expectedStatus = 409;
    }
    
    assertions.push({
      type: AssertionType.STATUS_CODE,
      expected: expectedStatus,
      operator: 'equals'
    });
    
    // Add response body assertions if mentioned
    if (expectedResult.includes('response') || expectedResult.includes('body') || expectedResult.includes('data')) {
      // Could add more sophisticated parsing here
      logger.debug('Response body assertion detected but not yet implemented');
    }
    
    return { method, url, headers, body, assertions };
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