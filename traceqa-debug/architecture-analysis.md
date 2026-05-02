# TraceQA Architecture Analysis: Route Mapping & Domain Logic

**Date:** 2026-05-02  
**Analyst:** Bob  
**Purpose:** Identify hardcoded domain logic and architectural issues

---

## Executive Summary

TraceQA demonstrates **excellent generic architecture** with minimal hardcoded domain logic. The system uses **semantic pattern matching** rather than hardcoded route mappings.

**Key Findings:**
- ✅ **No hardcoded route mappings** - Uses discovered routes with semantic matching
- ✅ **Generic resource/action detection** - Pattern-based inference
- ⚠️ **Some hardcoded patterns** in body generation (email, password, phone, etc.)
- ✅ **IBM integration is clean** - No route mapping in AI layer
- ✅ **Config ready for extension** - Can support route mapping config

**Architectural Health: 7/10**

---

## 1. Route Matching Architecture

### File: `src/validation/route-matcher.ts` (Lines 1-607)

**Current Approach:** Generic semantic matching with NO hardcoded routes

#### Action Patterns (Lines 68-76)
```typescript
const ACTION_PATTERNS = {
  create: /\b(create|register|add|submit|post|sign\s*up|new)\b/i,
  read: /\b(get|retrieve|fetch|view|list|read|show|display|check)\b/i,
  update: /\b(update|edit|modify|change|patch|put)\b/i,
  delete: /\b(delete|remove|destroy)\b/i,
  list: /\b(list|all|index|collection)\b/i,
  health: /\b(health|status|ping|alive|ready|liveness|readiness)\b/i,
  auth: /\b(login|authenticate|sign\s*in|auth|token|session)\b/i,
};
```

**Analysis:**
- ✅ Generic patterns, not domain-specific
- ⚠️ **ISSUE:** Hardcoded in code, should be configurable
- ✅ Covers standard REST operations

#### Resource Patterns (Lines 81-97)
```typescript
const RESOURCE_PATTERNS = [
  /\b(user|account|profile|member)s?\b/i,
  /\b(order|purchase|transaction)s?\b/i,
  /\b(product|item|article)s?\b/i,
  /\b(invoice|bill|receipt)s?\b/i,
  // ... 11 more patterns
];
```

**Analysis:**
- ✅ Generic REST resources
- ⚠️ **ISSUE:** Hardcoded, should be in config
- ✅ Covers common domains

#### Route Matching Function (Lines 233-332)

**Algorithm:**
1. Extract keywords from task + acceptance criterion
2. Detect resource and action using patterns
3. Score each discovered route:
   - Method match: 40 points
   - Path match: 40 points
   - Keyword similarity: 20 points
   - OpenAPI description: 10 bonus points
4. Return best match with confidence

**Strengths:**
- ✅ No hardcoded routes like `/api/register`
- ✅ Uses actual discovered routes
- ✅ Confidence-based scoring
- ✅ OpenAPI integration

**Weaknesses:**
- ⚠️ No user override mechanism
- ⚠️ Patterns not configurable

---

## 2. HTTP Test Generation

### File: `src/generators/http-test-generator.ts` (Lines 1-878)

**Architecture:** IBM-first with deterministic fallback

#### Key Flow:
1. Match route using `matchRouteToTask()` (semantic)
2. Try IBM generation with matched route
3. Validate and normalize IBM output
4. Fall back to deterministic if IBM fails
5. Generate request bodies
6. Determine test status

#### IBM Prompt (Lines 365-409)
```typescript
const routeInfo = matchedRoute
  ? `Matched Route: ${matchedRoute.method} ${matchedRoute.path}`
  : 'No specific route matched - infer from task description';
```

**Analysis:**
- ✅ IBM receives matched route, not hardcoded
- ✅ Prompt includes discovered routes
- ✅ No domain-specific suggestions
- ✅ Clean separation of concerns

