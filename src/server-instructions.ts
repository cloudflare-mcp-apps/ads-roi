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
Ads ROI Simulator MCP - Calculate advertising campaign ROI with interactive parameter adjustment

## Available Tools

### calculate_campaign_roi
Calculates advertising campaign return on investment based on monthly budget, cost per click (CPC), conversion rate, and average order value (AOV). Returns comprehensive metrics including profit, revenue, ROI percentage, break-even budget, and chart data for visualization.

**Inputs**:
- monthlyBudget: Monthly advertising budget in dollars (default: 10000)
- cpc: Cost per click in dollars (default: 2.5)
- conversionRatePercent: Conversion rate as percentage 0-100 (default: 5)
- averageOrderValue: Average order value in dollars (default: 100)

**Outputs**:
- inputs: Echo of provided parameters
- metrics: { clicks, conversions, revenue, profit, roiPercent, breakEvenBudget }
- chartData: { budgetScenarios[], profitCurve[] } for profit curve visualization

**Widget**: Interactive dashboard with:
- 4 real-time sliders (budget, CPC, conversion rate, AOV)
- Chart.js line chart showing profit curve across budget scenarios
- Metrics cards displaying clicks, conversions, revenue
- Highlighted profit and ROI percentage with color-coded status
- Break-even budget analysis

## Interactive UI (MCP Apps)

This server includes SEP-1865 MCP Apps support with interactive widgets:
- Widgets load automatically when tools return results
- Dark mode is inherited from the host client (light/dark theme switching)
- Widgets have a fixed height container (600px) to prevent layout issues
- Data flows: Tool Result -> postMessage -> Widget State
- Users can adjust sliders in the widget to trigger real-time recalculations

## Usage Patterns

1. **Initial Analysis**: Call calculate_campaign_roi with default values or user-provided parameters
   - Example: "Calculate ROI for a $10,000 monthly budget with $2.50 CPC, 5% conversion rate, and $100 AOV"

2. **Scenario Comparison**: Call the tool multiple times with different parameters to compare scenarios
   - Example: "What if I increase the budget to $15,000?"

3. **Break-Even Analysis**: Use the breakEvenBudget metric to determine minimum viable budget
   - Example: "What's the minimum budget needed to break even with these parameters?"

4. **Widget Interaction**: Users can adjust sliders in the embedded UI for real-time calculations
   - No need to call the tool manually - widget handles user interactions via app.callServerTool()

## Performance Expectations

- Widget load time: < 2 seconds (single HTML file with inlined assets)
- Tool execution time: < 500ms (pure mathematical calculations, no external API calls)
- Cache behavior: No caching - calculations are stateless and instant

## Constraints and Limitations

- **Calculation Model**: Assumes linear click delivery and constant conversion rates
  - Real campaigns may have diminishing returns at higher budgets
  - Conversion rates may vary based on ad quality, targeting, seasonality

- **Input Ranges**:
  - monthlyBudget: Must be > 0 (positive number)
  - cpc: Must be > 0 (positive number)
  - conversionRatePercent: Must be 0-100 (inclusive)
  - averageOrderValue: Must be > 0 (positive number)

- **Authentication**: All tool calls require valid OAuth session or API key
  - No rate limits on calculations (pure computation)
  - No data size limits (calculations return fixed-size objects)

## Error Handling

Common errors and their solutions:
- "User ID not found in authentication context": User authentication expired or invalid
  - Solution: Re-authenticate via OAuth flow or provide valid API key

- "ASSETS binding not available": Deployment configuration issue
  - Solution: Ensure wrangler.jsonc has ASSETS binding to ./web/dist/widgets

- Invalid parameter errors (e.g., negative budget):
  - Solution: Ensure all inputs meet validation constraints listed above

## Business Logic Notes

**ROI Calculation Formula**:
1. Clicks = Budget / CPC
2. Conversions = Clicks × (Conversion Rate / 100)
3. Revenue = Conversions × Average Order Value
4. Profit = Revenue - Budget
5. ROI % = (Profit / Budget) × 100

**Break-Even Budget**:
- Calculated as: CPC / (Conversion Rate × AOV)
- Represents minimum budget needed for profit = 0

**Chart Data**:
- Generates 10 budget scenarios from $0 to 2× current budget
- Profit curve shows how profit changes across budget levels
- Helps visualize optimal budget allocation

## Important Notes

- All tool calls are authenticated via OAuth 2.1 (WorkOS) or API key (wtyk_ prefix)
- Widget state is ephemeral (not persisted between sessions)
- Results assume USD currency for all monetary values
- Calculations are idempotent: same inputs always produce same outputs
- No external API calls made - all calculations performed server-side
`.trim();

export default SERVER_INSTRUCTIONS;