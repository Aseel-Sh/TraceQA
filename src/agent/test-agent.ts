/**
 * TraceQA Test Agent
 * Main intelligent agent that orchestrates test planning, execution, and reporting
 */

import { WatsonxClient } from './watsonx-client.js';
import { DecisionEngine } from './decision-engine.js';
import {
  SYSTEM_PROMPT,
  getTestPlanningPrompt,
  getTestExecutionPrompt,
  getReportGenerationPrompt
} from './prompts.js';
import { parseJSONSafely, safeExtractJSON, ExtractionResult } from '../utils/json-extractor.js';
import fs from 'fs-extra';
import path from 'path';
import {
  AgentConfig,
  AgentState,
  TestContext,
  TestPlan,
  TestCase,
  TestResult,
  TestResults,
  TestSummary,
  AgentAnalysis,
  ConversationMessage,
  TokenUsage,
  TraceQAError,
  ErrorCategory,
  TestType,
  DiffAnalysis
} from '../types/index.js';
import { RouteDiscoveryResult } from '../discovery/route-discovery.js';
import { MCPClientManager } from '../mcp/index.js';
import { logger } from '../utils/logger.js';

/**
 * Main test agent for TraceQA
 */
export class TestAgent {
  private watsonxClient: WatsonxClient;
  private decisionEngine: DecisionEngine;
  private mcpManager: MCPClientManager | null = null;
  private state: AgentState;
  
  // Generation metrics (Issue #9)
  private generationMetrics = {
    totalAttempts: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    retriesAttempted: 0,
    retriesSucceeded: 0,
    compactRetriesAttempted: 0,
    compactRetriesSucceeded: 0,
    uncertainMarked: 0,
    averageResponseLength: 0,
    responseLengthCount: 0,
    errorTypes: {} as Record<string, number>
  };

  constructor(config: AgentConfig, mcpManager?: MCPClientManager) {
    // Initialize Watsonx client with system prompt
    this.watsonxClient = new WatsonxClient({
      ...config,
      systemPrompt: config.systemPrompt || SYSTEM_PROMPT
    });

    this.decisionEngine = new DecisionEngine();
    this.mcpManager = mcpManager || null;

    // Initialize agent state
    this.state = {
      currentPhase: 'idle',
      conversationHistory: [],
      executedTests: [],
      pendingDecisions: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      },
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    logger.info('Test agent initialized');
  }

  /**
   * Set MCP manager for test execution
   */
  setMCPManager(manager: MCPClientManager): void {
    this.mcpManager = manager;
    logger.debug('MCP manager set for test agent');
  }

