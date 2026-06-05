import React, { useMemo, useState } from 'react';
import { exportToExcel } from '../utils/export';

interface ReportFormsLabProps {
  currentUser?: any;
}

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  accent: 'blue' | 'orange' | 'red';
}

interface TeamRow {
  id: string;
  region: string;
  area: string;
  asm: string;
  supervisor: string;
  rep: string;
  routeAdherence: number;
  sellIn: number;
  sellOut: number;
  productivity: number;
  strikeRate: number;
  oos: number;
  visitsDone: number;
  visitsPlan: number;
}

interface RankRow {
  name: string;
  title: string;
  score: number;
  achievement: string;
  region: string;
}

const summaryCards: KpiCard[] = [
  { label: 'Total Headcount', value: '148', sub: '12 ASM • 34 SUP • 102 REP', accent: 'blue' },
  { label: 'Sales Force Productivity', value: '87.4%', sub: '+3.2 pts vs last month', accent: 'orange' },
  { label: 'Total Sell-out', value: '5,190 M', sub: '96.8% target completion', accent: 'red' },
  { label: 'Route Adherence', value: '91.5%', sub: '1,286 / 1,405 tuyến', accent: 'blue' },
  { label: 'Strike Rate', value: '74.8%', sub: 'Tỷ lệ outlet có đơn hàng', accent: 'orange' },
  { label: 'OSA / OOS Control', value: '95.1%', sub: 'OOS bình quân 4.9%', accent: 'red' },
];

const teamRows: TeamRow[] = [
  {
    id: 'S-01',
    region: 'South',
    area: 'HCM Metro',
    asm: 'Nguyễn Anh Tú',
    supervisor: 'Trần Bảo Khánh',
    rep: 'Lê Quốc Minh',
    routeAdherence: 95,
    sellIn: 1180,
    sellOut: 1240,
    productivity: 92,
    strikeRate: 79,
    oos: 3,
    visitsDone: 124,
    visitsPlan: 131,
  },
  {
    id: 'S-02',
    region: 'South',
    area: 'Mekong 1',
    asm: 'Nguyễn Anh Tú',
    supervisor: 'Phạm Nhật Hưng',
    rep: 'Ngô Minh Khoa',
    routeAdherence: 88,
    sellIn: 910,
    sellOut: 980,
    productivity: 84,
    strikeRate: 71,
    oos: 6,
    visitsDone: 97,
    visitsPlan: 110,
  },
  {
    id: 'N-01',
    region: 'North',
    area: 'HN Urban',
    asm: 'Vũ Hoàng Long',
    supervisor: 'Đặng Hải Yến',
    rep: 'Phan Đức Hiếu',
    routeAdherence: 93,
    sellIn: 1070,
    sellOut: 1115,
    productivity: 89,
    strikeRate: 76,
    oos: 4,
    visitsDone: 119,
    visitsPlan: 128,
  },
  {
    id: 'N-02',
    region: 'North',
    area: 'Bắc Ninh',
    asm: 'Vũ Hoàng Long',
    supervisor: 'Bùi Thanh Tùng',
    rep: 'Đỗ Gia Bảo',
    routeAdherence: 79,
    sellIn: 760,
    sellOut: 820,
    productivity: 76,
    strikeRate: 64,
    oos: 9,
    visitsDone: 88,
    visitsPlan: 111,
  },
  {
    id: 'C-01',
    region: 'Central',
    area: 'Đà Nẵng',
    asm: 'Lâm Văn Phú',
    supervisor: 'Nguyễn Thu Thủy',
    rep: 'Trương Hải Nam',
    routeAdherence: 90,
    sellIn: 990,
    sellOut: 1035,
    productivity: 87,
    strikeRate: 74,
    oos: 5,
    visitsDone: 102,
    visitsPlan: 113,
  },
];

