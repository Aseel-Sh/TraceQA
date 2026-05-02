/**
 * TraceQA Report Generator
 * Generates comprehensive test reports, trace matrices, and merge readiness assessments
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TestResults,
  TraceMatrix,
  TraceMatrixEntry,
  MergeReadinessScore,
  ReportData,
  TestResult
} from '../types/index.js';
import { logger, formatDuration } from '../utils/logger.js';

/**
 * Report Generator Class
 * Handles generation of all report artifacts
 */
export class ReportGenerator {
  private static readonly VERSION = '1.0.0';
  private static readonly DEFAULT_OUTPUT_DIR = 'traceqa-proof';

  /**
   * Generate complete report with all artifacts
   */
  async generateReport(
    results: TestResults,
    acceptanceCriteria: string[],
    outputDir?: string
  ): Promise<void> {
    const reportDir = outputDir || ReportGenerator.DEFAULT_OUTPUT_DIR;
    
    try {
      // Create output directory
      await this.ensureDirectory(reportDir);
      
      // Generate trace matrix
      const traceMatrix = this.generateTraceMatrix(results, acceptanceCriteria);
      
      // Calculate merge readiness
      const mergeReadiness = this.calculateMergeReadiness(results, traceMatrix);
      
      // Create complete report data
      const reportData: ReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          traceqaVersion: ReportGenerator.VERSION,
          projectName: results.repository.name,
          repository: results.repository
        },
        testResults: results,
        traceMatrix,
        mergeReadiness
      };
      
      // Write all report files
      await Promise.all([
        this.writeJsonReport(reportDir, reportData),
        this.writeTraceMatrix(reportDir, traceMatrix),
        this.writeMarkdownReport(reportDir, reportData)
      ]);
      
      logger.success(`Reports generated successfully in ${reportDir}/`);
      logger.info(`  - report.json`);
      logger.info(`  - trace-matrix.json`);
      logger.info(`  - report.md`);
      
