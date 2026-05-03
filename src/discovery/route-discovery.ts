import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface DiscoveredRoute {
  method: string;
  path: string;
  handler?: string;
  file?: string;
  line?: number;
  /** Optional nearby source snippet (few lines) to help infer validation or schema */
  sourceSnippet?: string;
  /** Optional small set of validation/schema snippets discovered near handler */
  validationSnippets?: string[];
  
  // OpenAPI Schema Integration (Issue #2)
  // All schema fields are optional for backward compatibility
  
  /** Request body schema from OpenAPI specification */
  requestSchema?: {
    required?: string[];
    properties?: Record<string, any>;
    type?: string;
    [key: string]: any;
  };
  
  /** Response schemas by status code from OpenAPI specification */
  responseSchema?: {
    [statusCode: string]: {
      schema?: any;
      description?: string;
      headers?: Record<string, any>;
    };
  };
  
  /** Path, query, header, and cookie parameters from OpenAPI specification */
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema?: any;
    description?: string;
    example?: any;
  }>;
  
  /** OpenAPI operation metadata */
  operationId?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
}

export interface RouteDiscoveryResult {
  routes: DiscoveredRoute[];
  framework: string;
  discoveryMethod: 'static-analysis' | 'openapi' | 'runtime-logs';
}

interface FrameworkPattern {
  name: string;
  filePatterns: string[];
  routePattern: RegExp;
  methodExtractor: (match: RegExpMatchArray, content: string, filePath: string) => DiscoveredRoute[];
}

const FRAMEWORK_PATTERNS: FrameworkPattern[] = [
  // Express (Node.js)
  {
    name: 'Express',
    filePatterns: ['**/*.js', '**/*.ts'],
    routePattern: /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    methodExtractor: (match, content, filePath) => {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = extractNearbySnippet(content, match.index || 0, 8);
      const validations = extractValidationSnippets(snippet);
      return [{
        method,
        path: routePath,
        file: filePath,
        line,
        sourceSnippet: snippet,
        validationSnippets: validations,
      }];
    }
  },
  // FastAPI (Python)
  {
    name: 'FastAPI',
    filePatterns: ['**/*.py'],
    routePattern: /@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    methodExtractor: (match, content, filePath) => {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = extractNearbySnippet(content, match.index || 0, 8);
      const validations = extractValidationSnippets(snippet);
      return [{
        method,
        path: routePath,
        file: filePath,
        line,
        sourceSnippet: snippet,
        validationSnippets: validations,
      }];
    }
  },
  // ASP.NET (C#)
  {
    name: 'ASP.NET',
    filePatterns: ['**/*.cs'],
    routePattern: /\[Http(Get|Post|Put|Delete|Patch)(?:\("([^"]+)"\))?\]/g,
    methodExtractor: (match, content, filePath) => {
      const method = match[1].toUpperCase();
      const routePath = match[2] || '/';
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = extractNearbySnippet(content, match.index || 0, 8);
      const validations = extractValidationSnippets(snippet);

      // Look for [Route] attribute above
      const beforeMatch = content.substring(0, match.index!);
      const routeMatch = beforeMatch.match(/\[Route\("([^\"]+)"\)\]/);
      const basePath = routeMatch ? routeMatch[1] : '';

      return [{
        method,
        path: basePath + routePath,
        file: filePath,
        line,
        sourceSnippet: snippet,
        validationSnippets: validations,
      }];
    }
  },
  // Spring Boot (Java)
  {
    name: 'Spring Boot',
    filePatterns: ['**/*.java'],
    routePattern: /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/g,
    methodExtractor: (match, content, filePath) => {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const line = content.substring(0, match.index).split('\n').length;
      
      // Look for @RequestMapping at class level
      const beforeMatch = content.substring(0, match.index!);
      const requestMappingMatch = beforeMatch.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
      const basePath = requestMappingMatch ? requestMappingMatch[1] : '';
      
      return [{
        method,
        path: basePath + routePath,
        file: filePath,
        line
      }];
    }
  },
  // Go
  {
    name: 'Go',
    filePatterns: ['**/*.go'],
    routePattern: /(?:HandleFunc|GET|POST|PUT|DELETE|PATCH)\s*\(\s*["']([^"']+)["']/g,
    methodExtractor: (match, content, filePath) => {
      const routePath = match[1];
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = extractNearbySnippet(content, match.index || 0, 8);
      const validations = extractValidationSnippets(snippet);

      // Try to determine method from context
      const beforeMatch = content.substring(Math.max(0, match.index! - 50), match.index!);
      let method = 'GET'; // default
      
      if (beforeMatch.includes('POST') || match[0].startsWith('POST')) {
        method = 'POST';
      } else if (beforeMatch.includes('PUT') || match[0].startsWith('PUT')) {
        method = 'PUT';
      } else if (beforeMatch.includes('DELETE') || match[0].startsWith('DELETE')) {
        method = 'DELETE';
      } else if (beforeMatch.includes('PATCH') || match[0].startsWith('PATCH')) {
        method = 'PATCH';
      }
      
      return [{
        method,
        path: routePath,
        file: filePath,
        line,
        sourceSnippet: snippet,
        validationSnippets: validations,
      }];
    }
  }
];

/**
 * Extract a nearby snippet of source code around an index (number of lines)
 */
function extractNearbySnippet(content: string, index: number, contextLines = 8): string {
  const lines = content.split('\n');
  // Find line number for index
  let charCount = 0;
  let lineNumber = 0;
  for (let i = 0; i < lines.length; i++) {
    charCount += lines[i].length + 1; // +1 for newline
    if (charCount >= index) {
      lineNumber = i;
      break;
    }
  }

  const start = Math.max(0, lineNumber - contextLines);
  const end = Math.min(lines.length - 1, lineNumber + contextLines);
  return lines.slice(start, end + 1).join('\n');
}

/**
 * Very small heuristic scan to pick out validation-like snippets from a source snippet.
 * Keep this lightweight: just return lines that contain common validation keywords.
 */
function extractValidationSnippets(snippet: string): string[] {
  const keywords = ['joi', 'validate(', 'schema', 'pydantic', 'marshmallow', 'zod', 'isEmail', 'IsEmail', '@IsEmail', 'bodyParser', 'express-validator', 'Joi.object', 'check(', 'tryParse', 'parse_obj'];
  const lines = snippet.split('\n');
  const found: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        found.push(line.trim());
        break;
      }
    }
  }
  return found.slice(0, 10);
}

