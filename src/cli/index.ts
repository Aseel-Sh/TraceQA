/**
 * TraceQA CLI Entry Point
 * Command-line interface using Commander.js
 */

import { Command } from 'commander';
import { collectUserInput, displayOutro, showError } from './prompts.js';
import { logger } from '../utils/logger.js';
import { TestConfig, TestType, TraceQAError, ErrorCategory, DiffAnalysis } from '../types/index.js';
import path from 'path';
import fs from 'fs-extra';
import { BuildSystem } from '../core/build-system.js';
import { TestAgent } from '../agent/test-agent.js';
import { MCPClientManager } from '../mcp/index.js';
import { TestCoordinator } from '../testing/test-coordinator.js';
import { AmbiguityDetector, GitAnalyzer } from '../analysis/index.js';
import { DemoRunner } from '../demo/demo-runner.js';
import { loadAndMergeConfig } from '../config/config-loader.js';
import { parseAcceptanceCriteriaFromFile } from '../parsers/acceptance-parser.js';
import { discoverRoutes, RouteDiscoveryResult } from '../discovery/route-discovery.js';
import { confirm } from '@clack/prompts';

// Package version - will be replaced during build
const VERSION = '0.1.0';

/**
 * Create and configure the CLI program
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('traceqa')
    .description('AI-Powered QA Automation - Intelligent CLI tool for developer-driven testing')
    .version(VERSION, '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help information')
    .addHelpText('after', `
Examples:
  # Run tests (recommended)
  $ traceqa run --acceptance-path acceptance.md --base-url http://localhost:3000
  
  # Auto-approve execution without confirmation
  $ traceqa run --acceptance-path acceptance.md --base-url http://localhost:3000 --yes
  
  # Specify custom output directory
  $ traceqa run --acceptance-path acceptance.md --base-url http://localhost:3000 -o ./reports
  
  # Legacy interactive mode
  $ traceqa test --criteria acceptance.md --base-url http://localhost:3000

For more information, visit: https://github.com/yourusername/traceqa
    `);

  // Main test command (default) - Legacy workflow
  program
    .command('test', { isDefault: true })
    .description('Run interactive testing mode (legacy workflow)')
    .option('-r, --repo <path>', 'Repository path to test')
    .option('-b, --branch <name>', 'Git branch to test')
    .option('-d, --description <text>', 'Change description')
    .option('-t, --type <type>', 'Test type: ui, api, or both', 'both')
    .option('-y, --yes', 'Auto-approve test plan without confirmation')
    .option('-o, --output-dir <path>', 'Output directory for reports', 'traceqa-proof')
    .option('--criteria <file>', 'Path to acceptance criteria file (e.g., acceptance.md)')
    .option('--skip-ambiguity-check', 'Skip ambiguity analysis of acceptance criteria')
    .option('--base-branch <name>', 'Base branch for git diff comparison', 'main')
    .option('--base-url <url>', 'Base URL for API tests (e.g., http://localhost:3000)')
    .option('--health-url <url>', 'Health check endpoint URL')
    .option('--install-command <cmd>', 'Custom install command (e.g., "pip install -r requirements.txt")')
    .option('--build-command <cmd>', 'Custom build command')
    .option('--start-command <cmd>', 'Custom start command')
    .option('--openapi <path>', 'Path to OpenAPI/Swagger spec file')
    .option('--language <lang>', 'Project language (e.g., python, dotnet, java, go)')
    .option('--project-type <type>', 'Project type (e.g., flask, django, aspnet, spring)')
    .option('--no-install', 'Skip dependency installation')
    .option('--no-build', 'Skip build step')
    .option('--no-start', 'Skip starting the application')
    .option('--debug', 'Enable debug mode')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
      try {
        await handleTestCommand(options);
      } catch (error) {
        handleError(error);
        process.exit(1);
      }
    });

  // Run command workflow
  program
    .command('run')
    .description('Run tests (recommended)')
    .requiredOption('--acceptance-path <path>', 'Path to acceptance criteria file (required)')
    .requiredOption('--base-url <url>', 'Base URL of the application to test (required)')
    .option('-o, --output-dir <path>', 'Output directory for reports (default: traceqa-proof)', 'traceqa-proof')
    .option('--generated-dir <path>', 'Directory for generated test artifacts (default: traceqa-generated)', 'traceqa-generated')
    .option('--proof-dir <path>', 'Directory for proof reports (default: traceqa-proof)', 'traceqa-proof')
    .option('--debug-dir <path>', 'Directory for debug output (default: traceqa-debug)', 'traceqa-debug')
    .option('-y, --yes', 'Auto-approve execution without confirmation')
    .option('--verbose', 'Enable verbose logging')
    .option('--debug', 'Enable debug mode')
    .action(async (options) => {
      try {
        await handleRunCommand(options);
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
    .option('--api-key <key>', 'Set IBM watsonx API key')
    .option('--project-id <id>', 'Set IBM watsonx project ID')
    .option('--url <url>', 'Set IBM watsonx URL (optional)')
    .option('--model <model>', 'Set IBM watsonx model (optional)')
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

  // Demo command
  program
    .command('demo')
    .description('Run TraceQA demo with sample acceptance criteria')
    .option('--mock', 'Force mock mode even if IBM credentials are present')
    .option('-o, --output-dir <path>', 'Output directory for reports', './traceqa-proof')
    .action(async (options) => {
      try {
        await handleDemoCommand(options);
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
  outputDir?: string;
  criteria?: string;
  skipAmbiguityCheck?: boolean;
  baseBranch?: string;
  baseUrl?: string;
  healthUrl?: string;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  openapi?: string;
  language?: string;
  projectType?: string;
  install?: boolean;
  build?: boolean;
  start?: boolean;
  debug?: boolean;
}): Promise<void> {
  // Enable debug mode if requested
  if (options.debug) {
    logger.setDebugMode(true);
    logger.debug('Debug mode enabled');
  }

  let config: TestConfig;
  let projectConfig: any = {};

  // If all options provided, skip interactive mode
  if (options.repo && (options.description || options.criteria)) {
    logger.debug('Using command-line options', options);

    // Validate repository path
    const repoPath = path.resolve(options.repo);
    if (!await fs.pathExists(repoPath)) {
      throw new TraceQAError(
        `Repository path does not exist: ${repoPath}`,
        ErrorCategory.REPOSITORY
      );
    }

    // Load and merge configuration from traceqa.config.json and CLI flags
    projectConfig = await loadAndMergeConfig(repoPath, {
      baseUrl: options.baseUrl,
      healthUrl: options.healthUrl,
      installCommand: options.installCommand,
      buildCommand: options.buildCommand,
      startCommand: options.startCommand,
      openapi: options.openapi,
      language: options.language,
      projectType: options.projectType,
      install: options.install,
      build: options.build,
      start: options.start,
      outputDir: options.outputDir
    });

    logger.debug('Merged configuration:', projectConfig);

    // Validate test type
    const testType = parseTestType(options.type || 'both');

    const repoAcceptancePath = path.join(repoPath, 'acceptance.md');

    // Parse acceptance criteria from file if provided
    let acceptanceCriteria: string[] | undefined;
    if (options.criteria) {
      logger.newLine();
      logger.section('Parsing Acceptance Criteria');
      
      const criteriaCandidates = path.isAbsolute(options.criteria)
        ? [options.criteria]
        : [path.resolve(repoPath, options.criteria), path.resolve(process.cwd(), options.criteria)];

      let criteriaPath = criteriaCandidates[0];
      for (const candidate of criteriaCandidates) {
        if (await fs.pathExists(candidate)) {
          criteriaPath = candidate;
          break;
        }
      }

      if (!await fs.pathExists(criteriaPath)) {
        throw new TraceQAError(
          `Acceptance criteria file does not exist: ${criteriaPath}`,
          ErrorCategory.CONFIGURATION
        );
      }
      
      const parsed = await parseAcceptanceCriteriaFromFile(criteriaPath);
      acceptanceCriteria = parsed.criteria.map(c => `${c.id}: ${c.description}`);
      
      logger.success(`✓ Parsed ${parsed.criteria.length} acceptance criteria from ${path.basename(criteriaPath)}`);
    } else if (await fs.pathExists(repoAcceptancePath)) {
      logger.newLine();
      logger.section('Parsing Acceptance Criteria');

      const parsed = await parseAcceptanceCriteriaFromFile(repoAcceptancePath);
      acceptanceCriteria = parsed.criteria.map(c => `${c.id}: ${c.description}`);

      logger.success(`✓ Parsed ${parsed.criteria.length} acceptance criteria from ${path.basename(repoAcceptancePath)}`);
    } else if (options.description) {
      // Split multi-sentence descriptions into acceptance criteria
      // Split on period followed by space or newlines
      const sentences = options.description
        .split(/\.\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      if (sentences.length > 1) {
        // Create AC-1, AC-2, etc. for multiple sentences
        acceptanceCriteria = sentences.map((sentence, index) =>
          `AC-${index + 1}: ${sentence}${sentence.endsWith('.') ? '' : '.'}`
        );
      }
    }

    config = {
      repository: {
        path: repoPath,
        name: path.basename(repoPath),
        branch: options.branch || 'current'
      },
      testType,
      description: options.description || acceptanceCriteria?.join(' ') || 'Acceptance criteria provided via file',
      acceptanceCriteria,
      autoApprove: options.yes || false,
      outputDir: projectConfig.outputDir || options.outputDir,
      baseUrl: projectConfig.baseUrl || options.baseUrl
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
      autoApprove: options.yes || false,
      outputDir: options.outputDir
    };
  }

  // Run ambiguity analysis if acceptance criteria provided
  let diffAnalysis: DiffAnalysis | null = null;
  
  if (config.acceptanceCriteria && config.acceptanceCriteria.length > 0 && !options.skipAmbiguityCheck) {
    logger.newLine();
    logger.section('Analyzing Acceptance Criteria');
    
    const ambiguityDetector = new AmbiguityDetector();
    const analysis = ambiguityDetector.analyzeAcceptanceCriteria(config.acceptanceCriteria);
    
    if (analysis.issuesFound > 0) {
      logger.warn(`Found ${analysis.issuesFound} ambiguity issue(s) in acceptance criteria`);
      logger.newLine();
      
      // Display issues by severity
      const highSeverity = analysis.issues.filter(i => i.severity === 'high');
      const mediumSeverity = analysis.issues.filter(i => i.severity === 'medium');
      const lowSeverity = analysis.issues.filter(i => i.severity === 'low');
      
      if (highSeverity.length > 0) {
        logger.subsection('⚠️  High Severity Issues');
        for (const issue of highSeverity) {
          logger.error(`"${issue.criterion}"`);
          logger.info(`  Vague terms: ${issue.vagueTerms.join(', ')}`);
          logger.info(`  Suggestion: ${issue.suggestion}`);
          logger.newLine();
        }
      }
      
      if (mediumSeverity.length > 0) {
        logger.subsection('⚠️  Medium Severity Issues');
        for (const issue of mediumSeverity) {
          logger.warn(`"${issue.criterion}"`);
          logger.info(`  Vague terms: ${issue.vagueTerms.join(', ')}`);
          logger.info(`  Suggestion: ${issue.suggestion}`);
          logger.newLine();
        }
      }
      
      if (lowSeverity.length > 0) {
        logger.subsection('ℹ️  Low Severity Issues');
        for (const issue of lowSeverity) {
          logger.info(`"${issue.criterion}"`);
          logger.info(`  Issue: ${issue.issue}`);
          logger.info(`  Suggestion: ${issue.suggestion}`);
          logger.newLine();
        }
      }
      
      logger.keyValue('Overall Quality', analysis.overallQuality.toUpperCase());
      
      if (analysis.overallQuality === 'poor' && !config.autoApprove) {
        logger.newLine();
        logger.warn('Acceptance criteria quality is poor. Consider refining them before proceeding.');
        logger.info('You can skip this check with --skip-ambiguity-check flag');
        
        // In interactive mode, we could ask for confirmation here
        // For now, we'll just warn and continue
      }
    } else {
      logger.success('✓ No ambiguity issues found in acceptance criteria');
    }
  }
  
  // Run git diff analysis
  logger.newLine();
  logger.section('Analyzing Git Changes');
  
  const gitAnalyzer = new GitAnalyzer();
  diffAnalysis = await gitAnalyzer.analyzeDiff(options.baseBranch || 'main');
  
  if (diffAnalysis) {
    logger.success('✓ Git diff analysis complete');
    logger.newLine();
    
    logger.keyValue('Base branch', diffAnalysis.baseBranch);
    logger.keyValue('Changed files', diffAnalysis.changedFiles.length.toString());
    logger.keyValue('Risk level', diffAnalysis.riskLevel.toUpperCase());
    
    if (diffAnalysis.impactedAreas.length > 0) {
      logger.newLine();
      logger.subsection('Impacted Areas');
      diffAnalysis.impactedAreas.forEach(area => {
        logger.listItem(area);
      });
    }
    
    if (diffAnalysis.suggestedTestFocus.length > 0) {
      logger.newLine();
      logger.subsection('Suggested Test Focus');
      diffAnalysis.suggestedTestFocus.forEach(focus => {
        logger.listItem(focus);
      });
    }
    
    // Show file changes summary
    if (diffAnalysis.changedFiles.length > 0) {
      logger.newLine();
      logger.subsection('Changed Files Summary');
      
      const added = diffAnalysis.changedFiles.filter(f => f.type === 'added').length;
      const modified = diffAnalysis.changedFiles.filter(f => f.type === 'modified').length;
      const deleted = diffAnalysis.changedFiles.filter(f => f.type === 'deleted').length;
      
      if (added > 0) logger.keyValue('Added', added.toString());
      if (modified > 0) logger.keyValue('Modified', modified.toString());
      if (deleted > 0) logger.keyValue('Deleted', deleted.toString());
    }
  } else {
    logger.info('Git diff analysis skipped (not in a git repository or no changes detected)');
  }
  
  // Discover routes automatically
  logger.newLine();
  logger.section('Discovering Routes');
  
  let discoveredRoutes: RouteDiscoveryResult | null = null;
  try {
    discoveredRoutes = await discoverRoutes(
      config.repository.path,
      projectConfig.projectType || projectConfig.language
    );
    
    if (discoveredRoutes.routes.length > 0) {
      logger.success(`✓ Discovered ${discoveredRoutes.routes.length} route(s) using ${discoveredRoutes.discoveryMethod}`);
      logger.keyValue('Framework', discoveredRoutes.framework);
      logger.newLine();
      
      // Show first 10 routes
      logger.subsection('Discovered Routes (sample)');
      const sampleRoutes = discoveredRoutes.routes.slice(0, 10);
      sampleRoutes.forEach(route => {
        logger.listItem(`${route.method.padEnd(6)} ${route.path}`);
      });
      
      if (discoveredRoutes.routes.length > 10) {
        logger.info(`... and ${discoveredRoutes.routes.length - 10} more routes`);
      }
    } else {
      logger.info('No routes discovered automatically');
      logger.info('You can provide an OpenAPI spec with --openapi flag');
    }
  } catch (error) {
    logger.warn('Route discovery failed, continuing without route information');
    logger.debug('Route discovery error:', error);
  }

  // Execute tests with the configuration
  await executeTests(config, diffAnalysis, projectConfig, discoveredRoutes);
}

/**
 * Handle the run command
 */
