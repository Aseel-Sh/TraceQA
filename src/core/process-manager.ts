/**
 * Process Manager
 * Manages child processes for build and dev servers
 */

import { execa, type ExecaChildProcess } from 'execa';
import { logger } from '../utils/logger.js';
import net from 'net';

/**
 * Process information
 */
export interface ProcessInfo {
  pid?: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: number;
  status: 'running' | 'stopped' | 'failed';
}

/**
 * Process output
 */
export interface ProcessOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
}

/**
 * Server readiness check options
 */
export interface ServerReadinessOptions {
  port: number;
  host?: string;
  timeout?: number;
  retryInterval?: number;
  urlPattern?: RegExp;
}

/**
 * Process manager class
 */
export class ProcessManager {
  private processes: Map<string, ExecaChildProcess> = new Map();
  private processInfo: Map<string, ProcessInfo> = new Map();

  /**
   * Start a process
   */
  async startProcess(
    id: string,
    command: string,
    args: string[] = [],
    options: {
      cwd?: string;
      env?: Record<string, string>;
      shell?: boolean;
      detached?: boolean;
    } = {}
  ): Promise<ProcessInfo> {
    try {
      // Stop existing process with same ID
      if (this.processes.has(id)) {
        await this.stopProcess(id);
      }

      logger.info(`Starting process: ${command} ${args.join(' ')}`);

      const process = execa(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: options.shell ?? true,
        detached: options.detached ?? false,
        all: true,
        reject: false,
      });

      const info: ProcessInfo = {
        pid: process.pid,
        command,
        args,
        cwd: options.cwd || process.cwd(),
        startTime: Date.now(),
        status: 'running',
      };

      this.processes.set(id, process);
      this.processInfo.set(id, info);

      // Handle process events
      process.on('exit', (code, signal) => {
        const processInfo = this.processInfo.get(id);
        if (processInfo) {
          processInfo.status = code === 0 ? 'stopped' : 'failed';
        }
        logger.debug(`Process ${id} exited`, { code, signal });
      });

      process.on('error', (error) => {
        const processInfo = this.processInfo.get(id);
        if (processInfo) {
          processInfo.status = 'failed';
        }
        logger.error(`Process ${id} error`, error);
      });

      return info;
    } catch (error) {
      logger.error(`Failed to start process ${id}`, error);
      throw error;
    }
  }

  /**
   * Stop a process gracefully
   */
  async stopProcess(id: string, timeout: number = 5000): Promise<void> {
    const process = this.processes.get(id);
    const info = this.processInfo.get(id);

    if (!process || !info) {
      return;
    }

    try {
      logger.info(`Stopping process: ${id}`);

      // Try graceful shutdown first
      process.kill('SIGTERM');

      // Wait for process to exit
      const exitPromise = new Promise<void>((resolve) => {
        process.on('exit', () => resolve());
      });

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), timeout);
      });

      await Promise.race([exitPromise, timeoutPromise]);

      // Force kill if still running
      if (process.pid && !process.killed) {
        logger.warn(`Force killing process: ${id}`);
        process.kill('SIGKILL');
      }

      info.status = 'stopped';
      this.processes.delete(id);
    } catch (error) {
      logger.error(`Failed to stop process ${id}`, error);
      throw error;
    }
  }

  /**
   * Stop all processes
   */
  async stopAllProcesses(): Promise<void> {
    const ids = Array.from(this.processes.keys());
    await Promise.all(ids.map((id) => this.stopProcess(id)));
  }

  /**
   * Get process info
   */
  getProcessInfo(id: string): ProcessInfo | undefined {
    return this.processInfo.get(id);
  }

  /**
   * Check if process is running
   */
  isProcessRunning(id: string): boolean {
    const info = this.processInfo.get(id);
    return info?.status === 'running';
  }

  /**
   * Get process output
   */
  async getProcessOutput(id: string): Promise<ProcessOutput | null> {
    const process = this.processes.get(id);
    if (!process) {
      return null;
    }

    try {
      const result = await process;
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        signal: result.signal,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.exitCode || null,
        signal: error.signal || null,
      };
    }
  }

  /**
   * Stream process output
   */
  streamProcessOutput(
    id: string,
    onStdout?: (data: string) => void,
    onStderr?: (data: string) => void
  ): void {
    const process = this.processes.get(id);
    if (!process) {
      return;
    }

    if (onStdout && process.stdout) {
      process.stdout.on('data', (data) => {
        onStdout(data.toString());
      });
    }

    if (onStderr && process.stderr) {
      process.stderr.on('data', (data) => {
        onStderr(data.toString());
      });
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForServer(options: ServerReadinessOptions): Promise<boolean> {
    const {
      port,
      host = 'localhost',
      timeout = 60000,
      retryInterval = 1000,
    } = options;

    const startTime = Date.now();
    logger.info(`Waiting for server on ${host}:${port}...`);

    while (Date.now() - startTime < timeout) {
      if (await this.checkPort(port, host)) {
        logger.success(`Server is ready on ${host}:${port}`);
        return true;
      }

      await this.sleep(retryInterval);
    }

    logger.error(`Server failed to start on ${host}:${port} within ${timeout}ms`);
    return false;
  }

  /**
   * Check if port is available (not in use)
   */
  async isPortAvailable(port: number, host: string = 'localhost'): Promise<boolean> {
    return !(await this.checkPort(port, host));
  }

  /**
   * Check if port is in use
   */
  async checkPort(port: number, host: string = 'localhost'): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Find an available port starting from a given port
   */
  async findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    return null;
  }

  /**
   * Kill process on specific port (Windows and Unix)
   */
  async killPort(port: number): Promise<void> {
    try {
      logger.info(`Killing process on port ${port}...`);

      const isWindows = process.platform === 'win32';

      if (isWindows) {
        // Windows: Use netstat and taskkill
        const { stdout } = await execa('netstat', ['-ano'], { shell: true });
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (line.includes(`:${port}`) && line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            
            if (pid && !isNaN(parseInt(pid))) {
              await execa('taskkill', ['/F', '/PID', pid], { shell: true });
              logger.success(`Killed process ${pid} on port ${port}`);
            }
          }
        }
      } else {
        // Unix: Use lsof and kill
        try {
          const { stdout } = await execa('lsof', ['-ti', `:${port}`], { shell: true });
          const pids = stdout.trim().split('\n').filter(Boolean);
          
          for (const pid of pids) {
            await execa('kill', ['-9', pid], { shell: true });
            logger.success(`Killed process ${pid} on port ${port}`);
          }
        } catch (error) {
          // No process found on port
          logger.debug(`No process found on port ${port}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to kill process on port ${port}`, error);
      throw error;
    }
  }

  /**
   * Parse server URL from process output
   */
  parseServerUrl(output: string): string | null {
    // Common patterns for server URLs
    const patterns = [
      /(?:Local|Server):\s+(https?:\/\/[^\s]+)/i,
      /(?:running|listening) (?:at|on):\s+(https?:\/\/[^\s]+)/i,
      /(?:http|https):\/\/localhost:\d+/i,
      /(?:http|https):\/\/127\.0\.0\.1:\d+/i,
      /(?:http|https):\/\/0\.0\.0\.0:\d+/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  /**
   * Parse port from process output
   */
  parsePort(output: string): number | null {
    const patterns = [
      /port\s+(\d+)/i,
      /localhost:(\d+)/i,
      /127\.0\.0\.1:(\d+)/i,
      /0\.0\.0\.0:(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up all processes on exit
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up processes...');
    await this.stopAllProcesses();
  }
}

// Export singleton instance
export const processManager = new ProcessManager();

// Clean up on process exit
process.on('exit', () => {
  processManager.cleanup();
});

process.on('SIGINT', async () => {
  await processManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await processManager.cleanup();
  process.exit(0);
});

// Made with Bob