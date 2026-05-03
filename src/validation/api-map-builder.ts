/**
 * API Map Builder
 *
 * Builds a unified API map from multiple evidence sources before test generation.
 * The map is the single source of truth for endpoints, methods, and request schemas.
 *
 * Priority order:
 * 1. OpenAPI/Swagger fetched from the live baseUrl
 * 2. OpenAPI/Swagger files in the repository
 * 3. Framework route discovery (static analysis)
 * 4. Request schemas already attached to discovered routes
 *
 * @module api-map-builder
 */

import type { DiscoveredRoute } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Confidence derived from the evidence source */
export type MapSourceConfidence = 'high' | 'medium' | 'low';

/** Where the entry originated */
export type MapSource = 'openapi-live' | 'openapi-file' | 'framework' | 'source';

/** A single endpoint in the API map */
export interface APIMapEntry {
  method: string;
  path: string;
  source: MapSource;
  confidence: MapSourceConfidence;
  requestSchema?: {
    required?: string[];
    properties?: Record<string, any>;
    type?: string;
    [key: string]: any;
  };
  responseSchemas?: Record<string, any>;
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: any;
    example?: any;
    description?: string;
  }>;
  operationId?: string;
  description?: string;
  tags?: string[];
  examples?: Record<string, any>;
  /** Original source snippet from framework discovery */
  sourceSnippet?: string;
  /** Validation snippets from framework discovery */
  validationSnippets?: string[];
}

/** The complete API map produced by the builder */
export interface APIMap {
  entries: APIMapEntry[];
  sources: string[];
  buildTimestamp: string;
  /** Whether an OpenAPI spec was available (live or file) */
  hasOpenAPI: boolean;
}

// ---------------------------------------------------------------------------
// OpenAPI live fetch
// ---------------------------------------------------------------------------

const LIVE_OPENAPI_PATHS = [
  '/openapi.json',
  '/swagger.json',
  '/api/openapi.json',
  '/api/swagger.json',
  '/docs/openapi.json',
  '/api-docs',
  '/v1/openapi.json',
  '/v2/openapi.json',
  '/v3/openapi.json',
];

/**
 * Try to fetch an OpenAPI spec from the running application.
 * Returns the parsed spec or null.
 */
