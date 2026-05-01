# TraceQA

> IBM watsonx.ai-powered pre-QA validation CLI for developers

TraceQA is an intelligent testing tool that helps developers validate changes before sending to QA or merging code. Powered by IBM watsonx.ai, it converts acceptance criteria into executable tests, provides merge readiness assessments, and generates comprehensive evidence reports.

## Features

- 🤖 **IBM watsonx.ai Integration** - AI-powered test generation from acceptance criteria
- 🔍 **Ambiguity Detection** - Identifies vague requirements and suggests improvements
- 📊 **Requirement Trace Matrix** - Maps acceptance criteria to tests and results
- 🎯 **Diff-Aware Testing** - Analyzes git changes to focus testing efforts
- ⚡ **Real Test Execution** - Executes API tests and browser tests (with MCP)
- 📈 **Merge Readiness Score** - Calculates merge safety based on test results
- 📁 **Evidence Reports** - Generates JSON, Markdown, and trace matrix reports
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

### 4. Run Your First Test

```bash
traceqa test -d "Add user login with email and password"
```

## Commands

### `traceqa test`

Run tests based on acceptance criteria or feature description.

```bash
# With description
traceqa test -d "User can register with email and password"

# With acceptance criteria file
traceqa test -c ./acceptance-criteria.txt

# With custom output directory
traceqa test -d "Add payment processing" --output-dir ./qa-reports

# Skip ambiguity check
traceqa test -d "Feature description" --skip-ambiguity-check

# Compare against specific branch
traceqa test -d "Feature description" --base-branch develop

# Auto-approve test execution
traceqa test -d "Feature description" --yes
```

**Options:**
- `-d, --description <text>` - Feature description or acceptance criteria
- `-c, --criteria <file>` - Path to acceptance criteria file
- `-r, --repo <path>` - Project repository path (default: current directory)
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

## Generated Reports

TraceQA generates three files in the `traceqa-proof/` directory:

### 1. `report.md` - Human-Readable Report
- Executive summary with merge readiness badge
- Test statistics and success rate
- Recommendation (Safe to Merge / Review Needed / Do Not Merge)
- Risk assessment
- Trace matrix table
- Detailed test results

### 2. `report.json` - Machine-Readable Report
- Complete test results
- Trace matrix data
- Merge readiness score
- Metadata and timestamps

### 3. `trace-matrix.json` - Requirement Traceability
- Maps each acceptance criterion to generated tests
- Shows execution results with evidence
- Coverage metrics (full/partial/none)

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