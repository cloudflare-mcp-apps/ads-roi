/**
 * Input Schemas for {{SERVER_NAME}} MCP Tools
 *
 * Zod validation schemas for tool input parameters.
 * Use Zod 4 syntax with .meta() for descriptions.
 *
 * @module schemas/inputs
 */

import * as z from "zod/v4";

/**
 * Input schema for example_tool
 *
 * TODO: Replace with your tool's input parameters
 */
export const ExampleToolInput = z.object({
  query: z.string().meta({
    description: "The search query or input value"
  }),
  format: z.enum(["concise", "detailed"]).default("concise").meta({
    description: "Response format: concise (default) or detailed"
  }),
});

/**
 * Type inference from schema
 */
export type ExampleToolParams = z.infer<typeof ExampleToolInput>;

// TODO: Add more input schemas for your tools
// export const MyToolInput = z.object({...});
// export type MyToolParams = z.infer<typeof MyToolInput>;
