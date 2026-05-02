/**
 * QA Task Plan Generator with IBM watsonx Integration
 * 
 * This module generates structured QA task plans from acceptance criteria using
 * IBM watsonx for intelligent reasoning while maintaining robustness through
 * validation and deterministic fallback mechanisms.
 * 
 * Key Features:
 * - IBM watsonx integration for intelligent task classification
 * - Robust validation and JSON repair
 * - Deterministic fallback when IBM fails
 * - Never crashes on IBM errors
 * - Comprehensive error handling and logging
 */

import { WatsonxClient } from '../agent/watsonx-client.js';
import {
  AcceptanceCriterion,
  DiscoveredRoute,
  QATask,
  QATaskPlan,
  TraceQAConfig,
} from '../types/index.js';
import { detectResourceAndAction } from '../validation/route-matcher.js';
import { logger } from '../utils/logger.js';
import { extractJSON, safeExtractJSON } from '../utils/json-extractor.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Result of QA task plan generation
 */
export interface QATaskPlanGenerationResult {
  taskPlan: QATaskPlan;
  warnings: string[];
  ibmUsed: boolean;
  fallbackUsed: boolean;
}

/**
 * Project context for task generation
 */
export interface ProjectContext {
  projectName: string;
  framework?: string;
  openApiSpec?: any;
}

/**
 * Validation result for IBM response
 */
interface ValidationResult {
  valid: boolean;
  tasks: QATask[];
  errors: string[];
  warnings: string[];
}

/**
 * Build prompt for IBM watsonx to generate QA task plan
 * 
 * @param acceptanceCriteria - List of acceptance criteria to map to tasks
 * @param discoveredRoutes - Routes discovered from the application
 * @param projectContext - Project information for context
 * @returns Formatted prompt for IBM watsonx
 */
