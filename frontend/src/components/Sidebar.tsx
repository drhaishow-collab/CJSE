import React, { useEffect, useState } from 'react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  dbStatus: { status: string; database: string };
  isSidebarOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, dbStatus, isSidebarOpen, onClose, currentUser, onLogout, isCollapsed, onToggleCollapse }) => {
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(currentTab === 'new' || currentTab === 'sellin_test');
  const [isCoachingGroupOpen, setIsCoachingGroupOpen] = useState(currentTab === 'reports-coaching' || currentTab === 'reports-cooler');

  useEffect(() => {
    if (currentTab === 'new' || currentTab === 'sellin_test') {
      setIsNewGroupOpen(true);
    }
    if (currentTab === 'reports-coaching' || currentTab === 'reports-cooler') {
      setIsCoachingGroupOpen(true);
    }
  }, [currentTab]);

  return (
    <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
      >
        {isCollapsed ? '▶' : '◀'}
      </button>

      <div className="sidebar-header">
        <div className="logo-container">
          <svg width="45" height="45" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="5" y="65" fill="#FFFFFF" fontFamily="Outfit, Arial, sans-serif" fontWeight="bold" fontSize="32">CJ</text>
            <path d="M48 45 C48 30, 60 12, 70 20 C80 28, 70 48, 55 52 C50 53, 48 50, 48 45 Z" fill="#1b75bc" />
            <path d="M57 55 C70 53, 90 62, 86 75 C82 85, 62 82, 53 70 C50 66, 52 59, 57 55 Z" fill="#f7941d" />
            <path d="M48 58 C49 72, 40 92, 28 88 C18 84, 25 64, 38 55 C43 51, 47 53, 48 58 Z" fill="#e31837" />
          </svg>
        </div>
        <div className="sidebar-logo-text-wrap">
          <span className="logo-text">MarketBoard</span>
          <span className="logo-sub">Sales Sup Workspace</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
          ✕
        </button>
      </div>

      <nav className="sidebar-menu">
        <button className={`menu-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')} data-tooltip="Tổng quan">
          <span className="menu-icon">📊</span>
          <span className="menu-label">Tổng quan</span>
        </button>

        <button className={`menu-item ${currentTab === 'stores' ? 'active' : ''}`} onClick={() => setTab('stores')} data-tooltip="Điểm bán (MT/GT)">
          <span className="menu-icon">🏪</span>
          <span className="menu-label">Điểm bán (MT/GT)</span>
        </button>

        <button className={`menu-item ${currentTab === 'visits' ? 'active' : ''}`} onClick={() => setTab('visits')} data-tooltip="Lịch sử viếng thăm">
          <span className="menu-icon">📝</span>
          <span className="menu-label">Lịch sử viếng thăm</span>
        </button>

        <button className={`menu-item ${currentTab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')} data-tooltip="Quản lý Nhân sự">
          <span className="menu-icon">👥</span>
          <span className="menu-label">Quản lý Nhân sự</span>
        </button>

        <div className="sidebar-menu-divider" style={{ padding: '0.75rem 1rem 0.25rem 1rem', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>
          Báo cáo phân tích
        </div>

        <button className={`menu-item ${currentTab === 'reports-product' ? 'active' : ''}`} onClick={() => setTab('reports-product')} data-tooltip="Product by Cat">
          <span className="menu-icon">📦</span>
          <span className="menu-label">Product by Cat</span>
        </button>

        <button className={`menu-item ${currentTab === 'reports-sf' ? 'active' : ''}`} onClick={() => setTab('reports-sf')} data-tooltip="SF Performance">
          <span className="menu-icon">👥</span>
          <span className="menu-label">SF Performance</span>
        </button>

        <button className={`menu-item ${currentTab === 'reports-biz' ? 'active' : ''}`} onClick={() => setTab('reports-biz')} data-tooltip="Biz Review">
          <span className="menu-icon">📈</span>
          <span className="menu-label">Biz Review</span>
        </button>

        <div className={`sidebar-submenu-group ${isCoachingGroupOpen ? 'open' : ''} ${(currentTab === 'reports-coaching' || currentTab === 'reports-cooler') ? 'active-group' : ''}`}>
          <button
            className={`menu-item submenu-parent ${(currentTab === 'reports-coaching' || currentTab === 'reports-cooler') ? 'active' : ''}`}
            onClick={() => {
              if (isCollapsed) {
                setTab('reports-coaching');
                return;
              }
              setIsCoachingGroupOpen((prev) => !prev);
            }}
            data-tooltip="Coaching & Cooler"
          >
            <span className="menu-icon">🎓</span>
            <span className="menu-label">Coaching & Cooler</span>
            <span className={`submenu-arrow ${isCoachingGroupOpen ? 'open' : ''}`}>▾</span>
          </button>

          {!isCollapsed && isCoachingGroupOpen && (
            <div className="sidebar-submenu-list">
              <button className={`menu-item submenu-item ${currentTab === 'reports-coaching' ? 'active' : ''}`} onClick={() => setTab('reports-coaching')} data-tooltip="Coaching Tracking">
                <span className="menu-icon">•</span>
                <span className="menu-label">Coaching Tracking</span>
              </button>
              <button className={`menu-item submenu-item ${currentTab === 'reports-cooler' ? 'active' : ''}`} onClick={() => setTab('reports-cooler')} data-tooltip="Cooler Management">
                <span className="menu-icon">•</span>
                <span className="menu-label">Cooler Management</span>
              </button>
            </div>
          )}
        </div>

        <div className={`sidebar-submenu-group ${isNewGroupOpen ? 'open' : ''} ${(currentTab === 'new' || currentTab === 'sellin_test') ? 'active-group' : ''}`}>
          <button
            className={`menu-item submenu-parent ${(currentTab === 'new' || currentTab === 'sellin_test') ? 'active' : ''}`}
            onClick={() => {
              if (isCollapsed) {
                setTab('new');
                return;
              }
              setIsNewGroupOpen((prev) => !prev);
            }}
            data-tooltip="New reports"
          >
            <span className="menu-icon">🆕</span>
            <span className="menu-label">New</span>
            <span className={`submenu-arrow ${isNewGroupOpen ? 'open' : ''}`}>▾</span>
          </button>

          {!isCollapsed && isNewGroupOpen && (
            <div className="sidebar-submenu-list">
              <button className={`menu-item submenu-item ${currentTab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')} data-tooltip="Sales force KPI">
                <span className="menu-icon">•</span>
                <span className="menu-label">sales_force_kpi</span>
              </button>
              <button className={`menu-item submenu-item ${currentTab === 'sellin_test' ? 'active' : ''}`} onClick={() => setTab('sellin_test')} data-tooltip="Sellin Test">
                <span className="menu-icon">•</span>
                <span className="menu-label">sellin_test</span>
              </button>
            </div>
          )}
        </div>

        <button className={`menu-item ${currentTab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')} data-tooltip="Định nghĩa Chỉ số">
          <span className="menu-icon">📖</span>
          <span className="menu-label">Định nghĩa Chỉ số</span>
        </button>
      </nav>

      <div className="sidebar-db-status" style={{ padding: '0 1.5rem', marginBottom: '0.5rem' }}>
        <div className={`db-status-bar ${dbStatus.database === 'CONNECTED' ? 'status-connected' : 'status-fallback'}`}>
          <span style={{ fontSize: '10px' }}>●</span>
          <span>{dbStatus.database === 'CONNECTED' ? 'DB Local: Connected' : 'DB: Running Demo Mode'}</span>
        </div>
      </div>

      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div className="user-avatar" style={{ background: currentUser?.role === 'rep' ? 'var(--cj-blue)' : currentUser?.role === 'sup' ? 'var(--cj-orange)' : 'var(--cj-red)', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
            {currentUser?.name ? currentUser.name.split(' ').pop().substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="user-info" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span className="user-name" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.name || 'Tài khoản Demo'}</span>
            <span className="user-role" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.72rem' }}>
              {currentUser?.role === 'rep' ? 'Đại diện thương mại' : currentUser?.role === 'sup' ? 'Giám sát bán hàng' : currentUser?.role === 'manager' ? 'Quản lý vùng' : 'Quản trị viên'}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Đăng xuất"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px', transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f43f5e'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
        >
          🚪
        </button>
      </div>
    </aside>
  );
};
