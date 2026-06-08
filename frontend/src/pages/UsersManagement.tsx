import React, { useState } from 'react';
import { exportToExcel } from '../utils/export';

export interface UserManagementItem {
  manager_code?: string;
  manager_name?: string;
  supervisor_code: string;
  supervisor_name: string;
  rep_code: string;
  rep_name: string;
  region: string;
  area: string;
  office: string;
  distributor: string;
  status?: string;
}

interface UsersProps {
  usersData: UserManagementItem[];
  onAddUser: (user: UserManagementItem) => void;
  currentUser: any;
}

export const UsersManagement: React.FC<UsersProps> = ({ usersData, onAddUser, currentUser }) => {
  const [activeView, setActiveView] = useState<'overview' | 'list' | 'chart'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [expandedGsbhRows, setExpandedGsbhRows] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const toggleGsbhRow = (gsbhKey: string) => {
    setExpandedGsbhRows(prev => ({ ...prev, [gsbhKey]: !prev[gsbhKey] }));
  };

  const [newRepCode, setNewRepCode] = useState('');
  const [newRepName, setNewRepName] = useState('');
  const [newSupCode, setNewSupCode] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [newRegion, setNewRegion] = useState('MIỀN NAM');
  const [newArea, setNewArea] = useState('HCM');
  const [newOffice, setNewOffice] = useState('HCM 1');
  const [newDistributor, setNewDistributor] = useState('');

  const supervisors = Array.from(new Set(usersData.map(u => u.supervisor_name).filter(Boolean)));
  const regions = Array.from(new Set(usersData.map(u => u.region).filter(Boolean)));

  const filteredUsers = usersData.filter(user => {
    const matchSearch =
      user.rep_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rep_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.distributor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.office.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSup = !selectedSupervisor || user.supervisor_name === selectedSupervisor;
    const matchRegion = !selectedRegion || user.region === selectedRegion;
    return matchSearch && matchSup && matchRegion;
  });

  const totalReps = filteredUsers.length;
  const activeReps = filteredUsers.filter(u => u.status !== 'Ngừng Hoạt Động').length;
  const vacantReps = filteredUsers.filter(u => u.status === 'Ngừng Hoạt Động').length;
  const uniqueSups = new Set(filteredUsers.map(u => u.supervisor_name)).size;
  const uniqueOffices = new Set(filteredUsers.map(u => u.office)).size;
  const totalTargets = totalReps + vacantReps;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepCode || !newRepName || !newSupName) {
      alert('Vui lòng điền đầy đủ: Mã nhân viên, Tên nhân viên và Tên quản lý.');
      return;
    }
    onAddUser({
      supervisor_code: newSupCode || 'N/A',
      supervisor_name: newSupName,
      rep_code: newRepCode,
      rep_name: newRepName,
      region: newRegion,
      area: newArea,
      office: newOffice,
      distributor: newDistributor || 'Chưa phân phối',
    });
    setNewRepCode('');
    setNewRepName('');
    setNewSupCode('');
    setNewSupName('');
    setNewRegion('MIỀN NAM');
    setNewArea('HCM');
    setNewOffice('HCM 1');
    setNewDistributor('');
    setIsModalOpen(false);
  };

  const handleExportUsers = () => {
    exportToExcel(
      filteredUsers.map((user, index) => ({
        STT: index + 1,
        'Mã Nhân Viên': user.rep_code,
        'Tên Nhân Viên': user.rep_name,
        'Giám sát Quản lý (GSBH)': user.supervisor_name,
        'Mã GSBH': user.supervisor_code,
        'Tên Miền': user.region,
        'Vùng (Area)': user.area,
        'Văn phòng (Office)': user.office,
        'Nhà Phân Phối phụ trách': user.distributor,
        'Trạng thái': user.status || 'Tuyến',
      })),
      `users-${activeView}`
    );
  };

  // --- ORG CHART LOGIC ---
  const buildOrgTree = (data: UserManagementItem[]) => {
    // managers -> sups -> reps
    const managers: Record<string, { name: string; code: string; sups: Record<string, { name: string; code: string; region: string; area: string; reps: UserManagementItem[] }> }> = {};

    data.forEach(user => {
      const mCode = user.manager_code || 'ASM_DEFAULT';
      const mName = user.manager_name || 'ASM';
      const sCode = user.supervisor_code || 'GSBH_DEFAULT';
      const sName = user.supervisor_name || 'GSBH';
      const region = user.region || '';
      const area = user.area || '';

      if (!managers[mCode]) managers[mCode] = { code: mCode, name: mName, sups: {} };
      if (!managers[mCode].sups[sCode]) {
        managers[mCode].sups[sCode] = { code: sCode, name: sName, region, area, reps: [] };
      }
      // deduplicate reps
      if (!managers[mCode].sups[sCode].reps.some(r => r.rep_code === user.rep_code)) {
        managers[mCode].sups[sCode].reps.push(user);
      }
    });

    return managers;
  };

  const orgTree = buildOrgTree(usersData);

  // Role-based display: which managers + sups to show
  const getVisibleManagers = () => {
    const all = Object.entries(orgTree).map(([mgrCode, data]) => ({ ...data, code: mgrCode }));

    if (currentUser?.role === 'manager') {
      const code = currentUser.code;
      const match = all.find(m => m.code === code) ||
        all.find(m => m.name.toLowerCase().includes(currentUser.name?.toLowerCase() || ''));
      return match ? [match] : all;
    }

    if (currentUser?.role === 'sup') {
      const code = currentUser.code;
      let found = false;
      for (const m of all) {
        const supKey = Object.keys(m.sups).find(k => k === code || m.sups[k].name.toLowerCase().includes(currentUser.name?.toLowerCase() || ''));
        if (supKey) {
          found = true;
          return [{
            code: m.code, name: m.name,
            sups: { [supKey]: m.sups[supKey] }
          }];
        }
      }
      if (!found) {
        return [{
          code: 'ASM_DEMO', name: currentUser.name || 'Phòng Kinh Doanh',
          sups: {
            [code]: {
              code, name: currentUser.name || 'GSBH',
              region: 'MIỀN NAM', area: '', reps: usersData.filter(r => r.supervisor_code === code)
            }
          }
        }];
      }
    }

    return all;
  };

  const visibleManagers = getVisibleManagers();
  const supColors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#ef4444'];

  const renderOrgChart = () => {
    if (currentUser?.role === 'rep') {
      return (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Chức năng Sơ đồ tổ chức chỉ khả dụng với Giám sát bán hàng (GSBH) và Quản lý vùng (ASM) trở lên.
        </div>
      );
    }

    if (visibleManagers.length === 0) {
      return (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Không có dữ liệu tổ chức để hiển thị.
        </div>
      );
    }

    return (
      <div style={{ width: '100%', padding: '1rem 0' }}>
        <style>{`
          .chart-mgr-row { display: flex; gap: 1rem; justify-content: flex-start; flex-wrap: wrap; margin-bottom: 1.5rem; }
          .chart-mgr-card { background: white; border: 2px solid #f1f5f9; border-top: 5px solid #dc2626; border-radius: 12px; padding: 14px 18px; min-width: 240px; max-width: 360px; cursor: pointer; transition: all 0.2s; flex: 1; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
          .chart-mgr-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }
          .chart-mgr-card.is-expanded { border-color: #dc2626; box-shadow: 0 4px 16px rgba(220,38,38,0.15); }
          .chart-mgr-pills { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }
          .pill { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 20px; font-size: 0.62rem; font-weight: 700; }
          .pill-active { background: #dcfce7; color: #166534; }
          .pill-vacant { background: #fee2e2; color: #991b1b; }
          .pill-total { background: #f1f5f9; color: #475569; }
          .pill-sup { background: #eff6ff; color: #1e40af; }
          .chart-team-divider { height: 1px; background: #f1f5f9; margin: 0.75rem 0; }
          .chart-gsbh-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
          .chart-gsbh-card { background: white; border: 1px solid #e2e8f0; border-top: 4px solid var(--sup-color, #3b82f6); border-radius: 10px; padding: 10px 14px; min-width: 200px; flex: 1; cursor: pointer; transition: all 0.2s; max-width: 340px; }
          .chart-gsbh-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          .chart-reps-grid { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; padding-left: 4px; }
          .chart-rep-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; border: 1px solid #e2e8f0; background: #f8fafc; transition: all 0.15s; }
          .chart-rep-chip.active { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
          .chart-rep-chip.vacant { background: #fef2f2; border-color: #fca5a5; color: #991b1b; border-style: dashed; }
          .chart-rep-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        `}</style>

        <div className="chart-mgr-row">
          {visibleManagers.map((mgr: any) => {
            const allReps = Object.values(mgr.sups).reduce((acc: number, s: any) => acc + s.reps.length, 0);
            const activeReps = Object.values(mgr.sups).reduce((acc: number, s: any) =>
              acc + (s.reps as UserManagementItem[]).filter(r => r.status !== 'Ngừng Hoạt Động').length, 0);
            const vacantReps = allReps - activeReps;
            const totalSups = Object.keys(mgr.sups).length;
            const isExpanded = expandedNodes[mgr.code];

            return (
              <div key={mgr.code} className={'chart-mgr-card ' + (isExpanded ? 'is-expanded' : '')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, color: '#dc2626', letterSpacing: '0.6px', marginBottom: '4px' }}>
                      ASM · Quản Lý Vùng
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{mgr.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>Mã: {mgr.code}</div>
                  </div>
                  <button
                    onClick={() => toggleNode(mgr.code)}
                    style={{
                      border: 'none', background: isExpanded ? '#dc2626' : '#f1f5f9',
                      color: isExpanded ? '#fff' : '#64748b',
                      width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
                      fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                <div className="chart-mgr-pills">
                  <span className="pill pill-total">🏢 {totalSups} GSBH</span>
                  <span className="pill pill-active">✓ {activeReps} Active</span>
                  {vacantReps > 0 && <span className="pill pill-vacant">⚠ {vacantReps} Vacant</span>}
                  <span className="pill pill-sup">👥 {allReps} NVBH</span>
                </div>

                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                  {isExpanded ? 'Thu gọn ▲' : `Xem team (${totalSups} GSBH · ${allReps} NVBH) ▼`}
                </div>

                {isExpanded && (
                  <div>
                    <div className="chart-team-divider"></div>
                    <div className="chart-gsbh-row">
                      {Object.entries(mgr.sups).map(([supCode, sup]: [string, any], sIdx: number) => {
                        const supActive = (sup.reps as UserManagementItem[]).filter(r => r.status !== 'Ngừng Hoạt Động').length;
                        const supVacant = (sup.reps as UserManagementItem[]).filter(r => r.status === 'Ngừng Hoạt Động').length;
                        const supColor = supColors[sIdx % supColors.length];
                        const supExpanded = expandedNodes[supCode];

                        return (
                          <div key={supCode} className="chart-gsbh-card" style={{ '--sup-color': supColor } as React.CSSProperties}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, color: supColor, letterSpacing: '0.5px', marginBottom: '3px' }}>
                                  ⭐ GSBH
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{sup.name}</div>
                                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{supCode} · {sup.region}</div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleNode(supCode); }}
                                style={{
                                  border: 'none', background: supExpanded ? supColor : '#f1f5f9',
                                  color: supExpanded ? '#fff' : '#64748b',
                                  width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer',
                                  fontSize: '0.6rem', fontWeight: 800, flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                {supExpanded ? '▲' : '▼'}
                              </button>
                            </div>

                            <div className="chart-mgr-pills">
                              <span className="pill pill-active">✓ {supActive}</span>
                              {supVacant > 0 && <span className="pill pill-vacant">⚠ {supVacant}</span>}
                              <span className="pill pill-sup">👥 {(sup.reps as UserManagementItem[]).length} NVBH</span>
                            </div>

                            {supExpanded && (
                              <div className="chart-reps-grid">
                                {(sup.reps as UserManagementItem[]).map((rep: UserManagementItem) => {
                                  const isVacant = rep.status === 'Ngừng Hoạt Động';
                                  return (
                                    <div key={rep.rep_code} className={'chart-rep-chip ' + (isVacant ? 'vacant' : 'active')}
                                      title={rep.rep_name + ' | ' + (rep.office || '') + ' | ' + (rep.distributor || '')}
                                    >
                                      <span>{isVacant ? '🚫' : '📦'}</span>
                                      <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {rep.rep_name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {!supExpanded && (
                              <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.65rem', color: '#94a3b8' }}>
                                Click xem {(sup.reps as UserManagementItem[]).length} NVBH ▼
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="workspace-header">
        <div>
          <h1 className="header-title">Quản Lý Nhân Sự & Địa Bàn</h1>
          <p className="header-meta">Quản lý cơ cấu nhân sự đại diện thương mại (NVBH/Rep) và quản lý vùng (GSBH/Sup)</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {currentUser?.role !== 'rep' && (
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px', background: 'rgba(0,0,0,0.03)' }}>
              <button className="btn" onClick={() => setActiveView('overview')}
                style={{ padding: '6px 12px', fontSize: '0.82rem', height: 'auto', borderRadius: '6px', background: activeView === 'overview' ? 'var(--cj-blue)' : 'transparent', color: activeView === 'overview' ? '#fff' : 'var(--text-secondary)', border: 'none', boxShadow: 'none', fontWeight: 600, cursor: 'pointer' }}>
                📊 Tổng quan
              </button>
              <button className="btn" onClick={() => setActiveView('list')}
                style={{ padding: '6px 12px', fontSize: '0.82rem', height: 'auto', borderRadius: '6px', background: activeView === 'list' ? 'var(--cj-blue)' : 'transparent', color: activeView === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', boxShadow: 'none', fontWeight: 600, cursor: 'pointer' }}>
                📋 Danh sách
              </button>
              <button className="btn" onClick={() => setActiveView('chart')}
                style={{ padding: '6px 12px', fontSize: '0.82rem', height: 'auto', borderRadius: '6px', background: activeView === 'chart' ? 'var(--cj-blue)' : 'transparent', color: activeView === 'chart' ? '#fff' : 'var(--text-secondary)', border: 'none', boxShadow: 'none', fontWeight: 600, cursor: 'pointer' }}>
                🌳 Sơ đồ tổ chức
              </button>
            </div>
          )}
          <button className="btn btn-outline" onClick={handleExportUsers}>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <span>+ Thêm Nhân Sự mới</span>
          </button>
        </div>
      </div>

      {activeView === 'chart' ? (
        renderOrgChart()
      ) : activeView === 'overview' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="card card-accent-blue">
              <div className="card-title">Tổng Headcount</div>
              <div className="card-value">{totalTargets} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>vị trí</span></div>
              <div className="card-sub">Số vị trí NVBH cần tuyển đủ</div>
            </div>
            <div className="card" style={{ borderTop: '4px solid #166534' }}>
              <div className="card-title">✓ Đang tuyến (Active)</div>
              <div className="card-value" style={{ color: '#166534' }}>{activeReps} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>NVBH</span></div>
              <div className="card-sub">{totalTargets > 0 ? ((activeReps / totalTargets) * 100).toFixed(1) : 0}% filled | {uniqueSups} GSBH quản lý</div>
            </div>
            <div className="card" style={{ borderTop: '4px solid #dc2626' }}>
              <div className="card-title">⚠ Trống (Vacant)</div>
              <div className="card-value" style={{ color: '#dc2626' }}>{vacantReps} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>vị trí</span></div>
              <div className="card-sub">Cần bổ sung tuyển dụng</div>
            </div>
            <div className="card card-accent-orange">
              <div className="card-title">Văn phòng đại diện</div>
              <div className="card-value">{uniqueOffices} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>địa bàn</span></div>
              <div className="card-sub">{uniqueSups} Giám sát vùng (GSBH)</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, marginBottom: '1.25rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                🏢 CƠ CẤU TỔ CHỨC: ASM → GSBH → NVBH (Click dòng GSBH để xem chi tiết NVBH)
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Tìm nhanh..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.78rem', outline: 'none' }}
                />
                <select
                  value={selectedRegion}
                  onChange={e => setSelectedRegion(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.78rem', outline: 'none' }}
                >
                  <option value="">-- Miền --</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}></th>
                    <th style={{ minWidth: '180px' }}>ASM / Quản lý vùng</th>
                    <th style={{ minWidth: '180px' }}>GSBH / Giám sát</th>
                    <th style={{ textAlign: 'center', minWidth: '80px' }}>Headcount Target</th>
                    <th style={{ textAlign: 'center', minWidth: '80px' }}>✓ Active</th>
                    <th style={{ textAlign: 'center', minWidth: '80px' }}>⚠ Vacant</th>
                    <th style={{ textAlign: 'center', minWidth: '80px' }}>% Filled</th>
                    <th style={{ textAlign: 'center', minWidth: '100px' }}>Chi tiết NVBH</th>
                    <th style={{ minWidth: '150px' }}>Miền</th>
                    <th style={{ minWidth: '120px' }}>Vùng (Area)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rowMap: Record<string, any> = {};
                    filteredUsers.forEach(u => {
                      const mgr = u.manager_name || 'Chưa phân';
                      const mgrCode = u.manager_code || 'N/A';
                      const gsbhKey = (mgrCode + '||' + u.supervisor_name);
                      if (!rowMap[gsbhKey]) {
                        rowMap[gsbhKey] = {
                          mgr_name: mgr,
                          mgr_code: mgrCode,
                          gsbh_name: u.supervisor_name,
                          gsbh_code: u.supervisor_code,
                          region: u.region,
                          area: u.area,
                          reps: [],
                          activeCount: 0,
                          vacantCount: 0,
                        };
                      }
                      rowMap[gsbhKey].reps.push(u);
                      if (u.status === 'Ngừng Hoạt Động') {
                        rowMap[gsbhKey].vacantCount++;
                      } else {
                        rowMap[gsbhKey].activeCount++;
                      }
                    });

                    const sortedRows = Object.values(rowMap).sort((a: any, b: any) =>
                      a.region.localeCompare(b.region) || a.gsbh_name.localeCompare(b.gsbh_name)
                    );

                    if (sortedRows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Không có dữ liệu
                          </td>
                        </tr>
                      );
                    }

                    let prevMgr = '';

                    return sortedRows.map((row: any) => {
                      const showMgr = row.mgr_name !== prevMgr;
                      if (row.mgr_name !== prevMgr) prevMgr = row.mgr_name;
                      const isExpanded = expandedGsbhRows[(row.mgr_code + '||' + row.gsbh_name)];
                      const target = row.activeCount + row.vacantCount;
                      const filledPct = target > 0 ? (row.activeCount / target) * 100 : 0;
                      const isLow = filledPct < 70;
                      const isPerfect = filledPct >= 100;

                      return (
                        <React.Fragment key={(row.mgr_code + '||' + row.gsbh_name)}>
                          <tr
                            onClick={() => toggleGsbhRow((row.mgr_code + '||' + row.gsbh_name))}
                            style={{ cursor: 'pointer', background: isExpanded ? '#f0f9ff' : 'white', transition: 'background 0.15s' }}
                          >
                            <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                              {isExpanded ? '▼' : '▶'}
                            </td>
                            <td style={{ fontWeight: showMgr ? 800 : 400, color: showMgr ? '#dc2626' : '#94a3b8' }}>
                              {showMgr ? row.mgr_name : '—'}
                            </td>
                            <td style={{ fontWeight: 700, color: '#1e40af' }}>
                              {row.gsbh_name}
                              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>{row.gsbh_code}</span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{target}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#166534' }}>{row.activeCount}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: row.vacantCount > 0 ? '#dc2626' : '#94a3b8' }}>
                              {row.vacantCount > 0 ? ('⚠ ' + row.vacantCount) : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                <div style={{ width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: filledPct + '%',
                                    height: '100%',
                                    background: isPerfect ? '#166534' : isLow ? '#dc2626' : '#d97706',
                                    borderRadius: '3px',
                                    transition: 'width 0.3s'
                                  }}></div>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: isPerfect ? '#166534' : isLow ? '#dc2626' : '#d97706' }}>
                                  {filledPct.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                              {row.reps.length} NVBH {isExpanded ? '(click để thu gọn ▲)' : '(click để xem chi tiết ▼)'}
                            </td>
                            <td>
                              <span className="badge"
                                style={{
                                  backgroundColor: row.region?.includes('BẮC') ? '#dbeafe' : '#ffedd5',
                                  color: row.region?.includes('BẮC') ? '#1e40af' : '#9a3412',
                                  fontWeight: 700,
                                  fontSize: '0.7rem'
                                }}
                              >
                                {row.region}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#475569' }}>{row.area}</td>
                          </tr>

                          {isExpanded && row.reps.map((rep: any) => (
                            <tr key={rep.rep_code} style={{ background: '#fafafa', fontSize: '0.82rem' }}>
                              <td></td>
                              <td style={{ color: '#94a3b8', fontStyle: 'italic' }}>└ {rep.rep_code}</td>
                              <td style={{ paddingLeft: '20px' }}>{rep.rep_name}</td>
                              <td></td>
                              <td></td>
                              <td style={{ textAlign: 'center' }}>
                                {rep.status === 'Ngừng Hoạt Động' ? (
                                  <span className="badge badge-danger">Vacant</span>
                                ) : (
                                  <span className="badge badge-success">Tuyến</span>
                                )}
                              </td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{rep.office}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card card-accent-blue">
              <div className="card-title">Tổng số Đại diện thương mại (NVBH)</div>
              <div className="card-value">{totalReps} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>nhân sự</span></div>
              <div className="card-sub">Lực lượng salesman đi tuyến thị trường</div>
            </div>
            <div className="card card-accent-orange">
              <div className="card-title">Tổng số Giám sát vùng (GSBH)</div>
              <div className="card-value">{uniqueSups} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>quản lý</span></div>
              <div className="card-sub">Phụ trách giám sát đội nhóm địa bàn</div>
            </div>
            <div className="card card-accent-red">
              <div className="card-title">Văn phòng đại diện (Office)</div>
              <div className="card-value">{uniqueOffices} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>địa bàn</span></div>
              <div className="card-sub">Văn phòng điều hành khu vực hoạt động</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="filters-bar" style={{ marginBottom: 0 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Tìm theo Tên NVBH, Mã NV, NPP hoặc Văn phòng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select className="filter-select" value={selectedSupervisor} onChange={(e) => setSelectedSupervisor(e.target.value)}>
                <option value="">-- Tất cả Quản lý (GSBH) --</option>
                {supervisors.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
              <select className="filter-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                <option value="">-- Tất cả Tên Miền --</option>
                {regions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '120px' }}>Mã Nhân Viên</th>
                    <th>Tên Nhân Viên</th>
                    <th>Giám sát Quản lý (GSBH)</th>
                    <th>Tên Miền</th>
                    <th>Vùng (Area)</th>
                    <th>Văn phòng (Office)</th>
                    <th>Nhà Phân Phối phụ trách</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, idx) => (
                      <tr key={user.rep_code + '-' + idx}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: 'var(--cj-blue)' }}>{user.rep_code}</td>
                        <td style={{ fontWeight: 700 }}>{user.rep_name}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{user.supervisor_name}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mã: {user.supervisor_code}</span>
                          </div>
                        </td>
                        <td>{user.region}</td>
                        <td>{user.area}</td>
                        <td><span className="badge badge-mt">{user.office}</span></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.distributor}</td>
                        <td style={{ textAlign: 'center' }}>
                          {user.status === 'Ngừng Hoạt Động' ? (
                            <span className="badge badge-danger">Vacant (Trống)</span>
                          ) : (
                            <span className="badge badge-success">Đang Tuyến</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Không tìm thấy nhân sự phù hợp với điều kiện lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 className="drawer-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>+ Thêm Mới Nhân Sự vào Hệ Thống</h2>
              <button className="drawer-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Mã Nhân Viên (Code)*</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: 08005"
                    value={newRepCode}
                    onChange={(e) => setNewRepCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên Nhân Viên (NVBH)*</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Hoàng Văn Nam"
                    value={newRepName}
                    onChange={(e) => setNewRepName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Mã Giám Sát (GSBH Code)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: CJ1408801"
                    value={newSupCode}
                    onChange={(e) => setNewSupCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên Giám Sát (GSBH)*</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Phạm Văn Việt"
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nhà Phân Phối Phụ Trách</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: NPP AN BÌNH"
                  value={newDistributor}
                  onChange={(e) => setNewDistributor(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Tên Miền</label>
                  <select
                    className="filter-select"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                  >
                    <option value="MIỀN NAM">MIỀN NAM</option>
                    <option value="MIỀN BẮC">MIỀN BẮC</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Khu vực (Area)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Văn phòng (Office)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newOffice}
                    onChange={(e) => setNewOffice(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu nhân sự</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
