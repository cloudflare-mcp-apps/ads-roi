/**
 * Tool Descriptions and Metadata
 *
 * Centralized metadata for all MCP server tools.
 * Follows the 4-part description pattern from TOOL_DESCRIPTION_BEST_PRACTICES.md
 *
 * Pattern: Purpose -> Returns -> Use Case -> Constraints
 *
 * Security Notes:
 * - NO API/service names in descriptions (only functional capabilities)
 * - NO implementation details (e.g., "fast and cheap", "bounding box")
 *
 * @module tools/descriptions
 */

/**
 * Metadata structure for a single tool
 */
export interface ToolMetadata {
  /** Display name for UI and tool listings */
  title: string;

  /** 4-part description pattern */
  description: {
    /** Part 1: Action verb + what it does (1-2 sentences) */
    part1_purpose: string;

    /** Part 2: Explicit data fields returned (1 sentence) */
    part2_returns: string;

    /** Part 3: When/why to use this tool (1 sentence) */
    part3_useCase: string;

    /** Part 4: Limitations, edge cases, constraints (1-3 sentences) */
    part4_constraints: string;
  };

  /** Use case examples for documentation and testing */
  examples: {
    /** Short scenario name */
    scenario: string;

    /** Detailed description of the use case */
    description: string;
  }[];
}

/**
 * Tool metadata registry
 *
 * TODO: Replace example tool with your actual tools
 *
 * Contains complete metadata for all tools including descriptions
 * and use case examples.
 */
export const TOOL_METADATA = {
  /**
   * Calculate Campaign ROI
   *
   * Calculates advertising campaign return on investment with interactive parameter adjustment.
   * Provides profit, revenue, ROI percentage, and break-even analysis for marketing budget planning.
   */
  "calculate_campaign_roi": {
    title: "Calculate Campaign ROI",

    description: {
      part1_purpose: "Calculates advertising campaign return on investment based on monthly budget, cost per click, conversion rate, and average order value.",

      part2_returns: "Returns metrics (clicks, conversions, revenue, profit, ROI percentage, break-even budget) and chart data (budget scenarios, profit curve) for visualization.",

      part3_useCase: "Use when planning advertising budgets, optimizing campaign parameters, or analyzing profitability scenarios across different spending levels.",

      part4_constraints: "Assumes linear click delivery and constant conversion rates. Real campaigns may have diminishing returns at higher budgets. All monetary values in USD."
    },

    examples: [
      {
        scenario: "Small business budget planning",
        description: "Calculate ROI for $5,000/month budget with $2.50 CPC, 3% conversion rate, $75 AOV"
      },
      {
        scenario: "Break-even analysis",
        description: "Determine minimum budget needed to achieve profitability with given campaign parameters"
      },
      {
        scenario: "Parameter optimization",
        description: "Adjust sliders to see real-time impact of CPC and conversion rate changes on profit"
      }
    ]
  } as const satisfies ToolMetadata,

} as const;

/**
 * Type-safe tool name (for autocomplete and validation)
 */
export type ToolName = keyof typeof TOOL_METADATA;

/**
 * Generate full tool description from metadata
 *
 * Concatenates all 4 parts of the description pattern into a single string
 * suitable for the MCP tool registration `description` field.
 *
 * @param toolName - Name of the tool (type-safe)
 * @returns Full description string following 4-part pattern
 *
 * @example
 * ```typescript
 * const desc = getToolDescription("example-tool");
 * // Returns: "Performs an example operation... Returns the result... Use this when... Note: ..."
 * ```
 */
export function getToolDescription(toolName: ToolName): string {
  const meta = TOOL_METADATA[toolName];
  const { part1_purpose, part2_returns, part3_useCase, part4_constraints } = meta.description;

  return `${part1_purpose} ${part2_returns} ${part3_useCase} ${part4_constraints}`;
}

/**
 * Get all use case examples for a tool
 *
 * Retrieves documented use cases for testing and documentation purposes.
 *
 * @param toolName - Name of the tool (type-safe)
 * @returns Array of use case examples
 *
 * @example
 * ```typescript
 * const examples = getToolExamples("example-tool");
 * // Returns: [{ scenario: "Basic usage", description: "..." }, ...]
 * ```
 */
export function getToolExamples(toolName: ToolName): readonly { scenario: string; description: string }[] {
  return TOOL_METADATA[toolName].examples;
}