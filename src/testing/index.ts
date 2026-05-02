/**
 * Testing Module Exports
 * Central export point for all testing functionality
 */

// Test Coordinator
export {
  TestCoordinator,
  createTestCoordinator
} from './test-coordinator.js';

// Test Runner
export {
  TestRunner,
  createTestRunner,
  executeTests
} from './test-runner.js';

// API Tester
export {
  APITester,
  createAPITester
} from './api-tester.js';

// Web Tester
export {
  WebTester,
  createWebTester
} from './web-tester.js';

// Test Context
export {
  TestContext,
  createTestContext
} from './test-context.js';

export type {
  VariableExtraction,
  SubstitutionResult
} from './test-context.js';

// Test Normalizer
export {
  TestNormalizer,
  createTestNormalizer
} from './test-normalizer.js';

export type {
  NormalizedTest,
  NormalizationOptions
} from './test-normalizer.js';

// HTTP Test Executor
export {
  executeHTTPTest,
  executeHTTPTests
} from './http-test-executor.js';

export type {
  HTTPTestExecutionResult
} from './http-test-executor.js';

// Re-export testing-related types from types module
export type {
  // API Testing Types
  APITestConfig,
  APIRequest,
  APIResponse,
  APIAssertion,
  APITestResult,
  APIAuth,
  APITestConfigWithCapture,
  APITestResultWithCapture,
  
  // Web Testing Types
  WebTestConfig,
  WebTestStep,
  WebTestResult,
  
  // Test Execution Types
  TestExecutionOptions,
  TestExecutionProgress,
  
  // Test Coordinator Types
  TestCoordinatorConfig,
  TestCoordinatorState,
  
  // Variable Capture Types
  StatefulTestContext
} from '../types/index.js';

export {
  // Enums
  HTTPMethod,
  AuthType,
  AssertionType,
  TestExecutionMode,
  TestExecutionStatus,
  WebTestAction
} from '../types/index.js';

/**
 * Factory function to create a complete testing setup
 */
import { BuildSystem } from '../core/build-system.js';
import { TestAgent } from '../agent/test-agent.js';
import { MCPClientManager } from '../mcp/index.js';
import { TestCoordinator } from './test-coordinator.js';
import type { TestCoordinatorConfig, AgentConfig, MCPConfig } from '../types/index.js';

export interface TestingSetupOptions {
  projectPath?: string;
  agentConfig: AgentConfig;
  mcpConfig?: MCPConfig;
  coordinatorConfig?: TestCoordinatorConfig;
}

/**
 * Create a complete testing setup with all components initialized
 */
export async function createTestingSetup(
  options: TestingSetupOptions
): Promise<{
  buildSystem: BuildSystem;
  agent: TestAgent;
  mcpManager: MCPClientManager;
  coordinator: TestCoordinator;
}> {
  // Create build system
  const buildSystem = new BuildSystem(options.projectPath);
  await buildSystem.initialize();

  // Create MCP manager
  const mcpManager = new MCPClientManager(options.mcpConfig);

  // Create agent
  const agent = new TestAgent(options.agentConfig, mcpManager);

  // Create coordinator
  const coordinator = new TestCoordinator(
    buildSystem,
    agent,
    mcpManager,
    options.coordinatorConfig
  );

  return {
    buildSystem,
    agent,
    mcpManager,
    coordinator
  };
}

/**
 * Utility function to run a quick test
 */
import type { TestConfig } from '../types/index.js';

export async function quickTest(
  testConfig: TestConfig,
  options: TestingSetupOptions
): Promise<{
  success: boolean;
  passed: number;
  failed: number;
  total: number;
  report: string;
}> {
  const setup = await createTestingSetup(options);

  try {
    const result = await setup.coordinator.runTests(testConfig);

    return {
      success: result.results.summary.successRate > 0.5,
      passed: result.results.summary.passed,
      failed: result.results.summary.failed,
      total: result.results.summary.total,
      report: result.report
    };
  } finally {
    // Cleanup
    await setup.buildSystem.cleanup();
    await setup.mcpManager.disconnectAll();
  }
}

// Made with Bob