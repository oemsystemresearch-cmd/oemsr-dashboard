import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import logo  from '../assets/logo.png';
import info1 from '../assets/info_1.png';
import info2 from '../assets/info_2.png';
import info3 from '../assets/info_3.png';
import info4 from '../assets/Info_4.png';
import info5 from '../assets/info_5.png';

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
      <div className="border-2 border-amber-400 rounded-lg p-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 flex items-center justify-center text-amber-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <rect x="2" y="13" width="4" height="8" rx="1"/><rect x="9" y="9" width="4" height="12" rx="1"/><rect x="16" y="5" width="4" height="16" rx="1"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-amber-500 mb-1">Price formation</p>
          <p className="text-sm text-gray-700">Aggregate Pool Price =<br />System Marginal Price + Scarcity Price</p>
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
          <p className="font-bold text-blue-600 mb-1">Contract interaction</p>
          <p className="text-sm text-gray-700">Plants with existing P(W)PAs may still submit offers while continuing to settle under contract terms.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Market Design</h1>
          <p className="text-sm text-gray-500">
            How Oman's wholesale electricity spot market works — structure, pricing, and participants.
          </p>
        </div>

        {/* ── Section 1: How the Market Works ── */}
        <Section title="How the Market Works">
          <Explainer title="What is OEMO?">
            <p>
              The Oman Electricity Market Operator (OEMO) is the body responsible for administering
              Oman's wholesale electricity market under the Electricity Regulation Law. OEMO manages
              the day-ahead scheduling and pricing of electricity across the Main Interconnected System
              and publishes market data on its public information portal.
            </p>
          </Explainer>

          <Explainer title="A GCC First">
            <p>
              Oman's electricity spot market is the first short-term energy procurement market in the
              Gulf Cooperation Council (GCC) region. Its establishment represents a significant step
              in the development of competitive electricity markets across the Gulf, shifting from
              long-term bilateral contracts toward a transparent, price-discovery-based system.
            </p>
          </Explainer>

          <Explainer title="MIS and DTS — Two Grid Systems">
            <p>
              Oman's electricity network is divided into two separate systems:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>
                <strong>MIS (Main Interconnected System)</strong> — covers most of the country
                including Muscat, Al Batinah, Ad Dakhiliyah, and other central and northern
                governorates. The spot market operates within the MIS.
              </li>
              <li>
                <strong>DTS (Dhofar Transmission System)</strong> — covers the Dhofar region in
                southern Oman, including Salalah and surrounding areas.
              </li>
            </ul>
            <p>
              The MIS and DTS were recently interconnected, linking Oman's two grids for the first
              time. However, the electricity spot market currently operates only within the MIS.
              The DTS remains outside the market's scope and continues to operate under a separate
              regulatory arrangement — DTS generation and load are not subject to spot market
              pricing or settlement.
            </p>
          </Explainer>

          <Explainer title="Day-Ahead (Ex-Ante) Pricing">
            <p>
              Unlike many markets that clear prices in real time every few minutes, Oman's market
              determines prices the day before delivery. "Ex-Ante" means <em>before the event</em> —
              prices are set in advance for each 30-minute trading interval of the following day.
            </p>
            <p>
              This means the <strong>Ex-Ante Aggregate Pool Price (MSPEAMR_APP)</strong> is the
              primary market signal: it reflects what generators bid to supply electricity and what
              the system needed. There are 48 trading periods per day (one every 30 minutes from
              00:00 to 23:30).
            </p>
          </Explainer>

          <div className="my-6 space-y-4">
            <img src={info2} alt="From bid to settlement process" className="w-full rounded-lg border border-gray-200 shadow-sm" />
            <img src={info5} alt="Market process diagram" className="w-full rounded-lg border border-gray-200 shadow-sm" />
          </div>

          <Explainer title="No Separate Real-Time Market">
            <p>
              Oman does not operate a separate real-time clearing market. The Ex-Ante price is the
              definitive settlement price. Ex-Post Confirmed and Ex-Post Indicative prices are
              published later and reflect operational adjustments, but the Ex-Ante price is the key
              commercial number participants are exposed to.
            </p>
          </Explainer>

          <div className="my-6">
            <img src={info3} alt="Central policy feature" className="w-full rounded-lg border border-gray-200 shadow-sm" />
          </div>

          <Explainer title="How Pool Prices Are Set">
            <p>
              Each day, generation participants submit bids specifying how much electricity they can
              supply and at what price for each 30-minute interval. OEMO runs an optimization to
              schedule the lowest-cost combination of generation that meets forecast demand — this
              produces the <strong>System Marginal Price (ZSMP)</strong>, which is the cost of the
              last (most expensive) unit of generation dispatched.
            </p>
            <p>
              The <strong>Aggregate Pool Price</strong> adds a scarcity component on top of the
              system marginal price, reflecting how close the system is to its capacity limits.
              When the market is tight, scarcity prices increase significantly. When there is
              surplus capacity, prices are lower and closer to the marginal cost of fuel.
            </p>
          </Explainer>

          <Info1 />
          <div className="my-6">
            <img src={info4} alt="Wholesale pool diagram" className="w-full rounded-lg border border-gray-200 shadow-sm" />
          </div>
        </Section>

        {/* ── Section 2: Market Participants ── */}
        <Section title="Market Participants">
          <p className="text-sm text-gray-600 mb-5">
            The following generation companies are currently active participants in the Oman
            electricity spot market as reflected in the published market schedule data.
          </p>
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
            Participant names are derived from published market schedule data and maintained
            manually. This list may not reflect the most recent registrations or de-registrations.
            For the official current participant list, contact OEMO directly at{' '}
            <a href="https://www.oemo.om" target="_blank" rel="noopener noreferrer" className="underline">
              oemo.om ↗
            </a>.
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
