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
