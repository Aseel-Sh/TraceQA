/**
 * TraceQA Agent Prompts and Templates
 * System prompts, test planning prompts, and other templates for the AI agent
 */

import { TestContext, TestType } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Base system prompt for the TraceQA agent
 */
export const SYSTEM_PROMPT = `You are TraceQA Agent, an intelligent software testing assistant specialized in automated testing for web applications and APIs.

Your capabilities:
- Analyze code changes and understand their impact
- Create comprehensive test plans based on requirements
- Execute tests using browser automation and API testing tools
- Make intelligent decisions about test execution flow
- Identify edge cases and potential issues
- Generate detailed test reports

Your responsibilities:
- Ensure test coverage aligns with acceptance criteria
- Prioritize critical functionality
- Handle errors gracefully and retry when appropriate
- Ask for human input when facing ambiguous situations
- Provide clear reasoning for all decisions
- Track and report on test progress

Guidelines:
- Be thorough but efficient
- Focus on user-facing functionality
- Consider edge cases and error scenarios
- Provide actionable feedback
- Use structured responses when requested
- Always explain your reasoning`;

/**
 * Test planning prompt template
 */
export function getTestPlanningPrompt(context: TestContext): string {
  const { repository, changes, description, acceptanceCriteria, buildInfo } = context;

  return `# Test Planning Request

## Repository Information
- Name: ${repository.name}
- Branch: ${repository.branch}
- Path: ${repository.path}

## Change Description
${description}

## Acceptance Criteria
${acceptanceCriteria && acceptanceCriteria.length > 0 
  ? acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
  : 'No specific acceptance criteria provided'}

## Code Changes Summary
- Files changed: ${changes.files.length}
- Lines added: ${changes.additions}
- Lines deleted: ${changes.deletions}

### Changed Files:
${changes.files.map(f => `- ${f.path} (${f.type}): +${f.additions} -${f.deletions}`).join('\n')}

## Build Information
- Framework: ${buildInfo.framework}
- Language: ${buildInfo.language}
- Build Status: ${buildInfo.success ? 'Success' : 'Failed'}
${buildInfo.port ? `- Running on port: ${buildInfo.port}` : ''}

## Task
Create a comprehensive test plan that:
1. Covers all acceptance criteria
2. Tests the changed functionality thoroughly
3. Includes edge cases and error scenarios
4. Prioritizes critical user flows
5. Is executable using browser automation and/or API testing

Respond with a JSON object in this exact format:
{
  "testCases": [
    {
      "id": "unique-test-id",
      "name": "Test case name",
      "description": "What this test validates",
      "type": "ui" | "api" | "integration",
      "priority": "high" | "medium" | "low",
      "steps": [
        {
          "action": "navigate" | "click" | "type" | "verify" | "api_call",
          "target": "CSS selector or API endpoint",
          "value": "value to input or expected result",
          "description": "What this step does"
        }
      ],
      "expectedResult": "What should happen if test passes"
    }
  ],
  "estimatedDuration": 300,
  "requiredResources": ["browser", "api-client"],
  "reasoning": "Why these tests cover the requirements"
}`;
}

/**
 * Test execution prompt template
 */
export function getTestExecutionPrompt(
  testCaseName: string,
  testSteps: string,
  context: TestContext
): string {
  return `# Test Execution Request

## Test Case
${testCaseName}

## Test Steps
${testSteps}

## Application Context
- Framework: ${context.buildInfo.framework}
- Base URL: http://localhost:${context.buildInfo.port || 3000}
- Build Status: ${context.buildInfo.success ? 'Running' : 'Not running'}

## Available Tools
- Browser automation (navigate, click, type, screenshot, etc.)
- API testing (HTTP requests, response validation)
- Element inspection and verification

## Task
Execute the test steps and report results. For each step:
1. Perform the action using available tools
2. Verify the expected outcome
3. Capture screenshots for UI tests
4. Log any errors or unexpected behavior

If a step fails:
- Analyze the failure reason
- Determine if it's a real bug or test issue
- Suggest next steps (retry, modify test, report bug)

Respond with structured results including:
- Success/failure status
- Detailed step-by-step results
- Screenshots (for UI tests)
- Error messages (if any)
- Recommendations`;
}

/**
 * Error analysis prompt template
 */
export function getErrorAnalysisPrompt(
  error: string,
  testContext: string,
  attemptNumber: number
): string {
  return `# Error Analysis Request

## Error Details
${error}

## Test Context
${testContext}

## Attempt Number
${attemptNumber}

## Task
Analyze this test failure and determine:

1. **Root Cause**: What caused the failure?
   - Application bug
   - Test flakiness
   - Environment issue
   - Timing issue
   - Configuration problem

2. **Severity**: How critical is this?
   - Critical: Blocks core functionality
   - High: Affects important features
   - Medium: Minor functionality issue
   - Low: Edge case or cosmetic

3. **Recommended Action**:
   - Retry with adjustments
   - Report as bug
   - Skip test
   - Ask for human input
   - Modify test approach

4. **Reasoning**: Explain your analysis

Respond with a JSON object:
{
  "rootCause": "description",
  "category": "bug" | "flaky" | "environment" | "timing" | "config",
  "severity": "critical" | "high" | "medium" | "low",
  "action": "retry" | "report" | "skip" | "ask_human" | "modify",
  "reasoning": "detailed explanation",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "confidence": 0.85
}`;
}

