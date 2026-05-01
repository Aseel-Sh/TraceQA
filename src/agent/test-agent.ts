/**
 * TraceQA Test Agent
 * Main intelligent agent that orchestrates test planning, execution, and reporting
 */

import { WatsonxClient } from './watsonx-client.js';
import { DecisionEngine } from './decision-engine.js';
import {
  SYSTEM_PROMPT,
  getTestPlanningPrompt,
  getTestExecutionPrompt,
  getReportGenerationPrompt,
  parseJSONResponse
} from './prompts.js';
import {
  AgentConfig,
  AgentState,
  TestContext,
  TestPlan,
  TestCase,
  TestResult,
  TestResults,
  TestSummary,
  AgentAnalysis,
  ConversationMessage,
  TokenUsage,
  TraceQAError,
  ErrorCategory,
  TestType,
  DiffAnalysis
} from '../types/index.js';
import { MCPClientManager } from '../mcp/index.js';
import { logger } from '../utils/logger.js';

/**
 * Main test agent for TraceQA
 */
export class TestAgent {
  private watsonxClient: WatsonxClient;
  private decisionEngine: DecisionEngine;
  private mcpManager: MCPClientManager | null = null;
  private state: AgentState;

  constructor(config: AgentConfig, mcpManager?: MCPClientManager) {
    // Initialize Watsonx client with system prompt
    this.watsonxClient = new WatsonxClient({
      ...config,
      systemPrompt: config.systemPrompt || SYSTEM_PROMPT
    });

    this.decisionEngine = new DecisionEngine();
    this.mcpManager = mcpManager || null;

    // Initialize agent state
    this.state = {
      currentPhase: 'idle',
      conversationHistory: [],
      executedTests: [],
      pendingDecisions: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      },
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    logger.info('Test agent initialized');
  }

  /**
   * Set MCP manager for test execution
   */
  setMCPManager(manager: MCPClientManager): void {
    this.mcpManager = manager;
    logger.debug('MCP manager set for test agent');
  }

  /**
   * Create a comprehensive test plan based on context
   */
  async createTestPlan(context: TestContext, diffAnalysis?: DiffAnalysis | null): Promise<TestPlan> {
    this.updatePhase('planning');
    logger.info('Creating test plan...');

    try {
      // Generate test planning prompt with optional diff analysis
      const prompt = getTestPlanningPrompt(context, diffAnalysis);

      // Get response from Watsonx
      const response = await this.watsonxClient.sendMessage(prompt);

      // Parse test plan from response
      const parsedPlan = parseJSONResponse<{
        testCases: TestCase[];
        estimatedDuration: number;
        requiredResources: string[];
        reasoning: string;
      }>(response);

      if (!parsedPlan || !parsedPlan.testCases) {
        throw new TraceQAError(
          'Failed to parse test plan from agent response',
          ErrorCategory.AGENT,
          { response }
        );
      }

      // Create test plan
      const testPlan: TestPlan = {
        id: `plan-${Date.now()}`,
        testCases: parsedPlan.testCases,
        estimatedDuration: parsedPlan.estimatedDuration,
        requiredResources: parsedPlan.requiredResources,
        createdAt: new Date().toISOString()
      };

      // Prioritize test cases
      testPlan.testCases = this.decisionEngine.prioritizeTests(
        testPlan.testCases,
        context
      );

      this.state.testPlan = testPlan;
      this.updateTokenUsage();

      logger.success(
        `Test plan created with ${testPlan.testCases.length} test cases (estimated ${testPlan.estimatedDuration}s)`
      );
      logger.debug(`Reasoning: ${parsedPlan.reasoning}`);

      return testPlan;
    } catch (error) {
      logger.error('Failed to create test plan:', error);
      throw new TraceQAError(
        'Failed to create test plan',
        ErrorCategory.AGENT,
        error
      );
    }
  }

