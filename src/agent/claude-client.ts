/**
 * TraceQA Claude API Client
 * Handles communication with Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentConfig,
  ConversationMessage,
  ClaudeResponse,
  ClaudeStreamChunk,
  TokenUsage,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Claude API client for TraceQA agent
 */
export class ClaudeClient {
  private client: Anthropic;
  private config: Required<AgentConfig>;
  private conversationHistory: ConversationMessage[] = [];
  private tokenUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0
  };

  // Pricing per million tokens (as of 2024)
  private static readonly PRICING = {
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
  };

  constructor(config: AgentConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'claude-3-5-sonnet-20241022',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || '',
      conversationHistory: config.conversationHistory || [],
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      streamResponses: config.streamResponses || false
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout
    });

    this.conversationHistory = [...this.config.conversationHistory];

    logger.info(`Claude client initialized with model: ${this.config.model}`);
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    message: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Add user message to history
      this.addToHistory('user', message);

      // Prepare messages for API
      const messages = this.conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      logger.debug(`Sending message to Claude (${messages.length} messages in history)`);

      // Make API call with retry logic
      const response = await this.withRetry(async () => {
        return await this.client.messages.create({
          model: this.config.model,
          max_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          system: options?.systemPrompt || this.config.systemPrompt,
          messages
        });
      });

      // Extract response text
      const responseText = response.content
        .filter((block: any): block is { type: 'text'; text: string } => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      // Add assistant response to history
      this.addToHistory('assistant', responseText, {
        tokenCount: response.usage.output_tokens,
        model: response.model,
        finishReason: response.stop_reason || undefined
      });

      // Update token usage
      this.updateTokenUsage(response.usage.input_tokens, response.usage.output_tokens);

      const duration = Date.now() - startTime;
      logger.success(`Received response from Claude (${duration}ms, ${response.usage.output_tokens} tokens)`);

      return responseText;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to get response from Claude (${duration}ms):`, error);
      throw new TraceQAError(
        `Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.AGENT,
        { error, duration }
      );
    }
  }

  /**
   * Send a message and stream the response
   */
  async *streamMessage(
    message: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    const startTime = Date.now();

    try {
      // Add user message to history
      this.addToHistory('user', message);

      // Prepare messages for API
      const messages = this.conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      logger.debug(`Streaming message to Claude (${messages.length} messages in history)`);

      // Make streaming API call
      const stream = await this.client.messages.create({
        model: this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        temperature: options?.temperature || this.config.temperature,
        system: options?.systemPrompt || this.config.systemPrompt,
        messages,
        stream: true
      });

      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;
          yield text;
        } else if (chunk.type === 'message_start') {
          inputTokens = chunk.message.usage.input_tokens;
        } else if (chunk.type === 'message_delta') {
          outputTokens = chunk.usage.output_tokens;
        }
      }

      // Add assistant response to history
      this.addToHistory('assistant', fullResponse, {
        tokenCount: outputTokens,
        model: this.config.model
      });

      // Update token usage
      this.updateTokenUsage(inputTokens, outputTokens);

      const duration = Date.now() - startTime;
      logger.success(`Completed streaming response from Claude (${duration}ms, ${outputTokens} tokens)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to stream response from Claude (${duration}ms):`, error);
      throw new TraceQAError(
        `Claude API streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.AGENT,
        { error, duration }
      );
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.debug('Conversation history cleared');
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage(): void {
    this.tokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0
    };
    logger.debug('Token usage statistics reset');
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
    logger.debug('System prompt updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<AgentConfig> {
    return { ...this.config };
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Update token usage and calculate cost
   */
  private updateTokenUsage(inputTokens: number, outputTokens: number): void {
    this.tokenUsage.inputTokens += inputTokens;
    this.tokenUsage.outputTokens += outputTokens;
    this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;

    // Calculate estimated cost
    const pricing = ClaudeClient.PRICING[this.config.model as keyof typeof ClaudeClient.PRICING] || 
                    ClaudeClient.PRICING['claude-3-5-sonnet-20241022'];
    
    const inputCost = (this.tokenUsage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (this.tokenUsage.outputTokens / 1_000_000) * pricing.output;
    this.tokenUsage.estimatedCost = inputCost + outputCost;
  }

  /**
   * Retry logic for API calls
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        throw error;
      }

      // Check if error is retryable
      const isRetryable = this.isRetryableError(error);
      if (!isRetryable) {
        throw error;
      }

      // Calculate backoff delay
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.warn(`API call failed (attempt ${attempt}/${this.config.maxRetries}), retrying in ${delay}ms...`);

      // Simple delay using busy wait (not ideal but works in all environments)
      await new Promise<void>(resolve => {
        const start = Date.now();
        const checkDelay = (): void => {
          if (Date.now() - start >= delay) {
            resolve();
          } else {
            Promise.resolve().then(checkDelay);
          }
        };
        checkDelay();
      });
      return this.withRetry(operation, attempt + 1);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      // Retry on rate limits and server errors
      return status === 429 || (status >= 500 && status < 600);
    }
    return false;
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if message would exceed token limit
   */
  wouldExceedTokenLimit(message: string): boolean {
    const historyTokens = this.conversationHistory.reduce(
      (sum, msg) => sum + ClaudeClient.estimateTokens(msg.content),
      0
    );
    const messageTokens = ClaudeClient.estimateTokens(message);
    const systemTokens = ClaudeClient.estimateTokens(this.config.systemPrompt);

    const totalTokens = historyTokens + messageTokens + systemTokens;
    const maxContextTokens = 200000; // Claude 3.5 Sonnet context window

    return totalTokens > maxContextTokens;
  }

  /**
   * Trim conversation history to fit within token limits
   */
  trimHistory(maxTokens: number = 100000): void {
    let totalTokens = ClaudeClient.estimateTokens(this.config.systemPrompt);
    const trimmedHistory: ConversationMessage[] = [];

    // Keep most recent messages
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i];
      const msgTokens = ClaudeClient.estimateTokens(msg.content);

      if (totalTokens + msgTokens > maxTokens) {
        break;
      }

      trimmedHistory.unshift(msg);
      totalTokens += msgTokens;
    }

    const removedCount = this.conversationHistory.length - trimmedHistory.length;
    if (removedCount > 0) {
      logger.warn(`Trimmed ${removedCount} messages from conversation history to fit token limit`);
      this.conversationHistory = trimmedHistory;
    }
  }
}

/**
 * Create a Claude client with default configuration
 */
export function createClaudeClient(apiKey: string, options?: Partial<AgentConfig>): ClaudeClient {
  return new ClaudeClient({
    apiKey,
    ...options
  });
}

// Made with Bob
