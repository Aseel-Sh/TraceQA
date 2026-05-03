# TraceQA

TraceQA converts acceptance criteria into executable tests, validates generated test data against available project signals, runs the tests, and produces evidence-first reports.

## What it does

- Parses acceptance criteria from Markdown or plain text.
- Discovers API routes from the application codebase.
- Generates QA task plans and HTTP tests.
- Uses IBM watsonx.ai when configured, with conservative fallback behavior when confidence is low.
- Marks ambiguous or unsafe tests as `uncertain` instead of guessing.
- Generates proof artifacts and traceability reports.
- Supports a demo mode for local testing without IBM credentials.

## Current features

- Acceptance criteria parsing.
- Route discovery and route-to-criterion matching.
- AI-assisted test planning with IBM watsonx.ai.
- Deterministic fallback generation when AI output is truncated or not trustworthy.
- Conservative request body generation and validation.
- Uncertain/manual/skipped handling in execution and reporting.
- JSON and Markdown report generation.
- Trace matrix generation for acceptance-to-test mapping.
- Demo runner for mock executions.

## Requirements

- Node.js 18 or newer.
- npm.
- IBM watsonx.ai credentials for AI-powered runs.

## Install

```bash
npm install
```

## Build and typecheck

```bash
npm run typecheck
npm run build
```

## Run

### CLI usage

Install locally as a linked command:

```bash
npm link
```

Run the current workflow against an acceptance criteria file and a base URL:

```bash
traceqa run --acceptance-path acceptance.md --base-url http://localhost:3000 --yes
```

Legacy interactive mode is also available:

```bash
traceqa test --criteria acceptance.md --base-url http://localhost:3000
```

### Demo mode

Run the demo with AI if IBM credentials are configured:

```bash
npm run demo
```

Run the deterministic mock demo:

```bash
npm run demo:mock
```

### Smoke test

Run the IBM smoke test:

```bash
npm run smoke:ibm
```

## Scripts

- `npm run typecheck` - TypeScript typecheck only.
- `npm run build` - Build the CLI with tsup.
- `npm run dev` - Run the CLI from source with tsx.
- `npm run start` - Run the compiled CLI from `dist/`.
- `npm run demo` - Run the demo runner.
- `npm run demo:mock` - Run the demo runner in mock mode.
- `npm run smoke:ibm` - Run the IBM smoke test.

## Configuration

Environment variables used for IBM watsonx.ai:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `IBM_WATSONX_API_KEY` | Yes for AI runs | - | IBM watsonx API key |
| `IBM_WATSONX_PROJECT_ID` | Yes for AI runs | - | IBM watsonx project ID |
| `IBM_WATSONX_URL` | No | `https://us-south.ml.cloud.ibm.com` | IBM watsonx service URL |
| `IBM_WATSONX_MODEL` | No | `ibm/granite-3-3-8b-instruct` | Model to use |
| `IBM_WATSONX_MAX_TOKENS` | No | `4096` | Maximum tokens per request |
| `IBM_WATSONX_TEMPERATURE` | No | `0.7` | Model temperature |
| `TRACEQA_LOG_LEVEL` | No | `info` | Log level (`debug`, `info`, `warn`, `error`) |

## Outputs

Generated artifacts are written to these locations by default:

- `traceqa-generated/` - Generated QA tasks and HTTP tests.
- `traceqa-proof/report.json` - Execution proof in JSON format.
- `traceqa-proof/report.md` - Human-readable execution report.
- `traceqa-proof/trace-matrix.json` - Acceptance-to-test trace matrix.
- `traceqa-debug/` - Debug output.

## Limitations

- AI-powered runs require valid IBM watsonx.ai credentials.
- Route discovery is heuristic and depends on available project signals.
- Tests with low confidence are marked `uncertain` rather than guessed.
- API execution requires a reachable base URL.
- Browser-oriented checks depend on the project setup and available automation support.
- The tool favors safety and traceability over aggressive guesswork, so some criteria may produce uncertain or manual tests.

## Project structure

```text
src/
  cli/           CLI entrypoint and prompts
  agent/         IBM watsonx integration and agent logic
  analysis/      Ambiguity and git analysis
  config/        Configuration loading
  core/          Build and process orchestration
  discovery/     Route discovery
  generators/    QA task and HTTP test generation
  mcp/           MCP client integrations
  parsers/       Acceptance criteria parsing
  reporting/     Report generation
  testing/       Execution and classification logic
  utils/         Shared utilities
  validation/    Route, body, and data validation
```

## Notes

- The `run` command is the primary workflow.
- The `test` command remains available for the legacy interactive flow.
- Demo mode is useful when you want to validate the output format without connecting to IBM.
