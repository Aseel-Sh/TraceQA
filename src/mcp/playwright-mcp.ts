/**
 * Playwright MCP Integration
 * Client for advanced browser automation using Playwright MCP server
 */

import { MCPClient } from './client.js';
import {
  MCPConfig,
  MCPServerConfig,
  BrowserState,
  BrowserType,
  NavigationOptions,
  SelectorOptions,
  ScreenshotOptions,
  PlaywrightConfig,
  NetworkInterceptionOptions,
  MCPOperationResult,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Playwright MCP Client for advanced browser automation
 */
export class PlaywrightMCPClient extends MCPClient {
  private currentUrl: string = '';
  private pageTitle: string = '';
  private isNavigating: boolean = false;
  private browserType: BrowserType;
  private playwrightConfig: PlaywrightConfig;

  constructor(config: MCPConfig = {}, playwrightConfig?: PlaywrightConfig) {
    const serverConfig: MCPServerConfig = {
      name: 'playwright-mcp',
      command: 'npx',
      args: ['-y', '@executeautomation/playwright-mcp-server'],
      env: {}
    };

    super(serverConfig, config);

    this.playwrightConfig = playwrightConfig || {
      browserType: BrowserType.CHROMIUM,
      headless: config.headless !== false,
      slowMo: config.slowMo || 0
    };

    this.browserType = this.playwrightConfig.browserType;
  }

  /**
   * Launch browser with specific configuration
   */
  async launchBrowser(): Promise<MCPOperationResult<void>> {
    try {
      logger.info(`Launching ${this.browserType} browser`);

      const result = await this.executeTool<void>('playwright_launch', {
        browserType: this.browserType,
        headless: this.playwrightConfig.headless,
        slowMo: this.playwrightConfig.slowMo,
        devtools: this.playwrightConfig.devtools,
        args: this.playwrightConfig.args,
        ignoreHTTPSErrors: this.playwrightConfig.ignoreHTTPSErrors,
        downloadsPath: this.playwrightConfig.downloadsPath,
        proxy: this.playwrightConfig.proxy
      });

      if (result.success) {
        logger.success(`${this.browserType} browser launched successfully`);
      } else {
        logger.error(`Failed to launch ${this.browserType} browser`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('Browser launch error', String(error));
      throw new TraceQAError(
        `Failed to launch ${this.browserType} browser`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string, options?: Partial<NavigationOptions>): Promise<MCPOperationResult<void>> {
    try {
      this.isNavigating = true;
      logger.info(`Navigating to: ${url}`);

      const result = await this.executeTool<void>('playwright_goto', {
        url,
        waitUntil: options?.waitUntil || 'load',
        timeout: options?.timeout || this.config.timeout
      });

      if (result.success) {
        this.currentUrl = url;
        this.isNavigating = false;
        logger.success(`Successfully navigated to: ${url}`);
      } else {
        this.isNavigating = false;
        logger.error(`Failed to navigate to: ${url}`, result.error);
      }

      return result;
    } catch (error) {
      this.isNavigating = false;
      logger.error(`Navigation error: ${url}`, String(error));
      throw new TraceQAError(
        `Failed to navigate to ${url}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Click an element
   */
  async click(selector: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Clicking element: ${selector}`);

      const result = await this.executeTool<void>('playwright_click', {
        selector,
        timeout: options?.timeout || this.config.timeout,
        force: false,
        noWaitAfter: false
      });

      if (result.success) {
        logger.success(`Successfully clicked: ${selector}`);
      } else {
        logger.error(`Failed to click: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Click error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to click element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Type text into an element
   */
  async type(selector: string, text: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Typing into element: ${selector}`);

      const result = await this.executeTool<void>('playwright_fill', {
        selector,
        value: text,
        timeout: options?.timeout || this.config.timeout
      });

      if (result.success) {
        logger.success(`Successfully typed into: ${selector}`);
      } else {
        logger.error(`Failed to type into: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Type error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to type into element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(options?: ScreenshotOptions): Promise<MCPOperationResult<string>> {
    try {
      logger.debug('Taking screenshot');

      const result = await this.executeTool<string>('playwright_screenshot', {
        path: options?.path,
        fullPage: options?.fullPage !== false,
        type: options?.type || 'png',
        quality: options?.quality,
        clip: options?.clip
      });

      if (result.success) {
        logger.success('Screenshot captured successfully');
      } else {
        logger.error('Failed to capture screenshot', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Screenshot error', String(error));
      throw new TraceQAError(
        'Failed to capture screenshot',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(selector: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Waiting for element: ${selector}`);

      const result = await this.executeTool<void>('playwright_wait_for_selector', {
        selector,
        timeout: options?.timeout || this.config.timeout,
        state: options?.state || 'visible'
      });

      if (result.success) {
        logger.success(`Element found: ${selector}`);
      } else {
        logger.error(`Element not found: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Wait for element error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to wait for element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Evaluate JavaScript in the page context
   */
  async evaluate<T = any>(script: string): Promise<MCPOperationResult<T>> {
    try {
      logger.debug('Evaluating script in page context');

      const result = await this.executeTool<T>('playwright_evaluate', {
        expression: script
      });

      if (result.success) {
        logger.success('Script evaluated successfully');
      } else {
        logger.error('Script evaluation failed', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Evaluate error', String(error));
      throw new TraceQAError(
        'Failed to evaluate script',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Fill a form field
   */
  async fill(selector: string, value: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    return this.type(selector, value, options);
  }

  /**
   * Select an option from a dropdown
   */
  async select(selector: string, value: string | string[], options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Selecting option in: ${selector}`);

      const result = await this.executeTool<void>('playwright_select_option', {
        selector,
        values: Array.isArray(value) ? value : [value],
        timeout: options?.timeout || this.config.timeout
      });

      if (result.success) {
        logger.success(`Successfully selected option in: ${selector}`);
      } else {
        logger.error(`Failed to select option in: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Select error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to select option in: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Hover over an element
   */
  async hover(selector: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Hovering over element: ${selector}`);

      const result = await this.executeTool<void>('playwright_hover', {
        selector,
        timeout: options?.timeout || this.config.timeout
      });

      if (result.success) {
        logger.success(`Successfully hovered over: ${selector}`);
      } else {
        logger.error(`Failed to hover over: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Hover error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to hover over element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Press a key
   */
  async press(selector: string, key: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Pressing key '${key}' on element: ${selector}`);

      const result = await this.executeTool<void>('playwright_press', {
        selector,
        key,
        timeout: options?.timeout || this.config.timeout
      });

      if (result.success) {
        logger.success(`Successfully pressed key '${key}' on: ${selector}`);
      } else {
        logger.error(`Failed to press key on: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Press key error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to press key on element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<MCPOperationResult<void>> {
    try {
      logger.debug('Going back in history');

      const result = await this.executeTool<void>('playwright_go_back', {
        timeout: this.config.timeout
      });

      if (result.success) {
        logger.success('Successfully went back');
      } else {
        logger.error('Failed to go back', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Go back error', String(error));
      throw new TraceQAError(
        'Failed to go back',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<MCPOperationResult<void>> {
    try {
      logger.debug('Going forward in history');

      const result = await this.executeTool<void>('playwright_go_forward', {
        timeout: this.config.timeout
      });

      if (result.success) {
        logger.success('Successfully went forward');
      } else {
        logger.error('Failed to go forward', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Go forward error', String(error));
      throw new TraceQAError(
        'Failed to go forward',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<MCPOperationResult<void>> {
    try {
      logger.debug('Reloading page');

      const result = await this.executeTool<void>('playwright_reload', {
        timeout: this.config.timeout
      });

      if (result.success) {
        logger.success('Successfully reloaded page');
      } else {
        logger.error('Failed to reload page', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Reload error', String(error));
      throw new TraceQAError(
        'Failed to reload page',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Set up network interception
   */
  async setupNetworkInterception(options: NetworkInterceptionOptions): Promise<MCPOperationResult<void>> {
    try {
      logger.info('Setting up network interception');

      const result = await this.executeTool<void>('playwright_route', {
        patterns: options.patterns || ['**/*'],
        blockResources: options.blockResources,
        modifyResponses: options.modifyResponses
      });

      if (result.success) {
        logger.success('Network interception configured');
      } else {
        logger.error('Failed to configure network interception', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Network interception error', String(error));
      throw new TraceQAError(
        'Failed to setup network interception',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Get the current page state
   */
  async getPageState(): Promise<BrowserState> {
    try {
      const [url, title] = await Promise.all([
        this.evaluate<string>('window.location.href'),
        this.evaluate<string>('document.title')
      ]);

      const state: BrowserState = {
        url: url.data || this.currentUrl,
        title: title.data || this.pageTitle,
        isNavigating: this.isNavigating,
        viewport: {
          width: this.config.viewport?.width || 1280,
          height: this.config.viewport?.height || 720
        }
      };

      return state;
    } catch (error) {
      logger.error('Failed to get page state', String(error));
      throw new TraceQAError(
        'Failed to get page state',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<MCPOperationResult<string>> {
    try {
      logger.debug(`Getting text from element: ${selector}`);

      const result = await this.executeTool<string>('playwright_text_content', {
        selector
      });

      if (result.success) {
        logger.success(`Successfully got text from: ${selector}`);
      } else {
        logger.error(`Failed to get text from: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Get text error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to get text from element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Check if an element is visible
   */
  async isVisible(selector: string): Promise<MCPOperationResult<boolean>> {
    try {
      logger.debug(`Checking visibility of element: ${selector}`);

      const result = await this.executeTool<boolean>('playwright_is_visible', {
        selector
      });

      if (result.success) {
        logger.success(`Visibility check completed for: ${selector}`);
      } else {
        logger.error(`Failed to check visibility: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Visibility check error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to check element visibility: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Check if an element is enabled
   */
  async isEnabled(selector: string): Promise<MCPOperationResult<boolean>> {
    try {
      logger.debug(`Checking if element is enabled: ${selector}`);

      const result = await this.executeTool<boolean>('playwright_is_enabled', {
        selector
      });

      if (result.success) {
        logger.success(`Enabled check completed for: ${selector}`);
      } else {
        logger.error(`Failed to check if enabled: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Enabled check error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to check if element is enabled: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Get element attribute
   */
  async getAttribute(selector: string, attribute: string): Promise<MCPOperationResult<string | null>> {
    try {
      logger.debug(`Getting attribute '${attribute}' from element: ${selector}`);

      const result = await this.executeTool<string | null>('playwright_get_attribute', {
        selector,
        name: attribute
      });

      if (result.success) {
        logger.success(`Successfully got attribute from: ${selector}`);
      } else {
        logger.error(`Failed to get attribute from: ${selector}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Get attribute error: ${selector}`, String(error));
      throw new TraceQAError(
        `Failed to get attribute from element: ${selector}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(timeout?: number): Promise<MCPOperationResult<void>> {
    try {
      logger.debug('Waiting for navigation');

      const result = await this.executeTool<void>('playwright_wait_for_load_state', {
        state: 'load',
        timeout: timeout || this.config.timeout
      });

      if (result.success) {
        logger.success('Navigation completed');
      } else {
        logger.error('Navigation wait failed', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Wait for navigation error', String(error));
      throw new TraceQAError(
        'Failed to wait for navigation',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Wait for a specific network request
   */
  async waitForRequest(urlPattern: string, timeout?: number): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Waiting for request: ${urlPattern}`);

      const result = await this.executeTool<void>('playwright_wait_for_request', {
        urlPattern,
        timeout: timeout || this.config.timeout
      });

      if (result.success) {
        logger.success(`Request detected: ${urlPattern}`);
      } else {
        logger.error(`Request wait failed: ${urlPattern}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Wait for request error: ${urlPattern}`, String(error));
      throw new TraceQAError(
        `Failed to wait for request: ${urlPattern}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Wait for a specific network response
   */
  async waitForResponse(urlPattern: string, timeout?: number): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Waiting for response: ${urlPattern}`);

      const result = await this.executeTool<void>('playwright_wait_for_response', {
        urlPattern,
        timeout: timeout || this.config.timeout
      });

      if (result.success) {
        logger.success(`Response detected: ${urlPattern}`);
      } else {
        logger.error(`Response wait failed: ${urlPattern}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Wait for response error: ${urlPattern}`, String(error));
      throw new TraceQAError(
        `Failed to wait for response: ${urlPattern}`,
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<MCPOperationResult<void>> {
    try {
      logger.info('Closing browser');

      const result = await this.executeTool<void>('playwright_close', {});

      if (result.success) {
        logger.success('Browser closed successfully');
      } else {
        logger.error('Failed to close browser', result.error);
      }

      return result;
    } catch (error) {
      logger.error('Close browser error', String(error));
      throw new TraceQAError(
        'Failed to close browser',
        ErrorCategory.MCP,
        error
      );
    }
  }

  /**
   * Get the current URL
   */
  getCurrentUrl(): string {
    return this.currentUrl;
  }

  /**
   * Get the page title
   */
  getPageTitle(): string {
    return this.pageTitle;
  }

  /**
   * Check if currently navigating
   */
  isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }

  /**
   * Get the browser type
   */
  getBrowserType(): BrowserType {
    return this.browserType;
  }

  /**
   * Switch to a different browser type
   */
  async switchBrowser(browserType: BrowserType): Promise<void> {
    if (this.browserType === browserType) {
      logger.info(`Already using ${browserType} browser`);
      return;
    }

    logger.info(`Switching from ${this.browserType} to ${browserType}`);
    
    // Close current browser
    await this.close();
    
    // Update browser type
    this.browserType = browserType;
    this.playwrightConfig.browserType = browserType;
    
    // Launch new browser
    await this.launchBrowser();
    
    logger.success(`Switched to ${browserType} browser`);
  }
}

// Made with Bob
