/**
 * Build System
 * Intelligent build system with auto-detection and process management
 */

import path from 'path';
import { logger } from '../utils/logger.js';
import { getProjectRoot } from '../utils/file-system.js';
import {
  detectProject,
  getBuildCommand,
  getInstallCommand,
  getDefaultPort,
  detectPortFromEnv,
  type ProjectDetectionResult,
  type PackageManager,
  ProjectType,
} from './project-detector.js';
import {
  processManager,
  type ProcessInfo,
  type ServerReadinessOptions,
} from './process-manager.js';
import { BuildInfo } from '../types/index.js';

/**
 * Build mode
 */
export enum BuildMode {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  PREVIEW = 'preview',
}

/**
 * Build options
 */
export interface BuildOptions {
  mode?: BuildMode;
  port?: number;
  install?: boolean;
  clean?: boolean;
  env?: Record<string, string>;
  timeout?: number;
  skipPortCheck?: boolean;
}

/**
 * Build result
 */
export interface BuildResult {
  success: boolean;
  buildInfo: BuildInfo;
  serverUrl?: string;
  port?: number;
  processId?: string;
  duration: number;
  output?: string;
  error?: string;
}

/**
 * Build system class
 */
export class BuildSystem {
  private projectDetection: ProjectDetectionResult | null = null;
  private projectPath: string;
  private currentProcessId: string | null = null;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
  }

  /**
   * Initialize build system by detecting project
   */
  async initialize(): Promise<boolean> {
    try {
      logger.info('Initializing build system...');

      // Find project root
      const root = await getProjectRoot(this.projectPath);
      if (!root) {
        logger.error('Could not find project root (no package.json found)');
        return false;
      }

      this.projectPath = root;

      // Detect project configuration
      this.projectDetection = await detectProject(this.projectPath);
      if (!this.projectDetection) {
        logger.error('Failed to detect project configuration');
        return false;
      }

      logger.success(
        `Detected ${this.projectDetection.framework.name} project`,
        `Package manager: ${this.projectDetection.packageManager}`
      );

      return true;
    } catch (error) {
      logger.error('Failed to initialize build system', error);
      return false;
    }
  }

  /**
   * Install dependencies
   */
  async installDependencies(): Promise<boolean> {
    if (!this.projectDetection) {
      logger.error('Project not initialized');
      return false;
    }

    try {
      const installCmd = getInstallCommand(this.projectDetection.packageManager);
      logger.info(`Installing dependencies: ${installCmd}`);

      const [command, ...args] = installCmd.split(' ');
      const processId = 'install';

      await processManager.startProcess(processId, command, args, {
        cwd: this.projectPath,
      });

      // Stream output
      processManager.streamProcessOutput(
        processId,
        (data) => logger.debug('Install stdout', data),
        (data) => logger.debug('Install stderr', data)
      );

      // Wait for completion
      const output = await processManager.getProcessOutput(processId);
      
      if (output?.exitCode === 0) {
        logger.success('Dependencies installed successfully');
        return true;
      } else {
        logger.error('Failed to install dependencies', output?.stderr);
        return false;
      }
    } catch (error) {
      logger.error('Failed to install dependencies', error);
      return false;
    }
  }

  /**
   * Build project for production
   */
  async build(options: BuildOptions = {}): Promise<BuildResult> {
    const startTime = Date.now();

    if (!this.projectDetection) {
      return this.createErrorResult('Project not initialized', startTime);
    }

    try {
      // Install dependencies if requested
      if (options.install) {
        const installed = await this.installDependencies();
        if (!installed) {
          return this.createErrorResult('Failed to install dependencies', startTime);
        }
      }

      // Get build command
      const buildScript = this.projectDetection.buildCommands.build;
      if (!buildScript) {
        return this.createErrorResult('No build script found in package.json', startTime);
      }

      const buildCmd = getBuildCommand(
        this.projectDetection.packageManager,
        buildScript
      );

      logger.info(`Building project: ${buildCmd}`);

      const [command, ...args] = buildCmd.split(' ');
      const processId = 'build';

      await processManager.startProcess(processId, command, args, {
        cwd: this.projectPath,
        env: options.env,
      });

      // Collect output
      let stdout = '';
      let stderr = '';

      processManager.streamProcessOutput(
        processId,
        (data) => {
          stdout += data;
          logger.debug('Build stdout', data);
        },
        (data) => {
          stderr += data;
          logger.debug('Build stderr', data);
        }
      );

      // Wait for completion with timeout
      const timeout = options.timeout || 300000; // 5 minutes default
      const output = await Promise.race([
        processManager.getProcessOutput(processId),
        this.createTimeout(timeout),
      ]);

      const duration = Date.now() - startTime;

      if (!output) {
        return this.createErrorResult('Build timeout', startTime);
      }

      if (output.exitCode === 0) {
        logger.success(`Build completed in ${logger.formatDuration(duration)}`);

        return {
          success: true,
          buildInfo: this.createBuildInfo(true, duration, stdout),
          duration,
          output: stdout,
        };
      } else {
        logger.error('Build failed', stderr || output.stderr);

        return {
          success: false,
          buildInfo: this.createBuildInfo(false, duration, stdout, stderr),
          duration,
          output: stdout,
          error: stderr || output.stderr || 'Build failed',
        };
      }
    } catch (error) {
      logger.error('Build error', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * Start development server
   */
  async startDevServer(options: BuildOptions = {}): Promise<BuildResult> {
    const startTime = Date.now();

    if (!this.projectDetection) {
      return this.createErrorResult('Project not initialized', startTime);
    }

    try {
      // Install dependencies if requested
      if (options.install) {
        const installed = await this.installDependencies();
        if (!installed) {
          return this.createErrorResult('Failed to install dependencies', startTime);
        }
      }

      // Get dev command
      const devScript = this.projectDetection.buildCommands.dev;
      if (!devScript) {
        return this.createErrorResult('No dev script found in package.json', startTime);
      }

      // Determine port
      const port = options.port || 
        await detectPortFromEnv(this.projectPath) ||
        getDefaultPort(this.projectDetection.framework.type);

      // Check if port is available
      if (!options.skipPortCheck) {
        const isAvailable = await processManager.isPortAvailable(port);
        if (!isAvailable) {
          logger.warn(`Port ${port} is already in use, attempting to kill process...`);
          try {
            await processManager.killPort(port);
            // Wait a bit for port to be released
            await this.sleep(1000);
          } catch (error) {
            logger.error(`Failed to free port ${port}`, error);
            
            // Try to find alternative port
            const altPort = await processManager.findAvailablePort(port + 1);
            if (altPort) {
              logger.info(`Using alternative port: ${altPort}`);
              return this.startDevServer({ ...options, port: altPort, skipPortCheck: true });
            }
            
            return this.createErrorResult(`Port ${port} is in use and could not be freed`, startTime);
          }
        }
      }

      const devCmd = getBuildCommand(
        this.projectDetection.packageManager,
        devScript
      );

      logger.info(`Starting dev server: ${devCmd}`);

      const [command, ...args] = devCmd.split(' ');
      const processId = 'dev-server';
      this.currentProcessId = processId;

      // Set port in environment
      const env = {
        PORT: String(port),
        VITE_PORT: String(port),
        ...options.env,
      };

      await processManager.startProcess(processId, command, args, {
        cwd: this.projectPath,
        env,
      });

      // Collect output to detect server URL
      let stdout = '';
      let stderr = '';
      let serverUrl: string | null = null;

      processManager.streamProcessOutput(
        processId,
        (data) => {
          stdout += data;
          
          // Try to parse server URL from output
          if (!serverUrl) {
            serverUrl = processManager.parseServerUrl(data);
            if (serverUrl) {
              logger.success(`Dev server URL detected: ${serverUrl}`);
            }
          }
          
          // Log important messages
          if (data.includes('ready') || data.includes('compiled') || data.includes('listening')) {
            logger.info(data.trim());
          }
        },
        (data) => {
          stderr += data;
          logger.debug('Dev server stderr', data);
        }
      );

      // Wait for server to be ready
      logger.info(`Waiting for dev server on port ${port}...`);
      
      const serverReady = await processManager.waitForServer({
        port,
        timeout: options.timeout || 60000,
        retryInterval: 1000,
      });

      const duration = Date.now() - startTime;

      if (!serverReady) {
        await this.stopDevServer();
        return this.createErrorResult('Dev server failed to start', startTime);
      }

      // Construct server URL if not detected from output
      if (!serverUrl) {
        serverUrl = `http://localhost:${port}`;
      }

      logger.success(
        `Dev server started in ${logger.formatDuration(duration)}`,
        serverUrl
      );

      return {
        success: true,
        buildInfo: this.createBuildInfo(true, duration, stdout),
        serverUrl,
        port,
        processId,
        duration,
        output: stdout,
      };
    } catch (error) {
      logger.error('Failed to start dev server', error);
      await this.stopDevServer();
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * Stop development server
   */
  async stopDevServer(): Promise<void> {
    if (this.currentProcessId) {
      logger.info('Stopping dev server...');
      await processManager.stopProcess(this.currentProcessId);
      this.currentProcessId = null;
      logger.success('Dev server stopped');
    }
  }

  /**
   * Get project detection result
   */
  getProjectDetection(): ProjectDetectionResult | null {
    return this.projectDetection;
  }

  /**
   * Get project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Check if dev server is running
   */
  isDevServerRunning(): boolean {
    return this.currentProcessId !== null && 
      processManager.isProcessRunning(this.currentProcessId);
  }

  /**
   * Create build info object
   */
  private createBuildInfo(
    success: boolean,
    duration: number,
    output?: string,
    error?: string
  ): BuildInfo {
    const detection = this.projectDetection!;

    return {
      framework: detection.framework.name,
      language: this.detectLanguage(),
      buildCommand: detection.buildCommands.build,
      testCommand: detection.buildCommands.test,
      startCommand: detection.buildCommands.dev || detection.buildCommands.start,
      success,
      duration,
      output: output || error,
    };
  }

  /**
   * Detect primary language
   */
  private detectLanguage(): string {
    if (!this.projectDetection) return 'JavaScript';

    const deps = {
      ...this.projectDetection.packageJson.dependencies,
      ...this.projectDetection.packageJson.devDependencies,
    };

    if (deps['typescript'] || this.projectDetection.structure.configFiles.includes('tsconfig.json')) {
      return 'TypeScript';
    }

    return 'JavaScript';
  }

  /**
   * Create error result
   */
  private createErrorResult(error: string, startTime: number): BuildResult {
    return {
      success: false,
      buildInfo: {
        framework: this.projectDetection?.framework.name || 'Unknown',
        language: this.detectLanguage(),
        success: false,
        duration: Date.now() - startTime,
        output: error,
      },
      duration: Date.now() - startTime,
      error,
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stopDevServer();
  }
}

/**
 * Create a new build system instance
 */
export function createBuildSystem(projectPath?: string): BuildSystem {
  return new BuildSystem(projectPath);
}

// Made with Bob