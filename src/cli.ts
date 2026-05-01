#!/usr/bin/env node

/**
 * TraceQA CLI Binary Entry Point
 * This file is the executable entry point for the traceqa command
 */

import { main } from './index.js';

// Run the main application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Made with Bob
