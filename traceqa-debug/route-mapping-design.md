# TraceQA Route Mapping Priority System - Design Document

**Version:** 1.0  
**Date:** 2026-05-02  
**Author:** Bob  
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Route Mapping Priority System](#route-mapping-priority-system)
4. [IBM Integration Enhancement](#ibm-integration-enhancement)
5. [Configuration Schema Extensions](#configuration-schema-extensions)
6. [Validation Architecture](#validation-architecture)
7. [Test Status Classification](#test-status-classification)
8. [Report Classification System](#report-classification-system)
9. [Trace Matrix Mapping](#trace-matrix-mapping)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Interface Definitions](#interface-definitions)
12. [Decision Trees](#decision-trees)
13. [Error Handling Strategy](#error-handling-strategy)
14. [Backward Compatibility](#backward-compatibility)
15. [Migration Path](#migration-path)
16. [Implementation Phases](#implementation-phases)

---

## 1. Executive Summary

This design document specifies a comprehensive route-mapping priority system for TraceQA that addresses the key architectural improvements identified in the analysis:

**Key Improvements:**
- 6-level route mapping priority hierarchy (OpenAPI → Config → IBM → Validation → Fallback → Manual)
- IBM produces route mapping objects BEFORE test generation
- Extensible configuration schema for route mappings and field inference
- Clear separation between route discovery and validation
- Precise test status classification (ready/uncertain/failed)
- Accurate report metrics that don't conflate uncertain with failed tests
- Exact trace matrix mapping by acceptanceCriterionId

**Design Principles:**
- Backward compatible with existing implementations
- Optional enhancements (all new features are opt-in)
- Conservative approach (mark as uncertain when confidence is low)
- Clear separation of concerns
- Fail-safe defaults

---

## 2. Current Architecture Analysis

### 2.1 Current Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT TRACEQA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. Parse Acceptance Criteria
   ↓
2. Discover Routes (route-discovery.ts)
   ↓
3. Generate QA Task Plan (qa-task-plan-generator.ts)
   │  ├─ IBM suggests task types
   │  └─ Fallback: deterministic classification
   ↓
4. Generate HTTP Tests (http-test-generator.ts)
   │  ├─ Match routes using semantic matching (route-matcher.ts)
   │  ├─ IBM suggests test structure
   │  ├─ Generate bodies (body-generator.ts)
   │  └─ Determine test status (ready/uncertain/manual)
   ↓
5. Execute Tests (http-test-executor.ts)
   ↓
6. Generate Reports (report-generator.ts)
```

### 2.2 Current Issues

**Issue 1: No Explicit Route Mapping Override**
- Users cannot force specific AC → Route mappings
- Semantic matching may choose wrong route
- No way to override IBM's route selection

**Issue 2: IBM Doesn't Produce Route Mapping Object**
- IBM suggests routes within test generation
- No separate route mapping phase
- Cannot validate route selection before test generation

**Issue 3: Limited Configuration**
- No `routeMappings` in config
- No `fieldInferenceRules` customization
- Hardcoded patterns in body-generator.ts

**Issue 4: Unclear Test Status**
- "uncertain" tests mixed with "failed" tests in reports
- No clear distinction between "not executed" and "executed but failed"

**Issue 5: Trace Matrix Over-mapping**
- Tests may be attached to multiple ACs incorrectly
- No strict acceptanceCriterionId matching

---

## 3. Route Mapping Priority System

### 3.1 Six-Level Hierarchy

The route mapping system follows a strict priority order, with each level taking precedence over lower levels:

```
┌─────────────────────────────────────────────────────────────────┐
│              ROUTE MAPPING PRIORITY HIERARCHY                   │
└─────────────────────────────────────────────────────────────────┘

LEVEL 1: OpenAPI operationId/summary/schemas
         ├─ Source: OpenAPI specification
         ├─ Confidence: HIGH
         ├─ When: OpenAPI spec available with operationId
         └─ Example: operationId: "registerUser" → POST /api/users/register

LEVEL 2: Explicit Config Route Mappings
         ├─ Source: traceqa.config.json routeMappings
         ├─ Confidence: HIGH (user-defined)
         ├─ When: User explicitly maps AC → Route
         └─ Example: AC-1 → POST /api/auth/signup

LEVEL 3: IBM Route Mapping (from discovered routes)
         ├─ Source: IBM watsonx route mapping object
         ├─ Confidence: HIGH/MEDIUM/LOW (IBM-provided)
         ├─ When: IBM successfully maps AC to discovered route
         └─ Example: IBM selects POST /api/users from discovered routes

LEVEL 4: Structural Validation
         ├─ Source: Validation against discovered routes
         ├─ Confidence: MEDIUM
         ├─ When: IBM/fallback route exists in discovered routes
         └─ Example: Verify POST /api/users exists in discovered routes

LEVEL 5: Conservative Deterministic Fallback
         ├─ Source: Semantic pattern matching
         ├─ Confidence: LOW
         ├─ When: AC explicitly mentions method/path
         └─ Example: AC says "POST to /register" → POST /register

LEVEL 6: Mark as Uncertain/Manual
         ├─ Source: No safe mapping found
         ├─ Confidence: NONE
         ├─ When: No route can be safely mapped
         └─ Example: AC is vague, no routes discovered
```

### 3.2 Route Mapping Algorithm

```typescript
function mapRouteForAcceptanceCriterion(
  ac: AcceptanceCriterion,
  discoveredRoutes: DiscoveredRoute[],
  config: TraceQAConfig,
  openApiSpec?: OpenAPISpec,
  ibmRouteMapping?: IBMRouteMapping
): RouteMappingResult {
  
  // LEVEL 1: Check OpenAPI operationId/summary
  if (openApiSpec) {
    const openApiRoute = findRouteByOperationId(ac, openApiSpec);
    if (openApiRoute && routeExistsInDiscovered(openApiRoute, discoveredRoutes)) {
      return {
        route: openApiRoute,
        confidence: 'high',
        source: 'openapi',
        reasoning: `Mapped via OpenAPI operationId: ${openApiRoute.operationId}`
      };
    }
  }
  
  // LEVEL 2: Check explicit config mapping
  const configMapping = config.routeMappings?.find(
    m => m.acceptanceCriterionId === ac.id
  );
  if (configMapping) {
    const route = findRouteInDiscovered(configMapping.route, discoveredRoutes);
    if (route) {
      return {
        route,
        confidence: configMapping.confidence || 'high',
        source: 'config',
        reasoning: 'Explicit user-defined mapping in traceqa.config.json'
      };
    } else {
      return {
        route: null,
        confidence: 'none',
        source: 'config_error',
        reasoning: `Config mapping specifies ${configMapping.route.method} ${configMapping.route.path} but route not found in discovered routes`
      };
    }
  }
  
  // LEVEL 3: Use IBM route mapping (if available)
  if (ibmRouteMapping && ibmRouteMapping.selectedRoute) {
    const route = findRouteInDiscovered(ibmRouteMapping.selectedRoute, discoveredRoutes);
    if (route) {
      return {
        route,
        confidence: ibmRouteMapping.confidence,
        source: 'ibm',
        reasoning: ibmRouteMapping.reasoning,
        requiresSetup: ibmRouteMapping.requiresSetup,
        setupRoute: ibmRouteMapping.setupRoute
      };
    }
  }
  
  // LEVEL 4: Structural validation (implicit - all routes must pass)
  
  // LEVEL 5: Conservative deterministic fallback
  if (acExplicitlyMentionsRoute(ac)) {
    const fallbackRoute = semanticRouteMatch(ac, discoveredRoutes);
    if (fallbackRoute && fallbackRoute.confidence !== 'low') {
      return {
        route: fallbackRoute.route,
        confidence: 'low',
        source: 'semantic_fallback',
        reasoning: 'Fallback semantic matching based on AC keywords'
      };
    }
  }
  
  // LEVEL 6: Mark as uncertain
  return {
    route: null,
    confidence: 'none',
    source: 'uncertain',
    reasoning: 'No safe route mapping found. Manual review required.'
  };
}
```

---

## 4. IBM Integration Enhancement

### 4.1 New IBM Workflow

IBM now produces a **route mapping object** BEFORE test generation:

```
┌─────────────────────────────────────────────────────────────────┐
│                  NEW IBM INTEGRATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. Parse Acceptance Criteria
   ↓
2. Discover Routes
   ↓
3. IBM Route Mapping Phase (NEW)
   │  ├─ Input: AC + Discovered Routes
   │  ├─ Output: Route Mapping Object per AC
   │  └─ IBM chooses ONLY from discovered routes
   ↓
4. Validate Route Mappings
   │  └─ Structural validation against discovered routes
   ↓
5. Generate QA Task Plan
   │  └─ Uses validated route mappings
   ↓
6. Generate HTTP Tests
   │  └─ Uses validated route mappings
   ↓
7. Execute Tests
   ↓
8. Generate Reports
```

### 4.2 IBM Route Mapping Object

```typescript
interface IBMRouteMapping {
  /** Acceptance criterion ID this mapping is for */
  acceptanceCriterionId: string;
  
  /** Selected route from discovered routes (null if no fit) */
  selectedRoute: {
    method: string;
    path: string;
  } | null;
  
  /** Confidence in this mapping */
  confidence: 'high' | 'medium' | 'low';
  
  /** Reasoning for route selection */
  reasoning: string;
  
  /** Whether this test requires setup (e.g., login first) */
  requiresSetup: boolean;
  
  /** Setup route if required (e.g., POST /api/auth/login) */
  setupRoute?: {
    method: string;
    path: string;
  };
  
  /** Alternative routes considered */
  alternatives?: Array<{
    method: string;
    path: string;
    reason: string;
  }>;
}

interface IBMRouteMappingResponse {
  /** Route mappings for each AC */
  mappings: IBMRouteMapping[];
  
  /** Overall confidence in mappings */
  overallConfidence: 'high' | 'medium' | 'low';
  
  /** Warnings or concerns */
  warnings: string[];
}
```

---

## 5. Configuration Schema Extensions

### 5.1 Extended TraceQAProjectConfig

```typescript
interface TraceQAProjectConfig {
  // ... existing fields ...
  
  /**
   * Explicit route mappings for acceptance criteria
   * Takes precedence over IBM and semantic matching
   */
  routeMappings?: RouteMapping[];
  
  /**
   * Sample data for test scenarios
   * Organized by scenario type
   */
  sampleData?: SampleDataConfig;
  
  /**
   * Custom field inference rules for body generation
   * Allows domain-specific field generation
   */
  fieldInferenceRules?: FieldInferenceRule[];
  
  /**
   * Custom resource patterns for route matching
   * Extends default resource detection
   */
  customResourcePatterns?: ResourcePattern[];
  
  /**
   * Custom action patterns for route matching
   * Extends default action detection
   */
  customActionPatterns?: ActionPattern[];
}
```

### 5.2 Route Mapping Configuration

```typescript
interface RouteMapping {
  /** Acceptance criterion ID to map */
  acceptanceCriterionId: string;
  
  /** Target route */
  route: {
    method: string;
    path: string;
  };
  
  /** Confidence level (optional, defaults to 'high') */
  confidence?: 'high' | 'medium' | 'low';
  
  /** Optional reasoning for documentation */
  reasoning?: string;
  
  /** Whether this route requires setup */
  requiresSetup?: boolean;
  
  /** Setup route if required */
  setupRoute?: {
    method: string;
    path: string;
  };
}
```

### 5.3 Example Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "openapi": "./openapi.yaml",
  
  "routeMappings": [
    {
      "acceptanceCriterionId": "AC-1",
      "route": {
        "method": "POST",
        "path": "/api/auth/signup"
      },
      "confidence": "high",
      "reasoning": "User explicitly wants signup endpoint tested"
    },
    {
      "acceptanceCriterionId": "AC-5",
      "route": {
        "method": "GET",
        "path": "/api/users/profile"
      },
      "requiresSetup": true,
      "setupRoute": {
        "method": "POST",
        "path": "/api/auth/login"
      }
    }
  ],
  
  "sampleData": {
    "scenarios": {
      "valid_user": {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "firstName": "Test",
        "lastName": "User"
      },
      "invalid_email": {
        "email": "invalid-email",
        "password": "SecurePass123!"
      }
    }
  },
  
  "fieldInferenceRules": [
    {
      "fieldPattern": "email",
      "generator": "email",
      "template": "traceqa-{testId}@example.com",
      "scenarios": {
        "invalid_email": "not-an-email"
      }
    }
  ]
}
```

---

## 6. Validation Architecture

### 6.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDATION ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│ Route Discovery     │  Discovers routes from application
│ (route-discovery)   │  - Scans code/OpenAPI
└──────────┬──────────┘  - Returns DiscoveredRoute[]
           │
           ▼
┌─────────────────────┐
│ Route Mapping       │  Maps AC to routes using priority system
│ (route-mapper)      │  - Level 1-6 hierarchy
└──────────┬──────────┘  - Returns RouteMappingResult
           │
           ▼
┌─────────────────────┐
│ Structural          │  Validates route exists in discovered routes
│ Validation          │  - Method/path validation
└──────────┬──────────┘  - Returns structural errors
           │
           ▼
┌─────────────────────┐
│ Content Validation  │  Validates test content
│ (test-validator)    │  - URL format
└──────────┬──────────┘  - Body structure
           │             - Status codes
           ▼
┌─────────────────────┐
│ Confidence Scoring  │  Assigns confidence based on validation
│ (confidence-scorer) │  - High: All validations pass
└──────────┬──────────┘  - Medium: Some warnings
           │             - Low: Significant issues
           ▼
┌─────────────────────┐
│ Test Status         │  Determines if test is ready/uncertain
│ Classification      │  - ready: High/medium confidence
└─────────────────────┘  - uncertain: Low/no confidence
```

---

## 7. Test Status Classification

### 7.1 Status Definitions

```typescript
enum TestStatus {
  /** Test is ready to execute (high/medium confidence) */
  READY = 'ready',
  
  /** Test cannot be safely generated (low/no confidence) */
  UNCERTAIN = 'uncertain',
  
  /** Test requires manual execution */
  MANUAL = 'manual',
  
  /** Test was executed and passed */
  PASSED = 'passed',
  
  /** Test was executed and failed (application issue) */
  FAILED = 'failed',
  
  /** Test was skipped (dependency failed, etc.) */
  SKIPPED = 'skipped'
}
```

### 7.2 Status Classification Logic

```typescript
function determineTestStatus(
  routeMapping: RouteMappingResult,
  structuralValidation: StructuralValidationResult,
  contentValidation: ContentValidationResult,
  bodyGeneration: BodyGenerationResult,
  task: QATask
): {
  status: TestStatus;
  uncertainReason?: string;
} {
  
  // If task is marked as manual, status is manual
  if (task.executionMode === 'manual') {
    return {
      status: TestStatus.MANUAL,
      uncertainReason: task.uncertainReason
    };
  }
  
  // If no route mapping, status is uncertain
  if (!routeMapping.route) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: routeMapping.reasoning || 'No route mapping found'
    };
  }
  
  // If structural validation fails, status is uncertain
  if (!structuralValidation.valid) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Route validation failed: ${structuralValidation.errors.join(', ')}`
    };
  }
  
  // If content validation fails, status is uncertain
  if (!contentValidation.valid) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Content validation failed: ${contentValidation.errors.join(', ')}`
    };
  }
  
  // If body generation failed for POST/PUT/PATCH, status is uncertain
  const methodNeedsBody = ['POST', 'PUT', 'PATCH'].includes(routeMapping.route.method);
  if (methodNeedsBody && !bodyGeneration.body) {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: 'Cannot generate request body for this endpoint'
    };
  }
  
  // If confidence is low, status is uncertain
  const confidence = calculateConfidence(routeMapping, structuralValidation, contentValidation);
  if (confidence === 'low' || confidence === 'none') {
    return {
      status: TestStatus.UNCERTAIN,
      uncertainReason: `Low confidence in test generation (${confidence})`
    };
  }
  
  // Otherwise, test is ready
  return {
    status: TestStatus.READY
  };
}
```

---

## 8. Report Classification System

### 8.1 Report Categories

```typescript
interface ReportCategories {
  /** Total tests generated */
  generated: number;
  
  /** Tests ready for execution */
  ready: number;
  
  /** Tests actually executed */
  executed: number;
  
  /** Tests that passed */
  passed: number;
  
  /** Tests that failed (application issue) */
  failed: number;
  
  /** Tests marked as uncertain (not executed) */
  uncertain: number;
  
  /** Tests requiring manual execution */
  manual: number;
  
  /** Tests skipped due to dependencies */
  skipped: number;
}
```

### 8.2 Classification Rules

**IMPORTANT:** Uncertain tests are NOT counted as failed tests. They represent tests that could not be safely generated, not tests that were executed and failed.

```
GENERATED: All tests created by TraceQA
READY: Tests with status = 'ready'
EXECUTED: Tests that were actually run
PASSED: Executed tests with passing result
FAILED: Executed tests with failing result (application issue)
UNCERTAIN: Tests that could not be safely generated (NOT executed)
MANUAL: Tests requiring human execution
SKIPPED: Tests not executed due to dependencies
```

---

## 9. Trace Matrix Mapping

### 9.1 Strict Mapping Rules

```
RULE 1: Map by exact acceptanceCriterionId ONLY
  ├─ Each test has acceptanceCriterionId field
  ├─ Match test.acceptanceCriterionId === ac.id
  └─ Do NOT attach tests to unrelated ACs

RULE 2: Support 1:N mapping
  ├─ One AC can have multiple tests
  ├─ Example: AC-1 → [Test-1, Test-2, Test-3]
  └─ All tests with same acceptanceCriterionId

RULE 3: Do NOT attach unrelated tests
  ├─ If test.acceptanceCriterionId !== ac.id, do NOT include
  ├─ Empty test list is valid (AC not covered)
  └─ Better to show gaps than false coverage
```

---

*[Document continues with remaining sections...]*

## 10. Data Flow Diagrams

### 10.1 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           COMPLETE TRACEQA ROUTE MAPPING FLOW                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ 1. Parse AC          │
│ acceptance.md        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Discover Routes   │
│ - Scan code          │
│ - Parse OpenAPI      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Route Mapping     │
│ Priority System      │
│ (Levels 1-6)         │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────┐
│OpenAPI │   │ Config │
│Level 1 │   │Level 2 │
└────┬───┘   └────┬───┘
     │            │
     └─────┬──────┘
           │
           ▼
┌──────────────────────┐
│ 4. IBM Route Mapping │
│ (Level 3)            │
│ - AC + Routes → IBM  │
│ - IBM returns        │
│   mapping object     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. Structural        │
│ Validation (Level 4) │
│ - Route exists?      │
│ - Method valid?      │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │ Valid?      │
    └──────┬──────┘
           │
    ┌──────┴──────┐
    │ NO          │ YES
    ▼             ▼
┌────────┐   ┌────────┐
│Fallback│   │Continue│
│Level 5 │   │        │
└────┬───┘   └────┬───┘
     │            │
     └─────┬──────┘
           │
           ▼
┌──────────────────────┐
│ 6. Generate QA Tasks │
│ - Use route mappings │
│ - Classify tasks     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 7. Generate Tests    │
│ - Use route mappings │
│ - Generate bodies    │
│ - Determine status   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 8. Execute Tests     │
│ - Only 'ready' tests │
│ - Skip 'uncertain'   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 9. Generate Report   │
│ - Classify results   │
│ - Build trace matrix │
│ - Calculate metrics  │
└──────────────────────┘
```

### 10.2 Route Mapping Decision Flow

```
                    ┌─────────────────────┐
                    │  Acceptance         │
                    │  Criterion (AC)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ OpenAPI spec        │
                    │ available?          │
                    └──────┬──────────────┘
                           │
                ┌──────────┴──────────┐
                │ YES                 │ NO
                ▼                     ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │ Find operationId    │   │ Check config        │
    │ matching AC         │   │ routeMappings       │
    └──────┬──────────────┘   └──────┬──────────────┘
           │                          │
    ┌──────┴──────┐          ┌────────┴────────┐
    │ Found?      │          │ Mapping exists? │
    └──────┬──────┘          └────────┬────────┘
           │                          │
    ┌──────┴──────┐          ┌────────┴────────┐
    │ YES         │ NO       │ YES             │ NO
    ▼             ▼          ▼                 ▼
┌────────┐   ┌────────┐  ┌────────┐      ┌────────┐
│ Level 1│   │ Level 2│  │ Level 2│      │ Level 3│
│ OpenAPI│   │ Config │  │ Config │      │  IBM   │
└────┬───┘   └────┬───┘  └────┬───┘      └────┬───┘
     │            │           │                │
     │            │           │         ┌──────┴──────┐
     │            │           │         │ IBM mapping │
     │            │           │         │ available?  │
     │            │           │         └──────┬──────┘
     │            │           │                │
     │            │           │         ┌──────┴──────┐
     │            │           │         │ YES         │ NO
     │            │           │         ▼             ▼
     │            │           │    ┌────────┐    ┌────────┐
     │            │           │    │ Level 3│    │ Level 5│
     │            │           │    │  IBM   │    │Fallback│
     │            │           │    └────┬───┘    └────┬───┘
     │            │           │         │             │
     └────────────┴───────────┴─────────┴─────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Level 4: Structural │
                   │ Validation          │
                   └──────────┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │ Route exists in     │
                   │ discovered routes?  │
                   └──────────┬──────────┘
                              │
                   ┌──────────┴──────────┐
                   │ YES                 │ NO
                   ▼                     ▼
            ┌─────────────┐      ┌─────────────┐
            │ MAPPED      │      │ Level 6:    │
            │ (ready)     │      │ UNCERTAIN   │
            └─────────────┘      └─────────────┘
```

---

## 11. Interface Definitions

### 11.1 Core Interfaces

```typescript
// Route Mapping Result
interface RouteMappingResult {
  route: DiscoveredRoute | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'openapi' | 'config' | 'ibm' | 'semantic_fallback' | 'uncertain' | 'config_error';
  reasoning: string;
  requiresSetup?: boolean;
  setupRoute?: {
    method: string;
    path: string;
  };
}

// Structural Validation Result
interface StructuralValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    routeExists: boolean;
    methodValid: boolean;
    pathValid: boolean;
    parametersValid: boolean;
  };
}

// Content Validation Result
interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    urlValid: boolean;
    bodyValid: boolean;
    statusesValid: boolean;
    headersValid: boolean;
  };
}

// Test Status Result
interface TestStatusResult {
  status: 'ready' | 'uncertain' | 'manual' | 'passed' | 'failed' | 'skipped';
  uncertainReason?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
}
```

### 11.2 Configuration Interfaces

```typescript
// Field Inference Rule
interface FieldInferenceRule {
  fieldPattern: string;
  generator: 'email' | 'password' | 'phone' | 'uuid' | 'timestamp' | 'custom';
  template?: string;
  scenarios?: {
    [scenarioName: string]: any;
  };
  priority?: number;
}

// Sample Data Config
interface SampleDataConfig {
  scenarios: {
    [scenarioName: string]: {
      [fieldName: string]: any;
    };
  };
  defaults?: {
    [fieldName: string]: any;
  };
}

// Resource Pattern
interface ResourcePattern {
  name: string;
  pattern: string;
  priority?: number;
}

// Action Pattern
interface ActionPattern {
  action: string;
  pattern: string;
  httpMethods: string[];
  priority?: number;
}
```

### 11.3 Report Interfaces

```typescript
// Report Summary
interface ReportSummary {
  timestamp: string;
  projectName: string;
  
  acceptanceCriteria: {
    total: number;
    covered: number;
    uncovered: number;
  };
  
  qaTasks: {
    total: number;
    automated: number;
    manual: number;
    uncertain: number;
  };
  
  generatedTests: {
    total: number;
    ready: number;
    uncertain: number;
    manual: number;
  };
  
  executionResults: {
    total: number;
    executed: number;
    passed: number;
    failed: number;
    uncertain: number;
    manual: number;
    skipped: number;
  };
  
  classifications: {
    passed: number;
    application_failure: number;
    traceqa_generation_issue: number;
    uncertain: number;
    manual: number;
  };
  
  mergeReadiness: 'ready' | 'not_ready' | 'uncertain';
  riskLevel: 'low' | 'medium' | 'high';
}

// Trace Matrix Entry
interface TraceMatrixEntry {
  acceptanceCriterionId: string;
  acceptanceCriterionText: string;
  acceptanceCriterionPriority: string;
  
  qaTasks: Array<{
    taskId: string;
    title: string;
    type: string;
    executionMode: string;
    reasoning: string;
  }>;
  
  generatedTests: Array<{
    testId: string;
    title: string;
    status: 'ready' | 'uncertain' | 'manual';
    uncertainReason?: string;
    routeMapping?: {
      method: string;
      path: string;
      source: string;
      confidence: string;
    };
  }>;
  
  executionResults: Array<{
    testId: string;
    status: 'passed' | 'failed' | 'skipped';
    classification: string;
    executor: string;
    duration: number;
    evidence?: string;
  }>;
  
  coverage: {
    tasksGenerated: number;
    testsGenerated: number;
    testsExecuted: number;
    testsPassed: number;
    testsFailed: number;
  };
}
```

---

## 12. Decision Trees

### 12.1 Test Status Decision Tree

```
                    ┌─────────────────────┐
                    │  Generated Test     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Task execution mode │
                    │ = 'manual'?         │
                    └──────┬──────────────┘
                           │
                    ┌──────┴──────┐
                    │ YES         │ NO
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │ MANUAL      │  │ Route mapped?│
            └─────────────┘  └──────┬───────┘
                                    │
                             ┌──────┴──────┐
                             │ YES         │ NO
                             ▼             ▼
                    ┌─────────────┐  ┌─────────────┐
                    │ Structural  │  │ UNCERTAIN   │
                    │ valid?      │  │ (no route)  │
                    └──────┬──────┘  └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ YES         │ NO
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │ Content     │  │ UNCERTAIN   │
            │ valid?      │  │ (invalid)   │
            └──────┬──────┘  └─────────────┘
                   │
            ┌──────┴──────┐
            │ YES         │ NO
            ▼             ▼
    ┌─────────────┐  ┌─────────────┐
    │ Body needed?│  │ UNCERTAIN   │
    └──────┬──────┘  │ (invalid)   │
           │         └─────────────┘
    ┌──────┴──────┐
    │ YES         │ NO
    ▼             ▼
┌────────┐   ┌────────┐
│ Body   │   │Confidence│
│ valid? │   │ check   │
└────┬───┘   └────┬───┘
     │            │
┌────┴────┐  ┌────┴────┐
│YES  │NO │  │high/med │low/none
▼     ▼   │  ▼         ▼
┌────┐┌───┐│┌────┐  ┌────────┐
│Conf││UNC│││READY│  │UNCERTAIN│
│chk ││ERT││└────┘  └────────┘
└─┬──┘└───┘│
  │        │
  ▼        │
┌────┐     │
│READY│    │
└────┘     │
```

### 12.2 Report Classification Decision Tree

```
                    ┌─────────────────────┐
                    │  Test Result        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Was test executed?  │
                    └──────┬──────────────┘
                           │
                    ┌──────┴──────┐
                    │ YES         │ NO
                    ▼             ▼
            ┌─────────────┐  ┌─────────────┐
            │ Status?     │  │ Status?     │
            └──────┬──────┘  └──────┬──────┘
                   │                │
        ┌──────────┼──────┐  ┌──────┴──────┐
        │          │      │  │             │
        ▼          ▼      ▼  ▼             ▼
    ┌──────┐  ┌──────┐ ┌──┐┌────────┐ ┌──────┐
    │PASSED│  │FAILED│ │SK││UNCERTAIN│ │MANUAL│
    └──────┘  └──────┘ │IP││         │ └──────┘
                       │PE││         │
                       │D │└────────┘
                       └──┘
                       
CLASSIFICATION:
- PASSED → classifications.passed++
- FAILED → classifications.application_failure++
- SKIPPED → executionResults.skipped++
- UNCERTAIN → classifications.uncertain++ (NOT failed!)
- MANUAL → classifications.manual++
```

---

## 13. Error Handling Strategy

### 13.1 Error Categories

```typescript
enum RouteMappi ngErrorCategory {
  /** OpenAPI spec parsing failed */
  OPENAPI_PARSE_ERROR = 'openapi_parse_error',
  
  /** Config route mapping references non-existent route */
  CONFIG_ROUTE_NOT_FOUND = 'config_route_not_found',
  
  /** IBM route mapping failed or returned invalid data */
  IBM_MAPPING_ERROR = 'ibm_mapping_error',
  
  /** IBM selected route not in discovered routes */
  IBM_ROUTE_NOT_FOUND = 'ibm_route_not_found',
  
  /** Structural validation failed */
  STRUCTURAL_VALIDATION_ERROR = 'structural_validation_error',
  
  /** Content validation failed */
  CONTENT_VALIDATION_ERROR = 'content_validation_error',
  
  /** No safe route mapping found */
  NO_SAFE_MAPPING = 'no_safe_mapping',
}
```

### 13.2 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ERROR HANDLING STRATEGY                            │
└─────────────────────────────────────────────────────────────────┘

1. OpenAPI Parse Error
   ├─ Log warning
   ├─ Continue without OpenAPI (Level 1 skipped)
   └─ Proceed to Level 2 (Config)

2. Config Route Not Found
   ├─ Log error with AC ID
   ├─ Mark test as UNCERTAIN
   ├─ Reason: "Config specifies route X but not found"
   └─ Do NOT proceed to IBM (user intent was explicit)

3. IBM Mapping Error
   ├─ Log warning
   ├─ Continue without IBM (Level 3 skipped)
   └─ Proceed to Level 5 (Fallback)

4. IBM Route Not Found
   ├─ Log warning
   ├─ Ignore IBM suggestion
   └─ Proceed to Level 5 (Fallback)

5. Structural Validation Error
   ├─ Log error with details
   ├─ Mark test as UNCERTAIN
   └─ Reason: "Route validation failed: [errors]"

6. Content Validation Error
   ├─ Log error with details
   ├─ Mark test as UNCERTAIN
   └─ Reason: "Content validation failed: [errors]"

7. No Safe Mapping
   ├─ Log info (not an error)
   ├─ Mark test as UNCERTAIN
   └─ Reason: "No safe route mapping found"
```

### 13.3 Graceful Degradation

```typescript
function handleRouteMappingError(
  error: RouteMappi ngErrorCategory,
  context: {
    ac: AcceptanceCriterion;
    level: number;
    details: string;
  }
): RouteMappingResult {
  
  logger.warn(
    `Route mapping error at Level ${context.level} for AC ${context.ac.id}: ${error}`,
    context.details
  );
  
  // Determine if we should try next level or mark as uncertain
  const shouldContinue = [
    RouteMappi ngErrorCategory.OPENAPI_PARSE_ERROR,
    RouteMappi ngErrorCategory.IBM_MAPPING_ERROR,
    RouteMappi ngErrorCategory.IBM_ROUTE_NOT_FOUND,
  ].includes(error);
  
  if (shouldContinue) {
    // Continue to next level
    return {
      route: null,
      confidence: 'none',
      source: 'uncertain',
      reasoning: `Level ${context.level} failed, trying next level`,
      continueToNextLevel: true
    };
  } else {
    // Mark as uncertain
    return {
      route: null,
      confidence: 'none',
      source: 'uncertain',
      reasoning: context.details,
      continueToNextLevel: false
    };
  }
}
```

---

## 14. Backward Compatibility

### 14.1 Compatibility Guarantees

```
┌─────────────────────────────────────────────────────────────────┐
│              BACKWARD COMPATIBILITY GUARANTEES                  │
└─────────────────────────────────────────────────────────────────┘

1. All new config fields are OPTIONAL
   ├─ routeMappings?: RouteMapping[]
   ├─ sampleData?: SampleDataConfig
   ├─ fieldInferenceRules?: FieldInferenceRule[]
   ├─ customResourcePatterns?: ResourcePattern[]
   └─ customActionPatterns?: ActionPattern[]

2. Existing behavior preserved when new fields absent
   ├─ No routeMappings → Skip Level 2
   ├─ No fieldInferenceRules → Use default inference
   └─ No custom patterns → Use default patterns

3. Existing test status values unchanged
   ├─ 'ready' → still means ready to execute
   ├─ 'uncertain' → still means cannot safely generate
   └─ 'manual' → still means requires human execution

4. Report structure extended, not changed
   ├─ Existing fields remain
   ├─ New fields added
   └─ Old reports still valid

5. API signatures extended with optional parameters
   ├─ New parameters added at end
   ├─ All new parameters optional
   └─ Existing calls still work
```

### 14.2 Migration Strategy

```typescript
// Old code (still works)
const result = await generateHTTPTests(
  taskPlan,
  discoveredRoutes,
  config,
  projectContext
);

// New code (with route mappings)
const routeMappings = await generateRouteMappings(
  acceptanceCriteria,
  discoveredRoutes,
  config,
  openApiSpec
);

const result = await generateHTTPTests(
  taskPlan,
  discoveredRoutes,
  config,
  projectContext,
  routeMappings  // Optional parameter
);
```

---

## 15. Migration Path

### 15.1 Phase 1: Add Configuration Support

**Goal:** Enable new config fields without changing behavior

**Changes:**
1. Extend [`TraceQAProjectConfig`](src/config/config-loader.ts:13) interface
2. Update [`config-loader.ts`](src/config/config-loader.ts:66) to parse new fields
3. Add validation for new config fields
4. No behavior changes yet

**Testing:**
- Verify old configs still work
- Verify new config fields are parsed
- Verify validation catches errors

### 15.2 Phase 2: Implement Route Mapping Priority

**Goal:** Implement 6-level route mapping hierarchy

**Changes:**
1. Create new `route-mapper.ts` module
2. Implement [`mapRouteForAcceptanceCriterion()`](src/validation/route-matcher.ts:233) function
3. Add Level 1 (OpenAPI) support
4. Add Level 2 (Config) support
5. Integrate with existing Level 3 (IBM)
6. Add Level 4 (Structural validation)
7. Add Level 5 (Fallback)
8. Add Level 6 (Uncertain)

**Testing:**
- Test each level independently
- Test level priority order
- Test fallback behavior

### 15.3 Phase 3: Enhance IBM Integration

**Goal:** IBM produces route mapping objects

**Changes:**
1. Create [`buildIBMRouteMappingPrompt()`](src/generators/qa-task-plan-generator.ts:91) function
2. Add IBM route mapping API call
3. Implement [`validateIBMRouteMapping()`](src/generators/qa-task-plan-generator.ts:195) function
4. Update test generation to use route mappings

**Testing:**
- Test IBM route mapping generation
- Test validation logic
- Test integration with test generation

### 15.4 Phase 4: Refactor Body Generation

**Goal:** Make field inference configurable

**Changes:**
1. Extract hardcoded patterns from [`body-generator.ts`](src/validation/body-generator.ts:1)
2. Implement configurable field inference
3. Add sample data support
4. Maintain fallback to defaults

**Testing:**
- Test custom field inference rules
- Test sample data scenarios
- Test fallback behavior

### 15.5 Phase 5: Update Reporting

**Goal:** Accurate test classification and trace matrix

**Changes:**
1. Update [`report-generator.ts`](src/reporting/report-generator.ts:1) classification logic
2. Separate uncertain from failed tests
3. Implement strict trace matrix mapping
4. Add new report metrics

**Testing:**
- Test report classification
- Test trace matrix mapping
- Test merge readiness calculation

---

## 16. Implementation Phases

### 16.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              IMPLEMENTATION PHASES                              │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Configuration Support (1-2 days)
├─ Add new config fields
├─ Update config loader
├─ Add validation
└─ No behavior changes

Phase 2: Route Mapping Priority (3-4 days)
├─ Implement 6-level hierarchy
├─ Create route-mapper module
├─ Integrate with existing code
└─ Add comprehensive tests

Phase 3: IBM Enhancement (2-3 days)
├─ Create route mapping prompt
├─ Add IBM API integration
├─ Implement validation
└─ Update test generation

Phase 4: Body Generation Refactor (2-3 days)
├─ Extract hardcoded patterns
├─ Implement configurable inference
├─ Add sample data support
└─ Maintain backward compatibility

Phase 5: Reporting Updates (1-2 days)
├─ Update classification logic
├─ Fix trace matrix mapping
├─ Add new metrics
└─ Update report format

Total Estimated Time: 9-14 days
```

### 16.2 Success Criteria

**Phase 1:**
- [ ] New config fields parsed correctly
- [ ] Old configs still work
- [ ] Validation catches errors
- [ ] No behavior changes

**Phase 2:**
- [ ] All 6 levels implemented
- [ ] Priority order respected
- [ ] Fallback works correctly
- [ ] Tests pass

**Phase 3:**
- [ ] IBM produces route mappings
- [ ] Validation works correctly
- [ ] Integration with test generation
- [ ] Tests pass

**Phase 4:**
- [ ] Field inference configurable
- [ ] Sample data works
- [ ] Fallback to defaults
- [ ] Tests pass

**Phase 5:**
- [ ] Uncertain ≠ Failed
- [ ] Trace matrix accurate
- [ ] New metrics correct
- [ ] Tests pass

---

## 17. Conclusion

This design document provides a comprehensive specification for implementing a route-mapping priority system in TraceQA. The design addresses all identified issues while maintaining backward compatibility and following best practices.

**Key Benefits:**
1. **User Control:** Explicit route mappings via config
2. **AI Enhancement:** IBM produces validated route mappings
3. **Flexibility:** Configurable field inference and patterns
4. **Accuracy:** Clear test status classification
5. **Transparency:** Accurate reporting and trace matrix

**Next Steps:**
1. Review this design document
2. Gather feedback and make adjustments
3. Begin Phase 1 implementation
4. Iterate through remaining phases
5. Deploy and monitor

---

**Document Status:** Ready for Review  
**Approval Required:** Yes  
**Implementation Start:** Pending Approval
