import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "../styles/globals.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Type definitions matching server response
interface RoiResult {
  inputs: {
    monthlyBudget: number;
    cpc: number;
    conversionRatePercent: number;
    averageOrderValue: number;
  };
  metrics: {
    clicks: number;
    conversions: number;
    revenue: number;
    profit: number;
    roiPercent: number;
    breakEvenBudget: number;
  };
  chartData: {
    budgetScenarios: number[];
    profitCurve: number[];
  };
}

function RoiCalculatorWidget() {
  const [data, setData] = useState<RoiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({
    monthlyBudget: 10000,
    cpc: 2.5,
    conversionRatePercent: 5,
    averageOrderValue: 100,
  });
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * PATTERN: useApp hook handles connection and provides app instance
   * CRITICAL: Register ALL handlers BEFORE connect() via onAppCreated
   */
  const { app, error } = useApp({
    appInfo: { name: "ads-roi-calculator", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      /**
       * HANDLER 1: ontoolresult - Receives server response AFTER processing
       * Fires when host calls tool (initial load)
       */
      app.ontoolresult = (result: CallToolResult) => {
        if (result.isError || !result.content?.[0]) {
          setLoading(false);
          return;
        }

        const text = result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("");

        try {
          const response: RoiResult = JSON.parse(text);
          setData(response);
          setInputs(response.inputs);
        } catch (e) {
          console.error("[ROI WIDGET] Failed to parse tool result:", e);
        } finally {
          setLoading(false);
        }
      };

      /**
       * HANDLER 2: onteardown - Cleanup handler (MANDATORY)
       * MUST return empty object {}
       */
      app.onteardown = async () => {
        // Clear pending debounce timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Destroy chart instance
        if (chartRef.current) {
          chartRef.current.destroy();
        }

        // Return empty object (REQUIRED by spec)
        return {};
      };

      /**
       * HANDLER 3: onhostcontextchanged - Theme switching
       */
      app.onhostcontextchanged = (context) => {
        if (context.theme) {
          document.documentElement.classList.toggle("dark", context.theme === "dark");

          // Update chart theme if exists
          if (chartRef.current && data) {
            chartRef.current.destroy();
            // Chart will be recreated in next render with new theme
          }
        }
      };

      /**
       * HANDLER 4: onerror - Error handling
       */
      app.onerror = (error) => {
        console.error("[ROI WIDGET ERROR]", error);
        setLoading(false);
      };

      // NO NEED to call connect() explicitly - useApp handles it
    },
  });

  /**
   * Client-initiated tool call for slider interactions
   * GOTCHA: ontoolresult does NOT fire for app.callServerTool()
   * Must handle response manually
   */
  const calculateRoi = useCallback(
    async (newInputs: typeof inputs) => {
      if (!app) return;

      setLoading(true);
      try {
        const result = await app.callServerTool({
          name: "calculate_campaign_roi",
          arguments: newInputs,
        });

        const text = result.content![0].text as string;
        const response: RoiResult = JSON.parse(text);
        setData(response);
      } catch (e) {
        console.error("[ROI WIDGET] Failed to calculate:", e);
      } finally {
        setLoading(false);
      }
    },
    [app]
  );

  // Handle slider changes with debounce for smooth UX
  const handleSliderChange = useCallback(
    (key: keyof typeof inputs, value: number) => {
      const newInputs = { ...inputs, [key]: value };
      setInputs(newInputs);

      // Clear previous timeout to prevent multiple calls
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout for debounced calculation
      debounceTimeoutRef.current = setTimeout(() => {
        calculateRoi(newInputs);
      }, 500); // Increased to 500ms for better debouncing
    },
    [inputs, calculateRoi]
  );

  // Theme-aware chart configuration
  const isDark = document.documentElement.classList.contains("dark");
  const chartData = data
    ? {
        labels: data.chartData.budgetScenarios.map((b) => `$${b.toLocaleString()}`),
        datasets: [
          {
            label: "Profit",
            data: data.chartData.profitCurve,
            borderColor: data.metrics.profit >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
            backgroundColor: data.metrics.profit >= 0
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Profit Curve Across Budget Scenarios",
        color: isDark ? "#f9fafb" : "#1f2937",
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Profit: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Monthly Budget",
          color: isDark ? "#f9fafb" : "#1f2937",
        },
        ticks: {
          color: isDark ? "#d1d5db" : "#6b7280",
        },
        grid: {
          color: isDark ? "#374151" : "#e5e7eb",
        },
      },
      y: {
        title: {
          display: true,
          text: "Profit ($)",
          color: isDark ? "#f9fafb" : "#1f2937",
        },
        ticks: {
          color: isDark ? "#d1d5db" : "#6b7280",
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
        grid: {
          color: isDark ? "#374151" : "#e5e7eb",
        },
      },
    },
  };

  if (error) {
    return (
      <div className="h-[650px] flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-red-600 dark:text-red-400">Error: {error.message}</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="h-[650px] flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-gray-600 dark:text-gray-400">Connecting...</div>
      </div>
    );
  }

  return (
    <div className="h-[650px] w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold">Advertising ROI Calculator</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Adjust parameters to see real-time profit projections
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">Calculating...</div>
          </div>
        ) : data ? (
          <>
            {/* Sliders */}
            <div className="space-y-2 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
              {/* Monthly Budget */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Monthly Budget: ${inputs.monthlyBudget.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={inputs.monthlyBudget}
                  onChange={(e) => handleSliderChange("monthlyBudget", Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Cost Per Click */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Cost Per Click: ${inputs.cpc.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={inputs.cpc}
                  onChange={(e) => handleSliderChange("cpc", Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Conversion Rate */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Conversion Rate: {inputs.conversionRatePercent.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={inputs.conversionRatePercent}
                  onChange={(e) =>
                    handleSliderChange("conversionRatePercent", Number(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Average Order Value */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Average Order Value: ${inputs.averageOrderValue.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={inputs.averageOrderValue}
                  onChange={(e) => handleSliderChange("averageOrderValue", Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Clicks</div>
                <div className="text-xl font-bold mt-0.5">
                  {data.metrics.clicks.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Conversions</div>
                <div className="text-xl font-bold mt-0.5">
                  {data.metrics.conversions.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400">Revenue</div>
                <div className="text-xl font-bold mt-0.5">
                  ${data.metrics.revenue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* ROI Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Profit</div>
                  <div
                    className={`text-2xl font-bold mt-0.5 ${
                      data.metrics.profit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    ${data.metrics.profit.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 dark:text-gray-400">ROI</div>
                  <div
                    className={`text-2xl font-bold mt-0.5 ${
                      data.metrics.roiPercent >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {data.metrics.roiPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Break-even budget: ${data.metrics.breakEvenBudget.toLocaleString()}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[200px]">
              {chartData && (
                <Line ref={chartRef} data={chartData} options={chartOptions as any} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">No data available</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mount the widget
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<RoiCalculatorWidget />);
}
