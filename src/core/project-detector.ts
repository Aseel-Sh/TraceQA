/**
 * Project Detector
 * Detects project type, framework, package manager, and build configuration
 */

import path from 'path';
import {
  fileExists,
  readPackageJson,
  PackageJson,
  directoryExists,
} from '../utils/file-system.js';
import { logger } from '../utils/logger.js';

/**
 * Supported project types
 */
export enum ProjectType {
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  NEXT = 'next',
  NUXT = 'nuxt',
  SVELTE = 'svelte',
  NODE_API = 'node-api',
  EXPRESS = 'express',
  FASTIFY = 'fastify',
  NEST = 'nest',
  UNKNOWN = 'unknown',
}

/**
 * Supported package managers
 */
export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
}

/**
 * Framework detection result
 */
export interface FrameworkInfo {
  type: ProjectType;
  version?: string;
  name: string;
  description: string;
}

/**
 * Build commands configuration
 */
export interface BuildCommands {
  install?: string;
  build?: string;
  dev?: string;
  start?: string;
  test?: string;
  preview?: string;
}

/**
 * Project structure information
 */
export interface ProjectStructure {
  hasSourceDir: boolean;
  sourceDir?: string;
  hasPublicDir: boolean;
  publicDir?: string;
  hasTestDir: boolean;
  testDir?: string;
  configFiles: string[];
}

/**
 * Complete project detection result
 */
export interface ProjectDetectionResult {
  projectRoot: string;
  framework: FrameworkInfo;
  packageManager: PackageManager;
  buildCommands: BuildCommands;
  structure: ProjectStructure;
  packageJson: PackageJson;
}

/**
 * Detect project type from package.json dependencies
 */
export async function detectProjectType(projectPath: string): Promise<ProjectType> {
  const packageJson = await readPackageJson(projectPath);
  
  if (!packageJson) {
    return ProjectType.UNKNOWN;
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check for specific frameworks (order matters - most specific first)
  if (allDeps['next']) return ProjectType.NEXT;
  if (allDeps['nuxt']) return ProjectType.NUXT;
  if (allDeps['@angular/core']) return ProjectType.ANGULAR;
  if (allDeps['svelte']) return ProjectType.SVELTE;
  if (allDeps['vue']) return ProjectType.VUE;
  if (allDeps['react']) return ProjectType.REACT;
  if (allDeps['@nestjs/core']) return ProjectType.NEST;
  if (allDeps['fastify']) return ProjectType.FASTIFY;
  if (allDeps['express']) return ProjectType.EXPRESS;

  // Check if it's a Node.js API project
  const hasApiIndicators = 
    allDeps['axios'] || 
    allDeps['node-fetch'] ||
    packageJson.main ||
    packageJson.type === 'module';

  if (hasApiIndicators) {
    return ProjectType.NODE_API;
  }

  return ProjectType.UNKNOWN;
}

/**
 * Detect framework with detailed information
 */
export async function detectFramework(projectPath: string): Promise<FrameworkInfo> {
  const projectType = await detectProjectType(projectPath);
  const packageJson = await readPackageJson(projectPath);
  
  const allDeps = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  };

  const frameworkMap: Record<ProjectType, FrameworkInfo> = {
    [ProjectType.REACT]: {
      type: ProjectType.REACT,
      version: allDeps['react'],
      name: 'React',
      description: 'React application',
    },
    [ProjectType.VUE]: {
      type: ProjectType.VUE,
      version: allDeps['vue'],
      name: 'Vue.js',
      description: 'Vue.js application',
    },
    [ProjectType.ANGULAR]: {
      type: ProjectType.ANGULAR,
      version: allDeps['@angular/core'],
      name: 'Angular',
      description: 'Angular application',
    },
    [ProjectType.NEXT]: {
      type: ProjectType.NEXT,
      version: allDeps['next'],
      name: 'Next.js',
      description: 'Next.js application',
    },
    [ProjectType.NUXT]: {
      type: ProjectType.NUXT,
      version: allDeps['nuxt'],
      name: 'Nuxt.js',
      description: 'Nuxt.js application',
    },
    [ProjectType.SVELTE]: {
      type: ProjectType.SVELTE,
      version: allDeps['svelte'],
      name: 'Svelte',
      description: 'Svelte application',
    },
    [ProjectType.NEST]: {
      type: ProjectType.NEST,
      version: allDeps['@nestjs/core'],
      name: 'NestJS',
      description: 'NestJS API',
    },
    [ProjectType.FASTIFY]: {
      type: ProjectType.FASTIFY,
      version: allDeps['fastify'],
      name: 'Fastify',
      description: 'Fastify API',
    },
    [ProjectType.EXPRESS]: {
      type: ProjectType.EXPRESS,
      version: allDeps['express'],
      name: 'Express',
      description: 'Express API',
    },
    [ProjectType.NODE_API]: {
      type: ProjectType.NODE_API,
      name: 'Node.js',
      description: 'Node.js API',
    },
    [ProjectType.UNKNOWN]: {
      type: ProjectType.UNKNOWN,
      name: 'Unknown',
      description: 'Unknown project type',
    },
  };

  return frameworkMap[projectType];
}

