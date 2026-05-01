# TraceQA

> IBM watsonx.ai-powered pre-QA validation CLI for developers

TraceQA is an intelligent testing tool that helps developers validate changes before sending to QA or merging code. Powered by IBM watsonx.ai, it converts acceptance criteria into executable tests, provides merge readiness assessments, and generates comprehensive evidence reports.

## Features

### Core Capabilities
- 🤖 **IBM watsonx.ai Integration** - AI-powered test generation from acceptance criteria
- ✅ **Acceptance Criteria Parsing** - Parse AC from markdown files (AC-N format, numbered lists, bullets)
- 🔍 **Ambiguity Detection** - Identifies vague requirements and suggests improvements
- 📊 **Requirement Trace Matrix** - Maps acceptance criteria to tests and results (one-to-one mapping)
- 🎯 **Diff-Aware Testing** - Analyzes git changes to focus testing efforts

### Test Generation & Execution
- ⚡ **Executable Test Generation** - Creates ready-to-run HTTP tests in `traceqa-generated/`
- 🚀 **Real Test Execution** - Executes API tests with POST/PUT/PATCH body support
- 🔄 **Multi-Step Test Execution** - Handles complex test scenarios with multiple steps
- 🌐 **Route Discovery** - Auto-discovers API routes from Express, FastAPI, ASP.NET, Spring Boot, Go, OpenAPI

### Quality & Reporting
- 📈 **Merge Readiness Score** - Calculates merge safety based on test results
- 📁 **Evidence Reports** - Generates JSON, Markdown, and trace matrix reports
- 🎭 **Enhanced Approval Gate** - Preview tests before execution with detailed summaries
- 🎭 **Demo Mode** - Try TraceQA without IBM credentials

## Installation

```bash
npm install -g traceqa
```

Or use locally:
```bash
npm install traceqa
npx traceqa --help
```

## Quick Start

### 1. Try the Demo (No Setup Required)

```bash
npm run demo
# or
traceqa demo --mock
```

This runs a complete demo with sample acceptance criteria and generates a full proof report.

### 2. Set Up IBM watsonx.ai

Create a `.env` file or set environment variables:

```bash
IBM_WATSONX_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com  # optional
IBM_WATSONX_MODEL=ibm/granite-3-3-8b-instruct  # optional
```

