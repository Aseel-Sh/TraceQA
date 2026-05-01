/**
 * Web Tester
 * High-level web UI testing wrapper for MCP browser clients
 */

import {
  WebTestConfig,
  WebTestResult,
  WebTestStep,
  WebTestAction,
  BrowserAction,
  NavigationOptions,
  SelectorOptions,
  ScreenshotOptions,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { MCPClientManager } from '../mcp/index.js';
import { logger } from '../utils/logger.js';

/**
 * Web Tester class for UI testing
 */
export class WebTester {
  private mcpManager: MCPClientManager;
  private browserServerName: string;
  private defaultTimeout: number;
  private screenshotDir: string;

  constructor(
    mcpManager: MCPClientManager,
    options: {
      browserServerName?: string;
      timeout?: number;
      screenshotDir?: string;
    } = {}
  ) {
    this.mcpManager = mcpManager;
    this.browserServerName = options.browserServerName || 'browser';
    this.defaultTimeout = options.timeout || 30000;
    this.screenshotDir = options.screenshotDir || './screenshots';

    logger.debug('Web Tester initialized', {
      browserServer: this.browserServerName,
      timeout: this.defaultTimeout
    });
  }

  /**
   * Execute a web test
   */
  async executeTest(config: WebTestConfig): Promise<WebTestResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const stepResults: WebTestResult['steps'] = [];
    let retryCount = 0;
    const maxRetries = config.retries || 0;

    logger.info(`Executing web test: ${config.name}`);

    while (retryCount <= maxRetries) {
      try {
        // Set viewport if specified
        if (config.viewport) {
          await this.setViewport(config.viewport.width, config.viewport.height);
        }

        // Navigate to URL
        await this.navigate(config.url, { timeout: config.timeout });

        // Execute each step
        for (let i = 0; i < config.steps.length; i++) {
          const step = config.steps[i];
          logger.debug(`[${i + 1}/${config.steps.length}] ${step.description}`);

          const stepStartTime = Date.now();
          let stepPassed = false;
          let stepError: string | undefined;
          let stepScreenshot: string | undefined;

          try {
            await this.executeStep(step);
            stepPassed = true;

            // Take screenshot if requested
            if (step.screenshot) {
              stepScreenshot = await this.takeScreenshot(
                `${config.name}-step-${i + 1}`
              );
              screenshots.push(stepScreenshot);
            }
          } catch (error) {
            stepError = error instanceof Error ? error.message : String(error);
            logger.error(`Step failed: ${step.description}`, error);

            // Take screenshot on error
            try {
              stepScreenshot = await this.takeScreenshot(
                `${config.name}-step-${i + 1}-error`
              );
              screenshots.push(stepScreenshot);
            } catch (screenshotError) {
              logger.warn('Failed to capture error screenshot', screenshotError);
            }

            if (!step.continueOnFailure) {
              throw error;
            }
          }

          const stepDuration = Date.now() - stepStartTime;
          stepResults.push({
            step,
            passed: stepPassed,
            duration: stepDuration,
            error: stepError,
            screenshot: stepScreenshot
          });
        }

        // All steps completed successfully
        const duration = Date.now() - startTime;
        logger.success(`Web test passed: ${config.name} (${duration}ms)`);

        return {
          testName: config.name,
          passed: true,
          steps: stepResults,
          screenshots,
          duration,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        const duration = Date.now() - startTime;

        if (retryCount < maxRetries) {
          logger.warn(
            `Web test failed, retrying (${retryCount + 1}/${maxRetries}): ${config.name}`
          );
          retryCount++;
          stepResults.length = 0; // Clear step results for retry
          screenshots.length = 0;
          continue;
        }

        logger.error(`Web test failed: ${config.name}`, error);

        return {
          testName: config.name,
          passed: false,
          steps: stepResults,
          screenshots,
          error: error instanceof Error ? error.message : String(error),
          duration,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Should never reach here
    throw new TraceQAError(
      'Unexpected error in web test execution',
      ErrorCategory.TEST_EXECUTION
    );
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: WebTestStep): Promise<void> {
    const timeout = step.timeout || this.defaultTimeout;

    switch (step.action) {
      case WebTestAction.NAVIGATE:
        if (step.value) {
          await this.navigate(step.value, { timeout });
        }
        break;

      case WebTestAction.CLICK:
        if (step.selector) {
          await this.click(step.selector, { timeout });
        }
        break;

      case WebTestAction.TYPE:
        if (step.selector && step.value) {
          await this.type(step.selector, step.value, { timeout });
        }
        break;

      case WebTestAction.FILL:
        if (step.selector && step.value) {
          await this.fill(step.selector, step.value, { timeout });
        }
        break;

      case WebTestAction.SELECT:
        if (step.selector && step.value) {
          await this.select(step.selector, step.value, { timeout });
        }
        break;

      case WebTestAction.HOVER:
        if (step.selector) {
          await this.hover(step.selector, { timeout });
        }
        break;

      case WebTestAction.PRESS:
        if (step.value) {
          await this.press(step.value);
        }
        break;

      case WebTestAction.WAIT:
        if (step.value) {
          await this.wait(parseInt(step.value, 10));
        }
        break;

      case WebTestAction.WAIT_FOR_ELEMENT:
        if (step.selector) {
          await this.waitForElement(step.selector, { timeout });
        }
        break;

      case WebTestAction.WAIT_FOR_NAVIGATION:
        await this.waitForNavigation({ timeout });
        break;

      case WebTestAction.SCREENSHOT:
        if (step.value) {
          await this.takeScreenshot(step.value);
        }
        break;

      case WebTestAction.ASSERT_TEXT:
        if (step.selector && step.value) {
          await this.assertText(step.selector, step.value, { timeout });
        }
        break;

      case WebTestAction.ASSERT_VISIBLE:
        if (step.selector) {
          await this.assertVisible(step.selector, { timeout });
        }
        break;

      case WebTestAction.ASSERT_ENABLED:
        if (step.selector) {
          await this.assertEnabled(step.selector, { timeout });
        }
        break;

      case WebTestAction.ASSERT_URL:
        if (step.value) {
          await this.assertUrl(step.value);
        }
        break;

      case WebTestAction.EVALUATE:
        if (step.value) {
          await this.evaluate(step.value);
        }
        break;

      case WebTestAction.GO_BACK:
        await this.goBack();
        break;

      case WebTestAction.GO_FORWARD:
        await this.goForward();
        break;

      case WebTestAction.RELOAD:
        await this.reload();
        break;

      default:
        throw new TraceQAError(
          `Unknown web test action: ${step.action}`,
          ErrorCategory.TEST_EXECUTION
        );
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string, options: Partial<NavigationOptions> = {}): Promise<void> {
    logger.debug(`Navigating to: ${url}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'navigate',
      arguments: {
        url,
        waitUntil: options.waitUntil || 'load'
      },
      timeout: options.timeout || this.defaultTimeout
    });

    if (!result.success) {
      throw new TraceQAError(
        `Navigation failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Click an element
   */
  async click(selector: string, options: Partial<SelectorOptions> = {}): Promise<void> {
    logger.debug(`Clicking: ${selector}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'click',
      arguments: {
        selector,
        timeout: options.timeout || this.defaultTimeout
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Click failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Type text into an element
   */
  async type(
    selector: string,
    text: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Typing into ${selector}: ${text}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'type',
      arguments: {
        selector,
        text,
        timeout: options.timeout || this.defaultTimeout
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Type failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Fill an input element
   */
  async fill(
    selector: string,
    value: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Filling ${selector}: ${value}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'fill',
      arguments: {
        selector,
        value,
        timeout: options.timeout || this.defaultTimeout
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Fill failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Select an option from a dropdown
   */
  async select(
    selector: string,
    value: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Selecting ${value} in ${selector}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'select',
      arguments: {
        selector,
        value,
        timeout: options.timeout || this.defaultTimeout
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Select failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Hover over an element
   */
  async hover(selector: string, options: Partial<SelectorOptions> = {}): Promise<void> {
    logger.debug(`Hovering over: ${selector}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'hover',
      arguments: {
        selector,
        timeout: options.timeout || this.defaultTimeout
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Hover failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Press a key
   */
  async press(key: string): Promise<void> {
    logger.debug(`Pressing key: ${key}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'press',
      arguments: { key }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Press failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Wait for a specified time
   */
  async wait(ms: number): Promise<void> {
    logger.debug(`Waiting ${ms}ms`);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(
    selector: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Waiting for element: ${selector}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'waitForElement',
      arguments: {
        selector,
        timeout: options.timeout || this.defaultTimeout,
        state: options.state || 'visible'
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Wait for element failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(options: Partial<NavigationOptions> = {}): Promise<void> {
    logger.debug('Waiting for navigation');

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'waitForNavigation',
      arguments: {
        waitUntil: options.waitUntil || 'load',
        timeout: options.timeout || this.defaultTimeout
      }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Wait for navigation failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string): Promise<string> {
    logger.debug(`Taking screenshot: ${name}`);

    const result = await this.mcpManager.executeTool<{ path: string }>({
      serverName: this.browserServerName,
      toolName: 'screenshot',
      arguments: {
        path: `${this.screenshotDir}/${name}.png`,
        fullPage: true
      }
    });

    if (!result.success || !result.data) {
      throw new TraceQAError(
        `Screenshot failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }

    return result.data.path;
  }

  /**
   * Assert text content of an element
   */
  async assertText(
    selector: string,
    expectedText: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Asserting text in ${selector}: ${expectedText}`);

    const result = await this.mcpManager.executeTool<{ text: string }>({
      serverName: this.browserServerName,
      toolName: 'evaluate',
      arguments: {
        expression: `document.querySelector('${selector}')?.textContent || ''`
      },
      timeout: options.timeout || this.defaultTimeout
    });

    if (!result.success || !result.data) {
      throw new TraceQAError(
        `Assert text failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }

    const actualText = result.data.text || '';
    if (!actualText.includes(expectedText)) {
      throw new TraceQAError(
        `Text assertion failed: expected "${expectedText}", got "${actualText}"`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Assert element is visible
   */
  async assertVisible(
    selector: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Asserting visible: ${selector}`);

    await this.waitForElement(selector, {
      ...options,
      state: 'visible'
    });
  }

  /**
   * Assert element is enabled
   */
  async assertEnabled(
    selector: string,
    options: Partial<SelectorOptions> = {}
  ): Promise<void> {
    logger.debug(`Asserting enabled: ${selector}`);

    const result = await this.mcpManager.executeTool<{ enabled: boolean }>({
      serverName: this.browserServerName,
      toolName: 'evaluate',
      arguments: {
        expression: `!document.querySelector('${selector}')?.disabled`
      },
      timeout: options.timeout || this.defaultTimeout
    });

    if (!result.success || !result.data?.enabled) {
      throw new TraceQAError(
        `Element is not enabled: ${selector}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Assert current URL
   */
  async assertUrl(expectedUrl: string): Promise<void> {
    logger.debug(`Asserting URL: ${expectedUrl}`);

    const result = await this.mcpManager.executeTool<{ url: string }>({
      serverName: this.browserServerName,
      toolName: 'evaluate',
      arguments: {
        expression: 'window.location.href'
      }
    });

    if (!result.success || !result.data) {
      throw new TraceQAError(
        `Assert URL failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }

    const actualUrl = result.data.url || '';
    if (!actualUrl.includes(expectedUrl)) {
      throw new TraceQAError(
        `URL assertion failed: expected "${expectedUrl}", got "${actualUrl}"`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Evaluate JavaScript in the browser
   */
  async evaluate(expression: string): Promise<unknown> {
    logger.debug(`Evaluating: ${expression}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'evaluate',
      arguments: { expression }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Evaluate failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }

    return result.data;
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    logger.debug('Going back');

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'goBack',
      arguments: {}
    });

    if (!result.success) {
      throw new TraceQAError(
        `Go back failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    logger.debug('Going forward');

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'goForward',
      arguments: {}
    });

    if (!result.success) {
      throw new TraceQAError(
        `Go forward failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    logger.debug('Reloading page');

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'reload',
      arguments: {}
    });

    if (!result.success) {
      throw new TraceQAError(
        `Reload failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Set viewport size
   */
  async setViewport(width: number, height: number): Promise<void> {
    logger.debug(`Setting viewport: ${width}x${height}`);

    const result = await this.mcpManager.executeTool({
      serverName: this.browserServerName,
      toolName: 'setViewport',
      arguments: { width, height }
    });

    if (!result.success) {
      throw new TraceQAError(
        `Set viewport failed: ${result.error}`,
        ErrorCategory.TEST_EXECUTION
      );
    }
  }

  /**
   * Execute multiple web tests
   */
  async executeTests(configs: WebTestConfig[]): Promise<WebTestResult[]> {
    logger.info(`Executing ${configs.length} web tests...`);

    const results: WebTestResult[] = [];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      logger.info(`[${i + 1}/${configs.length}] ${config.name}`);

      const result = await this.executeTest(config);
      results.push(result);
    }

    const passed = results.filter(r => r.passed).length;
    logger.success(
      `Web tests completed: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}%)`
    );

    return results;
  }
}

/**
 * Create a web tester instance
 */
export function createWebTester(
  mcpManager: MCPClientManager,
  options?: {
    browserServerName?: string;
    timeout?: number;
    screenshotDir?: string;
  }
): WebTester {
  return new WebTester(mcpManager, options);
}

// Made with Bob