import React, { useState, useEffect } from 'react';
import { exportToExcel } from '../utils/export';

interface Visit {
  id: number;
  store_name: string;
  store_code: string;
  user_name: string;
  visit_date: string;
  check_in_time: string;
  check_out_time: string | null;
  compliance_rate: number;
  notes: string;
  shelf_image_url: string;
}

interface VisitDetail {
  id: number;
  name: string;
  brand: string;
  code: string;
  is_oos: boolean;
  share_of_shelf: number;
  actual_price: number;
}

interface CompetitorIntel {
  id: number;
  competitor_brand: string;
  intel_type: string;
  description: string;
  image_url: string | null;
}

interface DetailedVisitResponse {
  visit: Visit;
  details: VisitDetail[];
  competitorIntel: CompetitorIntel[];
}

interface VisitsProps {
  visits: Visit[];
  apiUrl: string;
  selectedVisitId: number | null;
  setSelectedVisitId: (id: number | null) => void;
}

export const Visits: React.FC<VisitsProps> = ({ visits, apiUrl, selectedVisitId, setSelectedVisitId }) => {
  const [detailedVisit, setDetailedVisit] = useState<DetailedVisitResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch visit details when selectedVisitId changes
  useEffect(() => {
    if (selectedVisitId) {
      setLoadingDetail(true);
      fetch(`${apiUrl}/api/visits/${selectedVisitId}`)
        .then(res => res.json())
        .then(data => {
          setDetailedVisit(data);
          setLoadingDetail(false);
        })
        .catch(err => {
          console.error('Error fetching visit details:', err);
          setLoadingDetail(false);
        });
    } else {
      setDetailedVisit(null);
    }
  }, [selectedVisitId, apiUrl]);

  const handleExportVisits = () => {
    exportToExcel(
      visits.map((visit) => ({
        'Ngày viếng thăm': new Date(visit.visit_date).toLocaleDateString('vi-VN'),
        'Điểm bán': visit.store_name,
        'Mã cửa hàng': visit.store_code,
        'Nhân viên': visit.user_name,
        'Check-in': new Date(visit.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        'Check-out': visit.check_out_time ? new Date(visit.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        'Độ tuân thủ POSM': `${visit.compliance_rate}%`,
        'Trạng thái': visit.check_out_time ? 'Đã hoàn tất' : 'Đang thực hiện',
      })),
      'visits-list'
    );
  };

  const handleExportVisitDetails = () => {
    if (!detailedVisit) return;
    exportToExcel(
      detailedVisit.details.map((detail) => ({
        'Sản phẩm': detail.name,
        'Thương hiệu': detail.brand,
        'Tình trạng': detail.is_oos ? 'Đứt hàng' : 'Còn hàng',
        'Kệ trưng bày': detail.is_oos ? '0%' : `${detail.share_of_shelf}%`,
        'Giá bán thực tế': detail.actual_price,
      })),
      `visit-detail-${detailedVisit.visit.store_code}`
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="workspace-header">
        <div>
          <h1 className="header-title">Nhật Ký Viếng Thăm</h1>
          <p className="header-meta">Lịch sử check-in, giám sát trưng bày quầy kệ và đối thủ cạnh tranh</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExportVisits}>Export Excel</button>
        </div>
      </div>

      {/* Visits List */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày viếng thăm</th>
                <th>Điểm bán</th>
                <th>Nhân viên</th>
                <th>Check-in / Check-out</th>
                <th>Độ tuân thủ POSM</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Chưa có nhật ký viếng thăm nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                visits.map((v, idx) => (
                  <tr key={`v-${v.id ?? idx}-${idx}`}>
                    <td style={{ fontWeight: 500 }}>
                      {new Date(v.visit_date).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.store_name}</div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mã: {v.store_code}</span>
                    </td>
                    <td>{v.user_name}</td>
                    <td>
                      <div>in: {new Date(v.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        out: {v.check_out_time ? new Date(v.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${v.compliance_rate >= 90 ? 'badge-success' : v.compliance_rate >= 80 ? 'badge-warning' : 'badge-danger'}`}>
                        {v.compliance_rate}%
                      </span>
                    </td>
                    <td>
                      {v.check_out_time ? (
                        <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>Đã hoàn tất</span>
                      ) : (
                        <span className="badge badge-warning" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>Đang thực hiện</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => setSelectedVisitId(v.id)}
                      >
                        🔎 Kiểm tra
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Side Drawer Panel */}
      {selectedVisitId && (
        <div className="modal-overlay" onClick={() => setSelectedVisitId(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="drawer-title">Chi Tiết Viếng Thăm</h2>
              <button className="drawer-close" onClick={() => setSelectedVisitId(null)}>✕</button>
            </div>

            {loadingDetail ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--cj-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</span>
                <style>{`
                  @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
              </div>
            ) : detailedVisit ? (
              <div className="drawer-content">
                {/* Store Header Info */}
                <div className="visit-info-grid">
                  <div>
                    <span className="info-label">Điểm bán</span>
                    <div className="info-value" style={{ color: 'var(--cj-blue)' }}>{detailedVisit.visit.store_name}</div>
                  </div>
                  <div>
                    <span className="info-label">Nhân viên thực hiện</span>
                    <div className="info-value">{detailedVisit.visit.user_name}</div>
                  </div>
                  <div>
                    <span className="info-label">Mã cửa hàng</span>
                    <div className="info-value">{detailedVisit.visit.store_code}</div>
                  </div>
                  <div>
                    <span className="info-label">Thời gian viếng thăm</span>
                    <div className="info-value">
                      {new Date(detailedVisit.visit.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {detailedVisit.visit.check_out_time ? ` - ${new Date(detailedVisit.visit.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ' (Đang thực hiện)'}
                    </div>
                  </div>
                </div>

                {/* Shelf Image */}
                {detailedVisit.visit.shelf_image_url && (
                  <div>
                    <h3 className="section-label">Hình ảnh trưng bày thực tế</h3>
                    <img 
                      src={detailedVisit.visit.shelf_image_url} 
                      alt="Quầy kệ thực tế" 
                      className="shelf-image"
                    />
                  </div>
                )}

                {/* Compliance & Notes */}
                <div>
                  <h3 className="section-label">Đánh giá chung</h3>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '12px 20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tỉ lệ tuân thủ</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: detailedVisit.visit.compliance_rate >= 90 ? '#16a34a' : '#ea580c' }}>
                        {detailedVisit.visit.compliance_rate}%
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ghi chú từ thị trường:</div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '4px', fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{detailedVisit.visit.notes || 'Không có ghi chú nào'}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shelf Share Table */}
                  <div>
                    <h3 className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span>Chi tiết mặt kệ & giá cả</span>
                      <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleExportVisitDetails}>Export Excel</button>
                    </h3>
                    <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table className="table" style={{ fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Thương hiệu</th>
                          <th>Tình trạng</th>
                          <th>Kệ trưng bày</th>
                          <th>Giá bán thực tế</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedVisit.details.map((d: any, idx: number) => (
                          <tr key={`detail-${d.id ?? idx}-${idx}`}>
                            <td style={{ fontWeight: 600 }}>{d.name}</td>
                            <td>{d.brand}</td>
                            <td>
                              {d.is_oos ? (
                                <span className="badge badge-danger">Đứt hàng</span>
                              ) : (
                                <span className="badge badge-success">Còn hàng</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {d.is_oos ? '0%' : `${d.share_of_shelf}%`}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.actual_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Competitor Intel */}
                {detailedVisit.competitorIntel && detailedVisit.competitorIntel.length > 0 && (
                  <div>
                    <h3 className="section-label" style={{ color: 'var(--cj-orange)' }}>Thông tin đối thủ cạnh tranh</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {detailedVisit.competitorIntel.map((intel: any) => (
                        <div key={intel.id} className="alert-item" style={{ borderLeft: '4px solid var(--cj-orange)' }}>
                          <div className="alert-header">
                            <span className="alert-brand">{intel.competitor_brand}</span>
                            <span className="alert-type">{intel.intel_type}</span>
                          </div>
                          <div className="alert-desc">{intel.description}</div>
                          {intel.image_url && (
                            <img 
                              src={intel.image_url} 
                              alt="Hình ảnh đối thủ" 
                              style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '4px', marginTop: '6px' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy thông tin chi tiết</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
