# Acceptance Criteria Parser & Test Generation Usage Guide

## Overview

TraceQA now supports parsing acceptance criteria from markdown files and generating executable test artifacts with full traceability.

## Features

1. **Acceptance Criteria Parser** - Parse structured acceptance criteria from markdown files
2. **Executable Test Generator** - Convert IBM test plans to executable HTTP tests
3. **Artifact Writer** - Save generated tests to `traceqa-generated/` folder
4. **CLI Integration** - Use `--criteria` flag to specify acceptance criteria file
5. **Test Coordinator** - Execute generated HTTP tests with full traceability
6. **Enhanced Prompts** - Map each test to specific acceptance criterion ID

## Usage

### 1. Create Acceptance Criteria File

Create an `acceptance.md` file with your acceptance criteria:

```markdown
# Acceptance Criteria

AC-1: A user can register with a valid email and strong password.
AC-2: Registration rejects invalid email formats.
AC-3: Registration rejects weak passwords.
AC-4: Duplicate email registration returns a clear conflict error.
AC-5: A registered user can log in with valid credentials.
AC-6: Invalid login credentials are rejected.
```

**Supported Formats:**

- **Explicit IDs**: `AC-1: Description`
- **Numbered Lists**: `1. Description` (generates AC-1, AC-2, etc.)
- **Bullet Lists**: `- Description` (generates AC-1, AC-2, etc.)
- **Multi-line**: Criteria can span multiple lines

### 2. Run TraceQA with Acceptance Criteria

```bash
# Using acceptance criteria file
traceqa test --repo ./my-project --criteria acceptance.md --description "User authentication feature"

# With additional options
traceqa test \
  --repo ./my-project \
  --criteria acceptance.md \
  --description "User authentication feature" \
  --base-url http://localhost:3000 \
  --type api \
  --yes
```

### 3. Generated Artifacts

TraceQA generates the following files in `traceqa-generated/`:

- **`qa-task-plan.json`** - Full IBM test plan with traceability
- **`generated-http-tests.json`** - Executable HTTP tests
- **`generated-tests.md`** - Human-readable test documentation
- **`metadata.json`** - Generation metadata

### 4. Executable HTTP Test Format

```json
{
  "id": "TC-001",
  "acceptanceCriterionId": "AC-1",
  "title": "User can register with valid credentials",
  "method": "POST",
  "url": "/api/auth/register",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "email": "user@example.com",
    "password": "SecurePass123"
  },
  "expectedStatus": 201,
  "expectedBodyContains": ["user", "token"]
}
```

### 5. Traceability Matrix

Each test is mapped to its acceptance criterion:

```
AC-1 → TC-001, TC-002
AC-2 → TC-003
AC-3 → TC-004
AC-4 → TC-005
AC-5 → TC-006, TC-007
AC-6 → TC-008
```

### 6. Test Execution

Tests are automatically executed and results include traceability:

```json
{
  "testCaseId": "TC-001",
  "testCaseName": "User can register with valid credentials",
  "acceptanceCriterionId": "AC-1",
  "passed": true,
  "duration": 245,
  "message": "Status: 201 (expected 201)",
  "timestamp": "2026-05-01T23:00:00.000Z"
}
```

### 7. Proof Reports

Final reports in `traceqa-proof/` include:

- **`report.json`** - Complete test results with traceability
- **`report.md`** - Human-readable report
- **`trace-matrix.json`** - Acceptance criteria coverage matrix

## API Usage

### Parse Acceptance Criteria

```typescript
import { parseAcceptanceCriteria, parseAcceptanceCriteriaFromFile } from './src/parsers/acceptance-parser';

// From string
const result = parseAcceptanceCriteria(markdownContent);

// From file
const result = await parseAcceptanceCriteriaFromFile('acceptance.md');

console.log(result.criteria);
// [
//   { id: 'AC-1', description: '...' },
//   { id: 'AC-2', description: '...' }
// ]
```

### Generate Executable Tests

```typescript
import { generateExecutableTests } from './src/generators/test-generator';

const artifacts = generateExecutableTests(qaTaskPlan);

console.log(artifacts.httpTests);
console.log(artifacts.metadata);
```

### Write Artifacts

```typescript
import { writeTestArtifacts } from './src/generators/artifact-writer';

const result = await writeTestArtifacts(artifacts);

console.log(result.outputDir); // 'traceqa-generated'
console.log(result.files);
// {
//   qaTaskPlan: 'traceqa-generated/qa-task-plan.json',
//   httpTests: 'traceqa-generated/generated-http-tests.json',
//   documentation: 'traceqa-generated/generated-tests.md',
//   metadata: 'traceqa-generated/metadata.json'
// }
```

### Execute Generated Tests

```typescript
import { TestCoordinator } from './src/testing/test-coordinator';

const coordinator = new TestCoordinator(buildSystem, agent, mcpManager, {
  baseUrl: 'http://localhost:3000'
});

const results = await coordinator.executeGeneratedHTTPTests(httpTests, {
  baseUrl: 'http://localhost:3000'
});

console.log(`${results.filter(r => r.passed).length}/${results.length} tests passed`);
```

## Example Workflow

```bash
# 1. Create acceptance criteria
cat > acceptance.md << EOF
# Acceptance Criteria
AC-1: User can register with valid email
AC-2: User can login with credentials
AC-3: Invalid credentials are rejected
EOF

# 2. Run TraceQA
traceqa test \
  --repo ./my-api \
  --criteria acceptance.md \
  --description "User authentication API" \
  --base-url http://localhost:3000 \
  --type api

# 3. Review generated artifacts
ls traceqa-generated/
# qa-task-plan.json
# generated-http-tests.json
# generated-tests.md
# metadata.json

# 4. Review proof reports
ls traceqa-proof/
# report.json
# report.md
# trace-matrix.json
```

## Benefits

1. **Full Traceability** - Every test maps to a specific acceptance criterion
2. **Executable Tests** - Generated tests can be run automatically
3. **Documentation** - Human-readable test documentation generated
4. **Coverage Analysis** - Know which acceptance criteria are covered
5. **Proof of Testing** - Complete audit trail from AC to test results
6. **Reusable Tests** - Generated HTTP tests can be integrated into CI/CD

## Advanced Features

### Custom Test Generation

The test generator intelligently extracts:
- HTTP methods from test descriptions
- URLs and endpoints
- Request bodies
- Expected status codes
- Expected response content

### Multi-line Criteria

```markdown
AC-1: User can register with valid credentials.
The system must validate email format and password strength.
Duplicate emails should be rejected with a 409 status code.
```

### Priority Support (Coming Soon)

```markdown
AC-1 [HIGH]: Critical user authentication flow
AC-2 [MEDIUM]: Password reset functionality
AC-3 [LOW]: Remember me feature
```

## Troubleshooting

### Parser Issues

If criteria aren't parsed correctly:
1. Ensure proper formatting (AC-N:, numbered, or bullet lists)
2. Check for special characters that might break parsing
3. Use explicit AC-N format for best results

### Test Generation Issues

If tests aren't generated correctly:
1. Ensure IBM credentials are configured
2. Check that acceptance criteria are clear and specific
3. Review generated test plan in `traceqa-generated/qa-task-plan.json`

### Execution Issues

If tests fail to execute:
1. Verify base URL is correct and server is running
2. Check that endpoints match your API
3. Review test details in `traceqa-generated/generated-tests.md`

## Next Steps

- Integrate generated tests into CI/CD pipeline
- Use trace matrix for coverage reporting
- Extend test generator for more complex scenarios
- Add custom assertions and validations