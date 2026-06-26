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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{t('about.pageTitle')}</h1>
          <p className="text-sm text-gray-500">{t('about.pageSubtitle')}</p>
        </div>

        {/* ── About This Site ── */}
        <Section title={t('about.aboutSection')}>
          <div className="space-y-5 text-sm text-gray-600 leading-relaxed">
            <p>{t('about.aboutP1')}</p>
            <p>{t('about.aboutP2')}</p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4">
              <p className="font-semibold text-gray-800 mb-1">{t('about.disclaimerTitle')}</p>
              <p className="text-gray-600">
                {t('about.disclaimerText_before')}<strong>{t('about.disclaimerBold')}</strong>{t('about.disclaimerText_after')}{' '}
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
        <Section title={t('about.dataSourcesSection')}>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  labelKey: 'about.src_prices_label',
                  source: 'OEMO Market Information Portal',
                  detailKey: 'about.src_prices_detail',
                  url: 'https://www.oemo.om/market-information/',
                },
                {
                  labelKey: 'about.src_efp_label',
                  source: 'OEMO Market Information Portal',
                  detailKey: 'about.src_efp_detail',
                  url: 'https://www.oemo.om/market-information/',
                },
                {
                  labelKey: 'about.src_mscc_label',
                  source: 'OEMO Market Information Portal',
                  detailKey: 'about.src_mscc_detail',
                  url: 'https://www.oemo.om/market-information/',
                },
                {
                  labelKey: 'about.src_notices_label',
                  source: 'OEMO Market Notices',
                  detailKey: 'about.src_notices_detail',
                  url: 'https://www.oemo.om/market-information/market-notices/',
                },
                {
                  labelKey: 'about.src_temp_label',
                  source: 'Open-Meteo',
                  detailKey: 'about.src_temp_detail',
                  url: 'https://open-meteo.com',
                },
              ].map(item => (
                <div key={item.labelKey} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-800 mb-0.5">{t(item.labelKey)}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2EAF7D] hover:underline mb-2 inline-block"
                  >
                    {item.source} ↗
                  </a>
                  <p className="text-xs text-gray-500">{t(item.detailKey)}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{t('about.dataSourcesNote')}</p>
          </div>
        </Section>

        {/* ── Contact ── */}
        <Section title={t('about.contactSection')}>
          <p className="text-sm text-gray-600 mb-3">{t('about.contactText')}</p>
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
