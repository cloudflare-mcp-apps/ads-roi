/**
 * Server Instructions for {{SERVER_NAME}} MCP
 *
 * Injected into LLM system prompt during MCP initialization.
 * Provides tool usage context, performance expectations, and constraints.
 *
 * Pattern: Purpose -> Capabilities -> Usage -> Performance -> Constraints
 *
 * Best Practices:
 * 1. Keep instructions concise (under 500 tokens)
 * 2. Focus on WHAT the tools do, not HOW they work internally
 * 3. Include concrete examples for complex use cases
 * 4. Mention interactive UI capabilities (SEP-1865)
 * 5. Document error handling and edge cases
 */

export const SERVER_INSTRUCTIONS = `
{{SERVER_NAME}} - TODO: Add brief one-line description of what this server does

## Available Tools

### example-tool
TODO: Describe what this tool does and when to use it.
- Input: a string to process
- Output: processed result with timestamp
- Widget: displays results in an interactive UI

## Interactive UI (MCP Apps)

This server includes SEP-1865 MCP Apps support with interactive widgets:
- Widgets load automatically when tools return results
- Dark mode is inherited from the host client
- Widgets have a fixed height container (600px) to prevent layout issues
- Data flows: Tool Result -> postMessage -> Widget State

## Usage Patterns

1. **Basic Usage**: Call the example-tool with an input string
2. **Widget Interaction**: Results are displayed in an embedded UI
3. **Error Recovery**: If a widget fails to load, the tool can be re-invoked

## Performance Expectations

- Widget load time: < 2 seconds
- API response time: TODO: specify expected latency
- Cache behavior: TODO: specify if results are cached

## Constraints and Limitations

- TODO: List any rate limits
- TODO: List any data size limits
- TODO: List any authentication requirements
- TODO: List any geographic or temporal restrictions

## Error Handling

Common errors and their solutions:
- "User ID not found": User authentication expired, re-authenticate
- "ASSETS binding not available": Deployment configuration issue
- TODO: Add server-specific error scenarios

## Important Notes

- All tool calls are authenticated via OAuth or API key
- Widget state is ephemeral (not persisted between sessions)
- TODO: Add any other critical notes for LLM users
`.trim();

export default SERVER_INSTRUCTIONS;