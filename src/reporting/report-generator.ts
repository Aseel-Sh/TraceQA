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
 * Report summary statistics with clear, non-overlapping counts
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
    /** Total number of tests defined */
    total: number;
    /** Tests that actually ran (excludes skipped and manual) */
    executed: number;
    /** Tests that were not executed (skipped + manual) */
    notExecuted: number;
    
    /** Execution outcomes (subset of executed) */
    passed: number;
    /** All failures combined (subset of executed) */
    failed: number;
    
    /** Failure breakdown (subsets of failed) */
    applicationFailures: number;
    generationIssues: number;
    infrastructureFailures: number;
    uncertain: number;
    
    /** Not executed breakdown (subsets of notExecuted) */
    skipped: number;
    manual: number;
    /** Run-level infrastructure failure (pre-run) */
    runLevelInfrastructureFailure?: boolean;
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
    classificationReason: string;
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

      // Calculate coverage metrics using consistent classification logic
      // EXECUTED = tests that actually ran (passed + failed, excludes uncertain/manual/skipped)
      // This aligns with the summary counting logic
      const executedResults = relatedResults.filter(
        result => result.classification.classification === 'passed' ||
                  result.classification.classification === 'application_failure' ||
                  result.classification.classification === 'traceqa_generation_issue' ||
                  result.classification.classification === 'infrastructure_failure'
      );
      
      const testsExecuted = executedResults.length;
      const testsPassed = executedResults.filter(
        r => r.classification.classification === 'passed'
      ).length;
      const testsFailed = executedResults.filter(
        r => r.classification.classification === 'application_failure' ||
            r.classification.classification === 'traceqa_generation_issue' ||
            r.classification.classification === 'infrastructure_failure'
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
          classification: result.classification.classification,
          classificationReason: result.classification.reason,
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

    // Execution results statistics using classification as primary metric
    // Key principles:
    // 1. TOTAL = all generated tests (ready + uncertain + manual)
    // 2. EXECUTED = tests that actually ran (passed + failed, excludes skipped/uncertain/manual)
    // 3. NOT EXECUTED = tests not run (uncertain + manual + skipped)
    // 4. FAILED = only tests that ran and failed (application + generation + infrastructure failures)
    // 5. Advisory warnings do NOT count as failures
    
    // Use generated tests as the base for totals
    const generatedTotal = testSuite.summary.totalGenerated;
    const readyCount = testSuite.summary.readyTests;
    const uncertainCount = testSuite.summary.uncertainTests;
    const manualCount = testSuite.summary.manualTests;

    // Detect run-level infrastructure failure (single result added by executor)
    const runLevelFailure = testResults.find(r => r.testId && r.testId.startsWith('run-infrastructure-failure'));

    // Count classifications only for generated tests (ignore run-level artifacts)
    const generatedResults = testResults.filter(r => testSuite.tests.some(t => t.id === r.testId));

    // Count by classification (these are mutually exclusive)
    const passed = generatedResults.filter(r => r.classification.classification === 'passed').length;
    const applicationFailures = generatedResults.filter(r => r.classification.classification === 'application_failure').length;
    const generationIssues = generatedResults.filter(r => r.classification.classification === 'traceqa_generation_issue').length;
    const infrastructureFailures = generatedResults.filter(r => r.classification.classification === 'infrastructure_failure').length;
    const uncertainResults = generatedResults.filter(r => r.classification.classification === 'uncertain').length;
    const skippedResults = generatedResults.filter(r => r.classification.classification === 'skipped').length;
    const manualResults = generatedResults.filter(r => r.classification.classification === 'manual').length;

    // Calculate derived counts
    // EXECUTED = tests that actually ran (passed + all failure types, excludes uncertain/manual/skipped)
    const executed = passed + applicationFailures + generationIssues + infrastructureFailures;
    
    // FAILED = only tests that ran and had critical failures (excludes advisory warnings)
    const failed = applicationFailures + generationIssues + infrastructureFailures;
    
    // NOT EXECUTED = tests that were not run
    const notExecuted = uncertainResults + manualResults + skippedResults;
    
    // Validate count consistency
    const validationErrors = this.validateReportCounts({
      total: generatedTotal,
      ready: readyCount,
      uncertain: uncertainCount,
      manual: manualCount,
      executed,
      passed,
      failed,
      skipped: skippedResults,
      applicationFailures,
      generationIssues,
      infrastructureFailures,
      uncertainResults,
      manualResults,
      notExecuted
    });
    
    if (validationErrors.length > 0) {
      logger.warn('Report count validation errors:');
      validationErrors.forEach((err: string) => logger.warn(`  - ${err}`));
    }

    // Determine merge readiness based on classification
    let mergeReadiness: 'ready' | 'not_ready' | 'uncertain' = 'ready';
    if (applicationFailures > 0) {
      mergeReadiness = 'not_ready';
    } else if (generationIssues > 0 || infrastructureFailures > 0 || uncertainResults > 2) {
      mergeReadiness = 'uncertain';
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (applicationFailures > 2 || failed > 3) {
      riskLevel = 'high';
    } else if (applicationFailures > 0 || generationIssues > 0 || infrastructureFailures > 0 || uncertainResults > 2) {
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
        total: testSuite.summary.totalGenerated,
        ready: testSuite.summary.readyTests,
        uncertain: testSuite.summary.uncertainTests,
        manual: testSuite.summary.manualTests
      },
      executionResults: {
        total: generatedTotal,
        executed,
        notExecuted,
        passed,
        failed,
        applicationFailures,
        generationIssues,
        infrastructureFailures,
        uncertain: uncertainResults,
        skipped: skippedResults,
        manual: manualResults,
        runLevelInfrastructureFailure: !!runLevelFailure
      },
      mergeReadiness,
      riskLevel
    };
  }

  /**
   * Validate report count consistency
   * Ensures all counts add up correctly and follow the rules:
   * 1. total = ready + uncertain + manual
   * 2. executed ≤ ready
   * 3. executed = passed + failed
   * 4. failed = applicationFailures + generationIssues + infrastructureFailures
   * 5. notExecuted = uncertain + manual + skipped
   *
   * @param counts - Object containing all count values
   * @returns Array of validation error messages (empty if valid)
   */
  private validateReportCounts(counts: {
    total: number;
    ready: number;
    uncertain: number;
    manual: number;
    executed: number;
    passed: number;
    failed: number;
    skipped: number;
    applicationFailures: number;
    generationIssues: number;
    infrastructureFailures: number;
    uncertainResults: number;
    manualResults: number;
    notExecuted: number;
  }): string[] {
    const errors: string[] = [];
    
    // Rule 1: Total should equal ready + uncertain + manual
    const totalCheck = counts.ready + counts.uncertain + counts.manual;
    if (counts.total !== totalCheck) {
      errors.push(
        `Total count mismatch: total(${counts.total}) != ready(${counts.ready}) + uncertain(${counts.uncertain}) + manual(${counts.manual}) = ${totalCheck}`
      );
    }
    
    // Rule 2: Executed should not exceed ready
    if (counts.executed > counts.ready) {
      errors.push(
        `Executed(${counts.executed}) exceeds ready(${counts.ready})`
      );
    }
    
    // Rule 3: Executed should equal passed + failed
    const executedCheck = counts.passed + counts.failed;
    if (counts.executed !== executedCheck) {
      errors.push(
        `Executed count mismatch: executed(${counts.executed}) != passed(${counts.passed}) + failed(${counts.failed}) = ${executedCheck}`
      );
    }
    
    // Rule 4: Failed should equal sum of failure types
    const failedCheck = counts.applicationFailures + counts.generationIssues + counts.infrastructureFailures;
    if (counts.failed !== failedCheck) {
      errors.push(
        `Failed count mismatch: failed(${counts.failed}) != applicationFailures(${counts.applicationFailures}) + generationIssues(${counts.generationIssues}) + infrastructureFailures(${counts.infrastructureFailures}) = ${failedCheck}`
      );
    }
    
    // Rule 5: Not executed should equal uncertain + manual + skipped
    const notExecutedCheck = counts.uncertainResults + counts.manualResults + counts.skipped;
    if (counts.notExecuted !== notExecutedCheck) {
      errors.push(
        `Not executed count mismatch: notExecuted(${counts.notExecuted}) != uncertainResults(${counts.uncertainResults}) + manualResults(${counts.manualResults}) + skipped(${counts.skipped}) = ${notExecutedCheck}`
      );
    }
    
    // Rule 6: Total should equal executed + notExecuted
    const totalCheck2 = counts.executed + counts.notExecuted;
    if (counts.total !== totalCheck2) {
      errors.push(
        `Total count mismatch: total(${counts.total}) != executed(${counts.executed}) + notExecuted(${counts.notExecuted}) = ${totalCheck2}`
      );
    }
    
    return errors;
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
    if (summary.executionResults.applicationFailures > 0) {
      risks.push(`${summary.executionResults.applicationFailures} application failure(s) detected`);
      recommendations.push('Fix application failures before merging');
    }

    // Check for test generation issues
    if (summary.executionResults.generationIssues > 0) {
      risks.push(`${summary.executionResults.generationIssues} test generation issue(s)`);
      recommendations.push('Review and fix test generation issues');
    }

    // Check for infrastructure failures
    if (summary.executionResults.infrastructureFailures > 0) {
      risks.push(`${summary.executionResults.infrastructureFailures} infrastructure failure(s)`);
      recommendations.push('Check infrastructure and retry failed tests');
    }

    // Check for uncertain tests
    if (summary.executionResults.uncertain > 2) {
      risks.push(`${summary.executionResults.uncertain} uncertain test(s)`);
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
    if (summary.executionResults.applicationFailures > 0) {
      mergeReadiness = 'not_ready';
    } else if (
      summary.executionResults.generationIssues > 0 ||
      summary.executionResults.infrastructureFailures > 0 ||
      summary.executionResults.uncertain > 2 ||
      executionRate < 50
    ) {
      mergeReadiness = 'uncertain';
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (summary.executionResults.applicationFailures > 2 || coveragePercent < 50) {
      riskLevel = 'high';
    } else if (
      summary.executionResults.applicationFailures > 0 ||
      summary.executionResults.generationIssues > 2 ||
      summary.executionResults.infrastructureFailures > 0 ||
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

    // Execution Results with Clear Breakdown
    md += `## Execution Results\n\n`;
    md += `**Total Tests:** ${summary.executionResults.total}\n`;
    const totalTestsForPct = summary.executionResults.total || 0;
    const executedPct = totalTestsForPct > 0 ? ((summary.executionResults.executed / totalTestsForPct) * 100).toFixed(1) : '0.0';
    const notExecutedPct = totalTestsForPct > 0 ? ((summary.executionResults.notExecuted / totalTestsForPct) * 100).toFixed(1) : '0.0';

    md += `**Executed:** ${summary.executionResults.executed} (${executedPct}%)\n`;
    md += `**Not Executed:** ${summary.executionResults.notExecuted} (${notExecutedPct}%)\n\n`;
    // Run-level infrastructure failure note
    const runFailureResult = testResults.find(r => r.testId === 'run-infrastructure-failure');
    if (runFailureResult) {
      md += `**Run-level Infrastructure Failure:** ${runFailureResult.classification.reason}\n`;
      if (runFailureResult.evidence && runFailureResult.evidence.length > 0) {
        md += `- Details:\n`;
        runFailureResult.evidence.forEach(ev => {
          md += `  - ${ev}\n`;
        });
        md += `\n`;
      }
    }
    
    md += `### Execution Outcomes\n\n`;
    md += `- ✓ **Passed:** ${summary.executionResults.passed}\n`;
    md += `- ✗ **Failed:** ${summary.executionResults.failed}\n\n`;
    
    md += `### Failure Breakdown\n\n`;
    md += `- 🐛 **Application Failures:** ${summary.executionResults.applicationFailures} (real bugs)\n`;
    md += `- ⚠️ **Test Generation Issues:** ${summary.executionResults.generationIssues} (TraceQA issues)\n`;
    md += `- 🔌 **Infrastructure Failures:** ${summary.executionResults.infrastructureFailures} (network/env issues)\n`;
    md += `- ❓ **Uncertain:** ${summary.executionResults.uncertain} (needs review)\n\n`;
    
    md += `### Not Executed Breakdown\n\n`;
    md += `- ⊘ **Skipped:** ${summary.executionResults.skipped}\n`;
    md += `- 👤 **Manual:** ${summary.executionResults.manual}\n\n`;

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

    // Group by classification (using the classification field properly)
    const passedTests = testResults.filter(r => r.classification.classification === 'passed');
    const appFailures = testResults.filter(r => r.classification.classification === 'application_failure');
    const genIssues = testResults.filter(r => r.classification.classification === 'traceqa_generation_issue');
    const infraFailures = testResults.filter(r => r.classification.classification === 'infrastructure_failure');
    const uncertainTests = testResults.filter(r => r.classification.classification === 'uncertain');
    const manualTests = testResults.filter(r => r.classification.classification === 'manual');

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
      md += `### ⚠️ Test Generation Issues (${genIssues.length})\n\n`;
      md += `*These are issues with test generation, not application bugs.*\n\n`;
      genIssues.forEach(result => {
        md += this.formatTestDetail(result);
      });
    }

    // Infrastructure Failures
    if (infraFailures.length > 0) {
      md += `### 🔌 Infrastructure Failures (${infraFailures.length})\n\n`;
      md += `*These failures are due to network or environment issues.*\n\n`;
      infraFailures.forEach(result => {
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
    md += `**Classification:** ${result.classification.classification}\n`;
    md += `**Reason:** ${result.classification.reason}\n`;
    md += `**Confidence:** ${(result.classification.confidence * 100).toFixed(0)}%\n`;
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
   * Uses the same counts as report.json to ensure consistency
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
    
    // Display counts that match report.json exactly
    console.log(`\nGenerated Tests: ${summary.generatedTests.total} (${summary.generatedTests.ready} ready, ${summary.generatedTests.uncertain} uncertain, ${summary.generatedTests.manual} manual)`);
    console.log(`Executed: ${summary.executionResults.executed}/${summary.generatedTests.ready} ready tests`);
    console.log(`Not Executed: ${summary.executionResults.notExecuted} (${summary.executionResults.uncertain} uncertain, ${summary.executionResults.manual} manual, ${summary.executionResults.skipped} skipped)`);
    console.log('');
    console.log(`Results:`);
    console.log(`  ✓ Passed: ${summary.executionResults.passed}`);
    console.log(`  ✗ Failed: ${summary.executionResults.failed}`);
    console.log(`    - Application Failures: ${summary.executionResults.applicationFailures} (real bugs)`);
    console.log(`    - Test Generation Issues: ${summary.executionResults.generationIssues} (TraceQA issues)`);
    console.log(`    - Infrastructure Failures: ${summary.executionResults.infrastructureFailures} (network/env issues)`);
    
    if (summary.executionResults.runLevelInfrastructureFailure) {
      console.log(`\n⚠️  Run-level infrastructure failure detected - tests could not be executed`);
    }
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
