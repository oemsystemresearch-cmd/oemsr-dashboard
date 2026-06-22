import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { OemoArticle } from '../api/client';

const OEMO_NEWS_URL = 'https://www.oemo.om/media-center/news-articles/';

export default function FeaturedNews() {
  const [articles, setArticles] = useState<OemoArticle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [failed,   setFailed]   = useState(false);

  useEffect(() => {
    api.oemoNews()
      .then(d => {
        setArticles(d);
        if (d.length === 0) setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col rounded-lg border border-[#3D5268] bg-white overflow-hidden" style={{ minHeight: '420px' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Featured News</h2>
          <p className="text-xs text-gray-500 mt-0.5">From OEMO media centre</p>
        </div>
        <a
          href={OEMO_NEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:text-accent-light font-medium transition-colors whitespace-nowrap"
        >
          View all →
        </a>
      </div>

      {/* Article list */}
      <div className="flex-1 divide-y divide-gray-200 overflow-y-auto bg-white">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
            </div>
          ))
        ) : failed || articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
            <p className="text-sm text-gray-500 leading-relaxed">
              Live news feed unavailable.
            </p>
            <a
              href={OEMO_NEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent"
            >
              Visit OEMO News ↗
            </a>
          </div>
        ) : (
          articles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                {article.title}
              </h3>
              {article.date && (
                <p className="text-[10px] text-gray-400 mt-1">{article.date}</p>
              )}
              {article.excerpt && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>
              )}
            </a>
          ))
        )}
      </div>

      {/* Footer link */}
      <div className="px-5 py-3 border-t border-gray-200 bg-white shrink-0">
        <a
          href={OEMO_NEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-market-low shrink-0" />
          oemo.om/media-center/news-articles
        </a>
      </div>
    </div>
  );
}
