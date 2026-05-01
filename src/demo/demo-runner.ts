import { AmbiguityDetector } from '../analysis/ambiguity-detector';
import { MockTestGenerator, MockTestCase } from './mock-generator';
import { Logger } from '../utils/logger';
import { AmbiguityIssue } from '../types';
import { TestAgent } from '../agent/test-agent';
import * as fs from 'fs';
import * as path from 'path';

const DEMO_ACCEPTANCE_CRITERIA = [
  'User can register with email and password',
  'Password must be at least 8 characters with uppercase, lowercase, and number',
  'User receives confirmation email after registration',
  'User can login with valid credentials',
  'User cannot login with invalid credentials',
];

export interface DemoOptions {
  mock?: boolean;
  outputDir?: string;
}

export class DemoRunner {
  private logger: Logger;
  private mockGenerator: MockTestGenerator;
  private outputDir: string;

  constructor() {
    this.logger = Logger.getInstance();
    this.mockGenerator = new MockTestGenerator();
    this.outputDir = './traceqa-proof';
  }

  async runDemo(options: DemoOptions = {}): Promise<void> {
    const hasCredentials = this.hasIBMCredentials();
    const useMock = options.mock || !hasCredentials;
    
    if (options.outputDir) {
      this.outputDir = options.outputDir;
    }

    this.printWelcome(useMock, hasCredentials && options.mock);
    this.printAcceptanceCriteria();

    // Step 1: Analyze acceptance criteria
    await this.analyzeAcceptanceCriteria();

    // Step 2: Generate test plan
    const testCases = await this.generateTestPlan(useMock);

    // Step 3: Execute tests
    const results = await this.executeTests(testCases, useMock);

    // Step 4: Generate proof report
    await this.generateReport(results);

    // Step 5: Display summary
    this.printSummary(results);
  }

  private hasIBMCredentials(): boolean {
    return !!(process.env.IBM_WATSONX_API_KEY && process.env.IBM_WATSONX_PROJECT_ID);
  }

  private printWelcome(useMock: boolean, forcedMock: boolean = false): void {
    console.log('\n🎭 TraceQA Demo Mode');
    console.log('━'.repeat(80));
    console.log('');

    if (useMock) {
      if (forcedMock) {
        console.log('ℹ️  Running in MOCK mode (--mock flag specified)');
        console.log('   Remove --mock flag to use real IBM watsonx AI');
      } else {
        console.log('ℹ️  Running in MOCK mode (IBM credentials not configured)');
        console.log('   To use real IBM watsonx AI, set IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID');
      }
    } else {
      console.log('✨ Running with IBM watsonx AI');
    }
    console.log('');
  }

  private printAcceptanceCriteria(): void {
    console.log('📋 Sample Acceptance Criteria:');
    DEMO_ACCEPTANCE_CRITERIA.forEach((criterion, index) => {
      console.log(`   ${index + 1}. ${criterion}`);
    });
    console.log('');
  }

  private async analyzeAcceptanceCriteria(): Promise<void> {
    console.log('🔍 Analyzing acceptance criteria...');
    
    const detector = new AmbiguityDetector();
    const analysis = detector.analyzeAcceptanceCriteria(DEMO_ACCEPTANCE_CRITERIA);

    if (analysis.issuesFound === 0) {
      console.log('   ✅ No ambiguity issues found');
    } else {
      console.log(`   ⚠️  Found ${analysis.issuesFound} potential ambiguity issue(s)`);
      analysis.issues.forEach((issue: AmbiguityIssue) => {
        console.log(`      - ${issue.severity}: ${issue.issue}`);
      });
    }
    console.log('');
  }

  private async generateTestPlan(useMock: boolean): Promise<MockTestCase[]> {
    console.log('🧪 Generating test plan...');

    let testCases: MockTestCase[];

    if (useMock) {
      testCases = this.mockGenerator.generateTests(DEMO_ACCEPTANCE_CRITERIA);
    } else {
      // Use real IBM AI to generate tests
      testCases = await this.generateTestsWithAI();
    }

    console.log(`   ✅ Generated ${testCases.length} test cases`);
    console.log('');

    return testCases;
  }