#### Test Status Determination (Lines 652-730)

**Factors:**
- Task execution mode
- Route match confidence (high/medium/low)
- Body generation confidence
- Empty bodies on POST/PUT/PATCH
- Invalid URLs

**Status Categories:**
- `ready` - High confidence, can execute
- `uncertain` - Low confidence, needs review
- `manual` - Requires human execution

**Analysis:**
- ✅ Generic, not domain-specific
- ✅ Conservative approach
- ✅ Confidence-based decisions

---

## 3. QA Task Plan Generation

### File: `src/generators/qa-task-plan-generator.ts` (Lines 1-657)

**Architecture:** IBM-first with deterministic fallback

#### IBM Prompt (Lines 91-186)
```typescript
Discovered Routes:
${routesSummary}

Acceptance Criteria:
${acceptanceCriteria.map(...)}

Task: Create a QA task plan by mapping each criterion to tasks.
```

**Analysis:**
- ✅ IBM receives discovered routes
- ✅ No hardcoded route mappings
- ✅ Classification based on route availability

#### Fallback Generation (Lines 311-417)

**Logic:**
```typescript
// Check if criterion mentions API/endpoint
if (/\b(api|endpoint|request|response)\b/i.test(combinedText)) {
  if (discoveredRoutes.length > 0) {
    type = 'api';
    executionMode = 'automated';
  } else {
    type = 'uncertain';
  }
}
```

**Analysis:**
- ✅ Generic keyword detection
- ✅ Depends on discovered routes
- ✅ Conservative classification

---

## 4. Request Body Generation

### File: `src/validation/body-generator.ts` (Lines 1-862)

**⚠️ PRIMARY LOCATION OF HARDCODED DOMAIN LOGIC**

#### Generation Priority:
1. OpenAPI schema (high confidence)
2. IBM suggested body
3. Config sample data
4. **Inferred fields** ← HARDCODED
5. Generic fallback

### ISSUE 1: Hardcoded Field Inference (Lines 588-672)

```typescript
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}
if (text.includes('username')) {
  fields.username = `traceqa_${testId}`;
}
if (text.includes('phone')) {
  fields.phone = '+1-555-0100';
}
if (text.includes('address')) {
  fields.address = '123 TraceQA Street';
}
if (text.includes('city')) {
  fields.city = 'TestCity';
}
// ... 15+ more hardcoded patterns
```

**Severity:** HIGH  
**Impact:** Cannot customize field generation for different domains

### ISSUE 2: Hardcoded Scenario Modifications (Lines 677-744)

```typescript
switch (scenario) {
  case 'invalid_email':
    if (body.email) {
      body.email = 'invalid-email';  // Hardcoded
    }
    break;
  case 'weak_password':
    if (body.password) {
      body.password = 'weak';  // Hardcoded
    }
    break;
  // ... more hardcoded scenarios
}
```

**Severity:** MEDIUM  
**Impact:** Cannot customize invalid values per domain

### ISSUE 3: Hardcoded Field Value Generation (Lines 350-540)

```typescript
if (fieldLower.includes('phone')) {
  return '+1-555-0100';  // US format only
}
if (fieldLower.includes('city')) {
  return 'TestCity';  // Generic only
}
if (fieldLower.includes('country')) {
  return 'US';  // US-centric
}
```

**Severity:** MEDIUM  
**Impact:** Not locale-aware, US-centric values

---

## 5. Test Execution & Status

### File: `src/testing/test-coordinator.ts` (Lines 214-531)

**Architecture:** Phase-based execution

**Phases:**
1. Parse acceptance criteria
2. Discover routes
3. Get AI suggestions (optional)
4. Generate QA task plan
5. Generate HTTP tests
6. Execute ready tests
7. Record uncertain/manual tests
8. Generate reports

**Analysis:**
- ✅ Generic execution flow
- ✅ No domain-specific logic
- ✅ Status tracking is generic