/**
 * Detect package manager from lock files
 */
export async function detectPackageManager(projectPath: string): Promise<PackageManager> {
  const lockFiles = {
    'bun.lockb': PackageManager.BUN,
    'pnpm-lock.yaml': PackageManager.PNPM,
    'yarn.lock': PackageManager.YARN,
    'package-lock.json': PackageManager.NPM,
  };

  for (const [lockFile, manager] of Object.entries(lockFiles)) {
    const lockPath = path.join(projectPath, lockFile);
    if (await fileExists(lockPath)) {
      return manager;
    }
  }

  // Default to npm if no lock file found
  return PackageManager.NPM;
}

/**
 * Detect build commands from package.json scripts
 */
export async function detectBuildCommands(projectPath: string): Promise<BuildCommands> {
  const packageJson = await readPackageJson(projectPath);
  
  if (!packageJson?.scripts) {
    return {};
  }

  const scripts = packageJson.scripts;
  const commands: BuildCommands = {};

  // Common script name patterns
  const patterns = {
    install: ['install', 'setup'],
    build: ['build', 'compile'],
    dev: ['dev', 'develop', 'start:dev', 'serve'],
    start: ['start', 'start:prod'],
    test: ['test', 'test:unit', 'test:e2e'],
    preview: ['preview', 'serve:build'],
  };

  for (const [command, scriptPatterns] of Object.entries(patterns)) {
    for (const pattern of scriptPatterns) {
      if (scripts[pattern]) {
        commands[command as keyof BuildCommands] = pattern;
        break;
      }
    }
  }

  return commands;
}

/**
 * Detect project structure
 */
export async function detectProjectStructure(projectPath: string): Promise<ProjectStructure> {
  const structure: ProjectStructure = {
    hasSourceDir: false,
    hasPublicDir: false,
    hasTestDir: false,
    configFiles: [],
  };

  // Check for source directories
  const sourceDirs = ['src', 'source', 'app', 'lib'];
  for (const dir of sourceDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await directoryExists(dirPath)) {
      structure.hasSourceDir = true;
      structure.sourceDir = dir;
      break;
    }
  }

  // Check for public directories
  const publicDirs = ['public', 'static', 'assets'];
  for (const dir of publicDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await directoryExists(dirPath)) {
      structure.hasPublicDir = true;
      structure.publicDir = dir;
      break;
    }
  }

  // Check for test directories
  const testDirs = ['test', 'tests', '__tests__', 'spec'];
  for (const dir of testDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await directoryExists(dirPath)) {
      structure.hasTestDir = true;
      structure.testDir = dir;
      break;
    }
  }

  // Check for config files
  const configFiles = [
    'vite.config.ts',
    'vite.config.js',
    'next.config.js',
    'next.config.mjs',
    'nuxt.config.ts',
    'nuxt.config.js',
    'vue.config.js',
    'angular.json',
    'svelte.config.js',
    'webpack.config.js',
    'rollup.config.js',
    'tsconfig.json',
    'jsconfig.json',
    '.env',
    '.env.local',
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(projectPath, configFile);
    if (await fileExists(configPath)) {
      structure.configFiles.push(configFile);
    }
  }

  return structure;
}

