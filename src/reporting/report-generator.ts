/**
 * TraceQA Report Generator
 * Generates comprehensive test reports with proper result classification
 * and trace matrix mapping AC->Task->Test->Result
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  QATaskPlan,
  GeneratedHTTPTestSuite,
  HTTPTestResult,
  AcceptanceCriterion,
} from '../types/index.js';
import { logger, formatDuration } from '../utils/logger.js';

/**
 * Report summary statistics
 */
export interface ReportSummary {
  timestamp: string;
  projectName: string;
  acceptanceCriteria: {
    total: number;
    covered: number;
    uncovered: number;
  };
  qaTasks: {
    total: number;
    automated: number;
    manual: number;
    uncertain: number;
  };
  generatedTests: {
    total: number;
    ready: number;
    uncertain: number;
    manual: number;
  };
  executionResults: {
    total: number;
    executed: number;
    passed: number;
    failed: number;
    uncertain: number;
    manual: number;
    skipped: number;
  };
  classifications: {
    passed: number;
    application_failure: number;
    traceqa_generation_issue: number;
    uncertain: number;
    manual: number;
  };
  mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Trace matrix entry with complete AC->Task->Test->Result mapping
 */
export interface TraceMatrixEntry {
  acceptanceCriterionId: string;
  acceptanceCriterionText: string;
  qaTasks: {
    taskId: string;
    title: string;
    type: string;
    executionMode: string;
  }[];
  generatedTests: {
    testId: string;
    title: string;
    status: string;
    uncertainReason?: string;
  }[];
  executionResults: {
    testId: string;
    status: string;
    classification: string;
    executor: string;
    duration: number;
  }[];
  coverage: {
    tasksGenerated: number;
    testsGenerated: number;
    testsExecuted: number;
    testsPassed: number;
    testsFailed: number;
  };
}

/**
 * Complete report data structure
 */
export interface ReportData {
  summary: ReportSummary;
  traceMatrix: TraceMatrixEntry[];
  testResults: HTTPTestResult[];
  mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  riskLevel: 'low' | 'medium' | 'high';
  risks: string[];
  recommendations: string[];
}

/**
 * Report Generator
 * Generates comprehensive reports with proper classification and traceability
 */
export class ReportGenerator {
  private static readonly VERSION = '2.0.0';
  private static readonly DEFAULT_OUTPUT_DIR = 'traceqa-proof';

