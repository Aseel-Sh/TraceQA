# TraceQA

**Intelligent CLI tool for developer-driven QA testing**

TraceQA is an AI-powered command-line tool that helps developers perform comprehensive QA testing by leveraging IBM watsonx.ai and the Model Context Protocol (MCP). It provides an interactive, conversational interface for testing applications, generating test cases, and identifying potential issues.

## Features

- 🤖 **AI-Powered Testing**: Leverage IBM watsonx.ai for intelligent test generation and execution
- 💬 **Interactive CLI**: Conversational interface using Clack prompts
- 🔌 **MCP Integration**: Connect to external tools and services via Model Context Protocol
- 📊 **Test Reporting**: Generate comprehensive test reports
- 🎯 **Context-Aware**: Understands your codebase and testing requirements
- 🚀 **Developer-Friendly**: Designed for seamless integration into development workflows

## Prerequisites

- Node.js >= 18.0.0
- IBM watsonx.ai API key and Project ID (get them at https://cloud.ibm.com/)

## Installation

### From Source

1. Clone the repository:
```bash
git clone <repository-url>
cd TraceQA
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your IBM watsonx.ai credentials:
```
IBM_WATSONX_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here
```

5. Build the project:
```bash
npm run build
```

6. Link the CLI globally (optional):
```bash
npm link
```

## Quick Start

### Development Mode

Run the CLI in development mode with hot reload:
```bash
npm run dev
```

### Production Mode

After building, run the CLI:
```bash
npm start
# or if linked globally
traceqa
```

### Basic Usage

1. **Start a QA session**:
```bash
traceqa start
```

2. **Initialize project configuration**:
```bash
traceqa init
```

3. **Run tests**:
```bash
traceqa test
```

4. **Generate test cases**:
```bash
traceqa generate
```

## Project Structure

```
TraceQA/
├── src/
│   ├── cli/          # CLI interface and commands
│   ├── core/         # Core application logic
│   ├── agent/        # AI agent implementation
│   ├── testing/      # Testing utilities and runners
│   ├── mcp/          # Model Context Protocol integration
│   ├── utils/        # Utility functions
│   └── types/        # TypeScript type definitions
├── dist/             # Compiled output (generated)
├── .traceqa/         # Local configuration (generated)
└── test-reports/     # Test reports (generated)
```

## Development

### Available Scripts

- `npm run build` - Build the project for production
- `npm run dev` - Run in development mode with hot reload
- `npm start` - Run the built CLI
- `npm run typecheck` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

### Building

The project uses `tsup` for fast, zero-config bundling:
```bash
npm run build
```

### Type Checking

Run TypeScript type checking without emitting files:
```bash
npm run typecheck
```

## Configuration

TraceQA can be configured through:

1. **Environment Variables** (`.env` file):
   - `IBM_WATSONX_API_KEY` - Your IBM watsonx.ai API key (required)
   - `IBM_WATSONX_PROJECT_ID` - Your IBM watsonx.ai Project ID (required)
   - `IBM_WATSONX_URL` - IBM watsonx.ai service URL (optional, defaults to https://us-south.ml.cloud.ibm.com)
   - `IBM_WATSONX_MODEL` - Model to use (optional, defaults to ibm/granite-13b-chat-v2)
   - `MCP_SERVER_URL` - MCP server URL (optional)

2. **Project Configuration** (`.traceqa/config.json`):
   - Generated after running `traceqa init`
   - Contains project-specific settings

## Documentation

- [Technical Specification](./TECHNICAL_SPEC.md) - Detailed technical design and architecture
- [Progress Tracking](./PROGRESS.md) - Development progress and milestones

## Dependencies

### Core Dependencies
- `@ibm-cloud/watsonx-ai` - IBM watsonx.ai SDK
- `@clack/prompts` - Beautiful CLI prompts
- `@modelcontextprotocol/sdk` - Model Context Protocol SDK
- `commander` - CLI framework
- `chalk` - Terminal styling
- `dotenv` - Environment variable management
- `execa` - Process execution
- `fs-extra` - Enhanced file system operations
- `glob` - File pattern matching
- `axios` - HTTP client

### Development Dependencies
- `typescript` - TypeScript compiler
- `tsup` - Build tool
- `tsx` - TypeScript execution
- `@types/node` - Node.js type definitions

## Contributing

Contributions are welcome! Please read the technical specification and progress documents before contributing.

## License

MIT

## Support

For issues, questions, or contributions, please refer to the project documentation or open an issue in the repository.

---

**Note**: This project is currently in active development. Features and APIs may change.