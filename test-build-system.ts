/**
 * Test Build System Implementation
 * Simple test to verify the build system works
 */

import { createBuildSystem } from './src/core/build-system.js';
import { logger } from './src/utils/logger.js';

async function testBuildSystem() {
  logger.section('Testing Build System');

  try {
    // Create build system instance
    const buildSystem = createBuildSystem();

    // Initialize
    logger.info('Initializing build system...');
    const initialized = await buildSystem.initialize();

    if (!initialized) {
      logger.error('Failed to initialize build system');
      return;
    }

    // Get project detection
    const detection = buildSystem.getProjectDetection();
    if (detection) {
      logger.success('Project Detection Results:');
      logger.keyValue('Framework', detection.framework.name);
      logger.keyValue('Package Manager', detection.packageManager);
      logger.keyValue('Project Root', detection.projectRoot);
      
      if (detection.buildCommands.dev) {
        logger.keyValue('Dev Command', detection.buildCommands.dev);
      }
      if (detection.buildCommands.build) {
        logger.keyValue('Build Command', detection.buildCommands.build);
      }
      
      logger.newLine();
      logger.success('Build system test completed successfully!');
    }

  } catch (error) {
    logger.error('Test failed', error);
  }
}

// Run test
testBuildSystem().catch(console.error);

// Made with Bob