---

## 6. Report Generation

### File: `src/reporting/report-generator.ts` (Lines 1-778)

**Architecture:** Comprehensive reporting with trace matrix

**Test Classifications:**
- `passed` - Test passed
- `application_failure` - Real bug
- `traceqa_generation_issue` - Test problem
- `uncertain` - Cannot determine
- `manual` - Manual test

**Trace Matrix:** AC → Task → Test → Result

**Analysis:**
- ✅ Classification is result-based
- ✅ No domain-specific logic
- ✅ Generic merge readiness assessment

---

## 7. Configuration Structure

### File: `src/config/config-loader.ts` (Lines 1-161)

**Current Config:**
```typescript
interface TraceQAProjectConfig {
  baseUrl?: string;
  healthUrl?: string;
  openapi?: string;
  language?: string;
  projectType?: string;
  testType?: 'ui' | 'api' | 'both' | 'integration';
  outputDir?: string;
  timeout?: number;
  retries?: number;
  ibmWatsonxApiKey?: string;
  // ... more fields
}
```

**Analysis:**
- ✅ Extensible structure
- ⚠️ **MISSING:** Route mapping config
- ⚠️ **MISSING:** Custom resource patterns
- ⚠️ **MISSING:** Field inference rules
- ⚠️ **MISSING:** Custom sample data structure

---

## 8. Identified Issues Summary

### HIGH PRIORITY

#### Issue 1: No Route Mapping Configuration
**Files:** All generators  
**Impact:** Users cannot override route matching

**Needed:**
```typescript
interface RouteMapping {
  acceptanceCriterionId: string;
  route: { method: string; path: string; };
  confidence: 'high' | 'medium' | 'low';
}

interface TraceQAConfig {
  routeMappings?: RouteMapping[];
}
```

#### Issue 2: Hardcoded Field Inference
**File:** `src/validation/body-generator.ts:588-672`  
**Impact:** Cannot customize field generation

**Needed:**
```typescript
interface FieldInferenceRule {
  fieldPattern: string;  // regex
  generator: 'email' | 'password' | 'phone' | 'custom';
  template?: string;
  scenarios?: { [scenario: string]: any; };
}

interface TraceQAConfig {
  fieldInferenceRules?: FieldInferenceRule[];
}
```

### MEDIUM PRIORITY

#### Issue 3: Hardcoded Resource Patterns
**File:** `src/validation/route-matcher.ts:81-97`  
**Impact:** Cannot detect domain-specific resources

**Needed:**
```typescript
interface TraceQAConfig {
  customResourcePatterns?: {
    name: string;
    pattern: string;
  }[];
}
```

#### Issue 4: Hardcoded Action Patterns
**File:** `src/validation/route-matcher.ts:68-76`  
**Impact:** Cannot support domain-specific verbs

**Needed:**
```typescript
interface TraceQAConfig {
  customActionPatterns?: {
    action: string;
    pattern: string;
    httpMethods: string[];
  }[];
}
```

#### Issue 5: Limited Sample Data Structure
**File:** `src/types/index.ts:302-307`  
**Impact:** Cannot provide scenario-based sample data

**Current:**
```typescript
interface SampleData {
  validUser?: Record<string, any>;
  invalidEmail?: string;
  weakPassword?: string;
}
```

**Needed:**
```typescript
interface SampleData {
  [scenario: string]: {
    [fieldName: string]: any;
  };
}
```

---

## 9. Code Examples: Before & After

### Example 1: Route Mapping Override

**BEFORE (No override):**
```typescript
const routeMatch = matchRouteToTask(
  task,
  acceptanceCriterion,
  discoveredRoutes
);
```