async function handleRunCommand(options: {
  acceptancePath: string;
  baseUrl: string;
  outputDir?: string;
  generatedDir?: string;
  proofDir?: string;
  debugDir?: string;
  yes?: boolean;
  verbose?: boolean;
  debug?: boolean;
}): Promise<void> {
  // Enable debug/verbose mode if requested
  if (options.debug) {
    logger.setDebugMode(true);
    logger.debug('Debug mode enabled');
  }

  logger.section('TraceQA');
  logger.info('Starting test execution...');
  logger.newLine();

  // Validate acceptance criteria file
  const acceptancePath = path.resolve(options.acceptancePath);
  try {
    await fs.access(acceptancePath);
  } catch (error) {
    throw new TraceQAError(
      `Acceptance criteria file not found: ${acceptancePath}`,
      ErrorCategory.CONFIGURATION
    );
  }

  // Validate base URL format
  try {
    new URL(options.baseUrl);
  } catch (error) {
    throw new TraceQAError(
      `Invalid base URL: ${options.baseUrl}. Base URL must be a valid HTTP/HTTPS URL (e.g., http://localhost:3000)`,
      ErrorCategory.CONFIGURATION
    );
  }

  // Set up directories with backward compatibility
  const generatedDir = options.generatedDir || 'traceqa-generated';
  const proofDir = options.proofDir || options.outputDir || 'traceqa-proof';
  const debugDir = options.debugDir || 'traceqa-debug';

  // Display configuration
  logger.subsection('Configuration');
  logger.keyValue('Acceptance Criteria', acceptancePath);
  logger.keyValue('Base URL', options.baseUrl);
  logger.keyValue('Generated Artifacts', generatedDir);
  logger.keyValue('Proof Reports', proofDir);
  logger.keyValue('Debug Output', debugDir);
  logger.newLine();

  // Show confirmation prompt unless --yes flag is provided
  if (!options.yes) {
    logger.subsection('Execution Plan');
    logger.info('TraceQA will:');
    logger.listItem('Parse acceptance criteria from the provided file');
    logger.listItem('Discover API routes automatically');
    logger.listItem('Generate QA task plan with AI assistance');
    logger.listItem('Create executable HTTP test suite');
    logger.listItem('Write all artifacts to output directory');
    logger.listItem('Generate comprehensive test reports');
    logger.newLine();

    const shouldContinue = await confirm({
      message: 'Do you want to proceed with test execution?',
      initialValue: true
    });

    if (!shouldContinue || shouldContinue === Symbol.for('clack.cancel')) {
      logger.warn('Test execution cancelled by user');
      process.exit(0);
    }
    logger.newLine();
  }

  // Get API key from environment
  const apiKey = process.env.IBM_WATSONX_API_KEY;
  if (!apiKey) {
    throw new TraceQAError(
      'IBM_WATSONX_API_KEY environment variable not set. Please set it or use: traceqa config --api-key YOUR_KEY',
      ErrorCategory.CONFIGURATION
    );
  }

  // Initialize components
  logger.info('Initializing test coordinator...');
  const buildSystem = new BuildSystem(process.cwd(), {});
  const agent = new TestAgent({ apiKey });
  const mcpManager = new MCPClientManager();

  const coordinator = new TestCoordinator(buildSystem, agent, mcpManager, {
    baseUrl: options.baseUrl
  });

  try {
    // Run tests
    await coordinator.runTestsWithNewArchitecture({
      acceptancePath,
      baseUrl: options.baseUrl,
      outputDir: proofDir,
      generatedDir,
      proofDir,
      debugDir
    });

    logger.newLine();
    logger.success('✓ TraceQA execution completed successfully');
    logger.info(`  Generated artifacts: ${path.resolve(generatedDir)}/`);
    logger.info(`  Proof reports: ${path.resolve(proofDir)}/`);
    logger.newLine();

  } catch (error) {
    logger.error('Test execution failed', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        logger.newLine();
        logger.info('💡 Tip: Make sure IBM_WATSONX_API_KEY environment variable is set');
        logger.info('   You can set it with: traceqa config --api-key YOUR_KEY');
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        logger.newLine();
        logger.info('💡 Tip: Make sure your application is running at the specified base URL');
        logger.info(`   Base URL: ${options.baseUrl}`);
      } else if (error.message.includes('acceptance')) {
        logger.newLine();
        logger.info('💡 Tip: Check that your acceptance criteria file exists and is properly formatted');
        logger.info(`   File: ${acceptancePath}`);
      }
    }
    
    throw error;
  }
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
async function executeTests(
  config: TestConfig,
  diffAnalysis: DiffAnalysis | null = null,
  projectConfig: any = {},
  discoveredRoutes: RouteDiscoveryResult | null = null
): Promise<void> {
  // Suppress unused variable warnings for now
  void diffAnalysis;
  void discoveredRoutes;
  
  logger.section('Test Execution');
  
  logger.info('Configuration loaded');
  logger.keyValue('Repository', config.repository.name);
  logger.keyValue('Path', config.repository.path);
  logger.keyValue('Test Type', config.testType);
  logger.keyValue('Description', config.description);
  
  if (config.acceptanceCriteria && config.acceptanceCriteria.length > 0) {
    logger.newLine();
    logger.subsection('Acceptance Criteria');
    config.acceptanceCriteria.forEach(criteria => {
      logger.listItem(criteria);
    });
  }

  logger.newLine();

  // Validate required parameters
  if (!config.acceptanceCriteria || config.acceptanceCriteria.length === 0) {
    throw new TraceQAError(
      'Acceptance criteria are required. Use --criteria flag to provide an acceptance criteria file.',
      ErrorCategory.CONFIGURATION
    );
  }

  if (!config.baseUrl) {
    throw new TraceQAError(
      'Base URL is required. Use --base-url flag to specify the application URL.',
      ErrorCategory.CONFIGURATION
    );
  }

  // Validate base URL format
  try {
    new URL(config.baseUrl);
  } catch (error) {
    throw new TraceQAError(
      `Invalid base URL: ${config.baseUrl}. Base URL must be a valid HTTP/HTTPS URL (e.g., http://localhost:3000)`,
      ErrorCategory.CONFIGURATION
    );
  }

  // Show confirmation prompt unless --yes flag is provided
  if (!config.autoApprove) {
    logger.newLine();
    logger.section('Execution Confirmation');
    logger.info('TraceQA will now:');
    logger.listItem('Generate QA task plan from acceptance criteria');
    logger.listItem('Create test artifacts and scripts');
    logger.listItem(`Execute tests against ${config.baseUrl}`);
    logger.listItem(`Generate reports in ${config.outputDir || 'traceqa-proof'}`);
    logger.newLine();

    const shouldContinue = await confirm({
      message: 'Do you want to proceed with test execution?',
      initialValue: true
    });

    if (!shouldContinue || shouldContinue === Symbol.for('clack.cancel')) {
      logger.warn('Test execution cancelled by user');
      process.exit(0);
    }
  }

  logger.newLine();
  logger.info('Initializing test coordinator...');

  // Get API key from environment
  const apiKey = process.env.IBM_WATSONX_API_KEY;
  if (!apiKey) {
    throw new TraceQAError(
      'IBM_WATSONX_API_KEY environment variable not set',
      ErrorCategory.CONFIGURATION
    );
  }

  // Initialize required components for TestCoordinator
  const buildSystem = new BuildSystem(config.repository.path, projectConfig);
  const agent = new TestAgent({ apiKey });
  const mcpManager = new MCPClientManager();

  // Create coordinator instance with required dependencies
  const coordinator = new TestCoordinator(buildSystem, agent, mcpManager, {
    baseUrl: config.baseUrl,
    healthUrl: projectConfig.healthUrl
  });

  try {
    // Prepare acceptance criteria content
    const acceptanceCriteriaContent = config.acceptanceCriteria.join('\n');
    
    // Create a temporary file for acceptance criteria if needed
    const tempAcceptancePath = path.join(config.repository.path, '.traceqa-temp-acceptance.md');
    await fs.writeFile(tempAcceptancePath, acceptanceCriteriaContent, 'utf-8');

    // Run tests
    logger.newLine();
    logger.section('Running Tests');
    
    // Set up directories with backward compatibility
    const proofDir = config.outputDir || 'traceqa-proof';
    const generatedDir = 'traceqa-generated';
    const debugDir = 'traceqa-debug';
    
    await coordinator.runTestsWithNewArchitecture({
      acceptancePath: tempAcceptancePath,
      baseUrl: config.baseUrl,
      outputDir: proofDir,
      generatedDir,
      proofDir,
      debugDir,
      projectConfig
    });

    // Clean up temporary file
    await fs.remove(tempAcceptancePath);

    logger.newLine();
    logger.success('✓ TraceQA execution completed successfully');
    logger.info(`  Generated artifacts: ${path.resolve(generatedDir)}/`);
    logger.info(`  Proof reports: ${path.resolve(proofDir)}/`);
    
  } catch (error) {
    logger.error('Test execution failed', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        logger.newLine();
        logger.info('💡 Tip: Make sure IBM_WATSONX_API_KEY environment variable is set');
        logger.info('   You can set it with: traceqa config --api-key YOUR_KEY');
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        logger.newLine();
        logger.info('💡 Tip: Make sure your application is running at the specified base URL');
        logger.info(`   Base URL: ${config.baseUrl}`);
      }
    }
    
    throw error;
  }
}

