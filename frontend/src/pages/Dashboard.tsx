import React from 'react';
import { SkeletonStatsGrid } from '../components/Skeleton';
import { exportToExcel, formatCurrency } from '../utils/export';

interface DashboardProps {
  data: any;
  setTab: (tab: string) => void;
  setSelectedVisitId: (id: number | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, setTab, setSelectedVisitId }) => {
  const summary = data?.summary || {};
  const regionBreakdown = data?.regionBreakdown || {};
  const visits = data?.recentVisits || [];
  const isLoading = !data;

  // Skeleton loading state
  if (isLoading) {
    return (
      <div>
        <div className="workspace-header">
          <div>
            <h1 className="header-title">Bảng Tổng Quan Thị Trường</h1>
            <p className="header-meta">Đang tải dữ liệu...</p>
          </div>
        </div>
        <SkeletonStatsGrid count={4} />
      </div>
    );
  }

  const handleViewVisitDetail = (id: number) => {
    setSelectedVisitId(id);
    setTab('visits');
  };

  const handleExportRecentVisits = () => {
    exportToExcel(
      visits.slice(0, 5).map((visit: any) => ({
        'Cửa hàng': visit.store_name || visit.storeName || 'N/A',
        'Nhân viên': visit.user_name || visit.userName || 'N/A',
        'Thời gian': visit.visit_date || 'N/A',
        'Đạt chuẩn': `${visit.compliance_rate || visit.complianceRate || 0}%`,
      })),
      'dashboard-recent-visits'
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="workspace-header">
        <div>
          <h1 className="header-title">Bảng Tổng Quan Thị Trường</h1>
          <p className="header-meta">
            {summary.filterYear && summary.filterMonth 
              ? `Dữ liệu tháng ${summary.filterMonth}/${summary.filterYear}`
              : 'Dữ liệu cập nhật theo thời gian thực'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExportRecentVisits}>
            Export Excel
          </button>
          <button className="btn btn-outline" onClick={() => window.location.reload()}>
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card card-accent-blue">
          <div className="card-title">Tổng Doanh Thu</div>
          <div className="card-value">
            {formatCurrency(summary.totalRevenue || 0)}
          </div>
          <div className="card-sub">
            {summary.nppCount || 0} NPP hoạt động
          </div>
        </div>

        <div className="card card-accent-orange">
          <div className="card-title">Doanh Thu MIỀN NAM</div>
          <div className="card-value">
            {formatCurrency(regionBreakdown['MIỀN NAM'] || 0)}
          </div>
          <div className="card-sub">Khu vực phía Nam</div>
        </div>

        <div className="card card-accent-blue">
          <div className="card-title">Doanh Thu MIỀN BẮC</div>
          <div className="card-value">
            {formatCurrency(regionBreakdown['MIỀN BẮC'] || 0)}
          </div>
          <div className="card-sub">Khu vực phía Bắc</div>
        </div>

        <div className="card card-accent-red">
          <div className="card-title">Sản Phẩm Đang Bán</div>
          <div className="card-value">
            {summary.productCount || 0}
          </div>
          <div className="card-sub">SKU đang hoạt động</div>
        </div>
      </div>

      {/* Revenue Comparison */}
      <div className="pbi-card" style={{ marginBottom: '2rem' }}>
        <div className="pbi-card-title">SO SÁNH DOANH THU THEO KHU VỰC</div>
        
        {/* MIỀN NAM Bar */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--cj-blue)' }}>MIỀN NAM</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(regionBreakdown['MIỀN NAM'] || 0)}</span>
          </div>
          <div className="share-track">
            <div 
              className="share-fill" 
              style={{ 
                width: '100%',
                background: 'linear-gradient(90deg, #51a4e7, var(--cj-blue))'
              }}
            />
          </div>
        </div>

        {/* MIỀN BẮC Bar */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--cj-orange)' }}>MIỀN BẮC</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(regionBreakdown['MIỀN BẮC'] || 0)}</span>
          </div>
          <div className="share-track">
            <div 
              className="share-fill" 
              style={{ 
                width: `${regionBreakdown['MIỀN NAM'] ? Math.round((regionBreakdown['MIỀN BẮC'] || 0) / regionBreakdown['MIỀN NAM'] * 100) : 0}%`,
                background: 'linear-gradient(90deg, #fbbd73, var(--cj-orange))'
              }}
            />
          </div>
        </div>
      </div>

      {/* Coverage & Market Penetration (Mock Data) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="panel-title">Độ Phủ Điểm Bán (Coverage) & Kênh Phân Phối (Mockup)</h2>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Overall POS Coverage */}
          <div style={{ flex: '1 1 300px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#252423' }}>Tổng quan Điểm bán (ASO)</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cj-blue)', lineHeight: 1 }}>112,500</div>
                <div style={{ fontSize: '0.85rem', color: '#605e5c', marginTop: '4px' }}>Điểm bán đang hoạt động / 150,000 (Tổng)</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>75%</div>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem' }}>
              <div style={{ width: '75%', height: '100%', background: '#10b981' }}></div>
            </div>
            <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#605e5c', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hoạt động trên tuyến: <strong>95%</strong></span>
              <span>Off-route: <strong>5%</strong></span>
            </div>
          </div>

          {/* By Channel */}
          <div style={{ flex: '1 1 300px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#252423' }}>Phân bổ theo Kênh (Channel)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'GT (General Trade)', pct: 85, color: '#3b82f6' },
                { name: 'MT (Modern Trade)', pct: 10, color: '#f97316' },
                { name: 'KR + DTC', pct: 2, color: '#8b5cf6' },
                { name: 'B2B', pct: 2, color: '#10b981' },
                { name: 'ECOM', pct: 1, color: '#ec4899' },
              ].map(ch => (
                <div key={ch.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ width: '130px', fontWeight: 600 }}>{ch.name}</div>
                  <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', margin: '0 10px', overflow: 'hidden' }}>
                    <div style={{ width: `${ch.pct}%`, height: '100%', background: ch.color }}></div>
                  </div>
                  <div style={{ width: '35px', textAlign: 'right', fontWeight: 700 }}>{ch.pct}%</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* By Region/Area */}
          <div style={{ flex: '1 1 300px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#252423' }}>Phân bổ theo Khu vực</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Hồ Chí Minh', val: 33750, pct: 30, color: '#eab308' },
                { name: 'Hà Nội', val: 28125, pct: 25, color: '#06b6d4' },
                { name: 'Cần Thơ', val: 16875, pct: 15, color: '#84cc16' },
                { name: 'Đà Nẵng', val: 11250, pct: 10, color: '#f43f5e' },
                { name: 'Khác', val: 22500, pct: 20, color: '#94a3b8' },
              ].map(ar => (
                <div key={ar.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ width: '100px', fontWeight: 600 }}>{ar.name}</div>
                  <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', margin: '0 10px', overflow: 'hidden' }}>
                    <div style={{ width: `${ar.pct}%`, height: '100%', background: ar.color }}></div>
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', fontWeight: 700 }}>{ar.val.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* By Category */}
          <div style={{ flex: '1 1 300px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#252423' }}>Độ phủ theo Ngành hàng</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Nước sốt (Sauce)', pct: 40, color: '#ef4444' },
                { name: 'Bánh/Wrap/Dumpling', pct: 30, color: '#f59e0b' },
                { name: 'Snack/Rong biển', pct: 15, color: '#10b981' },
                { name: 'Nước giải khát', pct: 10, color: '#3b82f6' },
                { name: 'Kimchi', pct: 5, color: '#d946ef' },
              ].map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ width: '130px', fontWeight: 600 }}>{cat.name}</div>
                  <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', margin: '0 10px', overflow: 'hidden' }}>
                    <div style={{ width: `${cat.pct}%`, height: '100%', background: cat.color }}></div>
                  </div>
                  <div style={{ width: '35px', textAlign: 'right', fontWeight: 700 }}>{cat.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Visits */}
      <div className="card">
        <h2 className="panel-title">
          <span>Lượt Viếng Thăm Gần Đây</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleExportRecentVisits}>
              Export Excel
            </button>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--cj-blue)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              onClick={() => setTab('visits')}
            >
              Xem tất cả →
            </button>
          </div>
        </h2>
        {visits.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Cửa hàng</th>
                  <th>Nhân viên</th>
                  <th>Thời gian</th>
                  <th>Đạt chuẩn</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visits.slice(0, 5).map((visit: any, idx: number) => (
                  <tr key={`visit-${visit.id ?? idx}-${idx}`}>
                    <td><strong>{visit.store_name || visit.storeName || 'N/A'}</strong></td>
                    <td>{visit.user_name || visit.userName || 'N/A'}</td>
                    <td>{visit.visit_date || 'N/A'}</td>
                    <td>
                      <span className={`badge ${(visit.compliance_rate || visit.complianceRate || 0) >= 80 ? 'badge-success' : 'badge-warning'}`}>
                        {visit.compliance_rate || visit.complianceRate || 0}%
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleViewVisitDetail(visit.id)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Chưa có lượt viếng thăm nào</p>
          </div>
        )}
      </div>
    </div>
  );
};