  /**
   * Generate complete report with all artifacts
   * 
   * @param acceptanceCriteria - Parsed acceptance criteria
   * @param taskPlan - Generated QA task plan
   * @param testSuite - Generated HTTP test suite
   * @param testResults - Execution results
   * @param config - Configuration options
   * @returns Paths to generated report files
   */
  async generateReport(
    acceptanceCriteria: AcceptanceCriterion[],
    taskPlan: QATaskPlan,
    testSuite: GeneratedHTTPTestSuite,
    testResults: HTTPTestResult[],
    config?: { outputDir?: string; projectName?: string }
  ): Promise<{
    reportPath: string;
    traceMatrixPath: string;
  }> {
    const reportDir = config?.outputDir || ReportGenerator.DEFAULT_OUTPUT_DIR;
    const projectName = config?.projectName || taskPlan.projectName || testSuite.projectName || 'Unknown Project';

    try {
      // Create output directory
      await this.ensureDirectory(reportDir);

      // Generate trace matrix
      const traceMatrix = this.generateTraceMatrix(
        acceptanceCriteria,
        taskPlan,
        testSuite,
        testResults
      );

      // Generate summary
      const summary = this.generateSummary(
        projectName,
        acceptanceCriteria,
        taskPlan,
        testSuite,
        testResults,
        traceMatrix
      );

      // Calculate merge readiness and risk
      const { mergeReadiness, riskLevel, risks, recommendations } = this.assessMergeReadiness(
        summary,
        traceMatrix,
        testResults
      );

      // Create complete report data
      const reportData: ReportData = {
        summary,
        traceMatrix,
        testResults,
        mergeReadiness,
        riskLevel,
        risks,
        recommendations
      };

      // Write all report files
      const reportPath = path.join(reportDir, 'report.json');
      const traceMatrixPath = path.join(reportDir, 'trace-matrix.json');
      const markdownPath = path.join(reportDir, 'report.md');

      await Promise.all([
        this.writeJsonReport(reportPath, reportData),
        this.writeTraceMatrix(traceMatrixPath, traceMatrix),
        this.writeMarkdownReport(markdownPath, reportData)
      ]);

      logger.success(`Reports generated successfully in ${reportDir}/`);
      logger.info(`  - report.json`);
      logger.info(`  - trace-matrix.json`);
      logger.info(`  - report.md`);

      // Display merge readiness
      this.displayMergeReadiness(mergeReadiness, riskLevel, summary);

      return { reportPath, traceMatrixPath };
    } catch (error) {
      logger.error('Failed to generate reports:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive trace matrix with AC->Task->Test->Result mapping
   * 
   * @param acceptanceCriteria - Acceptance criteria
   * @param taskPlan - QA task plan
   * @param testSuite - Generated test suite
   * @param testResults - Execution results
   * @returns Trace matrix entries
   */
  generateTraceMatrix(
    acceptanceCriteria: AcceptanceCriterion[],
    taskPlan: QATaskPlan,
    testSuite: GeneratedHTTPTestSuite,
    testResults: HTTPTestResult[]
  ): TraceMatrixEntry[] {
    const entries: TraceMatrixEntry[] = [];

    for (const criterion of acceptanceCriteria) {
      // Find QA tasks for this criterion
      const relatedTasks = taskPlan.tasks.filter(
        task => task.acceptanceCriterionId === criterion.id
      );

      // Find generated tests for this criterion
      const relatedTests = testSuite.tests.filter(
        test => test.acceptanceCriterionId === criterion.id
      );

      // Find execution results for this criterion
      const relatedResults = testResults.filter(
        result => result.acceptanceCriterionId === criterion.id
      );

      // Calculate coverage metrics
      const testsExecuted = relatedResults.filter(
        r => r.status !== 'skipped' && r.status !== 'manual'
      ).length;
      const testsPassed = relatedResults.filter(
        r => r.status === 'passed'
      ).length;
      const testsFailed = relatedResults.filter(
        r => r.status === 'failed'
      ).length;

      entries.push({
        acceptanceCriterionId: criterion.id,
        acceptanceCriterionText: criterion.description,
        qaTasks: relatedTasks.map(task => ({
          taskId: task.taskId,
          title: task.title,
          type: task.type,
          executionMode: task.executionMode
        })),
        generatedTests: relatedTests.map(test => ({
          testId: test.id,
          title: test.title,
          status: test.status,
          uncertainReason: test.uncertainReason || undefined
        })),
        executionResults: relatedResults.map(result => ({
          testId: result.testId,
          status: result.status,
          classification: result.classification,
          executor: result.executor,
          duration: result.duration
        })),
        coverage: {
          tasksGenerated: relatedTasks.length,
          testsGenerated: relatedTests.length,
          testsExecuted,
          testsPassed,
          testsFailed
        }
      });
    }

    return entries;
  }

  /**
   * Generate comprehensive summary statistics
   * 
   * @param projectName - Project name
   * @param acceptanceCriteria - Acceptance criteria
   * @param taskPlan - QA task plan
   * @param testSuite - Generated test suite
   * @param testResults - Execution results
   * @param traceMatrix - Trace matrix
   * @returns Report summary
   */
  private generateSummary(
    projectName: string,
    acceptanceCriteria: AcceptanceCriterion[],
    taskPlan: QATaskPlan,
    testSuite: GeneratedHTTPTestSuite,
    testResults: HTTPTestResult[],
    traceMatrix: TraceMatrixEntry[]
  ): ReportSummary {
    // Count covered criteria (those with at least one test)
    const coveredCriteria = traceMatrix.filter(
      entry => entry.generatedTests.length > 0
    ).length;

    // Execution results statistics
    const executed = testResults.filter(
      r => r.status !== 'skipped' && r.status !== 'manual'
    ).length;
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const uncertain = testResults.filter(r => r.status === 'uncertain').length;
    const manual = testResults.filter(r => r.status === 'manual').length;
    const skipped = testResults.filter(r => r.status === 'skipped').length;

    // Classification statistics
    const classifications = {
      passed: testResults.filter(r => r.classification === 'passed').length,
      application_failure: testResults.filter(r => r.classification === 'application_failure').length,
      traceqa_generation_issue: testResults.filter(r => r.classification === 'traceqa_generation_issue').length,
      uncertain: testResults.filter(r => r.classification === 'uncertain').length,
      manual: testResults.filter(r => r.classification === 'manual').length
    };

    // Determine merge readiness (preliminary)
    let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
    if (classifications.application_failure > 0) {
      mergeReadiness = 'not_ready';
    } else if (classifications.traceqa_generation_issue > 0 || classifications.uncertain > 0) {
      mergeReadiness = 'uncertain';
    }

    // Determine risk level (preliminary)
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (classifications.application_failure > 2 || failed > 3) {
      riskLevel = 'high';
    } else if (classifications.application_failure > 0 || failed > 0 || uncertain > 2) {
      riskLevel = 'medium';
    }

    return {
      timestamp: new Date().toISOString(),
      projectName,
      acceptanceCriteria: {
        total: acceptanceCriteria.length,
        covered: coveredCriteria,
        uncovered: acceptanceCriteria.length - coveredCriteria
      },
      qaTasks: {
        total: taskPlan.summary.totalTasks,
        automated: taskPlan.summary.automatedTasks,
        manual: taskPlan.summary.manualTasks,
        uncertain: taskPlan.summary.uncertainTasks
      },
      generatedTests: {
        total: testSuite.summary.totalTests,
        ready: testSuite.summary.readyTests,
        uncertain: testSuite.summary.uncertainTests,
        manual: testSuite.summary.manualTests
      },
      executionResults: {
        total: testResults.length,
        executed,
        passed,
        failed,
        uncertain,
        manual,
        skipped
      },
      classifications,
      mergeReadiness,
      riskLevel
    };
  }

  /**
   * Assess merge readiness and risk level
   * 
   * @param summary - Report summary
   * @param traceMatrix - Trace matrix
   * @param testResults - Test results
   * @returns Merge readiness assessment
   */
  private assessMergeReadiness(
    summary: ReportSummary,
    _traceMatrix: TraceMatrixEntry[],
    _testResults: HTTPTestResult[]
  ): {
    mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
    riskLevel: 'low' | 'medium' | 'high';
    risks: string[];
    recommendations: string[];
  } {
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Check for application failures
    if (summary.classifications.application_failure > 0) {
      risks.push(`${summary.classifications.application_failure} application failure(s) detected`);
      recommendations.push('Fix application failures before merging');
    }

    // Check for test generation issues
    if (summary.classifications.traceqa_generation_issue > 0) {
      risks.push(`${summary.classifications.traceqa_generation_issue} test generation issue(s)`);
      recommendations.push('Review and fix test generation issues');
    }

    // Check for uncertain tests
    if (summary.classifications.uncertain > 2) {
      risks.push(`${summary.classifications.uncertain} uncertain test(s)`);
      recommendations.push('Investigate uncertain tests or run manually');
    }

    // Check coverage
    const coveragePercent = (summary.acceptanceCriteria.covered / summary.acceptanceCriteria.total) * 100;
    if (coveragePercent < 80) {
      risks.push(`Low coverage: ${coveragePercent.toFixed(1)}%`);
      recommendations.push('Improve test coverage for uncovered acceptance criteria');
    }

    // Check execution rate
    const executionRate = (summary.executionResults.executed / summary.executionResults.total) * 100;
    if (executionRate < 80 && summary.executionResults.total > 0) {
      risks.push(`Low execution rate: ${executionRate.toFixed(1)}%`);
      recommendations.push('Execute remaining tests');
    }

    // Determine final merge readiness
    let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
    if (summary.classifications.application_failure > 0) {
      mergeReadiness = 'not_ready';
    } else if (
      summary.classifications.traceqa_generation_issue > 0 ||
      summary.classifications.uncertain > 2 ||
      executionRate < 50
    ) {
      mergeReadiness = 'uncertain';
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (summary.classifications.application_failure > 2 || coveragePercent < 50) {
      riskLevel = 'high';
    } else if (
      summary.classifications.application_failure > 0 ||
      summary.classifications.traceqa_generation_issue > 2 ||
      coveragePercent < 80
    ) {
      riskLevel = 'medium';
    }

    // Add positive recommendations if ready
    if (mergeReadiness === 'ready') {
      recommendations.push('All tests passed - safe to merge');
    }

    return { mergeReadiness, riskLevel, risks, recommendations };
  }

  /**
   * Write JSON report
   */
  private async writeJsonReport(filePath: string, data: ReportData): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Write trace matrix JSON
   */
  private async writeTraceMatrix(filePath: string, matrix: TraceMatrixEntry[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(matrix, null, 2), 'utf-8');
  }

  /**
   * Write markdown report
   */
  private async writeMarkdownReport(filePath: string, data: ReportData): Promise<void> {
    const md = this.generateMarkdown(data);
    await fs.writeFile(filePath, md, 'utf-8');
  }

  /**
   * Generate markdown report content
   */
  private generateMarkdown(data: ReportData): string {
    const { summary, traceMatrix, testResults, mergeReadiness, riskLevel, risks, recommendations } = data;

    let md = `# TraceQA Test Report\n\n`;
    md += `**Project:** ${summary.projectName}\n`;
    md += `**Generated:** ${summary.timestamp}\n`;
    md += `**Executor:** HTTP API executor\n`;
    md += `**TraceQA Version:** ${ReportGenerator.VERSION}\n\n`;

    // Summary Section
    md += `## Summary\n\n`;
    md += `- **Acceptance Criteria:** ${summary.acceptanceCriteria.total} total, ${summary.acceptanceCriteria.covered} covered\n`;
    md += `- **QA Tasks:** ${summary.qaTasks.total} generated (${summary.qaTasks.automated} automated, ${summary.qaTasks.manual} manual, ${summary.qaTasks.uncertain} uncertain)\n`;
    md += `- **Generated Tests:** ${summary.generatedTests.total} generated (${summary.generatedTests.ready} ready, ${summary.generatedTests.uncertain} uncertain, ${summary.generatedTests.manual} manual)\n`;
    md += `- **Execution Results:** ${summary.executionResults.executed}/${summary.executionResults.total} executed, ${summary.executionResults.passed} passed, ${summary.executionResults.failed} failed\n\n`;

    // Result Classifications
    md += `## Result Classifications\n\n`;
    md += `- ✓ **Passed:** ${summary.classifications.passed}\n`;
    md += `- ✗ **Application Failures:** ${summary.classifications.application_failure}\n`;
    md += `- ⚠ **Test Generation Issues:** ${summary.classifications.traceqa_generation_issue}\n`;
    md += `- ? **Uncertain:** ${summary.classifications.uncertain}\n`;
    md += `- 👤 **Manual:** ${summary.classifications.manual}\n\n`;

    // Merge Readiness
    const readinessEmoji = {
      ready: '✅',
      not_ready: '❌',
      uncertain: '⚠️'
    }[mergeReadiness];

    const readinessText = {
      ready: 'READY TO MERGE',
      not_ready: 'NOT READY TO MERGE',
      uncertain: 'UNCERTAIN - REVIEW NEEDED'
    }[mergeReadiness];

    md += `## Merge Readiness\n\n`;
    md += `${readinessEmoji} **${readinessText}**\n\n`;

    if (recommendations.length > 0) {
      md += `**Recommendations:**\n`;
      recommendations.forEach(rec => {
        md += `- ${rec}\n`;
      });
      md += `\n`;
    }

    // Risk Summary
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    }[riskLevel];

    md += `## Risk Summary\n\n`;
    md += `**Risk Level:** ${riskEmoji} ${riskLevel.toUpperCase()}\n\n`;

    if (risks.length > 0) {
      md += `**Identified Risks:**\n`;
      risks.forEach(risk => {
        md += `- ⚠️ ${risk}\n`;
      });
      md += `\n`;
    } else {
      md += `No significant risks identified.\n\n`;
    }

    // Trace Matrix
    md += `## Trace Matrix\n\n`;

    for (const entry of traceMatrix) {
      md += `### ${entry.acceptanceCriterionId}: ${entry.acceptanceCriterionText}\n\n`;

      // QA Tasks
      if (entry.qaTasks.length > 0) {
        md += `**QA Tasks:**\n`;
        entry.qaTasks.forEach(task => {
          md += `- ${task.taskId}: ${task.title} (${task.type}, ${task.executionMode})\n`;
        });
        md += `\n`;
      }

      // Generated Tests
      if (entry.generatedTests.length > 0) {
        md += `**Generated Tests:**\n`;
        entry.generatedTests.forEach(test => {
          const statusIcon = test.status === 'ready' ? '✓' : test.status === 'uncertain' ? '?' : '👤';
          md += `- ${statusIcon} ${test.testId}: ${test.title} (${test.status})`;
          if (test.uncertainReason) {
            md += ` - ${test.uncertainReason}`;
          }
          md += `\n`;
        });
        md += `\n`;
      }

      // Execution Results
      if (entry.executionResults.length > 0) {
        md += `**Execution Results:**\n`;
        entry.executionResults.forEach(result => {
          const statusIcon = {
            passed: '✓',
            failed: '✗',
            uncertain: '?',
            manual: '👤',
            skipped: '⊘'
          }[result.status] || '?';
          
          const classIcon = {
            passed: '✓',
            application_failure: '✗',
            traceqa_generation_issue: '⚠',
            uncertain: '?',
            manual: '👤'
          }[result.classification] || '?';

          md += `- ${statusIcon} ${result.testId}: ${result.status} (${classIcon} ${result.classification}) - ${formatDuration(result.duration)}\n`;
          md += `  - Executor: ${result.executor}\n`;
        });
        md += `\n`;
      }

      // Coverage
      md += `**Coverage:**\n`;
      md += `- Tasks Generated: ${entry.coverage.tasksGenerated}\n`;
      md += `- Tests Generated: ${entry.coverage.testsGenerated}\n`;
      md += `- Tests Executed: ${entry.coverage.testsExecuted}\n`;
      md += `- Tests Passed: ${entry.coverage.testsPassed}\n`;
      md += `- Tests Failed: ${entry.coverage.testsFailed}\n\n`;
    }

    // Test Details
    md += `## Test Details\n\n`;

    // Group by classification
    const passedTests = testResults.filter(r => r.classification === 'passed');
    const appFailures = testResults.filter(r => r.classification === 'application_failure');
    const genIssues = testResults.filter(r => r.classification === 'traceqa_generation_issue');
    const uncertainTests = testResults.filter(r => r.classification === 'uncertain');
    const manualTests = testResults.filter(r => r.classification === 'manual');

    // Passed Tests
    if (passedTests.length > 0) {
      md += `### ✓ Passed Tests (${passedTests.length})\n\n`;
      passedTests.forEach(result => {
        md += this.formatTestDetail(result);
      });
    }

    // Application Failures
    if (appFailures.length > 0) {
      md += `### ✗ Application Failures (${appFailures.length})\n\n`;
      md += `*These failures indicate issues with the application under test.*\n\n`;
      appFailures.forEach(result => {
        md += this.formatTestDetail(result);
      });
    }

    // Test Generation Issues
    if (genIssues.length > 0) {
      md += `### ⚠ Test Generation Issues (${genIssues.length})\n\n`;
      md += `*These are issues with test generation, not application bugs.*\n\n`;
      genIssues.forEach(result => {
        md += this.formatTestDetail(result);
      });
    }

    // Uncertain Tests
    if (uncertainTests.length > 0) {
      md += `### ? Uncertain Tests (${uncertainTests.length})\n\n`;
      md += `*These tests could not be classified definitively.*\n\n`;
      uncertainTests.forEach(result => {
        md += this.formatTestDetail(result);
      });
    }

    // Manual Tests
    if (manualTests.length > 0) {
      md += `### 👤 Manual Tests (${manualTests.length})\n\n`;
      md += `*These tests require manual execution.*\n\n`;
      manualTests.forEach(result => {
        md += this.formatTestDetail(result);
      });
    }

    // Footer
    md += `---\n\n`;
    md += `*Report generated by TraceQA v${ReportGenerator.VERSION} on ${summary.timestamp}*\n`;

    return md;
  }

  /**
   * Format test detail for markdown
   */
  private formatTestDetail(result: HTTPTestResult): string {
    let md = `#### ${result.testId}: ${result.title}\n\n`;
    md += `**Status:** ${result.status}\n`;
    md += `**Classification:** ${result.classification}\n`;
    md += `**Executor:** ${result.executor}\n`;
    md += `**Duration:** ${formatDuration(result.duration)}\n\n`;

    if (result.stepResults.length > 0) {
      md += `**Steps:**\n`;
      result.stepResults.forEach((step, index) => {
        const stepIcon = step.passed ? '✓' : '✗';
        md += `${index + 1}. ${stepIcon} ${step.description}\n`;
        md += `   - Method: ${step.method}\n`;
        md += `   - URL: ${step.url}\n`;
        md += `   - Expected Status: ${step.expectedStatus}\n`;
        md += `   - Actual Status: ${step.actualStatus}\n`;
        md += `   - Result: ${step.passed ? 'Passed' : 'Failed'}\n`;
        if (step.error) {
          md += `   - Error: ${step.error}\n`;
        }
      });
      md += `\n`;
    }

    if (result.evidence.length > 0) {
      md += `**Evidence:**\n`;
      result.evidence.forEach(ev => {
        md += `- ${ev}\n`;
      });
      md += `\n`;
    }

    return md;
  }

  /**
   * Display merge readiness in console
   */
  private displayMergeReadiness(
    mergeReadiness: 'ready' | 'not_ready' | 'uncertain',
    riskLevel: 'low' | 'medium' | 'high',
    summary: ReportSummary
  ): void {
    console.log('\n' + '='.repeat(80));

    if (mergeReadiness === 'ready') {
      logger.success(`✅ MERGE READINESS: READY TO MERGE (Risk: ${riskLevel})`);
    } else if (mergeReadiness === 'uncertain') {
      logger.warn(`⚠️  MERGE READINESS: UNCERTAIN - REVIEW NEEDED (Risk: ${riskLevel})`);
    } else {
      logger.error(`❌ MERGE READINESS: NOT READY TO MERGE (Risk: ${riskLevel})`);
    }

    console.log('='.repeat(80));
    console.log(`\nTests: ${summary.executionResults.executed}/${summary.executionResults.total} executed`);
    console.log(`Passed: ${summary.classifications.passed}`);
    console.log(`Application Failures: ${summary.classifications.application_failure}`);
    console.log(`Test Generation Issues: ${summary.classifications.traceqa_generation_issue}`);
    console.log(`Uncertain: ${summary.classifications.uncertain}`);
    console.log('');
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

/**
 * Standalone function to generate report
 * Convenience wrapper for the ReportGenerator class
 */
export async function generateReport(
  acceptanceCriteria: AcceptanceCriterion[],
  taskPlan: QATaskPlan,
  testSuite: GeneratedHTTPTestSuite,
  testResults: HTTPTestResult[],
  config?: { outputDir?: string; projectName?: string }
): Promise<{
  reportPath: string;
  traceMatrixPath: string;
}> {
  const generator = new ReportGenerator();
  return generator.generateReport(acceptanceCriteria, taskPlan, testSuite, testResults, config);
}

// Made with Bob
