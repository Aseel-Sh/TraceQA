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
  getReportGenerationPrompt
} from './prompts.js';
import { parseJSONSafely, safeExtractJSON, ExtractionResult } from '../utils/json-extractor.js';
import fs from 'fs-extra';
import path from 'path';
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
import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
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
   * Generate QA task suggestions from IBM watsonx
   * Returns AI suggestions array instead of complete test plan
   */
  async generateTests(
    acceptanceCriteria: any[],
    routes: any[],
    baseUrl: string
  ): Promise<any[]> {
    logger.info('Generating QA task suggestions from IBM watsonx...');
    
    try {
      const prompt = this.buildPrompt(acceptanceCriteria, routes, baseUrl);
      const response = await this.watsonxClient.sendMessage(prompt);
      
      // Use robust JSON extraction
      const extractionResult: ExtractionResult = safeExtractJSON(response, {
        saveRawOnFailure: true
      });
      
      if (!extractionResult.success) {
        logger.warn('Failed to extract JSON from IBM response');
        
        // Save raw output for debugging
        if (extractionResult.rawText) {
          await this.saveRawResponse(extractionResult.rawText);
        }
        
        // Return empty array - fallback mapper will handle it
        logger.info('Falling back to deterministic test generation');
        return [];
      }
      
      // Validate extracted data
      const data = extractionResult.data;
      
      // Handle both array and object responses
      let suggestions: any[] = [];
      
      if (Array.isArray(data)) {
        suggestions = data;
      } else if (data && typeof data === 'object') {
        // Check for common response structures
        if (Array.isArray(data.tasks)) {
          suggestions = data.tasks;
        } else if (Array.isArray(data.testCases)) {
          suggestions = data.testCases;
        } else if (Array.isArray(data.tests)) {
          suggestions = data.tests;
        } else {
          // Single task/test object
          suggestions = [data];
        }
      }
      
      logger.success(`✓ Extracted ${suggestions.length} QA task suggestions from IBM`);
      return suggestions;
      
    } catch (error) {
      logger.error('Error generating tests from IBM:', error);
      
      // Return empty array - fallback mapper will handle it
      logger.info('Falling back to deterministic test generation');
      return [];
    }
  }

  /**
   * Build prompt for QA task suggestions
   */
  private buildPrompt(
    acceptanceCriteria: any[],
    routes: any[],
    baseUrl: string
  ): string {
    const prompt = `You are a QA automation expert. Analyze the following acceptance criteria and API routes to suggest QA tasks.

Acceptance Criteria:
${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description || ac.criterion}
   Expected: ${ac.expectedResult || 'Not specified'}`).join('\n')}

