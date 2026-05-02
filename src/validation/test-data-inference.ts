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
  config: TraceQAConfig,
  ibmConfidence: number = 0
): TestDataConfidenceResult {
  const reasons: string[] = [];

  // Start from IBM-provided confidence as a baseline
  let score = typeof ibmConfidence === 'number' ? Math.max(0, Math.min(1, ibmConfidence)) : 0.3;
  reasons.push(`Baseline IBM confidence: ${score.toFixed(2)}`);

  // Short-circuit for GET/HEAD: bodies are not required
  const methodUpper = (method || 'GET').toUpperCase();
  if (methodUpper === 'GET' || methodUpper === 'HEAD') {
    if (route) {
      reasons.push('GET/HEAD route discovered — request body not required');
      score = Math.max(score, 0.9);
      return { confidence: score, reasons };
    }
    reasons.push('GET/HEAD with no discovered route — relying on baseline confidence');
    return { confidence: score, reasons };
  }

  // If no body was generated for methods that normally accept a body, that's acceptable
  if (!body) {
    reasons.push('No request body generated for non-GET method — treated as acceptable');
    // keep baseline score
    return { confidence: score, reasons };
  }

  // If OpenAPI is present and contains the route, do schema checks and boost/penalize accordingly
  if (openApiSpec && route && openApiSpec.paths) {
    try {
      const pathItem = openApiSpec.paths[route.path] || openApiSpec.paths[route.path.replace(/:\\w+/g, '{$1}')] || null;
      const operation = pathItem && pathItem[methodUpper.toLowerCase()];
      if (operation && operation.requestBody) {
        const req = operation.requestBody;
        const content = req.content || req;
        const schema = (content['application/json'] && content['application/json'].schema) || content.schema;
        if (schema) {
          const required = Array.isArray(schema.required) ? schema.required : [];
          if (required.length > 0) {
            const missing = required.filter((r: string) => !(r in body));
            if (missing.length === 0) {
              reasons.push('Body satisfies OpenAPI required fields');
              score = Math.max(score, 0.95);
            } else {
              reasons.push(`Body missing OpenAPI required fields: ${missing.join(', ')}`);
              score = Math.min(score, 0.15);
              return { confidence: score, reasons };
            }
          } else {
            reasons.push('OpenAPI schema present but no required fields declared');
            score = Math.max(score, score + 0.05);
          }
        }
      }
    } catch (e) {
      reasons.push('OpenAPI schema validation errored');
    }
  }

  // If route contains validation snippets, give a modest boost if body looks object-like
  if (route && Array.isArray(route.validationSnippets) && route.validationSnippets.length > 0) {
    const joined = route.validationSnippets.join(' ').toLowerCase();
    if (joined.includes('required') || joined.includes('schema') || joined.includes('joi') || joined.includes('zod')) {
      reasons.push('Route validation snippets found — boosting confidence');
      if (typeof body === 'object' && !Array.isArray(body)) score = Math.min(1, score + 0.12);
    }
  }

  // If config.sampleData exists and overlaps with generated body keys, boost
  if (config && config.sampleData) {
    const sampleKeys = Object.keys(config.sampleData || {}).length;
    if (sampleKeys > 0) {
      const overlap = Object.keys(body).filter(k => k in (config.sampleData as any));
      if (overlap.length > 0) {
        reasons.push('Body fields overlap with config sample data — boosting confidence');
        score = Math.min(1, score + 0.1);
      }
    }
  }

  // If route was discovered and method/path match, boost confidence
  if (route) {
    reasons.push('Route matched discovered route — boosting confidence');
    score = Math.min(1, score + 0.15);
  }

  // If body is an object for JSON POST/PUT/PATCH, add a small boost (do not penalize multiple fields)
  if (['POST','PUT','PATCH'].includes(methodUpper) && typeof body === 'object' && !Array.isArray(body)) {
    reasons.push('Body is an object for data-bearing method — small confidence boost');
    score = Math.min(1, score + 0.08);
  }

  // Final clamping
  score = Math.max(0, Math.min(1, score));

  if (score >= 0.8) {
    reasons.push('High overall confidence');
  } else if (score >= 0.5) {
    reasons.push('Medium overall confidence');
  } else {
    reasons.push('Low overall confidence');
  }

  return { confidence: score, reasons };
}

// Made with Bob