/**
 * Decision making prompt template
 */
export function getDecisionPrompt(
  situation: string,
  options: string[],
  context: Record<string, unknown>
): string {
  return `# Decision Request

## Situation
${situation}

## Available Options
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

## Context
${JSON.stringify(context, null, 2)}

## Task
Analyze the situation and make a decision:

1. Evaluate each option's pros and cons
2. Consider the context and constraints
3. Choose the best option
4. Explain your reasoning
5. Assess your confidence level

Respond with a JSON object:
{
  "decision": "chosen option",
  "reasoning": "why this is the best choice",
  "confidence": 0.9,
  "alternatives": ["other viable options"],
  "risks": ["potential risks of this decision"],
  "requiresHumanInput": false
}`;
}

/**
 * Report generation prompt template
 */
export function getReportGenerationPrompt(
  testResults: string,
  summary: string,
  context: TestContext
): string {
  return `# Test Report Generation Request

## Test Summary
${summary}

## Test Results
${testResults}

## Test Context
- Repository: ${context.repository.name}
- Branch: ${context.repository.branch}
- Change Description: ${context.description}

## Task
Generate a comprehensive test report that includes:

1. **Executive Summary**
   - Overall test status
   - Key findings
   - Critical issues

2. **Test Coverage**
   - What was tested
   - Coverage of acceptance criteria
   - Areas not covered (if any)

3. **Detailed Results**
   - Test case results
   - Pass/fail breakdown
   - Performance metrics

4. **Issues Found**
   - Bugs discovered
   - Severity levels
   - Reproduction steps

5. **Recommendations**
   - Next steps
   - Areas needing attention
   - Suggested improvements

Format the report in markdown with clear sections and actionable insights.`;
}

/**
 * Human input request prompt template
 */
export function getHumanInputPrompt(
  question: string,
  context: string,
  options?: string[]
): string {
  let prompt = `# Human Input Required

## Question
${question}

## Context
${context}`;

  if (options && options.length > 0) {
    prompt += `\n\n## Options\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
  }

  prompt += `\n\nPlease provide your input to help me proceed with the testing.`;

  return prompt;
}

/**
 * Test step refinement prompt
 */
export function getStepRefinementPrompt(
  originalStep: string,
  failureReason: string,
  attemptNumber: number
): string {
  return `# Test Step Refinement Request

## Original Step
${originalStep}

## Failure Reason
${failureReason}

## Attempt Number
${attemptNumber}

## Task
Refine this test step to address the failure:

1. Analyze why the original step failed
2. Identify what needs to change
3. Propose an improved version
4. Explain the improvements

Consider:
- More specific selectors
- Better wait conditions
- Alternative approaches
- Timing adjustments

Respond with a JSON object:
{
  "refinedStep": {
    "action": "action type",
    "target": "improved target",
    "value": "value if needed",
    "description": "what this does"
  },
  "changes": ["what was changed"],
  "reasoning": "why these changes help",
  "confidence": 0.8
}`;
}

/**
 * Test prioritization prompt
 */
export function getTestPrioritizationPrompt(
  testCases: string,
  constraints: Record<string, unknown>
): string {
  return `# Test Prioritization Request

## Test Cases
${testCases}

## Constraints
${JSON.stringify(constraints, null, 2)}

## Task
Prioritize these test cases based on:

1. **Business Impact**: Critical user flows first
2. **Risk Level**: High-risk changes need more testing
3. **Dependencies**: Tests that unblock others
4. **Execution Time**: Balance thoroughness with efficiency
5. **Failure History**: Flaky areas need attention

Respond with a JSON object:
{
  "prioritizedTests": [
    {
      "testId": "test-id",
      "priority": 1,
      "reasoning": "why this priority",
      "estimatedDuration": 60
    }
  ],
  "executionStrategy": "parallel" | "sequential" | "hybrid",
  "reasoning": "overall prioritization strategy"
}`;
}

/**
 * Edge case identification prompt
 */
export function getEdgeCasePrompt(
  functionality: string,
  context: TestContext
): string {
  return `# Edge Case Identification Request

## Functionality
${functionality}

## Context
- Framework: ${context.buildInfo.framework}
- Change Description: ${context.description}

## Task
Identify potential edge cases and boundary conditions for this functionality:

1. **Input Validation**
   - Empty inputs
   - Invalid formats
   - Extreme values
   - Special characters

2. **State Conditions**
   - First-time use
   - Logged out state
   - Concurrent operations
   - Network failures

3. **Browser/Environment**
   - Different screen sizes
   - Slow connections
   - Browser compatibility
   - Accessibility

4. **Data Scenarios**
   - Empty datasets
   - Large datasets
   - Duplicate data
   - Missing data

Respond with a JSON object:
{
  "edgeCases": [
    {
      "scenario": "description",
      "category": "input" | "state" | "environment" | "data",
      "priority": "high" | "medium" | "low",
      "testApproach": "how to test this"
    }
  ],
  "reasoning": "why these edge cases matter"
}`;
}

/**
 * Parse JSON response from Claude
 */
export function parseJSONResponse<T>(response: string): T | null {
  try {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return null;
  } catch (error) {
    logger.error('Failed to parse JSON response:', error);
    return null;
  }
}

/**
 * Extract code blocks from response
 */
export function extractCodeBlocks(response: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }
  
  return blocks;
}

// Made with Bob
