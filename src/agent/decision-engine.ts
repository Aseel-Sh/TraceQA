/**
 * TraceQA Decision Engine
 * Intelligent decision making for test execution and analysis
 */

import {
  AgentDecision,
  TestResult,
  TestCase,
  TestContext,
  AgentAnalysis
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Decision engine for intelligent test execution
 */
export class DecisionEngine {
  private failureHistory: Map<string, number> = new Map();
  private successHistory: Map<string, number> = new Map();

  /**
   * Analyze test result and decide next action
   */
  analyzeTestResult(
    result: TestResult,
    testCase: TestCase,
    context: TestContext
  ): AgentDecision {
    logger.debug(`Analyzing test result for: ${testCase.name}`);

    if (result.passed) {
      return this.handleSuccess(result, testCase);
    } else {
      return this.handleFailure(result, testCase, context);
    }
  }

  /**
   * Handle successful test result
   */
  private handleSuccess(_result: TestResult, testCase: TestCase): AgentDecision {
    const testId = testCase.id;
    const successCount = (this.successHistory.get(testId) || 0) + 1;
    this.successHistory.set(testId, successCount);

    // Clear failure history on success
    this.failureHistory.delete(testId);

    logger.success(`Test passed: ${testCase.name}`);

    return {
      action: 'continue',
      reasoning: `Test "${testCase.name}" passed successfully. Proceeding to next test.`,
      confidence: 0.95,
      nextSteps: ['Execute next test case'],
      requiresHumanInput: false
    };
  }

  /**
   * Handle failed test result
   */
  private handleFailure(
    result: TestResult,
    testCase: TestCase,
    context: TestContext
  ): AgentDecision {
    const testId = testCase.id;
    const failureCount = (this.failureHistory.get(testId) || 0) + 1;
    this.failureHistory.set(testId, failureCount);

    logger.warn(`Test failed (attempt ${failureCount}): ${testCase.name}`);

    // Analyze failure type
    const failureAnalysis = this.analyzeFailure(result, testCase, context);

    // Decide action based on failure analysis
    if (failureAnalysis.category === 'timing' && failureCount < 3) {
      return {
        action: 'retry',
        reasoning: `Test failed due to timing issue. Retrying with adjusted wait times (attempt ${failureCount}/3).`,
        confidence: 0.7,
        suggestions: [
          'Increase wait timeouts',
          'Add explicit wait conditions',
          'Check for loading states'
        ],
        nextSteps: ['Retry test with longer timeouts'],
        requiresHumanInput: false
      };
    }

    if (failureAnalysis.category === 'flaky' && failureCount < 2) {
      return {
        action: 'retry',
        reasoning: 'Test appears to be flaky. Retrying once to confirm.',
        confidence: 0.6,
        suggestions: ['Investigate test stability', 'Add better synchronization'],
        nextSteps: ['Retry test once'],
        requiresHumanInput: false
      };
    }

    if (failureAnalysis.severity === 'critical') {
      return {
        action: 'ask_human',
        reasoning: `Critical failure detected in "${testCase.name}". This may indicate a serious bug that requires immediate attention.`,
        confidence: 0.9,
        suggestions: [
          'Review error details',
          'Check if this is a regression',
          'Verify acceptance criteria'
        ],
        nextSteps: ['Wait for human decision'],
        requiresHumanInput: true,
        metadata: {
          failureCount,
          error: result.error,
          severity: failureAnalysis.severity
        }
      };
    }

    if (failureCount >= 3) {
      return {
        action: 'abort',
        reasoning: `Test "${testCase.name}" failed ${failureCount} times. Marking as failed and continuing with remaining tests.`,
        confidence: 0.85,
        suggestions: [
          'Review test implementation',
          'Check application logs',
          'Verify test environment'
        ],
        nextSteps: ['Document failure', 'Continue with next test'],
        requiresHumanInput: false,
        metadata: {
          failureCount,
          error: result.error
        }
      };
    }

    return {
      action: 'retry',
      reasoning: `Test failed. Retrying (attempt ${failureCount}/3).`,
      confidence: 0.65,
      suggestions: ['Review error message', 'Check test preconditions'],
      nextSteps: ['Retry test'],
      requiresHumanInput: false
    };
  }

  /**
   * Analyze failure to determine category and severity
   */
  private analyzeFailure(
    result: TestResult,
    testCase: TestCase,
    _context: TestContext
  ): { category: string; severity: 'critical' | 'high' | 'medium' | 'low' } {
    const error = result.error?.toLowerCase() || '';
    const message = result.message.toLowerCase();

    // Timing-related failures
    if (
      error.includes('timeout') ||
      error.includes('wait') ||
      message.includes('timeout')
    ) {
      return { category: 'timing', severity: 'medium' };
    }

    // Element not found
    if (
      error.includes('element not found') ||
      error.includes('no such element') ||
      error.includes('selector')
    ) {
      return { category: 'selector', severity: 'high' };
    }

    // Network errors
    if (
      error.includes('network') ||
      error.includes('connection') ||
      error.includes('fetch')
    ) {
      return { category: 'network', severity: 'medium' };
    }

    // Application errors
    if (
      error.includes('500') ||
      error.includes('internal server error') ||
      error.includes('application error')
    ) {
      return { category: 'application', severity: 'critical' };
    }

    // Assertion failures
    if (
      error.includes('assertion') ||
      error.includes('expected') ||
      error.includes('actual')
    ) {
      // Check if it's a critical acceptance criteria
      const isCritical = testCase.priority === 'high';
      return {
        category: 'assertion',
        severity: isCritical ? 'critical' : 'high'
      };
    }

    // Default to flaky if unclear
    return { category: 'flaky', severity: 'medium' };
  }

  /**
   * Decide whether to continue test execution
   */
  shouldContinueExecution(
    completedTests: TestResult[],
    remainingTests: TestCase[],
    _context: TestContext
  ): AgentDecision {
    const totalTests = completedTests.length + remainingTests.length;
    const failedTests = completedTests.filter(t => !t.passed).length;
    const failureRate = failedTests / completedTests.length;

    logger.debug(
      `Evaluating execution continuation: ${completedTests.length}/${totalTests} tests completed, ${failedTests} failed`
    );

    // Stop if failure rate is too high
    if (failureRate > 0.5 && completedTests.length >= 3) {
      return {
        action: 'ask_human',
        reasoning: `High failure rate detected (${(failureRate * 100).toFixed(1)}%). Multiple tests are failing, which may indicate a systemic issue.`,
        confidence: 0.9,
        suggestions: [
          'Review application state',
          'Check test environment',
          'Verify build was successful'
        ],
        nextSteps: ['Wait for human decision on whether to continue'],
        requiresHumanInput: true,
        metadata: {
          failureRate,
          failedTests,
          completedTests: completedTests.length
        }
      };
    }

    // Continue if we have tests remaining
    if (remainingTests.length > 0) {
      return {
        action: 'continue',
        reasoning: `${remainingTests.length} tests remaining. Continuing execution.`,
        confidence: 0.95,
        nextSteps: [`Execute next test: ${remainingTests[0].name}`],
        requiresHumanInput: false
      };
    }

    // All tests completed
    return {
      action: 'approve',
      reasoning: 'All tests completed. Ready to generate report.',
      confidence: 1.0,
      nextSteps: ['Generate test report'],
      requiresHumanInput: false
    };
  }

  /**
   * Prioritize test cases based on context and history
   */
  prioritizeTests(
    testCases: TestCase[],
    _context: TestContext
  ): TestCase[] {
    logger.debug(`Prioritizing ${testCases.length} test cases`);

    return [...testCases].sort((a, b) => {
      // Priority level (high > medium > low)
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority || 'medium'];
      const bPriority = priorityWeight[b.priority || 'medium'];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Test type (UI tests before API tests for better feedback)
      const typeWeight: Record<string, number> = { ui: 2, integration: 1.5, api: 1, both: 1.5 };
      const aType = typeWeight[a.type] || 1;
      const bType = typeWeight[b.type] || 1;

      if (aType !== bType) {
        return bType - aType;
      }

      // Number of steps (simpler tests first)
      return a.steps.length - b.steps.length;
    });
  }

  /**
   * Analyze overall test results and provide recommendations
   */
  analyzeResults(
    results: TestResult[],
    context: TestContext
  ): AgentAnalysis {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const successRate = total > 0 ? passed / total : 0;

    logger.debug(`Analyzing ${total} test results (${passed} passed, ${failed} failed)`);

    // Categorize failures
    const failureCategories = new Map<string, number>();
    results
      .filter(r => !r.passed)
      .forEach(r => {
        const analysis = this.analyzeFailure(
          r,
          { id: r.testCaseId, name: r.testCaseName } as TestCase,
          context
        );
        const count = failureCategories.get(analysis.category) || 0;
        failureCategories.set(analysis.category, count + 1);
      });

    // Generate findings
    const findings: string[] = [
      `${passed} out of ${total} tests passed (${(successRate * 100).toFixed(1)}% success rate)`
    ];

    if (failed > 0) {
      findings.push(`${failed} tests failed`);
      failureCategories.forEach((count, category) => {
        findings.push(`${count} ${category}-related failures`);
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (successRate === 1.0) {
      recommendations.push('All tests passed! The changes appear to be working correctly.');
      recommendations.push('Consider deploying to the next environment.');
    } else if (successRate >= 0.8) {
      recommendations.push('Most tests passed, but some failures need attention.');
      recommendations.push('Review failed tests to determine if they are bugs or test issues.');
    } else if (successRate >= 0.5) {
      recommendations.push('Significant number of test failures detected.');
      recommendations.push('Review application changes and test implementation.');
      recommendations.push('Consider fixing critical issues before proceeding.');
    } else {
      recommendations.push('High failure rate indicates serious issues.');
      recommendations.push('Do not deploy until issues are resolved.');
      recommendations.push('Review application logs and error messages.');
    }

    // Identify risks
    const risks: AgentAnalysis['risks'] = [];

    if (failureCategories.has('application')) {
      risks.push({
        description: 'Application errors detected during testing',
        severity: 'critical',
        mitigation: 'Review server logs and fix application bugs'
      });
    }

    if (failureCategories.has('assertion')) {
      risks.push({
        description: 'Functional requirements not met',
        severity: 'high',
        mitigation: 'Review acceptance criteria and fix failing functionality'
      });
    }

    if (failureCategories.has('timing')) {
      risks.push({
        description: 'Timing-related test failures',
        severity: 'medium',
        mitigation: 'Improve test synchronization or investigate performance issues'
      });
    }

    return {
      summary: this.generateSummary(successRate, total, failed),
      findings,
      recommendations,
      risks,
      confidence: this.calculateConfidence(successRate, total, failureCategories)
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(successRate: number, total: number, failed: number): string {
    if (successRate === 1.0) {
      return `All ${total} tests passed successfully. The changes meet all acceptance criteria.`;
    } else if (successRate >= 0.8) {
      return `${total - failed} out of ${total} tests passed. Minor issues detected that need attention.`;
    } else if (successRate >= 0.5) {
      return `${failed} out of ${total} tests failed. Significant issues detected that require fixes.`;
    } else {
      return `Critical: ${failed} out of ${total} tests failed. Major issues detected that must be resolved.`;
    }
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(
    successRate: number,
    total: number,
    failureCategories: Map<string, number>
  ): number {
    let confidence = 0.5;

    // More tests = higher confidence
    if (total >= 10) confidence += 0.2;
    else if (total >= 5) confidence += 0.1;

    // Clear results = higher confidence
    if (successRate === 1.0 || successRate === 0) confidence += 0.2;
    else if (successRate >= 0.8 || successRate <= 0.2) confidence += 0.1;

    // Consistent failure types = higher confidence
    if (failureCategories.size <= 1) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  /**
   * Reset decision engine state
   */
  reset(): void {
    this.failureHistory.clear();
    this.successHistory.clear();
    logger.debug('Decision engine state reset');
  }

  /**
   * Get failure statistics
   */
  getFailureStats(): Map<string, number> {
    return new Map(this.failureHistory);
  }

  /**
   * Get success statistics
   */
  getSuccessStats(): Map<string, number> {
    return new Map(this.successHistory);
  }
}

/**
 * Create a decision engine instance
 */
export function createDecisionEngine(): DecisionEngine {
  return new DecisionEngine();
}

// Made with Bob
