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
import { ReportGenerator } from '../reporting/index.js';
import { AmbiguityDetector, GitAnalyzer } from '../analysis/index.js';
import { DemoRunner } from '../demo/demo-runner.js';
import { loadAndMergeConfig } from '../config/config-loader.js';
import { parseAcceptanceCriteriaFromFile } from '../parsers/acceptance-parser.js';
import { discoverRoutes, RouteDiscoveryResult } from '../discovery/route-discovery.js';

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

    // Parse acceptance criteria from file if provided
    let acceptanceCriteria: string[] | undefined;
    if (options.criteria) {
      logger.newLine();
      logger.section('Parsing Acceptance Criteria');
      
      const criteriaPath = path.resolve(options.criteria);
      if (!await fs.pathExists(criteriaPath)) {
        throw new TraceQAError(
          `Acceptance criteria file does not exist: ${criteriaPath}`,
          ErrorCategory.CONFIGURATION
        );
      }
      
      const parsed = await parseAcceptanceCriteriaFromFile(criteriaPath);
      acceptanceCriteria = parsed.criteria.map(c => `${c.id}: ${c.description}`);
      
      logger.success(`✓ Parsed ${parsed.criteria.length} acceptance criteria from ${path.basename(criteriaPath)}`);
      logger.newLine();
      
      parsed.criteria.forEach(criterion => {
        logger.listItem(`${criterion.id}: ${criterion.description}`);
      });
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
      description: options.description,
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
  // TODO: Pass discoveredRoutes to test agent for enhanced test generation
  void discoveredRoutes; // Suppress unused variable warning
  
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

  // Initialize components
  logger.info('Initializing test components...');
  
  // Get API key from environment
  const apiKey = process.env.IBM_WATSONX_API_KEY;
  if (!apiKey) {
    throw new TraceQAError(
      'IBM_WATSONX_API_KEY environment variable not set',
      ErrorCategory.CONFIGURATION
    );
  }
  
  const buildSystem = new BuildSystem(config.repository.path, projectConfig);
  const agent = new TestAgent({ apiKey });
  const mcpManager = new MCPClientManager();
  
  // Determine autoInstall, autoBuild, autoStart from config
  const autoInstall = projectConfig.autoInstall !== false;
  const autoBuild = projectConfig.autoBuild !== false;
  const autoStart = projectConfig.autoStart !== false && (config.testType === TestType.WEB_UI || config.testType === TestType.BOTH);
  
  const coordinator = new TestCoordinator(buildSystem, agent, mcpManager, {
    buildSystem: {
      autoInstall,
      autoBuild,
      autoStart
    },
    baseUrl: config.baseUrl,
    healthUrl: projectConfig.healthUrl
  });

  try {
    // Run tests with diff analysis
    const { results, report } = await coordinator.runTests(config, diffAnalysis);
    
    // Display results
    logger.newLine();
    logger.section('Test Results');
    
    logger.keyValue('Total Tests', results.summary.total.toString());
    logger.keyValue('Passed', results.summary.passed.toString());
    logger.keyValue('Failed', results.summary.failed.toString());
    logger.keyValue('Skipped', results.summary.skipped.toString());
    
    if (results.summary.passed === results.summary.total) {
      logger.success('All tests passed! ✓');
    } else if (results.summary.failed > 0) {
      logger.error(`${results.summary.failed} test(s) failed`);
    } else if (results.summary.skipped > 0) {
      logger.warn(`${results.summary.skipped} test(s) were skipped`);
    }
    
    // Display individual test results
    logger.newLine();
    logger.subsection('Test Details');
    
    for (const result of results.results) {
      const status = result.passed ? '✓' : '✗';
      
      logger.info(`${status} ${result.testCaseName} (${result.duration}ms)`);
      
      if (result.message) {
        logger.debug(`  ${result.message}`);
      }
      
      if (result.error) {
        logger.error(`  Error: ${result.error}`);
      }
    }
    
    // Display report
    if (report) {
      logger.newLine();
      logger.section('Analysis');
      logger.info(report);
    }
    
    // Generate comprehensive reports
    logger.newLine();
    logger.section('Generating Reports');
    
    try {
      const reportGenerator = new ReportGenerator();
      const acceptanceCriteria = config.acceptanceCriteria || [];
      const outputDir = config.outputDir || 'traceqa-proof';
      
      await reportGenerator.generateReport(results, acceptanceCriteria, outputDir);
      
      logger.newLine();
      logger.success('✓ Reports generated successfully');
      logger.info(`  Location: ${path.resolve(outputDir)}/`);
      
    } catch (reportError) {
      logger.error('Failed to generate reports', reportError);
      // Don't fail the entire test run if report generation fails
    }
    
    // Exit with appropriate code
    if (results.summary.failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Test execution failed', error);
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
