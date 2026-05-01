import { execSync } from 'child_process';
import type { GitFileChange, DiffAnalysis } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Analyzes git diffs to inform test planning
 */
export class GitAnalyzer {
  /**
   * Analyze git diff between current branch and base branch
   */
  async analyzeDiff(baseBranch: string = 'main'): Promise<DiffAnalysis | null> {
    try {
      // Check if we're in a git repository
      if (!this.isGitRepository()) {
        logger.warn('Not in a git repository. Skipping diff analysis.');
        return null;
      }

      // Get current branch
      const currentBranch = this.getCurrentBranch();
      if (currentBranch === baseBranch) {
        logger.warn(`Already on base branch '${baseBranch}'. No diff to analyze.`);
        return null;
      }

      // Check if base branch exists
      if (!this.branchExists(baseBranch)) {
        logger.warn(`Base branch '${baseBranch}' does not exist. Skipping diff analysis.`);
        return null;
      }

      // Get changed files
      const changedFiles = this.getChangedFiles(baseBranch);
      
      if (changedFiles.length === 0) {
        logger.info('No changes detected between branches.');
        return {
          baseBranch,
          changedFiles: [],
          impactedAreas: [],
          riskLevel: 'low',
          suggestedTestFocus: []
        };
      }

      // Analyze impact
      const impactedAreas = this.identifyImpactedAreas(changedFiles);
      const riskLevel = this.calculateRiskLevel(changedFiles);
      const suggestedTestFocus = this.generateTestFocus(changedFiles, impactedAreas);

      return {
        baseBranch,
        changedFiles,
        impactedAreas,
        riskLevel,
        suggestedTestFocus
      };
    } catch (error) {
      logger.warn(`Failed to analyze git diff: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Check if current directory is a git repository
   */
  private isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current branch name
   */
  private getCurrentBranch(): string {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
      return branch;
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a branch exists
   */
  private branchExists(branch: string): boolean {
    try {
      execSync(`git rev-parse --verify ${branch}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      return true;
    } catch {
      // Try with origin prefix
      try {
        execSync(`git rev-parse --verify origin/${branch}`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get list of changed files with statistics
   */
  private getChangedFiles(baseBranch: string): GitFileChange[] {
    try {
      // Get file changes with status
      const nameStatusOutput = execSync(`git diff ${baseBranch}...HEAD --name-status`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();

      if (!nameStatusOutput) {
        return [];
      }

      // Get file statistics
      const statOutput = execSync(`git diff ${baseBranch}...HEAD --numstat`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();

      // Parse name-status output
      const statusMap = new Map<string, 'added' | 'modified' | 'deleted'>();
      const statusLines = nameStatusOutput.split('\n');
      
      for (const line of statusLines) {
        const [status, ...pathParts] = line.split('\t');
        const path = pathParts.join('\t'); // Handle paths with tabs
        
        if (status.startsWith('A')) {
          statusMap.set(path, 'added');
        } else if (status.startsWith('M')) {
          statusMap.set(path, 'modified');
        } else if (status.startsWith('D')) {
          statusMap.set(path, 'deleted');
        } else if (status.startsWith('R')) {
          // Renamed files - use the new name
          const newPath = pathParts[pathParts.length - 1];
          statusMap.set(newPath, 'modified');
        }
      }

      // Parse numstat output
      const changes: GitFileChange[] = [];
      const statLines = statOutput.split('\n');

      for (const line of statLines) {
        const [added, deleted, path] = line.split('\t');
        
        if (!path) continue;

        const type = statusMap.get(path) || 'modified';
        
        changes.push({
          path,
          type,
          linesAdded: added === '-' ? 0 : parseInt(added, 10),
          linesDeleted: deleted === '-' ? 0 : parseInt(deleted, 10)
        });
      }

      return changes;
    } catch (error) {
      throw new Error(`Failed to get changed files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Identify impacted areas based on file paths
   */
  private identifyImpactedAreas(files: GitFileChange[]): string[] {
    const areas = new Set<string>();

    for (const file of files) {
      const path = file.path.toLowerCase();

      // API changes
      if (path.includes('/api/') || path.includes('/routes/') || path.includes('/endpoints/')) {
        areas.add('API endpoints');
      }

      // UI changes
      if (path.includes('/components/') || path.includes('/pages/') || path.includes('/views/') || 
          path.includes('/ui/') || path.includes('.jsx') || path.includes('.tsx') || 
          path.includes('.vue') || path.includes('.svelte')) {
        areas.add('User interface');
      }

      // Authentication/Authorization
      if (path.includes('/auth/') || path.includes('/login/') || path.includes('/security/') ||
          path.includes('authentication') || path.includes('authorization')) {
        areas.add('Authentication');
      }

      // Database/Data layer
      if (path.includes('/database/') || path.includes('/models/') || path.includes('/schema/') ||
          path.includes('/migrations/') || path.includes('/entities/')) {
        areas.add('Data layer');
      }

      // Business logic
      if (path.includes('/services/') || path.includes('/business/') || path.includes('/logic/') ||
          path.includes('/core/')) {
        areas.add('Business logic');
      }

      // Configuration
      if (path.includes('/config/') || path.includes('.config.') || path.includes('.env')) {
        areas.add('Configuration');
      }

      // Testing
      if (path.includes('/test/') || path.includes('.test.') || path.includes('.spec.')) {
        areas.add('Test infrastructure');
      }

      // Build/Deploy
      if (path.includes('package.json') || path.includes('dockerfile') || 
          path.includes('.yml') || path.includes('.yaml') || path.includes('/build/')) {
        areas.add('Build/deployment');
      }

      // Payment/Financial
      if (path.includes('/payment/') || path.includes('/billing/') || path.includes('/checkout/')) {
        areas.add('Payment processing');
      }
    }

    return Array.from(areas);
  }

  /**
   * Calculate risk level based on changes
   */
  private calculateRiskLevel(files: GitFileChange[]): 'high' | 'medium' | 'low' {
    const fileCount = files.length;
    
    // Check for critical file changes
    const hasCriticalChanges = files.some(file => {
      const path = file.path.toLowerCase();
      return path.includes('/auth/') || 
             path.includes('/payment/') || 
             path.includes('/security/') ||
             path.includes('/database/') ||
             path.includes('migration');
    });

    // Check for large changes
    const totalLinesChanged = files.reduce((sum, file) => 
      sum + file.linesAdded + file.linesDeleted, 0
    );

    if (hasCriticalChanges || fileCount > 50 || totalLinesChanged > 1000) {
      return 'high';
    } else if (fileCount > 10 || totalLinesChanged > 300) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate suggested test focus areas
   */
  private generateTestFocus(files: GitFileChange[], impactedAreas: string[]): string[] {
    const suggestions = new Set<string>();

    // Add suggestions based on impacted areas
    if (impactedAreas.includes('API endpoints')) {
      suggestions.add('API endpoint functionality and response validation');
      suggestions.add('API error handling and edge cases');
    }

    if (impactedAreas.includes('User interface')) {
      suggestions.add('UI component rendering and interactions');
      suggestions.add('User workflows and navigation');
    }

    if (impactedAreas.includes('Authentication')) {
      suggestions.add('Authentication flows (login, logout, session management)');
      suggestions.add('Authorization and access control');
    }

    if (impactedAreas.includes('Data layer')) {
      suggestions.add('Data persistence and retrieval');
      suggestions.add('Database migrations and schema changes');
    }

    if (impactedAreas.includes('Business logic')) {
      suggestions.add('Core business rules and calculations');
      suggestions.add('Data validation and processing');
    }

    if (impactedAreas.includes('Payment processing')) {
      suggestions.add('Payment flows and transaction handling');
      suggestions.add('Payment security and validation');
    }

    // Add integration testing if multiple areas are impacted
    if (impactedAreas.length > 2) {
      suggestions.add('Integration between modified components');
      suggestions.add('End-to-end user scenarios');
    }

    // Check for new files (might need more comprehensive testing)
    const hasNewFiles = files.some(f => f.type === 'added');
    if (hasNewFiles) {
      suggestions.add('New feature functionality and edge cases');
    }

    // Check for deleted files (might need regression testing)
    const hasDeletedFiles = files.some(f => f.type === 'deleted');
    if (hasDeletedFiles) {
      suggestions.add('Regression testing for removed functionality');
    }

    return Array.from(suggestions);
  }
}

// Made with Bob
