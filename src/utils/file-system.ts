/**
 * File System Utilities
 * Provides file system operations for the build system
 */

import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file exists synchronously
 */
export function fileExistsSync(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    return null;
  }
}

/**
 * Read and parse a JSON file synchronously
 */
export function readJsonFileSync<T = any>(filePath: string): T | null {
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    return null;
  }
}

/**
 * Find files matching a pattern
 */
export async function findFiles(
  pattern: string,
  options?: {
    cwd?: string;
    ignore?: string[];
    maxDepth?: number;
  }
): Promise<string[]> {
  try {
    const files = await glob(pattern, {
      cwd: options?.cwd || process.cwd(),
      ignore: options?.ignore || ['node_modules/**', 'dist/**', 'build/**'],
      absolute: true,
    });
    return files;
  } catch (error) {
    return [];
  }
}

/**
 * Find project root directory by looking for package.json
 */
export async function getProjectRoot(startPath?: string): Promise<string | null> {
  let currentPath = startPath || process.cwd();
  
  // Traverse up the directory tree
  while (currentPath !== path.parse(currentPath).root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    
    if (await fileExists(packageJsonPath)) {
      return currentPath;
    }
    
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

/**
 * Find project root directory synchronously
 */
export function getProjectRootSync(startPath?: string): string | null {
  let currentPath = startPath || process.cwd();
  
  // Traverse up the directory tree
  while (currentPath !== path.parse(currentPath).root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    
    if (fileExistsSync(packageJsonPath)) {
      return currentPath;
    }
    
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

/**
 * Package.json structure
 */
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  type?: 'module' | 'commonjs';
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
  [key: string]: any;
}

/**
 * Read package.json with validation
 */
export async function readPackageJson(projectPath?: string): Promise<PackageJson | null> {
  try {
    const root = projectPath || await getProjectRoot();
    if (!root) {
      return null;
    }
    
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
    
    if (!packageJson || !packageJson.name) {
      return null;
    }
    
    return packageJson;
  } catch (error) {
    return null;
  }
}

/**
 * Read package.json synchronously with validation
 */
export function readPackageJsonSync(projectPath?: string): PackageJson | null {
  try {
    const root = projectPath || getProjectRootSync();
    if (!root) {
      return null;
    }
    
    const packageJsonPath = path.join(root, 'package.json');
    const packageJson = readJsonFileSync<PackageJson>(packageJsonPath);
    
    if (!packageJson || !packageJson.name) {
      return null;
    }
    
    return packageJson;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists synchronously
 */
export function directoryExistsSync(dirPath: string): boolean {
  try {
    const stats = require('fs').statSync(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read directory contents
 */
export async function readDirectory(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

/**
 * Find a file by searching up the directory tree
 */
export async function findFileUp(
  fileName: string,
  startPath?: string
): Promise<string | null> {
  let currentPath = startPath || process.cwd();
  
  while (currentPath !== path.parse(currentPath).root) {
    const filePath = path.join(currentPath, fileName);
    
    if (await fileExists(filePath)) {
      return filePath;
    }
    
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

/**
 * Find a file by searching up the directory tree synchronously
 */
export function findFileUpSync(
  fileName: string,
  startPath?: string
): string | null {
  let currentPath = startPath || process.cwd();
  
  while (currentPath !== path.parse(currentPath).root) {
    const filePath = path.join(currentPath, fileName);
    
    if (fileExistsSync(filePath)) {
      return filePath;
    }
    
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

/**
 * Check if any of the files exist
 */
export async function anyFileExists(filePaths: string[]): Promise<boolean> {
  for (const filePath of filePaths) {
    if (await fileExists(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if all of the files exist
 */
export async function allFilesExist(filePaths: string[]): Promise<boolean> {
  for (const filePath of filePaths) {
    if (!(await fileExists(filePath))) {
      return false;
    }
  }
  return true;
}

// Made with Bob