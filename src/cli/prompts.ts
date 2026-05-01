/**
 * TraceQA Interactive Prompts
 * Beautiful CLI prompts using @clack/prompts
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { TestType, UserInput, RepositoryOption } from '../types/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Display welcome message with TraceQA branding
 */
export function displayWelcome(): void {
  console.clear();
  
  p.intro(chalk.bold.cyan('🔍 TraceQA - Intelligent Testing Agent'));
  
  console.log();
  console.log(chalk.gray('  Automated testing powered by AI'));
  console.log(chalk.gray('  Analyze changes, generate tests, ensure quality'));
  console.log();
}

/**
 * Display goodbye message
 */
export function displayOutro(success: boolean = true): void {
  if (success) {
    p.outro(chalk.green('✓ Testing complete! Check the results above.'));
  } else {
    p.outro(chalk.yellow('Testing cancelled or interrupted.'));
  }
}

/**
 * Get list of recent repositories from current directory and common locations
 */
async function getRecentRepositories(): Promise<RepositoryOption[]> {
  const repos: RepositoryOption[] = [];
  const currentDir = process.cwd();

  // Add current directory if it's a git repository
  if (await isGitRepository(currentDir)) {
    const repoName = path.basename(currentDir);
    repos.push({
      value: currentDir,
      label: `${repoName} (current directory)`,
      hint: currentDir
    });
  }

  // Check parent directory
  const parentDir = path.dirname(currentDir);
  if (await isGitRepository(parentDir)) {
    const repoName = path.basename(parentDir);
    repos.push({
      value: parentDir,
      label: repoName,
      hint: parentDir
    });
  }

  // Check sibling directories
  try {
    const parentContents = await fs.readdir(parentDir);
    for (const item of parentContents.slice(0, 5)) { // Limit to 5 siblings
      const siblingPath = path.join(parentDir, item);
      const stat = await fs.stat(siblingPath);
      
      if (stat.isDirectory() && siblingPath !== currentDir && await isGitRepository(siblingPath)) {
        repos.push({
          value: siblingPath,
          label: item,
          hint: siblingPath
        });
      }
    }
  } catch (error) {
    // Ignore errors reading parent directory
    logger.debug('Error reading parent directory', error);
  }

  // Add option to browse for another repository
  repos.push({
    value: '__browse__',
    label: '📁 Browse for another repository...',
    hint: 'Select a different directory'
  });

  return repos;
}

/**
 * Check if a directory is a git repository
 */
async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const gitPath = path.join(dirPath, '.git');
    return await fs.pathExists(gitPath);
  } catch {
    return false;
  }
}

/**
 * Prompt user to select a repository
 */
export async function promptRepositorySelection(): Promise<string | symbol> {
  const repos = await getRecentRepositories();

  const selected = await p.select({
    message: 'Select a repository to test:',
    options: repos.map(repo => ({
      value: repo.value,
      label: repo.label,
      hint: repo.hint
    })),
    initialValue: repos[0]?.value
  });

  if (p.isCancel(selected)) {
    return selected;
  }

  // If user wants to browse, prompt for path
  if (selected === '__browse__') {
    const customPath = await p.text({
      message: 'Enter the repository path:',
      placeholder: '/path/to/repository',
      validate: (value) => {
        if (!value) return 'Path is required';
        // Note: Synchronous validation only - path existence checked after input
        return undefined;
      }
    });

    if (p.isCancel(customPath)) {
      return customPath;
    }

    return customPath as string;
  }

  return selected as string;
}

/**
 * Prompt user for change description
 */
export async function promptChangeDescription(): Promise<string | symbol> {
  const description = await p.text({
    message: 'Describe what you changed:',
    placeholder: 'e.g., Added user authentication with JWT tokens',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Description is required';
      }
      if (value.trim().length < 10) {
        return 'Please provide a more detailed description (at least 10 characters)';
      }
      return undefined;
    }
  });

  return description;
}

/**
 * Prompt user for acceptance criteria (optional)
 */
export async function promptAcceptanceCriteria(): Promise<string | symbol> {
  const wantsCriteria = await p.confirm({
    message: 'Do you want to provide acceptance criteria?',
    initialValue: false
  });

  if (p.isCancel(wantsCriteria)) {
    return wantsCriteria;
  }

  if (!wantsCriteria) {
    return '';
  }

  const criteria = await p.text({
    message: 'Enter acceptance criteria (comma-separated):',
    placeholder: 'e.g., Login works, Token is valid, Protected routes are secure',
    validate: (value) => {
      if (value && value.trim().length > 0 && value.trim().length < 5) {
        return 'Please provide more detailed criteria';
      }
      return undefined;
    }
  });

  return criteria;
}

/**
 * Prompt user to select test type
 */
