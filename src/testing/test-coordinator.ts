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
import { TestNormalizer, NormalizedTest } from './test-normalizer.js';
import { TestContext as StatefulTestContext, createTestContext } from './test-context.js';
import {
  writeQATaskPlan,
  writeGeneratedHTTPTests,
  writeGeneratedTestsMarkdown,
  writeGeneratedMetadata
} from '../generators/artifact-writer.js';
import { parseAcceptanceCriteriaFromFile } from '../parsers/acceptance-parser.js';
import { discoverRoutes } from '../discovery/route-discovery.js';
import { ReportGenerator } from '../reporting/report-generator.js';
import { generateQATaskPlan } from '../generators/qa-task-plan-generator.js';
import { generateHTTPTests } from '../generators/http-test-generator.js';
import { executeHTTPTests } from './http-test-executor.js';
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
  DiffAnalysis,
  HTTPTestResult,
  TraceQAConfig,
  TestFailureClassification
} from '../types/index.js';
import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
import { logger, formatDuration } from '../utils/logger.js';

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
  private normalizedTests: NormalizedTest[] = [];
  private routeDiscovery: RouteDiscoveryResult | null = null;
  private statefulContext: StatefulTestContext | null = null;

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

      // Store route discovery for normalization
      this.routeDiscovery = discoveredRoutes || null;

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
   * Run tests using the new two-phase architecture
   * This is a simplified workflow for CLI-based testing with acceptance criteria files
   * 
   * @param options - Test execution options
   * @param options.acceptancePath - Path to acceptance criteria file
   * @param options.baseUrl - Base URL for API tests
   * @param options.outputDir - Output directory for reports and artifacts
   */
  async runTestsWithNewArchitecture(options: {
    acceptancePath: string;
    baseUrl: string;
    outputDir?: string;
    generatedDir?: string;
    proofDir?: string;
    debugDir?: string;
    projectConfig?: any;
  }): Promise<void> {
    const {
      acceptancePath,
      baseUrl,
      generatedDir = 'traceqa-generated',
      proofDir = 'traceqa-proof',
      debugDir = 'traceqa-debug',
      projectConfig = {}
    } = options;

    const warnings: string[] = [];
    let ibmUsed = false;

    try {
      logger.info('Starting TraceQA test execution...');
      logger.newLine();
      // Phase 1: Parse acceptance criteria
      logger.section('Phase 1: Parsing acceptance criteria');
      const parsed = await parseAcceptanceCriteriaFromFile(acceptancePath);
      const acceptanceCriteria = parsed.criteria;
      logger.success(`✓ Parsed ${acceptanceCriteria.length} acceptance criteria`);
      logger.newLine();

      // Phase 2: Discover routes
      logger.section('Phase 2: Discovering API routes');
      const discoveryResult = await discoverRoutes(process.cwd());
      const routes = discoveryResult?.routes || [];
      logger.success(`✓ Discovered ${routes.length} routes`);
      if (routes.length === 0) {
        warnings.push('No routes discovered - tests may be limited');
        logger.warn('⚠ No routes discovered - tests may be limited');
      }
      logger.newLine();

      // Phase 3: Prepare per-run debug directory and skip redundant AI suggestions by default
      logger.section('Phase 3: Preparing debug output');
      try {
        const fs = await import('fs-extra');
        const path = await import('path');
        const runDir = path.join(process.cwd(), debugDir || 'traceqa-debug', `${Date.now()}`);
        await fs.ensureDir(runDir);
        // Expose run debug directory so downstream modules may write into it
        process.env.TRACEQA_DEBUG_DIR = runDir;
        logger.info(`Debug output directory: ${runDir}`);
      } catch (err) {
        logger.warn('Failed to prepare per-run debug directory');
      }
      logger.newLine();

      // Phase 6: Generate QA task plan
      logger.section('Phase 6: Generating QA task plan');
      
      // Build config object
      const traceQAConfig: TraceQAConfig = {
        baseUrl,
        ibmWatsonxApiKey: process.env.IBM_WATSONX_API_KEY,
        ibmWatsonxProjectId: process.env.IBM_WATSONX_PROJECT_ID,
        ibmWatsonxUrl: process.env.IBM_WATSONX_URL,
        maxRetries: 3,
        timeout: 30000,
      };
      
      const openApiSpec = await this.loadOpenApiSpec(projectConfig.openapi, acceptancePath);

      const projectContext = {
        projectName: projectConfig.projectName || 'TraceQA Project',
        baseUrl,
        projectType: projectConfig.projectType,
        language: projectConfig.language,
        healthUrl: projectConfig.healthUrl,
        openApiSpec,
        routeSources: routes.map(route => route.file).filter((file): file is string => !!file),
      };
      
      const qaTaskPlanResult = await generateQATaskPlan(
        acceptanceCriteria,
        routes,
        traceQAConfig,
        projectContext
      );
      
      const qaTaskPlan = qaTaskPlanResult.taskPlan;
      warnings.push(...qaTaskPlanResult.warnings);
      ibmUsed = qaTaskPlanResult.ibmUsed || ibmUsed;
      
      logger.success(`✓ Generated ${qaTaskPlan.summary.totalTasks} QA tasks`);
      logger.info(`  - ${qaTaskPlan.summary.automatedTasks} automated`);
      logger.info(`  - ${qaTaskPlan.summary.manualTasks} manual`);
      logger.info(`  - ${qaTaskPlan.summary.uncertainTasks} uncertain`);
      
      // Write QA task plan
      await writeQATaskPlan(qaTaskPlan, generatedDir);
      logger.newLine();

      // Phase 7: Generate HTTP tests
      logger.section('Phase 7: Generating HTTP tests');
      
      const httpTestResult = await generateHTTPTests(
        qaTaskPlan,
        routes,
        traceQAConfig,
        projectContext
      );
      
      const testSuite = httpTestResult.testSuite;
      warnings.push(...httpTestResult.warnings);
      ibmUsed = httpTestResult.ibmUsed || ibmUsed;
      
      logger.success(`✓ Generated ${testSuite.summary.totalTests} HTTP tests`);
      logger.info(`  - ${testSuite.summary.readyTests} ready`);
      logger.info(`  - ${testSuite.summary.uncertainTests} uncertain`);
      logger.info(`  - ${testSuite.summary.manualTests} manual`);
      
      // Write HTTP tests and documentation
      await writeGeneratedHTTPTests(testSuite, generatedDir);
      await writeGeneratedTestsMarkdown(qaTaskPlan, testSuite, generatedDir);
      
      // Write metadata
      const metadata = {
        generatedAt: new Date().toISOString(),
        ibmUsed,
        normalizationApplied: httpTestResult.normalizationApplied,
        warnings
      };
      await writeGeneratedMetadata(metadata, generatedDir);
      logger.newLine();

      // Phase 8: Execute ready tests
      logger.section('Phase 8: Executing ready tests');
      const readyTests = testSuite.tests.filter(t => t.status === 'ready');
      const uncertainTests = testSuite.tests.filter(t => t.status === 'uncertain');
      const manualTests = testSuite.tests.filter(t => t.status === 'manual');
      
      let executionResults: TestResult[] = [];
      let httpTestResults: HTTPTestResult[] = [];
      
      if (readyTests.length > 0) {
        logger.info(`Executing ${readyTests.length} ready test(s)...`);
        
        try {
          const executionResult = await executeHTTPTests(testSuite, traceQAConfig);

          // Store HTTP test results for new report generator
          httpTestResults = executionResult.results || [];

          // If executor returned a run-level failure (e.g., reachability), include it as a single run-level result
          if ((executionResult as any).runFailure) {
            httpTestResults.push((executionResult as any).runFailure);
          }
          
          // Convert HTTPTestResult[] to TestResult[] for backward compatibility
          executionResults = httpTestResults.map(r => ({
            testCaseId: r.testId,
            testCaseName: r.title,
            passed: r.status === 'passed',
            message: r.status === 'passed' ? 'Test passed' : `Test ${r.status}`,
            timestamp: r.timestamp,
            duration: r.duration,
            error: r.status === 'failed' ? r.evidence.join('; ') : undefined,
          }));
          
          const passed = httpTestResults.filter(r => r.status === 'passed').length;
          const failed = httpTestResults.filter(r => r.status === 'failed').length;
          
          logger.success(`✓ Executed ${readyTests.length} tests (${passed} passed, ${failed} failed)`);
        } catch (error) {
          logger.error('Test execution failed:', error);
          warnings.push(`Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        logger.warn('⚠ No ready tests to execute');
      }
      
      if (uncertainTests.length > 0) {
        logger.warn(`⚠ Skipped ${uncertainTests.length} uncertain test(s)`);
        
        // Record uncertain tests without execution
        for (const test of uncertainTests) {
          executionResults.push({
            testCaseId: test.id,
            testCaseName: test.title,
            passed: false,
            message: `Uncertain: ${test.uncertainReason || 'Unable to generate test'}`,
            timestamp: new Date().toISOString(),
            duration: 0,
            error: test.uncertainReason || undefined
          });
        }
      }
      
      if (manualTests.length > 0) {
        logger.warn(`⚠ Skipped ${manualTests.length} manual test(s)`);
        
        // Record manual tests without execution
        for (const test of manualTests) {
          executionResults.push({
            testCaseId: test.id,
            testCaseName: test.title,
            passed: false,
            message: 'Manual test - requires human execution',
            timestamp: new Date().toISOString(),
            duration: 0,
            error: 'Manual test'
          });
        }
      }
      logger.newLine();

      // Phase 9: Generate reports
      logger.section('Phase 9: Generating reports');
      const reportGenerator = new ReportGenerator();
      
      // Collect all HTTP test results (executed + uncertain + manual)
      const allHttpTestResults: HTTPTestResult[] = [...httpTestResults];
      
      // Add uncertain tests as HTTPTestResult
      for (const test of uncertainTests) {
        allHttpTestResults.push({
          testId: test.id,
          acceptanceCriterionId: test.acceptanceCriterionId,
          qaTaskId: test.qaTaskId,
          title: test.title,
          status: 'uncertain',
          executor: 'uncertain',
          stepResults: [],
          evidence: [test.uncertainReason || 'Unable to generate test'],
          classification: {
            classification: TestFailureClassification.UNCERTAIN,
            reason: test.uncertainReason || 'Unable to generate test',
            confidence: 1.0
          },
          duration: 0,
          timestamp: new Date().toISOString()
        });
      }
      
      // Add manual tests as HTTPTestResult
      for (const test of manualTests) {
        allHttpTestResults.push({
          testId: test.id,
          acceptanceCriterionId: test.acceptanceCriterionId,
          qaTaskId: test.qaTaskId,
          title: test.title,
          status: 'manual',
          executor: 'manual',
          stepResults: [],
          evidence: ['Manual test - requires human execution'],
          classification: {
            classification: TestFailureClassification.MANUAL,
            reason: 'Manual test - requires human execution',
            confidence: 1.0
          },
          duration: 0,
          timestamp: new Date().toISOString()
        });
      }

      await reportGenerator.generateReport(
        acceptanceCriteria,
        qaTaskPlan,
        testSuite,
        allHttpTestResults,
        { outputDir: proofDir, projectName: projectContext.projectName }
      );
      
      logger.success(`✓ Reports generated in ${proofDir}/`);
      logger.newLine();

      // Summary
      logger.section('Test Execution Summary');
      
      // Calculate summary statistics
      const passed = httpTestResults.filter(r => r.status === 'passed').length;
      const failed = httpTestResults.filter(r => r.status === 'failed').length;
      
      logger.keyValue('Total QA Tasks', qaTaskPlan.summary.totalTasks.toString());
      logger.keyValue('  - Automated', qaTaskPlan.summary.automatedTasks.toString());
      logger.keyValue('  - Manual', qaTaskPlan.summary.manualTasks.toString());
      logger.keyValue('  - Uncertain', qaTaskPlan.summary.uncertainTasks.toString());
      logger.newLine();
      logger.keyValue('Total HTTP Tests', testSuite.summary.totalGenerated.toString());
      logger.keyValue('  - Ready', testSuite.summary.readyTests.toString());
      logger.keyValue('  - Uncertain', testSuite.summary.uncertainTests.toString());
      logger.keyValue('  - Manual', testSuite.summary.manualTests.toString());
      logger.newLine();
      logger.keyValue('Execution Results', '');
      logger.keyValue('  - Executed', (passed + failed).toString());
      logger.keyValue('  - Passed', passed.toString());
      logger.keyValue('  - Failed', failed.toString());
      logger.keyValue('  - Skipped (uncertain + manual)', (uncertainTests.length + manualTests.length).toString());
      logger.newLine();
      logger.keyValue('Artifacts', generatedDir + '/');
      logger.keyValue('Reports', proofDir + '/');
      
      if (warnings.length > 0) {
        logger.newLine();
        logger.warn('Warnings:');
        warnings.forEach(w => logger.warn(`  - ${w}`));
      }

    } catch (error) {
      logger.error('Test execution failed:', error);
      
      // Write debug information
      try {
        const fs = await import('fs-extra');
        const path = await import('path');
        await fs.ensureDir(debugDir);
        await fs.writeFile(
          path.join(debugDir, 'error.log'),
          `Error: ${error instanceof Error ? error.message : String(error)}\n` +
          `Stack: ${error instanceof Error ? error.stack : 'N/A'}\n` +
          `Timestamp: ${new Date().toISOString()}\n`,
          'utf-8'
        );
      } catch (debugError) {
        logger.debug('Failed to write debug log:', debugError);
      }
      
      throw error;
    }
  }

  private async loadOpenApiSpec(openapiPath: string | undefined, acceptancePath: string): Promise<any | undefined> {
    if (!openapiPath) {
      return undefined;
    }

    try {
      const fs = await import('fs-extra');
      const path = await import('path');
      const yaml = await import('js-yaml');

      const baseDir = path.dirname(acceptancePath);
      const resolvedPath = path.isAbsolute(openapiPath) ? openapiPath : path.resolve(baseDir, openapiPath);

      if (!(await fs.pathExists(resolvedPath))) {
        return undefined;
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      if (resolvedPath.endsWith('.json')) {
        return JSON.parse(content);
      }

      return yaml.load(content);
    } catch (error) {
      logger.debug('Failed to load OpenAPI spec', error);
      return undefined;
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

    // NORMALIZATION LAYER: Transform IBM test cases into validated API test configs
    logger.info('🔄 Normalizing test cases...');
    const normalizer = new TestNormalizer({
      baseUrl: this.config.baseUrl,
      discoveredRoutes: this.routeDiscovery?.routes || [],
      strictValidation: true
    });

    this.normalizedTests = normalizer.normalizeTestCases(testPlan.testCases, context);

    // VALIDATION GATE (Issue #4): Check if tests are ready for execution
    logger.info('🔍 Validating tests for execution readiness...');
    const readyTests: NormalizedTest[] = [];
    const notReadyTests: Array<{ test: NormalizedTest; reason: string }> = [];

    for (const normalized of this.normalizedTests) {
      const readinessCheck = normalizer.isTestReady(normalized);
      if (readinessCheck.ready) {
        readyTests.push(normalized);
      } else {
        notReadyTests.push({ test: normalized, reason: readinessCheck.reason || 'Unknown reason' });
        logger.warn(`  ⚠️  Test not ready: ${normalized.config.name} - ${readinessCheck.reason}`);
      }
    }

    // Update normalized tests to only include ready tests
    this.normalizedTests = readyTests;

    // Log validation results
    const validTests = this.normalizedTests.filter(t => t.isValid).length;
    const invalidTests = notReadyTests.length;
    logger.info(`✅ Ready tests: ${validTests}`);
    if (invalidTests > 0) {
      logger.warn(`⚠️  Not ready tests: ${invalidTests}`);
      
      // Log details of not ready tests
      notReadyTests.forEach(({ test, reason }) => {
        const errorType = reason.startsWith('TRACEQA_GENERATION_ISSUE') ? 'generation_issue' :
                         reason.startsWith('UNCERTAIN') ? 'uncertain' : 'validation_failed';
        logger.warn(`  - ${test.config.name}: ${errorType} - ${reason}`);
      });
    }

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
      // Initialize stateful context if not already created
      if (!this.statefulContext) {
        this.statefulContext = createTestContext(testCase.id);
        logger.debug('Created stateful test context', { testId: testCase.id });
      }

      // Set context in API tester for variable substitution
      this.apiTester.setContext(this.statefulContext);

      // Increment step number for tracking
      this.statefulContext.incrementStep();

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

      // Format duration consistently using shared utility
      const formattedDuration = formatDuration(duration);
      
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
      const allPassed = results.every(r => r.passed || /uncertain/i.test(r.message || ''));
      const duration = Date.now() - startTime;
      const failedResults = results.filter(r => !r.passed && !/uncertain/i.test(r.message || ''));

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

  /**
   * Get normalized tests (for artifact generation)
   */
  getNormalizedTests(): NormalizedTest[] {
    return this.normalizedTests;
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