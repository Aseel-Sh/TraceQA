import type { DiscoveredRoute, TraceQAConfig } from '../types/index.js';

/**
 * Lightweight test-data inference utilities
 *
 * Responsibilities:
 * - Given a generated test step and available context (OpenAPI, route snippets, config),
 *   assess confidence that the generated request data matches inferred constraints.
 * - Prefer OpenAPI schema checks when available.
 * - Use simple presence/required-field checks rather than heavy static analysis.
 */

export interface TestDataConfidenceResult {
  confidence: number; // 0.0 - 1.0
  reasons: string[];
}

/**
 * Assess a generated request body against available OpenAPI spec and route validation snippets.
 * Returns confidence in [0..1] and a list of reasons.
 */
export function assessTestDataConfidence(
  body: Record<string, any> | null,
  method: string,
  route: DiscoveredRoute | null,
  openApiSpec: any,
  config: TraceQAConfig
): TestDataConfidenceResult {
  const reasons: string[] = [];
  if (!body) {
    reasons.push('No request body generated');
    return { confidence: 0.0, reasons };
  }

  // If OpenAPI is present and contains the route, do schema checks
  if (openApiSpec && route && openApiSpec.paths) {
    try {
      const pathItem = openApiSpec.paths[route.path] || openApiSpec.paths[route.path.replace(/:\w+/g, '{$1}')] || null;
      const operation = pathItem && pathItem[method.toLowerCase()];
      if (operation && operation.requestBody) {
        // Basic required field check
        const req = operation.requestBody;
        const content = req.content || req;
        const schema = (content['application/json'] && content['application/json'].schema) || content.schema;
        if (schema) {
          const required = schema.required || (schema.properties ? Object.keys(schema.properties).filter(() => false) : []);
          // If schema lists required, increase confidence if body has them
          if (Array.isArray(required) && required.length > 0) {
            const missing = required.filter((r: string) => !(r in body));
            if (missing.length === 0) {
              reasons.push('Body satisfies OpenAPI required fields');
              return { confidence: 0.95, reasons };
            } else {
              reasons.push(`Body missing OpenAPI required fields: ${missing.join(', ')}`);
              return { confidence: 0.15, reasons };
            }
          }
        }
      }
    } catch (e) {
      reasons.push('OpenAPI schema validation errored');
    }
  }

  // If route contains validation snippets, do lightweight checks
  if (route && Array.isArray(route.validationSnippets) && route.validationSnippets.length > 0) {
    // If snippets mention 'required' or schema-like properties, prefer medium confidence
    const joined = route.validationSnippets.join(' ').toLowerCase();
    if (joined.includes('required') || joined.includes('schema') || joined.includes('joi') || joined.includes('zod')) {
      // If body has more than 1 field, assume medium confidence
      const keys = body ? Object.keys(body).length : 0;
      if (keys >= 1) {
        reasons.push('Route validation snippets found; body appears structurally compatible');
        return { confidence: 0.6, reasons };
      }
      reasons.push('Route validation snippets found but body is very small');
      return { confidence: 0.2, reasons };
    }
  }

  // If config.sampleData exists and appears to match fields, increase confidence
  if (config && config.sampleData) {
    const sampleKeys = Object.keys(config.sampleData || {}).length;
    if (sampleKeys > 0) {
      const overlap = Object.keys(body).filter(k => k in (config.sampleData as any));
      if (overlap.length > 0) {
        reasons.push('Body fields overlap with config sample data');
        return { confidence: 0.7, reasons };
      }
    }
  }

  // Heuristic: if body has more than 2 fields, assume low-medium confidence
  if (body && Object.keys(body).length >= 2) {
    reasons.push('Body has multiple fields; moderate confidence');
    return { confidence: 0.5, reasons };
  }

  reasons.push('Insufficient evidence to trust generated body');
  return { confidence: 0.1, reasons };
}

// Made with Bob
