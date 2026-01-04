/**
 * Ads ROI Simulator MCP Server
 *
 * McpAgent extension with OAuth authentication and SEP-1865 MCP Apps support.
 *
 * This file contains the main MCP server class with:
 * - Tool registration (with UI linkage)
 * - Resource registration (UI widgets)
 * - Prompt registration (slash commands)
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
        // Widget is built by Vite from web/widgets/dashboard.html
        // Dynamic data comes via ui/notifications/tool-result postMessage
        const templateHTML = await loadHtml(this.env.ASSETS, "/dashboard.html");

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
    registerAppTool(
      this.server,
      "calculate_campaign_roi",
      {
        title: TOOL_METADATA["calculate_campaign_roi"].title,
        description: getToolDescription("calculate_campaign_roi"),
        inputSchema: {
          monthlyBudget: z.number()
            .positive()
            .default(10000)
            .meta({ description: "Monthly advertising budget in dollars (e.g., 10000)" }),
          cpc: z.number()
            .positive()
            .default(2.5)
            .meta({ description: "Cost per click in dollars (e.g., 2.5)" }),
          conversionRatePercent: z.number()
            .min(0)
            .max(100)
            .default(5)
            .meta({ description: "Conversion rate as percentage 0-100 (e.g., 5 for 5%)" }),
          averageOrderValue: z.number()
            .positive()
            .default(100)
            .meta({ description: "Average order value in dollars (e.g., 100)" }),
        },
        annotations: {
          // MCP 2025-11 ToolAnnotations for client safety hints
          readOnlyHint: true,       // Tool only performs calculations, doesn't modify data
          destructiveHint: false,   // No destructive side effects
          idempotentHint: true,     // Same input always returns same result
          openWorldHint: false      // Pure calculation, no external API calls
        },
        // SEP-1865: Link tool to predeclared UI resource (PART 1)
        // Host will render this resource when tool returns results
        _meta: {
          [RESOURCE_URI_META_KEY]: widgetResource.uri  // Links to PART 1
        },
      },
      async (args: { monthlyBudget: number; cpc: number; conversionRatePercent: number; averageOrderValue: number }) => {
        // Verify user is authenticated
        if (!this.props?.userId) {
          throw new Error("User ID not found in authentication context");
        }

        const { monthlyBudget, cpc, conversionRatePercent, averageOrderValue } = args;

        try {
          // ========================================================================
          // ROI Calculation Business Logic
          // ========================================================================

          // Step 1: Calculate clicks from budget and CPC
          const clicks = Math.floor(monthlyBudget / cpc);

          // Step 2: Calculate conversions from clicks and conversion rate
          const conversions = Math.floor(clicks * (conversionRatePercent / 100));

          // Step 3: Calculate revenue from conversions and AOV
          const revenue = conversions * averageOrderValue;

          // Step 4: Calculate profit (revenue - budget)
          const profit = revenue - monthlyBudget;

          // Step 5: Calculate ROI percentage
          const roiPercent = (profit / monthlyBudget) * 100;

          // Step 6: Calculate break-even budget
          // Break-even when: revenue = budget
          // conversions * AOV = budget
          // (clicks * conversionRate) * AOV = budget
          // (budget / cpc * conversionRate) * AOV = budget
          // Solving for budget: break-even = (cpc) / (conversionRate * AOV)
          const conversionRateDecimal = conversionRatePercent / 100;
          const breakEvenBudget = conversionRateDecimal > 0 && averageOrderValue > 0
            ? Math.ceil(cpc / (conversionRateDecimal * averageOrderValue))
            : 0;

          // Step 7: Generate chart data for profit curve
          // Create 10 budget scenarios from 0 to 2x current budget
          const maxBudget = monthlyBudget * 2;
          const budgetStep = maxBudget / 9; // 10 data points
          const budgetScenarios: number[] = [];
          const profitCurve: number[] = [];

          for (let i = 0; i < 10; i++) {
            const scenarioBudget = Math.floor(budgetStep * i);
            budgetScenarios.push(scenarioBudget);

            // Calculate profit for this budget scenario
            const scenarioClicks = Math.floor(scenarioBudget / cpc);
            const scenarioConversions = Math.floor(scenarioClicks * conversionRateDecimal);
            const scenarioRevenue = scenarioConversions * averageOrderValue;
            const scenarioProfit = scenarioRevenue - scenarioBudget;

            profitCurve.push(scenarioProfit);
          }

          // Step 8: Build result structure matching widget's RoiResult interface
          const result = {
            inputs: {
              monthlyBudget,
              cpc,
              conversionRatePercent,
              averageOrderValue,
            },
            metrics: {
              clicks,
              conversions,
              revenue,
              profit,
              roiPercent,
              breakEvenBudget,
            },
            chartData: {
              budgetScenarios,
              profitCurve,
            },
          };

          // Log successful calculation
          console.log('ROI calculated', {
            userId: this.props.userId,
            budget: monthlyBudget,
            profit,
            roiPercent: roiPercent.toFixed(2),
          });

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
          // Log calculation error
          console.error('ROI calculation error', {
            error: String(error),
            userId: this.props.userId,
          });

          return {
            content: [{
              type: "text" as const,
              text: `Error calculating ROI: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // ========================================================================
    // Register Prompts (SDK 1.20+)
    // ========================================================================
    // Prompts transform tools into reusable workflow templates (like slash commands)
    // Pattern: Core function first, then enhanced workflows

    // Prompt 1: Core ROI Calculation (simple, direct tool mapping)
    this.server.registerPrompt(
      "calculate-roi",
      {
        title: "Calculate Campaign ROI",
        description: "Calculate advertising campaign ROI with custom budget, CPC, conversion rate, and AOV parameters.",
        argsSchema: {
          budget: z.number()
            .positive()
            .default(10000)
            .describe("Monthly advertising budget in dollars (e.g., 10000, 5000, 15000)"),
          cpc: z.number()
            .positive()
            .default(2.5)
            .describe("Cost per click in dollars (e.g., 2.5, 1.75, 3.00)"),
          conversion: z.number()
            .min(0)
            .max(100)
            .default(5)
            .describe("Conversion rate as percentage 0-100 (e.g., 5 for 5%, 3.5 for 3.5%)"),
          aov: z.number()
            .positive()
            .default(100)
            .describe("Average order value in dollars (e.g., 100, 150, 75)")
        }
      },
      async ({ budget, cpc, conversion, aov }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please use the 'calculate_campaign_roi' tool to calculate advertising ROI with these parameters:
- monthlyBudget: ${budget}
- cpc: ${cpc}
- conversionRatePercent: ${conversion}
- averageOrderValue: ${aov}`
              }
            }
          ]
        };
      }
    );

    logger.info({ event: 'server_started', auth_mode: 'dual' });
  }
}