async function findFiles(dir: string, patterns: string[]): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip node_modules, .git, etc.
        if (entry.name === 'node_modules' || entry.name === '.git' || 
            entry.name === 'venv' || entry.name === '__pycache__' ||
            entry.name === 'bin' || entry.name === 'obj' || entry.name === 'target') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          // Check if file matches any pattern
          for (const pattern of patterns) {
            const ext = pattern.replace('**/*', '');
            if (fullPath.endsWith(ext)) {
              files.push(fullPath);
              break;
            }
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  await walk(dir);
  return files;
}

async function discoverRoutesFromCode(
  projectPath: string,
  framework: FrameworkPattern
): Promise<DiscoveredRoute[]> {
  const routes: DiscoveredRoute[] = [];
  const files = await findFiles(projectPath, framework.filePatterns);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const matches = Array.from(content.matchAll(framework.routePattern));
      
      for (const match of matches) {
        const discoveredRoutes = framework.methodExtractor(match, content, file);
        routes.push(...discoveredRoutes);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return routes;
}

async function discoverRoutesFromOpenAPI(projectPath: string): Promise<DiscoveredRoute[]> {
  const routes: DiscoveredRoute[] = [];
  const possibleFiles = [
    'openapi.json',
    'openapi.yaml',
    'openapi.yml',
    'swagger.json',
    'swagger.yaml',
    'swagger.yml',
    'api/openapi.json',
    'api/openapi.yaml',
    'docs/openapi.json',
    'docs/openapi.yaml'
  ];
  
  for (const fileName of possibleFiles) {
    const filePath = path.join(projectPath, fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let spec: any;
      
      if (fileName.endsWith('.json')) {
        spec = JSON.parse(content);
      } else {
        spec = yaml.load(content);
      }
      
      // Parse OpenAPI spec with full schema extraction (Issue #2)
      if (spec.paths) {
        for (const [routePath, methods] of Object.entries(spec.paths)) {
          for (const [method, details] of Object.entries(methods as any)) {
            if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
              const operation = details as any;
              
              // Extract request body schema
              let requestSchema: any = undefined;
              if (operation.requestBody?.content) {
                const contentType = Object.keys(operation.requestBody.content)[0];
                if (contentType && operation.requestBody.content[contentType]?.schema) {
                  requestSchema = operation.requestBody.content[contentType].schema;
                }
              }
              
              // Extract response schemas by status code
              const responseSchema: Record<string, any> = {};
              if (operation.responses) {
                for (const [statusCode, response] of Object.entries(operation.responses as any)) {
                  const resp = response as any;
                  responseSchema[statusCode] = {
                    description: resp.description,
                    schema: resp.content ?
                      resp.content[Object.keys(resp.content)[0]]?.schema :
                      undefined,
                    headers: resp.headers
                  };
                }
              }
              
              // Extract parameters (path, query, header, cookie)
              const parameters = operation.parameters?.map((param: any) => ({
                name: param.name,
                in: param.in,
                required: param.required,
                schema: param.schema,
                description: param.description,
                example: param.example
              })) || [];
              
              // Build discovered route with full schema information
              routes.push({
                method: method.toUpperCase(),
                path: routePath,
                handler: operation.operationId,
                file: filePath,
                description: operation.description || operation.summary,
                operationId: operation.operationId,
                tags: operation.tags,
                security: operation.security,
                // Schema fields for evidence-based testing
                requestSchema,
                responseSchema: Object.keys(responseSchema).length > 0 ? responseSchema : undefined,
                parameters: parameters.length > 0 ? parameters : undefined
              });
            }
          }
        }
      }
      
      // If we found routes, return them
      if (routes.length > 0) {
        return routes;
      }
    } catch (error) {
      // File doesn't exist or can't be parsed, continue
    }
  }
  
  return routes;
}

