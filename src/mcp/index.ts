/**
 * MCP Module Exports
 * Central export point for all MCP-related functionality
 */

// Export base client
export { MCPClient, MCPClientManager } from './client.js';

// Export browser-specific clients
export { BrowserMCPClient } from './browser-mcp.js';
export { PlaywrightMCPClient } from './playwright-mcp.js';

// Re-export MCP-related types from types module
export type {
  MCPConfig,
  MCPServerConfig,
  MCPToolRequest,
  MCPToolResponse,
  MCPOperationResult,
  MCPServerInfo,
  BrowserState,
  NavigationOptions,
  SelectorOptions,
  ScreenshotOptions,
  PlaywrightConfig,
  NetworkInterceptionOptions
} from '../types/index.js';

export {
  BrowserAction,
  BrowserType,
  MCPConnectionStatus
} from '../types/index.js';

import { MCPClient, MCPClientManager } from './client.js';
import { BrowserMCPClient } from './browser-mcp.js';
import { PlaywrightMCPClient } from './playwright-mcp.js';
import {
  MCPConfig,
  MCPServerConfig,
  BrowserType,
  BrowserAction,
  MCPConnectionStatus,
  PlaywrightConfig
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * MCP client type enumeration
 */
export enum MCPClientType {
  BROWSER = 'browser',
  PLAYWRIGHT = 'playwright'
}

/**
 * Factory function to create appropriate MCP client
 */
export function createMCPClient(
  type: MCPClientType,
  config?: MCPConfig,
  playwrightConfig?: PlaywrightConfig
): BrowserMCPClient | PlaywrightMCPClient {
  logger.info(`Creating MCP client: ${type}`);

  switch (type) {
    case MCPClientType.BROWSER:
      return new BrowserMCPClient(config);
    
    case MCPClientType.PLAYWRIGHT:
      return new PlaywrightMCPClient(config, playwrightConfig);
    
    default:
      throw new Error(`Unknown MCP client type: ${type}`);
  }
}

/**
 * Factory function to create MCP client manager
 */
export function createMCPClientManager(config?: MCPConfig): MCPClientManager {
  logger.info('Creating MCP client manager');
  return new MCPClientManager(config);
}

/**
 * Helper function to create default MCP configuration
 */
export function createDefaultMCPConfig(overrides?: Partial<MCPConfig>): MCPConfig {
  return {
    enableBrowserMCP: true,
    enablePlaywrightMCP: false,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    headless: true,
    slowMo: 0,
    viewport: {
      width: 1280,
      height: 720
    },
    ...overrides
  };
}

/**
 * Helper function to create Browser MCP server configuration
 */
export function createBrowserMCPServerConfig(overrides?: Partial<MCPServerConfig>): MCPServerConfig {
  return {
    name: 'browser-mcp',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    env: {},
    ...overrides
  };
}

/**
 * Helper function to create Playwright MCP server configuration
 */
export function createPlaywrightMCPServerConfig(overrides?: Partial<MCPServerConfig>): MCPServerConfig {
  return {
    name: 'playwright-mcp',
    command: 'npx',
    args: ['-y', '@executeautomation/playwright-mcp-server'],
    env: {},
    ...overrides
  };
}

/**
 * Helper function to create Playwright configuration
 */
export function createPlaywrightConfig(
  browserType: BrowserType = BrowserType.CHROMIUM,
  overrides?: Partial<PlaywrightConfig>
): PlaywrightConfig {
  return {
    browserType,
    headless: true,
    slowMo: 0,
    devtools: false,
    ignoreHTTPSErrors: false,
    ...overrides
  };
}

/**
 * Initialize MCP with common configurations
 */
export async function initializeMCP(config?: MCPConfig): Promise<MCPClientManager> {
  logger.info('Initializing MCP system');

  const mcpConfig = createDefaultMCPConfig(config);
  const manager = createMCPClientManager(mcpConfig);

  const servers: MCPServerConfig[] = [];

  if (mcpConfig.enableBrowserMCP) {
    servers.push(createBrowserMCPServerConfig());
  }

  if (mcpConfig.enablePlaywrightMCP) {
    servers.push(createPlaywrightMCPServerConfig());
  }

  if (mcpConfig.servers) {
    servers.push(...mcpConfig.servers);
  }

  await manager.initializeServers(servers);

  logger.success('MCP system initialized successfully');
  return manager;
}

/**
 * Quick start function for browser automation
 */
export async function quickStartBrowser(config?: MCPConfig): Promise<BrowserMCPClient> {
  logger.info('Quick starting Browser MCP client');

  const client = createMCPClient(MCPClientType.BROWSER, config);
  await client.connect();

  logger.success('Browser MCP client ready');
  return client as BrowserMCPClient;
}

/**
 * Quick start function for Playwright automation
 */
export async function quickStartPlaywright(
  browserType: BrowserType = BrowserType.CHROMIUM,
  config?: MCPConfig
): Promise<PlaywrightMCPClient> {
  logger.info(`Quick starting Playwright MCP client with ${browserType}`);

  const playwrightConfig = createPlaywrightConfig(browserType);
  const client = createMCPClient(MCPClientType.PLAYWRIGHT, config, playwrightConfig);
  
  await client.connect();
  await (client as PlaywrightMCPClient).launchBrowser();

  logger.success('Playwright MCP client ready');
  return client as PlaywrightMCPClient;
}

/**
 * Cleanup function to disconnect all MCP clients
 */
export async function cleanupMCP(manager: MCPClientManager): Promise<void> {
  logger.info('Cleaning up MCP system');
  await manager.disconnectAll();
  logger.success('MCP system cleaned up');
}

/**
 * Default export with all utilities
 */
export default {
  // Classes
  MCPClient,
  MCPClientManager,
  BrowserMCPClient,
  PlaywrightMCPClient,
  
  // Enums
  MCPClientType,
  BrowserAction,
  BrowserType,
  MCPConnectionStatus,
  
  // Factory functions
  createMCPClient,
  createMCPClientManager,
  createDefaultMCPConfig,
  createBrowserMCPServerConfig,
  createPlaywrightMCPServerConfig,
  createPlaywrightConfig,
  
  // Initialization functions
  initializeMCP,
  quickStartBrowser,
  quickStartPlaywright,
  cleanupMCP
};

// Made with Bob
