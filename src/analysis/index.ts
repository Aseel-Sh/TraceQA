/**
 * Analysis modules for test quality improvement
 */

export { AmbiguityDetector } from './ambiguity-detector.js';
export { GitAnalyzer } from './git-analyzer.js';

// Re-export analysis-related types
export type {
  AmbiguityIssue,
  AmbiguityAnalysis,
  GitFileChange,
  DiffAnalysis
} from '../types/index.js';

// Made with Bob
