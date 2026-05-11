"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { TimeSeriesData, PredictionResult } from "@/types";

interface OzonePredictionChartProps {
  historicalData: TimeSeriesData[];
  predictions: PredictionResult[];
}

export function OzonePredictionChart({
  historicalData,
  predictions,
}: OzonePredictionChartProps) {
  const chartData = [
    ...historicalData.map((d) => ({
      timestamp: d.timestamp,
      date: format(d.timestamp, "MMM yyyy"),
      historical: d.value,
      predicted: null,
      lower: null,
      upper: null,
    })),
    ...predictions.map((p) => ({
      timestamp: p.timestamp,
      date: format(p.timestamp, "MMM yyyy"),
      historical: null,
      predicted: p.predictedConcentration,
      lower: p.confidenceInterval.lower,
      upper: p.confidenceInterval.upper,
    })),
  ];

  return (
    <div className="w-full h-full data-card p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Ozone Concentration Trend & Prediction
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: "#475569" }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: "#475569" }}
            label={{
              value: "Ozone (DU)",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#fff",
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="upper"
            stroke="transparent"
            fill="transparent"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="transparent"
            fill="url(#colorConfidence)"
          />
          <Line
            type="monotone"
            dataKey="historical"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Historical Data"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Predicted"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