function detectFramework(_projectPath: string, projectType?: string): FrameworkPattern | null {
  if (projectType) {
    const typeMap: { [key: string]: string } = {
      'node': 'Express',
      'python': 'FastAPI',
      'dotnet': 'ASP.NET',
      'java': 'Spring Boot',
      'go': 'Go'
    };
    
    const frameworkName = typeMap[projectType.toLowerCase()];
    if (frameworkName) {
      return FRAMEWORK_PATTERNS.find(f => f.name === frameworkName) || null;
    }
  }
  
  // Auto-detect based on files present
  // This is a simple heuristic
  return FRAMEWORK_PATTERNS[0]; // Default to Express for now
}

export async function discoverRoutes(
  projectPath: string,
  projectType?: string
): Promise<RouteDiscoveryResult> {
  // First, try OpenAPI/Swagger
  const openApiRoutes = await discoverRoutesFromOpenAPI(projectPath);
  if (openApiRoutes.length > 0) {
    return {
      routes: openApiRoutes,
      framework: 'OpenAPI',
      discoveryMethod: 'openapi'
    };
  }
  
  // Try all frameworks if no project type specified
  if (!projectType) {
    const allRoutes: DiscoveredRoute[] = [];
    let detectedFramework = 'Unknown';
    
    for (const framework of FRAMEWORK_PATTERNS) {
      const routes = await discoverRoutesFromCode(projectPath, framework);
      if (routes.length > 0) {
        allRoutes.push(...routes);
        detectedFramework = framework.name;
      }
    }
    
    return {
      routes: allRoutes,
      framework: detectedFramework,
      discoveryMethod: 'static-analysis'
    };
  }
  
  // Use specific framework
  const framework = detectFramework(projectPath, projectType);
  if (!framework) {
    return {
      routes: [],
      framework: 'Unknown',
      discoveryMethod: 'static-analysis'
    };
  }
  
  const routes = await discoverRoutesFromCode(projectPath, framework);
  
  return {
    routes,
    framework: framework.name,
    discoveryMethod: 'static-analysis'
  };
}

export async function discoverRoutesForMultipleProjects(
  projectPaths: string[]
): Promise<Map<string, RouteDiscoveryResult>> {
  const results = new Map<string, RouteDiscoveryResult>();
  
  for (const projectPath of projectPaths) {
    const result = await discoverRoutes(projectPath);
    results.set(projectPath, result);
  }
  
  return results;
}

// Made with Bob
