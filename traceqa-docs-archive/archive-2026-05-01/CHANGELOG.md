# Changelog

All notable changes to TraceQA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-05-01

### Added
- ✅ **Acceptance criteria parsing** - Parse AC from markdown files with multiple format support (AC-N, numbered lists, bullets)
- ✅ **Executable test generation** - Generate ready-to-run HTTP tests in `traceqa-generated/` directory
- ✅ **Route discovery** - Auto-discover API routes from 6+ frameworks (Express, FastAPI, ASP.NET, Spring Boot, Go, OpenAPI)
- ✅ **Enhanced approval gate** - Preview tests before execution with detailed summaries and test counts
- ✅ **POST/PUT/PATCH request body support** - Full support for request bodies with Content-Type headers
- ✅ **Multi-step test execution** - Handle complex test scenarios with multiple sequential steps
- ✅ **Requirement traceability matrix** - One-to-one mapping between acceptance criteria and tests
- ✅ **Duration formatting** - Human-readable test duration display (ms/s)
- ✅ **Content-Type headers** - Automatic JSON Content-Type header for POST/PUT/PATCH requests
- ✅ **11 new CLI flags** - Enhanced customization with `--base-url`, `--install-cmd`, `--start-cmd`, etc.
- ✅ **Config file support** - `traceqa.config.json` for project-level configuration
- ✅ **Language-agnostic design** - Support for Node.js, Python, .NET, Java, and Go projects

### Fixed
- 🐛 **Critical bug: POST tests executed as GET** - Fixed method extraction from IBM test plans
- 🐛 **Method extraction** - Properly parse HTTP methods from test case descriptions
- 🐛 **Request body handling** - Correctly handle request bodies for POST/PUT/PATCH methods
- 🐛 **Duration display** - Format test durations as human-readable strings (e.g., "1.2s", "450ms")
- 🐛 **Trace matrix mapping** - Ensure one-to-one mapping between acceptance criteria and tests
- 🐛 **TypeScript errors** - Fixed unused parameter warnings in route discovery

### Changed
- 🔄 **IBM watsonx.ai integration** - Replaced Claude with IBM watsonx.ai for test generation
- 🔄 **Language-agnostic architecture** - Removed Node.js-specific assumptions
- 🔄 **Test generation workflow** - Improved with acceptance criteria parsing and route discovery
- 🔄 **CLI interface** - Enhanced with more options and better user experience
- 🔄 **Report generation** - Improved traceability matrix with one-to-one AC-to-test mapping

### Deprecated
- ⚠️ **Claude integration** - Removed in favor of IBM watsonx.ai

## [1.0.0] - 2026-04-30

### Initial Release
- 🎉 **IBM watsonx.ai integration** - AI-powered test generation
- 🎉 **API test execution** - Execute HTTP tests against live APIs
- 🎉 **Report generation** - Generate JSON and Markdown reports
- 🎉 **Ambiguity detection** - Identify vague requirements
- 🎉 **Git analysis** - Analyze code changes for risk assessment
- 🎉 **Merge readiness scoring** - Calculate merge safety scores
- 🎉 **Demo mode** - Try TraceQA without IBM credentials
- 🎉 **CLI interface** - Command-line tool for developers

---

## Version History

- **2.0.0** - Major release with acceptance criteria parsing, route discovery, and executable test generation
- **1.0.0** - Initial release with IBM watsonx.ai integration and basic test execution