  private async generateTestsWithAI(): Promise<MockTestCase[]> {
    try {
      const apiKey = process.env.IBM_WATSONX_API_KEY;
      if (!apiKey) {
        throw new Error('IBM_WATSONX_API_KEY not found');
      }

      const agent = new TestAgent({ apiKey });
      
      // Create test context for the agent
      const context = {
        repository: { path: '.', name: 'demo', branch: 'main' },
        changes: { files: [], summary: 'Demo', additions: 0, deletions: 0, diff: '' },
        description: 'Demo test generation',
        acceptanceCriteria: DEMO_ACCEPTANCE_CRITERIA,
        buildInfo: { framework: 'demo', language: 'TypeScript', buildCommand: '', testCommand: '', success: true }
      };
      
      // Use the agent to create a test plan
      const testPlan = await agent.createTestPlan(context);
      
      this.logger.info(`AI generated ${testPlan.testCases.length} test cases`);
      
      // Convert TestCase[] to MockTestCase[]
      const mockTests: MockTestCase[] = testPlan.testCases.map((tc) => ({
        id: tc.id,
        title: tc.name,
        description: tc.description || tc.name,
        steps: tc.steps.map(s => s.action),
        expectedResult: tc.expectedResult || 'Test should pass',
        priority: tc.priority || 'medium',
        shouldPass: true // Assume all should pass in demo
      }));
      
      return mockTests;
      
    } catch (error) {
      this.logger.warn(`Failed to use IBM watsonx AI: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.info('Falling back to mock test generator');
      return this.mockGenerator.generateTests(DEMO_ACCEPTANCE_CRITERIA);
    }
  }

  private async executeTests(
    testCases: MockTestCase[],
    _useMock: boolean
  ): Promise<Array<{ test: MockTestCase; result: any }>> {
    console.log('⚡ Executing tests...');

    const results: Array<{ test: MockTestCase; result: any }> = [];

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];
      const result = await this.mockGenerator.executeTest(test);

      const status = result.passed ? '✅' : '❌';
      const statusText = result.passed ? 'PASSED' : 'FAILED';
      console.log(`   ${status} Test ${i + 1}/${testCases.length}: ${test.title} - ${statusText}`);

      results.push({ test, result });
    }

    console.log('');
    return results;
  }

  private async generateReport(results: Array<{ test: MockTestCase; result: any }>): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const totalTests = results.length;
    const passedTests = results.filter(r => r.result.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = (passedTests / totalTests) * 100;

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(results, totalTests, passedTests, failedTests, passRate);
    fs.writeFileSync(path.join(this.outputDir, 'report.md'), markdownReport);

    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: passRate.toFixed(1),
      },
      acceptanceCriteria: DEMO_ACCEPTANCE_CRITERIA,
      testResults: results.map(r => ({
        id: r.test.id,
        title: r.test.title,
        description: r.test.description,
        steps: r.test.steps,
        expectedResult: r.test.expectedResult,
        passed: r.result.passed,
        duration: r.result.duration,
        evidence: r.result.evidence,
      })),
    };
    fs.writeFileSync(
      path.join(this.outputDir, 'report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate trace matrix
    const traceMatrix = {
      acceptanceCriteria: DEMO_ACCEPTANCE_CRITERIA.map((criterion, index) => ({
        id: `AC${index + 1}`,
        description: criterion,
        testCases: results
          .filter((_, i) => Math.floor(i / 2) === index) // Simple mapping for demo
          .map(r => r.test.id),
      })),
    };
    fs.writeFileSync(
      path.join(this.outputDir, 'trace-matrix.json'),
      JSON.stringify(traceMatrix, null, 2)
    );
  }

  private generateMarkdownReport(
    results: Array<{ test: MockTestCase; result: any }>,
    totalTests: number,
    passedTests: number,
    failedTests: number,
    passRate: number
  ): string {
    const mergeScore = Math.floor(passRate);
    const mergeStatus = mergeScore >= 90 ? '✅ READY' : mergeScore >= 70 ? '⚠️ REVIEW NEEDED' : '❌ NOT READY';

    let report = '# TraceQA Demo Test Report\n\n';
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    report += '## Summary\n\n';
    report += `- **Total Tests:** ${totalTests}\n`;
    report += `- **Passed:** ${passedTests} (${passRate.toFixed(1)}%)\n`;
    report += `- **Failed:** ${failedTests} (${(100 - passRate).toFixed(1)}%)\n`;
    report += `- **Merge Readiness:** ${mergeStatus} (Score: ${mergeScore}/100)\n\n`;

    report += '## Acceptance Criteria\n\n';
    DEMO_ACCEPTANCE_CRITERIA.forEach((criterion, index) => {
      report += `${index + 1}. ${criterion}\n`;
    });
    report += '\n';

    report += '## Test Results\n\n';
    results.forEach(({ test, result }) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      report += `### ${test.id}: ${test.title} ${status}\n\n`;
      report += `**Description:** ${test.description}\n\n`;
      report += `**Priority:** ${test.priority}\n\n`;
      report += `**Duration:** ${result.duration}ms\n\n`;
      report += '**Steps:**\n';
      test.steps.forEach((step, i) => {
        report += `${i + 1}. ${step}\n`;
      });
      report += '\n';
      report += `**Expected Result:** ${test.expectedResult}\n\n`;
      report += '**Evidence:**\n```\n';
      report += result.evidence;
      report += '\n```\n\n';
      report += '---\n\n';
    });

    return report;
  }

  private printSummary(results: Array<{ test: MockTestCase; result: any }>): void {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.result.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = (passedTests / totalTests) * 100;
    const mergeScore = Math.floor(passRate);
    const mergeStatus = mergeScore >= 90 ? '✅ READY' : mergeScore >= 70 ? '⚠️ REVIEW NEEDED' : '❌ NOT READY';

    console.log('📊 Test Results:');
    console.log(`   Total: ${totalTests}`);
    console.log(`   Passed: ${passedTests} (${passRate.toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${(100 - passRate).toFixed(1)}%)`);
    console.log('');
    console.log(`   Merge Readiness: ${mergeStatus} (Score: ${mergeScore}/100)`);
    console.log('');

    console.log(`📁 Reports generated in: ${this.outputDir}/`);
    console.log('   - report.md');
    console.log('   - report.json');
    console.log('   - trace-matrix.json');
    console.log('');

    console.log('✨ Next Steps:');
    console.log(`   1. Review the generated reports in ${this.outputDir}/`);
    if (!this.hasIBMCredentials()) {
      console.log('   2. Set up IBM watsonx credentials for real AI-powered testing');
      console.log('   3. Run: traceqa test -d "your feature description"');
    } else {
      console.log('   2. Run: traceqa test -d "your feature description"');
    }
    console.log('');
    console.log('   For more information: traceqa --help');
    console.log('');
  }
}

// Allow running directly
const args = process.argv.slice(2);
const useMock = args.includes('--mock');
const outputDirIndex = args.indexOf('--output-dir');
const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : undefined;

const runner = new DemoRunner();
runner.runDemo({ mock: useMock, outputDir }).catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});

// Made with Bob
