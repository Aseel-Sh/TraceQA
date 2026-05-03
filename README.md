# TraceQA

TraceQA is a CLI tool that reads acceptance criteria, discovers routes and builds an API map when possible, generates QA checks, executes high-confidence HTTP tests, and writes proof reports. 

**Current Status:** Hackathon prototype. TraceQA is designed to be conservative; it runs safe, high-confidence tests and marks unclear tests as `uncertain` instead of faking confidence or making aggressive guesses.

## What it does

- Parses acceptance criteria from Markdown.
- Discovers API routes from the application codebase or OpenAPI spec to build an API map.
- Generates QA task plans and HTTP tests mapped to the discovered routes.
- Uses IBM watsonx to intelligently generate payloads and tests, falling back deterministically when confidence is low.
- Executes tests automatically against your running application.
- Generates execution proof artifacts and traceability reports.

## Setup and Installation

### 1. Requirements
- Node.js 18 or newer
- npm
- IBM watsonx credentials

### 2. Install and Build

Clone the repository, install dependencies, and link the CLI:

```bash
npm install
npm run build
npm link
```

### 3. Environment Variables

Configure your IBM watsonx environment variables. Here are examples using PowerShell:

```powershell
$env:IBM_WATSONX_API_KEY="your-api-key"
$env:IBM_WATSONX_PROJECT_ID="your-project-id"
$env:IBM_WATSONX_MODEL="ibm/granite-3-8b-instruct"
```

## How to Set Up a Target Project

Before running TraceQA, you need to prepare your target project:

1. **Start your application locally.** TraceQA executes real HTTP requests against a running server.
2. **Create an `acceptance.md` file.** Place this in your project root containing the acceptance criteria.
3. **Optional: Add a `traceqa.config.json`.** Place this in your project root to configure paths, OpenAPI specs, or framework details.

### The `acceptance.md` Format

Acceptance criteria should be measurable and not overloaded. Use identifiers like `AC-1`, `AC-2`, etc.

**Example `acceptance.md`:**
```markdown
AC-1: The system should return a 200 OK status when fetching the health endpoint.
AC-2: The system should return a 400 Bad Request when attempting to create a user with a missing email field.
AC-3: The system should successfully create a user and return a 201 status code when valid data is provided.
```

### The `traceqa.config.json` Format

You can optionally place a `traceqa.config.json` in your target project directory. Supported fields:

```json
{
  "baseUrl": "http://localhost:3000",
  "healthUrl": "http://localhost:3000/health",
  "openapi": "./openapi.json",
  "language": "typescript",
  "projectType": "express",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "startCommand": "npm start",
  "autoInstall": false,
  "autoBuild": false,
  "autoStart": false,
  "testType": "api",
  "outputDir": "./traceqa-proof",
  "timeout": 30000,
  "retries": 1
}
```

## CLI Usage

The primary workflow uses the `run` command:

```bash
traceqa run --acceptance-path acceptance.md --base-url http://localhost:3000 --yes
```

### Supported Flags

- `--acceptance-path <path>`: (Required) Path to your acceptance criteria file.
- `--base-url <url>`: (Required) Base URL of the running application to test.
- `-y, --yes`: Auto-approve execution without interactive confirmation.
- `-o, --output-dir <path>`: Directory for proof reports (default: `traceqa-proof`).
- `--generated-dir <path>`: Directory for generated test artifacts (default: `traceqa-generated`).
- `--proof-dir <path>`: Directory for proof reports (default: `traceqa-proof`).
- `--debug-dir <path>`: Directory for debug output (default: `traceqa-debug`).
- `--verbose`: Enable verbose logging.
- `--debug`: Enable debug mode.

*(A legacy `traceqa test` interactive mode is also available for backward compatibility).*

## Outputs

Generated artifacts are written to these locations by default:

- `traceqa-generated/`: Contains the generated QA tasks and executable HTTP test scripts.
- `traceqa-proof/`: Contains the execution proofs (`report.json`, `report.md`) and the traceability matrix (`trace-matrix.json`).
- `traceqa-debug/`: Contains verbose debug outputs and logs for troubleshooting.

## Result Types

TraceQA classifies test outcomes into strict categories to maintain high confidence:

- `passed`: The test executed successfully and met the acceptance criteria.
- `uncertain`: The criteria was too vague, the route couldn't be discovered with confidence, or the necessary request body could not be safely generated.
- `manual`: The criterion explicitly requires human intervention (e.g., visual layout checks).
- `application_failure`: The test executed but the target application returned an unexpected response (i.e., a bug in the target app).
- `traceqa_generation_issue`: TraceQA failed to generate a valid test or parsed invalid output from the AI.
- `infrastructure_failure`: The test failed to execute due to a network error, missing application server, or unavailable dependency.

## Limitations

- **Prototype Status:** This is a hackathon prototype. It does not work perfectly on every codebase.
- **Not Every AC is Executable:** Some acceptance criteria will naturally be un-testable via automated HTTP requests.
- **Stateful Flows:** Complex, multi-step stateful flows (like login -> fetch token -> mutate -> verify) may result in `uncertain` outcomes.
- **Dependency on Evidence:** Route discovery and payload generation rely heavily on project signals. Poor schema or OpenAPI quality will reduce test execution rates.
- **AI Constraints:** IBM watsonx output may occasionally truncate on extremely large payloads.
- **Not a QA Replacement:** TraceQA assists developers and QA engineers by bootstrapping tests and providing traceability; it does not replace comprehensive manual testing or dedicated QA roles.

## Future Improvements

- Better request schema and body generation for complex nested objects.
- Stronger route selection algorithms for ambiguous endpoints.
- Improved setup, teardown, and token capture for stateful and authenticated tests.
- Native CI/CD pipeline integration.
- A UI dashboard for reviewing trace matrices and execution reports.
- Extended framework support for route discovery (e.g., more Python, Go, and Java frameworks).
