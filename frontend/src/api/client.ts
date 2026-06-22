const BASE = (import.meta.env.VITE_API_URL as string) || '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface KPIs {
  latest_price: { value: number | null; period: string | null; date: string | null };
  daily_stats:  { avg: number | null; high: number | null; low: number | null; date: string | null };
  yearly_avg:   { avg: number | null; year: number };
  efp:          { gas: number | null; oil: number | null; date: string | null };
  mscc:         { value: number | null; month: string | null; date: string | null };
  system_peak:  { value: number | null; date: string | null; period: string | null };
}

export interface PriceInterval {
  period: string;
  value:  number;
}

export interface PriceCurve {
  date:      string;
  intervals: PriceInterval[];
}

export interface SummaryRow {
  code:  string;
  name:  string;
  value: number;
  date:  string;
  unit:  string;
  extra: string | null;
}

export interface CityHourly {
  city:   string;
  region: string;
  system: 'MIS' | 'DTS';
  lat:    number;
  lon:    number;
  hourly: { timestamp: string; temperature_c: number }[];
}

export interface WeatherMap {
  day:    string;
  date:   string;
  cities: CityHourly[];
}

export interface MschParticipant {
  id:       string;
  total_mw: number;
}

export interface MschBreakdown {
  date:         string;
  type:         string;
  participants: MschParticipant[];
  data:         Record<string, number | string>[];
}

export interface ExchangeRate {
  rate:   number;
  source: string;
}

export interface HistoricalCode {
  code: string;
  name: string;
  unit: string;
}

export interface HistoricalPoint {
  date:  string;
  value: number | null;
}

export interface HistoricalByParticipant {
  participants: string[];
  data: ({ date: string } & Record<string, number | null>)[];
}

export interface OemoArticle {
  title:   string;
  url:     string;
  date:    string | null;
  excerpt: string | null;
}

export interface MarketNotice {
  category:     string;
  category_key: string;
  title:        string;
  date:         string | null;
  pdf_url:      string | null;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

export const api = {
  health:     () => get<{ status: string; market_rows: number; latest_dates: Record<string, string>; weather_latest_timestamp: string }>('/api/health'),
  kpis:       () => get<KPIs>('/api/market/kpis'),
  priceCurve: (date?: string) => get<PriceCurve>(`/api/market/price-curve${date ? `?date=${date}` : ''}`),
  summary:    () => get<SummaryRow[]>('/api/market/summary'),
  weatherMap: (day: 'today' | 'tomorrow') => get<WeatherMap>(`/api/weather/map?day=${day}`),
  mschLatest: (date: string) => get<{ type: string; granularity: string; data: { date: string; period: string; value: number }[] }>(
    `/api/market/historical?type=MSEAMR_MSCH&start=${date}&end=${date}`
  ),
  mschBreakdown: (date: string) => get<MschBreakdown>(`/api/market/msch-breakdown?date=${date}`),
  oemoNews:       () => get<OemoArticle[]>('/api/news/oemo'),
  notices:        () => get<MarketNotice[]>('/api/notices'),
  exchangeRate:   () => get<ExchangeRate>('/api/exchange/omr-usd'),
  historicalCodes: () => get<HistoricalCode[]>('/api/historical/codes'),
  historicalData:  (code: string, dateFrom: string, dateTo: string, extraField?: string) => {
    let url = `/api/historical/data?code=${encodeURIComponent(code)}&date_from=${dateFrom}&date_to=${dateTo}`;
    if (extraField) url += `&extra_field=${encodeURIComponent(extraField)}`;
    return get<HistoricalPoint[]>(url);
  },
  historicalByParticipant: (code: string, dateFrom: string, dateTo: string) =>
    get<HistoricalByParticipant>(`/api/historical/data-by-participant?code=${encodeURIComponent(code)}&date_from=${dateFrom}&date_to=${dateTo}`),
};
