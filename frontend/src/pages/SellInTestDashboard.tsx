import React, { useMemo, useState } from 'react';
import { exportToExcel } from '../utils/export';

interface SellInTestDashboardProps {
  currentUser?: any;
}

interface SellInRow {
  region: string;
  area: string;
  distributor: string;
  asm: string;
  channel: string;
  sellInTarget: number;
  sellInActual: number;
  growth: number;
  stockCover: number;
  activeOutlets: number;
}

interface FocusRow {
  distributor: string;
  issue: string;
  action: string;
  eta: string;
}

const sellInRows: SellInRow[] = [
  { region: 'South', area: 'HCM Metro', distributor: 'NPP Minh Quân', asm: 'Nguyễn Anh Tú', channel: 'MT', sellInTarget: 1200, sellInActual: 1285, growth: 12.4, stockCover: 18, activeOutlets: 224 },
  { region: 'South', area: 'Mekong 1', distributor: 'NPP Phú Thuận', asm: 'Nguyễn Anh Tú', channel: 'GT', sellInTarget: 920, sellInActual: 910, growth: -1.1, stockCover: 22, activeOutlets: 181 },
  { region: 'North', area: 'HN Urban', distributor: 'NPP Hà Thành', asm: 'Vũ Hoàng Long', channel: 'MT', sellInTarget: 1100, sellInActual: 1168, growth: 8.7, stockCover: 16, activeOutlets: 205 },
  { region: 'North', area: 'Bắc Ninh', distributor: 'NPP Kinh Bắc', asm: 'Vũ Hoàng Long', channel: 'GT', sellInTarget: 830, sellInActual: 764, growth: -6.4, stockCover: 27, activeOutlets: 142 },
  { region: 'Central', area: 'Đà Nẵng', distributor: 'NPP Hải Châu', asm: 'Lâm Văn Phú', channel: 'KA', sellInTarget: 980, sellInActual: 1012, growth: 5.2, stockCover: 19, activeOutlets: 166 },
];

const monthlyTrend = [
  { month: 'Jan', value: 72 },
  { month: 'Feb', value: 78 },
  { month: 'Mar', value: 81 },
  { month: 'Apr', value: 88 },
  { month: 'May', value: 92 },
  { month: 'Jun', value: 97 },
];

const focusList: FocusRow[] = [
  { distributor: 'NPP Kinh Bắc', issue: 'Achievement dưới 95%', action: 'Rà lại SKU core và push đơn mở tháng', eta: '2 ngày' },
  { distributor: 'NPP Phú Thuận', issue: 'Tăng trưởng âm ở GT', action: 'Chạy incentive ngắn hạn cho đội rep', eta: '3 ngày' },
  { distributor: 'NPP Minh Quân', issue: 'Sell-in tốt nhưng stock cover thấp', action: 'Theo dõi refill SKU bán nhanh mỗi 48h', eta: '1 ngày' },
];

const fmt = (value: number) => `${value.toLocaleString('vi-VN')} M`;