Discovered API Routes:
${routes.map(r => `- ${r.method} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')}

Base URL: ${baseUrl}

For each acceptance criterion, suggest a QA task with:
- acceptanceCriterionId: The AC ID (e.g., "AC-1")
- title: Clear task title
- type: "api", "ui", "integration", "manual", or "uncertain"
- priority: "high", "medium", or "low"
- executionMode: "automated", "manual", or "uncertain"
- steps: Array of test steps with description and expectedOutcome
- expectedResult: What should happen
- reasoning: Why this task maps to the AC
- uncertainReason: (optional) Why automation is uncertain

Return a JSON array of task suggestions. If you cannot safely automate a task, mark it as "uncertain" with a reason.

Example format:
[
  {
    "acceptanceCriterionId": "AC-1",
    "title": "Test user registration with valid data",
    "type": "api",
    "priority": "high",
    "executionMode": "automated",
    "steps": [
      {
        "description": "Send POST request to /api/register with valid user data",
        "expectedOutcome": "User is created successfully"
      }
    ],
    "expectedResult": "User registration succeeds with 201 status",
    "reasoning": "AC-1 requires testing successful registration"
  }
]

Respond with ONLY the JSON array, no explanations.`;

    return prompt;
  }

  /**
   * Save raw response for debugging
   */
  private async saveRawResponse(rawText: string): Promise<void> {
    try {
      const debugDir = 'traceqa-debug';
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure debug directory exists
      try {
        await fs.mkdir(debugDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }
      
      const timestamp = Date.now();
      const filename = `raw-ibm-response-${timestamp}.txt`;
      const filepath = path.join(debugDir, filename);
      
      await fs.writeFile(filepath, rawText, 'utf-8');
      logger.info(`Raw IBM response saved to ${filepath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to save raw response: ${errorMsg}`);
    }
  }

  /**
   * Create a comprehensive test plan based on context
   */
  async createTestPlan(
    context: TestContext,
    diffAnalysis?: DiffAnalysis | null,
    discoveredRoutes?: RouteDiscoveryResult | null
  ): Promise<TestPlan> {
    this.updatePhase('planning');
    logger.info('Creating test plan...');

    try {
      // Generate test planning prompt with optional diff analysis and discovered routes
      const prompt = getTestPlanningPrompt(context, diffAnalysis, discoveredRoutes);

      // Get response from Watsonx
      const response = await this.watsonxClient.sendMessage(prompt);

      // Parse test plan from response with repair
      const parsedPlan = await this.parseTestPlanWithRepair(response);

      if (!parsedPlan || !parsedPlan.testCases) {
        throw new TraceQAError(
          'Failed to parse test plan from agent response',
          ErrorCategory.AGENT,
          { response }
        );
      }

      // Validate test plan structure
      this.validateTestPlan(parsedPlan);

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
   * Parse test plan with repair attempts
   */
  private async parseTestPlanWithRepair(
    rawResponse: string,
    attempt: number = 1
  ): Promise<{
    testCases: TestCase[];
    estimatedDuration: number;
    requiredResources: string[];
    reasoning: string;
  } | null> {
    // Try balanced JSON extraction first
    const parsed = parseJSONSafely<{
      testCases: TestCase[];
      estimatedDuration: number;
      requiredResources: string[];
      reasoning: string;
    }>(rawResponse);
    
    if (parsed && this.validateTestPlanStructure(parsed)) {
      logger.debug('Successfully parsed test plan using balanced extraction');
      return parsed;
    }

    // Save raw response for debugging
    try {
      const debugDir = path.join(process.cwd(), 'traceqa-debug');
      await fs.ensureDir(debugDir);
      await fs.writeFile(
        path.join(debugDir, `raw-response-attempt-${attempt}.txt`),
        rawResponse,
        'utf-8'
      );
      logger.info(`Raw AI response saved to: traceqa-debug/raw-response-attempt-${attempt}.txt`);
    } catch (err) {
      logger.warn(`Failed to save debug response: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Try one repair pass if first attempt failed
    if (attempt === 1) {
      logger.warn('Initial JSON parsing failed, attempting repair...');
      
      const repairPrompt = `The following response contains invalid JSON. Please return ONLY valid JSON with no markdown, no prose, no code fences, no commentary:

${rawResponse}

Return valid JSON only:`;

      const repairedResponse = await this.watsonxClient.sendMessage(repairPrompt, {
        maxTokens: 4000,
        temperature: 0.1,
      });

      return this.parseTestPlanWithRepair(repairedResponse, 2);
    }

    throw new TraceQAError(
      'Failed to parse test plan after repair attempt',
      ErrorCategory.AGENT,
      { rawResponse: rawResponse.substring(0, 500) }
    );
  }

  /**
   * Validate test plan structure (returns boolean for use in parseJSONSafely)
   */
  private validateTestPlanStructure(plan: any): boolean {
    return !!(
      plan &&
      plan.testCases &&
      Array.isArray(plan.testCases) &&
      typeof plan.estimatedDuration === 'number' &&
      plan.requiredResources &&
      Array.isArray(plan.requiredResources)
    );
  }

  /**
   * Validate test plan structure
   */
  private validateTestPlan(plan: any): void {
    const errors: string[] = [];

    if (!plan.testCases || !Array.isArray(plan.testCases)) {
      errors.push('testCases must be an array');
    } else {
      plan.testCases.forEach((tc: any, index: number) => {
        if (!tc.id) errors.push(`Test case ${index}: missing id`);
        if (!tc.name) errors.push(`Test case ${index}: missing name`);
        if (!tc.type) errors.push(`Test case ${index}: missing type`);
        if (!tc.steps || !Array.isArray(tc.steps)) {
          errors.push(`Test case ${index}: steps must be an array`);
        }
      });
    }

    if (typeof plan.estimatedDuration !== 'number') {
      errors.push('estimatedDuration must be a number');
    }

    if (!plan.requiredResources || !Array.isArray(plan.requiredResources)) {
      errors.push('requiredResources must be an array');
    }

    if (errors.length > 0) {
      logger.error('Test plan validation failed:', errors);
      throw new TraceQAError(
        'Test plan validation failed',
        ErrorCategory.AGENT,
        { validationErrors: errors }
      );
    }

    logger.debug('Test plan validation passed');
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