async function fetchLiveOpenAPI(baseUrl: string): Promise<any | null> {
  const normalizedBase = baseUrl.replace(/\/$/, '');

  for (const candidate of LIVE_OPENAPI_PATHS) {
    const url = `${normalizedBase}${candidate}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) continue;

      const text = await response.text();
      if (!text || text.trim().length === 0) continue;

      const spec = JSON.parse(text);
      if (spec && (spec.openapi || spec.swagger) && spec.paths) {
        logger.info(`Fetched live OpenAPI spec from ${url}`);
        return spec;
      }
    } catch {
      // Endpoint not available — continue
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// OpenAPI → entries
// ---------------------------------------------------------------------------

function resolveRef(ref: string, spec: any): any {
  const parts = ref.split('/').slice(1);
  let current = spec;
  for (const part of parts) {
    current = current?.[part];
    if (!current) return {};
  }
  return current;
}

function deepResolveRefs(obj: any, spec: any, depth = 0): any {
  if (depth > 10 || !obj || typeof obj !== 'object') return obj;
  if (obj.$ref) return deepResolveRefs(resolveRef(obj.$ref, spec), spec, depth + 1);
  if (Array.isArray(obj)) return obj.map(item => deepResolveRefs(item, spec, depth + 1));
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = deepResolveRefs(v, spec, depth + 1);
  }
  return result;
}

function extractEntriesFromOpenAPI(spec: any, source: MapSource): APIMapEntry[] {
  const entries: APIMapEntry[] = [];
  if (!spec?.paths) return entries;

  const confidence: MapSourceConfidence = source === 'openapi-live' ? 'high' : 'high';

  for (const [routePath, methods] of Object.entries(spec.paths as Record<string, any>)) {
    if (!methods || typeof methods !== 'object') continue;

    for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
      if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) continue;
      const op = operation as any;

      // Request schema
      let requestSchema: APIMapEntry['requestSchema'];
      if (op.requestBody?.content) {
        const ct = Object.keys(op.requestBody.content)[0];
        const raw = op.requestBody.content[ct]?.schema;
        if (raw) {
          requestSchema = deepResolveRefs(raw, spec);
        }
      }

      // Response schemas
      const responseSchemas: Record<string, any> = {};
      if (op.responses) {
        for (const [code, resp] of Object.entries(op.responses as Record<string, any>)) {
          const r = resp as any;
          const schema = r.content ? r.content[Object.keys(r.content)[0]]?.schema : undefined;
          responseSchemas[code] = {
            description: r.description,
            schema: schema ? deepResolveRefs(schema, spec) : undefined,
          };
        }
      }

      // Parameters
      const parameters = (op.parameters || []).map((p: any) => {
        const resolved = p.$ref ? resolveRef(p.$ref, spec) : p;
        return {
          name: resolved.name,
          in: resolved.in,
          required: resolved.required,
          schema: resolved.schema ? deepResolveRefs(resolved.schema, spec) : undefined,
          example: resolved.example,
          description: resolved.description,
        };
      });

      // Examples from requestBody
      let examples: Record<string, any> | undefined;
      if (op.requestBody?.content) {
        const ct = Object.keys(op.requestBody.content)[0];
        const ctObj = op.requestBody.content[ct];
        if (ctObj?.example) {
          examples = { default: ctObj.example };
        } else if (ctObj?.examples) {
          examples = {};
          for (const [name, ex] of Object.entries(ctObj.examples as Record<string, any>)) {
            examples[name] = (ex as any).value ?? ex;
          }
        }
      }

      entries.push({
        method: method.toUpperCase(),
        path: routePath,
        source,
        confidence,
        requestSchema,
        responseSchemas: Object.keys(responseSchemas).length > 0 ? responseSchemas : undefined,
        parameters: parameters.length > 0 ? parameters : undefined,
        operationId: op.operationId,
        description: op.description || op.summary,
        tags: op.tags,
        examples,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Discovered routes → entries
// ---------------------------------------------------------------------------

function convertDiscoveredRoutes(routes: DiscoveredRoute[]): APIMapEntry[] {
  return routes.map(route => {
    const hasSchema = !!route.requestSchema && Object.keys(route.requestSchema).length > 0;
    return {
      method: route.method.toUpperCase(),
      path: route.path,
      source: 'framework' as MapSource,
      confidence: hasSchema ? 'medium' : 'low' as MapSourceConfidence,
      requestSchema: route.requestSchema,
      responseSchemas: route.responseSchema,
      parameters: route.parameters,
      operationId: route.operationId,
      description: route.description,
      tags: route.tags,
      sourceSnippet: route.sourceSnippet,
      validationSnippets: route.validationSnippets,
    };
  });
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

function entryKey(e: { method: string; path: string }): string {
  return `${e.method.toUpperCase()} ${e.path}`;
}

const SOURCE_PRIORITY: Record<MapSource, number> = {
  'openapi-live': 4,
  'openapi-file': 3,
  'framework': 2,
  'source': 1,
};

function mergeEntries(all: APIMapEntry[]): APIMapEntry[] {
  const map = new Map<string, APIMapEntry>();

  // Sort by priority descending so highest-priority source wins
  const sorted = [...all].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);

  for (const entry of sorted) {
    const key = entryKey(entry);
    if (!map.has(key)) {
      map.set(key, entry);
    } else {
      // Merge: keep higher-priority entry but fill in missing fields
      const existing = map.get(key)!;
      if (!existing.requestSchema && entry.requestSchema) {
        existing.requestSchema = entry.requestSchema;
      }
      if (!existing.responseSchemas && entry.responseSchemas) {
        existing.responseSchemas = entry.responseSchemas;
      }
      if (!existing.parameters && entry.parameters) {
        existing.parameters = entry.parameters;
      }
      if (!existing.description && entry.description) {
        existing.description = entry.description;
      }
      if (!existing.examples && entry.examples) {
        existing.examples = entry.examples;
      }
      if (!existing.sourceSnippet && entry.sourceSnippet) {
        existing.sourceSnippet = entry.sourceSnippet;
      }
      if (!existing.validationSnippets && entry.validationSnippets) {
        existing.validationSnippets = entry.validationSnippets;
      }
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the API map from all available evidence sources.
 *
 * @param baseUrl        - Running application base URL
 * @param discoveredRoutes - Routes already discovered by route-discovery module
 * @param openApiSpec    - OpenAPI spec already loaded from file (if any)
 * @returns The unified API map
 */
export async function buildAPIMap(
  baseUrl: string,
  discoveredRoutes: DiscoveredRoute[],
  openApiSpec?: any,
): Promise<APIMap> {
  const allEntries: APIMapEntry[] = [];
  const sources: string[] = [];

  // Priority 1: Try fetching OpenAPI from the live application
  let liveSpec: any = null;
  try {
    liveSpec = await fetchLiveOpenAPI(baseUrl);
  } catch {
    logger.debug('Live OpenAPI fetch failed (non-fatal)');
  }

  if (liveSpec) {
    const liveEntries = extractEntriesFromOpenAPI(liveSpec, 'openapi-live');
    allEntries.push(...liveEntries);
    sources.push(`openapi-live (${liveEntries.length} endpoints)`);
    logger.info(`API Map: ${liveEntries.length} endpoints from live OpenAPI`);
  }

  // Priority 2: Use OpenAPI spec loaded from file
  if (openApiSpec && openApiSpec.paths) {
    const fileEntries = extractEntriesFromOpenAPI(openApiSpec, 'openapi-file');
    allEntries.push(...fileEntries);
    sources.push(`openapi-file (${fileEntries.length} endpoints)`);
    logger.info(`API Map: ${fileEntries.length} endpoints from OpenAPI file`);
  }

  // Priority 3: Convert discovered routes (framework static analysis)
  if (discoveredRoutes.length > 0) {
    const frameworkEntries = convertDiscoveredRoutes(discoveredRoutes);
    allEntries.push(...frameworkEntries);
    sources.push(`framework (${frameworkEntries.length} endpoints)`);
    logger.info(`API Map: ${frameworkEntries.length} endpoints from framework discovery`);
  }

  // Merge and deduplicate
  const merged = mergeEntries(allEntries);

  const apiMap: APIMap = {
    entries: merged,
    sources,
    buildTimestamp: new Date().toISOString(),
    hasOpenAPI: !!liveSpec || !!(openApiSpec && openApiSpec.paths),
  };

  logger.success(`API Map built: ${merged.length} unique endpoints from ${sources.length} source(s)`);

  return apiMap;
}

/**
 * Find a map entry matching the given method and path.
 * Handles parameter placeholders (e.g. /users/{id} matches /users/:id).
 */
export function findMapEntry(apiMap: APIMap, method: string, path: string): APIMapEntry | null {
  const normalizedPath = path.replace(/\/$/, '').toLowerCase();
  const normalizedMethod = method.toUpperCase();

  // Exact match first
  const exact = apiMap.entries.find(e =>
    e.method === normalizedMethod && e.path.replace(/\/$/, '').toLowerCase() === normalizedPath
  );
  if (exact) return exact;

  // Template match (parameter placeholders)
  for (const entry of apiMap.entries) {
    if (entry.method !== normalizedMethod) continue;

    const entryParts = entry.path.split('/');
    const pathParts = normalizedPath.split('/');
    if (entryParts.length !== pathParts.length) continue;

    let matches = true;
    for (let i = 0; i < entryParts.length; i++) {
      const ep = entryParts[i].toLowerCase();
      const pp = pathParts[i];
      if (ep === pp) continue;
      if (/^\{[^}]+\}$|^:[^/]+$|^<[^>]+>$|^\[[^\]]+\]$/.test(entryParts[i])) continue;
      matches = false;
      break;
    }
    if (matches) return entry;
  }

  return null;
}

/**
 * Find the best API map entry for a given task context.
 * Uses method inference from action keywords and path matching from resource keywords.
 */
export function findMapEntryForAC(
  apiMap: APIMap,
  acText: string,
  taskTitle: string,
): APIMapEntry | null {
  const combined = `${taskTitle} ${acText}`.toLowerCase();

  // Infer expected method
  let expectedMethod: string | null = null;
  if (/\b(create|add|submit|post|new|insert|register|signup)\b/i.test(combined)) expectedMethod = 'POST';
  else if (/\b(update|edit|modify|change|patch)\b/i.test(combined)) expectedMethod = 'PUT';
  else if (/\b(delete|remove|destroy)\b/i.test(combined)) expectedMethod = 'DELETE';
  else if (/\b(get|retrieve|fetch|view|show|read|find|list)\b/i.test(combined)) expectedMethod = 'GET';

  // Score each entry
  let bestEntry: APIMapEntry | null = null;
  let bestScore = 0;

  for (const entry of apiMap.entries) {
    let score = 0;

    // Method match
    if (expectedMethod && entry.method === expectedMethod) {
      score += 30;
    } else if (expectedMethod && entry.method === 'PATCH' && expectedMethod === 'PUT') {
      score += 25; // PUT/PATCH are interchangeable for update
    }

    // Path token matching — check if AC keywords appear in path segments
    const pathTokens = entry.path.toLowerCase()
      .split('/')
      .filter(t => t.length > 0 && t !== 'api' && !/^v\d+$/.test(t) && !/^\{/.test(t) && !/^:/.test(t));

    const combinedTokens = combined
      .split(/[^a-z0-9]+/)
      .filter(t => t.length > 2);

    for (const pt of pathTokens) {
      for (const ct of combinedTokens) {
        if (pt === ct || pt.includes(ct) || ct.includes(pt)) {
          score += 20;
        }
        // Singular/plural matching
        if (pt.endsWith('s') && ct === pt.slice(0, -1)) score += 18;
        if (ct.endsWith('s') && pt === ct.slice(0, -1)) score += 18;
      }
    }

    // Description/operationId matching
    if (entry.description) {
      const descTokens = entry.description.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
      for (const dt of descTokens) {
        if (combinedTokens.includes(dt)) score += 10;
      }
    }
    if (entry.operationId) {
      const opTokens = entry.operationId.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
      for (const ot of opTokens) {
        if (combinedTokens.includes(ot)) score += 10;
      }
    }

    // Higher-confidence sources get a bonus
    if (entry.confidence === 'high') score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Require a minimum score to avoid weak matches
  if (bestScore < 30) return null;

  return bestEntry;
}

/**
 * Generate a valid request body from an API map entry's schema.
 * Returns null if no schema is available.
 */
export function generateBodyFromMapEntry(
  entry: APIMapEntry,
  testId: string,
  timestamp: string,
): Record<string, any> | null {
  // Prefer examples
  if (entry.examples) {
    const firstExample = Object.values(entry.examples)[0];
    if (firstExample && typeof firstExample === 'object') {
      return { ...firstExample };
    }
  }

  // Use requestSchema
  if (!entry.requestSchema?.properties) return null;

  const body: Record<string, any> = {};
  const required = entry.requestSchema.required || [];
  const properties = entry.requestSchema.properties;

  // Generate all required fields first, then optional
  const allFields = [...required, ...Object.keys(properties).filter(f => !required.includes(f))];

  for (const fieldName of allFields) {
    const schema = properties[fieldName];
    if (!schema) {
      body[fieldName] = `${fieldName}-${testId}`;
      continue;
    }
    body[fieldName] = generateValueFromSchema(fieldName, schema, testId, timestamp);
  }

  return Object.keys(body).length > 0 ? body : null;
}

/**
 * Generate a negative/invalid body by mutating a valid body from schema.
 * @param entry - API map entry with schema
 * @param invalidCondition - What to make invalid (e.g. 'missing_required', 'invalid_enum', 'invalid_type')
 * @param fieldHint - Optional field name hint from the AC text
 */
export function generateNegativeBody(
  entry: APIMapEntry,
  invalidCondition: string,
  testId: string,
  timestamp: string,
  fieldHint?: string,
): Record<string, any> | null {
  const validBody = generateBodyFromMapEntry(entry, testId, timestamp);
  if (!validBody) return null;

  const schema = entry.requestSchema;
  if (!schema?.properties) return validBody; // Can't mutate without schema

  const required = schema.required || [];
  const condLower = invalidCondition.toLowerCase();

  // Missing required field
  if (condLower.includes('missing') || condLower.includes('required')) {
    const targetField = fieldHint
      ? required.find(f => f.toLowerCase().includes(fieldHint.toLowerCase()))
      : required[0];
    if (targetField && targetField in validBody) {
      const mutated = { ...validBody };
      delete mutated[targetField];
      return mutated;
    }
  }

  // Invalid enum value
  if (condLower.includes('invalid') && (condLower.includes('enum') || condLower.includes('value'))) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if ((fieldSchema as any).enum) {
        const mutated = { ...validBody };
        mutated[field] = `__invalid_${field}_${testId}`;
        return mutated;
      }
    }
  }

  // Invalid type
  if (condLower.includes('type') || condLower.includes('format')) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      const type = (fieldSchema as any).type;
      if (type === 'number' || type === 'integer') {
        const mutated = { ...validBody };
        mutated[field] = 'not_a_number';
        return mutated;
      }
      if (type === 'string' && (fieldSchema as any).format === 'email') {
        const mutated = { ...validBody };
        mutated[field] = 'not-an-email';
        return mutated;
      }
    }
  }

  // Generic: return the valid body with a note that mutation couldn't be applied
  return validBody;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateValueFromSchema(
  fieldName: string,
  schema: any,
  testId: string,
  timestamp: string,
): any {
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length > 0) return schema.enum[0];

  const type = schema.type;
  const format = schema.format;
  const nameLower = fieldName.toLowerCase();

  if (type === 'string') {
    if (format === 'email' || nameLower.includes('email')) return `${fieldName}-${testId}@example.com`;
    if (format === 'date-time') return new Date().toISOString();
    if (format === 'date') return new Date().toISOString().split('T')[0];
    if (format === 'uri' || format === 'url') return 'https://example.com';
    if (format === 'uuid') return `00000000-0000-4000-a000-${testId.padStart(12, '0').slice(0, 12)}`;
    if (nameLower.includes('password')) return `SecurePass123!${testId}`;
    if (nameLower.includes('phone')) return '+1234567890';
    if (nameLower.includes('name')) return `${fieldName}-${testId}`;
    if (nameLower.includes('description') || nameLower.includes('text')) return `Test ${fieldName} for ${testId}`;

    // Respect length constraints
    let val = `${fieldName}-${testId}`;
    if (schema.minLength && val.length < schema.minLength) val = val.padEnd(schema.minLength, 'x');
    if (schema.maxLength && val.length > schema.maxLength) val = val.slice(0, schema.maxLength);
    return val;
  }

  if (type === 'integer') {
    if (schema.minimum !== undefined) return schema.minimum + 1;
    if (nameLower.includes('quantity') || nameLower.includes('count')) return 1;
    if (nameLower.includes('price') || nameLower.includes('amount')) return 100;
    return 1;
  }

  if (type === 'number') {
    if (schema.minimum !== undefined) return schema.minimum + 0.5;
    if (nameLower.includes('price') || nameLower.includes('amount')) return 99.99;
    return 1.0;
  }

  if (type === 'boolean') return true;

  if (type === 'array') {
    const itemSchema = schema.items || { type: 'string' };
    return [generateValueFromSchema(fieldName, itemSchema, testId, timestamp)];
  }

  if (type === 'object' && schema.properties) {
    const nested: Record<string, any> = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      nested[k] = generateValueFromSchema(k, v, testId, timestamp);
    }
    return nested;
  }

  return `${fieldName}-${testId}`;
}
