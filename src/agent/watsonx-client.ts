/**
 * TraceQA IBM watsonx.ai API Client
 * Handles communication with IBM watsonx.ai API
 */

import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import { IamAuthenticator } from 'ibm-cloud-sdk-core';
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
 * IBM watsonx.ai API client for TraceQA agent
 */
export class WatsonxClient {
  private client: WatsonXAI;
  private config: Required<AgentConfig>;
  private conversationHistory: ConversationMessage[] = [];
  private tokenUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0
  };
  private model: string;
  private projectId: string;

  // Pricing per million tokens (estimated for IBM watsonx.ai)
  private static readonly PRICING = {
    'ibm/granite-13b-chat-v2': { input: 0.5, output: 1.5 },
    'ibm/granite-20b-multilingual': { input: 0.7, output: 2.0 },
    'meta-llama/llama-3-70b-instruct': { input: 1.0, output: 3.0 },
    'meta-llama/llama-3-8b-instruct': { input: 0.3, output: 1.0 }
  };

  constructor(config: AgentConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'ibm/granite-13b-chat-v2',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || '',
      conversationHistory: config.conversationHistory || [],
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      streamResponses: config.streamResponses || false
    };

    // Get environment variables
    const apiKey = this.config.apiKey || process.env.IBM_WATSONX_API_KEY || '';
    const serviceUrl = process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    this.projectId = process.env.IBM_WATSONX_PROJECT_ID || '';
    this.model = process.env.IBM_WATSONX_MODEL || this.config.model;

    if (!apiKey) {
      throw new TraceQAError(
        'IBM_WATSONX_API_KEY is required',
        ErrorCategory.AGENT
      );
    }

    if (!this.projectId) {
      throw new TraceQAError(
        'IBM_WATSONX_PROJECT_ID is required',
        ErrorCategory.AGENT
      );
    }

    // Initialize IBM watsonx.ai client
    const authenticator = new IamAuthenticator({
      apikey: apiKey
    });

    this.client = new WatsonXAI({
      version: '2024-05-31',
      authenticator: authenticator,
      serviceUrl: serviceUrl
    });

    this.conversationHistory = [...this.config.conversationHistory];

    logger.info(`Watsonx client initialized with model: ${this.model}`);
  }

  /**
   * Convert conversation messages to watsonx input format
   */
  private convertMessagesToWatsonxInput(
    messages: ConversationMessage[],
    systemPrompt?: string
  ): string {
    let input = '';
    
    if (systemPrompt) {
      input += `<|system|>\n${systemPrompt}\n`;
    }
    
    for (const msg of messages) {
      if (msg.role === 'user') {
        input += `<|user|>\n${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        input += `<|assistant|>\n${msg.content}\n`;
      }
    }
    
    input += '<|assistant|>\n';
    return input;
  }

  /**
   * Send a message to watsonx.ai and get a response
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

      // Prepare input for watsonx.ai
      const input = this.convertMessagesToWatsonxInput(
        this.conversationHistory,
        options?.systemPrompt || this.config.systemPrompt
      );

      logger.debug(`Sending message to watsonx.ai (${this.conversationHistory.length} messages in history)`);

      // Make API call with retry logic
      const response = await this.withRetry(async () => {
        return await this.client.generateText({
          modelId: this.model,
          projectId: this.projectId,
          input: input,
          parameters: {
            max_new_tokens: options?.maxTokens || this.config.maxTokens,
            temperature: options?.temperature || this.config.temperature,
            top_p: 1,
            top_k: 50
          }
        });
      });

      // Extract response text
      const responseText = response.result.results[0].generated_text;
      const inputTokens = response.result.results[0].input_token_count || 0;
      const outputTokens = response.result.results[0].generated_token_count || 0;

      // Add assistant response to history
      this.addToHistory('assistant', responseText, {
        tokenCount: outputTokens,
        model: this.model,
        finishReason: response.result.results[0].stop_reason || undefined
      });

      // Update token usage
      this.updateTokenUsage(inputTokens, outputTokens);

      const duration = Date.now() - startTime;
      logger.success(`Received response from watsonx.ai (${duration}ms, ${outputTokens} tokens)`);

      return responseText;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to get response from watsonx.ai (${duration}ms):`, error);
      throw new TraceQAError(
        `Watsonx API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      // Prepare input for watsonx.ai
      const input = this.convertMessagesToWatsonxInput(
        this.conversationHistory,
        options?.systemPrompt || this.config.systemPrompt
      );

      logger.debug(`Streaming message to watsonx.ai (${this.conversationHistory.length} messages in history)`);

      // Make streaming API call
      const stream = await this.client.generateTextStream({
        modelId: this.model,
        projectId: this.projectId,
        input: input,
        parameters: {
          max_new_tokens: options?.maxTokens || this.config.maxTokens,
          temperature: options?.temperature || this.config.temperature,
          top_p: 1,
          top_k: 50
        }
      });

      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        if (chunk.results && chunk.results.length > 0) {
          const result = chunk.results[0];
          
          if (result.generated_text) {
            const text = result.generated_text;
            fullResponse += text;
            yield text;
          }
          
          if (result.input_token_count) {
            inputTokens = result.input_token_count;
          }
          
          if (result.generated_token_count) {
            outputTokens = result.generated_token_count;
          }
        }
      }

      // Add assistant response to history
      this.addToHistory('assistant', fullResponse, {
        tokenCount: outputTokens,
        model: this.model
      });

      // Update token usage
      this.updateTokenUsage(inputTokens, outputTokens);

      const duration = Date.now() - startTime;
      logger.success(`Completed streaming response from watsonx.ai (${duration}ms, ${outputTokens} tokens)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to stream response from watsonx.ai (${duration}ms):`, error);
      throw new TraceQAError(
        `Watsonx API streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const pricing = WatsonxClient.PRICING[this.model as keyof typeof WatsonxClient.PRICING] || 
                    WatsonxClient.PRICING['ibm/granite-13b-chat-v2'];
    
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
      (sum, msg) => sum + WatsonxClient.estimateTokens(msg.content),
      0
    );
    const messageTokens = WatsonxClient.estimateTokens(message);
    const systemTokens = WatsonxClient.estimateTokens(this.config.systemPrompt);

    const totalTokens = historyTokens + messageTokens + systemTokens;
    const maxContextTokens = 8192; // IBM Granite context window

    return totalTokens > maxContextTokens;
  }

  /**
   * Trim conversation history to fit within token limits
   */
  trimHistory(maxTokens: number = 6000): void {
    let totalTokens = WatsonxClient.estimateTokens(this.config.systemPrompt);
    const trimmedHistory: ConversationMessage[] = [];

    // Keep most recent messages
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i];
      const msgTokens = WatsonxClient.estimateTokens(msg.content);

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
 * Create a Watsonx client with default configuration
 */
export function createWatsonxClient(apiKey: string, options?: Partial<AgentConfig>): WatsonxClient {
  return new WatsonxClient({
    apiKey,
    ...options
  });
}

// Made with Bob