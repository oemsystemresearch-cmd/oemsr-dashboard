import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { PriceInterval } from '../api/client';

interface Props {
  intervals:    PriceInterval[];
  date:         string;
  loading:      boolean;
  unit:         string;
  highlightIdx: number | null;
}

function formatPeriod(p: string) {
  return p.replace('.', ':');
}

export default function PriceCurveChart({ intervals, date, loading, unit, highlightIdx }: Props) {
  const { t } = useTranslation();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm shadow-lg">
        <p className="text-gray-500 mb-0.5">{formatPeriod(label)}</p>
        <p className="text-gray-900 font-semibold">
          {payload[0].value.toFixed(3)}
          <span className="text-gray-500 font-normal ms-1">{unit}</span>
        </p>
      </div>
    );
  };

  const avg = intervals.length
    ? intervals.reduce((s, i) => s + i.value, 0) / intervals.length
    : null;

  const highlightPeriod = highlightIdx !== null ? intervals[highlightIdx]?.period : null;

  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    if (highlightIdx !== null && index === highlightIdx) {
      return (
        <circle
          key={`dot-h-${index}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#3FD0C9"
          stroke="#0f1623"
          strokeWidth={2}
        />
      );
    }
    return <g key={`dot-${index}`} />;
  };

  return (
    <div className="card overflow-hidden">
      <div className="h-0.5 w-full bg-[#01122b]" />
      <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('chart.priceCurve')}</h2>
          {date && <p className="text-xs text-gray-500 mt-0.5">{date}</p>}
        </div>
        {avg !== null && !loading && (
          <div className="text-right">
            <p className="text-xs text-gray-600">{t('kpi.dailyAvg')}</p>
            <p className="text-sm font-semibold text-[#2EAF7D]">{avg.toFixed(3)} {unit}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-56 bg-gray-100 animate-pulse rounded" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={intervals} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={formatPeriod}
              tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              tickLine={false}
              interval={5}
            />
            <YAxis
              tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            {avg !== null && (
              <ReferenceLine
                y={avg}
                stroke="#f59e0b"
                strokeDasharray="4 2"
                strokeWidth={1}
              />
            )}
            {highlightPeriod && (
              <ReferenceLine
                x={highlightPeriod}
                stroke="#3FD0C9"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={renderDot}
              activeDot={{ r: 4, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      </div>
    </div>
  );
}