/**
 * Detect default port for framework
 */
export function getDefaultPort(framework: ProjectType): number {
  const portMap: Record<ProjectType, number> = {
    [ProjectType.REACT]: 3000,
    [ProjectType.VUE]: 5173, // Vite default
    [ProjectType.ANGULAR]: 4200,
    [ProjectType.NEXT]: 3000,
    [ProjectType.NUXT]: 3000,
    [ProjectType.SVELTE]: 5173, // Vite default
    [ProjectType.NODE_API]: 3000,
    [ProjectType.EXPRESS]: 3000,
    [ProjectType.FASTIFY]: 3000,
    [ProjectType.NEST]: 3000,
    [ProjectType.UNKNOWN]: 3000,
  };

  return portMap[framework];
}

/**
 * Detect environment file and read port configuration
 */
export async function detectPortFromEnv(projectPath: string): Promise<number | null> {
  const envFiles = ['.env.local', '.env.development', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(projectPath, envFile);
    if (await fileExists(envPath)) {
      try {
        const fs = await import('fs');
        const content = await fs.promises.readFile(envPath, 'utf-8');
        
        // Look for PORT or VITE_PORT or similar
        const portMatch = content.match(/(?:VITE_)?PORT\s*=\s*(\d+)/);
        if (portMatch) {
          return parseInt(portMatch[1], 10);
        }
      } catch (error) {
        // Continue to next file
      }
    }
  }
  
  return null;
}

/**
 * Complete project detection
 */
export async function detectProject(projectPath: string): Promise<ProjectDetectionResult | null> {
  try {
    logger.info(`Detecting project configuration at: ${projectPath}`);

    const packageJson = await readPackageJson(projectPath);
    if (!packageJson) {
      logger.error(`No package.json found at: ${projectPath}`);
      return null;
    }

    const [framework, packageManager, buildCommands, structure] = await Promise.all([
      detectFramework(projectPath),
      detectPackageManager(projectPath),
      detectBuildCommands(projectPath),
      detectProjectStructure(projectPath),
    ]);

    const result: ProjectDetectionResult = {
      projectRoot: projectPath,
      framework,
      packageManager,
      buildCommands,
      structure,
      packageJson,
    };

    logger.success(
      `Project detected: ${framework.name} with ${packageManager}`,
      `Dev: ${buildCommands.dev || 'none'}, Build: ${buildCommands.build || 'none'}`
    );

    return result;
  } catch (error) {
    logger.error(`Failed to detect project at: ${projectPath}`, error);
    return null;
  }
}

/**
 * Get build command for package manager
 */
export function getBuildCommand(
  packageManager: PackageManager,
  script: string
): string {
  const commands: Record<PackageManager, string> = {
    [PackageManager.NPM]: `npm run ${script}`,
    [PackageManager.YARN]: `yarn ${script}`,
    [PackageManager.PNPM]: `pnpm ${script}`,
    [PackageManager.BUN]: `bun run ${script}`,
  };

  return commands[packageManager];
}

/**
 * Get install command for package manager
 */
export function getInstallCommand(packageManager: PackageManager): string {
  const commands: Record<PackageManager, string> = {
    [PackageManager.NPM]: 'npm install',
    [PackageManager.YARN]: 'yarn install',
    [PackageManager.PNPM]: 'pnpm install',
    [PackageManager.BUN]: 'bun install',
  };

  return commands[packageManager];
}

// Made with Bob