  /**
   * Generate QA task suggestions from IBM watsonx with AC drift detection (Issue #8)
   * Returns AI suggestions array instead of complete test plan
   */
  async generateTests(
    acceptanceCriteria: any[],
    routes: any[],
    baseUrl: string
  ): Promise<any[]> {
    logger.info('Generating QA task suggestions from IBM watsonx...');
    this.generationMetrics.totalAttempts++;
    
    try {
      const prompt = this.buildPrompt(acceptanceCriteria, routes, baseUrl);
      const response = await this.watsonxClient.sendMessage(prompt);
      
      // Track response length
      this.updateAverageResponseLength(response.length);
      
      // Log response metadata for debugging
      logger.debug(`Response length: ${response.length} chars`);
      logger.debug(`Response preview: ${response.substring(0, 100)}...`);
      
      // Use robust JSON extraction
      const extractionResult: ExtractionResult = safeExtractJSON(response, {
        saveRawOnFailure: true
      });
      
      if (!extractionResult.success) {
        this.generationMetrics.failedExtractions++;
        this.trackErrorType(extractionResult.errorDetails?.type || 'UNKNOWN');
        
        logger.warn('Failed to extract JSON from IBM response - attempting compact retry');
        logger.debug(`Extraction error: ${extractionResult.error}`);
        if (extractionResult.errorDetails) {
          logger.debug(`Error details: ${JSON.stringify(extractionResult.errorDetails)}`);
        }
        
        // Save raw output for debugging
        if (extractionResult.rawText) {
          await this.saveRawResponse(extractionResult.rawText, 'malformed-json-attempt-1');
        }
        
        // Retry with compact prompt (Issue #9: handle malformed/truncated JSON)
        try {
          this.generationMetrics.compactRetriesAttempted++;
          
          logger.info('Retrying with compact prompt to avoid truncation...');
          const compactPrompt = this.buildCompactPrompt(acceptanceCriteria, routes, baseUrl);
          const compactResponse = await this.watsonxClient.sendMessage(compactPrompt);
          
          this.updateAverageResponseLength(compactResponse.length);
          logger.debug(`Compact response length: ${compactResponse.length} chars`);
          
          const compactExtraction: ExtractionResult = safeExtractJSON(compactResponse, {
            saveRawOnFailure: true
          });
          
          if (compactExtraction.success) {
            this.generationMetrics.compactRetriesSucceeded++;
            this.generationMetrics.successfulExtractions++;
            
            logger.success('✓ Compact retry succeeded - extracted valid JSON');
            
            // Validate the compact response
            const compactData = compactExtraction.data;
            const compactSuggestions = Array.isArray(compactData) ? compactData : [compactData];
            
            if (this.validateJSONStructure(compactSuggestions)) {
              // Mark remaining ACs as uncertain since we only got one
              const remainingACs = acceptanceCriteria.slice(1);
              for (const ac of remainingACs) {
                compactSuggestions.push({
                  acceptanceCriterionId: ac.id,
                  title: `Test ${ac.id}`,
                  type: 'uncertain',
                  priority: 'medium',
                  executionMode: 'uncertain',
                  steps: [],
                  expectedResult: ac.expectedResult || 'Not specified',
                  reasoning: 'Generated from compact prompt',
                  uncertainReason: 'Original response was malformed/truncated - generated minimal test'
                });
              }
              
              return compactSuggestions;
            }
          }
          
          // Compact retry also failed
          logger.error('Compact retry failed to extract valid JSON');
          if (compactExtraction.rawText) {
            await this.saveRawResponse(compactExtraction.rawText, 'malformed-json-attempt-2');
          }
        } catch (retryError) {
          logger.error('Compact retry threw error:', retryError);
        }
        
        // Both attempts failed - mark all as uncertain
        this.generationMetrics.uncertainMarked += acceptanceCriteria.length;
        
        logger.warn('All JSON extraction attempts failed - marking tests as uncertain');
        this.logGenerationMetrics();
        
        return acceptanceCriteria.map(ac => ({
          acceptanceCriterionId: ac.id,
          title: `Test ${ac.id}`,
          type: 'uncertain',
          priority: 'medium',
          executionMode: 'uncertain',
          steps: [],
          expectedResult: ac.expectedResult || 'Not specified',
          reasoning: 'Could not generate from IBM',
          uncertainReason: 'JSON parsing failed after multiple attempts - response was malformed or truncated'
        }));
      }
      
      // Successful extraction
      this.generationMetrics.successfulExtractions++;
      
      // Validate extracted data
      const data = extractionResult.data;
      
      // Handle both array and object responses
      let suggestions: any[] = [];
      
      if (Array.isArray(data)) {
        suggestions = data;
      } else if (data && typeof data === 'object') {
        // Check for common response structures
        if (Array.isArray(data.tasks)) {
          suggestions = data.tasks;
        } else if (Array.isArray(data.testCases)) {
          suggestions = data.testCases;
        } else if (Array.isArray(data.tests)) {
          suggestions = data.tests;
        } else {
          // Single task/test object
          suggestions = [data];
        }
      }
      
      // Validate AC alignment for each suggestion (Issue #8)
      const validatedSuggestions: any[] = [];
      let hasDrift = false;
      let driftReasons: string[] = [];
      
      for (const suggestion of suggestions) {
        // Find matching AC
        const matchingAC = acceptanceCriteria.find(
          ac => ac.id === suggestion.acceptanceCriterionId || ac.id === suggestion.criterionId
        );
        
        if (!matchingAC) {
          logger.warn(`No matching AC found for suggestion with ID: ${suggestion.acceptanceCriterionId || suggestion.criterionId}`);
          hasDrift = true;
          driftReasons.push(`No matching AC for ${suggestion.acceptanceCriterionId || suggestion.criterionId}`);
          continue;
        }
        
        // Detect drift
        const driftCheck = this.detectACDrift(
          suggestion,
          matchingAC.id,
          matchingAC.description || matchingAC.criterion
        );
        
        if (driftCheck.hasDrift) {
          logger.warn(`AC drift detected for ${matchingAC.id}: ${driftCheck.reason}`);
          hasDrift = true;
          driftReasons.push(`${matchingAC.id}: ${driftCheck.reason}`);
        } else {
          validatedSuggestions.push(suggestion);
        }
      }
      
      // If drift detected, retry once with stronger prompt
      if (hasDrift && validatedSuggestions.length < acceptanceCriteria.length) {
        this.generationMetrics.retriesAttempted++;
        
        logger.warn('AC drift detected, retrying with stronger prompt...');
        logger.debug(`Drift reasons: ${driftReasons.join('; ')}`);
        
        const retryPrompt = this.buildRetryPrompt(
          acceptanceCriteria,
          routes,
          baseUrl,
          suggestions,
          driftReasons.join('; ')
        );
        
        const retryResponse = await this.watsonxClient.sendMessage(retryPrompt);
        const retryExtraction: ExtractionResult = safeExtractJSON(retryResponse, {
          saveRawOnFailure: true
        });
        
        if (retryExtraction.success) {
          this.generationMetrics.retriesSucceeded++;
          
          let retrySuggestions: any[] = [];
          const retryData = retryExtraction.data;
          
          if (Array.isArray(retryData)) {
            retrySuggestions = retryData;
          } else if (retryData && typeof retryData === 'object') {
            if (Array.isArray(retryData.tasks)) {
              retrySuggestions = retryData.tasks;
            } else if (Array.isArray(retryData.testCases)) {
              retrySuggestions = retryData.testCases;
            } else if (Array.isArray(retryData.tests)) {
              retrySuggestions = retryData.tests;
            } else {
              retrySuggestions = [retryData];
            }
          }
          
          // Validate retry suggestions
          for (const suggestion of retrySuggestions) {
            const matchingAC = acceptanceCriteria.find(
              ac => ac.id === suggestion.acceptanceCriterionId || ac.id === suggestion.criterionId
            );
            
            if (matchingAC) {
              const driftCheck = this.detectACDrift(
                suggestion,
                matchingAC.id,
                matchingAC.description || matchingAC.criterion
              );
              
              if (!driftCheck.hasDrift) {
                // Replace or add validated suggestion
                const existingIndex = validatedSuggestions.findIndex(
                  s => s.acceptanceCriterionId === suggestion.acceptanceCriterionId
                );
                if (existingIndex >= 0) {
                  validatedSuggestions[existingIndex] = suggestion;
                } else {
                  validatedSuggestions.push(suggestion);
                }
                logger.success(`✓ Retry successful for ${matchingAC.id}`);
              } else {
                logger.warn(`Retry still has drift for ${matchingAC.id}: ${driftCheck.reason}`);
                // Mark as uncertain
                this.generationMetrics.uncertainMarked++;
                validatedSuggestions.push({
                  ...suggestion,
                  executionMode: 'uncertain',
                  uncertainReason: `AC drift detected after retry: ${driftCheck.reason}`
                });
              }
            }
          }
        } else {
          logger.warn('Retry failed to extract JSON, using original validated suggestions');
        }
      }
      
      logger.success(`✓ Extracted ${validatedSuggestions.length} validated QA task suggestions from IBM`);
      if (hasDrift) {
        logger.info(`Note: ${driftReasons.length} suggestions had AC drift issues`);
      }
      
      // Log metrics summary
      this.logGenerationMetrics();
      
      return validatedSuggestions;
      
    } catch (error) {
      logger.error('Error generating tests from IBM:', error);
      
      // Return empty array - fallback mapper will handle it
      logger.info('Falling back to deterministic test generation');
      return [];
    }
  }

