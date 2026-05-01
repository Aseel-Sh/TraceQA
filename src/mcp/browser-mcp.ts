/**
 * Browser MCP Integration
 * Client for browser automation using Puppeteer MCP server
 */

import { MCPClient } from './client.js';
import {
  MCPConfig,
  MCPServerConfig,
  BrowserState,
  NavigationOptions,
  SelectorOptions,
  ScreenshotOptions,
  MCPOperationResult,
  TraceQAError,
  ErrorCategory
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Browser MCP Client for Puppeteer-based browser automation
 */
export class BrowserMCPClient extends MCPClient {
  private currentUrl: string = '';
  private pageTitle: string = '';
  private isNavigating: boolean = false;

  constructor(config: MCPConfig = {}) {
    const serverConfig: MCPServerConfig = {
      name: 'browser-mcp',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      env: {}
    };

    super(serverConfig, config);
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string, options?: Partial<NavigationOptions>): Promise<MCPOperationResult<void>> {
    try {
      this.isNavigating = true;
      logger.info(`Navigating to: ${url}`);

      const result = await this.executeTool<void>('puppeteer_navigate', {
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

      const result = await this.executeTool<void>('puppeteer_click', {
        selector,
        timeout: options?.timeout || this.config.timeout,
        visible: options?.visible !== false
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

      const result = await this.executeTool<void>('puppeteer_fill', {
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

      const result = await this.executeTool<string>('puppeteer_screenshot', {
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

      const result = await this.executeTool<void>('puppeteer_wait_for_selector', {
        selector,
        timeout: options?.timeout || this.config.timeout,
        visible: options?.visible !== false,
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

      const result = await this.executeTool<T>('puppeteer_evaluate', {
        script
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
   * Fill a form field (alias for type)
   */
  async fill(selector: string, value: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    return this.type(selector, value, options);
  }

  /**
   * Select an option from a dropdown
   */
  async select(selector: string, value: string, options?: Partial<SelectorOptions>): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Selecting option in: ${selector}`);

      const result = await this.executeTool<void>('puppeteer_select', {
        selector,
        value,
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

      const result = await this.executeTool<void>('puppeteer_hover', {
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
  async press(key: string): Promise<MCPOperationResult<void>> {
    try {
      logger.debug(`Pressing key: ${key}`);

      const result = await this.executeTool<void>('puppeteer_keyboard_press', {
        key
      });

      if (result.success) {
        logger.success(`Successfully pressed key: ${key}`);
      } else {
        logger.error(`Failed to press key: ${key}`, result.error);
      }

      return result;
    } catch (error) {
      logger.error(`Press key error: ${key}`, String(error));
      throw new TraceQAError(
        `Failed to press key: ${key}`,
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

      const result = await this.executeTool<void>('puppeteer_go_back', {});

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

      const result = await this.executeTool<void>('puppeteer_go_forward', {});

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

      const result = await this.executeTool<void>('puppeteer_reload', {});

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

      const result = await this.evaluate<string>(
        `document.querySelector('${selector}')?.textContent || ''`
      );

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
   * Check if an element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const result = await this.evaluate<boolean>(
        `document.querySelector('${selector}') !== null`
      );

      return result.success && result.data === true;
    } catch (error) {
      logger.error(`Element exists check error: ${selector}`, String(error));
      return false;
    }
  }

  /**
   * Get element attribute
   */
  async getAttribute(selector: string, attribute: string): Promise<MCPOperationResult<string>> {
    try {
      logger.debug(`Getting attribute '${attribute}' from element: ${selector}`);

      const result = await this.evaluate<string>(
        `document.querySelector('${selector}')?.getAttribute('${attribute}') || ''`
      );

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

      const result = await this.executeTool<void>('puppeteer_wait_for_navigation', {
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
   * Close the browser
   */
  async close(): Promise<MCPOperationResult<void>> {
    try {
      logger.info('Closing browser');

      const result = await this.executeTool<void>('puppeteer_close', {});

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
}

// Made with Bob