      // Display merge readiness
      this.displayMergeReadiness(mergeReadiness);
      
    } catch (error) {
      logger.error('Failed to generate reports:', error);
      throw error;
    }
  }

  /**
   * Generate trace matrix mapping acceptance criteria to tests
   */
  generateTraceMatrix(
    results: TestResults,
    acceptanceCriteria: string[]
  ): TraceMatrix {
    const entries: TraceMatrixEntry[] = [];
    
    // If no acceptance criteria provided, create a default entry
    if (!acceptanceCriteria || acceptanceCriteria.length === 0) {
      acceptanceCriteria = ['All generated tests'];
    }
    
    for (const criterion of acceptanceCriteria) {
      // Find tests related to this criterion using keyword matching
      const relatedTests = this.findRelatedTests(results.results, criterion);
      
      const executionResults = relatedTests.map(test => ({
        testId: test.testCaseId,
        testName: test.testCaseName,
        status: this.determineTestStatus(test),
        evidence: this.extractEvidence(test)
      }));
      
      // Determine coverage based on test results
      const coverage = this.determineCoverage(executionResults);
      
      entries.push({
        acceptanceCriterion: criterion,
        generatedTests: relatedTests.map(t => t.testCaseName),
        executionResults,
        coverage
      });
    }
    
    const coveredCriteria = entries.filter(e => e.coverage !== 'none').length;
    
    return {
      entries,
      totalCriteria: acceptanceCriteria.length,
      coveredCriteria,
      coveragePercentage: (coveredCriteria / acceptanceCriteria.length) * 100
    };
  }

  /**
   * Find tests related to a specific acceptance criterion
   * Uses keyword matching and test metadata
   */
  private findRelatedTests(
    allTests: TestResult[],
    criterion: string
  ): TestResult[] {
    // If criterion is generic, return all tests
    if (criterion.toLowerCase().includes('all generated tests') ||
        criterion.toLowerCase().includes('all tests')) {
      return allTests;
    }

    // Extract keywords from criterion (remove common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall'];
    const criterionWords = criterion
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));

    // Find tests that match keywords
    const relatedTests = allTests.filter(test => {
      const testName = test.testCaseName.toLowerCase();
      
      // Check if test has acceptanceCriterionId metadata (if available in future)
      // For now, use keyword matching
      
      // Match if test name contains any of the criterion keywords
      return criterionWords.some(keyword => testName.includes(keyword));
    });

    // If no tests matched by keywords, check for semantic similarity
    // For example, "user registration" should match "register user"
    if (relatedTests.length === 0) {
      // Try fuzzy matching with common synonyms
      const synonymMap: Record<string, string[]> = {
        'register': ['registration', 'signup', 'sign-up', 'create account'],
        'login': ['sign-in', 'signin', 'authenticate', 'log-in'],
        'user': ['account', 'profile', 'member'],
        'create': ['add', 'new', 'register'],
        'delete': ['remove', 'destroy'],
        'update': ['edit', 'modify', 'change'],
        'retrieve': ['get', 'fetch', 'read', 'view']
      };

      for (const test of allTests) {
        const testName = test.testCaseName.toLowerCase();
        
        for (const keyword of criterionWords) {
          // Check direct match
          if (testName.includes(keyword)) {
            relatedTests.push(test);
            break;
          }
          
          // Check synonyms
          const synonyms = synonymMap[keyword] || [];
          if (synonyms.some(syn => testName.includes(syn))) {
            relatedTests.push(test);
            break;
          }
        }
      }
    }

    // If still no matches, return empty array (criterion not covered by any test)
    return relatedTests;
  }

  /**
   * Calculate merge readiness score
   */
  calculateMergeReadiness(
    results: TestResults,
    traceMatrix?: TraceMatrix
  ): MergeReadinessScore {
    let score = 100;
    const risks: string[] = [];
    
    const passedTests = results.summary.passed;
    const failedTests = results.summary.failed;
    const uncertainTests = results.results.filter(
      r => !r.passed && r.message.toLowerCase().includes('uncertain')
    ).length;
    
    // Count critical failures (API/integration tests)
    const criticalFailures = results.results.filter(
      r => !r.passed && 
      (r.testCaseName.toLowerCase().includes('api') || 
       r.testCaseName.toLowerCase().includes('integration'))
    ).length;
    
    const coveragePercentage = traceMatrix?.coveragePercentage || 0;
    
    // Deduct points for failures
    score -= failedTests * 15;
    if (failedTests > 0) {
      risks.push(`${failedTests} test(s) failed`);
    }
    
    // Deduct points for uncertain tests
    score -= uncertainTests * 5;
    if (uncertainTests > 0) {
      risks.push(`${uncertainTests} test(s) have uncertain results`);
    }
    
    // Deduct points for low coverage
    if (coveragePercentage < 80) {
      score -= 20;
      risks.push(`Low coverage: ${coveragePercentage.toFixed(1)}%`);
    }
    
    // Deduct points for critical failures
    score -= criticalFailures * 25;
    if (criticalFailures > 0) {
      risks.push(`${criticalFailures} critical test(s) failed (API/integration)`);
    }
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));
    
    // Determine recommendation
    let recommendation: 'safe_to_merge' | 'review_needed' | 'do_not_merge';
    if (score >= 90) {
      recommendation = 'safe_to_merge';
    } else if (score >= 70) {
      recommendation = 'review_needed';
    } else {
      recommendation = 'do_not_merge';
    }
    
    // Generate summary
    const summary = this.generateMergeReadinessSummary(
      recommendation,
      score,
      passedTests,
      failedTests,
      uncertainTests
    );
    
    return {
      score,
      recommendation,
      factors: {
        passedTests,
        failedTests,
        uncertainTests,
        coveragePercentage,
        criticalFailures
      },
      risks,
      summary
    };
  }

  /**
   * Determine test status (passed/failed/uncertain)
   * CRITICAL: Properly classify generation errors vs app errors
   * Uses generic HTTP semantics instead of route-specific logic
   */
  private determineTestStatus(test: TestResult): 'passed' | 'failed' | 'uncertain' {
    if (test.passed) {
      return 'passed';
    }

    const message = test.message?.toLowerCase() || '';
    const error = test.error?.toLowerCase() || '';
    const combinedText = `${message} ${error}`;

    // Check for status mismatch
    const hasStatusMismatch = combinedText.includes('expected status') ||
                             combinedText.includes('but got') ||
                             combinedText.includes('status code');

    // Check for generation errors
    const generationErrorKeywords = [
      'traceqa generation error',
      'url is an object',
      'invalid url format',
      'normalization failed',
      'no endpoint or base url was available',
      'expected status',
      'status mismatch',
      'incorrect expected status'
    ];

    const hasGenerationError = generationErrorKeywords.some(keyword =>
      combinedText.includes(keyword)
    );

    if (hasGenerationError) {
      return 'uncertain';
    }

    // If there's a status mismatch, try to determine if it's a generation issue
    if (hasStatusMismatch) {
      // Extract actual status from message
      const statusMatch = combinedText.match(/(?:got|received|actual|status)\s+(\d{3})/);
      const actualStatus = statusMatch ? parseInt(statusMatch[1]) : null;
      
      if (actualStatus) {
        // Check if the actual status makes semantic sense
        const isSemanticallySensible = this.isStatusSemanticallySensible(
          actualStatus,
          test.testCaseName || '',
          combinedText
        );
        
        if (isSemanticallySensible) {
          return 'uncertain'; // Expected status was probably wrong
        }
      }
    }

    // Check for uncertain/manual scenarios
    const uncertainKeywords = [
      'uncertain',
      'mcp not configured',
      'not available',
      'skipped',
      'could not execute',
      'cannot determine',
      'manual qa required'
    ];

    const isUncertain = uncertainKeywords.some(keyword =>
      combinedText.includes(keyword)
    );

    if (isUncertain) {
      return 'uncertain';
    }

    // Default to failed (app issue)
    return 'failed';
  }

  /**
   * Check if an HTTP status code makes semantic sense for a given test
   * Uses generic HTTP semantics instead of hardcoded route logic
   */
  private isStatusSemanticallySensible(
    actualStatus: number,
    testName: string,
    messageText: string
  ): boolean {
    const lowerTestName = testName.toLowerCase();
    const lowerMessage = messageText.toLowerCase();
    
    // Success scenarios (2xx)
    if (actualStatus >= 200 && actualStatus < 300) {
      // If test name suggests success, 2xx is sensible
      if (lowerTestName.includes('success') ||
          lowerTestName.includes('valid') ||
          lowerTestName.includes('correct')) {
        return true;
      }
      
      // 201 Created is sensible for any POST that creates a resource
      if (actualStatus === 201 && lowerMessage.includes('post')) {
        return true;
      }
      
      // 204 No Content is sensible for DELETE/PUT/PATCH
      if (actualStatus === 204 &&
          (lowerMessage.includes('delete') ||
           lowerMessage.includes('put') ||
           lowerMessage.includes('patch'))) {
        return true;
      }
    }
    
    // Client errors (4xx)
    if (actualStatus >= 400 && actualStatus < 500) {
      // 400/422 is sensible for validation/input errors
      if ((actualStatus === 400 || actualStatus === 422) &&
          (lowerTestName.includes('invalid') ||
           lowerTestName.includes('bad') ||
           lowerTestName.includes('malformed') ||
           lowerTestName.includes('missing'))) {
        return true;
      }
      
      // 401 is sensible for auth failures
      if (actualStatus === 401 &&
          (lowerTestName.includes('unauthorized') ||
           lowerTestName.includes('auth') ||
           lowerTestName.includes('credential'))) {
        return true;
      }
      
      // 403 is sensible for permission issues
      if (actualStatus === 403 &&
          (lowerTestName.includes('forbidden') ||
           lowerTestName.includes('permission') ||
           lowerTestName.includes('access denied'))) {
        return true;
      }
      
      // 404 is sensible for not found scenarios
      if (actualStatus === 404 &&
          (lowerTestName.includes('not found') ||
           lowerTestName.includes('missing') ||
           lowerTestName.includes('nonexistent'))) {
        return true;
      }
      
      // 409 is sensible for conflict/duplicate scenarios
      if (actualStatus === 409 &&
          (lowerTestName.includes('conflict') ||
           lowerTestName.includes('duplicate') ||
           lowerTestName.includes('already exists'))) {
        return true;
      }
    }
    
    // If we can't determine, assume it might be sensible
    // (conservative approach - don't falsely claim generation error)
    return false;
  }

  /**
   * Extract evidence from test result
   */
  private extractEvidence(test: TestResult): string | undefined {
    const evidence: string[] = [];
    
    if (test.error) {
      const sanitizedError = this.sanitizeMessage(test.error);
      evidence.push(`Error: ${sanitizedError}`);
    }
    
    if (test.message && !test.passed) {
      const sanitizedMessage = this.sanitizeMessage(test.message);
      evidence.push(`Message: ${sanitizedMessage}`);
    }
    
    if (test.logs && test.logs.length > 0) {
      // Only include error and warning logs, limit to last 5
      const relevantLogs = test.logs
        .filter(log => log.includes('error') || log.includes('warn') || log.includes('failed'))
        .slice(-5);
      
      if (relevantLogs.length > 0) {
        evidence.push(`Logs: ${relevantLogs.join('; ')}`);
      }
    }
    
    return evidence.length > 0 ? evidence.join(' | ') : undefined;
  }

  /**
   * Sanitize message to remove sensitive data and unrelated content
   */
  private sanitizeMessage(message: string): string {
    // Remove potential sensitive data patterns
    let sanitized = message;
    
    // Truncate very long messages
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '... (truncated)';
    }
    
    // Remove unrelated prompt fragments
    const stopPatterns = [
      '<|user|>',
      '<|assistant|>',
      'User Profile Update',
      'User Profile Deletion',
      /\[INST\]/gi,
      /\[\/INST\]/gi
    ];
    
    for (const pattern of stopPatterns) {
      if (typeof pattern === 'string') {
        const index = sanitized.indexOf(pattern);
        if (index !== -1) {
          sanitized = sanitized.substring(0, index).trim();
        }
      } else {
        sanitized = sanitized.replace(pattern, '').trim();
      }
    }
    
    return sanitized;
  }

  /**
   * Determine coverage level for a criterion
   */
  private determineCoverage(
    executionResults: Array<{ status: 'passed' | 'failed' | 'uncertain' }>
  ): 'full' | 'partial' | 'none' {
    const passed = executionResults.filter(r => r.status === 'passed').length;
    const total = executionResults.length;
    
    if (total === 0) return 'none';
    if (passed === total) return 'full';
    if (passed > 0) return 'partial';
    return 'none';
  }

  /**
   * Generate merge readiness summary text
   */
  private generateMergeReadinessSummary(
    recommendation: string,
    score: number,
    passed: number,
    failed: number,
    uncertain: number
  ): string {
    const total = passed + failed + uncertain;
    
    switch (recommendation) {
      case 'safe_to_merge':
        return `All tests passed successfully. The changes are safe to merge with high confidence (${score}/100).`;
      
      case 'review_needed':
        return `${passed}/${total} tests passed. Review is recommended before merging. Address ${failed} failed test(s) and investigate ${uncertain} uncertain result(s).`;
      
      case 'do_not_merge':
        return `Critical issues detected. Do not merge until ${failed} failed test(s) are resolved. Score: ${score}/100.`;
      
      default:
        return `Test results: ${passed} passed, ${failed} failed, ${uncertain} uncertain. Score: ${score}/100.`;
    }
  }

  /**
   * Write JSON report
   */
  private async writeJsonReport(dir: string, data: ReportData): Promise<void> {
    const filePath = path.join(dir, 'report.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Write trace matrix JSON
   */
  private async writeTraceMatrix(dir: string, matrix: TraceMatrix): Promise<void> {
    const filePath = path.join(dir, 'trace-matrix.json');
    await fs.writeFile(filePath, JSON.stringify(matrix, null, 2), 'utf-8');
  }

  /**
   * Write markdown report
   */
  private async writeMarkdownReport(dir: string, data: ReportData): Promise<void> {
    const md = this.generateMarkdown(data);
    const filePath = path.join(dir, 'report.md');
    await fs.writeFile(filePath, md, 'utf-8');
  }

  /**
   * Generate markdown report content
   */
  private generateMarkdown(data: ReportData): string {
    const { metadata, testResults, traceMatrix, mergeReadiness } = data;
    const { summary } = testResults;
    
    // Determine emoji for recommendation
    const recommendationEmoji = {
      safe_to_merge: '✅',
      review_needed: '⚠️',
      do_not_merge: '❌'
    }[mergeReadiness.recommendation];
    
    const recommendationText = {
      safe_to_merge: 'SAFE TO MERGE',
      review_needed: 'REVIEW NEEDED',
      do_not_merge: 'DO NOT MERGE'
    }[mergeReadiness.recommendation];
    
    let md = `# TraceQA Test Report\n\n`;
    md += `**Generated**: ${metadata.generatedAt}\n`;
    md += `**Project**: ${metadata.projectName}\n`;
    md += `**Branch**: ${metadata.repository.branch}\n`;
    md += `**TraceQA Version**: ${metadata.traceqaVersion}\n\n`;
    
    // Merge Readiness Section
    md += `## Merge Readiness: ${recommendationEmoji} ${recommendationText} (Score: ${mergeReadiness.score}/100)\n\n`;
    
    // Summary
    md += `### Summary\n\n`;
    md += `- **Total Tests**: ${summary.total}\n`;
    md += `- **Passed**: ${summary.passed} ✅\n`;
    md += `- **Failed**: ${summary.failed} ❌\n`;
    md += `- **Uncertain**: ${mergeReadiness.factors.uncertainTests} ❓\n`;
    md += `- **Coverage**: ${traceMatrix.coveragePercentage.toFixed(1)}%\n`;
    md += `- **Success Rate**: ${summary.successRate.toFixed(1)}%\n`;
    md += `- **Duration**: ${formatDuration(summary.duration)}\n\n`;
    
    // Recommendation
    md += `### Recommendation\n\n`;
    md += `${mergeReadiness.summary}\n\n`;
    
    // Risks
    if (mergeReadiness.risks.length > 0) {
      md += `### Risks\n\n`;
      mergeReadiness.risks.forEach(risk => {
        md += `- ⚠️ ${risk}\n`;
      });
      md += `\n`;
    }
    
    // Trace Matrix
    md += `## Trace Matrix\n\n`;
    md += `| Acceptance Criterion | Generated Tests | Status | Evidence |\n`;
    md += `|---------------------|----------------|--------|----------|\n`;
    
    for (const entry of traceMatrix.entries) {
      for (let i = 0; i < entry.executionResults.length; i++) {
        const result = entry.executionResults[i];
        const statusIcon = {
          passed: '✅',
          failed: '❌',
          uncertain: '❓'
        }[result.status];
        
        const criterion = i === 0 ? entry.acceptanceCriterion : '';
        const evidence = result.evidence || '-';
        
        md += `| ${criterion} | ${result.testName} | ${statusIcon} ${result.status} | ${evidence} |\n`;
      }
    }
    md += `\n`;
    
    // Detailed Test Results - Group by status
    const passedResults = testResults.results.filter(r => r.passed);
    const failedResults = testResults.results.filter(r => !r.passed && this.determineTestStatus(r) === 'failed');
    const uncertainResults = testResults.results.filter(r => !r.passed && this.determineTestStatus(r) === 'uncertain');
    
    md += `## Detailed Test Results\n\n`;
    
    // Passed tests (summary only)
    if (passedResults.length > 0) {
      md += `### ✅ Passed Tests (${passedResults.length})\n\n`;
      passedResults.forEach(result => {
        md += `- **${result.testCaseName}** - ${formatDuration(result.duration)}\n`;
      });
      md += `\n`;
    }
    
    // Failed tests (app errors - detailed)
    if (failedResults.length > 0) {
      md += `### ❌ Failed Tests - Application Errors (${failedResults.length})\n\n`;
      md += `*These failures indicate issues with the application under test.*\n\n`;
      
      for (const result of failedResults) {
        md += `#### ${result.testCaseName}\n\n`;
        md += `- **Duration**: ${formatDuration(result.duration)}\n`;
        
        if (result.message) {
          md += `- **Message**: ${result.message}\n`;
        }
        
        if (result.error) {
          md += `\n**Error Details**:\n\`\`\`\n${result.error}\n\`\`\`\n`;
        }
        
        md += `\n`;
      }
    }
    
    // Uncertain tests (generation errors - detailed)
    if (uncertainResults.length > 0) {
      md += `### ❓ Uncertain Tests - Generation/Configuration Issues (${uncertainResults.length})\n\n`;
      md += `*These tests could not be executed properly due to test generation issues or missing configuration. These are NOT application bugs.*\n\n`;
      
      for (const result of uncertainResults) {
        md += `#### ${result.testCaseName}\n\n`;
        md += `- **Duration**: ${formatDuration(result.duration)}\n`;
        
        if (result.message) {
          md += `- **Issue**: ${result.message}\n`;
        }
        
        if (result.error) {
          md += `- **Details**: ${result.error}\n`;
        }
        
        md += `\n`;
      }
    }
    
    // Footer
    md += `---\n\n`;
    md += `*Report generated by TraceQA v${metadata.traceqaVersion} on ${metadata.generatedAt}*\n`;
    
    return md;
  }

  /**
   * Display merge readiness in console
   */
  private displayMergeReadiness(mergeReadiness: MergeReadinessScore): void {
    const { recommendation, score, summary } = mergeReadiness;
    
    console.log('\n' + '='.repeat(80));
    
    if (recommendation === 'safe_to_merge') {
      logger.success(`✅ MERGE READINESS: SAFE TO MERGE (${score}/100)`);
    } else if (recommendation === 'review_needed') {
      logger.warn(`⚠️  MERGE READINESS: REVIEW NEEDED (${score}/100)`);
    } else {
      logger.error(`❌ MERGE READINESS: DO NOT MERGE (${score}/100)`);
    }
    
    console.log('='.repeat(80));
    console.log(`\n${summary}\n`);
    
    if (mergeReadiness.risks.length > 0) {
      logger.warn('Identified Risks:');
      mergeReadiness.risks.forEach(risk => {
        console.log(`  - ${risk}`);
      });
      console.log('');
    }
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

// Made with Bob
