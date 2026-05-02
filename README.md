# TraceQA

TraceQA converts acceptance criteria into executable tests, validates generated test data against available signals (OpenAPI, source-code validation snippets, config examples), executes validated tests, and produces evidence-first reports.

Key points:
- IBM watsonx.ai is used as a semantic mapper to propose tests; TraceQA never executes raw AI output without validation.
- Test-data inference priority: OpenAPI -> route source snippets/validation -> config sample data -> IBM reasoning -> conservative placeholders.
- Tests with low confidence in request data or setup are marked `uncertain` and not executed.

Quick commands:

```bash
# Typecheck and build
npm run typecheck
npm run build

# Run tests (example)
traceqa test --acceptance-path acceptance.md --base-url http://localhost:3000 --yes
```

Artifacts:
- Generated tests: `traceqa-generated/generated-http-tests.json`
- Execution proof: `traceqa-proof/report.json` and `traceqa-proof/report.md`

Environment variables (IBM watsonx):
- `IBM_WATSONX_API_KEY` (required to use IBM)
- `IBM_WATSONX_MODEL` (optional)

Limitations:
- TraceQA uses lightweight static hints and IBM reasoning — it does not perform deep static analysis or runtime introspection of every project.
- When constraints cannot be confidently inferred, tests are marked `uncertain` to avoid false application-failure reports.

For full developer usage and options, see the `src/cli.ts` entrypoint.
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