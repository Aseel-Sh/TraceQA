# TraceQA Architecture Refactoring Plan

**Version:** 1.0  
**Date:** 2026-05-02  
**Status:** Draft for Review

## Executive Summary

This document outlines a comprehensive refactoring plan to transform TraceQA from its current state into a fully functional AI QA agent that creates, validates, and executes QA tests from acceptance criteria. The refactoring addresses critical gaps in test generation, execution, and reporting while establishing a robust, generic architecture.

### Current State Problems

1. **Test Execution Gap**: Generated HTTP tests are not actually executed (Phase 7 only logs test plans)
2. **Reporting Issues**: Reports show 0/0 tests passed even when tests exist
3. **Incomplete Trace Matrix**: Shows no generated tests or execution results
4. **Directory Confusion**: Generated tests go to `traceqa-proof/` instead of `traceqa-generated/`
5. **Limited Route Coverage**: Only 1 test ready, 6 uncertain despite discoverable routes
6. **Empty Request Bodies**: POST requests have `{}` bodies instead of meaningful data
7. **Over-reliance on AI**: Too much dependency on raw IBM output without validation/normalization

### Solution Overview

The refactoring introduces:
- **Separate directories**: `traceqa-generated/` for artifacts, `traceqa-proof/` for execution reports
- **New schemas**: QA task plan and generated HTTP test schemas with proper validation
- **Generic architecture**: Route matching and status normalization using HTTP semantics
- **Actual test execution**: Engine that runs `generated-http-tests.json`
- **Proper classification**: Result types (passed/failed/uncertain/manual/traceqa_generation_issue)
- **Complete traceability**: AC → QA Task → Generated Test → Execution Result

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Data Flow Mapping](#2-data-flow-mapping)
3. [Gap Analysis](#3-gap-analysis)
4. [New Architecture Design](#4-new-architecture-design)
5. [Component Changes](#5-component-changes)
6. [New TypeScript Interfaces](#6-new-typescript-interfaces)
7. [Implementation Order](#7-implementation-order)
8. [Validation & Normalization Rules](#8-validation--normalization-rules)
9. [Testing Strategy](#9-testing-strategy)
10. [Migration Path](#10-migration-path)

---

## 1. Current Architecture Analysis

### 1.1 Component Inventory

| Component | File | Current Responsibility | Status |
|-----------|------|----------------------|--------|
| **Acceptance Parser** | `src/parsers/acceptance-parser.ts` | Parse AC from markdown | ✅ Working |
| **Config Loader** | `src/config/config-loader.ts` | Load traceqa.config.json | ✅ Working |
| **Route Discovery** | `src/discovery/route-discovery.ts` | Discover API routes | ✅ Working |
| **Watsonx Client** | `src/agent/watsonx-client.ts` | IBM AI integration | ✅ Working |
| **Test Agent** | `src/agent/test-agent.ts` | Generate test plans via AI | ⚠️ Needs validation layer |
| **QA Task Generator** | `src/generators/qa-task-generator.ts` | Generate QA tasks | ⚠️ Exists but underutilized |
| **HTTP Test Generator** | `src/generators/qa-task-generator.ts` | Generate HTTP tests | ⚠️ Exists but underutilized |
| **Test Generator** | `src/generators/test-generator.ts` | Legacy test generation | ⚠️ Duplicate functionality |
| **Artifact Writer** | `src/generators/artifact-writer.ts` | Write generated files | ⚠️ Wrong directory |
| **Test Coordinator** | `src/testing/test-coordinator.ts` | Orchestrate workflow | ❌ Doesn't execute generated tests |
| **Test Runner** | `src/testing/test-runner.ts` | Execute test cases | ✅ Working (but not used) |
| **API Tester** | `src/testing/api-tester.ts` | Execute API tests | ✅ Working |
| **Test Normalizer** | `src/testing/test-normalizer.ts` | Normalize test format | ⚠️ Needs enhancement |
| **Report Generator** | `src/reporting/report-generator.ts` | Generate reports | ⚠️ Missing generated test data |

### 1.2 Current Data Flow

```
acceptance.md
    ↓
[AcceptanceParser] → AcceptanceCriteria[]
    ↓
[RouteDiscovery] → DiscoveredRoute[]
    ↓
[TestAgent + WatsonxClient] → TestPlan (AI-generated)
    ↓
[TestCoordinator.executeTestPlan] → TestResults
    ↓
[ReportGenerator] → report.json, trace-matrix.json, report.md
    ↓
traceqa-proof/
```

**Problem**: The flow skips the deterministic generation layer and doesn't use `QATaskGenerator` or `HTTPTestGenerator` properly.

---

## 2. Data Flow Mapping

### 2.1 Current Flow (Broken)

The current system has these issues:
- No intermediate QA task plan
- No generated HTTP test artifacts
- No separation of generation vs execution
- Reports reference non-existent generated tests

### 2.2 Target Flow (Fixed)

```
acceptance.md → Parse AC → Discover Routes → AI Suggestions (optional)
    ↓
QATaskGenerator → qa-task-plan.json (traceqa-generated/)
    ↓
HTTPTestGenerator → generated-http-tests.json (traceqa-generated/)
    ↓
TestExecutionEngine → execution-results.json (traceqa-proof/)
    ↓
ReportGenerator → Complete Reports (traceqa-proof/)
```

---

## 3. Gap Analysis

### 3.1 Critical Gaps

| Gap | Current State | Required State | Impact |
|-----|--------------|----------------|--------|
| **Test Execution** | Tests logged but not executed | Actual HTTP requests executed | HIGH |
| **Artifact Storage** | Mixed in traceqa-proof/ | Separate traceqa-generated/ | HIGH |
| **QA Task Plan** | Not generated/stored | Deterministic task plan created | HIGH |
| **HTTP Test Schema** | Inconsistent format | Validated, normalized schema | HIGH |
| **Route Matching** | Hardcoded for login/register | Generic keyword matching | MEDIUM |
| **Status Inference** | Hardcoded expectations | HTTP semantic rules | MEDIUM |
| **Request Bodies** | Empty `{}` | Fallback generation | MEDIUM |
| **Result Classification** | Binary pass/fail | 5 categories | HIGH |
| **Trace Matrix** | Incomplete | Full AC→Task→Test→Result | HIGH |

---

## 4. New Architecture Design

### 4.1 Directory Structure

```
project-root/
├── acceptance.md                    # Input: Acceptance criteria
├── traceqa.config.json             # Configuration
├── traceqa-generated/              # NEW: Generated test artifacts
│   ├── qa-task-plan.json          # Deterministic task plan
│   ├── generated-http-tests.json  # Executable HTTP tests
│   └── metadata.json              # Generation metadata
└── traceqa-proof/                  # Execution results & reports
    ├── execution-results.json     # Test execution results
    ├── trace-matrix.json          # Complete traceability
    ├── report.json                # Full report
    └── report.md                  # Human-readable report
```

### 4.2 Component Architecture

The system is organized into three main layers:

1. **Input Layer**: Parse acceptance criteria, discover routes, load config
2. **Generation Layer**: Create QA tasks and HTTP tests deterministically
3. **Execution Layer**: Run tests, classify results, generate reports

---

## 5. Component Changes

### 5.1 Major Changes Required

#### [`src/testing/test-coordinator.ts`](src/testing/test-coordinator.ts)

**Current Issues:**
- Executes AI-generated TestPlan directly
- Doesn't use QATaskGenerator or HTTPTestGenerator
- No separation of generation vs execution phases

**Required Changes:**
- Add `generateTestArtifacts()` method to create QA task plan and HTTP tests
- Add `executeGeneratedTests()` method to run tests from `generated-http-tests.json`
- Write artifacts to `traceqa-generated/` directory
- Write results to `traceqa-proof/` directory

#### [`src/generators/artifact-writer.ts`](src/generators/artifact-writer.ts)

**Current Issues:**
- Writes to wrong directory
- Doesn't write all required artifacts

**Required Changes:**
- Write to `traceqa-generated/` directory
- Generate `qa-task-plan.json`, `generated-http-tests.json`, and `metadata.json`
- Include proper timestamps and version info

#### [`src/reporting/report-generator.ts`](src/reporting/report-generator.ts)

**Current Issues:**
- Doesn't include generated test data in trace matrix
- Uses keyword matching instead of explicit IDs

**Required Changes:**
- Use explicit ID linking (acceptanceCriterionId, qaTaskId, testId)
- Include QA task IDs in trace matrix
- Show generated test details
- Distinguish generation errors from app errors

### 5.2 New Components to Create

#### `src/testing/test-execution-engine.ts` (NEW)

**Purpose:** Execute generated HTTP tests and classify results

**Key Methods:**
- `executeHTTPTest(test: GeneratedHTTPTest): Promise<HTTPTestResult>`
- `executeStep(step: HTTPTestStep): Promise<HTTPStepResult>`
- `classifyResult(test, stepResults): TestResultStatus`

#### `src/validation/test-validator.ts` (NEW)

**Purpose:** Validate and normalize AI-generated tests

**Key Methods:**
- `validateQATask(task: any): ValidationResult<QATask>`
- `normalizeHTTPTest(test: any, routes: DiscoveredRoute[]): GeneratedHTTPTest`
- `validateHTTPTestSuite(suite: any): ValidationResult<GeneratedHTTPTestSuite>`

---

## 6. New TypeScript Interfaces

### 6.1 QA Task Plan Schema

```typescript
/**
 * Complete QA task plan schema
 * Stored in: traceqa-generated/qa-task-plan.json
 */
export interface QATaskPlan {
  projectName?: string;
  timestamp: string;
  acceptanceCriteria: AcceptanceCriterion[];
  tasks: QATask[];
  summary: {
    totalTasks: number;
    automatedTasks: number;
    manualTasks: number;
    uncertainTasks: number;
  };
}

export interface QATask {
  taskId: string;                    // Format: QA-001, QA-002, etc.
  acceptanceCriterionId: string;     // Links to AC-1, AC-2, etc.
  title: string;
  type: QATaskType;                  // 'api' | 'ui' | 'integration' | 'manual' | 'uncertain'
  priority: QATaskPriority;          // 'high' | 'medium' | 'low'
  preconditions: string[];
  setupData?: Record<string, any>;
  steps: QATaskStep[];
  expectedResult: string;
  executionMode: ExecutionMode;      // 'automated' | 'manual' | 'uncertain'
  reasoning: string;
  uncertainReason?: string;
}
```

### 6.2 Generated HTTP Test Schema

```typescript
/**
 * Complete HTTP test suite
 * Stored in: traceqa-generated/generated-http-tests.json
 */
export interface GeneratedHTTPTestSuite {
  projectName?: string;
  timestamp: string;
  baseUrl?: string;
  tests: GeneratedHTTPTest[];
  summary: {
    totalTests: number;
    readyTests: number;
    uncertainTests: number;
    manualTests: number;
  };
}

export interface GeneratedHTTPTest {
  id: string;                        // Format: TC-001, TC-002, etc.
  acceptanceCriterionId: string;     // Links to AC-1, AC-2, etc.
  qaTaskId?: string;                 // Links to QA-001, QA-002, etc.
  title: string;
  type: 'api';
  status: TestStatus;                // 'ready' | 'uncertain' | 'manual' | 'skipped'
  uncertainReason?: string | null;
  steps: HTTPTestStep[];
}

export interface HTTPTestStep {
  stepId: string;                    // Format: TC-001-S1, TC-001-S2, etc.
  description?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  acceptableStatuses: number[];
}
```

### 6.3 Execution Result Schema

```typescript
/**
 * HTTP test execution result
 * Stored in: traceqa-proof/execution-results.json
 */
export interface HTTPTestResult {
  testId: string;
  title: string;
  acceptanceCriterionId: string;
  status: TestResultStatus;          // 'passed' | 'failed' | 'uncertain' | 'skipped'
  steps: HTTPStepResult[];
  duration: number;
  error?: string;
  message?: string;
}

export interface HTTPStepResult {
  stepId: string;
  method: string;
  url: string;
  requestBody?: any;
  expectedStatus: number;
  acceptableStatuses: number[];
  actualStatus?: number;
  responseBody?: any;
  duration: number;
  passed: boolean;
  error?: string;
  assertions: AssertionResult[];
}
```

---

## 7. Implementation Order

### Phase 1: Foundation (Week 1)
**Goal:** Establish new directory structure and schemas

1. Create new TypeScript interfaces (1 day)
2. Create directory structure (0.5 days)
3. Update artifact writer (0.5 days)
4. Create test validator (1 day)

**Deliverables:** New type definitions, directory structure, updated artifact writer, test validator

### Phase 2: Generation Layer (Week 2)
**Goal:** Implement deterministic test generation

5. Enhance QATaskGenerator (2 days)
6. Enhance HTTPTestGenerator (2 days)
7. Update test coordinator - generation phase (1 day)

**Deliverables:** Enhanced QA task generation, enhanced HTTP test generation, artifacts in correct location

### Phase 3: Execution Layer (Week 3)
**Goal:** Implement actual test execution

8. Create test execution engine (2 days)
9. Update test coordinator - execution phase (1 day)
10. Add result classifier (1 day)

**Deliverables:** Test execution engine, actual HTTP test execution, proper result classification

### Phase 4: Reporting Layer (Week 4)
**Goal:** Generate complete, accurate reports

11. Update report generator (2 days)
12. Enhance trace matrix (1 day)
13. Update markdown report (1 day)

**Deliverables:** Complete trace matrix, accurate reports, clear error categorization

### Phase 5: Integration & Testing (Week 5)
**Goal:** Integrate all components and test end-to-end

14. Integration testing (2 days)
15. Bug fixes and refinements (2 days)
16. Documentation (1 day)

**Deliverables:** Working end-to-end system, all tests passing, complete documentation

---

## 8. Validation & Normalization Rules

### 8.1 Route Matching Rules

**Generic Keyword Matching:**
- Extract keywords from task title and steps
- Score each route based on keyword overlap
- Consider method matching (GET, POST, etc.)
- Return best match if score > threshold (0.5)

### 8.2 Expected Status Normalization

**HTTP Semantic Rules:**
- Check for explicit failure scenarios in task description
- Map error keywords to appropriate status codes:
  - "unauthorized" → 401
  - "forbidden" → 403
  - "not found" → 404
  - "conflict"/"duplicate" → 409
  - "validation"/"invalid" → 400/422
- For success scenarios, use HTTP method semantics:
  - POST → 201 (Created)
  - PUT/PATCH → 200 (OK)
  - DELETE → 204 (No Content)
  - GET → 200 (OK)

### 8.3 Request Body Generation

**Fallback Strategy:**
1. Use setupData if available
2. Extract from task description
3. Infer from route path parameters
4. Generate generic body based on common patterns

**Placeholder Values:**
- email → "test@example.com"
- password → "TestPassword123"
- name → "Test User"
- id → "123"

### 8.4 Result Classification

**5-Category Classification:**
1. **passed**: All steps passed
2. **failed**: Genuine application failure
3. **uncertain**: Status mismatch but semantically sensible
4. **skipped**: Test not executed
5. **traceqa_generation_issue**: Invalid URL, normalization failed, etc.

**Classification Logic:**
- Check for generation errors (invalid URL, normalization failed)
- Check for status mismatch with semantic validation
- Distinguish between expected failures and unexpected ones

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Components to Test:**
- QATaskGenerator: Route matching, task generation, fallback logic
- HTTPTestGenerator: Status inference, body generation, normalization
- TestExecutionEngine: HTTP execution, result classification
- TestValidator: Validation rules, normalization
- ReportGenerator: Trace matrix generation, coverage calculation

**Coverage Goals:**
- Line coverage: >80%
- Branch coverage: >70%
- Critical paths: 100%

### 9.2 Integration Tests

**Scenarios:**
1. Happy Path: AC → Tasks → Tests → Execution → Reports
2. AI Failure: Fallback to deterministic generation
3. No Routes: Handle gracefully with uncertain tasks
4. Mixed Results: Some pass, some fail, some uncertain
5. Empty AC: Handle edge case

### 9.3 End-to-End Tests

**Test Projects:**
1. Simple Express API (login/register)
2. FastAPI with validation
3. REST API with CRUD operations
4. API with authentication

---

## 10. Migration Path

### 10.1 Backward Compatibility

**Strategy:** Maintain compatibility with existing `traceqa.config.json` and `acceptance.md` formats.

### 10.2 Migration Steps

**For Existing Projects:**
1. Add new directories (`mkdir traceqa-generated`)
2. Update TraceQA (`npm update traceqa`)
3. Run with new architecture (`traceqa test`)
4. Review new reports

### 10.3 Deprecation Timeline

- **v1.0**: Introduce new architecture (both old and new work)
- **v1.1**: Deprecation warnings for old format
- **v2.0**: Remove old format support

---

## Appendix A: Success Metrics

### Quantitative Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Tests Actually Executed | 0% | 100% |
| Correct Directory Usage | 0% | 100% |
| Complete Trace Matrix | 0% | 100% |
| Request Body Coverage | 0% | >80% |
| Result Classification Accuracy | 50% | >90% |
| Route Match Success | 14% (1/7) | >70% |

### Qualitative Metrics

- ✅ Reports are accurate and actionable
- ✅ Developers can understand test failures
- ✅ Generation errors are clearly distinguished from app errors
- ✅ System works with any REST API
- ✅ Minimal manual intervention required

---

## Conclusion

This refactoring plan transforms TraceQA from a partially functional prototype into a production-ready AI QA agent. The key improvements are:

1. **Actual Test Execution**: Tests are now executed, not just logged
2. **Clear Separation**: Generation artifacts vs execution results
3. **Complete Traceability**: Full AC→Task→Test→Result chain
4. **Generic Architecture**: Works with any REST API
5. **Proper Classification**: Distinguishes generation errors from app errors

The implementation is structured in 5 phases over 5 weeks, with clear deliverables and success metrics at each stage.

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Iterate based on feedback