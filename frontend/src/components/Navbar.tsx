import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location     = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAr  = i18n.language === 'ar';
  const links = [
    { to: '/',         label: t('nav.home') },
    { to: '/data',     label: t('nav.data') },
    { to: '/notices',  label: t('nav.notices') },
    { to: '/about',    label: t('nav.about') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Main nav bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo / wordmark */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          {/* Placeholder logo — replace src with real logo when provided */}
          <div className="flex items-center justify-center w-9 h-9 rounded bg-[#1b2d3e] text-white font-bold text-sm select-none tracking-tight">
            OEM
          </div>
          <div className="leading-tight">
            <p className="font-bold text-[#1b2d3e] text-sm tracking-wide">OEMSR</p>
            <p className="text-[10px] text-slate-500 tracking-wider hidden sm:block">OMAN ELECTRICITY MARKET STATISTICS</p>
          </div>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-0.5">
          {links.map(l => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`px-4 py-2 text-sm font-semibold transition-colors rounded
                  ${location.pathname === l.to
                    ? 'text-[#1b2d3e] bg-slate-100'
                    : 'text-slate-600 hover:text-[#1b2d3e] hover:bg-slate-50'}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Language toggle + mobile menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(isAr ? 'en' : 'ar')}
            className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-600 hover:text-[#1b2d3e] hover:border-slate-400 transition-colors"
            title="Toggle language"
          >
            {isAr ? 'EN' : 'عر'}
          </button>

          <button
            className="md:hidden p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </nav>

      {/* Navy accent stripe — ISONE style */}
      <div className="h-1 bg-[#1b2d3e]" />

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-2 shadow-md">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded text-sm font-semibold transition-colors mb-0.5
                ${location.pathname === l.to
                  ? 'text-[#1b2d3e] bg-slate-100'
                  : 'text-slate-600 hover:text-[#1b2d3e] hover:bg-slate-50'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
