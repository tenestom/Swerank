'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartDataPoint {
  date: string;
  compName: string;
  rawValue: string;
  value: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  title: string;
  yLabel: string;
}

export default function PerformanceChart({ data, title, yLabel }: PerformanceChartProps) {
  // Sort data chronologically (or reverse the list if IWWF list is descending)
  // Let's assume the passed data is ordered chronologically
  const chartData = [...data].reverse();

  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
              stroke="var(--border)"
            />
            <YAxis 
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
              stroke="var(--border)"
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const dataPoint = payload[0].payload as ChartDataPoint;
                  return (
                    <div className="p-3 bg-card border border-border rounded-lg shadow-md text-xs space-y-1">
                      <p className="font-bold text-foreground">{dataPoint.date}</p>
                      <p className="text-muted truncate max-w-xs">{dataPoint.compName}</p>
                      <p className="text-primary font-bold text-sm">
                        Resultat: {dataPoint.rawValue}
                      </p>
                      <p className="text-[10px] text-muted font-mono">
                        Numeriskt: {dataPoint.value.toFixed(2)} {yLabel}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={3}
              activeDot={{ r: 6 }}
              dot={{ r: 4, strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Slalom converter
export function slalomToNumeric(score: string): number {
  const parts = score.split('/');
  const buoys = parseFloat(parts[0]) || 0;
  const speed = parseFloat(parts[1]) || 0;
  const rope = parts[2] ? parseFloat(parts[2]) : 18.25;

  // Base speed is 40 km/h. Each 3 km/h step is 6 buoys
  const speedBase = 40;
  const speedSteps = Math.max(0, (speed - speedBase) / 3);
  const speedBuoys = speedSteps * 6;

  // Rope steps: 18.25, 16.00, 14.25, 13.00, 12.00, 11.25, 10.75, 10.25, 9.75, 9.50
  const ropeLengths = [18.25, 16.00, 14.25, 13.00, 12.00, 11.25, 10.75, 10.25, 9.75, 9.50];
  const ropeIdx = ropeLengths.indexOf(rope);
  const ropeBuoys = ropeIdx !== -1 ? ropeIdx * 6 : 0;

  return speedBuoys + ropeBuoys + buoys;
}
