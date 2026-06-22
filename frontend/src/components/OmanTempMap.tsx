import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { api } from '../api/client';
import type { CityHourly } from '../api/client';

function tempColor(t: number): string {
  if (t <= 20) return '#60a5fa';
  if (t <= 25) return '#34d399';
  if (t <= 30) return '#a3e635';
  if (t <= 35) return '#fbbf24';
  if (t <= 40) return '#f97316';
  return '#ef4444';
}

function cityAvgTemp(city: CityHourly): number {
  if (!city.hourly.length) return 0;
  const sum = city.hourly.reduce((s, h) => s + h.temperature_c, 0);
  return sum / city.hourly.length;
}

function cityMaxTemp(city: CityHourly): number {
  return Math.max(...city.hourly.map(h => h.temperature_c));
}

export default function OmanTempMap() {
  const { t }                     = useTranslation();
  const [day, setDay]             = useState<'today' | 'tomorrow'>('tomorrow');
  const [cities, setCities]       = useState<CityHourly[]>([]);
  const [date, setDate]           = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    api.weatherMap(day)
      .then(d => { setCities(d.cities); setDate(d.date); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [day]);

  return (
    <div className="card overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.42)' }}>
      <div className="h-0.5 w-full bg-[#01122b] shrink-0" />
      <div className="flex items-center justify-between px-4 h-20">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t('maps.tempMap')}</h2>
          {date && <p className="text-xs text-gray-600">{date}</p>}
        </div>

        {/* Today / Tomorrow toggle */}
        <div className="flex rounded-md overflow-hidden border border-border text-xs font-medium">
          {(['today', 'tomorrow'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`px-3 py-1 transition-colors ${
                day === d ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {t(`maps.${d}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-border/30 animate-pulse m-4 rounded" />
      ) : (
        <MapContainer
          center={[21, 57.5]}
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
          {cities.map(city => {
            const avg  = cityAvgTemp(city);
            const max  = cityMaxTemp(city);
            const color = tempColor(avg);
            return (
              <CircleMarker
                key={city.city}
                center={[city.lat, city.lon]}
                radius={7}
                pathOptions={{
                  fillColor:   color,
                  fillOpacity: 0.9,
                  color:       '#0f1623',
                  weight:      2,
                }}
              >
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -9]}
                  className="map-city-label"
                  opacity={1}
                >
                  {city.city}
                </Tooltip>
                <Popup>
                  <strong>{city.city}</strong><br />
                  <span style={{ color: '#94a3b8' }}>{city.region}</span><br />
                  <span style={{ color }}>Avg {avg.toFixed(1)}°C · Max {max.toFixed(1)}°C</span><br />
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {city.system === 'DTS' ? t('maps.dts') : t('maps.mis')}
                  </span>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}

      {/* Gradient scale legend */}
      <div className="px-4 pt-2.5 pb-2 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-700 font-medium">Temperature (°C)</span>
          <span className="text-[10px] text-gray-600">Daily average</span>
        </div>
        <div
          className="h-3 rounded-full w-full"
          style={{ background: 'linear-gradient(to right, #60a5fa, #34d399, #a3e635, #fbbf24, #f97316, #ef4444)' }}
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>≤ 20</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40</span>
          <span>&gt; 40</span>
        </div>
      </div>

      {/* City temperature breakdown */}
      {!loading && cities.length > 0 && (
        <div className="px-4 pb-3 pt-2.5 border-t border-border">
          <p className="text-[10px] text-gray-700 uppercase tracking-wider font-semibold mb-2">
            City Temperatures
          </p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {[...cities]
              .sort((a, b) => b.lat - a.lat)
              .map(city => {
                const avg   = cityAvgTemp(city);
                const max   = cityMaxTemp(city);
                const color = tempColor(avg);
                return (
                  <div key={city.city}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs text-gray-700 font-medium">{city.city}</span>
                    </div>
                    <p className="ml-3.5 mt-0.5 text-[10px] text-gray-600/80">
                      Avg {avg.toFixed(1)}° · Max {max.toFixed(1)}°C
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
