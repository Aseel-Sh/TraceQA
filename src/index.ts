/**
 * TraceQA - Main Application Entry Point
 * Intelligent CLI tool for developer-driven QA testing
 */

import { runCLI } from './cli/index.js';
import { logger } from './utils/logger.js';
import { TraceQAError, ErrorCategory } from './types/index.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  // Load environment variables from .env file
  dotenv.config();

  // Check for API key in environment or config
  const apiKey = process.env.IBM_WATSONX_API_KEY;
  
  if (!apiKey) {
    logger.debug('No IBM_WATSONX_API_KEY found in environment');
    
    // Check config file
    const configPath = getConfigPath();
    if (await fs.pathExists(configPath)) {
      try {
        const config = await fs.readJSON(configPath);
        if (config.ibmWatsonxApiKey) {
          process.env.IBM_WATSONX_API_KEY = config.ibmWatsonxApiKey;
          logger.debug('Loaded API key from config file');
        }
      } catch (error) {
        logger.debug('Error reading config file', error);
      }
    }
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
 * Main application entry point
 */
export async function main(): Promise<void> {
  try {
    // Initialize application
    await initialize();

    // Run CLI
    await runCLI();
  } catch (error) {
    // Global error handler
    handleGlobalError(error);
    process.exit(1);
  }
}

/**
 * Handle global errors
 */
function handleGlobalError(error: unknown): void {
  logger.newLine();

  if (error instanceof TraceQAError) {
    logger.error(error.message);
    logger.info(`Error Category: ${error.category}`);
    
    if (error.details) {
      logger.debug('Error details', error.details);
    }

    // Provide helpful suggestions based on error category
    provideSuggestions(error.category);
  } else if (error instanceof Error) {
    logger.error('An unexpected error occurred', error);
    
    if (process.env.DEBUG) {
      logger.debug('Stack trace', error.stack);
    }
  } else {
    logger.error('An unknown error occurred', String(error));
  }

  logger.newLine();
}

/**
 * Provide helpful suggestions based on error category
 */
function provideSuggestions(category: ErrorCategory): void {
  logger.newLine();
  logger.subsection('Suggestions');

  switch (category) {
    case ErrorCategory.CONFIGURATION:
      logger.listItem('Check your configuration file: traceqa config --show');
      logger.listItem('Initialize TraceQA: traceqa init');
      logger.listItem('Set API key: traceqa config --api-key YOUR_KEY');
      break;

    case ErrorCategory.REPOSITORY:
      logger.listItem('Ensure the path points to a valid git repository');
      logger.listItem('Check if .git directory exists');
      logger.listItem('Verify you have read permissions');
      break;

    case ErrorCategory.BUILD:
      logger.listItem('Check if all dependencies are installed');
      logger.listItem('Verify build scripts in package.json');
      logger.listItem('Try running the build manually');
      break;

    case ErrorCategory.TEST_EXECUTION:
      logger.listItem('Check test configuration');
      logger.listItem('Verify test environment is set up correctly');
      logger.listItem('Review test logs for more details');
      break;

    case ErrorCategory.AGENT:
      logger.listItem('Verify IBM watsonx API key is set');
      logger.listItem('Check API key permissions');
      logger.listItem('Ensure you have sufficient API credits');
      break;

    case ErrorCategory.MCP:
      logger.listItem('Check MCP server configuration');
      logger.listItem('Verify MCP servers are running');
      logger.listItem('Review MCP server logs');
      break;

    case ErrorCategory.NETWORK:
      logger.listItem('Check your internet connection');
      logger.listItem('Verify firewall settings');
      logger.listItem('Check if API endpoints are accessible');
      break;

    case ErrorCategory.UNKNOWN:
    default:
      logger.listItem('Enable debug mode: traceqa test --debug');
      logger.listItem('Check the logs for more information');
      logger.listItem('Report the issue on GitHub');
      break;
  }

  logger.newLine();
}

/**
 * Handle process signals for graceful shutdown
 */
function setupSignalHandlers(): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach(signal => {
    process.on(signal, () => {
      logger.newLine();
      logger.warn('Received shutdown signal, cleaning up...');
      
      // Perform cleanup here
      // TODO: Cancel ongoing operations, close connections, etc.
      
      logger.info('Shutdown complete');
      process.exit(0);
    });
  });
}

/**
 * Handle uncaught exceptions
 */
function setupExceptionHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    logger.debug('Stack trace', error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection', reason);
    process.exit(1);
  });
}

// Setup handlers
setupSignalHandlers();
setupExceptionHandlers();

// Export main function and utilities
export { runCLI } from './cli/index.js';
export { logger } from './utils/logger.js';
export * from './types/index.js';
export { ReportGenerator, generateReport } from './reporting/index.js';
export * from './config/index.js';

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    handleGlobalError(error);
    process.exit(1);
  });
}

// Made with Bob