const topPerformers: RankRow[] = [
  { name: 'Lê Quốc Minh', title: 'Sales Rep', score: 96, achievement: '108% target', region: 'South' },
  { name: 'Phan Đức Hiếu', title: 'Sales Rep', score: 93, achievement: '104% target', region: 'North' },
  { name: 'Trương Hải Nam', title: 'Sales Rep', score: 89, achievement: '101% target', region: 'Central' },
];

const underPerformers: RankRow[] = [
  { name: 'Đỗ Gia Bảo', title: 'Sales Rep', score: 71, achievement: '82% target', region: 'North' },
  { name: 'Ngô Minh Khoa', title: 'Sales Rep', score: 78, achievement: '88% target', region: 'South' },
  { name: 'Hoàng Nam Sơn', title: 'Sales Rep', score: 80, achievement: '90% target', region: 'Central' },
];

const weeklyTrend = [
  { week: 'W19', sellOut: 72, productivity: 78, route: 84 },
  { week: 'W20', sellOut: 85, productivity: 82, route: 88 },
  { week: 'W21', sellOut: 78, productivity: 80, route: 86 },
  { week: 'W22', sellOut: 91, productivity: 87, route: 90 },
  { week: 'W23', sellOut: 88, productivity: 85, route: 89 },
  { week: 'W24', sellOut: 96, productivity: 90, route: 92 },
];

const actionPlans = [
  { owner: 'SUP Bắc Ninh', issue: 'Route adherence dưới 80%', action: 'Re-check tuyến bị lệch và chốt lại plan tuần', eta: '2 ngày' },
  { owner: 'ASM South', issue: 'OOS tăng ở MT key accounts', action: 'Phối hợp NPP refill SKU bán nhanh', eta: '1 ngày' },
  { owner: 'Trade team', issue: 'POSM launch chưa phủ đủ', action: 'Bổ sung wobbler / shelf-strip cho 12 outlet', eta: '3 ngày' },
];

const accentClassMap: Record<KpiCard['accent'], string> = {
  blue: 'pbi-card-accent-blue',
  orange: 'pbi-card-accent-orange',
  red: 'pbi-card-accent-red',
};

const fmtCurrencyShort = (value: number) => `${value.toLocaleString('vi-VN')} M`;

