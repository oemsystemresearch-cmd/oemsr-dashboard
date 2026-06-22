import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import logo from '../assets/logo.png';

const NAV_LINKS = [
  { to: '/',               key: 'nav.home' },
  { to: '/data',           key: 'nav.data' },
  { to: '/notices',        key: 'nav.notices' },
  { to: '/market-design',  key: 'nav.design' },
  { to: '/about',          key: 'nav.about' },
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

export default function About() {
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
              <p className="font-bold italic text-white/60 text-xs leading-tight mt-0.5">Oman Electricity Market System Research</p>
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">About This Project</h1>
          <p className="text-sm text-gray-500">
            What OEMSR is, where the data comes from, and how to get in touch.
          </p>
        </div>

        {/* ── About This Site ── */}
        <Section title="About OEMSR">
          <div className="space-y-5 text-sm text-gray-600 leading-relaxed">
            <p>
              OEMSR is an independent research project built to improve public visibility into
              Oman's electricity spot market. The market has been operational since 2022, but
              historically published data has been spread across individual daily files with no
              centralised interface for exploring trends, comparing periods, or downloading
              structured datasets.
            </p>
            <p>
              This site aggregates all publicly available OEMO market data into a searchable,
              downloadable database and presents it through interactive charts and tables — free
              to use, with no login required.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4">
              <p className="font-semibold text-gray-800 mb-1">Disclaimer</p>
              <p className="text-gray-600">
                This site is an independent research initiative and is <strong>not affiliated
                with, endorsed by, or connected to</strong> the Omani government, OEMO, OPWP,
                OETC, APSR, Nama Group, or any Oman electricity market participant. All data is
                sourced directly from OEMO's public market information portal. While every
                effort is made to ensure accuracy, OEMSR makes no representations regarding
                the completeness or timeliness of the data presented here. For official and
                authoritative market information, refer directly to{' '}
                <a
                  href="https://www.oemo.om"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-800"
                >
                  oemo.om
                </a>
              </p>
            </div>
          </div>
        </Section>

        {/* ── Data Sources ── */}
        <Section title="Data Sources">
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: 'Market Prices & Schedules',
                  source: 'OEMO Market Information Portal',
                  detail: 'Ex-Ante and Ex-Post pool prices, system marginal prices, scarcity factors, margins, market schedules — updated daily.',
                  url: 'https://www.oemo.om/market-information/',
                },
                {
                  label: 'Economic Fuel Price (EFP)',
                  source: 'OEMO Market Information Portal',
                  detail: 'Gas and oil EFP values published daily, used as the fuel cost reference for price formation.',
                  url: 'https://www.oemo.om/market-information/',
                },
                {
                  label: 'Monthly Scarcity Credit Cap (MSCC)',
                  source: 'OEMO Market Information Portal',
                  detail: 'Published monthly. Caps the total scarcity payments a generator can receive in a given month.',
                  url: 'https://www.oemo.om/market-information/',
                },
                {
                  label: 'Market Notices & Reports',
                  source: 'OEMO Market Notices',
                  detail: 'Withdrawal, exclusion, rectification, suspension, and withdrawal-consent notices, plus market review and annual reports.',
                  url: 'https://www.oemo.om/market-information/market-notices/',
                },
                {
                  label: 'Temperature Data',
                  source: 'Open-Meteo',
                  detail: 'Hourly temperature readings for 10 cities across Oman, used as a proxy for cooling load on the grid. Free and open API — no affiliation.',
                  url: 'https://open-meteo.com',
                },
              ].map(item => (
                <div key={item.label} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-800 mb-0.5">{item.label}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2EAF7D] hover:underline mb-2 inline-block"
                  >
                    {item.source} ↗
                  </a>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Data is refreshed daily. The database covers January 2022 to present, though some
              data types may be sparse for earlier dates depending on OEMO publication history.
            </p>
          </div>
        </Section>

        {/* ── Contact ── */}
        <Section title="Contact">
          <p className="text-sm text-gray-600 mb-3">
            Questions, data corrections, or feedback are welcome.
          </p>
          <a
            href="mailto:OEMSystemResearch@gmail.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:border-[#01122b] hover:text-[#01122b] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            OEMSystemResearch@gmail.com
          </a>
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
