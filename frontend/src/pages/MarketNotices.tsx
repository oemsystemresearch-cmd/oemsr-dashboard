import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { MarketNotice } from '../api/client';
import { setLanguage } from '../i18n';
import logo from '../assets/logo.png';

const NAV_LINKS = [
  { to: '/',               key: 'nav.home' },
  { to: '/data',           key: 'nav.data' },
  { to: '/notices',        key: 'nav.notices' },
  { to: '/market-design',  key: 'nav.design' },
  { to: '/about',          key: 'nav.about' },
];

const OEMO_BASE = 'https://www.oemo.om';
const CATEGORY_URL: Record<string, string> = {
  'withdrawal':         `${OEMO_BASE}/market-information/market-notices/withdrawal-notices/`,
  'exclusion':          `${OEMO_BASE}/market-information/market-notices/exclusion-notices/`,
  'termination':        `${OEMO_BASE}/market-information/market-notices/termination-notices/`,
  'rectification':      `${OEMO_BASE}/market-information/market-notices/rectification-notices/`,
  'suspension':         `${OEMO_BASE}/market-information/market-notices/suspension-notices/`,
  'withdrawal-consent': `${OEMO_BASE}/market-information/market-notices/withdrawal-consent-notices/`,
  'market-review':      `${OEMO_BASE}/market-information/market-reports/market-review-reports/`,
  'annual-report':      `${OEMO_BASE}/market-information/market-reports/annual-reports/`,
};

const CATEGORY_BADGE: Record<string, string> = {
  'withdrawal':         'bg-red-100 text-red-700 border-red-200',
  'exclusion':          'bg-purple-100 text-purple-700 border-purple-200',
  'termination':        'bg-orange-100 text-orange-700 border-orange-200',
  'rectification':      'bg-blue-100 text-blue-700 border-blue-200',
  'suspension':         'bg-yellow-100 text-yellow-700 border-yellow-200',
  'withdrawal-consent': 'bg-green-100 text-green-700 border-green-200',
  'market-review':      'bg-teal-100 text-teal-700 border-teal-200',
  'annual-report':      'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const CATEGORY_HEADER: Record<string, string> = {
  'withdrawal':         'border-red-200',
  'exclusion':          'border-purple-200',
  'termination':        'border-orange-200',
  'rectification':      'border-blue-200',
  'suspension':         'border-yellow-200',
  'withdrawal-consent': 'border-green-200',
  'market-review':      'border-teal-200',
  'annual-report':      'border-indigo-200',
};

const CATEGORY_ORDER = [
  'annual-report',
  'market-review',
  'suspension',
  'rectification',
  'withdrawal',
  'withdrawal-consent',
  'exclusion',
  'termination',
];

export default function MarketNotices() {
  const { t, i18n } = useTranslation();
  const location    = useLocation();
  const isAr        = i18n.language === 'ar';

  const [notices, setNotices] = useState<MarketNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const tryLoad = () => {
      api.notices().then(data => {
        if (data.length > 0) {
          setNotices(data);
          setLoading(false);
        } else if (attempts < 10) {
          attempts++;
          setTimeout(tryLoad, 4000);
        } else {
          setLoading(false);
        }
      }).catch(() => setLoading(false));
    };
    tryLoad();
  }, []);

  // Group by category, then sort by defined display order
  const grouped = notices.reduce<{ key: string; label: string; items: MarketNotice[] }[]>((acc, n) => {
    const existing = acc.find(g => g.key === n.category_key);
    if (existing) existing.items.push(n);
    else acc.push({ key: n.category_key, label: n.category, items: [n] });
    return acc;
  }, []).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.key);
    const bi = CATEGORY_ORDER.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header: logo + controls + nav unified in navy ── */}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12">

        {loading ? (
          // Skeleton
          <div className="space-y-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="h-12 bg-gray-100 animate-pulse" />
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-16 border-t border-gray-100 bg-white animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-24 text-center text-gray-400 text-sm">No notices available</div>
        ) : (
          <div className="columns-1 lg:columns-2 xl:columns-3 gap-4">
          {grouped.map(group => (
            <div key={group.key} className="break-inside-avoid mb-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm">

              {/* Navy top band */}
              <div className="h-0.5 w-full bg-[#01122b]" />

              {/* Card header */}
              <div className={`px-5 py-3.5 bg-gray-50 border-b ${CATEGORY_HEADER[group.key] ?? 'border-gray-200'} flex items-center gap-3`}>
                <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${CATEGORY_BADGE[group.key] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {t(`notices.${group.key}`, group.label)}
                </span>
                <span className="text-sm text-gray-400">{group.items.length} {group.items.length === 1 ? 'notice' : 'notices'}</span>
                {CATEGORY_URL[group.key] && (
                  <a
                    href={CATEGORY_URL[group.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    View on OEMO ↗
                  </a>
                )}
              </div>

              {/* Notice rows */}
              <div className="divide-y divide-gray-100">
                {group.items.map((notice, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      {notice.date && (
                        <p className="text-xs text-gray-400 mb-1">{notice.date}</p>
                      )}
                      {notice.pdf_url ? (
                        <a
                          href={notice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium text-gray-800 hover:text-accent transition-colors"
                        >
                          {notice.title}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-gray-800">{notice.title}</p>
                      )}
                    </div>
                    {notice.pdf_url && (
                      <a
                        href={notice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-3 py-1.5 rounded text-xs font-semibold btn-accent whitespace-nowrap"
                      >
                        ↓ PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>

            </div>
          ))}
          </div>
        )}

      </div>
    </div>
  );
}
