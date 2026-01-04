/**
 * Cloudflare Workers Environment Bindings
 *
 * This interface defines all the bindings available to your MCP server,
 * including authentication credentials and Cloudflare resources.
 *
 * TODO: Replace {{SERVER_ID}} placeholders and add your custom bindings
 */
export interface Env {
  // ========================================================================
  // REQUIRED: OAuth and Authentication Bindings
  // ========================================================================

  /** KV namespace for storing OAuth tokens and session data */
  OAUTH_KV: KVNamespace;

  /** Durable Object namespace for MCP server instances (required by McpAgent) */
  MCP_OBJECT: DurableObjectNamespace;

  /** D1 Database for user and API key management (shared mcp-oauth database) */
  DB: D1Database;

  /** WorkOS Client ID (public, used to initiate OAuth flows) */
  WORKOS_CLIENT_ID: string;

  /** WorkOS API Key (sensitive, starts with sk_, used to initialize WorkOS SDK) */
  WORKOS_API_KEY: string;

  /**
   * KV namespace for centralized custom login session storage (MANDATORY)
   *
   * CRITICAL: This is REQUIRED for centralized authentication at panel.wtyczki.ai
   * Sessions are shared across all MCP servers for SSO functionality.
   */
  USER_SESSIONS: KVNamespace;

  // ========================================================================
  // REQUIRED: MCP Apps (SEP-1865) Bindings
  // ========================================================================

  /**
   * Cloudflare Assets Binding for MCP Apps
   *
   * Used to serve built HTML widgets from web/dist/widgets directory.
   * Required for SEP-1865 MCP Apps protocol support.
   *
   * @see https://developers.cloudflare.com/workers/static-assets/binding/
   */
  ASSETS: Fetcher;

  // ========================================================================
  // OPTIONAL: Common Cloudflare Bindings
  // ========================================================================
  // Uncomment and configure these as needed for your server

  /**
   * Workers AI for LLM inference
   * Uncomment in wrangler.jsonc: "ai": { "binding": "AI" }
   */
  // AI?: Ai;

  /**
   * R2 storage bucket for file storage
   * Uncomment in wrangler.jsonc: "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "..." }]
   */
  // BUCKET?: R2Bucket;

  /**
   * Cache KV for API response caching
   */
  // CACHE_KV?: KVNamespace;

  /**
   * Browser Rendering for headless browser operations
   * Uncomment in wrangler.jsonc: "browser": { "binding": "BROWSER" }
   */
  // BROWSER?: BrowserWorker;

  /**
   * AI Gateway configuration for rate limiting and logging AI calls
   */
  AI_GATEWAY_ID?: string;
  // AI_GATEWAY_TOKEN?: string;  // Optional: for authenticated gateway access

  // ========================================================================
  // TODO: Add Your Custom Bindings
  // ========================================================================
  // Examples:
  // EXTERNAL_API_KEY?: string;        // Third-party API credentials
  // CUSTOM_KV?: KVNamespace;          // Additional KV namespace
  // ADDITIONAL_DB?: D1Database;       // Additional D1 database
}

// ========================================================================
// Response Format Types
// ========================================================================

/**
 * Response format options for tools that return large datasets
 *
 * Use this enum when you want to offer users a choice between
 * concise and detailed output formats.
 */
export enum ResponseFormat {
  /**
   * Concise format: Essential data only, ~1/3 tokens
   * Best for: Quick summaries, cost-sensitive use cases
   */
  CONCISE = "concise",

  /**
   * Detailed format: Full data including IDs for programmatic use
   * Best for: Data export, debugging, integration with other tools
   */
  DETAILED = "detailed"
}

// ========================================================================
// State Types (Optional)
// ========================================================================
// If your server needs to maintain state between tool calls, define
// your State interface here and use it in the McpAgent generic.
//
// Example:
// export interface State {
//   lastQuery?: string;
//   cachedResults?: Record<string, unknown>;
//   userPreferences?: Record<string, unknown>;
// }
//
// Then in server.ts:
// export class YourMcp extends McpAgent<Env, State, Props> {
//   initialState: State = { lastQuery: undefined, cachedResults: {} };
//   ...
// }

// ========================================================================
// MCP Apps (SEP-1865) Notes
// ========================================================================
// Reference: mcp-apps/MCP_APPS_BEST_PRACTICES.md
//
// MCP Apps use the @modelcontextprotocol/ext-apps SDK for widget development.
// Types are provided by the SDK - import from "@modelcontextprotocol/ext-apps"
// when implementing MCP Apps widgets.
//
// For widget-specific types (props passed to React components), define them
// in web/src/types.ts or alongside your widget components.