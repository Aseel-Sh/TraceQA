import type { AmbiguityIssue, AmbiguityAnalysis } from '../types/index.js';

/**
 * Vague terms categorized by severity
 */
const VAGUE_TERMS = {
  high: [
    'secure', 'fast', 'efficient', 'good', 'bad', 'better', 'worse',
    'easy', 'simple', 'complex', 'appropriate', 'reasonable',
    'should work', 'must be', 'needs to be'
  ],
  medium: [
    'some', 'many', 'few', 'several', 'various',
    'properly', 'correctly', 'accurately',
    'user-friendly', 'intuitive', 'user friendly'
  ],
  low: [
    'etc', 'and so on', 'similar', 'like'
  ]
};

/**
 * Suggestions for common vague terms
 */
const SUGGESTIONS: Record<string, string> = {
  'secure': 'Specify security requirements (e.g., encryption standards, authentication methods, password complexity rules)',
  'fast': 'Define specific performance metrics (e.g., response time <200ms, load time <2s)',
  'efficient': 'Specify efficiency metrics (e.g., memory usage, CPU utilization, throughput)',
  'good': 'Define measurable quality criteria',
  'bad': 'Define specific failure conditions or unacceptable states',
  'better': 'Specify quantifiable improvements over current state',
  'worse': 'Define specific degradation metrics',
  'easy': 'Specify usability metrics (e.g., task completion time, number of clicks)',
  'simple': 'Define complexity constraints (e.g., maximum steps, minimal configuration)',
  'complex': 'Specify complexity requirements or constraints',
  'appropriate': 'Define specific criteria for appropriateness',
  'reasonable': 'Specify quantifiable limits or ranges',
  'should work': 'Define specific functional requirements and success criteria',
  'must be': 'Complete the requirement with specific, measurable criteria',
  'needs to be': 'Complete the requirement with specific, measurable criteria',
  'some': 'Specify exact quantity or range',
  'many': 'Specify exact quantity or minimum threshold',
  'few': 'Specify exact quantity or maximum threshold',
  'several': 'Specify exact quantity or range',
  'various': 'List specific items or categories',
  'properly': 'Define specific correctness criteria',
  'correctly': 'Define specific validation rules or expected behavior',
  'accurately': 'Specify accuracy requirements (e.g., precision, tolerance)',
  'user-friendly': 'Define specific usability metrics (e.g., task completion rate, error rate)',
  'user friendly': 'Define specific usability metrics (e.g., task completion rate, error rate)',
  'intuitive': 'Define specific learnability metrics (e.g., time to first success, help requests)',
  'etc': 'List all required items explicitly',
  'and so on': 'List all required items explicitly',
  'similar': 'Specify exact requirements or provide concrete examples',
  'like': 'Provide specific examples or exact requirements'
};

/**
 * Detects ambiguous and vague terms in acceptance criteria
 */
export class AmbiguityDetector {
  /**
   * Analyze acceptance criteria for ambiguity issues
   */
  analyzeAcceptanceCriteria(criteria: string[]): AmbiguityAnalysis {
    const issues: AmbiguityIssue[] = [];

    for (const criterion of criteria) {
      const criterionIssues = this.analyzeCriterion(criterion);
      issues.push(...criterionIssues);
    }

    // Calculate overall quality
    const overallQuality = this.calculateOverallQuality(criteria.length, issues);

    return {
      totalCriteria: criteria.length,
      issuesFound: issues.length,
      issues,
      overallQuality
    };
  }

