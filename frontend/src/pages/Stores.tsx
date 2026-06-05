import React, { useState } from 'react';
import { exportToExcel } from '../utils/export';

interface Store {
  id: number;
  code: string;
  name: string;
  address: string;
  channel: string;
  region: string;
  phone?: string;
  total_revenue?: number;
  npp_count?: number;
  customer_count?: number;
  total_qty?: number;
  monthly_trend?: Record<number, number>;
  latitude?: string;
  longitude?: string;
}

interface StoresProps {
  stores: Store[];
  onAddStore: (storeData: Omit<Store, 'id'>) => Promise<void>;
}

const formatCurrency = (val: number) => {
  if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(2)}B đ`;
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M đ`;
  return `${val.toLocaleString('vi-VN')} đ`;
};

export const Stores: React.FC<StoresProps> = ({ stores, onAddStore }) => {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [channel, setChannel] = useState('MT');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalRevenue = stores.reduce((s, st) => s + (st.total_revenue || 0), 0);
  const mtStores = stores.filter(s => s.channel === 'MT');
  const gtStores = stores.filter(s => s.channel === 'GT');
  const mtRevenue = mtStores.reduce((s, st) => s + (st.total_revenue || 0), 0);
  const gtRevenue = gtStores.reduce((s, st) => s + (st.total_revenue || 0), 0);
  const uniqueRegions = Array.from(new Set(stores.map(s => s.region).filter(Boolean)));

  const filteredStores = stores.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) ||
                          s.code.toLowerCase().includes(q) ||
                          s.address.toLowerCase().includes(q);
    const matchesChannel = !channelFilter || s.channel === channelFilter;
    const matchesRegion = !regionFilter || s.region === regionFilter;
    return matchesSearch && matchesChannel && matchesRegion;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !address) {
      setError('Vui lòng điền đầy đủ Mã, Tên và Địa chỉ cửa hàng.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onAddStore({ code, name, address, channel, region: 'HCM', phone });
      setCode(''); setName(''); setAddress(''); setChannel('MT'); setPhone('');
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm điểm bán');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportStores = () => {
    exportToExcel(
      filteredStores.map((store) => ({
        'Mã cửa hàng': store.code,
        'Tên điểm bán': store.name,
        Kênh: store.channel,
        Vùng: store.region,
        'Địa chỉ': store.address,
        'Doanh số Sell-out': store.total_revenue || 0,
        'Sản lượng': store.total_qty || 0,
        'Số điện thoại': store.phone || '',
      })),
      `stores-${(regionFilter || 'all').toLowerCase()}-${(channelFilter || 'all').toLowerCase()}`
    );
  };

  const handleExportZonePerformance = () => {
    exportToExcel(
      uniqueRegions.map((reg) => {
        const zoneMT = stores.filter((s) => s.region === reg && s.channel === 'MT');
        const zoneGT = stores.filter((s) => s.region === reg && s.channel === 'GT');
        const zoneRevMT = zoneMT.reduce((sum, st) => sum + (st.total_revenue || 0), 0);
        const zoneRevGT = zoneGT.reduce((sum, st) => sum + (st.total_revenue || 0), 0);
        const zoneRevTotal = zoneRevMT + zoneRevGT;
        const mtPct = zoneRevTotal > 0 ? (zoneRevMT / zoneRevTotal) * 100 : 0;
        return {
          'Vùng / Zone': reg,
          'Số điểm MT': zoneMT.length,
          'Số điểm GT': zoneGT.length,
          'Doanh số Sell-out': zoneRevTotal,
          'Tổng sản lượng': stores.filter((s) => s.region === reg).reduce((sum, st) => sum + (st.total_qty || 0), 0),
          '% MT vs GT': `${mtPct.toFixed(0)}% MT`,
        };
      }),
      'stores-zone-performance'
    );
  };

  return (
    <div>
      <div className="workspace-header">
        <div>
          <h1 className="header-title">📍 Danh Sách Điểm Bán</h1>
          <p className="header-meta">Quản lý siêu thị (MT) và điểm bán truyền thống (GT) · Doanh số theo vùng</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExportStores}>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            ➕ Thêm Điểm Bán Mới
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card card-accent-blue">
          <div className="card-title">💰 Tổng Doanh Số Sell-out</div>
          <div className="card-value">{formatCurrency(totalRevenue)}</div>
          <div className="card-sub">{stores.length} điểm bán đang hoạt động</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid #3b82f6' }}>
          <div className="card-title">🛒 Kênh MT (Siêu thị)</div>
          <div className="card-value" style={{ color: '#1e40af' }}>{formatCurrency(mtRevenue)}</div>
          <div className="card-sub">{mtStores.length} điểm bán MT</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid #f97316' }}>
          <div className="card-title">🏪 Kênh GT (Truyền thống)</div>
          <div className="card-value" style={{ color: '#c2410c' }}>{formatCurrency(gtRevenue)}</div>
          <div className="card-sub">{gtStores.length} điểm bán GT</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid #10b981' }}>
          <div className="card-title">📦 Tổng Sản Lượng</div>
          <div className="card-value" style={{ color: '#166534' }}>
            {stores.reduce((s, st) => s + (st.total_qty || 0), 0).toLocaleString('vi-VN')}
          </div>
          <div className="card-sub">Tổng số lượng sản phẩm bán ra</div>
        </div>
      </div>

      {uniqueRegions.length > 1 && (
        <div className="card" style={{ padding: 0, marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>📊 DOANH SỐ THEO VÙNG (Zone Performance)</span>
            <button className="btn btn-outline" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={handleExportZonePerformance}>Export Excel</button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Vùng / Zone</th>
                  <th style={{ textAlign: 'center' }}>Số điểm MT</th>
                  <th style={{ textAlign: 'center' }}>Số điểm GT</th>
                  <th style={{ textAlign: 'right' }}>Doanh số Sell-out</th>
                  <th style={{ textAlign: 'center' }}>Tổng sản lượng</th>
                  <th style={{ textAlign: 'center' }}>% MT vs GT</th>
                </tr>
              </thead>
              <tbody>
                {uniqueRegions.map(reg => {
                  const zoneMT = stores.filter(s => s.region === reg && s.channel === 'MT');
                  const zoneGT = stores.filter(s => s.region === reg && s.channel === 'GT');
                  const zoneRevMT = zoneMT.reduce((s, st) => s + (st.total_revenue || 0), 0);
                  const zoneRevGT = zoneGT.reduce((s, st) => s + (st.total_revenue || 0), 0);
                  const zoneRevTotal = zoneRevMT + zoneRevGT;
                  const mtPct = zoneRevTotal > 0 ? (zoneRevMT / zoneRevTotal * 100) : 0;
                  return (
                    <tr key={reg}>
                      <td style={{ fontWeight: 700, color: 'var(--cj-blue)' }}>{reg}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{zoneMT.length}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{zoneGT.length}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--cj-red)' }}>{formatCurrency(zoneRevTotal)}</td>
                      <td style={{ textAlign: 'center' }}>{stores.filter(s => s.region === reg).reduce((s, st) => s + (st.total_qty || 0), 0).toLocaleString('vi-VN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <div style={{ width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${mtPct}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }}></div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{mtPct.toFixed(0)}% MT</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div className="filters-bar" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm tên, mã hoặc địa chỉ điểm bán..."
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
            <option value="">Tất cả kênh bán hàng</option>
            <option value="MT">Kênh MT (Siêu thị)</option>
            <option value="GT">Kênh GT (Chợ truyền thống)</option>
          </select>
          {uniqueRegions.length > 1 && (
            <select className="filter-select" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
              <option value="">Tất cả vùng</option>
              {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Mã cửa hàng</th>
                <th>Tên điểm bán</th>
                <th>Kênh</th>
                <th>Vùng</th>
                <th>Địa chỉ</th>
                <th style={{ textAlign: 'right' }}>Doanh số Sell-out</th>
                <th style={{ textAlign: 'center' }}>Sản lượng</th>
                <th>Số điện thoại</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Không tìm thấy điểm bán nào phù hợp bộ lọc
                  </td>
                </tr>
              ) : (
                filteredStores.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--cj-blue)' }}>{s.code}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      {s.latitude && s.longitude && (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          📍 {parseFloat(s.latitude).toFixed(4)}, {parseFloat(s.longitude).toFixed(4)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.channel === 'MT' ? 'badge-mt' : 'badge-gt'}`}>
                        {s.channel === 'MT' ? 'MT (Siêu thị)' : 'GT (Truyền thống)'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>{s.region}</span>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.address}>
                      {s.address}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--cj-red)' }}>
                      {formatCurrency(s.total_revenue || 0)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {(s.total_qty || 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{s.phone || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
          Hiển thị {filteredStores.length} / {stores.length} điểm bán
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>➕ Thêm Điểm Bán Mới</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>⚠️ {error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Mã cửa hàng *</label>
                  <input type="text" className="form-input" placeholder="Ví dụ: WIN_QN" value={code} onChange={e => setCode(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Kênh bán hàng</label>
                  <select className="form-input" value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="MT">MT — Siêu thị (Modern Trade)</option>
                    <option value="GT">GT — Truyền thống (General Trade)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tên cửa hàng / Đại lý *</label>
                <input type="text" className="form-input" placeholder="Ví dụ: WinMart Quận 1" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ đầy đủ *</label>
                <input type="text" className="form-input" placeholder="Ví dụ: 123 Nguyễn Trãi, Q1, TP.HCM" value={address} onChange={e => setAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại liên hệ</label>
                <input type="text" className="form-input" placeholder="Ví dụ: 0901234567" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Đang lưu...' : '💾 Lưu điểm bán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