export async function promptTestType(): Promise<TestType | symbol> {
  const testType = await p.select({
    message: 'What type of tests should I run?',
    options: [
      {
        value: TestType.WEB_UI,
        label: '🌐 Web UI Tests',
        hint: 'Test user interface and interactions'
      },
      {
        value: TestType.API,
        label: '🔌 API Tests',
        hint: 'Test API endpoints and responses'
      },
      {
        value: TestType.BOTH,
        label: '🔄 Both UI & API',
        hint: 'Comprehensive testing (recommended)'
      }
    ],
    initialValue: TestType.BOTH
  });

  return testType as TestType | symbol;
}

/**
 * Display test configuration summary and get confirmation
 */
export async function promptConfirmation(config: {
  repository: string;
  description: string;
  acceptanceCriteria?: string;
  testType: TestType;
}): Promise<boolean | symbol> {
  console.log();
  p.note(
    [
      chalk.gray('Repository:') + ' ' + chalk.white(path.basename(config.repository)),
      chalk.gray('Path:') + ' ' + chalk.white(config.repository),
      chalk.gray('Description:') + ' ' + chalk.white(config.description),
      config.acceptanceCriteria 
        ? chalk.gray('Criteria:') + ' ' + chalk.white(config.acceptanceCriteria)
        : '',
      chalk.gray('Test Type:') + ' ' + chalk.white(getTestTypeLabel(config.testType))
    ].filter(Boolean).join('\n'),
    'Test Configuration'
  );
  console.log();

  const confirmed = await p.confirm({
    message: 'Start testing with this configuration?',
    initialValue: true
  });

  return confirmed;
}

/**
 * Get human-readable label for test type
 */
function getTestTypeLabel(testType: TestType): string {
  switch (testType) {
    case TestType.WEB_UI:
      return '🌐 Web UI Tests';
    case TestType.API:
      return '🔌 API Tests';
    case TestType.BOTH:
      return '🔄 Both UI & API';
    case TestType.INTEGRATION:
      return '🔗 Integration Tests';
    default:
      return 'Unknown';
  }
}

/**
 * Main prompt flow - collect all user input
 */
export async function collectUserInput(): Promise<UserInput | null> {
  displayWelcome();

  // Step 1: Repository selection
  const repository = await promptRepositorySelection();
  if (p.isCancel(repository)) {
    displayOutro(false);
    return null;
  }

  // Step 2: Change description
  const description = await promptChangeDescription();
  if (p.isCancel(description)) {
    displayOutro(false);
    return null;
  }

  // Step 3: Acceptance criteria (optional)
  const acceptanceCriteria = await promptAcceptanceCriteria();
  if (p.isCancel(acceptanceCriteria)) {
    displayOutro(false);
    return null;
  }

  // Step 4: Test type selection
  const testType = await promptTestType();
  if (p.isCancel(testType)) {
    displayOutro(false);
    return null;
  }

  // Step 5: Confirmation
  const confirmed = await promptConfirmation({
    repository: repository as string,
    description: description as string,
    acceptanceCriteria: acceptanceCriteria as string,
    testType: testType as TestType
  });

  if (p.isCancel(confirmed) || !confirmed) {
    displayOutro(false);
    return null;
  }

  return {
    repository: repository as string,
    description: description as string,
    acceptanceCriteria: acceptanceCriteria as string || undefined,
    testType: testType as TestType,
    confirmed: true
  };
}

/**
 * Show a spinner for long-running operations
 */
export function showSpinner(_message: string) {
  return p.spinner();
}

/**
 * Show progress during test execution
 */
export async function showTestProgress(
  message: string,
  task: () => Promise<void>
): Promise<void> {
  const s = p.spinner();
  s.start(message);

  try {
    await task();
    s.stop(chalk.green('✓ ') + message);
  } catch (error) {
    s.stop(chalk.red('✗ ') + message);
    throw error;
  }
}

/**
 * Ask user a yes/no question
 */
export async function askConfirmation(
  message: string,
  initialValue: boolean = true
): Promise<boolean> {
  const result = await p.confirm({
    message,
    initialValue
  });

  if (p.isCancel(result)) {
    return false;
  }

  return result as boolean;
}

/**
 * Ask user for text input
 */
export async function askText(
  message: string,
  placeholder?: string,
  defaultValue?: string
): Promise<string | null> {
  const result = await p.text({
    message,
    placeholder,
    defaultValue
  });

  if (p.isCancel(result)) {
    return null;
  }

  return result as string;
}

/**
 * Show a selection menu
 */
export async function askSelect<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>
): Promise<T | null> {
  const result = await p.select({
    message,
    options
  });

  if (p.isCancel(result)) {
    return null;
  }

  return result as T;
}

/**
 * Show an error message
 */
export function showError(message: string, details?: string): void {
  console.log();
  p.cancel(chalk.red(message));
  if (details) {
    console.log(chalk.gray(details));
  }
  console.log();
}

/**
 * Show a success message
 */
