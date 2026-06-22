import { useTranslation } from 'react-i18next';
import type { SummaryRow } from '../api/client';

interface Props {
  rows:    SummaryRow[];
  loading: boolean;
}

function systemBadge(code: string) {
  if (code.includes('PEAMR') || code.includes('EAMR')) return 'AMR';
  if (code.includes('PCMR'))  return 'PCMR';
  if (code.includes('PIMR'))  return 'PIMR';
  return null;
}

const BADGE_COLOR: Record<string, string> = {
  AMR:  'bg-blue-100 text-blue-700',
  PCMR: 'bg-emerald-100 text-emerald-700',
  PIMR: 'bg-purple-100 text-purple-700',
};

export default function DataSummaryTable({ rows, loading }: Props) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-lg border border-[#3D5268] bg-white">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">{t('table.title')}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{t('table.subtitle')}</p>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-start px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('table.code')}
              </th>
              <th className="text-start px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('table.name')}
              </th>
              <th className="text-end px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('table.value')}
              </th>
              <th className="text-start px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">
                {t('table.unit')}
              </th>
              <th className="text-start px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600 hidden md:table-cell">
                {t('table.date')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {[1, 2, 3, 4, 5].map(j => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => {
                  const badge = systemBadge(row.code);
                  return (
                    <tr
                      key={`${row.code}-${row.extra ?? ''}`}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {row.code}
                          {badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${BADGE_COLOR[badge]}`}>
                              {badge}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-end font-semibold font-mono text-accent tabular-nums whitespace-nowrap">
                        {row.unit === 'OMR/month'
                          ? row.value.toLocaleString('en-OM', { maximumFractionDigits: 0 })
                          : row.value.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">{row.unit}</td>
                      <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{row.date}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Badge legend */}
      <div className="px-5 py-3 border-t border-gray-200 bg-white">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Report Types</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          {[
            { badge: 'AMR',  label: 'Ex-Ante Market Report',       cls: 'bg-blue-100 text-blue-700'       },
            { badge: 'PCMR', label: 'Pool Cap Market Report',       cls: 'bg-emerald-100 text-emerald-700' },
            { badge: 'PIMR', label: 'Pool Imbalance Market Report', cls: 'bg-purple-100 text-purple-700'  },
          ].map(({ badge, label, cls }) => (
            <span key={badge} className="flex items-center gap-2 text-xs text-gray-600">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{badge}</span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
