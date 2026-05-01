# TraceQA Features Documentation

Comprehensive guide to all TraceQA features with examples and use cases.

## Table of Contents

1. [Acceptance Criteria Parsing](#1-acceptance-criteria-parsing)
2. [Executable Test Generation](#2-executable-test-generation)
3. [Route Discovery](#3-route-discovery)
4. [Enhanced Approval Gate](#4-enhanced-approval-gate)
5. [Multi-Framework Support](#5-multi-framework-support)
6. [Requirement Traceability](#6-requirement-traceability)
7. [Evidence Reporting](#7-evidence-reporting)
8. [Merge Readiness Scoring](#8-merge-readiness-scoring)

---

## 1. Acceptance Criteria Parsing

### Overview
TraceQA parses acceptance criteria from markdown files, supporting multiple formats for maximum flexibility.

### Supported Formats

#### AC-N Format (Recommended)
```markdown
# Acceptance Criteria

AC-1: User can register with valid email and strong password
AC-2: Registration rejects invalid email formats
AC-3: User can log in with valid credentials
```

**Benefits:**
- Clear, unique identifiers for each criterion
- Easy to reference in discussions and documentation
- Maintains traceability throughout the testing process

#### Numbered List Format
```markdown
# Acceptance Criteria

1. User can create a new account
2. User can log in with credentials
3. User can reset password
```

**Benefits:**
- Simple and intuitive
- Familiar format for most teams
- Auto-generates AC-1, AC-2, AC-3 identifiers

#### Bullet List Format
```markdown
# Acceptance Criteria

- System validates email format
- System enforces password strength
- System prevents duplicate registrations
```

**Benefits:**
- Quick to write
- Good for brainstorming sessions
- Auto-generates identifiers

#### Multi-line Criteria
```markdown
# Acceptance Criteria

AC-1: User can register with valid email and strong password.
The password must be at least 8 characters long and contain uppercase, 
lowercase, and numbers.

AC-2: Registration rejects invalid email formats.
Invalid formats include missing @ symbol, missing domain, etc.
```

**Benefits:**
- Supports detailed requirements
- Allows for clarifications and examples
- Maintains readability

### Usage Example

```bash
# Create acceptance criteria file
cat > acceptance.md << EOF
# Acceptance Criteria

AC-1: User can register with valid credentials
AC-2: User can log in with valid credentials
AC-3: System validates email format
EOF

# Run TraceQA with acceptance criteria
traceqa test --criteria acceptance.md --base-url http://localhost:3000
```

### Parser Output

```json
{
  "criteria": [
    {
      "id": "AC-1",
      "description": "User can register with valid credentials"
    },
    {
      "id": "AC-2",
      "description": "User can log in with valid credentials"
    },
    {
      "id": "AC-3",
      "description": "System validates email format"
    }
  ]
}
```

---

## 2. Executable Test Generation

### Overview
TraceQA generates ready-to-run HTTP tests that can be executed immediately against your API.

### Generated Artifacts

#### Directory Structure
```
traceqa-generated/
├── qa-task-plan.json          # Full IBM test plan
├── generated-http-tests.json  # Executable HTTP tests
├── generated-tests.md         # Human-readable docs
└── metadata.json              # Generation metadata
```

#### HTTP Test Format
```json
{
  "tests": [
    {
      "id": "test-1",
      "acceptanceCriteriaId": "AC-1",
      "name": "User Registration - Valid Credentials",
      "method": "POST",
      "endpoint": "/api/register",
      "body": {
        "email": "test@example.com",
        "password": "SecurePass123!"
      },
      "expectedStatus": 201,
      "description": "Verify user can register with valid email and strong password"
    }
  ]
}
```

### Features

- **POST/PUT/PATCH Support** - Full request body handling
- **Content-Type Headers** - Automatic JSON headers
- **Multi-Step Tests** - Sequential test execution
- **Expected Status Codes** - Validation of responses
- **One-to-One Mapping** - Each AC maps to exactly one test

### Usage Example

```bash
# Generate tests
traceqa test --criteria acceptance.md --base-url http://localhost:3000

# Review generated tests
cat traceqa-generated/generated-tests.md

# Tests are automatically executed after approval
```

---

## 3. Route Discovery

### Overview
Automatically discovers API routes from your codebase to enhance test generation accuracy.

### Supported Frameworks

#### Express (Node.js)
```javascript
// Discovers these routes
app.get('/health', (req, res) => { ... });
app.post('/api/register', (req, res) => { ... });
router.get('/api/users/:id', (req, res) => { ... });
```

#### FastAPI (Python)
```python
# Discovers these routes
@app.get("/health")
async def health(): ...

@app.post("/api/register")
async def register(user: User): ...
```

#### ASP.NET (C#)
```csharp
// Discovers these routes
[HttpGet("/health")]
public IActionResult Health() { ... }

[HttpPost("/api/register")]
public IActionResult Register([FromBody] User user) { ... }
```

#### Spring Boot (Java)
```java
// Discovers these routes
@GetMapping("/health")
public ResponseEntity<String> health() { ... }

@PostMapping("/api/register")
public ResponseEntity<User> register(@RequestBody User user) { ... }
```

#### Go
```go
// Discovers these routes
http.HandleFunc("/health", healthHandler)
http.HandleFunc("/api/register", registerHandler)

// Also supports gorilla/mux and gin
```

#### OpenAPI/Swagger
```yaml
# Parses OpenAPI specs
paths:
  /health:
    get:
      summary: Health check
  /api/register:
    post:
      summary: User registration
```

### Discovery Output

```
🔍 Discovering routes...
✓ Framework: Express
✓ Discovery Method: static-analysis
✓ Routes found: 6

Discovered routes:
  GET    /health
  POST   /api/register
  POST   /api/login
  GET    /api/users/:id
  PUT    /api/users/:id
  DELETE /api/users/:id
```

### Benefits

- **Accurate Test Generation** - Tests target actual endpoints
- **Endpoint Validation** - Verifies routes exist before testing
- **Framework Detection** - Auto-detects project type
- **Multi-Language Support** - Works across 6+ frameworks

---

## 4. Enhanced Approval Gate

### Overview
Preview tests before execution with detailed summaries and the ability to approve or reject.

### Approval Gate Display

```
📋 Generated Test Plan Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 6
Test Types:
  • API Tests: 6
  • Browser Tests: 0

Test Breakdown:
  ✓ AC-1: User Registration - Valid Credentials (POST /api/register)
  ✓ AC-2: Registration - Invalid Email (POST /api/register)
  ✓ AC-3: User Login - Valid Credentials (POST /api/login)
  ✓ AC-4: Login - Invalid Credentials (POST /api/login)
  ✓ AC-5: Get User Profile (GET /api/users/:id)
  ✓ AC-6: Update User Profile (PUT /api/users/:id)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Do you want to proceed with test execution? (Y/n)
```

### Features

- **Test Count** - Shows total number of tests
- **Test Types** - Breaks down by API vs Browser tests
- **Test Details** - Lists each test with method and endpoint
- **Traceability** - Shows AC-to-test mapping
- **Auto-Approval** - Use `--yes` flag to skip prompt

### Usage

```bash
# Interactive approval (default)
traceqa test --criteria acceptance.md

# Auto-approve
traceqa test --criteria acceptance.md --yes
```

---

## 5. Multi-Framework Support

### Overview
TraceQA is language-agnostic and supports multiple programming languages and frameworks.

### Supported Languages

| Language | Frameworks | Detection Method |
|----------|-----------|------------------|
| **Node.js** | Express, Fastify, Koa | package.json, server files |
| **Python** | FastAPI, Flask, Django | requirements.txt, main.py |
| **.NET** | ASP.NET Core, Web API | .csproj, Program.cs |
| **Java** | Spring Boot, Jakarta EE | pom.xml, build.gradle |
| **Go** | net/http, gin, mux | go.mod, main.go |

### Auto-Detection

TraceQA automatically detects your project type:

```bash
# Detects Node.js project
traceqa test --repo ./my-express-app --criteria acceptance.md

# Detects Python project
traceqa test --repo ./my-fastapi-app --criteria acceptance.md

# Detects .NET project
traceqa test --repo ./my-aspnet-app --criteria acceptance.md
```

### Custom Commands

Override auto-detection with custom commands:

```bash
# Python project with custom commands
traceqa test --repo ./my-app \
  --install-cmd "pip install -r requirements.txt" \
  --start-cmd "python main.py"

# Node.js project with custom commands
traceqa test --repo ./my-app \
  --install-cmd "npm install" \
  --start-cmd "npm start"
```

---

## 6. Requirement Traceability

### Overview
One-to-one mapping between acceptance criteria and tests with full traceability.

### Trace Matrix Format

```json
{
  "matrix": [
    {
      "acceptanceCriteriaId": "AC-1",
      "acceptanceCriteriaDescription": "User can register with valid credentials",
      "testId": "test-1",
      "testName": "User Registration - Valid Credentials",
      "status": "passed",
      "evidence": {
        "method": "POST",
        "endpoint": "/api/register",
        "statusCode": 201,
        "duration": "245ms"
      },
      "coverage": "full"
    }
  ]
}
```

### Coverage Levels

- **Full** - AC fully tested and passed
- **Partial** - AC tested but some tests failed
- **None** - AC not tested or test uncertain

### Benefits

- **Audit Trail** - Complete record of what was tested
- **Compliance** - Meets regulatory requirements
- **Quality Assurance** - Ensures all requirements are tested
- **Debugging** - Easy to identify which AC failed

---

## 7. Evidence Reporting

### Overview
Comprehensive reports in multiple formats for different audiences.

### Report Types

#### 1. Markdown Report (report.md)
Human-readable report with:
- Executive summary
- Merge readiness badge
- Test statistics
- Detailed results
- Recommendations

#### 2. JSON Report (report.json)
Machine-readable report with:
- Complete test results
- Trace matrix data
- Merge readiness score
- Metadata and timestamps

#### 3. Trace Matrix (trace-matrix.json)
Traceability report with:
- AC-to-test mapping
- Execution results
- Evidence and coverage

### Example Report

```markdown
# TraceQA Test Report

## Executive Summary

**Merge Readiness**: ✅ Safe to Merge (Score: 95/100)

## Test Statistics

- Total Tests: 6
- Passed: 6 (100%)
- Failed: 0 (0%)
- Uncertain: 0 (0%)

## Recommendation

✅ **Safe to Merge** - All tests passed successfully.

## Trace Matrix

| AC ID | Description | Test | Status | Evidence |
|-------|-------------|------|--------|----------|
| AC-1 | User can register | test-1 | ✅ Passed | POST /api/register (201) |
| AC-2 | Invalid email rejected | test-2 | ✅ Passed | POST /api/register (400) |
```

---

## 8. Merge Readiness Scoring

### Overview
Calculates a merge safety score (0-100) based on test results and coverage.

### Scoring Algorithm

```
Base Score: 100

Deductions:
- Failed test: -15 points each
- Uncertain test: -5 points each
- Low coverage (<80%): -20 points
- Critical failure (API/integration): -25 points each
```

### Score Ranges

| Score | Badge | Recommendation |
|-------|-------|----------------|
| 90-100 | ✅ Safe to Merge | Proceed with merge |
| 70-89 | ⚠️ Review Needed | Review failures before merge |
| <70 | ❌ Do Not Merge | Fix issues before merge |

### Example Scenarios

#### Scenario 1: Perfect Score
```
Tests: 6 passed, 0 failed, 0 uncertain
Coverage: 100%
Score: 100/100
Recommendation: ✅ Safe to Merge
```

#### Scenario 2: Minor Issues
```
Tests: 5 passed, 0 failed, 1 uncertain
Coverage: 100%
Score: 95/100 (100 - 5)
Recommendation: ✅ Safe to Merge
```

#### Scenario 3: Failed Tests
```
Tests: 4 passed, 2 failed, 0 uncertain
Coverage: 100%
Score: 70/100 (100 - 30)
Recommendation: ⚠️ Review Needed
```

#### Scenario 4: Critical Failure
```
Tests: 3 passed, 1 failed (critical), 0 uncertain
Coverage: 100%
Score: 60/100 (100 - 15 - 25)
Recommendation: ❌ Do Not Merge
```

---

## Feature Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Acceptance Criteria Parsing | ❌ | ✅ |
| Executable Test Generation | ❌ | ✅ |
| Route Discovery | ❌ | ✅ |
| Enhanced Approval Gate | ❌ | ✅ |
| POST/PUT/PATCH Support | ❌ | ✅ |
| Multi-Step Tests | ❌ | ✅ |
| One-to-One Traceability | ❌ | ✅ |
| Multi-Framework Support | ⚠️ Limited | ✅ Full |
| IBM watsonx.ai Integration | ✅ | ✅ |
| Report Generation | ✅ | ✅ Enhanced |
| Merge Readiness Scoring | ✅ | ✅ |

---

## Best Practices

### 1. Writing Acceptance Criteria
- Use AC-N format for clear identifiers
- Be specific and measurable
- Include expected behavior
- Avoid ambiguous terms

### 2. Test Execution
- Review test preview before approval
- Use `--yes` flag in CI/CD pipelines
- Check trace matrix for coverage
- Review failed tests immediately

### 3. Route Discovery
- Keep route definitions in standard locations
- Use framework conventions
- Maintain OpenAPI specs if available
- Verify discovered routes are correct

### 4. Reporting
- Review merge readiness score
- Check trace matrix for gaps
- Share reports with team
- Archive reports for compliance

---

## Troubleshooting

### Issue: No routes discovered
**Solution:** Ensure your project follows framework conventions or provide OpenAPI spec.

### Issue: Tests not executing
**Solution:** Verify base URL is correct and API is running.

### Issue: Low merge readiness score
**Solution:** Review failed tests and fix issues before merging.

### Issue: Acceptance criteria not parsed
**Solution:** Check markdown format and ensure proper heading structure.

---

## Future Enhancements

- 🔮 GraphQL support
- 🔮 WebSocket testing
- 🔮 Performance testing
- 🔮 Security testing
- 🔮 Visual regression testing
- 🔮 Mobile API testing
- 🔮 Database validation
- 🔮 CI/CD integration plugins

---

For more information, see [README.md](README.md) and [CHANGELOG.md](CHANGELOG.md).