  /**
   * Execute all tests in the test plan
   */
  async executeTests(
    testPlan: TestPlan,
    context: TestContext
  ): Promise<TestResults> {
    this.updatePhase('executing');
    logger.info(`Executing ${testPlan.testCases.length} test cases...`);

    const results: TestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < testPlan.testCases.length; i++) {
      const testCase = testPlan.testCases[i];
      logger.info(`[${i + 1}/${testPlan.testCases.length}] Executing: ${testCase.name}`);

      // Execute test case
      const result = await this.executeTestCase(testCase, context);
      results.push(result);
      this.state.executedTests.push(result);

      // Analyze result and decide next action
      const decision = this.decisionEngine.analyzeTestResult(
        result,
        testCase,
        context
      );
      this.state.pendingDecisions.push(decision);

      // Handle decision
      if (decision.requiresHumanInput) {
        logger.warn('Human input required:', decision.reasoning);
        // In a real implementation, this would pause and wait for human input
        // For now, we'll continue
      }

      if (decision.action === 'retry' && !result.passed) {
        logger.info('Retrying test case...');
        const retryResult = await this.executeTestCase(testCase, context);
        results[results.length - 1] = retryResult;
        this.state.executedTests[this.state.executedTests.length - 1] = retryResult;
      }

      if (decision.action === 'abort') {
        logger.warn('Test execution aborted:', decision.reasoning);
        break;
      }

      // Check if we should continue
      const remainingTests = testPlan.testCases.slice(i + 1);
      const continueDecision = this.decisionEngine.shouldContinueExecution(
        results,
        remainingTests,
        context
      );

      if (continueDecision.action === 'ask_human') {
        logger.warn('Execution paused for human decision:', continueDecision.reasoning);
        // In a real implementation, wait for human input
      }
    }

    const duration = Date.now() - startTime;

    // Generate summary
    const summary: TestSummary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: testPlan.testCases.length - results.length,
      duration,
      successRate: results.length > 0 ? results.filter(r => r.passed).length / results.length : 0
    };

    logger.success(
      `Test execution completed: ${summary.passed}/${summary.total} passed (${(summary.successRate * 100).toFixed(1)}%)`
    );

    return {
      summary,
      results,
      duration,
      timestamp: new Date().toISOString(),
      repository: context.repository,
      testPlan
    };
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      logger.debug(`Executing test case: ${testCase.name}`);

      // For UI tests, we need MCP manager
      if (testCase.type === TestType.WEB_UI && !this.mcpManager) {
        throw new TraceQAError(
          'MCP manager required for UI tests',
          ErrorCategory.AGENT
        );
      }

      // Generate execution prompt
      const stepsDescription = testCase.steps
        .map((step, i) => `${i + 1}. ${step.description} (${step.action} ${step.target || ''})`)
        .join('\n');

      const prompt = getTestExecutionPrompt(
        testCase.name,
        stepsDescription,
        context
      );

      // Get execution guidance from Watsonx
      const response = await this.watsonxClient.sendMessage(prompt);

      // Execute steps (simplified - in real implementation, would use MCP)
      const passed = await this.executeSteps(testCase, context);

      const duration = Date.now() - startTime;

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed,
        duration,
        message: passed ? 'Test passed successfully' : 'Test failed',
        timestamp: new Date().toISOString(),
        logs: [response]
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Test case failed: ${testCase.name}`, error);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration,
        message: 'Test execution error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute test steps (simplified implementation)
   */
  private async executeSteps(
    testCase: TestCase,
    _context: TestContext
  ): Promise<boolean> {
    // This is a simplified implementation
    // In a real implementation, this would:
    // 1. Use MCP to execute browser actions
    // 2. Make API calls for API tests
    // 3. Verify results at each step
    // 4. Handle errors and retries

    logger.debug(`Executing ${testCase.steps.length} steps for ${testCase.name}`);

    // Note: Actual test execution is now handled by TestCoordinator
    // which delegates to APITester or WebTester based on test type.
    // This method is kept for backward compatibility but should not be used directly.
    
    logger.warn('executeTestCase called directly - tests should be executed via TestCoordinator');
    
    // Return false to indicate this path should not be used
    return false;
  }

  /**
   * Analyze test results and generate insights
   */
  async analyzeResults(
    results: TestResults,
    context: TestContext
  ): Promise<AgentAnalysis> {
    this.updatePhase('analyzing');
    logger.info('Analyzing test results...');

    try {
      const analysis = this.decisionEngine.analyzeResults(
        results.results,
        context
      );

      this.updateTokenUsage();

      logger.success('Test results analyzed');
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze results:', error);
      throw new TraceQAError(
        'Failed to analyze test results',
        ErrorCategory.AGENT,
        error
      );
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(
    results: TestResults,
    _analysis: AgentAnalysis,
    context: TestContext
  ): Promise<string> {
    this.updatePhase('reporting');
    logger.info('Generating test report...');

    try {
      const resultsText = results.results
        .map(r => `- ${r.testCaseName}: ${r.passed ? 'PASSED' : 'FAILED'} (${r.duration}ms)`)
        .join('\n');

      const summaryText = `