Get your credentials from [IBM Cloud](https://cloud.ibm.com/).

### 3. Validate IBM Setup

```bash
npm run smoke:ibm
```

This tests your IBM watsonx.ai connection and credentials.

### 4. Create Acceptance Criteria

Create an `acceptance.md` file:

```markdown
# Acceptance Criteria

AC-1: User can register with valid email and strong password
AC-2: Registration rejects invalid email formats
AC-3: User can log in with valid credentials
```

### 5. Run Your First Test

```bash
# Basic usage with acceptance criteria
traceqa test --repo ./my-project --criteria acceptance.md --base-url http://localhost:3000

# With auto-approval
traceqa test --repo ./my-project --criteria acceptance.md --base-url http://localhost:3000 --yes

# Skip ambiguity check
traceqa test --repo ./my-project --criteria acceptance.md --skip-ambiguity-check

# Custom commands
traceqa test --repo ./my-project --install-cmd "pip install -r requirements.txt" --start-cmd "python main.py"
```

## Commands

### `traceqa test`

Run tests based on acceptance criteria or feature description.

```bash
# With acceptance criteria file (recommended)
traceqa test --repo ./my-project --criteria acceptance.md --base-url http://localhost:3000

# With description
traceqa test -d "User can register with email and password"

# With auto-approval
traceqa test --repo ./my-project --criteria acceptance.md --base-url http://localhost:3000 --yes

# Skip ambiguity check
traceqa test --criteria acceptance.md --skip-ambiguity-check

# Custom commands
traceqa test --repo ./my-project --install-cmd "pip install -r requirements.txt" --start-cmd "python main.py"

# Compare against specific branch
traceqa test --criteria acceptance.md --base-branch develop

# Custom output directory
traceqa test --criteria acceptance.md --output-dir ./qa-reports
```

**Options:**
- `-d, --description <text>` - Feature description or acceptance criteria
- `-c, --criteria <file>` - Path to acceptance criteria file (markdown format)
- `-r, --repo <path>` - Project repository path (default: current directory)
- `--base-url <url>` - Base URL for API testing (e.g., http://localhost:3000)
- `--install-cmd <command>` - Custom install command (default: auto-detected)
- `--start-cmd <command>` - Custom start command (default: auto-detected)
- `--output-dir <path>` - Custom output directory (default: ./traceqa-proof)
- `--skip-ambiguity-check` - Skip ambiguity analysis
- `--base-branch <branch>` - Git branch to compare against (default: main)
- `-y, --yes` - Auto-approve test execution
- `--debug` - Enable debug mode

### `traceqa demo`

Run a demonstration with sample acceptance criteria.

```bash
# Auto-detect IBM credentials
traceqa demo

# Force mock mode
traceqa demo --mock

# Custom output directory
traceqa demo --output-dir ./demo-output
```

### `traceqa init`

Initialize TraceQA configuration in your project.

```bash
traceqa init

# Overwrite existing configuration
traceqa init --force
```

### `traceqa config`

Manage TraceQA configuration.

```bash
# View current config
traceqa config --show

# Set API key
traceqa config --api-key your_key_here
```

### `traceqa info`

Display system and project information.

```bash
traceqa info
```

## Acceptance Criteria Format

TraceQA supports multiple acceptance criteria formats in markdown files:

### AC-N Format (Recommended)
```markdown
# Acceptance Criteria

AC-1: User can register with valid email and strong password
AC-2: Registration rejects invalid email formats
AC-3: User can log in with valid credentials
```

### Numbered List Format
```markdown
# Acceptance Criteria

1. User can create a new account
2. User can log in with credentials
3. User can reset password
```

### Bullet List Format
```markdown
# Acceptance Criteria

- System validates email format
- System enforces password strength
- System prevents duplicate registrations
```

### Multi-line Criteria
```markdown
# Acceptance Criteria

AC-1: User can register with valid email and strong password.
The password must be at least 8 characters long and contain uppercase, lowercase, and numbers.

AC-2: Registration rejects invalid email formats.
Invalid formats include missing @ symbol, missing domain, etc.
```

## Generated Artifacts

TraceQA generates two sets of artifacts:

### 1. Test Generation Artifacts (`traceqa-generated/`)
- **`qa-task-plan.json`** - Full IBM test plan with test cases
- **`generated-http-tests.json`** - Executable HTTP tests ready to run
- **`generated-tests.md`** - Human-readable test documentation
- **`metadata.json`** - Generation metadata and timestamps

### 2. Test Execution Reports (`traceqa-proof/`)
- **`report.md`** - Human-readable report with merge readiness badge
- **`report.json`** - Machine-readable report with complete test results
- **`trace-matrix.json`** - Requirement traceability matrix (one-to-one AC-to-test mapping)

## Route Discovery

TraceQA automatically discovers API routes from your codebase to enhance test generation.

### Supported Frameworks
- **Express** (Node.js) - `app.get()`, `app.post()`, `router.get()`, etc.
- **FastAPI** (Python) - `@app.get()`, `@app.post()`, `@router.get()`, etc.
- **ASP.NET** (C#) - `[HttpGet]`, `[HttpPost]`, `[Route]` attributes
- **Spring Boot** (Java) - `@GetMapping`, `@PostMapping`, `@RequestMapping`
- **Go** - `net/http`, `gorilla/mux`, `gin` frameworks
- **OpenAPI/Swagger** - Parses `openapi.json`, `swagger.json`, `openapi.yaml`

### Discovery Methods
1. **Static Analysis** - Parses source code to find route definitions
2. **OpenAPI Specs** - Reads OpenAPI/Swagger documentation
3. **Auto-Detection** - Automatically detects framework from project structure

### Example Output
```
Discovered routes:
  GET    /health
  POST   /api/register
  POST   /api/login
  GET    /api/users/:id
  PUT    /api/users/:id
  DELETE /api/users/:id
```

Route information is used to:
- Generate more accurate test cases
- Validate endpoint accessibility
- Map acceptance criteria to specific API endpoints

## Example Workflow

Here's a complete workflow from acceptance criteria to test execution:

```bash
# 1. Create acceptance criteria
cat > acceptance.md << EOF
# Acceptance Criteria
AC-1: User can register with valid credentials
AC-2: User can log in with valid credentials
AC-3: System validates email format
AC-4: System enforces password strength
EOF

# 2. Run TraceQA
traceqa test --repo ./my-api --criteria acceptance.md --base-url http://localhost:3000

# 3. Review generated tests in traceqa-generated/
cat traceqa-generated/generated-tests.md

# 4. Check proof reports in traceqa-proof/
cat traceqa-proof/report.md

# 5. Review traceability matrix
cat traceqa-proof/trace-matrix.json
```

**What happens during execution:**
1. ✅ Parses acceptance criteria from markdown
2. 🔍 Discovers API routes from your codebase
3. 🤖 Generates executable tests using IBM watsonx.ai
4. 📝 Shows test preview with approval gate
5. ⚡ Executes tests against your API
6. 📊 Generates comprehensive reports with traceability

## Merge Readiness Scoring

TraceQA calculates a merge readiness score (0-100) based on:

- **Failed tests**: -15 points each
- **Uncertain tests**: -5 points each
- **Low coverage** (<80%): -20 points
- **Critical failures** (API/integration): -25 points each

**Recommendations:**
- **90-100**: ✅ Safe to Merge
- **70-89**: ⚠️ Review Needed
- **<70**: ❌ Do Not Merge

## Test Execution

### API Tests
API tests are executed using real HTTP requests when:
- Test includes API endpoint information
- Endpoint is accessible

### Browser Tests
Browser tests require MCP (Model Context Protocol) server:
- Install: `npm install -g @modelcontextprotocol/server-puppeteer`
- Tests marked as "uncertain" if MCP not configured

### Uncertain Tests
Tests marked as "uncertain" when:
- Browser MCP not configured
- API endpoint unreachable
- Test cannot be executed for technical reasons

**TraceQA never fakes test results.** If a test cannot be executed, it's marked uncertain with a clear reason.

## Ambiguity Detection

TraceQA analyzes acceptance criteria for vague terms:

**High Severity:**
- "secure", "fast", "efficient", "good", "bad"
- "easy", "simple", "complex"

**Medium Severity:**
- "some", "many", "few", "several"
- "properly", "correctly", "accurately"

**Low Severity:**
- "etc", "and so on", "similar"

For each issue, TraceQA suggests specific, measurable alternatives.

## Diff-Aware Testing

When run in a git repository, TraceQA:
1. Analyzes changes against base branch
2. Identifies impacted areas (API, UI, Auth, Data)
3. Calculates risk level (High/Medium/Low)
4. Focuses test generation on changed areas

## Development

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Build
npm run build

# Run demo
npm run demo

# Test IBM integration
npm run smoke:ibm

# Development mode
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `IBM_WATSONX_API_KEY` | Yes | - | IBM watsonx.ai API key |
| `IBM_WATSONX_PROJECT_ID` | Yes | - | IBM watsonx.ai project ID |
| `IBM_WATSONX_URL` | No | `https://us-south.ml.cloud.ibm.com` | IBM watsonx.ai service URL |
| `IBM_WATSONX_MODEL` | No | `ibm/granite-3-3-8b-instruct` | Model to use |
| `IBM_WATSONX_MAX_TOKENS` | No | `4096` | Maximum tokens per request |
| `IBM_WATSONX_TEMPERATURE` | No | `0.7` | Model temperature |
| `TRACEQA_LOG_LEVEL` | No | `info` | Log level (debug/info/warn/error) |

## Project Structure

```
TraceQA/
├── src/
│   ├── cli/          # CLI interface and commands
│   ├── core/         # Core application logic
│   ├── agent/        # AI agent implementation
│   ├── testing/      # Testing utilities and runners
│   ├── mcp/          # Model Context Protocol integration
│   ├── analysis/     # Ambiguity detection and git analysis
│   ├── reporting/    # Report generation
│   ├── demo/         # Demo mode implementation
│   ├── utils/        # Utility functions
│   └── types/        # TypeScript type definitions
├── dist/             # Compiled output (generated)
└── traceqa-proof/    # Test reports (generated)
```

## Limitations

- **Browser tests** require MCP server setup
- **API tests** require accessible endpoints
- **Git analysis** requires git repository
- **IBM watsonx.ai** required for AI-powered test generation (demo mode available without)

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT

## Support

- Documentation: [GitHub Wiki](https://github.com/yourusername/traceqa/wiki)
- Issues: [GitHub Issues](https://github.com/yourusername/traceqa/issues)
- IBM watsonx.ai: [IBM Cloud Docs](https://cloud.ibm.com/docs/watsonx)

---

**Note**: This project is currently in active development. Features and APIs may change.