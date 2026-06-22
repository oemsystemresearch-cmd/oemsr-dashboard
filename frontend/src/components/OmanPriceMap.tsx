import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { Feature } from 'geojson';
import { useTranslation } from 'react-i18next';
import type { PriceInterval } from '../api/client';
import omanData from '../assets/om.json';

interface Props {
  price:         number | null;
  displayPrice:  number | null;
  yearlyAvg:     number | null;
  unit:          string;
  date:          string | null;
  loading:       boolean;
  intervals:     PriceInterval[];
  mode:          'avg' | 'timeseries';
  onModeChange:  (m: 'avg' | 'timeseries') => void;
  selectedIdx:   number;
  onSelectedIdx: (i: number) => void;
}

const DTS_IDS  = new Set(['OMZU']);
const EXCL_IDS = new Set(['OMMU']);

function priceColor(price: number | null): string {
  if (price === null) return '#64748b';
  if (price <= 5)  return '#3b82f6';
  if (price <= 12) return '#22c55e';
  if (price <= 20) return '#fbbf24';
  if (price <= 25) return '#f97316';
  return '#ef4444';
}

function priceLabelKey(price: number | null): string {
  if (price === null) return '—';
  if (price <= 5)  return 'maps.priceVLow';
  if (price <= 12) return 'maps.priceLow';
  if (price <= 20) return 'maps.priceMid';
  if (price <= 25) return 'maps.priceHigh';
  return 'maps.priceVHigh';
}

function formatPeriod(p: string) {
  return p.replace('.', ':');
}

export default function OmanPriceMap({
  price, displayPrice, yearlyAvg, unit, date, loading,
  intervals, mode, onModeChange, selectedIdx, onSelectedIdx,
}: Props) {
  const { t } = useTranslation();
  const misColor = priceColor(price);

  const styleFeature = (feature: Feature | undefined) => {
    const id = feature?.properties?.id as string | undefined;
    if (EXCL_IDS.has(id ?? '')) {
      return { fillColor: '#334155', fillOpacity: 0.12, color: '#475569', weight: 0.8, opacity: 0.3 };
    }
    if (DTS_IDS.has(id ?? '')) {
      return { fillColor: '#64748b', fillOpacity: 0.2, color: '#64748b', weight: 1.5, opacity: 0.5 };
    }
    return { fillColor: misColor, fillOpacity: 0.3, color: misColor, weight: 1.5, opacity: 0.65 };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const name = feature.properties?.name as string;
    const id   = feature.properties?.id   as string;
    if (EXCL_IDS.has(id)) return;
    const priceHtml = displayPrice != null
      ? `<br/><span style="color:${misColor}">${displayPrice.toFixed(3)} ${unit} — ${t(priceLabelKey(price))}</span>`
        + (mode === 'avg' && yearlyAvg != null
          ? `<br/><span style="color:#94a3b8;font-size:10px">${t('maps.ytdAvg')}: ${yearlyAvg.toFixed(3)} ${unit}</span>`
          : '')
      : '';
    const content = DTS_IDS.has(id)
      ? `<strong>${t('maps.dts')}</strong><br/><span style="color:#94a3b8;font-size:11px">${name}</span>`
      : `<strong>${t('maps.mis')}</strong><br/><span style="color:#94a3b8;font-size:11px">${name}</span>${priceHtml}`;
    (layer as L.Path).bindPopup(content);
  };

  const selectedPeriod = intervals[selectedIdx]?.period;
  const sliderMax      = Math.max(0, intervals.length - 1);
  const sliderPct      = sliderMax > 0 ? (selectedIdx / sliderMax) * 100 : 0;

  return (
    <div className="card overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.42)' }}>
      <div className="h-0.5 w-full bg-[#01122b] shrink-0" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-20">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t('maps.priceMap')}</h2>
          {date && (
            <p className="text-xs text-gray-600">
              {date}
              {mode === 'timeseries' && selectedPeriod && (
                <span className="text-gray-700 font-medium"> · {formatPeriod(selectedPeriod)}</span>
              )}
            </p>
          )}
        </div>

        {price !== null && !loading && displayPrice !== null && (
          <div className="text-end">
            <p className="text-sm font-bold" style={{ color: misColor }}>
              {displayPrice.toFixed(3)}{' '}
              <span className="text-xs font-normal text-gray-600">{unit}</span>
            </p>
            <p className="text-xs" style={{ color: misColor }}>{t(priceLabelKey(price))}</p>
            {mode === 'avg' && yearlyAvg != null && (
              <p className="text-[10px] text-gray-600 mt-0.5">{t('maps.ytdAvg')}: {yearlyAvg.toFixed(3)}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      {loading ? (
        <div className="h-64 bg-border/30 animate-pulse m-4 rounded" />
      ) : (
        <MapContainer
          center={[21.5, 57.5]}
          zoom={5}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={true}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />
          <GeoJSON
            key={`${misColor}-${mode}`}
            data={omanData as unknown as GeoJSON.GeoJsonObject}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </MapContainer>
      )}

      {/* ── Bottom controls ── */}
      <div className="px-4 pt-2.5 pb-3 border-t border-border">

        {/* Colour scale — always visible */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-600 font-medium">OMR/MWh</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-market-dts" />
            DTS (separate system)
          </span>
        </div>
        <div
          className="h-3 rounded-full w-full"
          style={{ background: 'linear-gradient(to right, #3b82f6, #22c55e, #fbbf24, #f97316, #ef4444)' }}
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>0</span><span>5</span><span>12</span><span>20</span><span>25</span><span>&gt; 25</span>
        </div>

        {/* Divider */}
        <div className="my-2.5 border-t border-border/50" />

        {/* Mode toggle — between scale and slider */}
        <div className="flex items-center justify-center mb-2.5">
          <div className="flex rounded overflow-hidden border border-border text-[10px] font-semibold">
            {(['avg', 'timeseries'] as const).map(m => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`px-2.5 py-1 transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-accent text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {m === 'avg' ? 'Daily Avg' : 'Interval'}
              </button>
            ))}
          </div>
        </div>

        {/* Slider section — interval mode only */}
        {mode === 'timeseries' && intervals.length > 0 && (
          <div>
            {/* Slider */}
            <input
              type="range"
              min={0}
              max={sliderMax}
              value={selectedIdx}
              onChange={e => onSelectedIdx(Number(e.target.value))}
              className="interval-slider"
              style={{
                background: `linear-gradient(to right, #64748b ${sliderPct}%, #283640 ${sliderPct}%)`,
              }}
            />

            {/* Tick marks — one per 30-min interval */}
            <div className="flex justify-between px-0.5 mt-1.5">
              {intervals.map((_, i) => (
                <div
                  key={i}
                  className={
                    i === selectedIdx
                      ? 'w-0.5 h-2.5 rounded-full bg-gray-500'
                      : i % 4 === 0
                      ? 'w-px h-2 rounded-full bg-gray-300'
                      : 'w-px h-1.5 rounded-full bg-gray-200'
                  }
                />
              ))}
            </div>

            {/* Time labels */}
            <div className="flex items-center justify-between mt-2 text-[10px]">
              <span className="text-gray-600">{formatPeriod(intervals[0].period)}</span>
              <span className="text-gray-900 font-semibold text-xs">
                {selectedPeriod ? formatPeriod(selectedPeriod) : '—'}
              </span>
              <span className="text-gray-600">{formatPeriod(intervals[intervals.length - 1].period)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
