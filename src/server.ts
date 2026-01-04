/**
 * Ads ROI Simulator MCP Server
 *
 * McpAgent extension with OAuth authentication and SEP-1865 MCP Apps support.
 *
 * This file contains the main MCP server class with:
 * - Tool registration (with UI linkage)
 * - Resource registration (UI widgets)
 * - Prompt registration (optional)
 *
 * Architecture:
 * - Extends McpAgent from 'agents/mcp' (Cloudflare Agents SDK)
 * - Uses Durable Objects for session state
 * - Integrates with WorkOS for authentication via Props
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
} from "@modelcontextprotocol/ext-apps/server";
import type { Env } from "./types";
import type { Props } from "./auth/props";
import { loadHtml } from "./helpers/assets";
import { UI_RESOURCES, UI_MIME_TYPE } from "./resources/ui-resources";
import { SERVER_INSTRUCTIONS } from "./server-instructions";
import { TOOL_METADATA, getToolDescription } from "./tools/descriptions";
import { logger } from "./shared/logger";

/**
 * Ads ROI Simulator MCP Server
 *
 * Generic type parameters:
 * - Env: Cloudflare Workers environment bindings (KV, D1, ASSETS, etc.)
 * - unknown: No state management (stateless server) - change to State type if needed
 * - Props: Authenticated user context from WorkOS (user, tokens, permissions, userId)
 *
 * If you need state management:
 * 1. Define a State interface in types.ts
 * 2. Change 'unknown' to 'State' in the generic
 * 3. Add: initialState: State = { ... };
 * 4. Use this.state and this.setState() in your tools
 */
export class AdsRoiMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer(
    {
      name: "Ads ROI Simulator MCP",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: { listChanged: true },
        resources: { listChanged: true }  // SEP-1865: Enable resource discovery
      },
      instructions: SERVER_INSTRUCTIONS
    }
  );

  // NO initialState - this is a stateless server
  // TODO: If you need state, add:
  // initialState: State = { yourStateHere: "value" };
  // Then change generic from 'unknown' to your State type

  async init() {
    // ========================================================================
    // OPTIONAL: Initialize API client or external services
    // ========================================================================
    // const apiClient = new YourApiClient(this.env);

    // ========================================================================
    // SEP-1865 MCP Apps: Two-Part Registration Pattern
    // ========================================================================
    // CRITICAL: MCP Apps require registering TWO separate entities:
    // PART 1: Resource (UI HTML template) - Registered below
    // PART 2: Tool (with _meta linkage) - Registered further down
    //
    // We always register resources - hosts that don't support UI will ignore them

    const widgetResource = UI_RESOURCES.widget;

    // ========================================================================
    // PART 1: Register Resource (Predeclared UI Template)
    // ========================================================================
    // Parameter order: (server, uri, uri, options, handler)
    // For predeclared resources, both name and uri parameters use the same URI
    registerAppResource(
      this.server,
      widgetResource.uri,           // uri (name parameter)
      widgetResource.uri,           // uri (uri parameter)
      {
        description: widgetResource.description,
        mimeType: RESOURCE_MIME_TYPE,  // "text/html;profile=mcp-app" from SDK
        _meta: { ui: widgetResource._meta.ui! }
      },
      async () => {
        // Load built widget from Cloudflare Assets binding
        // Widget is built by Vite from web/widgets/widget.html
        // Dynamic data comes via ui/notifications/tool-result postMessage
        const templateHTML = await loadHtml(this.env.ASSETS, "/widget.html");

        return {
          contents: [{
            uri: widgetResource.uri,
            mimeType: RESOURCE_MIME_TYPE,
            text: templateHTML,
            _meta: widgetResource._meta as Record<string, unknown>
          }]
        };
      }
    );

    logger.info({
      event: 'ui_resource_registered',
      uri: widgetResource.uri,
      name: widgetResource.name,
    });

    // ========================================================================
    // PART 2: Register Tool with UI Linkage
    // ========================================================================
    // CRITICAL: _meta[RESOURCE_URI_META_KEY] links this tool to PART 1 resource
    // This linkage tells the host which UI to render when tool returns results
    //
    // TODO: Replace with your actual tool implementation
    registerAppTool(
      this.server,
      "example-tool",
      {
        title: TOOL_METADATA["example-tool"].title,
        description: getToolDescription("example-tool"),
        inputSchema: {
          input: z.string()
            .min(1)
            .meta({ description: "Input string to process. TODO: Replace with your actual input schema." }),
        },
        annotations: {
          // MCP 2025-11 ToolAnnotations for client safety hints
          readOnlyHint: true,       // Tool only reads data, doesn't modify anything
          destructiveHint: false,   // No destructive side effects
          idempotentHint: true,     // Same input returns same result
          openWorldHint: false      // Does NOT interact with external services
        },
        // SEP-1865: Link tool to predeclared UI resource (PART 1)
        // Host will render this resource when tool returns results
        // Always include - hosts that don't support UI will ignore it
        _meta: {
          [RESOURCE_URI_META_KEY]: widgetResource.uri  // Links to PART 1
        },
      },
      async (args: { input: string }) => {
        // Verify user is authenticated
        if (!this.props?.userId) {
          throw new Error("User ID not found in authentication context");
        }

        const { input } = args;

        try {
          // TODO: Replace with your actual tool logic
          const result = {
            message: `Processed: ${input}`,
            timestamp: new Date().toISOString(),
            userId: this.props.userId,
          };

          // Return both text content (for non-UI hosts) and structured content (for UI hosts)
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(result, null, 2)
            }],
            // structuredContent is passed to the widget via postMessage
            structuredContent: result as unknown as Record<string, unknown>
          };
        } catch (error) {
          return {
            content: [{
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // ========================================================================
    // OPTIONAL: Register Prompts
    // ========================================================================
    // Prompts are templates that guide LLM behavior for specific use cases
    // Uncomment and customize if you want to expose prompts to clients
    //
    // this.server.registerPrompt(
    //   "example-prompt",
    //   {
    //     title: "Example Prompt",
    //     description: "A template for common user requests",
    //     argsSchema: {
    //       topic: z.string().meta({ description: "Topic to discuss" })
    //     }
    //   },
    //   async ({ topic }) => {
    //     return {
    //       messages: [
    //         {
    //           role: "user",
    //           content: {
    //             type: "text",
    //             text: `Please use the 'example-tool' to process: ${topic}`
    //           }
    //         }
    //       ]
    //     };
    //   }
    // );

    logger.info({ event: 'server_started', auth_mode: 'dual' });
  }
}