/**
 * Handle the config command
 */
async function handleConfigCommand(options: {
  show?: boolean;
  edit?: boolean;
  apiKey?: string;
  projectId?: string;
  url?: string;
  model?: string;
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

  // Update configuration if any options provided
  if (options.apiKey || options.projectId || options.url || options.model) {
    let config: any = {};
    if (await fs.pathExists(configPath)) {
      config = await fs.readJSON(configPath);
    }
    
    if (options.apiKey) {
      config.ibmWatsonxApiKey = options.apiKey;
      logger.success('API key saved');
    }
    
    if (options.projectId) {
      config.ibmWatsonxProjectId = options.projectId;
      logger.success('Project ID saved');
    }
    
    if (options.url) {
      config.ibmWatsonxUrl = options.url;
      logger.success('URL saved');
    }
    
    if (options.model) {
      config.ibmWatsonxModel = options.model;
      logger.success('Model saved');
    }
    
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJSON(configPath, config, { spaces: 2 });
    
    logger.newLine();
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
  logger.listItem('--api-key <key>: Set IBM watsonx API key');
  logger.listItem('--project-id <id>: Set IBM watsonx project ID');
  logger.listItem('--url <url>: Set IBM watsonx URL (optional)');
  logger.listItem('--model <model>: Set IBM watsonx model (optional)');
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
  logger.listItem('Set your IBM watsonx API key: traceqa config --api-key YOUR_KEY');
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
    logger.keyValue('API Key', config.ibmWatsonxApiKey ? '✓ Set' : '✗ Not set');
    logger.keyValue('Project ID', config.ibmWatsonxProjectId ? '✓ Set' : '✗ Not set');
    if (config.ibmWatsonxUrl) {
      logger.keyValue('URL', config.ibmWatsonxUrl);
    }
    if (config.ibmWatsonxModel) {
      logger.keyValue('Model', config.ibmWatsonxModel);
    }
  }

  logger.newLine();
  logger.subsection('Environment');
  
  const envVars = [
    'IBM_WATSONX_API_KEY',
    'DEBUG',
    'NODE_ENV'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    logger.keyValue(varName, value ? '✓ Set' : '✗ Not set');
  });
}

/**
 * Handle the demo command
 */
async function handleDemoCommand(options: {
  mock?: boolean;
  outputDir?: string;
}): Promise<void> {
  try {
    const demoRunner = new DemoRunner();
    await demoRunner.runDemo({
      mock: options.mock,
      outputDir: options.outputDir,
    });
  } catch (error) {
    logger.error('Demo failed', error);
    throw error;
  }
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
