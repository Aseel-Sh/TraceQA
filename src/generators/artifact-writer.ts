import * as fs from 'fs/promises';
import * as path from 'path';
import { GeneratedTestArtifacts, ExecutableHTTPTest } from './test-generator';

const OUTPUT_DIR = 'traceqa-generated';

/**
 * Ensure the output directory exists
 */
async function ensureOutputDir(): Promise<string> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  return OUTPUT_DIR;
}

/**
 * Write QA task plan to file
 */
async function writeQATaskPlan(qaTaskPlan: any, outputDir: string): Promise<string> {
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
    qaTaskPlan: await writeQATaskPlan(artifacts.qaTaskPlan, outputDir),
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
  try {
    await fs.access(path.join(OUTPUT_DIR, 'generated-http-tests.json'));
    return true;
  } catch {
    return false;
  }
}

// Made with Bob