Total: ${results.summary.total}
Passed: ${results.summary.passed}
Failed: ${results.summary.failed}
Success Rate: ${(results.summary.successRate * 100).toFixed(1)}%
Duration: ${results.duration}ms
      `.trim();

      const prompt = getReportGenerationPrompt(resultsText, summaryText, context);

      const report = await this.watsonxClient.sendMessage(prompt);

      this.updateTokenUsage();

      logger.success('Test report generated');
      return report;
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw new TraceQAError(
        'Failed to generate test report',
        ErrorCategory.AGENT,
        error
      );
    }
  }

  /**
   * Run complete test cycle: plan, execute, analyze, report
   */
  async runTestCycle(context: TestContext): Promise<{
    testPlan: TestPlan;
    results: TestResults;
    analysis: AgentAnalysis;
    report: string;
  }> {
    logger.info('Starting complete test cycle...');

    try {
      // Create test plan
      const testPlan = await this.createTestPlan(context);

      // Execute tests
      const results = await this.executeTests(testPlan, context);

      // Analyze results
      const analysis = await this.analyzeResults(results, context);

      // Generate report
      const report = await this.generateReport(results, analysis, context);

      this.updatePhase('idle');

      logger.success('Test cycle completed successfully');

      return {
        testPlan,
        results,
        analysis,
        report
      };
    } catch (error) {
      logger.error('Test cycle failed:', error);
      this.updatePhase('idle');
      throw error;
    }
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): TokenUsage {
    return this.watsonxClient.getTokenUsage();
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return this.watsonxClient.getHistory();
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.watsonxClient.clearHistory();
    this.watsonxClient.resetTokenUsage();
    this.decisionEngine.reset();

    this.state = {
      currentPhase: 'idle',
      conversationHistory: [],
      executedTests: [],
      pendingDecisions: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      },
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    logger.info('Agent state reset');
  }

  /**
   * Update current phase
   */
  private updatePhase(phase: AgentState['currentPhase']): void {
    this.state.currentPhase = phase;
    this.state.lastActivity = new Date().toISOString();
    logger.debug(`Agent phase: ${phase}`);
  }

  /**
   * Update token usage from watsonx client
   */
  private updateTokenUsage(): void {
    this.state.tokenUsage = this.watsonxClient.getTokenUsage();
    this.state.conversationHistory = this.watsonxClient.getHistory();
  }

}

/**
 * Create a test agent with configuration
 */
export function createTestAgent(
  config: AgentConfig,
  mcpManager?: MCPClientManager
): TestAgent {
  return new TestAgent(config, mcpManager);
}

/**
 * Create a test agent with API key
 */
export function createTestAgentWithKey(
  apiKey: string,
  options?: Partial<AgentConfig>,
  mcpManager?: MCPClientManager
): TestAgent {
  return new TestAgent(
    {
      apiKey,
      ...options
    },
    mcpManager
  );
}

// Made with Bob
