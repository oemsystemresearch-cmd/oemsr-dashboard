interface Props {
  label:     string;
  value:     string | null;
  valueLow?: string | null;   // optional second value (for High/Low card)
  unit?:     string;
  sub?:      string;
  accent?:   'amber' | 'green' | 'red' | 'blue' | 'slate';
  loading?:  boolean;
}

const accentBar: Record<string, string> = {
  amber: 'bg-[#01122b]',
  green: 'bg-[#01122b]',
  red:   'bg-[#01122b]',
  blue:  'bg-[#01122b]',
  slate: 'bg-[#01122b]',
};

export default function KPICard({ label, value, valueLow, unit, sub, accent = 'amber', loading }: Props) {
  return (
    <div className="card overflow-hidden flex flex-col min-w-0">
      <div className={`h-0.5 w-full shrink-0 ${accentBar[accent]}`} />
      <div className="p-4 flex flex-col gap-1 flex-1 min-w-0">
        <p className="kpi-label truncate">{label}</p>

        {loading ? (
          <div className="h-8 w-28 bg-gray-200 animate-pulse rounded mt-1" />
        ) : valueLow !== undefined ? (
          /* High / Low two-line layout */
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide shrink-0">H</span>
              <span className="kpi-value-sm text-gray-900 truncate">{value ?? '—'}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide shrink-0">L</span>
              <span className="kpi-value-sm text-gray-900 truncate">{valueLow ?? '—'}</span>
            </div>
            {unit && <p className="text-xs text-gray-600 mt-0.5">{unit}</p>}
          </div>
        ) : (
          /* Standard single-value layout */
          <div className="mt-0.5">
            <p className="kpi-value text-gray-900 truncate">{value ?? '—'}</p>
            {unit && <p className="text-xs text-gray-600 mt-0.5">{unit}</p>}
          </div>
        )}

        {sub && <p className="text-xs text-gray-600 truncate">{sub}</p>}
      </div>
    </div>
  );
}
