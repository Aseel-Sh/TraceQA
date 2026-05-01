/**
 * TraceQA CLI Entry Point
 * Command-line interface using Commander.js
 */

import { Command } from 'commander';
import { collectUserInput, displayOutro, showError } from './prompts.js';
import { logger } from '../utils/logger.js';
import { TestConfig, TestType, TraceQAError, ErrorCategory } from '../types/index.js';
import path from 'path';
import fs from 'fs-extra';

// Package version - will be replaced during build
const VERSION = '0.1.0';

/**
 * Create and configure the CLI program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('traceqa')
    .description('Intelligent CLI tool for developer-driven QA testing')
    .version(VERSION, '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help information');

  // Main test command (default)
  program
    .command('test', { isDefault: true })
    .description('Run interactive testing mode')
    .option('-r, --repo <path>', 'Repository path to test')
    .option('-b, --branch <name>', 'Git branch to test')
    .option('-d, --description <text>', 'Change description')
    .option('-t, --type <type>', 'Test type: ui, api, or both', 'both')
    .option('-y, --yes', 'Auto-approve test plan without confirmation')
    .option('--debug', 'Enable debug mode')
    .action(async (options) => {
      try {
        await handleTestCommand(options);
      } catch (error) {
        handleError(error);
        process.exit(1);
      }
    });

  // Config command
  program
    .command('config')
    .description('Configure TraceQA settings')
    .option('-s, --show', 'Show current configuration')
    .option('-e, --edit', 'Edit configuration file')
    .option('--api-key <key>', 'Set Anthropic API key')
    .action(async (options) => {
      try {
        await handleConfigCommand(options);
      } catch (error) {
        handleError(error);
        process.exit(1);
      }
    });

  // Init command
  program
    .command('init')
    .description('Initialize TraceQA in current project')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      try {
        await handleInitCommand(options);
      } catch (error) {
        handleError(error);
        process.exit(1);
      }
    });

  // Info command
  program
    .command('info')
    .description('Display system and project information')
    .action(async () => {
      try {
        await handleInfoCommand();
      } catch (error) {
        handleError(error);
        process.exit(1);
      }
    });

  return program;
}

/**
 * Handle the test command
 */
async function handleTestCommand(options: {
  repo?: string;
  branch?: string;
  description?: string;
  type?: string;
  yes?: boolean;
  debug?: boolean;
}): Promise<void> {
  // Enable debug mode if requested
  if (options.debug) {
    logger.setDebugMode(true);
    logger.debug('Debug mode enabled');
  }

  let config: TestConfig;

  // If all options provided, skip interactive mode
  if (options.repo && options.description) {
    logger.debug('Using command-line options', options);

    // Validate repository path
    const repoPath = path.resolve(options.repo);
    if (!await fs.pathExists(repoPath)) {
      throw new TraceQAError(
        `Repository path does not exist: ${repoPath}`,
        ErrorCategory.REPOSITORY
      );
    }

    // Validate test type
    const testType = parseTestType(options.type || 'both');

    config = {
      repository: {
        path: repoPath,
        name: path.basename(repoPath),
        branch: options.branch || 'current'
      },
      testType,
      description: options.description,
      autoApprove: options.yes || false
    };

    logger.info('Starting tests with provided configuration...');
  } else {
    // Interactive mode
    const userInput = await collectUserInput();

    if (!userInput) {
      logger.warn('Testing cancelled by user');
      process.exit(0);
    }

    config = {
      repository: {
        path: userInput.repository,
        name: path.basename(userInput.repository),
        branch: options.branch || 'current'
      },
      testType: userInput.testType,
      description: userInput.description,
      acceptanceCriteria: userInput.acceptanceCriteria 
        ? userInput.acceptanceCriteria.split(',').map(c => c.trim())
        : undefined,
      autoApprove: options.yes || false
    };
  }

  // Execute tests with the configuration
  await executeTests(config);
}

/**
 * Parse test type string to TestType enum
 */
function parseTestType(type: string): TestType {
  const normalized = type.toLowerCase();
  
  switch (normalized) {
    case 'ui':
    case 'web':
    case 'web-ui':
      return TestType.WEB_UI;
    case 'api':
      return TestType.API;
    case 'both':
    case 'all':
      return TestType.BOTH;
    case 'integration':
      return TestType.INTEGRATION;
    default:
      throw new TraceQAError(
        `Invalid test type: ${type}. Use 'ui', 'api', or 'both'`,
        ErrorCategory.CONFIGURATION
      );
  }
}

/**
 * Execute tests with the given configuration
 */
