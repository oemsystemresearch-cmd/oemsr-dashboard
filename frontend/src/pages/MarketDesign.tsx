import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import logo  from '../assets/logo.png';
import info2  from '../assets/info_2.png';
import info3  from '../assets/info_3.png';
import info4  from '../assets/Info_4.png';
import info5  from '../assets/info_5.png';
import misDts from '../assets/MISDTS.png';

const NAV_LINKS = [
  { to: '/',               key: 'nav.home' },
  { to: '/data',           key: 'nav.data' },
  { to: '/notices',        key: 'nav.notices' },
  { to: '/market-design',  key: 'nav.design' },
  { to: '/about',          key: 'nav.about' },
];

const PARTICIPANTS = [
  { code: 'MP_ALRUSAIL1', name: 'Al Rusail Power Company' },
  { code: 'MP_BARKA1',    name: 'Barka Power Company SAOC' },
  { code: 'MP_BARKA2',    name: 'Barka 2 Power Company SAOC' },
  { code: 'MP_BARKA3',    name: 'SMN Barka Power Company SAOC' },
  { code: 'MP_IBRI1',     name: 'Ibri 1 Company SAOC' },
  { code: 'MP_IBRI2',     name: 'Ibri 2 Power Company' },
  { code: 'MP_MANAH1',    name: 'Manah 1 Power Company' },
  { code: 'MP_MANAH2',    name: 'Manah 2 Power Company' },
  { code: 'MP_SOHAR1',    name: 'Sohar Power Company SAOC' },
  { code: 'MP_SOHAR2',    name: 'Sohar 2 Power Company' },
  { code: 'MP_SOHAR3',    name: 'Shinas Generating Company SAOC' },
  { code: 'MP_SUR1',      name: 'Sur Power Company SAOC' },
  { code: 'MP_AUG_PDO',  name: 'Petroleum Development Oman (PDO)' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="h-0.5 w-full bg-[#01122b] mb-6" />
      <h2 className="text-xl font-bold text-gray-900 mb-6">{title}</h2>
      {children}
    </section>
  );
}

function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

// ── Info card components (HTML recreations of the original PNG diagrams) ──

function Info1() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
      <div className="border-2 border-amber-400 rounded-lg p-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 flex items-center justify-center text-amber-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <rect x="2" y="13" width="4" height="8" rx="1"/><rect x="9" y="9" width="4" height="12" rx="1"/><rect x="16" y="5" width="4" height="16" rx="1"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-amber-500 mb-1">{t('design.info1.priceTitle')}</p>
          <p className="text-sm text-gray-700" style={{ whiteSpace: 'pre-line' }}>{t('design.info1.priceText')}</p>
        </div>
      </div>
      <div className="border-2 border-blue-400 rounded-lg p-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 flex items-center justify-center text-blue-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.5a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 11.5c0 7-7.5 10.5-7.5 10.5S4.5 18.5 4.5 11.5a7.5 7.5 0 1115 0z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-blue-600 mb-1">{t('design.info1.contractTitle')}</p>
          <p className="text-sm text-gray-700">{t('design.info1.contractText')}</p>
        </div>
      </div>
    </div>
  );
}

export default function MarketDesign() {
  const { t, i18n } = useTranslation();
  const location     = useLocation();
  const isAr         = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="bg-[#01122b]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <img src={logo} alt="OEMSR logo" className="w-20 h-20 shrink-0" />
            <div>
              <span className="font-semibold text-2xl tracking-widest uppercase text-white">OEMSR</span>
              <p className="font-bold italic text-white/60 text-xs leading-tight mt-0.5">{t('hero.headerSub')}</p>
            </div>
          </div>
          <button
            onClick={() => setLanguage(isAr ? 'en' : 'ar')}
            className="px-3 py-1 rounded border border-white/20 text-xs font-semibold text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            {isAr ? 'EN' : 'عر'}
          </button>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{t('design.pageTitle')}</h1>
          <p className="text-sm text-gray-500">{t('design.pageSubtitle')}</p>
        </div>

        {/* ── Section 1: How the Market Works ── */}
        <Section title={t('design.section1')}>
          <Explainer title={t('design.oemo.title')}>
            <p>{t('design.oemo.p1')}</p>
          </Explainer>

          <Explainer title={t('design.gcc.title')}>
            <p>{t('design.gcc.p1')}</p>
          </Explainer>

          <Explainer title={t('design.misDts.title')}>
            <p>{t('design.misDts.intro')}</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>
                <strong>MIS (Main Interconnected System)</strong>{t('design.misDts.mis')}
              </li>
              <li>
                <strong>DTS (Dhofar Transmission System)</strong>{t('design.misDts.dts')}
              </li>
            </ul>
            <p>{t('design.misDts.interconnect')}</p>
            <img src={misDts} alt="MIS and DTS grid areas map" className="w-full rounded-lg border border-gray-200 shadow-sm mt-4" />
          </Explainer>

          <Explainer title={t('design.dayAhead.title')}>
            <p>
              {t('design.dayAhead.p1_before')}<em>{t('design.dayAhead.p1_em')}</em>{t('design.dayAhead.p1_after')}
            </p>
            <p>
              {t('design.dayAhead.p2_before')}<strong>Ex-Ante Aggregate Pool Price (MSPEAMR_APP)</strong>{t('design.dayAhead.p2_after')}
            </p>
          </Explainer>

          <div className="my-6 space-y-4">
            <img src={info2} alt="From bid to settlement process" className="w-full rounded-lg border border-gray-200 shadow-sm" />
            <img src={info5} alt="Market process diagram" className="w-full rounded-lg border border-gray-200 shadow-sm" />
          </div>

          <Explainer title={t('design.noRealTime.title')}>
            <p>{t('design.noRealTime.p1')}</p>
          </Explainer>

          <div className="my-6">
            <img src={info3} alt="Central policy feature" className="w-full rounded-lg border border-gray-200 shadow-sm" />
          </div>

          <Explainer title={t('design.howPrices.title')}>
            <p>
              {t('design.howPrices.p1_before')}<strong>System Marginal Price (ZSMP)</strong>{t('design.howPrices.p1_after')}
            </p>
            <p>
              {t('design.howPrices.p2_before')}<strong>Aggregate Pool Price</strong>{t('design.howPrices.p2_after')}
            </p>
          </Explainer>

          <Info1 />
          <div className="my-6">
            <img src={info4} alt="Wholesale pool diagram" className="w-full rounded-lg border border-gray-200 shadow-sm" />
          </div>
        </Section>

        {/* ── Section 2: Market Participants ── */}
        <Section title={t('design.section2')}>
          <p className="text-sm text-gray-600 mb-5">{t('design.participantsIntro')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {PARTICIPANTS.map(p => (
              <div key={p.code} className="border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="w-1 h-8 bg-[#01122b] rounded-full shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded px-4 py-3">
            {t('design.participantsFooter_before')}{' '}
            <a href="https://www.oemo.om" target="_blank" rel="noopener noreferrer" className="underline">
              oemo.om ↗
            </a>{t('design.participantsFooter_after')}
          </p>
        </Section>

      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 bg-[#01122b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="OEMSR logo" className="w-10 h-10 shrink-0" />
            <span className="font-bold text-white/70 text-sm tracking-wide">OEMSR</span>
          </div>
          <p className="text-xs text-white/40 max-w-xl">
            Independent research initiative. Not affiliated with OEMO or the Omani government.
            Data sourced from OEMO's public market information portal.
          </p>
        </div>
      </footer>
    </div>
  );
}