export const SellInTestDashboard: React.FC<SellInTestDashboardProps> = ({ currentUser }) => {
  const [region, setRegion] = useState<'All' | 'South' | 'North' | 'Central'>('All');
  const [month, setMonth] = useState('Jun 2026');
  const [view, setView] = useState<'MTD' | 'YTD'>('MTD');

  const filteredRows = useMemo(() => sellInRows.filter((row) => region === 'All' || row.region === region), [region]);

  const summary = useMemo(() => {
    const totalTarget = filteredRows.reduce((sum, row) => sum + row.sellInTarget, 0);
    const totalActual = filteredRows.reduce((sum, row) => sum + row.sellInActual, 0);
    const avgGrowth = filteredRows.reduce((sum, row) => sum + row.growth, 0) / (filteredRows.length || 1);
    const avgStockCover = filteredRows.reduce((sum, row) => sum + row.stockCover, 0) / (filteredRows.length || 1);
    const totalOutlets = filteredRows.reduce((sum, row) => sum + row.activeOutlets, 0);
    return {
      totalTarget,
      totalActual,
      avgGrowth,
      avgStockCover,
      totalOutlets,
      achievement: totalTarget ? (totalActual / totalTarget) * 100 : 0,
    };
  }, [filteredRows]);

  const channelMix = useMemo(() => {
    const totals = filteredRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.channel] = (acc[row.channel] || 0) + row.sellInActual;
      return acc;
    }, {});
    const overall = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;
    return [
      { label: 'MT', value: Math.round(((totals.MT || 0) / overall) * 100), color: 'var(--cj-blue)' },
      { label: 'GT', value: Math.round(((totals.GT || 0) / overall) * 100), color: 'var(--cj-orange)' },
      { label: 'KA', value: Math.round(((totals.KA || 0) / overall) * 100), color: 'var(--cj-red)' },
    ];
  }, [filteredRows]);

  const handleExportExcel = () => {
    exportToExcel(
      filteredRows.map((row) => {
        const achievement = row.sellInTarget ? (row.sellInActual / row.sellInTarget) * 100 : 0;
        return {
          Region: row.region,
          Area: row.area,
          Distributor: row.distributor,
          ASM: row.asm,
          Channel: row.channel,
          Target: row.sellInTarget,
          Actual: row.sellInActual,
          Achievement: `${achievement.toFixed(1)}%`,
          Growth: `${row.growth >= 0 ? '+' : ''}${row.growth}%`,
          'Stock cover': `${row.stockCover} ngày`,
          Outlets: row.activeOutlets,
        };
      }),
      `sellin-test-${region.toLowerCase()}-${month.toLowerCase().replace(/\s+/g, '-')}`
    );
  };

  return (
    <div>
      <div className="workspace-header">
        <div>
          <h1 className="header-title">Sellin Test Dashboard</h1>
          <p className="header-meta">Làm sát layout ảnh hơn với bộ lọc trái, dải KPI, chart trend, bảng distributor performance và khối focus action.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleExportExcel}>Export Excel</button>
          <button className="btn" style={{ background: 'linear-gradient(90deg, var(--cj-orange), #ea580c)', color: '#fff' }}>Share snapshot</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <aside className="pbi-card" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <div className="panel-title" style={{ marginBottom: '1rem' }}>Dashboard Filter</div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>Month</span>
              <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>Jun 2026</option>
                <option>May 2026</option>
                <option>Apr 2026</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>View</span>
              <select value={view} onChange={(e) => setView(e.target.value as 'MTD' | 'YTD')} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>MTD</option>
                <option>YTD</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700 }}>Region</span>
              <select value={region} onChange={(e) => setRegion(e.target.value as 'All' | 'South' | 'North' | 'Central')} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>All</option>
                <option>South</option>
                <option>North</option>
                <option>Central</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '14px', background: '#fff7ed', border: '1px solid #fdba74' }}>
            <div className="pbi-card-title">Selected KPI</div>
            <div className="pbi-card-value">{summary.achievement.toFixed(1)}%</div>
            <div className="pbi-card-sub">Sell-in Achievement • {view} • {month}</div>
          </div>

          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total target</span><strong>{fmt(summary.totalTarget)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total actual</span><strong>{fmt(summary.totalActual)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Avg growth</span><strong>{summary.avgGrowth.toFixed(1)}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Stock cover</span><strong>{summary.avgStockCover.toFixed(1)} ngày</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Active outlets</span><strong>{summary.totalOutlets}</strong></div>
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <div className="pbi-card pbi-card-accent-orange"><div className="pbi-card-title">Sell-in target</div><div className="pbi-card-value">{fmt(summary.totalTarget)}</div><div className="pbi-card-sub">Planned monthly target</div></div>
            <div className="pbi-card pbi-card-accent-blue"><div className="pbi-card-title">Sell-in actual</div><div className="pbi-card-value">{fmt(summary.totalActual)}</div><div className="pbi-card-sub">Current achieved volume</div></div>
            <div className="pbi-card pbi-card-accent-red"><div className="pbi-card-title">Growth vs LM</div><div className="pbi-card-value">{summary.avgGrowth.toFixed(1)}%</div><div className="pbi-card-sub">Weighted by region</div></div>
            <div className="pbi-card pbi-card-accent-blue"><div className="pbi-card-title">Active outlets</div><div className="pbi-card-value">{summary.totalOutlets}</div><div className="pbi-card-sub">Buying outlets in scope</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }}>
            <div className="pbi-card">
              <div className="pbi-card-title">Monthly sell-in trend</div>
              <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem', height: '240px', marginTop: '1rem' }}>
                {monthlyTrend.map((item) => (
                  <div key={item.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'end', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{item.value}%</div>
                    <div style={{ width: '100%', maxWidth: '54px', height: `${item.value * 1.8}px`, borderRadius: '10px 10px 4px 4px', background: 'linear-gradient(180deg, #fdba74, #f97316)' }}></div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.month}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="pbi-card">
                <div className="pbi-card-title">Channel mix</div>
                <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                  {channelMix.map((item) => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 600 }}>
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="pbi-data-bar-bg">
                        <div className="pbi-data-bar-fill" style={{ width: `${item.value}%`, background: item.color }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pbi-card">
                <div className="pbi-card-title">Focus action</div>
                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.9rem' }}>
                  {focusList.map((item) => (
                    <div key={item.distributor} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.85rem' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item.distributor}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>{item.issue}</div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>{item.action}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--cj-orange)', fontWeight: 700 }}>ETA: {item.eta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pbi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div className="pbi-card-title">Sell-in distributor performance</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>User: {currentUser?.name || 'Demo User'}</div>
            </div>
            <div className="table-responsive">
              <table className="pbi-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Area</th>
                    <th>Distributor</th>
                    <th>ASM</th>
                    <th>Channel</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Achievement</th>
                    <th>Growth</th>
                    <th>Stock cover</th>
                    <th>Outlets</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const achievement = row.sellInTarget ? (row.sellInActual / row.sellInTarget) * 100 : 0;
                    return (
                      <tr key={`${row.region}-${row.distributor}`}>
                        <td><strong>{row.region}</strong></td>
                        <td>{row.area}</td>
                        <td>{row.distributor}</td>
                        <td>{row.asm}</td>
                        <td>{row.channel}</td>
                        <td>{fmt(row.sellInTarget)}</td>
                        <td>{fmt(row.sellInActual)}</td>
                        <td>
                          <div className="pbi-data-bar-container">
                            <span className="pbi-data-bar-label">{achievement.toFixed(1)}%</span>
                            <div className="pbi-data-bar-bg"><div className="pbi-data-bar-fill pbi-data-bar-fill-orange" style={{ width: `${Math.min(achievement, 120)}%` }}></div></div>
                          </div>
                        </td>
                        <td>
                          <span className={`pbi-growth-badge ${row.growth >= 0 ? 'pbi-growth-up' : 'pbi-growth-down'}`}>
                            {row.growth >= 0 ? '+' : ''}{row.growth}%
                          </span>
                        </td>
                        <td>{row.stockCover} ngày</td>
                        <td>{row.activeOutlets}</td>
                      </tr>
                    );
                  })}
                  <tr className="pbi-table-total">
                    <td colSpan={5}>TOTAL</td>
                    <td>{fmt(summary.totalTarget)}</td>
                    <td>{fmt(summary.totalActual)}</td>
                    <td>{summary.achievement.toFixed(1)}%</td>
                    <td>{summary.avgGrowth.toFixed(1)}%</td>
                    <td>{summary.avgStockCover.toFixed(1)} ngày</td>
                    <td>{summary.totalOutlets}</td>
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