export function showSuccess(message: string, details?: string): void {
  console.log();
  console.log(chalk.green('✓ ') + chalk.green(message));
  if (details) {
    console.log(chalk.gray(details));
  }
  console.log();
}

/**
 * Show a warning message
 */
export function showWarning(message: string, details?: string): void {
  console.log();
  console.log(chalk.yellow('⚠ ') + chalk.yellow(message));
  if (details) {
    console.log(chalk.gray(details));
  }
  console.log();
}

/**
 * Show an info message
 */
export function showInfo(message: string, details?: string): void {
  console.log();
  console.log(chalk.blue('ℹ ') + chalk.blue(message));
  if (details) {
    console.log(chalk.gray(details));
  }
  console.log();
}

/**
 * Enhanced approval gate - shows generated tests and allows user to review
 */
export async function promptTestApproval(approvalData: {
  acceptanceCriteria?: Array<{ id: string; description: string }>;
  discoveredRoutes?: Array<{ method: string; path: string }>;
  testPlanSummary: string;
  generatedTestsCount: number;
  sampleTests?: string[];
  executorType: 'API' | 'Browser' | 'Manual';
  estimatedTime?: string;
  framework?: string;
}): Promise<'approve' | 'edit' | 'skip' | 'cancel'> {
  console.log();
  
  // Build the approval summary
  const summaryLines: string[] = [
    chalk.bold.cyan('📋 Test Generation Summary'),
    '',
  ];
  
  // Show acceptance criteria if provided
  if (approvalData.acceptanceCriteria && approvalData.acceptanceCriteria.length > 0) {
    summaryLines.push(chalk.bold('Acceptance Criteria:'));
    approvalData.acceptanceCriteria.forEach(ac => {
      summaryLines.push(chalk.gray(`  ${ac.id}:`) + ` ${ac.description}`);
    });
    summaryLines.push('');
  }
  
  // Show discovered routes if available
  if (approvalData.discoveredRoutes && approvalData.discoveredRoutes.length > 0) {
    summaryLines.push(chalk.bold('Discovered Routes:'));
    if (approvalData.framework) {
      summaryLines.push(chalk.gray(`  Framework: ${approvalData.framework}`));
    }
    const routeDisplay = approvalData.discoveredRoutes.slice(0, 10); // Show first 10
    routeDisplay.forEach(route => {
      const methodColor = route.method === 'GET' ? chalk.green : 
                         route.method === 'POST' ? chalk.blue :
                         route.method === 'PUT' ? chalk.yellow :
                         route.method === 'DELETE' ? chalk.red : chalk.white;
      summaryLines.push(`  ${methodColor(route.method.padEnd(6))} ${chalk.gray(route.path)}`);
    });
    if (approvalData.discoveredRoutes.length > 10) {
      summaryLines.push(chalk.gray(`  ... and ${approvalData.discoveredRoutes.length - 10} more routes`));
    }
    summaryLines.push('');
  }
  
  // Show test plan summary
  summaryLines.push(chalk.bold('Test Plan:'));
  summaryLines.push(chalk.gray(approvalData.testPlanSummary));
  summaryLines.push('');
  
  // Show generated tests info
  summaryLines.push(chalk.bold('Generated Tests:'));
  summaryLines.push(chalk.gray(`  Count: ${approvalData.generatedTestsCount} test(s)`));
  summaryLines.push(chalk.gray(`  Executor: ${approvalData.executorType}`));
  if (approvalData.estimatedTime) {
    summaryLines.push(chalk.gray(`  Estimated Time: ${approvalData.estimatedTime}`));
  }
  summaryLines.push('');
  
  // Show sample tests if provided
  if (approvalData.sampleTests && approvalData.sampleTests.length > 0) {
    summaryLines.push(chalk.bold('Sample Tests:'));
    approvalData.sampleTests.forEach((test, idx) => {
      summaryLines.push(chalk.gray(`  ${idx + 1}. ${test}`));
    });
    summaryLines.push('');
  }
  
  p.note(summaryLines.join('\n'), 'Review Generated Tests');
  console.log();
  
  // Prompt for approval action
  const action = await p.select({
    message: 'What would you like to do?',
    options: [
      {
        value: 'approve',
        label: '✅ Approve and execute all tests',
        hint: 'Run the generated tests now'
      },
      {
        value: 'edit',
        label: '📝 Edit test plan',
        hint: 'Open generated files in editor for review'
      },
      {
        value: 'skip',
        label: '⏭️ Skip execution',
        hint: 'Generate artifacts only, don\'t run tests'
      },
      {
        value: 'cancel',
        label: '❌ Cancel',
        hint: 'Abort the entire operation'
      }
    ],
    initialValue: 'approve'
  });
  
  if (p.isCancel(action)) {
    return 'cancel';
  }
  
  return action as 'approve' | 'edit' | 'skip' | 'cancel';
}

// Made with Bob
