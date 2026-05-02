import fs from 'fs-extra';
import path from 'path';
import { GeneratedTestArtifacts, ExecutableHTTPTest } from './test-generator';
import { NormalizedTest } from '../testing/test-normalizer.js';
import {
  APITestConfig,
  AssertionType,
  QATaskPlan,
  GeneratedHTTPTestSuite,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

const OUTPUT_DIR = 'traceqa-generated';

/**
 * Ensure the output directory exists
 */
async function ensureOutputDir(outputDir: string = OUTPUT_DIR): Promise<string> {
  await fs.ensureDir(outputDir);
  return outputDir;
}

/**
 * Write QA task plan to file (legacy - for backward compatibility)
 */
async function writeQATaskPlanLegacy(qaTaskPlan: any, outputDir: string): Promise<string> {
  const filePath = path.join(outputDir, 'qa-task-plan.json');
  await fs.writeFile(filePath, JSON.stringify(qaTaskPlan, null, 2), 'utf-8');
  return filePath;
}

/**
 * Write executable HTTP tests to file
 */
async function writeHTTPTests(httpTests: ExecutableHTTPTest[], outputDir: string): Promise<string> {
  const filePath = path.join(outputDir, 'generated-http-tests.json');
  await fs.writeFile(filePath, JSON.stringify(httpTests, null, 2), 'utf-8');
  return filePath;
}

/**
 * Generate human-readable markdown documentation for tests
 */
function generateTestMarkdown(artifacts: GeneratedTestArtifacts): string {
  const { httpTests, metadata, generatedAt } = artifacts;
  
  let markdown = '# Generated Test Documentation\n\n';
  markdown += `**Generated:** ${new Date(generatedAt).toLocaleString()}\n\n`;
  markdown += `**Total Tests:** ${metadata.totalTests}\n`;
  markdown += `**API Tests:** ${metadata.apiTests}\n`;
  markdown += `**Manual Tests:** ${metadata.manualTests}\n\n`;
  
  markdown += '---\n\n';
  markdown += '## Executable HTTP Tests\n\n';
  
  if (httpTests.length === 0) {
    markdown += '*No executable HTTP tests generated.*\n';
  } else {
    httpTests.forEach((test, index) => {
      markdown += `### ${index + 1}. ${test.title}\n\n`;
      markdown += `**Test ID:** ${test.id}\n`;
      markdown += `**Acceptance Criterion:** ${test.acceptanceCriterionId}\n\n`;
      markdown += `**Request:**\n`;
      markdown += `- Method: \`${test.method}\`\n`;
      markdown += `- URL: \`${test.url}\`\n`;
      
      if (test.headers) {
        markdown += `- Headers:\n`;
        Object.entries(test.headers).forEach(([key, value]) => {
          markdown += `  - \`${key}: ${value}\`\n`;
        });
      }
      
      if (test.body) {
        markdown += `- Body:\n\`\`\`json\n${JSON.stringify(test.body, null, 2)}\n\`\`\`\n`;
      }
      
      markdown += `\n**Expected Response:**\n`;
      markdown += `- Status: \`${test.expectedStatus}\`\n`;
      
      if (test.expectedBodyContains) {
        markdown += `- Body Contains:\n`;
        test.expectedBodyContains.forEach(content => {
          markdown += `  - "${content}"\n`;
        });
      }
      
      if (test.expectedBodySchema) {
        markdown += `- Body Schema:\n\`\`\`json\n${JSON.stringify(test.expectedBodySchema, null, 2)}\n\`\`\`\n`;
      }
      
      markdown += '\n---\n\n';
    });
  }
  
  return markdown;
}

/**
 * Write test documentation markdown
 */
async function writeTestMarkdown(artifacts: GeneratedTestArtifacts, outputDir: string): Promise<string> {
  const markdown = generateTestMarkdown(artifacts);
  const filePath = path.join(outputDir, 'generated-tests.md');
  await fs.writeFile(filePath, markdown, 'utf-8');
  return filePath;
}

/**
 * Write metadata file
 */
async function writeMetadata(artifacts: GeneratedTestArtifacts, outputDir: string): Promise<string> {
  const metadata = {
    generatedAt: artifacts.generatedAt,
    totalTests: artifacts.metadata.totalTests,
    apiTests: artifacts.metadata.apiTests,
    manualTests: artifacts.metadata.manualTests,
    httpTestsCount: artifacts.httpTests.length,
    files: {
      qaTaskPlan: 'qa-task-plan.json',
      httpTests: 'generated-http-tests.json',
      documentation: 'generated-tests.md',
      metadata: 'metadata.json'
    }
  };
  
  const filePath = path.join(outputDir, 'metadata.json');
  await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  return filePath;
}

/**
 * Write all test artifacts to the traceqa-generated directory
 */
export async function writeTestArtifacts(artifacts: GeneratedTestArtifacts): Promise<{
  outputDir: string;
  files: {
    qaTaskPlan: string;
    httpTests: string;
    documentation: string;
    metadata: string;
  };
}> {
  const outputDir = await ensureOutputDir();
  
  const files = {
    qaTaskPlan: await writeQATaskPlanLegacy(artifacts.qaTaskPlan, outputDir),
    httpTests: await writeHTTPTests(artifacts.httpTests, outputDir),
    documentation: await writeTestMarkdown(artifacts, outputDir),
    metadata: await writeMetadata(artifacts, outputDir)
  };
  
  return {
    outputDir,
    files
  };
}

/**
 * Read generated HTTP tests from file
 */
export async function readGeneratedHTTPTests(): Promise<ExecutableHTTPTest[]> {
  const filePath = path.join(OUTPUT_DIR, 'generated-http-tests.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read generated HTTP tests: ${error}`);
  }
}

/**
 * Check if generated artifacts exist
 */
export async function artifactsExist(): Promise<boolean> {
  return await fs.pathExists(path.join(OUTPUT_DIR, 'generated-http-tests.json'));
}

/**
 * Write normalized tests to file
 * This includes the full HTTP test schema with validated URLs
 */
export async function writeNormalizedTests(
  normalizedTests: NormalizedTest[],
  outputDir: string = OUTPUT_DIR
): Promise<string> {
  await fs.ensureDir(outputDir);
  
  // Convert normalized tests to API test configs
  const apiTestConfigs: APITestConfig[] = normalizedTests.map(nt => nt.config);
  
  // Write full normalized tests (includes validation info)
  const normalizedFilePath = path.join(outputDir, 'normalized-tests.json');
  await fs.writeFile(
    normalizedFilePath,
    JSON.stringify(normalizedTests, null, 2),
    'utf-8'
  );
  
  // Write API test configs (for execution)
  const configFilePath = path.join(outputDir, 'generated-http-tests.json');
  await fs.writeFile(
    configFilePath,
    JSON.stringify(apiTestConfigs, null, 2),
    'utf-8'
  );
  
  // Generate markdown documentation
  const markdown = generateNormalizedTestMarkdown(normalizedTests);
  const markdownPath = path.join(outputDir, 'generated-tests.md');
  await fs.writeFile(markdownPath, markdown, 'utf-8');
  
  return normalizedFilePath;
}

/**
 * Generate markdown documentation for normalized tests
 */
function generateNormalizedTestMarkdown(normalizedTests: NormalizedTest[]): string {
  let markdown = '# Generated Test Documentation\n\n';
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `**Total Tests:** ${normalizedTests.length}\n`;
  markdown += `**Valid Tests:** ${normalizedTests.filter(t => t.isValid).length}\n`;
  markdown += `**Invalid Tests:** ${normalizedTests.filter(t => !t.isValid).length}\n\n`;
  
  // Group by validity
  const validTests = normalizedTests.filter(t => t.isValid);
  const invalidTests = normalizedTests.filter(t => !t.isValid);
  
  if (validTests.length > 0) {
    markdown += '---\n\n';
    markdown += '## ✅ Valid Tests\n\n';
    
    validTests.forEach((test, index) => {
      const config = test.config;
      markdown += `### ${index + 1}. ${config.name}\n\n`;
      markdown += `**Description:** ${config.description}\n\n`;
      markdown += `**Request:**\n`;
      markdown += `- Method: \`${config.request.method}\`\n`;
      markdown += `- URL: \`${config.request.url}\`\n`;
      
      if (config.request.headers && Object.keys(config.request.headers).length > 0) {
        markdown += `- Headers:\n`;
        Object.entries(config.request.headers).forEach(([key, value]) => {
          markdown += `  - \`${key}: ${value}\`\n`;
        });
      }
      
      if (config.request.body) {
        markdown += `- Body:\n\`\`\`json\n${JSON.stringify(config.request.body, null, 2)}\n\`\`\`\n`;
      }
      
      markdown += `\n**Expected Response:**\n`;
      config.assertions.forEach(assertion => {
        if (assertion.type === AssertionType.STATUS_CODE) {
          markdown += `- Status: \`${assertion.expected}\`\n`;
        } else {
          markdown += `- ${assertion.type}: \`${assertion.expected}\`\n`;
        }
      });
      
      markdown += '\n---\n\n';
    });
  }
  
  if (invalidTests.length > 0) {
    markdown += '## ❌ Invalid Tests (Generation Errors)\n\n';
    markdown += '*These tests could not be normalized due to generation errors or missing information.*\n\n';
    
    invalidTests.forEach((test, index) => {
      markdown += `### ${index + 1}. ${test.config.name}\n\n`;
      markdown += `**Error Type:** \`${test.errorType}\`\n\n`;
      markdown += `**Error Message:** ${test.errorMessage}\n\n`;
      markdown += `**Original Test Case:**\n`;
      markdown += `- Name: ${test.originalTestCase.name}\n`;
      markdown += `- Description: ${test.originalTestCase.description}\n`;
      markdown += `- Expected Result: ${test.originalTestCase.expectedResult}\n`;
      markdown += '\n---\n\n';
    });
  }
  
  return markdown;
}

/**
 * Write QA task plan to file (new architecture)
 */
export async function writeQATaskPlan(
  taskPlan: QATaskPlan,
  outputDir: string = OUTPUT_DIR
): Promise<void> {
  await ensureOutputDir(outputDir);
  
  const filePath = path.join(outputDir, 'qa-task-plan.json');
  
  logger.info(`Writing QA task plan to ${filePath}...`);
  
  await fs.writeFile(
    filePath,
    JSON.stringify(taskPlan, null, 2),
    'utf-8'
  );
  
  logger.success(`✓ QA task plan written to ${filePath}`);
}

/**
 * Write generated HTTP tests to file (new architecture)
 */
export async function writeGeneratedHTTPTests(
  testSuite: GeneratedHTTPTestSuite,
  outputDir: string = OUTPUT_DIR
): Promise<void> {
  await ensureOutputDir(outputDir);
  
  const filePath = path.join(outputDir, 'generated-http-tests.json');
  
  logger.info(`Writing generated HTTP tests to ${filePath}...`);
  
  await fs.writeFile(
    filePath,
    JSON.stringify(testSuite, null, 2),
    'utf-8'
  );
  
  logger.success(`✓ Generated HTTP tests written to ${filePath}`);
}

/**
 * Write generated tests markdown documentation (new architecture)
 */
export async function writeGeneratedTestsMarkdown(
  taskPlan: QATaskPlan,
  testSuite: GeneratedHTTPTestSuite,
  outputDir: string = OUTPUT_DIR
): Promise<void> {
  await ensureOutputDir(outputDir);
  
  const filePath = path.join(outputDir, 'generated-tests.md');
  
  logger.info(`Writing generated tests markdown to ${filePath}...`);
  
  const markdown = generateTestsMarkdown(taskPlan, testSuite);
  
  await fs.writeFile(filePath, markdown, 'utf-8');
  
  logger.success(`✓ Generated tests markdown written to ${filePath}`);
}

/**
 * Generate markdown documentation for QA tasks and HTTP tests
 */
function generateTestsMarkdown(
  taskPlan: QATaskPlan,
  testSuite: GeneratedHTTPTestSuite
): string {
  const lines: string[] = [];
  
  lines.push('# TraceQA Generated Tests\n');
  lines.push(`Generated: ${new Date().toISOString()}\n`);
  
  // Summary
  lines.push('## Summary\n');
  lines.push(`- **Total QA Tasks**: ${taskPlan.summary.totalTasks}`);
  lines.push(`- **Automated Tasks**: ${taskPlan.summary.automatedTasks}`);
  lines.push(`- **Manual Tasks**: ${taskPlan.summary.manualTasks}`);
  lines.push(`- **Uncertain Tasks**: ${taskPlan.summary.uncertainTasks}\n`);
  
  lines.push(`- **Total HTTP Tests**: ${testSuite.summary.totalTests}`);
  lines.push(`- **Ready Tests**: ${testSuite.summary.readyTests}`);
  lines.push(`- **Uncertain Tests**: ${testSuite.summary.uncertainTests}`);
  lines.push(`- **Manual Tests**: ${testSuite.summary.manualTests}\n`);
  
  // QA Tasks
  lines.push('## QA Task Plan\n');
  
  for (const task of taskPlan.tasks) {
    lines.push(`### ${task.taskId}: ${task.title}\n`);
    lines.push(`- **Type**: ${task.type}`);
    lines.push(`- **Priority**: ${task.priority}`);
    lines.push(`- **Execution Mode**: ${task.executionMode}`);
    lines.push(`- **Acceptance Criterion**: ${task.acceptanceCriterionId}\n`);
    
    if (task.steps.length > 0) {
      lines.push('**Steps**:');
      for (const step of task.steps) {
        lines.push(`1. ${step.description}`);
        if (step.expectedOutcome) {
          lines.push(`   - Expected: ${step.expectedOutcome}`);
        }
      }
      lines.push('');
    }
    
    lines.push(`**Expected Result**: ${task.expectedResult}\n`);
    lines.push(`**Reasoning**: ${task.reasoning}\n`);
    
    if (task.uncertainReason) {
      lines.push(`⚠️ **Uncertain**: ${task.uncertainReason}\n`);
    }
  }
  
  // HTTP Tests
  lines.push('## Generated HTTP Tests\n');
  
  for (const test of testSuite.tests) {
    lines.push(`### ${test.id}: ${test.title}\n`);
    lines.push(`- **Status**: ${test.status}`);
    lines.push(`- **Acceptance Criterion**: ${test.acceptanceCriterionId}`);
    if (test.qaTaskId) {
      lines.push(`- **QA Task**: ${test.qaTaskId}`);
    }
    lines.push('');
    
    if (test.status === 'ready' && test.steps.length > 0) {
      lines.push('**Test Steps**:\n');
      
      for (const step of test.steps) {
        lines.push(`#### ${step.stepId}\n`);
        lines.push('```http');
        lines.push(`${step.method} ${step.url}`);
        if (step.headers) {
          for (const [key, value] of Object.entries(step.headers)) {
            lines.push(`${key}: ${value}`);
          }
        }
        if (step.body) {
          lines.push('');
          lines.push(JSON.stringify(step.body, null, 2));
        }
        lines.push('```\n');
        
        lines.push(`**Expected Status**: ${step.expectedStatus}`);
        lines.push(`**Acceptable Statuses**: [${step.acceptableStatuses.join(', ')}]\n`);
      }
    } else if (test.uncertainReason) {
      lines.push(`⚠️ **${test.status.toUpperCase()}**: ${test.uncertainReason}\n`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Write metadata file (new architecture)
 */
export async function writeGeneratedMetadata(
  metadata: {
    generatedAt: string;
    ibmUsed: boolean;
    normalizationApplied: boolean;
    warnings: string[];
  },
  outputDir: string = OUTPUT_DIR
): Promise<void> {
  await ensureOutputDir(outputDir);
  
  const filePath = path.join(outputDir, 'metadata.json');
  
  logger.info(`Writing metadata to ${filePath}...`);
  
  await fs.writeFile(
    filePath,
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );
  
  logger.success(`✓ Metadata written to ${filePath}`);
}

/**
 * Write all generated artifacts at once (new architecture)
 */
export async function writeAllGeneratedArtifacts(
  taskPlan: QATaskPlan,
  testSuite: GeneratedHTTPTestSuite,
  outputDir: string = OUTPUT_DIR,
  metadata?: {
    generatedAt: string;
    ibmUsed: boolean;
    normalizationApplied: boolean;
    warnings: string[];
  }
): Promise<void> {
  logger.info('Writing all generated artifacts...');
  
  await writeQATaskPlan(taskPlan, outputDir);
  await writeGeneratedHTTPTests(testSuite, outputDir);
  await writeGeneratedTestsMarkdown(taskPlan, testSuite, outputDir);
  
  if (metadata) {
    await writeGeneratedMetadata(metadata, outputDir);
  }
  
  logger.success('✓ All generated artifacts written successfully');
}

// Made with Bob
