/**
 * TraceQA Logger Utility
 * Provides formatted console output with colors and spinners
 */

import chalk from 'chalk';
import { spinner } from '@clack/prompts';
import { LogLevel } from '../types/index.js';

/**
 * Logger class for consistent, colorful console output
 */
export class Logger {
  private static instance: Logger;
  private debugMode: boolean = false;

  private constructor() {
    // Check if DEBUG environment variable is set
    this.debugMode = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Log a success message
   */
  public success(message: string, details?: string): void {
    console.log(chalk.green('✓'), chalk.green(message));
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
  }

  /**
   * Log an error message
   */
  public error(message: string, error?: Error | unknown): void {
    console.error(chalk.red('✗'), chalk.red(message));
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.gray(`  ${error.message}`));
        if (this.debugMode && error.stack) {
          console.error(chalk.gray(error.stack));
        }
      } else {
        console.error(chalk.gray(`  ${String(error)}`));
      }
    }
  }

  /**
   * Log a warning message
   */
  public warn(message: string, details?: string): void {
    console.warn(chalk.yellow('⚠'), chalk.yellow(message));
    if (details) {
      console.warn(chalk.gray(`  ${details}`));
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, details?: string): void {
    console.log(chalk.blue('ℹ'), chalk.blue(message));
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
  }

  /**
   * Log a debug message (only if debug mode is enabled)
   */
  public debug(message: string, data?: unknown): void {
    if (!this.debugMode) return;
    
    console.log(chalk.magenta('🐛'), chalk.magenta(`[DEBUG] ${message}`));
    if (data !== undefined) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  /**
   * Log a generic message with custom color
   */
  public log(message: string, level: LogLevel = LogLevel.INFO): void {
    switch (level) {
      case LogLevel.SUCCESS:
        this.success(message);
        break;
      case LogLevel.ERROR:
        this.error(message);
        break;
      case LogLevel.WARN:
        this.warn(message);
        break;
      case LogLevel.DEBUG:
        this.debug(message);
        break;
      case LogLevel.INFO:
      default:
        this.info(message);
        break;
    }
  }

  /**
   * Create a spinner for long-running operations
   */
  public createSpinner(_message: string) {
    return spinner();
  }

  /**
   * Log a section header
   */
  public section(title: string): void {
    console.log();
    console.log(chalk.bold.cyan(`━━━ ${title} ━━━`));
    console.log();
  }

  /**
   * Log a subsection header
   */
  public subsection(title: string): void {
    console.log();
    console.log(chalk.bold(`  ${title}`));
  }

  /**
   * Log a list item
   */
  public listItem(message: string, indent: number = 1): void {
    const indentation = '  '.repeat(indent);
    console.log(`${indentation}• ${message}`);
  }

  /**
   * Log a key-value pair
   */
  public keyValue(key: string, value: string, indent: number = 1): void {
    const indentation = '  '.repeat(indent);
    console.log(`${indentation}${chalk.gray(key + ':')} ${value}`);
  }

  /**
   * Log a horizontal line separator
   */
  public separator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Clear the console
   */
  public clear(): void {
    console.clear();
  }

  /**
   * Log an empty line
   */
  public newLine(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      console.log();
    }
  }

  /**
   * Format duration in human-readable format
   */
  public formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format file size in human-readable format
   */
  public formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Log test results summary
   */
  public testSummary(passed: number, failed: number, total: number, duration: number): void {
    this.newLine();
    this.section('Test Results Summary');
    
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    if (failed === 0) {
      console.log(chalk.green.bold(`  ✓ All tests passed! (${passed}/${total})`));
    } else {
      console.log(chalk.yellow.bold(`  ⚠ Some tests failed (${passed}/${total} passed)`));
    }
    
    this.newLine();
    this.keyValue('Passed', chalk.green(String(passed)));
    this.keyValue('Failed', failed > 0 ? chalk.red(String(failed)) : chalk.gray(String(failed)));
    this.keyValue('Total', String(total));
    this.keyValue('Success Rate', `${passRate}%`);
    this.keyValue('Duration', this.formatDuration(duration));
    this.newLine();
  }

  /**
   * Log a progress bar
   */
  public progress(current: number, total: number, label?: string): void {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    const progressText = label 
      ? `${label}: [${bar}] ${percentage}% (${current}/${total})`
      : `[${bar}] ${percentage}% (${current}/${total})`;
    
    process.stdout.write(`\r${progressText}`);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * Log a table
   */
  public table(headers: string[], rows: string[][]): void {
    // Calculate column widths
    const widths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });

    // Print header
    const headerRow = headers.map((header, i) => 
      header.padEnd(widths[i])
    ).join(' │ ');
    console.log(chalk.bold(`  ${headerRow}`));
    
    // Print separator
    const separator = widths.map(width => '─'.repeat(width)).join('─┼─');
    console.log(chalk.gray(`  ${separator}`));
    
    // Print rows
    rows.forEach(row => {
      const rowText = row.map((cell, i) => 
        (cell || '').padEnd(widths[i])
      ).join(' │ ');
      console.log(`  ${rowText}`);
    });
  }

  /**
   * Log a box with a message
   */
  public box(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const lines = message.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length));
    const width = maxLength + 4;

    let color: typeof chalk.blue;
    let icon: string;

    switch (type) {
      case 'success':
        color = chalk.green;
        icon = '✓';
        break;
      case 'warning':
        color = chalk.yellow;
        icon = '⚠';
        break;
      case 'error':
        color = chalk.red;
        icon = '✗';
        break;
      case 'info':
      default:
        color = chalk.blue;
        icon = 'ℹ';
        break;
    }

    console.log();
    console.log(color('┌' + '─'.repeat(width) + '┐'));
    lines.forEach(line => {
      const padding = ' '.repeat(maxLength - line.length);
      console.log(color('│') + `  ${icon} ${line}${padding} ` + color('│'));
    });
    console.log(color('└' + '─'.repeat(width) + '┘'));
    console.log();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const success = (message: string, details?: string) => logger.success(message, details);
export const error = (message: string, err?: Error | unknown) => logger.error(message, err);
export const warn = (message: string, details?: string) => logger.warn(message, details);
export const info = (message: string, details?: string) => logger.info(message, details);
export const debug = (message: string, data?: unknown) => logger.debug(message, data);

/**
 * Format duration consistently across the codebase
 * - If duration < 1000ms: show as "XXXms" (rounded to nearest integer)
 * - If duration >= 1000ms: show as "X.XXXs" (3 decimal places)
 * @param durationMs Duration in milliseconds
 * @returns Formatted duration string (e.g., "47ms", "3.047s")
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  } else {
    return `${(durationMs / 1000).toFixed(3)}s`;
  }
}

// Made with Bob