export const ReportFormsLab: React.FC<ReportFormsLabProps> = ({ currentUser }) => {
  const [region, setRegion] = useState<'All' | 'South' | 'North' | 'Central'>('All');
  const [kpiType, setKpiType] = useState<'Sell-out' | 'Route Adherence' | 'Productivity'>('Sell-out');
  const [level, setLevel] = useState<'Rep' | 'Supervisor' | 'ASM'>('Rep');
  const [month, setMonth] = useState('June 2026');

  const filteredRows = useMemo(() => teamRows.filter((row) => region === 'All' || row.region === region), [region]);

  const summary = useMemo(() => {
    const count = filteredRows.length || 1;
    const totalSellIn = filteredRows.reduce((sum, row) => sum + row.sellIn, 0);
    const totalSellOut = filteredRows.reduce((sum, row) => sum + row.sellOut, 0);
    const avgRoute = filteredRows.reduce((sum, row) => sum + row.routeAdherence, 0) / count;
    const avgProductivity = filteredRows.reduce((sum, row) => sum + row.productivity, 0) / count;
    const avgStrikeRate = filteredRows.reduce((sum, row) => sum + row.strikeRate, 0) / count;
    const avgOos = filteredRows.reduce((sum, row) => sum + row.oos, 0) / count;
    const visitDone = filteredRows.reduce((sum, row) => sum + row.visitsDone, 0);
    const visitPlan = filteredRows.reduce((sum, row) => sum + row.visitsPlan, 0);
    return { totalSellIn, totalSellOut, avgRoute, avgProductivity, avgStrikeRate, avgOos, visitDone, visitPlan };
  }, [filteredRows]);

  const highlightedMetric = {
    'Sell-out': fmtCurrencyShort(summary.totalSellOut),
    'Route Adherence': `${summary.avgRoute.toFixed(1)}%`,
    Productivity: `${summary.avgProductivity.toFixed(1)}%`,
  }[kpiType];

  const routeSnapshot = [
    { label: 'Completed routes', value: Math.round((summary.visitDone / summary.visitPlan) * 100) },
    { label: 'Outlet coverage', value: Math.round(summary.avgStrikeRate + 12) },
    { label: 'Planogram score', value: Math.round(summary.avgProductivity - 4) },
    { label: 'OSA control', value: Math.round(100 - summary.avgOos) },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      filteredRows.map((row) => ({
        Region: row.region,
        Area: row.area,
        ASM: row.asm,
        Supervisor: row.supervisor,
        Rep: row.rep,
        Visit: `${row.visitsDone}/${row.visitsPlan}`,
        'Route %': `${row.routeAdherence}%`,
        'Sell-in': row.sellIn,
        'Sell-out': row.sellOut,
        Productivity: `${row.productivity}%`,
        'Strike rate': `${row.strikeRate}%`,
        OOS: `${row.oos}%`,
      })),
      `sales-force-kpi-${region.toLowerCase()}-${month.toLowerCase().replace(/\s+/g, '-')}`
    );
  };

  return (
    <div>
      <div className="workspace-header">
        <div>
          <h1 className="header-title">Sales Force & KPI Dashboard</h1>
          <p className="header-meta">Bổ sung thêm các khối dữ liệu chính để sát mẫu hơn: KPI summary, trend, ranking, action plan và bảng KPI chi tiết.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleExportExcel}>Export Excel</button>
          <button className="btn" style={{ background: 'linear-gradient(90deg, var(--cj-blue), #1d4ed8)', color: '#fff' }}>Share dashboard</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <aside className="pbi-card" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <div className="panel-title" style={{ marginBottom: '1rem' }}>Dashboard Filter</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>Date</span>
              <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>June 2026</option>
                <option>May 2026</option>
                <option>April 2026</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>KPI Type</span>
              <select value={kpiType} onChange={(e) => setKpiType(e.target.value as 'Sell-out' | 'Route Adherence' | 'Productivity')} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>Sell-out</option>
                <option>Route Adherence</option>
                <option>Productivity</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>Region</span>
              <select value={region} onChange={(e) => setRegion(e.target.value as 'All' | 'South' | 'North' | 'Central')} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>All</option>
                <option>South</option>
                <option>North</option>
                <option>Central</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>Level</span>
              <select value={level} onChange={(e) => setLevel(e.target.value as 'Rep' | 'Supervisor' | 'ASM')} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>Rep</option>
                <option>Supervisor</option>
                <option>ASM</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '14px', background: '#f8fbff', border: '1px solid #dbeafe' }}>
            <div className="pbi-card-title">Selected KPI</div>
            <div className="pbi-card-value">{highlightedMetric}</div>
            <div className="pbi-card-sub">{kpiType} • {region} • {month}</div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
            <div className="pbi-card-title">Quick Summary</div>
            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Visit done</span><strong>{summary.visitDone}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Visit plan</span><strong>{summary.visitPlan}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total sell-in</span><strong>{fmtCurrencyShort(summary.totalSellIn)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total sell-out</span><strong>{fmtCurrencyShort(summary.totalSellOut)}</strong></div>
            </div>
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {summaryCards.map((item) => (
              <div key={item.label} className={`pbi-card ${accentClassMap[item.accent]}`}>
                <div className="pbi-card-title">{item.label}</div>
                <div className="pbi-card-value">{item.value}</div>
                <div className="pbi-card-sub">{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.5rem' }}>
            <div className="pbi-card">
              <div className="pbi-card-title">Weekly trend by KPI</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem', height: '250px', marginTop: '1rem' }}>
                {weeklyTrend.map((item) => {
                  const metricValue = kpiType === 'Sell-out' ? item.sellOut : kpiType === 'Route Adherence' ? item.route : item.productivity;
                  return (
                    <div key={item.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'end', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>{metricValue}%</div>
                      <div style={{ width: '100%', maxWidth: '56px', height: `${metricValue * 1.8}px`, borderRadius: '10px 10px 4px 4px', background: 'linear-gradient(180deg, #60a5fa, #1d4ed8)' }}></div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.week}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pbi-card">
              <div className="pbi-card-title">Route compliance snapshot</div>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                {routeSnapshot.map((item) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 600 }}>
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="pbi-data-bar-bg">
                      <div className="pbi-data-bar-fill pbi-data-bar-fill-blue" style={{ width: `${item.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div className="pbi-card-title">Execution notes</div>
                <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>North region đang hụt route adherence do lệch tuyến ở khu vực Bắc Ninh.</li>
                  <li>South giữ sell-out tốt nhờ MT key accounts tăng trưởng tuần W24.</li>
                  <li>Central ổn định nhưng strike rate còn dưới mục tiêu 78%.</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div className="pbi-card">
              <div className="pbi-card-title">Top performers</div>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.9rem' }}>
                {topPerformers.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.title} • {item.region}</div>
                    </div>
                    <div className="pbi-growth-badge pbi-growth-up">{item.achievement}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pbi-card">
              <div className="pbi-card-title">Need attention</div>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.9rem' }}>
                {underPerformers.map((item) => (
                  <div key={item.name} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>!</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.title} • {item.region}</div>
                    </div>
                    <div className="pbi-growth-badge pbi-growth-down">{item.achievement}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pbi-card">
              <div className="pbi-card-title">Action plan tracker</div>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.9rem' }}>
                {actionPlans.map((item) => (
                  <div key={item.owner} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.85rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{item.owner}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>{item.issue}</div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>{item.action}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--cj-blue)', fontWeight: 700 }}>ETA: {item.eta}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pbi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div className="pbi-card-title">Regional sales / KPI details</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Viewing by {level} • User: {currentUser?.name || 'Demo User'}</div>
            </div>
            <div className="table-responsive">
              <table className="pbi-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Area</th>
                    <th>ASM</th>
                    <th>Supervisor</th>
                    <th>Rep</th>
                    <th>Visit</th>
                    <th>Route %</th>
                    <th>Sell-in</th>
                    <th>Sell-out</th>
                    <th>Productivity</th>
                    <th>Strike rate</th>
                    <th>OOS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.region}</strong></td>
                      <td>{row.area}</td>
                      <td>{row.asm}</td>
                      <td>{row.supervisor}</td>
                      <td>{row.rep}</td>
                      <td>{row.visitsDone}/{row.visitsPlan}</td>
                      <td>
                        <div className="pbi-data-bar-container">
                          <span className="pbi-data-bar-label">{row.routeAdherence}%</span>
                          <div className="pbi-data-bar-bg"><div className="pbi-data-bar-fill pbi-data-bar-fill-blue" style={{ width: `${row.routeAdherence}%` }}></div></div>
                        </div>
                      </td>
                      <td>{fmtCurrencyShort(row.sellIn)}</td>
                      <td>{fmtCurrencyShort(row.sellOut)}</td>
                      <td>{row.productivity}%</td>
                      <td>{row.strikeRate}%</td>
                      <td>{row.oos}%</td>
                    </tr>
                  ))}
                  <tr className="pbi-table-total">
                    <td colSpan={5}>TOTAL</td>
                    <td>{summary.visitDone}/{summary.visitPlan}</td>
                    <td>{summary.avgRoute.toFixed(1)}%</td>
                    <td>{fmtCurrencyShort(summary.totalSellIn)}</td>
                    <td>{fmtCurrencyShort(summary.totalSellOut)}</td>
                    <td>{summary.avgProductivity.toFixed(1)}%</td>
                    <td>{summary.avgStrikeRate.toFixed(1)}%</td>
                    <td>{summary.avgOos.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
