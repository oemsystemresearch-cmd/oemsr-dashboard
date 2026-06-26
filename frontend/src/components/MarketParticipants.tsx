import { useTranslation } from 'react-i18next';

type UnitType = 'CCGT' | 'OCGT' | 'PV';
interface PlantUnit { name: string; mw: number; type: UnitType; }

const TYPE_COLOR: Record<UnitType, string> = {
  CCGT: '#93c5fd',
  OCGT: '#fdba74',
  PV:   '#fcd34d',
};

function fmtMw(mw: number): string {
  return mw.toLocaleString('en-OM', { maximumFractionDigits: 2 });
}

// Sohar I–II listed before Sohar III per user preference
const PLANT_GROUPS: {
  id: string; label: string; capacity: string; units: PlantUnit[];
}[] = [
  {
    id: 'sohar12', label: 'Sohar (I–II)',
    capacity: '1,141.5 MW',
    units: [
      { name: 'Sohar I',  mw: 405.0,  type: 'CCGT' },
      { name: 'Sohar II', mw: 736.5,  type: 'CCGT' },
    ],
  },
  {
    id: 'sohar3', label: 'Sohar III',
    capacity: '1,710 MW',
    units: [{ name: 'Sohar III', mw: 1710, type: 'CCGT' }],
  },
  {
    id: 'barka', label: 'Barka (I–III)',
    capacity: '1,857.4 MW',
    units: [
      { name: 'Barka I',   mw: 412.0,  type: 'CCGT' },
      { name: 'Barka II',  mw: 708.9,  type: 'CCGT' },
      { name: 'Barka III', mw: 736.5,  type: 'CCGT' },
    ],
  },
  {
    id: 'rusail', label: 'Rusail',
    capacity: '184.6 MW',
    units: [{ name: 'Al Rusail 1', mw: 184.6, type: 'OCGT' }],
  },
  {
    id: 'ibri', label: 'Ibri (I–II)',
    capacity: '2,009 MW',
    units: [
      { name: 'Ibri 1',       mw: 1509, type: 'CCGT' },
      { name: 'Ibri 2 Solar', mw: 500,  type: 'PV'   },
    ],
  },
  {
    id: 'manah', label: 'Manah',
    capacity: '1,253.83 MW',
    units: [
      { name: 'Manah Power',   mw: 253.83, type: 'OCGT' },
      { name: 'Manah 1 Solar', mw: 500,    type: 'PV'   },
      { name: 'Manah 2 Solar', mw: 500,    type: 'PV'   },
    ],
  },
  {
    id: 'sur', label: 'Sur I',
    capacity: '1,981.8 MW',
    units: [{ name: 'Sur 1', mw: 1981.8, type: 'CCGT' }],
  },
];

const BADGE_BG = '#e2e8f0';

export default function MarketParticipants() {
  const { t } = useTranslation();
  return (
    <div className="card overflow-hidden">
      <div className="h-0.5 w-full bg-[#01122b]" />
      <div className="px-4 pt-4 pb-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
        {t('participants.title')}
        <span className="font-normal text-gray-600 ml-1">{t('participants.capacityNote')}</span>
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {PLANT_GROUPS.map((pg, i) => (
          <div key={pg.id}>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-600 shrink-0"
                style={{ background: BADGE_BG, border: '1px solid #cbd5e1' }}
              >
                {i + 1}
              </span>
              <span className="text-xs text-gray-800 font-medium">{pg.label}</span>
              <span className="text-[10px] text-gray-500 ml-auto shrink-0 tabular-nums">{pg.capacity}</span>
            </div>
            <div className="ml-6 mt-0.5 flex items-center gap-1.5 overflow-hidden">
              {pg.units.map((u, j) => (
                <span key={u.name} className="inline-flex items-center gap-1 shrink-0">
                  {j > 0 && <span className="text-gray-300">·</span>}
                  <span
                    className="px-1 py-px rounded text-[8px] font-semibold"
                    style={{ color: TYPE_COLOR[u.type], background: `${TYPE_COLOR[u.type]}1a` }}
                  >
                    {u.type}
                  </span>
                  <span className="text-[10px] text-gray-600 tabular-nums">{fmtMw(u.mw)}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
