import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';

interface SparklineProps {
  data: number[];
  labels?: string[];
  color?: string;
}

const SparklineTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const { label, value } = payload[0].payload;

  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 shadow-md">
      {label && <p className="text-[10px] text-muted-foreground">{label}</p>}
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
};

export const Sparkline = ({ data, labels, color = '#16a34a' }: SparklineProps) => {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({
    index,
    value,
    label: labels?.[index],
  }));

  return (
    <div className="h-9 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Tooltip
            content={<SparklineTooltip />}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
