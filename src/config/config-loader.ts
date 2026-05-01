/**
 * TraceQA Configuration Loader
 * Loads and merges configuration from traceqa.config.json and CLI flags
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/logger.js';

/**
 * TraceQA project configuration
 */
export interface TraceQAProjectConfig {
  // API Configuration
  baseUrl?: string;
  healthUrl?: string;
  openapi?: string;

  // Build Configuration
  language?: string;
  projectType?: string;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;

  // Build Flags
  autoInstall?: boolean;
  autoBuild?: boolean;
  autoStart?: boolean;

  // Test Configuration
  testType?: 'ui' | 'api' | 'both' | 'integration';
  outputDir?: string;
  timeout?: number;
  retries?: number;

  // IBM watsonx Configuration
  ibmWatsonxApiKey?: string;
  ibmWatsonxProjectId?: string;
  ibmWatsonxUrl?: string;
  ibmWatsonxModel?: string;
}

/**
 * CLI options that can override config
 */
export interface CLIOptions {
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
  outputDir?: string;
  [key: string]: any;
}

/**
 * Load configuration from traceqa.config.json
 */
export async function loadConfig(projectPath: string = process.cwd()): Promise<TraceQAProjectConfig> {
  const configPath = path.join(projectPath, 'traceqa.config.json');

  try {
    if (await fs.pathExists(configPath)) {
      logger.debug(`Loading config from: ${configPath}`);
      const config = await fs.readJSON(configPath);
      logger.success('Configuration loaded from traceqa.config.json');
      return config;
    } else {
      logger.debug('No traceqa.config.json found, using defaults');
      return {};
    }
  } catch (error) {
    logger.warn(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

/**
 * Merge configuration with CLI options (CLI takes precedence)
 */
export function mergeConfig(
  fileConfig: TraceQAProjectConfig,
  cliOptions: CLIOptions
): TraceQAProjectConfig {
  const merged: TraceQAProjectConfig = { ...fileConfig };

  // Override with CLI options if provided
  if (cliOptions.baseUrl !== undefined) merged.baseUrl = cliOptions.baseUrl;
  if (cliOptions.healthUrl !== undefined) merged.healthUrl = cliOptions.healthUrl;
  if (cliOptions.installCommand !== undefined) merged.installCommand = cliOptions.installCommand;
  if (cliOptions.buildCommand !== undefined) merged.buildCommand = cliOptions.buildCommand;
  if (cliOptions.startCommand !== undefined) merged.startCommand = cliOptions.startCommand;
  if (cliOptions.openapi !== undefined) merged.openapi = cliOptions.openapi;
  if (cliOptions.language !== undefined) merged.language = cliOptions.language;
  if (cliOptions.projectType !== undefined) merged.projectType = cliOptions.projectType;
  if (cliOptions.outputDir !== undefined) merged.outputDir = cliOptions.outputDir;

  // Handle boolean flags (--no-install, --no-build, --no-start)
  if (cliOptions.install === false) merged.autoInstall = false;
  if (cliOptions.build === false) merged.autoBuild = false;
  if (cliOptions.start === false) merged.autoStart = false;

  logger.debug('Merged configuration:', merged);

  return merged;
}

/**
 * Load and merge configuration
 */
export async function loadAndMergeConfig(
  projectPath: string,
  cliOptions: CLIOptions
): Promise<TraceQAProjectConfig> {
  const fileConfig = await loadConfig(projectPath);
  return mergeConfig(fileConfig, cliOptions);
}

/**
 * Validate configuration
 */
export function validateConfig(config: TraceQAProjectConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // If baseUrl is provided, validate it's a valid URL
  if (config.baseUrl) {
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push(`Invalid baseUrl: ${config.baseUrl}`);
    }
  }

  // If healthUrl is provided, validate it's a valid URL
  if (config.healthUrl) {
    try {
      new URL(config.healthUrl);
    } catch {
      errors.push(`Invalid healthUrl: ${config.healthUrl}`);
    }
  }

  // If openapi is provided, check if file exists
  if (config.openapi && !fs.existsSync(config.openapi)) {
    errors.push(`OpenAPI spec file not found: ${config.openapi}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Made with Bob