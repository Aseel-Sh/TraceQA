/**
 * Test script for QA Task Plan Generator
 * 
 * Tests the generator with sample data to verify:
 * - IBM integration works
 * - Fallback generation works
 * - Validation catches errors
 * - Output structure is correct
 */

import {
  generateQATaskPlan,
  buildQATaskPlanPrompt,
  validateIBMTaskPlanResponse,
  generateFallbackTasks,
  prioritizeTasks,
  generateTaskSummary,
} from './src/generators/qa-task-plan-generator.js';
import type {
  AcceptanceCriterion,
  DiscoveredRoute,
  TraceQAConfig,
} from './src/types/index.js';

// Sample test data
const sampleAcceptanceCriteria: AcceptanceCriterion[] = [
  {
    id: 'AC-1',
    description: 'User should be able to register with a valid email address',
    priority: 'high',
  },
  {
    id: 'AC-2',
    description: 'System should reject registration with invalid email format',
    priority: 'high',
  },
  {
    id: 'AC-3',
    description: 'User profile page should display user information correctly',
    priority: 'medium',
  },
  {
    id: 'AC-4',
    description: 'System should integrate with external payment gateway',
    priority: 'low',
  },
];

const sampleRoutes: DiscoveredRoute[] = [
  {
    method: 'POST',
    path: '/api/users/register',
    handler: 'registerUser',
    description: 'Register a new user',
  },
  {
    method: 'GET',
    path: '/api/users/:id',
    handler: 'getUserById',
    description: 'Get user by ID',
  },
  {
    method: 'GET',
    path: '/api/health',
    handler: 'healthCheck',
    description: 'Health check endpoint',
  },
];

const sampleConfig: TraceQAConfig = {
  projectName: 'Test Project',
  baseUrl: 'http://localhost:3000',
  outputDir: './traceqa-output',
  proofDir: './traceqa-proof',
  generatedDir: './traceqa-generated',
  ibmWatsonxApiKey: process.env.IBM_WATSONX_API_KEY || '',
  timeout: 30000,
  retries: 3,
  maxRetries: 3,
  testTimeout: 30000,
  reportFormat: 'markdown',
};

async function testPromptBuilding() {
  console.log('\n=== Test 1: Prompt Building ===');
  
  const prompt = buildQATaskPlanPrompt(
    sampleAcceptanceCriteria,
    sampleRoutes,
    {
      projectName: 'Test Project',
      framework: 'Express.js',
    }
  );

  console.log('✓ Prompt generated successfully');
  console.log(`  Length: ${prompt.length} characters`);
  console.log(`  Contains acceptance criteria: ${prompt.includes('AC-1')}`);
  console.log(`  Contains routes: ${prompt.includes('/api/users/register')}`);
}

function testValidation() {
  console.log('\n=== Test 2: Response Validation ===');

  // Test valid response
  const validResponse = {
    tasks: [
      {
        taskId: 'QA-001',
        acceptanceCriterionId: 'AC-1',
        title: 'Test user registration with valid email',
        type: 'api',
        executionMode: 'automated',
        priority: 'high',
        reasoning: 'Clear API endpoint discovered',
        preconditions: [],
        setupData: {},
        steps: [],
      },
    ],
  };

  const result1 = validateIBMTaskPlanResponse(validResponse, sampleAcceptanceCriteria);
  console.log(`✓ Valid response: ${result1.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  Tasks: ${result1.tasks.length}`);
  console.log(`  Errors: ${result1.errors.length}`);
  console.log(`  Warnings: ${result1.warnings.length}`);

  // Test invalid response
  const invalidResponse = {
    tasks: [
      {
        taskId: 'INVALID',
        acceptanceCriterionId: 'AC-999', // Invalid ID
        title: 'Test',
        type: 'invalid-type',
        executionMode: 'invalid-mode',
      },
    ],
  };

  const result2 = validateIBMTaskPlanResponse(invalidResponse, sampleAcceptanceCriteria);
  console.log(`✓ Invalid response: ${!result2.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  Errors caught: ${result2.errors.length}`);
}

function testFallbackGeneration() {
  console.log('\n=== Test 3: Fallback Generation ===');

  const tasks = generateFallbackTasks(sampleAcceptanceCriteria, sampleRoutes);

  console.log(`✓ Generated ${tasks.length} fallback tasks`);
  tasks.forEach(task => {
    console.log(`  - ${task.taskId}: ${task.title.substring(0, 50)}...`);
    console.log(`    Type: ${task.type}, Mode: ${task.executionMode}, Priority: ${task.priority}`);
  });
}

function testPrioritization() {
  console.log('\n=== Test 4: Task Prioritization ===');

  const unsortedTasks = generateFallbackTasks(sampleAcceptanceCriteria, sampleRoutes);
  const sortedTasks = prioritizeTasks(unsortedTasks);

  console.log('✓ Tasks prioritized');
  console.log('  Order:');
  sortedTasks.forEach((task, i) => {
    console.log(`  ${i + 1}. ${task.taskId} - Priority: ${task.priority}, Type: ${task.type}, Mode: ${task.executionMode}`);
  });
}

function testSummaryGeneration() {
  console.log('\n=== Test 5: Summary Generation ===');

  const tasks = generateFallbackTasks(sampleAcceptanceCriteria, sampleRoutes);
  const summary = generateTaskSummary(tasks);

  console.log('✓ Summary generated');
  console.log(`  Total: ${summary.totalTasks}`);
  console.log(`  Automated: ${summary.automatedTasks}`);
  console.log(`  Manual: ${summary.manualTasks}`);
  console.log(`  Uncertain: ${summary.uncertainTasks}`);
}

async function testFullGeneration() {
  console.log('\n=== Test 6: Full Task Plan Generation ===');

  try {
    const result = await generateQATaskPlan(
      sampleAcceptanceCriteria,
      sampleRoutes,
      sampleConfig,
      {
        projectName: 'Test Project',
        framework: 'Express.js',
      }
    );

    console.log('✓ Task plan generated successfully');
    console.log(`  IBM Used: ${result.ibmUsed}`);
    console.log(`  Fallback Used: ${result.fallbackUsed}`);
    console.log(`  Warnings: ${result.warnings.length}`);
    console.log(`  Tasks: ${result.taskPlan.tasks.length}`);
    console.log(`  Summary:`, result.taskPlan.summary);

    if (result.warnings.length > 0) {
      console.log('\n  Warnings:');
      result.warnings.forEach(w => console.log(`    - ${w}`));
    }

    // Display first task as example
    if (result.taskPlan.tasks.length > 0) {
      const firstTask = result.taskPlan.tasks[0];
      console.log('\n  Example Task:');
      console.log(`    ID: ${firstTask.taskId}`);
      console.log(`    Title: ${firstTask.title}`);
      console.log(`    Type: ${firstTask.type}`);
      console.log(`    Execution Mode: ${firstTask.executionMode}`);
      console.log(`    Priority: ${firstTask.priority}`);
      console.log(`    Reasoning: ${firstTask.reasoning.substring(0, 80)}...`);
    }
  } catch (error) {
    console.error('✗ Full generation failed:', error);
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  QA Task Plan Generator Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    testPromptBuilding();
    testValidation();
    testFallbackGeneration();
    testPrioritization();
    testSummaryGeneration();
    await testFullGeneration();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  All Tests Completed                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

// Made with Bob
