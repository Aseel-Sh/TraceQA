/**
 * TraceQA Reporting Module
 * Exports report generation functionality
 */

export { ReportGenerator, generateReport } from './report-generator.js';

// Export new report types
export type {
  ReportSummary,
  TraceMatrixEntry,
  ReportData
} from './report-generator.js';

// Re-export core types for convenience
export type {
  TraceMatrix,
  MergeReadinessScore
} from '../types/index.js';

// Made with Bob
