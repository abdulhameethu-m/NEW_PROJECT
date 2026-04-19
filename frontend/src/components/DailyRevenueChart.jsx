import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function DailyRevenueChart({ data = [], loading = false, type = "line" }) {
  if (loading) {
    return (
      <div className="h-80 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">No data available</p>
      </div>
    );
  }

  const chartConfig = {
    margin: { top: 5, right: 30, left: 0, bottom: 5 },
    colors: {
      revenue: "#3b82f6",
      orders: "#10b981",
      average: "#f59e0b",
    },
  };

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} {...chartConfig}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={chartConfig.colors.revenue}
            dot={{ fill: chartConfig.colors.revenue }}
            name="Revenue"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} {...chartConfig}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill={chartConfig.colors.revenue} name="Revenue" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Combined
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} {...chartConfig}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #475569",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Legend />
        <Bar dataKey="revenue" fill={chartConfig.colors.revenue} name="Revenue" />
        <Line
          type="monotone"
          dataKey="orders"
          stroke={chartConfig.colors.orders}
          name="Orders Count"
          yAxisId="right"
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
