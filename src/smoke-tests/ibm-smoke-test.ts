#!/usr/bin/env node

/**
 * IBM watsonx Smoke Test
 * Validates IBM watsonx integration and credentials
 */

import { config } from 'dotenv';
import { WatsonxClient } from '../agent/watsonx-client';
import chalk from 'chalk';

// Load environment variables from .env file
config();

interface SmokeTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

class IBMSmokeTest {
  private results: SmokeTestResult[] = [];

  async run(): Promise<void> {
    console.log('\n' + chalk.bold.cyan('🔬 IBM watsonx Smoke Test'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    // Test 1: Check environment variables
    await this.testEnvironmentVariables();

    // Test 2: Initialize WatsonxClient
    const client = await this.testClientInitialization();

    // Test 3: Send test message
    if (client) {
      await this.testSendMessage(client);
    }

    // Print summary
    this.printSummary();
  }

  private async testEnvironmentVariables(): Promise<void> {
    console.log(chalk.blue('📋 Checking environment variables...'));

    const apiKey = process.env.IBM_WATSONX_API_KEY;
    const projectId = process.env.IBM_WATSONX_PROJECT_ID;

    if (apiKey) {
      this.addResult({
        name: 'IBM_WATSONX_API_KEY',
        passed: true,
        message: 'Environment variable is set',
        details: `Length: ${apiKey.length} characters`,
      });
      console.log(chalk.green('  ✓ IBM_WATSONX_API_KEY is set'));
    } else {
      this.addResult({
        name: 'IBM_WATSONX_API_KEY',
        passed: false,
        message: 'Environment variable is not set',
        details: 'Set IBM_WATSONX_API_KEY in your .env file',
      });
      console.log(chalk.red('  ✗ IBM_WATSONX_API_KEY is not set'));
    }

    if (projectId) {
      this.addResult({
        name: 'IBM_WATSONX_PROJECT_ID',
        passed: true,
        message: 'Environment variable is set',
        details: `Value: ${projectId}`,
      });
      console.log(chalk.green('  ✓ IBM_WATSONX_PROJECT_ID is set'));
    } else {
      this.addResult({
        name: 'IBM_WATSONX_PROJECT_ID',
        passed: false,
        message: 'Environment variable is not set',
        details: 'Set IBM_WATSONX_PROJECT_ID in your .env file',
      });
      console.log(chalk.red('  ✗ IBM_WATSONX_PROJECT_ID is not set'));
    }

    console.log('');
  }

  private async testClientInitialization(): Promise<WatsonxClient | null> {
    console.log(chalk.blue('🔧 Initializing WatsonxClient...'));

    try {
      const apiKey = process.env.IBM_WATSONX_API_KEY;
      const projectId = process.env.IBM_WATSONX_PROJECT_ID;

      if (!apiKey || !projectId) {
        throw new Error('Missing required environment variables');
      }

      const client = new WatsonxClient({
        apiKey,
        model: 'ibm/granite-13b-chat-v2',
      });
      
      this.addResult({
        name: 'Client Initialization',
        passed: true,
        message: 'WatsonxClient initialized successfully',
      });
      console.log(chalk.green('  ✓ WatsonxClient initialized successfully'));
      console.log('');
      return client;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        name: 'Client Initialization',
        passed: false,
        message: 'Failed to initialize WatsonxClient',
        details: errorMessage,
      });
      console.log(chalk.red('  ✗ Failed to initialize WatsonxClient'));
      console.log(chalk.gray(`    Error: ${errorMessage}`));
      console.log('');
      return null;
    }
  }

  private async testSendMessage(client: WatsonxClient): Promise<void> {
    console.log(chalk.blue('💬 Testing message sending...'));

    const testMessage = 'Hello! This is a smoke test. Please respond with "OK" if you receive this message.';

    try {
      const startTime = Date.now();
      const response = await client.sendMessage(testMessage);
      const duration = Date.now() - startTime;

      if (response && response.length > 0) {
        this.addResult({
          name: 'Send Message',
          passed: true,
          message: 'Successfully sent message and received response',
          details: `Response length: ${response.length} characters, Duration: ${duration}ms`,
        });
        console.log(chalk.green('  ✓ Successfully sent message and received response'));
        console.log(chalk.gray(`    Duration: ${duration}ms`));
        console.log(chalk.gray(`    Response preview: ${response.substring(0, 100)}...`));
      } else {
        this.addResult({
          name: 'Send Message',
          passed: false,
          message: 'Received empty response',
          details: 'The API returned an empty response',
        });
        console.log(chalk.red('  ✗ Received empty response'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        name: 'Send Message',
        passed: false,
        message: 'Failed to send message',
        details: errorMessage,
      });
      console.log(chalk.red('  ✗ Failed to send message'));
      console.log(chalk.gray(`    Error: ${errorMessage}`));
    }

    console.log('');

    // Test token usage tracking
    console.log(chalk.blue('📊 Checking token usage tracking...'));
    try {
      const usage = client.getTokenUsage();
      this.addResult({
        name: 'Token Usage Tracking',
        passed: true,
        message: 'Token usage tracked correctly',
        details: `Input: ${usage.inputTokens}, Output: ${usage.outputTokens}, Total: ${usage.totalTokens}`,
      });
      console.log(chalk.green('  ✓ Token usage tracked correctly'));
      console.log(chalk.gray(`    Input tokens: ${usage.inputTokens}`));
      console.log(chalk.gray(`    Output tokens: ${usage.outputTokens}`));
      console.log(chalk.gray(`    Total tokens: ${usage.totalTokens}`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        name: 'Token Usage Tracking',
        passed: false,
        message: 'Failed to get token usage',
        details: errorMessage,
      });
      console.log(chalk.red('  ✗ Failed to get token usage'));
      console.log(chalk.gray(`    Error: ${errorMessage}`));
    }

    console.log('');
  }

  private addResult(result: SmokeTestResult): void {
    this.results.push(result);
  }

  private printSummary(): void {
    console.log(chalk.bold.cyan('📊 Test Summary'));
    console.log(chalk.gray('━'.repeat(80)));
    console.log('');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(chalk.bold(`Total Tests: ${total}`));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log('');

    if (failed > 0) {
      console.log(chalk.yellow.bold('⚠️  Failed Tests:'));
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(chalk.red(`  ✗ ${result.name}: ${result.message}`));
          if (result.details) {
            console.log(chalk.gray(`    ${result.details}`));
          }
        });
      console.log('');
    }

    if (failed === 0) {
      console.log(chalk.green.bold('✅ All tests passed! IBM watsonx integration is working correctly.'));
    } else {
      console.log(chalk.red.bold('❌ Some tests failed. Please check your IBM watsonx configuration.'));
      console.log('');
      console.log(chalk.yellow('💡 Troubleshooting:'));
      console.log('  1. Verify your IBM_WATSONX_API_KEY is correct');
      console.log('  2. Verify your IBM_WATSONX_PROJECT_ID is correct');
      console.log('  3. Check your internet connection');
      console.log('  4. Ensure your IBM Cloud account has access to watsonx.ai');
      console.log('  5. Check IBM Cloud service status: https://cloud.ibm.com/status');
    }
    console.log('');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the smoke test
const smokeTest = new IBMSmokeTest();
smokeTest.run().catch(error => {
  console.error(chalk.red('Smoke test failed with error:'), error);
  process.exit(1);
});

// Made with Bob
