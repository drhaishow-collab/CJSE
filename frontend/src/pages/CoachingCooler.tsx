import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../utils/export';

interface CoachingCoolerProps {
  currentUser: any;
  defaultTab?: 'coaching' | 'cooler';
  usersList?: any[];
}

const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  const t = hash + 0x6D2B79F5;
  let t2 = Math.imul(t ^ t >>> 15, t | 1);
  t2 ^= t2 + Math.imul(t2 ^ t2 >>> 7, t2 | 61);
  return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
};

export const CoachingCooler: React.FC<CoachingCoolerProps> = ({ defaultTab = 'coaching', usersList = [] }) => {
  const [activeTab, setActiveTab] = useState<'coaching' | 'cooler'>(defaultTab);
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const { coachingData, regionDetails, coolerData, dynamicRegions } = useMemo(() => {
    const defaultCoaching = {
      overallScore: 8.5,
      fieldCoachingRate: 92,
      passRate: 88,
      issueResolution: 76,
      byRegion: [] as any[],
      byChannel: [
        { name: 'GT (General Trade)', score: 8.3, rate: 90 },
        { name: 'MT (Modern Trade)', score: 8.9, rate: 96 },
        { name: 'KR + DTC', score: 9.1, rate: 98 },
      ],
      monthlyTrend: [
        { month: 'T1', score: 7.8 },
        { month: 'T2', score: 7.9 },
        { month: 'T3', score: 8.2 },
        { month: 'T4', score: 8.4 },
        { month: 'T5', score: 8.5 },
      ]
    };
    
    const defaultCooler = {
      totalDeployed: 12500,
      targetDeployed: 15000,
      purityRate: 94,
      activeRate: 97,
      salesPerCooler: 12500000, // 12.5M VND
      byRegion: [] as any[],
      byChannel: [
        { name: 'GT (General Trade)', deployed: 8500, purity: 92 },
        { name: 'MT (Modern Trade)', deployed: 3500, purity: 98 },
        { name: 'Khác', deployed: 500, purity: 90 },
      ],
      maintenanceStatus: [
        { status: 'Hoạt động tốt', count: 11800, color: '#10b981', pct: 94.4 },
        { status: 'Cần bảo trì / Vệ sinh', count: 450, color: '#f59e0b', pct: 3.6 },
        { status: 'Hỏng hóc / Thu hồi', count: 250, color: '#ef4444', pct: 2.0 },
      ],
      zeroSales: [
        { name: 'Không sinh số < 15 ngày', count: 320, color: '#fcd34d' },
        { name: 'Không sinh số 15-30 ngày', count: 150, color: '#fb923c' },
        { name: 'Không sinh số > 30 ngày', count: 85, color: '#f87171' },
      ]
    };

    if (!usersList || usersList.length === 0) {
      return {
        coachingData: defaultCoaching,
        regionDetails: {} as any,
        coolerData: defaultCooler,
        dynamicRegions: []
      };
    }

    const regDetails: Record<string, any[]> = {};
    const regionsSet = new Set<string>();

    // Group reps by region -> supervisor
    const map = new Map<string, Map<string, { supervisor: string, code: string, reps: any[] }>>();

    usersList.forEach(user => {
      if (user.status === 'Ngừng Hoạt Động') return;
      const reg = user.region || 'Khác';
      const supCode = user.supervisor_code || 'N/A';
      const supName = user.supervisor_name || 'N/A';
      
      regionsSet.add(reg);

      if (!map.has(reg)) map.set(reg, new Map());
      const supMap = map.get(reg)!;
      if (!supMap.has(supCode)) supMap.set(supCode, { supervisor: supName, code: supCode, reps: [] });
      
      const supData = supMap.get(supCode)!;
      
      // Gen mock score based on rep_code
      const rCode = user.rep_code || user.name;
      const rand = pseudoRandom(rCode);
      const score = 7.0 + (rand * 2.5); // 7.0 to 9.5
      const persuasion = 7.0 + (pseudoRandom(rCode + 'p') * 2.5);
      const display = 7.0 + (pseudoRandom(rCode + 'd') * 2.5);
      const objection = 7.0 + (pseudoRandom(rCode + 'o') * 2.5);
      const passRate = score >= 7.5;
      const coachCount = Math.floor(rand * 5) + 1; // 1 to 5
      const lastDateStr = `0${Math.floor(rand*9)+1}/06/2026`;

      const coolerDeployed = Math.floor(rand * 50) + 10;
      const coolerPurity = 85 + Math.floor(pseudoRandom(rCode + 'cooler') * 15);

      supData.reps.push({
        name: user.rep_name || user.name,
        code: rCode,
        score: parseFloat(score.toFixed(1)),
        persuasion: parseFloat(persuasion.toFixed(1)),
        display: parseFloat(display.toFixed(1)),
        objection: parseFloat(objection.toFixed(1)),
        passRate,
        coachCount,
        lastDate: lastDateStr,
        coolerDeployed,
        coolerPurity
      });
    });

    const regionsList = Array.from(regionsSet).sort();
    const coachingByRegion: any[] = [];
    const coolerByRegion: any[] = [];

    regionsList.forEach(reg => {
      const supMap = map.get(reg)!;
      const supsArray = Array.from(supMap.values());
      regDetails[reg] = supsArray;

      // Calc region average score
      let totalScore = 0;
      let totalReps = 0;
      supsArray.forEach((sup: any) => {
        sup.reps.forEach((r: any) => {
          totalScore += r.score;
          totalReps++;
        });
      });
      const avgScore = totalReps > 0 ? parseFloat((totalScore / totalReps).toFixed(1)) : 8.0;
      const randRate = 85 + Math.floor(pseudoRandom(reg) * 15);

      coachingByRegion.push({
        name: reg,
        score: avgScore,
        rate: randRate
      });

      // cooler mock
      coolerByRegion.push({
        name: reg,
        deployed: 1000 + Math.floor(pseudoRandom(reg+'c') * 4000),
        purity: 90 + Math.floor(pseudoRandom(reg+'p') * 10)
      });
    });

    return {
      coachingData: { ...defaultCoaching, byRegion: coachingByRegion },
      regionDetails: regDetails,
      coolerData: { ...defaultCooler, byRegion: coolerByRegion },
      dynamicRegions: regionsList
    };
  }, [usersList]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const renderSparkline = (points: number[], width = 100, height = 30, color = 'var(--cj-blue)') => {
    if (points.length < 2) return null;
    const max = Math.max(...points) + 1;
    const min = Math.min(...points) - 1;
    const range = max - min || 1;
    const padding = 2;
    const coordinates = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((p - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={coordinates.join(' ')} />
        {points.map((p, idx) => {
          const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
          const y = height - ((p - min) / range) * (height - padding * 2) - padding;
          return <circle key={idx} cx={x} cy={y} r="3" fill={color} stroke="#ffffff" strokeWidth="1" />;
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Slicers */}
      <div className="workspace-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="header-title">Coaching & Cooler Tracking</h1>
          <p className="header-meta">Dữ liệu Mockup tổng quan thị trường</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={filterRegion} 
            onChange={e => setFilterRegion(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">Tất cả Khu vực</option>
            {dynamicRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select 
            value={filterChannel} 
            onChange={e => setFilterChannel(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">Tất cả Kênh</option>
            <option value="GT">GT (General Trade)</option>
            <option value="MT">MT (Modern Trade)</option>
          </select>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <button 
          className="btn"
          style={{ 
            background: activeTab === 'coaching' ? 'var(--cj-blue)' : 'transparent',
            color: activeTab === 'coaching' ? '#fff' : '#64748b',
            border: 'none',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('coaching')}
        >
          🎓 Đào tạo Thực địa (Coaching)
        </button>
        <button 
          className="btn"
          style={{ 
            background: activeTab === 'cooler' ? 'var(--cj-orange)' : 'transparent',
            color: activeTab === 'cooler' ? '#fff' : '#64748b',
            border: 'none',
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('cooler')}
        >
          🧊 Quản lý Tủ mát (Cooler)
        </button>
      </div>

      {/* --- COACHING CONTENT --- */}
      {activeTab === 'coaching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--cj-blue)' }}>
              <div className="card-title">Điểm Coaching Trung bình</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-value" style={{ color: 'var(--cj-blue)', fontSize: '2rem' }}>{coachingData.overallScore}/10</div>
                {renderSparkline(coachingData.monthlyTrend.map(t => t.score), 80, 25, 'var(--cj-blue)')}
              </div>
              <div className="card-sub" style={{ marginTop: '8px' }}>Xu hướng tăng +0.1 so với tháng trước</div>
            </div>
            
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="card-title">Tỷ lệ Field Coaching</div>
              <div className="card-value" style={{ color: '#10b981', fontSize: '2rem' }}>{coachingData.fieldCoachingRate}%</div>
              <div className="card-sub" style={{ marginTop: '8px' }}>So với kế hoạch (Target)</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="card-title">Tỷ lệ Đạt (Pass Rate)</div>
              <div className="card-value" style={{ color: '#f59e0b', fontSize: '2rem' }}>{coachingData.passRate}%</div>
              <div className="card-sub" style={{ marginTop: '8px' }}>NVBH đạt chuẩn sau Coaching</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="card-title">Tỷ lệ Giải quyết vấn đề</div>
              <div className="card-value" style={{ color: '#8b5cf6', fontSize: '2rem' }}>{coachingData.issueResolution}%</div>
              <div className="card-sub" style={{ marginTop: '8px' }}>Các vấn đề tuyến được xử lý</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* By Region Table with Drill-down */}
            <div className="card">
              <h3 className="panel-title">Hiệu suất Coaching theo Khu vực <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(Click để xem chi tiết)</span></h3>
              <div className="table-responsive">
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th>Khu vực</th>
                      <th style={{ textAlign: 'center' }}>Điểm TB</th>
                      <th style={{ textAlign: 'center' }}>Tỷ lệ đi tuyến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coachingData.byRegion.map(r => {
                      const isExpanded = expandedRegion === r.name;
                      const details = regionDetails[r.name] || [];
                      return (
                        <React.Fragment key={r.name}>
                          <tr 
                            onClick={() => setExpandedRegion(isExpanded ? null : r.name)}
                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', transition: 'transform 0.2s' }}>
                              <span style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                            <td style={{ textAlign: 'center', color: r.score >= 8.5 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{r.score}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${r.rate}%`, height: '100%', background: 'var(--cj-blue)' }}></div>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.rate}%</span>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} style={{ padding: 0, background: '#f8fafc' }}>
                                <div style={{ padding: '12px 16px 16px 32px', animation: 'fadeIn 0.25s ease' }}>
                                  {details.map((sup: any) => (
                                    <div key={sup.code} style={{ marginBottom: '16px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ background: 'var(--cj-blue)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>GSBH</span>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{sup.supervisor}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({sup.code})</span>
                                      </div>
                                      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr style={{ background: '#e2e8f0' }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>NVBH</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Mã</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Điểm TB</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Thuyết phục</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Trưng bày</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Xử lý từ chối</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Đạt chuẩn</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Số lần coaching</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Lần cuối</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sup.reps.map((rep: any) => (
                                            <tr key={rep.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{rep.name}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.72rem' }}>{rep.code}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: rep.score >= 8.5 ? '#10b981' : rep.score >= 7.5 ? '#f59e0b' : '#ef4444' }}>{rep.score}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{rep.persuasion}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{rep.display}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{rep.objection}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                <span style={{
                                                  padding: '1px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                                                  background: rep.passRate ? '#dcfce7' : '#fee2e2',
                                                  color: rep.passRate ? '#166534' : '#991b1b'
                                                }}>
                                                  {rep.passRate ? '✓ Đạt' : '✗ Chưa đạt'}
                                                </span>
                                              </td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>{rep.coachCount}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>{rep.lastDate}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Channel Table */}
            <div className="card">
              <h3 className="panel-title">Hiệu suất Coaching theo Kênh</h3>
              <div className="table-responsive">
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th>Kênh</th>
                      <th style={{ textAlign: 'center' }}>Điểm TB</th>
                      <th style={{ textAlign: 'center' }}>Tỷ lệ đi tuyến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coachingData.byChannel.map(r => (
                      <tr key={r.name}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ textAlign: 'center', color: r.score >= 8.5 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{r.score}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${r.rate}%`, height: '100%', background: 'var(--cj-orange)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            <div className="card">
              <h3 className="panel-title">Tiến độ quy trình Coaching EDAC</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Explain */}
                <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '16px', borderRadius: '8px', borderTop: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px' }}>BƯỚC 1</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>E - Explain (Giải thích)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '95%', height: '100%', background: '#3b82f6' }}></div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>95%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>GSBH giải thích mục tiêu rõ ràng</div>
                </div>

                {/* Demonstrate */}
                <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '16px', borderRadius: '8px', borderTop: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px' }}>BƯỚC 2</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>D - Demonstrate (Làm mẫu)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '88%', height: '100%', background: '#f59e0b' }}></div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>88%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Thực hành làm mẫu các kỹ năng</div>
                </div>

                {/* Apply */}
                <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '16px', borderRadius: '8px', borderTop: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px' }}>BƯỚC 3</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>A - Apply (Áp dụng)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '82%', height: '100%', background: '#10b981' }}></div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>82%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>NVBH tự thực hiện tại điểm bán</div>
                </div>

                {/* Consolidate */}
                <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '16px', borderRadius: '8px', borderTop: '4px solid #8b5cf6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px' }}>BƯỚC 4</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>C - Consolidate (Đúc kết)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '78%', height: '100%', background: '#8b5cf6' }}></div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#8b5cf6' }}>78%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Đánh giá và chốt điểm cần cải thiện</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- COOLER CONTENT --- */}
      {activeTab === 'cooler' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--cj-orange)' }}>
              <div className="card-title">Tủ mát đã triển khai</div>
              <div className="card-value" style={{ color: 'var(--cj-orange)', fontSize: '2rem' }}>
                {coolerData.totalDeployed.toLocaleString()} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {coolerData.targetDeployed.toLocaleString()}</span>
              </div>
              <div className="card-sub" style={{ marginTop: '8px' }}>
                <div style={{ width: '100%', height: '4px', background: '#fef08a', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(coolerData.totalDeployed/coolerData.targetDeployed)*100}%`, height: '100%', background: 'var(--cj-orange)' }}></div>
                </div>
              </div>
            </div>
            
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="card-title">Tỷ lệ Tủ Đầy đủ thông tin</div>
              <div className="card-value" style={{ color: '#10b981', fontSize: '2rem' }}>{coolerData.purityRate}%</div>
              <div className="card-sub" style={{ marginTop: '8px' }}>Không trưng bày hàng đối thủ</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="card-title">Tỷ lệ Tủ Hoạt động (Active)</div>
              <div className="card-value" style={{ color: '#3b82f6', fontSize: '2rem' }}>{coolerData.activeRate}%</div>
              <div className="card-sub" style={{ marginTop: '8px' }}>Đang cắm điện và làm lạnh tốt</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ec4899' }}>
              <div className="card-title">Doanh số TB / Tủ mát</div>
              <div className="card-value" style={{ color: '#ec4899', fontSize: '2rem' }}>{formatCurrency(coolerData.salesPerCooler)}</div>
              <div className="card-sub" style={{ marginTop: '8px' }}>Đánh giá ROI tủ mát</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
             {/* By Region Table */}
             <div className="card">
              <h3 className="panel-title">Hiện trạng Tủ mát theo Khu vực</h3>
              <div className="table-responsive">
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th>Khu vực</th>
                      <th style={{ textAlign: 'right' }}>Đã triển khai</th>
                      <th style={{ textAlign: 'center' }}>% Đầy đủ TT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coolerData.byRegion.map((r: any) => {
                      const isExpanded = expandedRegion === r.name + '_cooler';
                      const details = regionDetails[r.name] || [];
                      return (
                        <React.Fragment key={r.name}>
                          <tr 
                            onClick={() => setExpandedRegion(isExpanded ? null : r.name + '_cooler')}
                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', transition: 'transform 0.2s' }}>
                              <span style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.deployed.toLocaleString()}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                background: r.purity >= 95 ? '#dcfce7' : '#fef3c7',
                                color: r.purity >= 95 ? '#166534' : '#92400e'
                              }}>
                                {r.purity}%
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} style={{ padding: 0, background: '#f8fafc' }}>
                                <div style={{ padding: '12px 16px 16px 32px', animation: 'fadeIn 0.25s ease' }}>
                                  {details.map((sup: any) => (
                                    <div key={sup.code} style={{ marginBottom: '16px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ background: 'var(--cj-orange)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>GSBH</span>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{sup.supervisor}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({sup.code})</span>
                                      </div>
                                      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr style={{ background: '#e2e8f0' }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>NVBH</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Mã</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Tủ triển khai</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>% Đầy đủ TT</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Trạng thái NV</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sup.reps.map((rep: any) => (
                                            <tr key={rep.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{rep.name}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.72rem' }}>{rep.code}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{rep.coolerDeployed}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: rep.coolerPurity >= 95 ? '#166534' : '#92400e' }}>{rep.coolerPurity}%</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>Hoạt động</span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Channel Table */}
            <div className="card">
              <h3 className="panel-title">Phân bổ Tủ mát theo Kênh</h3>
              <div className="table-responsive">
                <table className="pbi-table">
                  <thead>
                    <tr>
                      <th>Kênh</th>
                      <th style={{ textAlign: 'right' }}>Đã triển khai</th>
                      <th style={{ textAlign: 'center' }}>% Đầy đủ TT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coolerData.byChannel.map(r => (
                      <tr key={r.name}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.deployed.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            background: r.purity >= 95 ? '#dcfce7' : '#fef3c7',
                            color: r.purity >= 95 ? '#166534' : '#92400e'
                          }}>
                            {r.purity}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Maintenance Status Chart */}
            <div className="card">
              <h3 className="panel-title">Tình trạng Thiết bị & Vệ sinh tủ</h3>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {coolerData.maintenanceStatus.map((item: any) => (
                  <div key={item.status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.status}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.count.toLocaleString()} tủ ({item.pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', background: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.5rem', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: '#475569', borderLeft: '3px solid #3b82f6' }}>
                <strong>Insight:</strong> Tỷ lệ tủ cần bảo trì đang ở mức an toàn dưới 5%. Cần ưu tiên xử lý dứt điểm 250 tủ đang hỏng hóc để tránh lãng phí chi phí thuê/đầu tư.
              </div>
            </div>

            {/* Zero Sales Chart */}
            <div className="card">
              <h3 className="panel-title">Cảnh báo Tủ mát Không sinh số</h3>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {coolerData.zeroSales.map((item: any) => {
                  const pct = (item.count / 555) * 100;
                  return (
                    <div key={item.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: item.color }}>{item.count} tủ</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: item.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '1.5rem', padding: '12px', background: '#fef2f2', borderRadius: '8px', fontSize: '0.8rem', color: '#991b1b', borderLeft: '3px solid #ef4444' }}>
                <strong>Action:</strong> Có 85 tủ không phát sinh doanh số {'>'} 30 ngày. Yêu cầu GSBH rà soát và đề xuất thu hồi / luân chuyển sang điểm bán tiềm năng hơn trong tháng này.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
