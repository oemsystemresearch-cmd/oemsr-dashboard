import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { MschBreakdown, MschParticipant } from '../api/client';

interface Props {
  latestMschDate: string | null;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#a78bfa', '#22d3ee', '#fb923c', '#a3e635', '#f472b6', '#2dd4bf',
];

const LABEL: Record<string, string> = {
  MP_SUR1:        'Sur 1',
  MP_BARKA3:      'Barka 3',
  MP_SOHAR3:      'Sohar 3',
  MP_SOHAR2:      'Sohar 2',
  MP_IBRI1:       'Ibri 1',
  MP_BARKA2:      'Barka 2',
  MP_IBRI2:       'Ibri 2',
  MP_MANAH1:      'Manah 1',
  MP_MANAH2:      'Manah 2',
  MP_MANAH:       'Manah',
  MP_AUG_PDO:     'PDO',
  MP_ALRUSAIL1:   'Al Rusail 1',
  MP_C1_ALRUSAIL1:'Al Rusail 1',
  MP_C1_BARKA1:   'Barka 1',
  MP_C1_SOHAR1:   'Sohar 1',
  MP_SOHAR1:      'Sohar 1',
  MP_BARKA1:      'Barka 1',
};

function participantLabel(id: string) {
  return LABEL[id] ?? id.replace(/^MP_(C1_)?/, '');
}

function fmt(p: string) { return p.replace('.', ':'); }

const CustomTooltip = ({
  active, payload, label: period,
  colorMap,
}: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, e: any) => s + (e.value ?? 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-500 mb-2 font-medium">{fmt(period)}</p>
      {[...payload].reverse().map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5" style={{ color: colorMap[entry.dataKey] }}>
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ background: colorMap[entry.dataKey] }}
            />
            {participantLabel(entry.dataKey)}
          </span>
          <span className="text-gray-900 font-medium tabular-nums">
            {Math.round(entry.value).toLocaleString()} MW
          </span>
        </div>
      ))}
      <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex justify-between">
        <span className="text-gray-500">Total</span>
        <span className="text-[#2EAF7D] font-semibold tabular-nums">
          {Math.round(total).toLocaleString()} MW
        </span>
      </div>
    </div>
  );
};

export default function MarketScheduleChart({ latestMschDate }: Props) {
  const { t } = useTranslation();
  const [breakdown, setBreakdown] = useState<MschBreakdown | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!latestMschDate) return;
    setLoading(true);
    api.mschBreakdown(latestMschDate)
      .then(setBreakdown)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [latestMschDate]);

  const participants: MschParticipant[] = breakdown?.participants ?? [];
  const colorMap = Object.fromEntries(
    participants.map((p, i) => [p.id, COLORS[i % COLORS.length]])
  );

  const avgMW   = breakdown?.data.length
    ? Math.round(
        breakdown.data.reduce((s, row) =>
          s + participants.reduce((ps, p) => ps + ((row[p.id] as number) ?? 0), 0), 0
        ) / breakdown.data.length
      )
    : null;

  return (
    <div className="card overflow-hidden">
      <div className="h-0.5 w-full bg-[#01122b]" />
      <div className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('msch.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('msch.subtitle')}</p>
        </div>
        <div className="shrink-0 text-start sm:text-end">
          {latestMschDate && (
            <p className="text-xs text-gray-500">
              {t('msch.settlementDate')}: <span className="text-gray-900 font-medium">{latestMschDate}</span>
            </p>
          )}
          {avgMW !== null && (
            <p className="text-xs text-gray-500 mt-0.5">
              {t('msch.avgTotal')}: <span className="text-[#2EAF7D] font-semibold">{avgMW.toLocaleString()} MW</span>
            </p>
          )}
        </div>
      </div>

      {/* Lag notice */}
      <div className="mb-4 px-3 py-2.5 rounded bg-gray-50 border border-gray-200 text-xs text-gray-600">
        {t('msch.disclaimer')}
      </div>

      {loading ? (
        <div className="h-52 bg-gray-100 animate-pulse rounded" />
      ) : !breakdown || breakdown.data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
          No market schedule data available
        </div>
      ) : (
        <>
          <div
            className="rounded-md overflow-hidden"
            style={{
              background: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          >
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={breakdown.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={fmt}
                  tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                  tickLine={false}
                  interval={5}
                />
                <YAxis
                  tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                  width={42}
                />
                <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
                {participants.map((p, i) => (
                  <Area
                    key={p.id}
                    type="monotone"
                    dataKey={p.id}
                    stackId="stack"
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={1}
                    strokeOpacity={0.9}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.62}
                    dot={false}
                    activeDot={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-200">
            {participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-700">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span>{participantLabel(p.id)}</span>
                <span className="text-[10px] opacity-60 tabular-nums">
                  {Math.round(p.total_mw / 1000).toLocaleString()}k MWh
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