async function executeTests(config: TestConfig): Promise<void> {
  logger.section('Test Execution');
  
  logger.info('Configuration loaded');
  logger.keyValue('Repository', config.repository.name);
  logger.keyValue('Path', config.repository.path);
  logger.keyValue('Test Type', config.testType);
  logger.keyValue('Description', config.description);
  
  if (config.acceptanceCriteria && config.acceptanceCriteria.length > 0) {
    logger.subsection('Acceptance Criteria');
    config.acceptanceCriteria.forEach(criteria => {
      logger.listItem(criteria);
    });
  }

  logger.newLine();

  // TODO: Implement actual test execution
  // This is a placeholder that will be implemented in future phases
  logger.warn('Test execution not yet implemented');
  logger.info('This is Phase 1 - CLI framework only');
  logger.info('Test execution will be implemented in Phase 2-4');
  
  logger.newLine();
  logger.box(
    'TraceQA CLI is ready!\n\n' +
    'Next steps:\n' +
    '• Phase 2: Build system integration\n' +
    '• Phase 3: MCP integration\n' +
    '• Phase 4: Intelligent agent\n' +
    '• Phase 5: Test execution',
    'info'
  );

  displayOutro(true);
}

/**
 * Handle the config command
 */
async function handleConfigCommand(options: {
  show?: boolean;
  edit?: boolean;
  apiKey?: string;
}): Promise<void> {
  logger.section('Configuration');

  const configPath = getConfigPath();

  if (options.show) {
    // Show current configuration
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      logger.info('Current configuration:');
      logger.newLine();
      console.log(JSON.stringify(config, null, 2));
    } else {
      logger.warn('No configuration file found');
      logger.info(`Expected location: ${configPath}`);
    }
    return;
  }

  if (options.apiKey) {
    // Set API key
    let config: any = {};
    if (await fs.pathExists(configPath)) {
      config = await fs.readJSON(configPath);
    }
    
    config.anthropicApiKey = options.apiKey;
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJSON(configPath, config, { spaces: 2 });
    
    logger.success('API key saved successfully');
    logger.info(`Configuration saved to: ${configPath}`);
    return;
  }

  if (options.edit) {
    // Open config file in editor
    logger.info('Opening configuration file...');
    logger.info(`Location: ${configPath}`);
    // TODO: Open in default editor
    logger.warn('Editor integration not yet implemented');
    return;
  }

  // Default: show help
  logger.info('Configuration options:');
  logger.listItem('--show: Display current configuration');
  logger.listItem('--edit: Edit configuration file');
  logger.listItem('--api-key <key>: Set Anthropic API key');
}

/**
 * Handle the init command
 */
async function handleInitCommand(options: { force?: boolean }): Promise<void> {
  logger.section('Initialize TraceQA');

  const configPath = path.join(process.cwd(), '.traceqa.json');
  
  // Check if config already exists
  if (await fs.pathExists(configPath) && !options.force) {
    logger.warn('Configuration file already exists');
    logger.info(`Location: ${configPath}`);
    logger.info('Use --force to overwrite');
    return;
  }

  // Create default configuration
  const defaultConfig = {
    version: VERSION,
    testTimeout: 300000, // 5 minutes
    maxRetries: 3,
    reportFormat: 'html',
    outputDir: './traceqa-reports',
    mcpServers: []
  };

  await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });
  
  logger.success('TraceQA initialized successfully!');
  logger.info(`Configuration created: ${configPath}`);
  logger.newLine();
  logger.info('Next steps:');
  logger.listItem('Set your Anthropic API key: traceqa config --api-key YOUR_KEY');
  logger.listItem('Run your first test: traceqa test');
}

/**
 * Handle the info command
 */
async function handleInfoCommand(): Promise<void> {
  logger.section('System Information');

  logger.keyValue('TraceQA Version', VERSION);
  logger.keyValue('Node Version', process.version);
  logger.keyValue('Platform', process.platform);
  logger.keyValue('Architecture', process.arch);
  logger.keyValue('Working Directory', process.cwd());
  
  logger.newLine();
  logger.subsection('Configuration');
  
  const configPath = getConfigPath();
  const configExists = await fs.pathExists(configPath);
  
  logger.keyValue('Config File', configExists ? '✓ Found' : '✗ Not found');
  logger.keyValue('Config Path', configPath);
  
  if (configExists) {
    const config = await fs.readJSON(configPath);
    logger.keyValue('API Key', config.anthropicApiKey ? '✓ Set' : '✗ Not set');
  }

  logger.newLine();
  logger.subsection('Environment');
  
  const envVars = [
    'ANTHROPIC_API_KEY',
    'DEBUG',
    'NODE_ENV'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    logger.keyValue(varName, value ? '✓ Set' : '✗ Not set');
  });
}

/**
 * Get configuration file path
 */
function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, '.traceqa', 'config.json');
}

/**
 * Handle errors consistently
 */
function handleError(error: unknown): void {
  logger.newLine();

  if (error instanceof TraceQAError) {
    showError(error.message, `Category: ${error.category}`);
    
    if (error.details) {
      logger.debug('Error details', error.details);
    }
  } else if (error instanceof Error) {
    showError('An unexpected error occurred', error.message);
    logger.debug('Error stack', error.stack);
  } else {
    showError('An unknown error occurred', String(error));
  }

  displayOutro(false);
}

/**
 * Run the CLI program
 */
export async function runCLI(argv: string[] = process.argv): Promise<void> {
  const program = createCLI();
  
  try {
    await program.parseAsync(argv);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

// Made with Bob
