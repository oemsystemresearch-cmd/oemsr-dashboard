import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';
import type { HistoricalCode, HistoricalPoint, HistoricalByParticipant } from '../api/client';
import { setLanguage } from '../i18n';
import logo from '../assets/logo.png';

const BASE = (import.meta.env.VITE_API_URL as string) || '';

const MSCH_CODES = new Set(['MSEAMR_MSCH', 'MSEPCMR_MSCH', 'MSEPIMR_MSCH']);

// Pre-populate with the default so the dropdown is never blank on first render
const DEFAULT_CODES: HistoricalCode[] = [
  { code: 'MSPEAMR_APP', name: 'Ex-Ante Aggregate Pool Price', unit: 'OMR/MWh' },
];


const PARTICIPANT_COLORS = [
  '#3FD0C9','#2EAF7D','#60A5FA','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#10B981','#F97316','#06B6D4',
  '#84CC16','#FB923C',
];

function fmtParticipant(id: string) {
  return id
    .replace(/^MP_C1_/, 'C1 ')
    .replace(/^MP_AUG_/, 'Aug ')
    .replace(/^MP_/, '')
    .replace(/(\D)(\d)/, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\bALRUSAIL\b/i, 'Al Rusail')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const NAV_LINKS = [
  { to: '/',               key: 'nav.home' },
  { to: '/data',           key: 'nav.data' },
  { to: '/notices',        key: 'nav.notices' },
  { to: '/market-design',  key: 'nav.design' },
  { to: '/about',          key: 'nav.about' },
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function HistoricalData() {
  const { t, i18n } = useTranslation();
  const location    = useLocation();
  const isAr        = i18n.language === 'ar';

  const [codes,        setCodes]        = useState<HistoricalCode[]>(DEFAULT_CODES);
  const [selectedCode, setSelectedCode] = useState('MSPEAMR_APP');
  const [dateFrom,     setDateFrom]     = useState(() => toISODate(new Date(Date.now() - 90 * 864e5)));
  const [dateTo,       setDateTo]       = useState(() => toISODate(new Date()));
  const [data,            setData]            = useState<HistoricalPoint[]>([]);
  const [participantData, setParticipantData] = useState<HistoricalByParticipant | null>(null);
  const [viewMode,        setViewMode]        = useState<'aggregate' | 'participant'>('aggregate');
  const [fuelType,        setFuelType]        = useState<'Gas' | 'Oil'>('Gas');
  const [loading,         setLoading]         = useState(false);
  const [currency,        setCurrency]        = useState<'OMR' | 'USD'>('OMR');
  const [usdRate,         setUsdRate]         = useState(2.6008);

  const isMsch = MSCH_CODES.has(selectedCode);
  const isEfp  = selectedCode === 'EFP';

  useEffect(() => {
    api.historicalCodes().then(setCodes).catch(console.error);
    api.exchangeRate().then(d => setUsdRate(d.rate)).catch(console.error);
  }, []);

  const loadData = useCallback(() => {
    if (!selectedCode || !dateFrom || !dateTo) return;
    setLoading(true);
    if (isMsch && viewMode === 'participant') {
      api.historicalByParticipant(selectedCode, dateFrom, dateTo)
        .then(setParticipantData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      api.historicalData(selectedCode, dateFrom, dateTo, isEfp ? fuelType : undefined)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedCode, dateFrom, dateTo, viewMode, isMsch, isEfp, fuelType]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset to aggregate when switching away from MSCH types
  useEffect(() => {
    if (!isMsch) setViewMode('aggregate');
  }, [isMsch]);

  const codeInfo = codes.find(c => c.code === selectedCode);
  const isOmr    = codeInfo?.unit?.includes('OMR') ?? false;
  const unit     = isOmr && currency === 'USD'
    ? codeInfo!.unit.replace('OMR', 'USD')
    : (codeInfo?.unit ?? '');

  const displayData = data.map(pt => ({
    ...pt,
    value: pt.value !== null && isOmr && currency === 'USD'
      ? +(pt.value * usdRate).toFixed(4)
      : pt.value,
  }));

  const handleDownload = () => {
    let url = `${BASE}/api/historical/download?code=${encodeURIComponent(selectedCode)}&date_from=${dateFrom}&date_to=${dateTo}`;
    if (isEfp) url += `&extra_field=${fuelType}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header: logo + controls + nav unified in navy ── */}
      <header className="bg-[#01122b]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <img src={logo} alt="OEMSR logo" className="w-20 h-20 shrink-0" />
            <div>
              <span className="font-semibold text-2xl tracking-widest uppercase text-white">OEMSR</span>
              <p className="font-bold italic text-white/60 text-xs leading-tight mt-0.5">{t('hero.headerSub')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex rounded overflow-hidden border border-white/20 text-xs font-semibold">
              {(['OMR', 'USD'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 transition-colors ${
                    currency === c
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLanguage(isAr ? 'en' : 'ar')}
              className="px-3 py-1 rounded border border-white/20 text-xs font-semibold text-white/70 hover:text-white hover:border-white/40 transition-colors"
            >
              {isAr ? 'EN' : 'عر'}
            </button>
          </div>
        </div>
        <nav className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center h-16 overflow-x-auto">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`h-full px-10 flex items-center text-base font-semibold whitespace-nowrap transition-colors
                  ${location.pathname === l.to
                    ? 'text-white border-b-2 border-[#2EAF7D]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {t(l.key)}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-6">

        {/* Chart card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-end mb-6">

            {/* Data type */}
            <div className="flex-1 min-w-[220px]">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                {t('histData.dataType')}
              </label>
              <select
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md text-gray-800 text-sm px-3 py-2 focus:outline-none focus:border-accent bg-white"
              >
                {codes.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                {t('histData.from')}
              </label>
              <input
                type="date"

                value={dateFrom}
                min="2022-01-01"
                max={dateTo}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-md text-gray-800 text-sm px-3 py-2 focus:outline-none focus:border-accent bg-white"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                {t('histData.to')}
              </label>
              <input
                type="date"

                value={dateTo}
                min={dateFrom || "2022-01-01"}
                onChange={e => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-md text-gray-800 text-sm px-3 py-2 focus:outline-none focus:border-accent bg-white"
              />
            </div>

            {/* Fuel type toggle — EFP only */}
            {isEfp && (
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                  {t('histData.fuelType')}
                </label>
                <div className="flex rounded overflow-hidden border border-gray-300 text-xs font-semibold">
                  {(['Gas', 'Oil'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFuelType(f)}
                      className={`px-3 py-2 transition-colors whitespace-nowrap ${
                        fuelType === f
                          ? 'bg-accent text-white'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      {t(f === 'Gas' ? 'histData.gas' : 'histData.oil')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Participant toggle — MSCH only */}
            {isMsch && (
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                  {t('histData.view')}
                </label>
                <div className="flex rounded overflow-hidden border border-gray-300 text-xs font-semibold">
                  {(['aggregate', 'participant'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`px-3 py-2 transition-colors whitespace-nowrap ${
                        viewMode === m
                          ? 'bg-accent text-white'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      {t(m === 'aggregate' ? 'histData.aggregate' : 'histData.byParticipant')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={data.length === 0 && !participantData}
              className="btn-accent px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {t('histData.downloadCsv')}
            </button>
          </div>

          {/* Chart */}
          {loading ? (
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
          ) : isMsch && viewMode === 'participant' ? (
            /* ── Multi-line participant chart ── */
            !participantData || participantData.data.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-gray-400 text-sm">
                {t('histData.noParticipant')}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={participantData.data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                      tickFormatter={v => v.slice(5)}
                      interval="preserveStartEnd"
                      minTickGap={60}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v.toFixed(0)}
                      width={58}
                    />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#1f2937', fontSize: 12 }}
                      labelStyle={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, marginBottom: 4 }}
                      formatter={(v, name) => [`${(v as number).toFixed(1)} MWh`, fmtParticipant(String(name))]}
                    />
                    <Legend
                      formatter={name => <span style={{ color: 'rgba(0,0,0,0.6)', fontSize: 11 }}>{fmtParticipant(name)}</span>}
                      wrapperStyle={{ paddingTop: 12 }}
                    />
                    {participantData.participants.map((p, i) => (
                      <Line
                        key={p}
                        type="monotone"
                        dataKey={p}
                        stroke={PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                  <span>{participantData.data.length} {t('histData.dataPoints')} · {participantData.participants.length} {t('histData.participants')}</span>
                  <span>{t('histData.dailyAvg')} · MWh</span>
                </div>
              </>
            )
          ) : displayData.length === 0 ? (
            <div className="h-96 flex items-center justify-center text-gray-400 text-sm">
              {t('histData.noData')}
            </div>
          ) : (
            /* ── Single aggregate area chart ── */
            <>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={displayData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2EAF7D" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2EAF7D" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                    tickFormatter={v => v.slice(5)}
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(0,0,0,0.45)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.toFixed(2)}
                    width={58}
                  />
                  <Tooltip
                    contentStyle={{ background: '#143D4A', border: '1px solid #1E5565', borderRadius: 8, color: '#C1F6ED', fontSize: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}
                    formatter={(v) => [`${(v as number).toFixed(3)}${unit ? ' ' + unit : ''}`, codeInfo?.name ?? selectedCode]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2EAF7D" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: '#3FD0C9', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between mt-4 text-[11px] text-gray-400">
                <span>{displayData.length} {t('histData.dataPoints')}</span>
                {unit && <span>{t('histData.dailyAvg')} · {unit}</span>}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
