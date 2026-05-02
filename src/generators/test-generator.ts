export interface ExecutableHTTPTest {
  id: string;
  acceptanceCriterionId: string;
  title: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedBodyContains?: string[];
  expectedBodySchema?: any;
}

export interface GeneratedTestArtifacts {
  qaTaskPlan: any; // existing QA task plan
  httpTests: ExecutableHTTPTest[];
  generatedAt: string;
  metadata: {
    totalTests: number;
    apiTests: number;
    manualTests: number;
  };
}

/**
 * Extract HTTP method from test step description
 */
function extractMethod(step: string): string {
  const upperStep = step.toUpperCase();
  if (upperStep.includes('POST')) return 'POST';
  if (upperStep.includes('PUT')) return 'PUT';
  if (upperStep.includes('PATCH')) return 'PATCH';
  if (upperStep.includes('DELETE')) return 'DELETE';
  if (upperStep.includes('GET')) return 'GET';
  return 'GET'; // default
}

/**
 * Extract URL from test step description
 */
function extractUrl(step: string): string {
  // Look for common URL patterns
  const urlMatch = step.match(/(?:to|at|endpoint)\s+[`"]?([\/\w\-{}:]+)[`"]?/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Look for paths starting with /
  const pathMatch = step.match(/[`"]?(\/[\w\-\/{}:]+)[`"]?/);
  if (pathMatch) {
    return pathMatch[1];
  }
  
  return '/api/endpoint'; // default placeholder
}

/**
 * Extract expected status code from test step
 * EVIDENCE-BASED: look for explicit status codes first
 * Fallback to generic HTTP semantics (not business-specific keywords)
 */
function extractExpectedStatus(step: string): number {
  // Look for explicit status codes first
  const statusMatch = step.match(/\b(200|201|204|400|401|403|404|409|422|500)\b/);
  if (statusMatch) {
    return parseInt(statusMatch[1]);
  }
  
  // Fallback to generic HTTP semantics only
  const lowerStep = step.toLowerCase();
  
  // Success
  if (lowerStep.includes('created')) return 201;
  if (lowerStep.includes('no content') || lowerStep.includes('deleted')) return 204;
  
  // Client errors - generic
  if (lowerStep.includes('bad request') || lowerStep.includes('invalid')) return 400;
  if (lowerStep.includes('forbidden') || lowerStep.includes('not allowed')) return 403;
  if (lowerStep.includes('not found')) return 404;
  
  // Server errors - only for catastrophic failures
  if (lowerStep.includes('server error') || lowerStep.includes('internal error')) return 500;
  
  return 200; // default success
}

/**
 * Extract request body from test step
 */
function extractBody(step: string): any | undefined {
  // Look for JSON-like content
  const jsonMatch = step.match(/\{[^}]+\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // If parsing fails, return as string
      return jsonMatch[0];
    }
  }
  
  // Look for key-value pairs
  const kvMatch = step.match(/with\s+(.+?)(?:\s+and\s+|\s*$)/i);
  if (kvMatch) {
    const pairs = kvMatch[1].split(/\s+and\s+/i);
    const body: Record<string, any> = {};
    pairs.forEach(pair => {
      const [key, value] = pair.split(/[:=]/);
      if (key && value) {
        body[key.trim()] = value.trim().replace(/['"]/g, '');
      }
    });
    if (Object.keys(body).length > 0) {
      return body;
    }
  }
  
  return undefined;
}

/**
 * Extract expected body content from test step
 */
function extractExpectedBodyContains(step: string): string[] | undefined {
  const contains: string[] = [];
  
  // Look for "contains" or "includes" patterns
  const containsMatch = step.match(/(?:contains?|includes?)\s+[`"]?([^`"]+)[`"]?/gi);
  if (containsMatch) {
    containsMatch.forEach(match => {
      const content = match.replace(/(?:contains?|includes?)\s+/i, '').replace(/[`"]/g, '');
      contains.push(content);
    });
  }
  
  // Look for quoted strings that might be expected content
  const quotedMatch = step.match(/["']([^"']+)["']/g);
  if (quotedMatch) {
    quotedMatch.forEach(match => {
      const content = match.replace(/["']/g, '');
      if (content.length > 3) { // Avoid short strings like "a", "is"
        contains.push(content);
      }
    });
  }
  
  return contains.length > 0 ? contains : undefined;
}

/**
 * Determine if a test is an API test based on its description
 */
function isApiTest(testCase: any): boolean {
  const description = JSON.stringify(testCase).toLowerCase();
  return description.includes('api') || 
         description.includes('endpoint') || 
         description.includes('request') ||
         description.includes('post') ||
         description.includes('get') ||
         description.includes('put') ||
         description.includes('delete');
}

/**
 * Generate executable HTTP tests from IBM QA task plan
 */
export function generateExecutableTests(qaTaskPlan: any): GeneratedTestArtifacts {
  const httpTests: ExecutableHTTPTest[] = [];
  let testIdCounter = 1;
  let apiTestCount = 0;
  let manualTestCount = 0;
  
  // Extract test cases from the QA task plan
  const testCases = qaTaskPlan.testCases || qaTaskPlan.test_cases || [];
  
  testCases.forEach((testCase: any) => {
    const isApi = isApiTest(testCase);
    
    if (isApi) {
      apiTestCount++;
      
      // Extract test steps
      const steps = testCase.steps || testCase.test_steps || [];
      const firstStep = steps[0] || '';
      const stepDescription = typeof firstStep === 'string' ? firstStep : firstStep.description || '';
      
      // Generate executable HTTP test
      const httpTest: ExecutableHTTPTest = {
        id: `TC-${String(testIdCounter).padStart(3, '0')}`,
        acceptanceCriterionId: testCase.acceptanceCriterionId || testCase.acceptance_criterion_id || 'AC-1',
        title: testCase.title || testCase.name || `Test ${testIdCounter}`,
        method: extractMethod(stepDescription),
        url: extractUrl(stepDescription),
        expectedStatus: extractExpectedStatus(stepDescription),
      };
      
      // Add optional fields
      const body = extractBody(stepDescription);
      if (body) {
        httpTest.body = body;
      }
      
      const expectedContains = extractExpectedBodyContains(stepDescription);
      if (expectedContains) {
        httpTest.expectedBodyContains = expectedContains;
      }
      
      // Add default headers for JSON APIs
      if (httpTest.method !== 'GET' && httpTest.body) {
        httpTest.headers = {
          'Content-Type': 'application/json'
        };
      }
      
      httpTests.push(httpTest);
      testIdCounter++;
    } else {
      manualTestCount++;
    }
  });
  
  return {
    qaTaskPlan,
    httpTests,
    generatedAt: new Date().toISOString(),
    metadata: {
      totalTests: testCases.length,
      apiTests: apiTestCount,
      manualTests: manualTestCount
    }
  };
}

/**
 * Generate test ID in format TC-001, TC-002, etc.
 */
export function generateTestId(index: number): string {
  return `TC-${String(index).padStart(3, '0')}`;
}

// Made with Bob