  /**
   * Build prompt for QA task suggestions with strong AC enforcement
   */
  private buildPrompt(
    acceptanceCriteria: any[],
    routes: any[],
    baseUrl: string
  ): string {
    const prompt = `You are a QA automation expert. Analyze the following acceptance criteria and API routes to suggest QA tasks.

CRITICAL INSTRUCTIONS - AC ALIGNMENT:
- You MUST generate exactly ONE task per acceptance criterion
- Each task MUST directly validate its assigned acceptance criterion
- Do NOT generate tests for different acceptance criteria or unrelated scenarios
- Do NOT let AC-4 become a different validation test unrelated to the original AC
- Include the AC ID in your response to confirm alignment
- The test description must match the AC intent

Acceptance Criteria:
${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description || ac.criterion}
   Expected: ${ac.expectedResult || 'Not specified'}`).join('\n')}

Discovered API Routes:
${routes.map(r => `- ${r.method} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')}

Base URL: ${baseUrl}

For each acceptance criterion, suggest a QA task with:
- acceptanceCriterionId: The AC ID (e.g., "AC-1") - MUST match the criterion being tested
- title: Clear task title that reflects the AC description
- type: "api", "ui", "integration", "manual", or "uncertain"
- priority: "high", "medium", or "low"
- executionMode: "automated", "manual", or "uncertain"
- steps: Array of test steps with description and expectedOutcome
- expectedResult: What should happen (must align with AC expected result)
- reasoning: Why this task maps to the AC (explain the connection)
- uncertainReason: (optional) Why automation is uncertain

VALIDATION CHECKLIST:
✓ Each task's acceptanceCriterionId matches the AC it tests
✓ Task title relates to AC description
✓ Expected result aligns with AC expected result
✓ Test validates the specific AC, not a different one

RESPONSE FORMAT REQUIREMENTS (CRITICAL):
⚠️ Return ONLY valid JSON - no explanatory text before or after
⚠️ Keep response compact to avoid truncation (prefer 1-2 tests per response)
⚠️ Do NOT include markdown code blocks or formatting
⚠️ Ensure JSON is complete with all brackets/braces properly closed
⚠️ Use compact field values - avoid verbose descriptions
⚠️ If response might be too long, generate fewer tests and mark others as "uncertain"

Example format:
[
  {
    "acceptanceCriterionId": "AC-1",
    "title": "Test user registration with valid data",
    "type": "api",
    "priority": "high",
    "executionMode": "automated",
    "steps": [
      {
        "description": "Send POST request to /api/register with valid user data",
        "expectedOutcome": "User is created successfully"
      }
    ],
    "expectedResult": "User registration succeeds with 201 status",
    "reasoning": "AC-1 requires testing successful registration - this test directly validates that requirement"
  }
]

IMPORTANT: Respond with ONLY the JSON array. No explanations, no markdown, no extra text.`;

    return prompt;
  }

  /**
   * Detect if generated test has drifted from assigned AC (Issue #8)
   */
  private detectACDrift(
    generatedTask: any,
    expectedACId: string,
    expectedACText: string
  ): { hasDrift: boolean; reason?: string } {
    // Check 1: AC ID mismatch
    if (generatedTask.acceptanceCriterionId !== expectedACId) {
      return {
        hasDrift: true,
        reason: `AC ID mismatch: expected ${expectedACId}, got ${generatedTask.acceptanceCriterionId}`
      };
    }

    // Check 2: Task title/description unrelated to AC
    const taskText = (generatedTask.title || '').toLowerCase();
    const acText = expectedACText.toLowerCase();
    
    // Extract key terms from AC (ignore common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall'];
    const acWords = acText.split(/\s+/).filter(w => w.length > 3 && !commonWords.includes(w));
    
    // Check if task contains at least some key terms from AC
    const matchingWords = acWords.filter(word => taskText.includes(word));
    const matchRatio = acWords.length > 0 ? matchingWords.length / acWords.length : 0;
    
    if (matchRatio < 0.2 && acWords.length > 2) {
      return {
        hasDrift: true,
        reason: `Task description unrelated to AC: "${generatedTask.title}" does not match "${expectedACText}"`
      };
    }

    // Check 3: Expected result mismatch
    if (generatedTask.expectedResult) {
      const taskExpected = generatedTask.expectedResult.toLowerCase();
      const acExpected = (expectedACText.match(/expected:?\s*(.+)/i)?.[1] || '').toLowerCase();
      
      if (acExpected && taskExpected && !taskExpected.includes(acExpected.substring(0, 20))) {
        // Only flag if AC has explicit expected result and task result is completely different
        const expectedWords = acExpected.split(/\s+/).filter(w => w.length > 3 && !commonWords.includes(w));
        const matchingExpected = expectedWords.filter(word => taskExpected.includes(word));
        const expectedMatchRatio = expectedWords.length > 0 ? matchingExpected.length / expectedWords.length : 1;
        
        if (expectedMatchRatio < 0.2 && expectedWords.length > 2) {
          return {
            hasDrift: true,
            reason: `Expected result mismatch: task expects "${generatedTask.expectedResult}" but AC expects "${acExpected}"`
          };
        }
      }
    }

    // Check 4: Test validates different functionality
    // Look for contradictory keywords
    const contradictions = [
      { ac: ['create', 'add', 'register'], task: ['delete', 'remove', 'unregister'] },
      { ac: ['update', 'modify', 'edit'], task: ['create', 'add', 'delete'] },
      { ac: ['delete', 'remove'], task: ['create', 'add', 'update'] },
      { ac: ['get', 'retrieve', 'fetch', 'read'], task: ['create', 'update', 'delete', 'post', 'put'] },
      { ac: ['valid', 'success', 'accept'], task: ['invalid', 'error', 'reject', 'fail'] },
      { ac: ['invalid', 'error', 'reject', 'fail'], task: ['valid', 'success', 'accept'] }
    ];

    for (const { ac: acKeywords, task: taskKeywords } of contradictions) {
      const hasACKeyword = acKeywords.some(kw => acText.includes(kw));
      const hasTaskKeyword = taskKeywords.some(kw => taskText.includes(kw));
      
      if (hasACKeyword && hasTaskKeyword) {
        return {
          hasDrift: true,
          reason: `Contradictory functionality: AC involves ${acKeywords.join('/')} but task involves ${taskKeywords.join('/')}`
        };
      }
    }

    return { hasDrift: false };
  }

  /**
   * Build retry prompt with stronger AC enforcement
   */
  private buildRetryPrompt(
    acceptanceCriteria: any[],
    routes: any[],
    baseUrl: string,
    previousAttempt: any,
    driftReason: string
  ): string {
    const prompt = `RETRY: Previous response drifted from acceptance criteria.

DRIFT DETECTED: ${driftReason}

You MUST stay focused on the assigned acceptance criteria. Do NOT generate tests for different scenarios.

Acceptance Criteria:
${acceptanceCriteria.map((ac, i) => `${i + 1}. [${ac.id}] ${ac.description || ac.criterion}
   Expected: ${ac.expectedResult || 'Not specified'}`).join('\n')}

Discovered API Routes:
${routes.map(r => `- ${r.method} ${r.path}${r.description ? ` (${r.description})` : ''}`).join('\n')}

Base URL: ${baseUrl}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ONE task per acceptance criterion
2. Each task MUST validate its assigned AC, not a different one
3. Task title MUST reflect the AC description
4. Expected result MUST align with AC expected result
5. Include acceptanceCriterionId to confirm alignment

For each acceptance criterion, suggest a QA task with:
- acceptanceCriterionId: The AC ID (MUST match the criterion)
- title: Task title that reflects the AC
- type: "api", "ui", "integration", "manual", or "uncertain"
- priority: "high", "medium", or "low"
- executionMode: "automated", "manual", or "uncertain"
- steps: Array of test steps
- expectedResult: What should happen (must align with AC)
- reasoning: Explain how this task validates the specific AC

RESPONSE FORMAT: Return ONLY valid JSON array. No markdown, no explanations, no extra text.`;

    return prompt;
  }

  /**
   * Build a compact prompt for JSON parsing retry (when first response was malformed)
   */
  private buildCompactPrompt(
    acceptanceCriteria: any[],
    routes: any[],
    baseUrl: string
  ): string {
    // Generate for only the first AC to keep response short
    const firstAC = acceptanceCriteria[0];
    
    const prompt = `Generate ONE QA test task for this acceptance criterion:

AC: [${firstAC.id}] ${firstAC.description || firstAC.criterion}
Expected: ${firstAC.expectedResult || 'Not specified'}

Routes: ${routes.slice(0, 3).map(r => `${r.method} ${r.path}`).join(', ')}
Base URL: ${baseUrl}

Required fields:
- acceptanceCriterionId: "${firstAC.id}"
- title: Brief test title
- type: "api" or "uncertain"
- priority: "high", "medium", or "low"
- executionMode: "automated" or "uncertain"
- steps: [{"description": "step", "expectedOutcome": "outcome"}]
- expectedResult: Brief expected result
- reasoning: Brief reason

CRITICAL: Return ONLY valid JSON array with ONE object. Keep it SHORT to avoid truncation.
Example: [{"acceptanceCriterionId":"${firstAC.id}","title":"Test ${firstAC.id}","type":"api","priority":"high","executionMode":"automated","steps":[{"description":"Test step","expectedOutcome":"Expected outcome"}],"expectedResult":"Result","reasoning":"Validates ${firstAC.id}"}]`;

    return prompt;
  }

  /**
   * Save raw response for debugging
   */
  private async saveRawResponse(rawText: string, label?: string): Promise<void> {
    try {
      const debugDir = 'traceqa-debug';
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure debug directory exists
      try {
        await fs.mkdir(debugDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }
      
      const timestamp = Date.now();
      const labelPart = label ? `-${label}` : '';
      const filename = `raw-ibm-response${labelPart}-${timestamp}.txt`;
      const filepath = path.join(debugDir, filename);
      
      await fs.writeFile(filepath, rawText, 'utf-8');
      logger.info(`Raw IBM response saved to ${filepath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to save raw response: ${errorMsg}`);
    }
  }

  /**
   * Validate JSON structure has required fields
   */
  private validateJSONStructure(suggestions: any[]): boolean {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      logger.debug('JSON validation failed: not an array or empty');
      return false;
    }

    for (const suggestion of suggestions) {
      // Check required fields
      if (!suggestion.acceptanceCriterionId) {
        logger.debug('JSON validation failed: missing acceptanceCriterionId');
        return false;
      }
      if (!suggestion.title) {
        logger.debug('JSON validation failed: missing title');
        return false;
      }
      if (!suggestion.type) {
        logger.debug('JSON validation failed: missing type');
        return false;
      }
      if (!suggestion.executionMode) {
        logger.debug('JSON validation failed: missing executionMode');
        return false;
      }
      
      // Validate steps array if present
      if (suggestion.steps && !Array.isArray(suggestion.steps)) {
        logger.debug('JSON validation failed: steps is not an array');
        return false;
      }
    }

    logger.debug(`JSON validation passed for ${suggestions.length} suggestions`);
    return true;
  }

  /**
   * Create a comprehensive test plan based on context
   */
  async createTestPlan(
    context: TestContext,
    diffAnalysis?: DiffAnalysis | null,
    discoveredRoutes?: RouteDiscoveryResult | null
  ): Promise<TestPlan> {
    this.updatePhase('planning');
    logger.info('Creating test plan...');

    try {
      // Generate test planning prompt with optional diff analysis and discovered routes
      const prompt = getTestPlanningPrompt(context, diffAnalysis, discoveredRoutes);

      // Get response from Watsonx
      const response = await this.watsonxClient.sendMessage(prompt);

      // Parse test plan from response with repair
      const parsedPlan = await this.parseTestPlanWithRepair(response);

      if (!parsedPlan || !parsedPlan.testCases) {
        throw new TraceQAError(
          'Failed to parse test plan from agent response',
          ErrorCategory.AGENT,
          { response }
        );
      }

      // Validate test plan structure
      this.validateTestPlan(parsedPlan);

      // Create test plan
      const testPlan: TestPlan = {
        id: `plan-${Date.now()}`,
        testCases: parsedPlan.testCases,
        estimatedDuration: parsedPlan.estimatedDuration,
        requiredResources: parsedPlan.requiredResources,
        createdAt: new Date().toISOString()
      };

      // Prioritize test cases
      testPlan.testCases = this.decisionEngine.prioritizeTests(
        testPlan.testCases,
        context
      );

      this.state.testPlan = testPlan;
      this.updateTokenUsage();

      logger.success(
        `Test plan created with ${testPlan.testCases.length} test cases (estimated ${testPlan.estimatedDuration}s)`
      );
      logger.debug(`Reasoning: ${parsedPlan.reasoning}`);

      return testPlan;
    } catch (error) {
      logger.error('Failed to create test plan:', error);
      throw new TraceQAError(
        'Failed to create test plan',
        ErrorCategory.AGENT,
        error
      );
    }
  }

  /**
   * Parse test plan with repair attempts
   */
  private async parseTestPlanWithRepair(
    rawResponse: string,
    attempt: number = 1
  ): Promise<{
    testCases: TestCase[];
    estimatedDuration: number;
    requiredResources: string[];
    reasoning: string;
  } | null> {
    // Try balanced JSON extraction first
    const parsed = parseJSONSafely<{
      testCases: TestCase[];
      estimatedDuration: number;
      requiredResources: string[];
      reasoning: string;
    }>(rawResponse);
    
    if (parsed && this.validateTestPlanStructure(parsed)) {
      logger.debug('Successfully parsed test plan using balanced extraction');
      return parsed;
    }

    // Save raw response for debugging
    try {
      const debugDir = path.join(process.cwd(), 'traceqa-debug');
      await fs.ensureDir(debugDir);
      await fs.writeFile(
        path.join(debugDir, `raw-response-attempt-${attempt}.txt`),
        rawResponse,
        'utf-8'
      );
      logger.info(`Raw AI response saved to: traceqa-debug/raw-response-attempt-${attempt}.txt`);
    } catch (err) {
      logger.warn(`Failed to save debug response: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Try one repair pass if first attempt failed
    if (attempt === 1) {
      logger.warn('Initial JSON parsing failed, attempting repair...');
      
      const repairPrompt = `The following response contains invalid JSON. Please return ONLY valid JSON with no markdown, no prose, no code fences, no commentary:

${rawResponse}

Return valid JSON only:`;

      const repairedResponse = await this.watsonxClient.sendMessage(repairPrompt, {
        maxTokens: 4000,
        temperature: 0.1,
      });

      return this.parseTestPlanWithRepair(repairedResponse, 2);
    }

    throw new TraceQAError(
      'Failed to parse test plan after repair attempt',
      ErrorCategory.AGENT,
      { rawResponse: rawResponse.substring(0, 500) }
    );
  }

  /**
   * Validate test plan structure (returns boolean for use in parseJSONSafely)
   */
  private validateTestPlanStructure(plan: any): boolean {
    return !!(
      plan &&
      plan.testCases &&
      Array.isArray(plan.testCases) &&
      typeof plan.estimatedDuration === 'number' &&
      plan.requiredResources &&
      Array.isArray(plan.requiredResources)
    );
  }

  /**
   * Validate test plan structure
   */
  private validateTestPlan(plan: any): void {
    const errors: string[] = [];

    if (!plan.testCases || !Array.isArray(plan.testCases)) {
      errors.push('testCases must be an array');
    } else {
      plan.testCases.forEach((tc: any, index: number) => {
        if (!tc.id) errors.push(`Test case ${index}: missing id`);
        if (!tc.name) errors.push(`Test case ${index}: missing name`);
        if (!tc.type) errors.push(`Test case ${index}: missing type`);
        if (!tc.steps || !Array.isArray(tc.steps)) {
          errors.push(`Test case ${index}: steps must be an array`);
        }
      });
    }

    if (typeof plan.estimatedDuration !== 'number') {
      errors.push('estimatedDuration must be a number');
    }

    if (!plan.requiredResources || !Array.isArray(plan.requiredResources)) {
      errors.push('requiredResources must be an array');
    }

    if (errors.length > 0) {
      logger.error('Test plan validation failed:', errors);
      throw new TraceQAError(
        'Test plan validation failed',
        ErrorCategory.AGENT,
        { validationErrors: errors }
      );
    }

    logger.debug('Test plan validation passed');
  }

  /**
   * Execute all tests in the test plan
   */
  async executeTests(
    testPlan: TestPlan,
    context: TestContext
  ): Promise<TestResults> {
    this.updatePhase('executing');
    logger.info(`Executing ${testPlan.testCases.length} test cases...`);

    const results: TestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < testPlan.testCases.length; i++) {
      const testCase = testPlan.testCases[i];
      logger.info(`[${i + 1}/${testPlan.testCases.length}] Executing: ${testCase.name}`);

      // Execute test case
      const result = await this.executeTestCase(testCase, context);
      results.push(result);
      this.state.executedTests.push(result);

      // Analyze result and decide next action
      const decision = this.decisionEngine.analyzeTestResult(
        result,
        testCase,
        context
      );
      this.state.pendingDecisions.push(decision);

      // Handle decision
      if (decision.requiresHumanInput) {
        logger.warn('Human input required:', decision.reasoning);
        // In a real implementation, this would pause and wait for human input
        // For now, we'll continue
      }

      if (decision.action === 'retry' && !result.passed) {
        logger.info('Retrying test case...');
        const retryResult = await this.executeTestCase(testCase, context);
        results[results.length - 1] = retryResult;
        this.state.executedTests[this.state.executedTests.length - 1] = retryResult;
      }

      if (decision.action === 'abort') {
        logger.warn('Test execution aborted:', decision.reasoning);
        break;
      }

      // Check if we should continue
      const remainingTests = testPlan.testCases.slice(i + 1);
      const continueDecision = this.decisionEngine.shouldContinueExecution(
        results,
        remainingTests,
        context
      );

      if (continueDecision.action === 'ask_human') {
        logger.warn('Execution paused for human decision:', continueDecision.reasoning);
        // In a real implementation, wait for human input
      }
    }

    const duration = Date.now() - startTime;

    // Generate summary
    const summary: TestSummary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: testPlan.testCases.length - results.length,
      duration,
      successRate: results.length > 0 ? results.filter(r => r.passed).length / results.length : 0
    };

    logger.success(
      `Test execution completed: ${summary.passed}/${summary.total} passed (${(summary.successRate * 100).toFixed(1)}%)`
    );

    return {
      summary,
      results,
      duration,
      timestamp: new Date().toISOString(),
      repository: context.repository,
      testPlan
    };
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(
    testCase: TestCase,
    context: TestContext
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      logger.debug(`Executing test case: ${testCase.name}`);

      // For UI tests, we need MCP manager
      if (testCase.type === TestType.WEB_UI && !this.mcpManager) {
        throw new TraceQAError(
          'MCP manager required for UI tests',
          ErrorCategory.AGENT
        );
      }

      // Generate execution prompt
      const stepsDescription = testCase.steps
        .map((step, i) => `${i + 1}. ${step.description} (${step.action} ${step.target || ''})`)
        .join('\n');

      const prompt = getTestExecutionPrompt(
        testCase.name,
        stepsDescription,
        context
      );

      // Get execution guidance from Watsonx
      const response = await this.watsonxClient.sendMessage(prompt);

      // Execute steps (simplified - in real implementation, would use MCP)
      const passed = await this.executeSteps(testCase, context);

      const duration = Date.now() - startTime;

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed,
        duration,
        message: passed ? 'Test passed successfully' : 'Test failed',
        timestamp: new Date().toISOString(),
        logs: [response]
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Test case failed: ${testCase.name}`, error);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        duration,
        message: 'Test execution error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute test steps (simplified implementation)
   */
  private async executeSteps(
    testCase: TestCase,
    _context: TestContext
  ): Promise<boolean> {
    // This is a simplified implementation
    // In a real implementation, this would:
    // 1. Use MCP to execute browser actions
    // 2. Make API calls for API tests
    // 3. Verify results at each step
    // 4. Handle errors and retries

    logger.debug(`Executing ${testCase.steps.length} steps for ${testCase.name}`);

    // Note: Actual test execution is now handled by TestCoordinator
    // which delegates to APITester or WebTester based on test type.
    // This method is kept for backward compatibility but should not be used directly.
    
    logger.warn('executeTestCase called directly - tests should be executed via TestCoordinator');
    
    // Return false to indicate this path should not be used
    return false;
  }

  /**
   * Analyze test results and generate insights
   */
  async analyzeResults(
    results: TestResults,
    context: TestContext
  ): Promise<AgentAnalysis> {
    this.updatePhase('analyzing');
    logger.info('Analyzing test results...');

    try {
      const analysis = this.decisionEngine.analyzeResults(
        results.results,
        context
      );

      this.updateTokenUsage();

      logger.success('Test results analyzed');
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze results:', error);
      throw new TraceQAError(
        'Failed to analyze test results',
        ErrorCategory.AGENT,
        error
      );
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(
    results: TestResults,
    _analysis: AgentAnalysis,
    context: TestContext
  ): Promise<string> {
    this.updatePhase('reporting');
    logger.info('Generating test report...');

    try {
      const resultsText = results.results
        .map(r => `- ${r.testCaseName}: ${r.passed ? 'PASSED' : 'FAILED'} (${r.duration}ms)`)
        .join('\n');

      const summaryText = `
Total: ${results.summary.total}
Passed: ${results.summary.passed}
Failed: ${results.summary.failed}
Success Rate: ${(results.summary.successRate * 100).toFixed(1)}%
Duration: ${results.duration}ms
      `.trim();

      const prompt = getReportGenerationPrompt(resultsText, summaryText, context);

      const report = await this.watsonxClient.sendMessage(prompt);

      this.updateTokenUsage();

      logger.success('Test report generated');
      return report;
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw new TraceQAError(
        'Failed to generate test report',
        ErrorCategory.AGENT,
        error
      );
    }
  }

  /**
   * Run complete test cycle: plan, execute, analyze, report
   */
  async runTestCycle(context: TestContext): Promise<{
    testPlan: TestPlan;
    results: TestResults;
    analysis: AgentAnalysis;
    report: string;
  }> {
    logger.info('Starting complete test cycle...');

    try {
      // Create test plan
      const testPlan = await this.createTestPlan(context);

      // Execute tests
      const results = await this.executeTests(testPlan, context);

      // Analyze results
      const analysis = await this.analyzeResults(results, context);

      // Generate report
      const report = await this.generateReport(results, analysis, context);

      this.updatePhase('idle');

      logger.success('Test cycle completed successfully');

      return {
        testPlan,
        results,
        analysis,
        report
      };
    } catch (error) {
      logger.error('Test cycle failed:', error);
      this.updatePhase('idle');
      throw error;
    }
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): TokenUsage {
    return this.watsonxClient.getTokenUsage();
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ConversationMessage[] {
    return this.watsonxClient.getHistory();
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.watsonxClient.clearHistory();
    this.watsonxClient.resetTokenUsage();
    this.decisionEngine.reset();

    this.state = {
      currentPhase: 'idle',
      conversationHistory: [],
      executedTests: [],
      pendingDecisions: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      },
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    logger.info('Agent state reset');
  }

  /**
   * Update current phase
   */
  private updatePhase(phase: AgentState['currentPhase']): void {
    this.state.currentPhase = phase;
    this.state.lastActivity = new Date().toISOString();
    logger.debug(`Agent phase: ${phase}`);
  }

  /**
   * Update token usage from watsonx client
   */
  private updateTokenUsage(): void {
    this.state.tokenUsage = this.watsonxClient.getTokenUsage();
    this.state.conversationHistory = this.watsonxClient.getHistory();
  }

  /**
   * Update average response length metric (Issue #9)
   */
  private updateAverageResponseLength(length: number): void {
    const currentTotal = this.generationMetrics.averageResponseLength * this.generationMetrics.responseLengthCount;
    this.generationMetrics.responseLengthCount++;
    this.generationMetrics.averageResponseLength = (currentTotal + length) / this.generationMetrics.responseLengthCount;
  }

  /**
   * Track error type for metrics (Issue #9)
   */
  private trackErrorType(errorType: string): void {
    if (!this.generationMetrics.errorTypes[errorType]) {
      this.generationMetrics.errorTypes[errorType] = 0;
    }
    this.generationMetrics.errorTypes[errorType]++;
  }

  /**
   * Log generation metrics summary (Issue #9)
   */
  private logGenerationMetrics(): void {
    const metrics = this.generationMetrics;
    const successRate = metrics.totalAttempts > 0
      ? ((metrics.successfulExtractions / metrics.totalAttempts) * 100).toFixed(1)
      : '0.0';
    
    logger.info('=== Generation Metrics Summary ===');
    logger.info(`Total attempts: ${metrics.totalAttempts}`);
    logger.info(`Successful extractions: ${metrics.successfulExtractions} (${successRate}%)`);
    logger.info(`Failed extractions: ${metrics.failedExtractions}`);
    logger.info(`Retries attempted: ${metrics.retriesAttempted} (succeeded: ${metrics.retriesSucceeded})`);
    logger.info(`Compact retries: ${metrics.compactRetriesAttempted} (succeeded: ${metrics.compactRetriesSucceeded})`);
    logger.info(`Tests marked uncertain: ${metrics.uncertainMarked}`);
    logger.info(`Average response length: ${Math.round(metrics.averageResponseLength)} chars`);
    
    if (Object.keys(metrics.errorTypes).length > 0) {
      logger.info('Error types encountered:');
      for (const [type, count] of Object.entries(metrics.errorTypes)) {
        logger.info(`  - ${type}: ${count}`);
      }
    }
    logger.info('================================');
  }

  /**
   * Get generation metrics (Issue #9)
   */
  getGenerationMetrics() {
    return { ...this.generationMetrics };
  }

}

/**
 * Create a test agent with configuration
 */
export function createTestAgent(
  config: AgentConfig,
  mcpManager?: MCPClientManager
): TestAgent {
  return new TestAgent(config, mcpManager);
}

/**
 * Create a test agent with API key
 */
export function createTestAgentWithKey(
  apiKey: string,
  options?: Partial<AgentConfig>,
  mcpManager?: MCPClientManager
): TestAgent {
  return new TestAgent(
    {
      apiKey,
      ...options
    },
    mcpManager
  );
}

// Made with Bob
