/**
 * Test Route Discovery
 * Validates route discovery for multiple frameworks
 */

import { discoverRoutes } from './src/discovery/route-discovery';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRouteDiscovery() {
  console.log('🔍 Testing Route Discovery\n');
  
  // Test Express discovery
  console.log('Testing Express route discovery...');
  try {
    const expressRoutes = await discoverRoutes(
      path.join(__dirname, 'test-fixtures/express-app'),
      'node'
    );
    
    console.log(`✓ Framework: ${expressRoutes.framework}`);
    console.log(`✓ Discovery Method: ${expressRoutes.discoveryMethod}`);
    console.log(`✓ Routes found: ${expressRoutes.routes.length}`);
    console.log('\nDiscovered routes:');
    expressRoutes.routes.forEach(route => {
      console.log(`  ${route.method.padEnd(6)} ${route.path}`);
      if (route.file) {
        console.log(`         File: ${path.basename(route.file)}:${route.line}`);
      }
    });
    console.log();
  } catch (error) {
    console.error('✗ Express discovery failed:', error);
  }
  
  // Test FastAPI discovery
  console.log('\nTesting FastAPI route discovery...');
  try {
    const fastapiRoutes = await discoverRoutes(
      path.join(__dirname, 'test-fixtures/fastapi-app'),
      'python'
    );
    
    console.log(`✓ Framework: ${fastapiRoutes.framework}`);
    console.log(`✓ Discovery Method: ${fastapiRoutes.discoveryMethod}`);
    console.log(`✓ Routes found: ${fastapiRoutes.routes.length}`);
    console.log('\nDiscovered routes:');
    fastapiRoutes.routes.forEach(route => {
      console.log(`  ${route.method.padEnd(6)} ${route.path}`);
      if (route.file) {
        console.log(`         File: ${path.basename(route.file)}:${route.line}`);
      }
    });
    console.log();
  } catch (error) {
    console.error('✗ FastAPI discovery failed:', error);
  }
  
  // Test auto-detection (no project type specified)
  console.log('\nTesting auto-detection...');
  try {
    const autoRoutes = await discoverRoutes(
      path.join(__dirname, 'test-fixtures/express-app')
    );
    
    console.log(`✓ Auto-detected framework: ${autoRoutes.framework}`);
    console.log(`✓ Routes found: ${autoRoutes.routes.length}`);
    console.log();
  } catch (error) {
    console.error('✗ Auto-detection failed:', error);
  }
  
  console.log('✅ Route discovery tests complete!\n');
}

// Run tests
testRouteDiscovery().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

// Made with Bob