**AFTER (With config override):**
```typescript
function getRouteForTask(
  task: QATask,
  acceptanceCriterion: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig
): RouteMatchResult {
  // Check explicit mapping first
  const mapping = config.routeMappings?.find(
    m => m.acceptanceCriterionId === acceptanceCriterion.id
  );
  
  if (mapping) {
    const route = discoveredRoutes.find(
      r => r.method === mapping.route.method &&
           r.path === mapping.route.path
    );
    if (route) {
      return {
        matched: true,
        confidence: mapping.confidence || 'high',
        route,
        method: route.method,
        reasoning: 'Explicit config mapping'
      };
    }
  }
  
  // Fall back to semantic matching
  return matchRouteToTask(task, acceptanceCriterion, discoveredRoutes);
}
```

### Example 2: Configurable Field Inference

**BEFORE (Hardcoded):**
```typescript
if (text.includes('email')) {
  fields.email = `traceqa-${testId}-${timestamp}@example.com`;
}
if (text.includes('password')) {
  fields.password = 'StrongPassword123!';
}
```

**AFTER (Configurable):**
```typescript
function inferFieldsFromContext(
  task: QATask,
  config: TraceQAConfig,
  testId: string,
  timestamp: string
): Record<string, any> {
  const fields: Record<string, any> = {};
  const text = getContextText(task);
  
  // Apply custom rules from config
  if (config.fieldInferenceRules) {
    for (const rule of config.fieldInferenceRules) {
      const pattern = new RegExp(rule.fieldPattern, 'i');
      if (pattern.test(text)) {
        fields[rule.fieldName] = generateFieldValue(
          rule,
          testId,
          timestamp
        );
      }
    }
  }
  
  // Apply defaults for missing fields
  applyDefaultInference(fields, text, testId, timestamp);
  
  return fields;
}
```

---

## 10. Refactoring Roadmap

### Phase 1: Configuration Support (Subtask 1.1)
- Add `routeMappings` to config
- Add `customResourcePatterns` to config
- Add `customActionPatterns` to config
- Add `fieldInferenceRules` to config
- Update config loader and validator

### Phase 2: Route Matching Enhancement (Subtask 1.2)
- Implement config-based route override
- Support custom resource patterns
- Support custom action patterns
- Maintain backward compatibility

### Phase 3: Body Generation Refactor (Subtask 1.3)
- Extract field inference to configurable system
- Support custom field generators
- Add scenario-based sample data
- Maintain fallback logic

### Phase 4: Documentation & Testing (Subtask 1.4)
- Document new config options
- Add examples for common domains
- Create migration guide
- Add integration tests

---

## 11. Conclusion

### Strengths
1. ✅ **No hardcoded route mappings** - Uses discovered routes
2. ✅ **Generic semantic matching** - Pattern-based inference
3. ✅ **Clean IBM integration** - No domain logic in AI layer
4. ✅ **Confidence-based decisions** - Conservative approach
5. ✅ **Good separation of concerns** - Modular architecture

### Weaknesses
1. ⚠️ **Hardcoded field inference** - 20+ patterns in code
2. ⚠️ **Hardcoded resource patterns** - 15 patterns in code
3. ⚠️ **No route mapping override** - Cannot force specific routes
4. ⚠️ **Limited configuration** - Missing key config options
5. ⚠️ **US-centric values** - Phone, address formats

### Recommendations

**Immediate (High Priority):**
1. Add route mapping configuration support
2. Make field inference configurable
3. Support custom resource/action patterns

**Short-term (Medium Priority):**
4. Enhance sample data structure
5. Add locale-aware value generators
6. Improve config validation

**Long-term (Low Priority):**
7. Add field type registry system
8. Support custom validation rules
9. Add internationalization support

### Final Assessment

**Architecture Quality: 7/10**

The architecture is fundamentally sound with excellent generic design. The main issues are in body generation where field inference is hardcoded. These can be addressed through configuration without major architectural changes.

**Refactoring Complexity: Medium**

Most changes involve adding configuration support and extracting hardcoded patterns. The core algorithms remain unchanged.

---

**End of Analysis**