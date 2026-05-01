/**
 * MCP Client Implementation
 * Base client for managing MCP (Model Context Protocol) connections
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  MCPConfig,
  MCPServerConfig,
  MCPToolRequest,
  MCPConnectionStatus,
  MCPServerInfo,
  MCPOperationResult,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Base MCP Client class for managing MCP server connections
 */
export class MCPClient {
  protected client: Client | null = null;
  protected transport: StdioClientTransport | null = null;
  protected serverConfig: MCPServerConfig;
  protected status: MCPConnectionStatus = MCPConnectionStatus.DISCONNECTED;
  protected capabilities: string[] = [];
  protected errorCount: number = 0;
  protected lastConnected: string | null = null;
  protected config: MCPConfig;

  constructor(serverConfig: MCPServerConfig, config: MCPConfig = {}) {
    this.serverConfig = serverConfig;
    this.config = {
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    try {
      this.status = MCPConnectionStatus.CONNECTING;
      logger.info(`Connecting to MCP server: ${this.serverConfig.name}`);

      // Create transport
      this.transport = new StdioClientTransport({
        command: this.serverConfig.command,
        args: this.serverConfig.args || [],
        env: {
          ...(process.env as Record<string, string>),
          ...this.serverConfig.env
        }
      });

      // Create client
      this.client = new Client({
        name: 'traceqa-client',
        version: '0.1.0'
      }, {
        capabilities: {}
      });

      // Connect to server
      await this.client.connect(this.transport);

      // Get server capabilities
      const serverInfo = await this.client.getServerVersion();
      this.capabilities = serverInfo?.capabilities ? Object.keys(serverInfo.capabilities) : [];

      this.status = MCPConnectionStatus.CONNECTED;
      this.lastConnected = new Date().toISOString();
      this.errorCount = 0;

      logger.success(`Connected to MCP server: ${this.serverConfig.name}`);
      logger.debug(`Server capabilities: ${this.capabilities.join(', ')}`);
    } catch (error) {
      this.status = MCPConnectionStatus.ERROR;
      this.errorCount++;
      logger.error(`Failed to connect to MCP server: ${this.serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
      throw new TraceQAError(
        `Failed to connect to MCP server: ${this.serverConfig.name}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      this.status = MCPConnectionStatus.DISCONNECTED;
      logger.info(`Disconnected from MCP server: ${this.serverConfig.name}`);
    } catch (error) {
      logger.error(`Error disconnecting from MCP server: ${this.serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
      throw new TraceQAError(
        `Error disconnecting from MCP server: ${this.serverConfig.name}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Execute a tool on the MCP server with retry logic
   */
  async executeTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {},
    timeout?: number
  ): Promise<MCPOperationResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const maxAttempts = this.config.retryAttempts || 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Ensure we're connected
        if (this.status !== MCPConnectionStatus.CONNECTED) {
          await this.reconnect();
        }

        logger.debug(`Executing tool: ${toolName} (attempt ${attempt}/${maxAttempts})`);

        const result = await this.callTool<T>(toolName, args, timeout);
        const totalDuration = Date.now() - startTime;

        return {
          success: true,
          data: result,
          metadata: {
            duration: totalDuration,
            timestamp: new Date().toISOString(),
            serverName: this.serverConfig.name,
            toolName
          },
          attempts: attempt,
          totalDuration,
          retried: attempt > 1
        };
      } catch (error) {
        lastError = error as Error;
        this.errorCount++;
        logger.warn(`Tool execution failed (attempt ${attempt}/${maxAttempts}): ${toolName}: ${error instanceof Error ? error.message : String(error)}`);

        // Don't retry on last attempt
        if (attempt < maxAttempts) {
          const delay = this.config.retryDelay! * attempt;
          logger.debug(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    const totalDuration = Date.now() - startTime;
    logger.error(`Tool execution failed after ${maxAttempts} attempts: ${toolName}: ${lastError?.message || 'Unknown error'}`);

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      metadata: {
        duration: totalDuration,
        timestamp: new Date().toISOString(),
        serverName: this.serverConfig.name,
        toolName
      },
      attempts: maxAttempts,
      totalDuration,
      retried: true
    };
  }

  /**
   * Call a tool on the MCP server (single attempt)
   */
  protected async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {},
    timeout?: number
  ): Promise<T> {
    if (!this.client) {
      throw new TraceQAError(
        'MCP client not connected',
        ErrorCategory.MCP
      );
    }

    const effectiveTimeout = timeout || this.config.timeout || 30000;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        global.setTimeout(() => {
          reject(new TraceQAError(
            `Tool execution timeout after ${effectiveTimeout}ms: ${toolName}`,
            ErrorCategory.MCP
          ));
        }, effectiveTimeout);
      });

      // Execute tool with timeout
      const result = await Promise.race([
        this.client.callTool({ name: toolName, arguments: args }),
        timeoutPromise
      ]);

      // Parse result
      if (result.isError) {
        throw new TraceQAError(
          `Tool execution error: ${result.content}`,
          ErrorCategory.MCP
        );
      }

      // Extract content from result
      const content = Array.isArray(result.content) ? result.content[0] : undefined;
      if (!content) {
        throw new TraceQAError(
          'Tool returned no content',
          ErrorCategory.MCP
        );
      }

      // Parse content based on type
      if (content.type === 'text') {
        try {
          return JSON.parse(content.text) as T;
        } catch {
          return content.text as T;
        }
      }

      return content as T;
    } catch (error) {
      if (error instanceof TraceQAError) {
        throw error;
      }
      throw new TraceQAError(
        `Tool execution failed: ${toolName}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Reconnect to the MCP server
   */
  protected async reconnect(): Promise<void> {
    logger.info(`Reconnecting to MCP server: ${this.serverConfig.name}`);
    this.status = MCPConnectionStatus.RECONNECTING;

    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      this.status = MCPConnectionStatus.ERROR;
      throw error;
    }
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.status === MCPConnectionStatus.CONNECTED;
  }

  /**
   * Get server information
   */
  getServerInfo(): MCPServerInfo {
    return {
      name: this.serverConfig.name,
      status: this.status,
      capabilities: this.capabilities,
      lastConnected: this.lastConnected || undefined,
      errorCount: this.errorCount
    };
  }

  /**
   * List available tools on the server
   */
  async listTools(): Promise<string[]> {
    if (!this.client) {
      throw new TraceQAError(
        'MCP client not connected',
        ErrorCategory.MCP
      );
    }

    try {
      const result = await this.client.listTools();
      return result.tools.map((tool: any) => tool.name);
    } catch (error) {
      logger.error(`Failed to list tools: ${error instanceof Error ? error.message : String(error)}`);
      throw new TraceQAError(
        'Failed to list tools',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Health check for the connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.status !== MCPConnectionStatus.CONNECTED) {
        return false;
      }

      // Try to list tools as a health check
      await this.listTools();
      return true;
    } catch (error) {
      logger.warn(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => global.setTimeout(resolve, ms));
  }

  /**
   * Get the server name
   */
  getServerName(): string {
    return this.serverConfig.name;
  }

  /**
   * Get connection status
   */
  getStatus(): MCPConnectionStatus {
    return this.status;
  }
}

/**
 * MCP Client Manager for managing multiple MCP servers
 */
export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  private config: MCPConfig;

  constructor(config: MCPConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize all configured MCP servers
   */
  async initializeServers(serverConfigs?: MCPServerConfig[]): Promise<void> {
    const servers = serverConfigs || this.config.servers || [];

    logger.info(`Initializing ${servers.length} MCP server(s)...`);

    for (const serverConfig of servers) {
      try {
        const client = new MCPClient(serverConfig, this.config);
        await client.connect();
        this.clients.set(serverConfig.name, client);
        logger.success(`Initialized MCP server: ${serverConfig.name}`);
      } catch (error) {
        logger.error(`Failed to initialize MCP server: ${serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with other servers
      }
    }

    logger.info(`Successfully initialized ${this.clients.size} MCP server(s)`);
  }

  /**
   * Get a specific MCP client
   */
  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Execute a tool on a specific server
   */
  async executeTool<T = unknown>(
    request: MCPToolRequest
  ): Promise<MCPOperationResult<T>> {
    const client = this.clients.get(request.serverName);
    if (!client) {
      throw new TraceQAError(
        `MCP server not found: ${request.serverName}`,
        ErrorCategory.MCP
      );
    }

    return await client.executeTool<T>(
      request.toolName,
      request.arguments,
      request.timeout
    );
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting all MCP clients...');

    const disconnectPromises = Array.from(this.clients.values()).map(
      client => client.disconnect().catch(error => {
        logger.error(`Error disconnecting client: ${client.getServerName()}: ${error instanceof Error ? error.message : String(error)}`);
      })
    );

    await Promise.all(disconnectPromises);
    this.clients.clear();

    logger.info('All MCP clients disconnected');
  }

  /**
   * Get all server information
   */
  getAllServerInfo(): MCPServerInfo[] {
    return Array.from(this.clients.values()).map(client => client.getServerInfo());
  }

  /**
   * Health check for all servers
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, client] of this.clients) {
      const isHealthy = await client.healthCheck();
      results.set(name, isHealthy);
    }

    return results;
  }

  /**
   * Get the number of connected clients
   */
  getConnectedCount(): number {
    return Array.from(this.clients.values()).filter(
      client => client.isConnected()
    ).length;
  }
}

// Made with Bob