export function buildQATaskPlanPrompt(
  acceptanceCriteria: AcceptanceCriterion[],
  discoveredRoutes: DiscoveredRoute[],
  projectContext: ProjectContext
): string {
  const routesSummary = discoveredRoutes.length > 0
    ? discoveredRoutes.map(r => `  - ${r.method.toUpperCase()} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')
    : '  No routes discovered';

  const openApiInfo = projectContext.openApiSpec
    ? `\n\nOpenAPI Specification Available: Yes\nEndpoints: ${Object.keys(projectContext.openApiSpec.paths || {}).length}`
    : '';

  return `You are a QA engineer analyzing acceptance criteria to create a structured test plan for an ARBITRARY CODEBASE.

CRITICAL: Do not assume specific business logic or domain concepts. Base your analysis ONLY on:
- The actual acceptance criterion text
- Discovered routes and their source code
- OpenAPI/Swagger documentation if available

Do NOT assume or inject:
- User/authentication/login/registration workflows
- Email/password concepts
- Specific field names or business entities
- Resource types or relationships

Project: ${projectContext.projectName}
Framework: ${projectContext.framework || 'Unknown'}${openApiInfo}

Discovered Routes:
${routesSummary}

Acceptance Criteria:
${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description} (Priority: ${ac.priority || 'medium'})`).join('\n')}

Task: Create a QA task plan by mapping each acceptance criterion to one or more testable tasks.

For each task, determine:
1. **Task Type**: Classify as one of:
   - api: Can be tested via API calls (use when routes are discovered and criterion is API/endpoint-related)
   - ui: Requires browser interaction (use when criterion mentions UI/pages/buttons)
   - integration: Requires multiple systems (use when criterion mentions external services)
   - manual: Cannot be automated (use when criterion requires human judgment)
   - uncertain: Cannot determine with confidence (use when unclear or no matching routes)

2. **Execution Mode**: Classify as:
   - automated: Can be fully automated (all dependencies known, clear test path)
   - manual: Requires human execution (inherent to criterion or app design)
   - uncertain: Cannot determine with confidence

3. **Priority**: Based on acceptance criterion priority and testability:
   - high: Critical functionality with clear test path
   - medium: Important functionality or unclear test path
   - low: Nice-to-have or manual-only

4. **Reasoning**: Explain your classification (2-3 sentences). Cite discovered routes and criterion text.

5. **Uncertain Reason**: If type or executionMode is 'uncertain', explain why (required for uncertain tasks)

6. **Test Steps**: Suggest 2-5 concrete test steps based on discovered routes

7. **Preconditions**: List setup requirements from code evidence, not assumptions

8. **Setup Data**: Suggest generic test data (not domain-specific field names)

IMPORTANT GUIDELINES:
- Be conservative: Mark as 'uncertain' if confidence is low
- Match routes to criteria: Use discovered routes to inform task type
- Generic test data: Use placeholder names (e.g., "test_value", "test_string") not domain-specific (e.g., "validEmail", "password")
- One task per criterion minimum
- Provide reasoning that cites routes and criterion text
- Consider dependencies only if discoverable from route interactions

Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
{
  "tasks": [
    {
      "taskId": "QA-001",
      "acceptanceCriterionId": "AC-1",
      "title": "Test endpoint behavior with valid data",
      "type": "api",
      "executionMode": "automated",
      "priority": "high",
      "reasoning": "Route POST /api/endpoint discovered. Acceptance criterion describes expected behavior. Setup requirements minimal.",
      "preconditions": ["Endpoint is accessible", "Database initialized"],
      "setupData": {
        "field1": "test_value_1",
        "field2": "test_value_2"
      },
      "steps": [
        {
          "action": "Send request to endpoint",
          "description": "Submit valid data structure",
          "expectedOutcome": "Successful response with 2xx status"
        },
        {
          "action": "Verify response structure",
          "description": "Check response contains expected fields",
          "expectedOutcome": "All required fields present"
        }
      ],
      "expectedResult": "Endpoint accepts valid data and returns expected response"
    }
  ]
}

Generate the task plan now:`;
}

/**
 * Validate IBM task plan response and normalize tasks
 * 
 * @param response - Raw response from IBM watsonx
 * @param acceptanceCriteria - Original acceptance criteria for validation
 * @returns Validation result with normalized tasks and any errors/warnings
 */
export function validateIBMTaskPlanResponse(
  response: any,
  acceptanceCriteria: AcceptanceCriterion[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tasks: QATask[] = [];

  // Check if response has tasks array
  if (!response || typeof response !== 'object') {
    errors.push('Response is not a valid object');
    return { valid: false, tasks: [], errors, warnings };
  }

  if (!Array.isArray(response.tasks)) {
    errors.push('Response does not contain a tasks array');
    return { valid: false, tasks: [], errors, warnings };
  }

  if (response.tasks.length === 0) {
    warnings.push('No tasks generated by IBM');
  }

  // Create a map of valid acceptance criterion IDs
  const validAcIds = new Set(acceptanceCriteria.map(ac => ac.id));

  // Validate each task
  response.tasks.forEach((task: any, index: number) => {
    const taskErrors: string[] = [];
    const taskWarnings: string[] = [];

    // Validate required fields
    if (!task.taskId || typeof task.taskId !== 'string') {
      taskErrors.push(`Task ${index + 1}: Missing or invalid taskId`);
    } else if (!/^QA-\d+$/.test(task.taskId)) {
      taskWarnings.push(`Task ${task.taskId}: taskId should follow pattern "QA-001", "QA-002", etc.`);
    }

    if (!task.acceptanceCriterionId || typeof task.acceptanceCriterionId !== 'string') {
      taskErrors.push(`Task ${index + 1}: Missing or invalid acceptanceCriterionId`);
    } else if (!validAcIds.has(task.acceptanceCriterionId)) {
      taskErrors.push(`Task ${task.taskId}: acceptanceCriterionId "${task.acceptanceCriterionId}" does not reference a valid acceptance criterion`);
    }

    if (!task.title || typeof task.title !== 'string') {
      taskErrors.push(`Task ${task.taskId || index + 1}: Missing or invalid title`);
    }

    // Validate type
    const validTypes = ['api', 'ui', 'integration', 'manual', 'uncertain'];
    if (!task.type || !validTypes.includes(task.type)) {
      taskErrors.push(`Task ${task.taskId || index + 1}: Invalid type "${task.type}". Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate executionMode
    const validModes = ['automated', 'manual', 'uncertain'];
    if (!task.executionMode || !validModes.includes(task.executionMode)) {
      taskErrors.push(`Task ${task.taskId || index + 1}: Invalid executionMode "${task.executionMode}". Must be one of: ${validModes.join(', ')}`);
    }

    // Validate reasoning
    if (!task.reasoning || typeof task.reasoning !== 'string') {
      taskWarnings.push(`Task ${task.taskId || index + 1}: Missing reasoning`);
    }

    // Check for uncertainReason when type or executionMode is uncertain
    if ((task.type === 'uncertain' || task.executionMode === 'uncertain') && !task.uncertainReason) {
      taskWarnings.push(`Task ${task.taskId || index + 1}: Missing uncertainReason for uncertain task`);
    }

    // If task has errors, skip it
    if (taskErrors.length > 0) {
      errors.push(...taskErrors);
      return;
    }

    // Add warnings
    warnings.push(...taskWarnings);

    // Normalize and add task
    const normalizedTask: QATask = {
      taskId: task.taskId,
      acceptanceCriterionId: task.acceptanceCriterionId,
      title: task.title,
      type: task.type,
      executionMode: task.executionMode,
      priority: task.priority || 'medium',
      reasoning: task.reasoning || 'No reasoning provided',
      uncertainReason: task.uncertainReason,
      preconditions: task.preconditions || [],
      setupData: task.setupData || {},
      steps: task.steps || [],
      expectedResult: task.expectedResult,
    };

    tasks.push(normalizedTask);
  });

  return {
    valid: errors.length === 0,
    tasks,
    errors,
    warnings,
  };
}

/**
 * Generate fallback tasks when IBM fails or returns invalid output
 * 
 * Uses deterministic logic to create basic tasks from acceptance criteria
 * and discovered routes.
 * 
 * @param acceptanceCriteria - List of acceptance criteria
 * @param discoveredRoutes - Routes discovered from the application
 * @returns Array of fallback QA tasks
 */
export function generateFallbackTasks(
  acceptanceCriteria: AcceptanceCriterion[],
  discoveredRoutes: DiscoveredRoute[]
): QATask[] {
  logger.warn('Using deterministic fallback for task generation');

  const tasks: QATask[] = [];

  acceptanceCriteria.forEach((criterion, index) => {
    const taskId = `QA-${String(index + 1).padStart(3, '0')}`;
    const combinedText = criterion.description;

    // Detect resource and action from criterion
    const { action } = detectResourceAndAction(combinedText);

    // Determine task type based on criterion text and routes
    let type: QATask['type'] = 'uncertain';
    let executionMode: QATask['executionMode'] = 'uncertain';
    let reasoning = 'Fallback generation: ';
    let uncertainReason: string | undefined;

    // Check if criterion mentions API/endpoint
    if (/\b(api|endpoint|request|response|status|json)\b/i.test(combinedText)) {
      if (discoveredRoutes.length > 0) {
        type = 'api';
        executionMode = 'automated';
        reasoning += 'Criterion mentions API concepts and routes were discovered. Likely testable via API.';
      } else {
        type = 'uncertain';
        executionMode = 'uncertain';
        reasoning += 'Criterion mentions API concepts but no routes were discovered.';
        uncertainReason = 'No routes discovered to validate API testing approach';
      }
    }
    // Check if criterion mentions UI/browser
    else if (/\b(ui|page|button|click|form|browser|display|show|view)\b/i.test(combinedText)) {
      type = 'ui';
      executionMode = 'manual';
      reasoning += 'Criterion mentions UI concepts. Requires browser interaction.';
      uncertainReason = 'UI automation not configured in fallback mode';
    }
    // Check if criterion mentions multiple systems
    else if (/\b(integration|external|third[- ]party|service|system)\b/i.test(combinedText)) {
      type = 'integration';
      executionMode = 'manual';
      reasoning += 'Criterion mentions integration with external systems.';
      uncertainReason = 'Integration testing requires manual setup and verification';
    }
    // Check if we can infer from action
    else if (action && discoveredRoutes.length > 0) {
      type = 'api';
      executionMode = 'automated';
      reasoning += `Detected ${action} action and routes are available. Likely API testable.`;
    }
    // Default to uncertain
    else {
      type = 'uncertain';
      executionMode = 'uncertain';
      reasoning += 'Cannot determine task type from criterion text. Manual review needed.';
      uncertainReason = 'Insufficient information to classify task type and execution mode';
    }

    // Determine priority based on criterion priority and type
    let priority: QATask['priority'] = criterion.priority || 'medium';
    if (type === 'api' && executionMode === 'automated') {
      priority = 'high'; // Boost priority for automatable API tests
    } else if (type === 'uncertain') {
      priority = 'low'; // Lower priority for uncertain tasks
    }

    // Generate basic steps
    const steps: QATask['steps'] = [
      {
        action: 'Review acceptance criterion',
        description: criterion.description,
        expectedOutcome: 'Understand test requirements',
      },
    ];

    if (type === 'api' && action) {
      steps.push({
        action: `Perform ${action} operation`,
        description: `Execute ${action} via API endpoint`,
        expectedOutcome: 'Operation completes successfully',
      });
    }

    const task: QATask = {
      taskId,
      acceptanceCriterionId: criterion.id,
      title: `Test: ${criterion.description.substring(0, 60)}${criterion.description.length > 60 ? '...' : ''}`,
      type,
      executionMode,
      priority,
      reasoning,
      uncertainReason,
      preconditions: [],
      setupData: {},
      steps,
      expectedResult: criterion.description,
    };

    tasks.push(task);
  });

  return tasks;
}

/**
 * Prioritize tasks based on type, execution mode, and confidence
 * 
 * Priority rules:
 * - High: API tests with discovered routes and clear mapping
 * - Medium: API tests with uncertain routes or UI tests with clear selectors
 * - Low: Integration tests, manual tests, or uncertain tasks
 * 
 * @param tasks - Array of QA tasks to prioritize
 * @returns Sorted array of tasks (high to low priority)
 */
export function prioritizeTasks(tasks: QATask[]): QATask[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  return [...tasks].sort((a, b) => {
    // First sort by priority
    const aPriority = priorityOrder[a.priority || 'medium'];
    const bPriority = priorityOrder[b.priority || 'medium'];

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // Then by execution mode (automated > manual > uncertain)
    const executionOrder = { automated: 3, manual: 2, uncertain: 1 };
    const aExecution = executionOrder[a.executionMode];
    const bExecution = executionOrder[b.executionMode];

    if (aExecution !== bExecution) {
      return bExecution - aExecution;
    }

    // Then by type (api > ui > integration > manual > uncertain)
    const typeOrder = { api: 5, ui: 4, integration: 3, manual: 2, uncertain: 1 };
    const aType = typeOrder[a.type];
    const bType = typeOrder[b.type];

    return bType - aType;
  });
}

/**
 * Generate task summary statistics
 * 
 * @param tasks - Array of QA tasks
 * @returns Summary object with task counts
 */
export function generateTaskSummary(tasks: QATask[]): {
  totalTasks: number;
  automatedTasks: number;
  manualTasks: number;
  uncertainTasks: number;
} {
  return {
    totalTasks: tasks.length,
    automatedTasks: tasks.filter(t => t.executionMode === 'automated').length,
    manualTasks: tasks.filter(t => t.executionMode === 'manual').length,
    uncertainTasks: tasks.filter(t => t.executionMode === 'uncertain').length,
  };
}

/**
 * Save raw IBM output to debug directory
 * 
 * @param output - Raw output from IBM
 * @param debugDir - Debug directory path
 * @param attemptNumber - Attempt number for unique filename
 */
function saveRawOutput(output: string, debugDir: string, attemptNumber: number): void {
  try {
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const filename = `qa-task-plan-raw-${attemptNumber}-${Date.now()}.txt`;
    const filepath = path.join(debugDir, filename);

    fs.writeFileSync(filepath, output, 'utf-8');
    logger.debug(`Saved raw IBM output to ${filepath}`);
  } catch (error) {
    logger.warn('Failed to save raw IBM output', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Generate QA task plan from acceptance criteria
 * 
 * Main function that orchestrates the entire task plan generation process:
 * 1. Attempts to use IBM watsonx for intelligent task generation
 * 2. Validates and normalizes IBM output
 * 3. Falls back to deterministic generation if IBM fails
 * 4. Prioritizes tasks and generates summary
 * 5. Never crashes - always returns a valid task plan
 * 
 * @param acceptanceCriteria - List of acceptance criteria to map to tasks
 * @param discoveredRoutes - Routes discovered from the application
 * @param config - TraceQA configuration
 * @param projectContext - Project information for context
 * @returns Task plan generation result with warnings and metadata
 */
export async function generateQATaskPlan(
  acceptanceCriteria: AcceptanceCriterion[],
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  projectContext: ProjectContext
): Promise<QATaskPlanGenerationResult> {
  const warnings: string[] = [];
  let ibmUsed = false;
  let fallbackUsed = false;
  let tasks: QATask[] = [];

  const debugDir = path.join(process.cwd(), 'traceqa-debug');

  logger.info('Generating QA task plan...');
  logger.debug(`Acceptance criteria: ${acceptanceCriteria.length}, Routes: ${discoveredRoutes.length}`);

  // Validate inputs
  if (acceptanceCriteria.length === 0) {
    warnings.push('No acceptance criteria provided');
    return {
      taskPlan: {
        projectName: projectContext.projectName,
        timestamp: new Date().toISOString(),
        acceptanceCriteria: [],
        tasks: [],
        summary: {
          totalTasks: 0,
          automatedTasks: 0,
          manualTasks: 0,
          uncertainTasks: 0,
        },
      },
      warnings,
      ibmUsed: false,
      fallbackUsed: false,
    };
  }

  // Try IBM watsonx generation
  try {
    if (!config.ibmWatsonxApiKey) {
      throw new Error('IBM watsonx API key not configured');
    }

    logger.info('Using IBM watsonx for task plan generation...');

    const watsonxClient = new WatsonxClient({
      apiKey: config.ibmWatsonxApiKey,
      temperature: 0.3, // Lower temperature for more deterministic output
      maxTokens: 4096,
    });

    const prompt = buildQATaskPlanPrompt(acceptanceCriteria, discoveredRoutes, projectContext);
    const response = await watsonxClient.sendMessage(prompt);

    // Save raw response for debugging
    saveRawOutput(response, debugDir, 1);

    // Try to extract JSON from response
    const extractionResult = safeExtractJSON(response, {
      saveRawOnFailure: true,
      attemptRepair: false,
    });

    if (!extractionResult.success) {
      logger.warn('Failed to extract JSON from IBM response');
      warnings.push('IBM returned invalid JSON format');

      // Try balanced JSON extraction as fallback
      const extracted = extractJSON(response);
      if (extracted) {
        logger.info('Successfully extracted JSON using balanced extraction');
        const validation = validateIBMTaskPlanResponse(extracted, acceptanceCriteria);

        if (validation.valid && validation.tasks.length > 0) {
          tasks = validation.tasks;
          ibmUsed = true;
          warnings.push(...validation.warnings);
          logger.success(`IBM generated ${tasks.length} tasks (with JSON repair)`);
        } else {
          warnings.push(...validation.errors, ...validation.warnings);
          throw new Error('IBM response validation failed after JSON repair');
        }
      } else {
        throw new Error('Could not extract valid JSON from IBM response');
      }
    } else {
      // Validate IBM response
      const validation = validateIBMTaskPlanResponse(extractionResult.data, acceptanceCriteria);

      if (validation.valid && validation.tasks.length > 0) {
        tasks = validation.tasks;
        ibmUsed = true;
        warnings.push(...validation.warnings);
        logger.success(`IBM generated ${tasks.length} tasks`);
      } else {
        warnings.push(...validation.errors, ...validation.warnings);
        throw new Error('IBM response validation failed');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`IBM generation failed: ${errorMessage}`);
    warnings.push(`IBM generation failed: ${errorMessage}`);

    // Use deterministic fallback
    logger.info('Falling back to deterministic task generation...');
    tasks = generateFallbackTasks(acceptanceCriteria, discoveredRoutes);
    fallbackUsed = true;
    logger.success(`Fallback generated ${tasks.length} tasks`);
  }

  // Prioritize tasks
  tasks = prioritizeTasks(tasks);

  // Generate summary
  const summary = generateTaskSummary(tasks);

  // Create task plan
  const taskPlan: QATaskPlan = {
    projectName: projectContext.projectName,
    timestamp: new Date().toISOString(),
    acceptanceCriteria,
    tasks,
    summary,
  };

  logger.success('QA task plan generated successfully');
  logger.info(`Summary: ${summary.totalTasks} total, ${summary.automatedTasks} automated, ${summary.manualTasks} manual, ${summary.uncertainTasks} uncertain`);

  return {
    taskPlan,
    warnings,
    ibmUsed,
    fallbackUsed,
  };
}

// Made with Bob