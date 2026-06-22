import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { KPIs, PriceInterval, SummaryRow } from '../api/client';
import { setLanguage } from '../i18n';
import KPICard from '../components/KPICard';
import PriceCurveChart from '../components/PriceCurveChart';
import OmanPriceMap from '../components/OmanPriceMap';
import OmanTempMap from '../components/OmanTempMap';
import DataSummaryTable from '../components/DataSummaryTable';
import MarketScheduleChart from '../components/MarketScheduleChart';
import FeaturedNews from '../components/FeaturedNews';
import MarketParticipants from '../components/MarketParticipants';
import logo            from '../assets/logo.png';
import backgroundImg     from '../assets/background.png';
import backgroundTallImg from '../assets/background_tall.png';

function fmt(n: number | null, dec = 3) {
  if (n === null) return null;
  return n.toLocaleString('en-OM', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function useMonthLabel(month: string | null | undefined, t: (k: string) => string) {
  if (!month) return undefined;
  return t(`months.${month}`) || month;
}

const NAV_LINKS = [
  { to: '/',               key: 'nav.home' },
  { to: '/data',           key: 'nav.data' },
  { to: '/notices',        key: 'nav.notices' },
  { to: '/market-design',  key: 'nav.design' },
  { to: '/about',          key: 'nav.about' },
];

export default function Home() {
  const { t, i18n } = useTranslation();
  const location     = useLocation();
  const isAr         = i18n.language === 'ar';

  const [kpis,        setKpis]        = useState<KPIs | null>(null);
  const [curve,       setCurve]       = useState<PriceInterval[]>([]);
  const [curveDate,   setCurveDate]   = useState('');
  const [summary,     setSummary]     = useState<SummaryRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [mschDate,    setMschDate]    = useState<string | null>(null);
  const [loadKpi,     setLoadKpi]     = useState(true);
  const [loadCurve,   setLoadCurve]   = useState(true);
  const [loadSummary, setLoadSummary] = useState(true);
  const [currency,    setCurrency]    = useState<'OMR' | 'USD'>('OMR');
  const [usdRate,     setUsdRate]     = useState(2.6008);
  const [mapMode,     setMapMode]     = useState<'avg' | 'timeseries'>('timeseries');
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    api.kpis()
      .then(d => setKpis(d))
      .catch(console.error)
      .finally(() => setLoadKpi(false));

    api.priceCurve()
      .then(d => { setCurve(d.intervals); setCurveDate(d.date); })
      .catch(console.error)
      .finally(() => setLoadCurve(false));

    api.summary()
      .then(d => setSummary(d))
      .catch(console.error)
      .finally(() => setLoadSummary(false));

    api.exchangeRate()
      .then(d => setUsdRate(d.rate))
      .catch(console.error);

    api.health()
      .then(d => {
        const marketDate = d.latest_dates?.MSPEAMR_APP ?? null;
        if (marketDate) {
          const dt = new Date(marketDate + 'T23:30:00+04:00');
          setLastUpdated(dt.toLocaleString('en-GB', {
            timeZone: 'Asia/Muscat',
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }));
        }
        setMschDate(d.latest_dates?.MSEAMR_MSCH ?? null);
      })
      .catch(console.error);
  }, []);

  // Auto-advance slider to the latest interval once the curve loads
  useEffect(() => {
    if (curve.length > 0) setSelectedIdx(curve.length - 1);
  }, [curve.length]);

  const dailyAvg    = kpis?.daily_stats.avg    ?? null;
  const dailyDate   = kpis?.daily_stats.date   ?? null;
  const yearlyAvg   = kpis?.yearly_avg?.avg    ?? null;

  const cvt = (n: number | null) => n !== null && currency === 'USD' ? n * usdRate : n;

  // What the map colours off (raw OMR for thresholds) and displays
  const mapPrice        = mapMode === 'avg' ? dailyAvg : (curve[selectedIdx]?.value ?? null);
  const mapDisplayPrice = cvt(mapPrice);
  const unitMwh   = currency === 'USD' ? 'USD/MWh'   : t('kpi.unit_omr');
  const unitMonth = currency === 'USD' ? 'USD/month'  : t('kpi.unit_month');

  return (
    <div
      className="home-bg min-h-screen bg-white overflow-x-hidden"
      style={{
        '--home-bg-url':      `url(${backgroundImg})`,
        '--home-bg-tall-url': `url(${backgroundTallImg})`,
      } as React.CSSProperties}
    >

      {/* ── Header: logo + controls + nav unified in navy ── */}
      <header className="bg-[#01122b]">

        {/* Top bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <img src={logo} alt="OEMSR logo" className="w-20 h-20 shrink-0" />
            <div>
              <span className="font-semibold text-2xl tracking-widest uppercase text-white">OEMSR</span>
              <p className="font-bold italic text-white/60 text-xs leading-tight mt-0.5">Oman Electricity Market System Research</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-3">
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
                title="Toggle language"
              >
                {isAr ? 'EN' : 'عر'}
              </button>
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <span className="w-1.5 h-1.5 rounded-full bg-market-low animate-pulse shrink-0" />
                <span>
                  {t('hero.updated')}: <span className="text-white/80 font-medium">{lastUpdated}</span>{' '}
                  {t('hero.omanTime')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center h-16 overflow-x-auto">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`h-full px-10 flex items-center text-base font-semibold whitespace-nowrap transition-colors
                  ${location.pathname === l.to
                    ? 'text-white border-b-2 border-accent'
                    : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {t(l.key)}
              </Link>
            ))}
          </div>
        </nav>

      </header>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-[60px] space-y-6">

        {/* ── Hero title — transparent, text only ── */}
        <div className="pt-2 pb-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Oman Electricity Spot Market Research
          </h1>
          <p className="text-sm text-gray-600 mt-1.5 max-w-xl">
            An independent transparency initiative providing open access to Oman's electricity market.
          </p>
        </div>

        {/* Maps (left, narrow) + KPIs + Charts (right) */}
        <section className="mt-80">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

            {/* Left: Maps stacked — 2/5 width */}
            <div className="lg:col-span-2 flex flex-col gap-4 lg:pt-10">
              <OmanPriceMap
                price={mapPrice}
                displayPrice={mapDisplayPrice}
                yearlyAvg={cvt(yearlyAvg)}
                unit={unitMwh}
                date={dailyDate}
                loading={loadKpi}
                intervals={curve}
                mode={mapMode}
                onModeChange={setMapMode}
                selectedIdx={selectedIdx}
                onSelectedIdx={setSelectedIdx}
              />
              <OmanTempMap />
            </div>

            {/* Right: KPIs + Price Curve + Market Schedule — 3/5 width */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <KPICard
                  label={t('kpi.systemPeak')}
                  value={kpis?.system_peak.value != null
                    ? kpis.system_peak.value.toLocaleString('en-OM')
                    : null}
                  unit={t('kpi.unit_mw')}
                  sub={kpis?.system_peak.date ?? undefined}
                  accent="amber"
                  loading={loadKpi}
                />
                <KPICard
                  label={t('kpi.dailyAvgPrice')}
                  value={fmt(cvt(kpis?.daily_stats.avg ?? null))}
                  unit={unitMwh}
                  sub={kpis?.daily_stats.date ?? undefined}
                  accent="blue"
                  loading={loadKpi}
                />
                <KPICard
                  label={t('kpi.dailyRange')}
                  value={fmt(cvt(kpis?.daily_stats.high ?? null), 2)}
                  valueLow={fmt(cvt(kpis?.daily_stats.low ?? null), 2)}
                  unit={unitMwh}
                  sub={kpis?.daily_stats.date ?? undefined}
                  accent="slate"
                  loading={loadKpi}
                />
                <KPICard
                  label={t('kpi.efpGas')}
                  value={fmt(cvt(kpis?.efp.gas ?? null))}
                  unit={unitMwh}
                  sub={kpis?.efp.date ?? undefined}
                  accent="green"
                  loading={loadKpi}
                />
                <KPICard
                  label={t('kpi.efpOil')}
                  value={fmt(cvt(kpis?.efp.oil ?? null))}
                  unit={unitMwh}
                  sub={kpis?.efp.date ?? undefined}
                  accent="red"
                  loading={loadKpi}
                />
                <KPICard
                  label={t('kpi.mscc')}
                  value={kpis?.mscc.value != null
                    ? Math.round(cvt(kpis.mscc.value) as number).toLocaleString('en-OM')
                    : null}
                  unit={unitMonth}
                  sub={useMonthLabel(kpis?.mscc.month, t)}
                  accent="amber"
                  loading={loadKpi}
                />
              </div>
              <PriceCurveChart
                intervals={currency === 'USD' ? curve.map(i => ({ ...i, value: i.value * usdRate })) : curve}
                date={curveDate}
                loading={loadCurve}
                unit={unitMwh}
                highlightIdx={mapMode === 'timeseries' ? selectedIdx : null}
              />
              <MarketScheduleChart latestMschDate={mschDate} />
              <MarketParticipants />
            </div>

          </div>
        </section>

      </div>

      {/* ── Data Summary + News — dark navy peek-out section ── */}
      {/* Cards sit in a relative container; the navy background is absolutely
          positioned starting 102px down so it begins at the column-header line
          while the card titles float in the light/image area above. */}
      <div className="relative">
        <div
          className="absolute inset-x-0 bottom-0 bg-[#01122b]"
          style={{ top: '102px' }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            <div className="lg:col-span-3">
              <DataSummaryTable rows={summary} loading={loadSummary} />
            </div>
            <div className="lg:col-span-2">
              <FeaturedNews />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 bg-[#01122b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="OEMS logo" className="w-10 h-10 shrink-0" />
            <span className="font-bold text-white/70 text-sm tracking-wide">OEMSR</span>
          </div>
          <p className="text-xs text-white/40 max-w-xl">{t('footer.disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}