  /**
   * Analyze a single criterion for vague terms
   */
  private analyzeCriterion(criterion: string): AmbiguityIssue[] {
    const issues: AmbiguityIssue[] = [];
    const lowerCriterion = criterion.toLowerCase();

    // Check for high severity terms
    const highSeverityTerms = this.findVagueTerms(lowerCriterion, VAGUE_TERMS.high);
    if (highSeverityTerms.length > 0) {
      issues.push(this.createIssue(criterion, highSeverityTerms, 'high'));
    }

    // Check for medium severity terms
    const mediumSeverityTerms = this.findVagueTerms(lowerCriterion, VAGUE_TERMS.medium);
    if (mediumSeverityTerms.length > 0) {
      issues.push(this.createIssue(criterion, mediumSeverityTerms, 'medium'));
    }

    // Check for low severity terms
    const lowSeverityTerms = this.findVagueTerms(lowerCriterion, VAGUE_TERMS.low);
    if (lowSeverityTerms.length > 0) {
      issues.push(this.createIssue(criterion, lowSeverityTerms, 'low'));
    }

    // Check for missing quantifiable metrics
    if (this.lacksMeasurableMetrics(criterion)) {
      issues.push({
        criterion,
        issue: 'Lacks quantifiable metrics or specific success criteria',
        vagueTerms: [],
        suggestion: 'Add measurable criteria (e.g., specific numbers, percentages, time limits, or concrete examples)',
        severity: 'low'
      });
    }

    return issues;
  }

  /**
   * Find vague terms in criterion text
   */
  private findVagueTerms(text: string, terms: string[]): string[] {
    const found: string[] = [];
    
    for (const term of terms) {
      // Use word boundaries to match whole words/phrases
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        found.push(term);
      }
    }

    return found;
  }

  /**
   * Create an ambiguity issue
   */
  private createIssue(
    criterion: string,
    vagueTerms: string[],
    severity: 'high' | 'medium' | 'low'
  ): AmbiguityIssue {
    // Get suggestion for the first vague term found
    const primaryTerm = vagueTerms[0];
    const suggestion = SUGGESTIONS[primaryTerm] || 'Provide more specific and measurable criteria';

    let issue = '';
    if (severity === 'high') {
      issue = 'Contains highly ambiguous terms that need specific, measurable criteria';
    } else if (severity === 'medium') {
      issue = 'Contains vague quantifiers or qualifiers that should be made specific';
    } else {
      issue = 'Contains imprecise language that could be more explicit';
    }

    return {
      criterion,
      issue,
      vagueTerms,
      suggestion,
      severity
    };
  }

  /**
   * Check if criterion lacks measurable metrics
   */
  private lacksMeasurableMetrics(criterion: string): boolean {
    // Check for presence of numbers, percentages, or time units
    const hasNumbers = /\d+/.test(criterion);
    const hasPercentage = /%/.test(criterion);
    const hasTimeUnit = /\b(second|minute|hour|day|week|month|ms|millisecond)s?\b/i.test(criterion);
    const hasComparison = /\b(less than|more than|at least|at most|maximum|minimum|within)\b/i.test(criterion);
    const hasSpecificExample = /\b(e\.g\.|for example|such as|including)\b/i.test(criterion);

    // If it has any measurable element, it's probably okay
    if (hasNumbers || hasPercentage || hasTimeUnit || hasComparison || hasSpecificExample) {
      return false;
    }

    // Check if it's a very short criterion (likely too vague)
    const words = criterion.trim().split(/\s+/);
    if (words.length < 5) {
      return true;
    }

    // Check for action verbs that typically need metrics
    const needsMetrics = /\b(should|must|will|shall)\s+(be|have|provide|support|allow|enable)\b/i.test(criterion);
    
    return needsMetrics;
  }

  /**
   * Calculate overall quality based on issues found
   */
  private calculateOverallQuality(
    totalCriteria: number,
    issues: AmbiguityIssue[]
  ): 'good' | 'fair' | 'poor' {
    if (totalCriteria === 0) {
      return 'poor';
    }

    // Count high severity issues
    const highSeverityCount = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length;

    // Calculate weighted issue score
    const issueScore = (highSeverityCount * 3) + (mediumSeverityCount * 2) + (issues.length - highSeverityCount - mediumSeverityCount);
    const issueRatio = issueScore / totalCriteria;

    if (issueRatio >= 2) {
      return 'poor';
    } else if (issueRatio >= 1) {
      return 'fair';
    } else {
      return 'good';
    }
  }
}

// Made with Bob
