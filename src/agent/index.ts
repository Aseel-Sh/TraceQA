/**
 * TraceQA Agent Module Exports
 * Central export point for all agent-related functionality
 */

// Export main agent classes
export { WatsonxClient, createWatsonxClient } from './watsonx-client.js';
export { DecisionEngine, createDecisionEngine } from './decision-engine.js';
export { TestAgent, createTestAgent, createTestAgentWithKey } from './test-agent.js';

// Export prompts and utilities
export {
  SYSTEM_PROMPT,
  getTestPlanningPrompt,
  getTestExecutionPrompt,
  getErrorAnalysisPrompt,
  getDecisionPrompt,
  getReportGenerationPrompt,
  getHumanInputPrompt,
  getStepRefinementPrompt,
  getTestPrioritizationPrompt,
  getEdgeCasePrompt,
  parseJSONResponse,
  extractCodeBlocks
} from './prompts.js';

// Re-export agent-related types
export type {
  AgentConfig,
  AgentState,
  AgentDecision,
  AgentAnalysis,
  ConversationMessage,
  TokenUsage,
  ClaudeResponse,
  ClaudeStreamChunk,
  TestPlanningRequest,
  TestExecutionRequest,
  ReportOptions
} from '../types/index.js';

import { WatsonxClient, createWatsonxClient } from './watsonx-client.js';
import { DecisionEngine, createDecisionEngine } from './decision-engine.js';
import { TestAgent, createTestAgent, createTestAgentWithKey } from './test-agent.js';
import { SYSTEM_PROMPT } from './prompts.js';
import {
  AgentConfig,
  TestContext,
  TestPlan,
  TestResults,
  AgentAnalysis
} from '../types/index.js';
import { MCPClientManager } from '../mcp/index.js';
import { logger } from '../utils/logger.js';

/**
 * Agent initialization options
 */
export interface AgentInitOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  mcpManager?: MCPClientManager;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Initialize a complete agent system
 */
export async function initializeAgent(options: AgentInitOptions): Promise<TestAgent> {
  logger.info('Initializing TraceQA agent system...');

  const config: AgentConfig = {
    apiKey: options.apiKey,
    model: options.model || 'claude-3-5-sonnet-20241022',
    systemPrompt: options.systemPrompt || SYSTEM_PROMPT,
    maxTokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
    timeout: options.timeout || 60000,
    maxRetries: options.maxRetries || 3,
    streamResponses: false
  };

  const agent = new TestAgent(config, options.mcpManager);

  logger.success('TraceQA agent system initialized');
  return agent;
}

/**
 * Quick start function for agent with minimal configuration
 */
export async function quickStartAgent(
  apiKey: string,
  mcpManager?: MCPClientManager
): Promise<TestAgent> {
  logger.info('Quick starting TraceQA agent...');

  const agent = createTestAgentWithKey(apiKey, {}, mcpManager);

  logger.success('TraceQA agent ready');
  return agent;
}

/**
 * Run a complete test cycle with the agent
 */
export async function runAgentTestCycle(
  agent: TestAgent,
  context: TestContext
): Promise<{
  testPlan: TestPlan;
  results: TestResults;
  analysis: AgentAnalysis;
  report: string;
}> {
  logger.info('Running agent test cycle...');

  try {
    const result = await agent.runTestCycle(context);
    logger.success('Agent test cycle completed');
    return result;
  } catch (error) {
    logger.error('Agent test cycle failed:', error);
    throw error;
  }
}

/**
 * Create agent configuration from environment variables
 * @param env - Optional environment variables object. If not provided, will try to use process.env
 */
export function createAgentConfigFromEnv(env?: Record<string, string | undefined>): AgentConfig {
  // Use provided env or try to access process.env safely
  let environment: Record<string, string | undefined> = {};
  
  if (env) {
    environment = env;
  } else {
    // Try to access process.env safely
    try {
      // Use globalThis to access process if available
      const globalProcess = (globalThis as any).process;
      if (globalProcess && globalProcess.env) {
        environment = globalProcess.env;
      }
    } catch {
      // process not available, use empty object
    }
  }
  
  const apiKey = environment.IBM_WATSONX_API_KEY;
  
  if (!apiKey) {
    throw new Error('IBM_WATSONX_API_KEY environment variable is required');
  }

  return {
    apiKey,
    model: environment.IBM_WATSONX_MODEL || 'ibm/granite-13b-chat-v2',
    maxTokens: parseInt(environment.IBM_WATSONX_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(environment.IBM_WATSONX_TEMPERATURE || '0.7'),
    timeout: parseInt(environment.IBM_WATSONX_TIMEOUT || '60000', 10),
    maxRetries: parseInt(environment.IBM_WATSONX_MAX_RETRIES || '3', 10),
    streamResponses: environment.IBM_WATSONX_STREAM === 'true'
  };
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config: AgentConfig): boolean {
  if (!config.apiKey || config.apiKey.trim() === '') {
    logger.error('Invalid agent configuration: API key is required');
    return false;
  }

  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 200000)) {
    logger.error('Invalid agent configuration: maxTokens must be between 1 and 200000');
    return false;
  }

  if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
    logger.error('Invalid agent configuration: temperature must be between 0 and 1');
    return false;
  }

  if (config.timeout && config.timeout < 1000) {
    logger.error('Invalid agent configuration: timeout must be at least 1000ms');
    return false;
  }

  return true;
}

/**
 * Get agent system information
 */
export function getAgentInfo(agent: TestAgent): {
  state: string;
  tokenUsage: {
    total: number;
    cost: number;
  };
  conversationLength: number;
  executedTests: number;
} {
  const state = agent.getState();
  const tokenUsage = agent.getTokenUsage();
  const history = agent.getConversationHistory();

  return {
    state: state.currentPhase,
    tokenUsage: {
      total: tokenUsage.totalTokens,
      cost: tokenUsage.estimatedCost
    },
    conversationLength: history.length,
    executedTests: state.executedTests.length
  };
}

/**
 * Format token usage for display
 */
export function formatTokenUsage(tokenUsage: {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}): string {
  return `
Token Usage:
  Input:  ${tokenUsage.inputTokens.toLocaleString()} tokens
  Output: ${tokenUsage.outputTokens.toLocaleString()} tokens
  Total:  ${tokenUsage.totalTokens.toLocaleString()} tokens
  Cost:   $${tokenUsage.estimatedCost.toFixed(4)}
  `.trim();
}

/**
 * Default export with all utilities
 */
export default {
  // Classes
  WatsonxClient,
  DecisionEngine,
  TestAgent,

  // Factory functions
  createWatsonxClient,
  createDecisionEngine,
  createTestAgent,
  createTestAgentWithKey,

  // Initialization functions
  initializeAgent,
  quickStartAgent,
  runAgentTestCycle,

  // Configuration utilities
  createAgentConfigFromEnv,
  validateAgentConfig,

  // Information utilities
  getAgentInfo,
  formatTokenUsage,

  // Constants
  SYSTEM_PROMPT
};

// Made with Bob
