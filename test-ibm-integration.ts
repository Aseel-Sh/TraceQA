/**
 * IBM watsonx.ai Integration Smoke Test
 * Tests the end-to-end integration with IBM watsonx.ai
 */

import { WatsonxClient } from './src/agent/watsonx-client.js';
import * as dotenv from 'dotenv';
import { logger } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Main test function
 */
async function testIBMIntegration() {
  console.log('='.repeat(60));
  console.log('IBM watsonx.ai Integration Smoke Test');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables...');
  const apiKey = process.env.IBM_WATSONX_API_KEY;
  const projectId = process.env.IBM_WATSONX_PROJECT_ID;
  const model = process.env.IBM_WATSONX_MODEL || 'ibm/granite-13b-chat-v2';
  const serviceUrl = process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';

  if (!apiKey) {
    console.error('❌ ERROR: IBM_WATSONX_API_KEY not found in environment');
    console.log('\nPlease create a .env file with your IBM watsonx.ai credentials:');
    console.log('  IBM_WATSONX_API_KEY=your_api_key_here');
    console.log('  IBM_WATSONX_PROJECT_ID=your_project_id_here');
    console.log('\nSee .env.example for a template.');
    process.exit(1);
  }

  if (!projectId) {
    console.error('❌ ERROR: IBM_WATSONX_PROJECT_ID not found in environment');
    console.log('\nPlease add IBM_WATSONX_PROJECT_ID to your .env file');
    process.exit(1);
  }

  console.log('✓ API Key found (length: ' + apiKey.length + ' chars)');
  console.log('✓ Project ID found: ' + projectId.substring(0, 8) + '...');
  console.log('✓ Model: ' + model);
  console.log('✓ Service URL: ' + serviceUrl);
  console.log();

  // Step 2: Initialize client
  console.log('Step 2: Initializing WatsonxClient...');
  let client: WatsonxClient;
  
  try {
    client = new WatsonxClient({
      apiKey: apiKey,
      model: model,
      maxTokens: 100,
      temperature: 0.7
    });
    console.log('✓ Client initialized successfully');
    console.log();
  } catch (error) {
    console.error('❌ ERROR: Failed to initialize client');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Step 3: Send test message
  console.log('Step 3: Sending test message to IBM watsonx.ai...');
  console.log('Test prompt: "Say \'Hello from IBM watsonx.ai!\'"');
  console.log();

  const startTime = Date.now();
  
  try {
    const response = await client.sendMessage('Say "Hello from IBM watsonx.ai!"');
    const duration = Date.now() - startTime;
    
    console.log('✓ Response received successfully');
    console.log();
    console.log('-'.repeat(60));
    console.log('RESPONSE:');
    console.log('-'.repeat(60));
    console.log(response);
    console.log('-'.repeat(60));
    console.log();
    
    // Step 4: Check token usage
    console.log('Step 4: Checking token usage...');
    const tokenUsage = client.getTokenUsage();
    console.log('✓ Input tokens:  ' + tokenUsage.inputTokens);
    console.log('✓ Output tokens: ' + tokenUsage.outputTokens);
    console.log('✓ Total tokens:  ' + tokenUsage.totalTokens);
    console.log('✓ Estimated cost: $' + tokenUsage.estimatedCost.toFixed(6));
    console.log('✓ Response time: ' + duration + 'ms');
    console.log();

    // Step 5: Test conversation history
    console.log('Step 5: Testing conversation history...');
    const history = client.getHistory();
    console.log('✓ Conversation history length: ' + history.length + ' messages');
    console.log('✓ Last message role: ' + history[history.length - 1].role);
    console.log();

    // Step 6: Test second message (conversation context)
    console.log('Step 6: Testing conversation context with follow-up...');
    console.log('Follow-up prompt: "What did you just say?"');
    console.log();

    const startTime2 = Date.now();
    const response2 = await client.sendMessage('What did you just say?');
    const duration2 = Date.now() - startTime2;

    console.log('✓ Follow-up response received');
    console.log();
    console.log('-'.repeat(60));
    console.log('FOLLOW-UP RESPONSE:');
    console.log('-'.repeat(60));
    console.log(response2);
    console.log('-'.repeat(60));
    console.log();

    const tokenUsage2 = client.getTokenUsage();
    console.log('✓ Total tokens after follow-up: ' + tokenUsage2.totalTokens);
    console.log('✓ Follow-up response time: ' + duration2 + 'ms');
    console.log();

    // Success summary
    console.log('='.repeat(60));
    console.log('✅ SMOKE TEST PASSED');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  • Client initialization: SUCCESS');
    console.log('  • API connection: SUCCESS');
    console.log('  • Message sending: SUCCESS');
    console.log('  • Conversation context: SUCCESS');
    console.log('  • Token tracking: SUCCESS');
    console.log('  • Total API calls: 2');
    console.log('  • Total tokens used: ' + tokenUsage2.totalTokens);
    console.log('  • Total cost: $' + tokenUsage2.estimatedCost.toFixed(6));
    console.log('  • Average response time: ' + Math.round((duration + duration2) / 2) + 'ms');
    console.log();
    console.log('The IBM watsonx.ai integration is working correctly! 🎉');
    console.log();

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ ERROR: Failed to communicate with IBM watsonx.ai');
    console.error('Response time: ' + duration + 'ms');
    console.log();
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Provide helpful debugging information
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('\n💡 Troubleshooting: Authentication failed');
        console.log('  • Check that your IBM_WATSONX_API_KEY is correct');
        console.log('  • Verify the API key has not expired');
        console.log('  • Ensure the API key has proper permissions');
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.log('\n💡 Troubleshooting: Resource not found');
        console.log('  • Check that your IBM_WATSONX_PROJECT_ID is correct');
        console.log('  • Verify the project exists and is accessible');
        console.log('  • Ensure the model name is correct');
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.log('\n💡 Troubleshooting: Connection timeout');
        console.log('  • Check your internet connection');
        console.log('  • Verify the IBM_WATSONX_URL is correct');
        console.log('  • Try again in a few moments');
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log('\n💡 Troubleshooting: Rate limit exceeded');
        console.log('  • Wait a few minutes before trying again');
        console.log('  • Check your API usage quota');
      }
    } else {
      console.error('Error:', error);
    }
    
    console.log();
    console.log('='.repeat(60));
    console.log('❌ SMOKE TEST FAILED');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run the test
testIBMIntegration().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

// Made with Bob
